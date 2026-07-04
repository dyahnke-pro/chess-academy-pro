import { describe, it, expect } from 'vitest';
import { assembleMoveEvalAnswer, assembleTacticsAnswer, assembleProgressAnswer, assembleWeaknessRecommendation, weaknessTopicFromText, assembleOpeningProfileAnswer, assembleStatsAnswer, assembleStrengthsAnswer, assembleMasterPlayAnswer, assemblePlanAnswer, assembleConceptAnswer, assemblePlayerGamesAnswer, assembleEndgameAnswer, assemblePositionAssessment, explainBestMoveGrounded, explainMoveOrder, describeMoveGeometry } from './groundedAnswer';
import type { TacticsLiveContext, LivePlayerGamesContext } from '../coach/types';
import type { TablebaseLookupResult } from './lichessTablebaseService';
import type { MasterPlayResult } from './masterPlayTypes';
import type { ConceptEntry } from './chessConceptService';

// Phase 1: the facts for a move/eval question are assembled IN CODE — the
// best move (chess.js SAN from the engine UCI), the grounded "why", and the
// real eval. The LLM only voices this; it never reasons. These tests prove
// the assembler never fabricates and always grounds on the real board.
describe('assembleMoveEvalAnswer', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('grounds the best move as a real SAN + arrow from the engine UCI', () => {
    const a = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'g1f3', evalCp: 30 });
    expect(a).not.toBeNull();
    expect(a!.bestMoveSan).toBe('Nf3');
    expect(a!.bestMoveFromTo).toEqual({ from: 'g1', to: 'f3' });
    expect(a!.facts).toContain('The best move is Nf3.');
    expect(a!.sources).toContain('engine:stockfish');
  });

  it('grounds a legal sliding move to its real SAN (1.e4 e5 → Qh5)', () => {
    // After 1.e4 e5 the e2 square is empty, so Qd1-h5 is legal.
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    const a = assembleMoveEvalAnswer({ fen, bestMoveUci: 'd1h5', evalCp: 60 });
    expect(a).not.toBeNull();
    expect(a!.bestMoveSan).toBe('Qh5');
  });

  it('phrases the real eval, never invents a number', () => {
    const a = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e4', evalCp: 280 });
    expect(a!.facts.toLowerCase()).toMatch(/winning|clearly better|2\.8/);
    // balanced case
    const b = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e4', evalCp: 10 });
    expect(b!.facts.toLowerCase()).toContain('balanced');
  });

  it('reports a forced mate when given one', () => {
    const a = assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e4', mateIn: 3 });
    expect(a!.facts.toLowerCase()).toContain('forced mate in 3');
  });

  it('returns null (never fabricates) when there is no engine move', () => {
    expect(assembleMoveEvalAnswer({ fen: START, bestMoveUci: null })).toBeNull();
    expect(assembleMoveEvalAnswer({ fen: START, bestMoveUci: '' })).toBeNull();
  });

  it('returns null on an illegal engine move rather than inventing a SAN', () => {
    // e2e5 is not a legal first move (pawn can't jump 3).
    expect(assembleMoveEvalAnswer({ fen: START, bestMoveUci: 'e2e5' })).toBeNull();
  });

  it('returns null on an unparseable FEN (never blanks/fabricates)', () => {
    expect(assembleMoveEvalAnswer({ fen: 'garbage', bestMoveUci: 'g1f3' })).toBeNull();
  });
});

function tactics(over: Partial<TacticsLiveContext> = {}): TacticsLiveContext {
  return { immediate: [], hanging: [], threats: [], opportunities: [], lookaheadDepth: 4, ...over } as TacticsLiveContext;
}

describe('assembleTacticsAnswer — Phase 2 (voice the engine-computed tactics)', () => {
  it('voices a forced mate-in-one first', () => {
    const a = assembleTacticsAnswer(tactics({ boardFacts: { sideToMove: 'white', mateInOne: 'Qh7#' } as TacticsLiveContext['boardFacts'] }), 'white');
    expect(a!.facts).toContain('checkmate in one: Qh7#');
  });
  it("voices the engine's fork description verbatim (no LLM)", () => {
    const a = assembleTacticsAnswer(tactics({ immediate: [{ type: 'fork', description: 'Knight on d5 forks queen on c7 and rook on f6', squares: ['d5', 'c7', 'f6'] }] }), 'white');
    expect(a!.facts).toContain('Knight on d5 forks queen on c7');
  });
  it("warns about the STUDENT's hanging piece, not the opponent's", () => {
    const a = assembleTacticsAnswer(tactics({ hanging: [{ square: 'b4', piece: 'b', color: 'w' }, { square: 'e5', piece: 'p', color: 'b' }] }), 'white');
    expect(a!.facts).toContain('Your bishop on b4 is hanging');
    expect(a!.facts).not.toContain('e5');
  });
  it('falls to the top threat when nothing immediate', () => {
    const a = assembleTacticsAnswer(tactics({ threats: [{ type: 'fork', description: 'Black threatens Nxe4', depthAhead: 2, line: [] }] }), 'white');
    expect(a!.facts).toContain('Watch out');
  });
  it('returns null when there is no concrete tactic (caller falls back)', () => {
    expect(assembleTacticsAnswer(tactics(), 'white')).toBeNull();
  });
});

import type { BadHabit } from '../types';
function habit(over: Partial<BadHabit> = {}): BadHabit {
  return { id: 'h', description: 'you hang pieces in the opening', occurrences: 3, lastSeen: '2026-06-10', isResolved: false, ...over };
}
describe('assembleProgressAnswer — Phase 6 (voice the student\'s real history)', () => {
  it('voices the top unresolved habits, most frequent first', () => {
    const a = assembleProgressAnswer([habit({ description: 'you trade your good bishop', occurrences: 2 }), habit({ description: 'you hang pieces in the opening', occurrences: 5 })]);
    expect(a!.facts).toMatch(/hang pieces in the opening \(5 times\).*good bishop \(2 times\)/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('ignores resolved habits and returns null when none remain', () => {
    expect(assembleProgressAnswer([habit({ isResolved: true })])).toBeNull();
    expect(assembleProgressAnswer([])).toBeNull();
  });
});

describe('assembleWeaknessRecommendation — the grounded "what should I train" answer', () => {
  const w = (label: string, openCount: number, bucket?: string) => ({ label, openCount, bucket });
  it('voices the top open weaknesses, most frequent first, with a drill next-step', () => {
    const a = assembleWeaknessRecommendation([
      w('Forks', 4, 'tactical'),
      w('Rook endgames', 9, 'endgame'),
      w('Back-rank', 2, 'tactical'),
    ]);
    expect(a).not.toBeNull();
    // ranked by openCount desc: 9, 4, 2
    expect(a!.facts).toMatch(/Rook endgames \(9 times\).*Forks \(4 times\).*Back-rank \(2 times\)/);
    expect(a!.facts).toMatch(/drill your mistakes/i);
    expect(a!.sources).toContain('data:your-games');
  });
  it('caps at the top 3 and skips zero-open / unlabeled rows', () => {
    const a = assembleWeaknessRecommendation([
      w('A', 5, 'tactical'), w('B', 4, 'tactical'), w('C', 3, 'tactical'), w('D', 2, 'tactical'),
      w('Z', 0, 'tactical'), w('', 8, 'tactical'),
    ]);
    expect(a!.facts).toContain('A (5 times)');
    expect(a!.facts).not.toContain('D (2 times)'); // 4th, dropped
    expect(a!.facts).not.toContain('Z ('); // zero-open, dropped
  });
  it('filters to a named topic bucket when scoped', () => {
    const rows = [w('Rook endgames', 9, 'endgame'), w('Forks', 4, 'tactical'), w('Pins', 3, 'tactical')];
    const a = assembleWeaknessRecommendation(rows, { topic: 'tactical' });
    expect(a!.facts).toContain('Forks (4 times)');
    expect(a!.facts).toContain('Pins (3 times)');
    expect(a!.facts).not.toContain('Rook endgames'); // wrong bucket, excluded
    expect(a!.facts).toMatch(/tactical area/i);
  });
  it('returns null when nothing is open (caller falls back)', () => {
    expect(assembleWeaknessRecommendation([])).toBeNull();
    expect(assembleWeaknessRecommendation([w('X', 0, 'tactical')])).toBeNull();
    // topic filter that empties the pool → null (caller retries unscoped)
    expect(assembleWeaknessRecommendation([w('Forks', 4, 'tactical')], { topic: 'endgame' })).toBeNull();
  });
});

describe('assembleOpeningProfileAnswer — grounded "strongest/favorite/weakest opening"', () => {
  const o = (name: string, color: 'white' | 'black', extra: Record<string, number> = {}) => ({ name, color, ...extra });
  it('voices strongest per color when both sides present', () => {
    const a = assembleOpeningProfileAnswer({ kind: 'strongest', openings: [
      o('Italian Game', 'white', { drillAccuracy: 0.92, drillAttempts: 11 }),
      o('Caro-Kann', 'black', { drillAccuracy: 0.81, drillAttempts: 7 }),
    ] });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/strongest opening as White is Italian Game \(92% over 11 drills\)/);
    expect(a!.facts).toMatch(/as Black it's Caro-Kann \(81% over 7 drills\)/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('voices favorite from real game counts', () => {
    const a = assembleOpeningProfileAnswer({ kind: 'favorite', openings: [
      o('Sicilian Defense', 'black', { games: 42 }),
    ] });
    expect(a!.facts).toMatch(/most-played opening is Sicilian Defense \(42 games\)/);
  });
  it('phrases the drill-count fallback as "most-drilled" when games are 0', () => {
    const a = assembleOpeningProfileAnswer({ kind: 'favorite', openings: [o('London System', 'white', { games: 0 })] });
    expect(a!.facts).toMatch(/most-drilled/);
    expect(a!.facts).not.toMatch(/0 games/);
  });
  it('returns null when there is no data (caller takes the no-data line)', () => {
    expect(assembleOpeningProfileAnswer({ kind: 'strongest', openings: [] })).toBeNull();
    expect(assembleOpeningProfileAnswer({ kind: 'favorite', openings: [{ name: '', color: 'white' }] })).toBeNull();
  });
});

describe('assembleStatsAnswer — grounded "what\'s my rating / record / win rate"', () => {
  const base = {
    totalGames: 50, wins: 28, losses: 17, draws: 5,
    winRate: 56, winRateWhite: 62, winRateBlack: 50,
  };
  it('voices the record + win rate from the real counts', () => {
    const a = assembleStatsAnswer(base);
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/Across 50 games your record is 28-17-5 \(wins-losses-draws\), a 56% win rate/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('adds per-color win rates when present', () => {
    const a = assembleStatsAnswer(base);
    expect(a!.facts).toMatch(/As White you win 62%, as Black 50%/);
  });
  it('adds the rating when a positive rating is supplied', () => {
    const a = assembleStatsAnswer({ ...base, currentRating: 1487.4 });
    expect(a!.facts).toMatch(/Your rating is about 1487\./);
  });
  it('omits the rating line when rating is null or zero', () => {
    expect(assembleStatsAnswer({ ...base, currentRating: null })!.facts).not.toMatch(/rating is about/);
    expect(assembleStatsAnswer({ ...base, currentRating: 0 })!.facts).not.toMatch(/rating is about/);
  });
  it('adds the best-scalp line from highestBeaten', () => {
    const a = assembleStatsAnswer({ ...base, highestBeaten: { name: 'GM Smith', rating: 2410 } });
    expect(a!.facts).toMatch(/best scalp: GM Smith \(2410\)/);
  });
  it('handles the singular "1 game" grammar', () => {
    const a = assembleStatsAnswer({ totalGames: 1, wins: 1, losses: 0, draws: 0, winRate: 100, winRateWhite: 100, winRateBlack: 0 });
    expect(a!.facts).toMatch(/Across 1 game your record/);
  });
  it('returns null when there are no games (caller takes the no-data line)', () => {
    expect(assembleStatsAnswer({ ...base, totalGames: 0 })).toBeNull();
  });
});

describe('assembleStrengthsAnswer — grounded "what am I good at"', () => {
  it('voices the top strengths (capped at 3)', () => {
    const a = assembleStrengthsAnswer([
      '62% win rate as White',
      '4 games with zero blunders',
      'Strong opening preparation (81% accuracy)',
      'a fourth strength that should be dropped',
    ]);
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/What you do well, from your own games:/);
    expect(a!.facts).toMatch(/62% win rate as White/);
    expect(a!.facts).not.toMatch(/fourth strength/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('phrases a single strength without a list', () => {
    const a = assembleStrengthsAnswer(['62% win rate as White']);
    expect(a!.facts).toMatch(/What you do well, from your own games: 62% win rate as White\./);
  });
  it('ignores blank entries', () => {
    const a = assembleStrengthsAnswer(['', '  ', 'Real strength']);
    expect(a!.facts).toMatch(/Real strength/);
  });
  it('returns null when nothing is computed', () => {
    expect(assembleStrengthsAnswer([])).toBeNull();
    expect(assembleStrengthsAnswer(['', '   '])).toBeNull();
  });
});

describe('weaknessTopicFromText — scope extraction', () => {
  it.each([
    ['what tactics am I weak in', 'tactical'],
    ['am I bad at forks', 'tactical'],
    ['where am I weak in the endgame', 'endgame'],
    ['what openings do I lose in', 'opening'],
    ['struggle with my positional play', 'positional'],
  ] as const)('%s → %s', (t, topic) => expect(weaknessTopicFromText(t)).toBe(topic));
  it('returns null when unscoped', () => {
    expect(weaknessTopicFromText('what should I train')).toBeNull();
    expect(weaknessTopicFromText('what are my weaknesses')).toBeNull();
    expect(weaknessTopicFromText(undefined)).toBeNull();
  });
});

// Phase 4: "how do masters play this?" voices the master-play lookup's REAL
// top moves + frequencies — the LLM never fabricates a popularity figure.
function masterResult(over: Partial<MasterPlayResult> = {}): MasterPlayResult {
  return {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
    totalGames: 3000,
    source: 'lichess-live',
    moves: [
      { san: 'e4', uci: 'e2e4', games: 1500, white: 750, draws: 450, black: 300, whitePct: 0.5, drawPct: 0.3, blackPct: 0.2 },
      { san: 'd4', uci: 'd2d4', games: 1000, white: 480, draws: 320, black: 200, whitePct: 0.48, drawPct: 0.32, blackPct: 0.2 },
      { san: 'Nf3', uci: 'g1f3', games: 400, white: 180, draws: 140, black: 80, whitePct: 0.45, drawPct: 0.35, blackPct: 0.2 },
    ],
    ...over,
  };
}
describe('assembleMasterPlayAnswer — Phase 4 (voice the real master frequencies)', () => {
  it('voices the top move with its real game count + W/D/B split and an arrow', () => {
    const a = assembleMasterPlayAnswer(masterResult());
    expect(a!.facts).toContain('e4');
    expect(a!.facts).toContain('1,500 games');
    expect(a!.facts).toMatch(/White wins 50%, draws 30%, Black wins 20%/);
    expect(a!.facts).toContain('d4 (1,000 games)');
    expect(a!.bestMoveFromTo).toEqual({ from: 'e2', to: 'e4' });
    expect(a!.sources).toContain('master-games:lichess');
  });
  it('returns null when there is no master data (source none / empty moves)', () => {
    expect(assembleMasterPlayAnswer(masterResult({ source: 'none', moves: [], totalGames: 0 }))).toBeNull();
    expect(assembleMasterPlayAnswer(masterResult({ moves: [] }))).toBeNull();
  });
});

// Phase 3: a plan answer's MOVE backbone is the engine PV (real, chess.js-
// verified), never the LLM free-synthesizing moves.
describe('assemblePlanAnswer — Phase 3 (voice the engine PV as the plan)', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  it('voices the student moves + expected reply with an arrow on the first move', () => {
    const a = assemblePlanAnswer({ fen: START, pvSan: ['e4', 'e5', 'Nf3', 'Nc6'], evalCp: 30, mateIn: null, studentSide: 'white' });
    expect(a!.facts).toContain('Your plan: e4, then Nf3.');
    expect(a!.facts).toContain('most likely reply is e5');
    expect(a!.bestMoveFromTo).toEqual({ from: 'e2', to: 'e4' });
    expect(a!.sources).toContain('engine:stockfish');
  });
  it('stops at the last legal ply when the PV diverges from legality (never voices a bad line)', () => {
    // Second move "Qh5xz" is illegal SAN → replay stops after e4; one student move.
    const a = assemblePlanAnswer({ fen: START, pvSan: ['e4', 'totally-illegal'], evalCp: 20, mateIn: null, studentSide: 'white' });
    expect(a!.facts).toContain('Your plan starts with e4.');
    expect(a!.bestMoveFromTo).toEqual({ from: 'e2', to: 'e4' });
  });
  it('returns null on an empty PV or unparseable FEN', () => {
    expect(assemblePlanAnswer({ fen: START, pvSan: [], evalCp: 0, mateIn: null, studentSide: 'white' })).toBeNull();
    expect(assemblePlanAnswer({ fen: 'not-a-fen', pvSan: ['e4'], evalCp: 0, mateIn: null, studentSide: 'white' })).toBeNull();
  });
});

// Phase 5: concept definitions come from the BOOK corpus, never LLM memory.
function concept(over: Partial<ConceptEntry> = {}): ConceptEntry {
  return { id: 'fork', name: 'fork', type: 'tactic', phrases: ['fork'], passages: [], ...over };
}
describe('assembleConceptAnswer — Phase 5 (voice the book corpus, not memory)', () => {
  it('voices the first sentences of the book passage + a book source', () => {
    const a = assembleConceptAnswer(concept({
      passages: [{
        bookSlug: 'capablanca-chess-fundamentals', bookTitle: 'Chess Fundamentals', author: 'Capablanca',
        gutenbergId: 33870, chapter: null, section: null, wordCount: 20,
        text: 'A fork is a double attack by one piece. It strikes two targets at once. The defender can save only one.',
      }],
    }));
    expect(a!.facts).toMatch(/^Fork: A fork is a double attack/);
    expect(a!.facts).toContain('strikes two targets'); // second sentence kept
    expect(a!.facts).not.toContain('save only one'); // third sentence dropped (cap at 2)
    expect(a!.sources).toEqual(['book:capablanca-chess-fundamentals']);
  });
  it('falls back to the curated definition + concept source when no passage', () => {
    const a = assembleConceptAnswer(concept({ id: 'zwischenzug', name: 'zwischenzug', fallbackDefinition: 'An in-between move inserted before the expected recapture.' }));
    expect(a!.facts).toBe('Zwischenzug: An in-between move inserted before the expected recapture.');
    expect(a!.sources).toEqual(['concept:zwischenzug']);
  });
  it('returns null when the concept carries neither a passage nor a fallback', () => {
    expect(assembleConceptAnswer(concept())).toBeNull();
  });
});

// Phase 4 (cont): "how does <pro> play X" voices the player's REAL games.
function pgGame(over: Partial<LivePlayerGamesContext['games'][number]> = {}): LivePlayerGamesContext['games'][number] {
  return { id: 'g', player: 'Naroditsky', studentSide: 'white', opponent: 'Opp', opponentRating: 2400, result: '1-0', date: null, source: 'chess.com', variationLabel: 'Advance', pgnPrefix: 'e4 c6', plyCount: 4, ...over };
}
function pgCtx(games: LivePlayerGamesContext['games'], over: Partial<LivePlayerGamesContext> = {}): LivePlayerGamesContext {
  return { playerId: 'naroditsky', openingId: 'caro-kann', openingName: 'Caro-Kann', totalAvailable: 1700, games, ...over };
}
describe('assemblePlayerGamesAnswer — Phase 4 cont (voice the pro\'s real games)', () => {
  it('voices the real count + the highest-rated-opponent WIN', () => {
    const a = assemblePlayerGamesAnswer(pgCtx([
      pgGame({ opponent: 'Weak', opponentRating: 2100, result: '1-0' }),
      pgGame({ opponent: 'Strong', opponentRating: 3100, result: '1-0', variationLabel: 'Two Knights' }),
      pgGame({ opponent: 'Lost', opponentRating: 3200, result: '0-1' }), // higher rating but a LOSS
    ]));
    expect(a!.facts).toContain('Naroditsky has 1700 reference games in the Caro-Kann.');
    expect(a!.facts).toContain('beat Strong (3100)');     // the win over the strongest, not the 3200 loss
    expect(a!.facts).toContain('Two Knights');
    expect(a!.sources).toEqual(['player-games:naroditsky']);
  });
  it('falls back to the strongest game (not a win) when the pro never won in the set', () => {
    const a = assemblePlayerGamesAnswer(pgCtx([pgGame({ opponent: 'Beat me', opponentRating: 2800, result: '0-1' })]));
    expect(a!.facts).toContain('notable game was against Beat me (2800)');
  });
  it('returns null when there are no reference games', () => {
    expect(assemblePlayerGamesAnswer(pgCtx([]))).toBeNull();
  });
});

// Phase 5 endgame: the verdict is the SYZYGY TABLEBASE — literal truth.
function tb(over: Partial<TablebaseLookupResult> = {}): TablebaseLookupResult {
  return { category: 'draw', whiteRelativeResult: 'draw', dtm: null, dtz: null, checkmate: false, stalemate: false, insufficientMaterial: false, ...over };
}
describe('assembleEndgameAnswer — Phase 5 (voice the tablebase verdict)', () => {
  it('voices a WIN for the student with the mate distance', () => {
    const a = assembleEndgameAnswer({ result: tb({ category: 'win', whiteRelativeResult: 'white-wins', dtm: 17 }), studentColor: 'white' });
    expect(a!.facts).toBe('By the tablebase, this endgame is a win for you with best play — mate in 17.');
    expect(a!.sources).toEqual(['tablebase:syzygy']);
  });
  it('voices a LOSS when the win is the opponent\'s', () => {
    const a = assembleEndgameAnswer({ result: tb({ category: 'win', whiteRelativeResult: 'white-wins', dtm: 12 }), studentColor: 'black' });
    expect(a!.facts).toContain('lost for you with best play — mate in 12');
  });
  it('voices a theoretical draw (incl. cursed-win = fifty-move-rule draw)', () => {
    expect(assembleEndgameAnswer({ result: tb({ category: 'draw', whiteRelativeResult: 'draw' }), studentColor: 'white' })!.facts).toContain('theoretical draw');
    expect(assembleEndgameAnswer({ result: tb({ category: 'cursed-win', whiteRelativeResult: null }), studentColor: 'white' })!.facts).toContain('fifty-move rule');
  });
  it('returns null on an uncertain category (no guessing)', () => {
    expect(assembleEndgameAnswer({ result: tb({ category: 'maybe-win', whiteRelativeResult: null }), studentColor: 'white' })).toBeNull();
    expect(assembleEndgameAnswer({ result: tb({ category: 'unknown', whiteRelativeResult: null }), studentColor: 'white' })).toBeNull();
  });
});

// Phase 1 cont: "who's winning / how do I stand?" — voices the engine eval (+ a
// top tactic) from the STUDENT's perspective. White-perspective eval in.
describe('assemblePositionAssessment — Phase 1 (who is winning / eval readout)', () => {
  it('voices the eval from the student POV (White)', () => {
    const a = assemblePositionAssessment({ evalCp: 120, mateIn: null, studentColor: 'white' });
    expect(a!.facts).toMatch(/You're clearly better — about 1\.2 pawns\./);
    expect(a!.sources).toEqual(['engine:stockfish']);
  });
  it('flips perspective for Black (white-positive eval = Black worse)', () => {
    const a = assemblePositionAssessment({ evalCp: 120, mateIn: null, studentColor: 'black' });
    expect(a!.facts).toMatch(/You're clearly worse — about 1\.2 pawns\./);
  });
  it('calls a balanced position balanced', () => {
    expect(assemblePositionAssessment({ evalCp: 10, mateIn: null, studentColor: 'white' })!.facts).toBe('The position is roughly balanced.');
  });
  it('voices a forced mate for / against the student', () => {
    expect(assemblePositionAssessment({ evalCp: null, mateIn: 3, studentColor: 'white' })!.facts).toContain('You have a forced mate in 3.');
    expect(assemblePositionAssessment({ evalCp: null, mateIn: 3, studentColor: 'black' })!.facts).toContain('forced mate against you in 3');
  });
  it('appends the top live-tactics fact (a hanging student piece) alongside the eval', () => {
    const a = assemblePositionAssessment({
      evalCp: -250, mateIn: null, studentColor: 'white',
      tactics: tactics({ hanging: [{ square: 'd5', piece: 'n', color: 'w' }] }),
    });
    expect(a!.facts).toContain("You're losing — about 2.5 pawns down."); // -250 white-POV, student is White
    expect(a!.facts).toContain('Your knight on d5 is hanging.');
    expect(a!.sources).toContain('board:chess.js');
  });
  it('returns null when there is nothing computed to say (no eval, no tactic)', () => {
    expect(assemblePositionAssessment({ evalCp: null, mateIn: null, studentColor: 'white' })).toBeNull();
    expect(assemblePositionAssessment({ evalCp: null, mateIn: null, studentColor: 'white', tactics: tactics() })).toBeNull();
  });
});

describe('explainBestMoveGrounded — hanging is legal-capture + SEE grounded (no pinned-attacker false positive)', () => {
  it('does NOT call a pawn hanging when its only attacker is PINNED (the 2026-06-27 e5 bug)', () => {
    // White Pe5 is "attacked" by Black Nd7, but the knight is pinned to the
    // Black king on d8 by the white rook on d1 — it can't legally capture, so
    // e5 is NOT hanging. White plays a quiet a3; best move (a3) wins nothing.
    const out = explainBestMoveGrounded('3k4/3n4/8/4P3/8/8/P7/3RK3 w - - 0 1', 'a3', 'a2a3', 'white');
    expect(out).toBeNull(); // never "left the pawn on e5 hanging"
  });

  it('reports the punishing capture when the played move hangs a piece to a LEGAL capture', () => {
    // White Pd4 is undefended and attacked by Black Nc6 (NOT pinned). White
    // plays the quiet Ke2 (best move d4-d5 escapes); after Ke2, Black has the
    // legal, material-winning Nxd4. bestMoveUci must be non-null or the helper
    // short-circuits before the cost clause.
    const out = explainBestMoveGrounded('4k3/8/2n5/8/3P4/8/8/4K3 w - - 0 1', 'Ke2', 'd4d5', 'white');
    expect(out).toContain('Nxd4'); // a real, legal, material-winning capture
    expect(out).toContain('winning the pawn');
  });
});

describe('explainMoveOrder — grounded "why THIS move first" (David 2026-06-27)', () => {
  // White Bc1, Black Qd8 + Nf6 + Kg8. Bg5 pins the f6-knight to the d8-queen
  // along the g5-d8 diagonal — the exact "bishop out before the queen" geometry.
  const PIN_FEN = '3q1rk1/8/5n2/8/8/8/8/2B1K3 w - - 0 1';

  it('names the PIN geometry (knight pinned to the queen)', () => {
    const out = explainMoveOrder({ fenBefore: PIN_FEN, betterSan: 'Bg5', worseSan: 'Ke2', moverColor: 'white' });
    expect(out).not.toBeNull();
    expect(out!.mechanism).toBe('pin');
    expect(out!.text).toContain('pins the knight on f6 to the queen on d8');
  });

  it('reports a CHECK as the forcing mechanism', () => {
    // Ra1 → a8 checks the e8-king along the 8th rank.
    const out = explainMoveOrder({ fenBefore: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1', betterSan: 'Ra8+', worseSan: 'Kd2', moverColor: 'white' });
    expect(out!.mechanism).toBe('check');
    expect(out!.text).toContain('comes with check');
  });

  it('reports a developing TEMPO (attacks an enemy piece)', () => {
    // Bf1 → c4 attacks the d5-knight; nothing valuable behind it → tempo, not pin.
    const out = explainMoveOrder({ fenBefore: '4k3/8/8/3n4/8/8/8/4KB2 w - - 0 1', betterSan: 'Bc4', worseSan: 'Ke2', moverColor: 'white' });
    expect(out!.mechanism).toBe('tempo');
    expect(out!.text).toContain('attacks the knight on d5');
  });

  it('reports MATERIAL when the better move wins a piece outright', () => {
    // Bc4 x d5 wins the pawn; Black can't recapture.
    const out = explainMoveOrder({ fenBefore: '4k3/8/8/3p4/2B5/8/8/4K3 w - - 0 1', betterSan: 'Bxd5', worseSan: 'Ke2', moverColor: 'white' });
    expect(out!.mechanism).toBe('material');
    expect(out!.text).toContain('wins the pawn on d5');
  });

  it('spells out the COST of the wrong order when a refutation is supplied', () => {
    const out = explainMoveOrder({ fenBefore: PIN_FEN, betterSan: 'Bg5', worseSan: 'Ke2', moverColor: 'white', worseRefutationSan: 'Qd4' });
    expect(out!.text).toContain('Ke2');
    expect(out!.text).toContain('Qd4');
  });

  it('returns null when the better move has no concrete geometry (empty > generic)', () => {
    const out = explainMoveOrder({ fenBefore: PIN_FEN, betterSan: 'Ke2', worseSan: 'Bg5', moverColor: 'white' });
    expect(out).toBeNull();
  });

  it('returns null when a move is illegal (never invents)', () => {
    const out = explainMoveOrder({ fenBefore: PIN_FEN, betterSan: 'Qh7', worseSan: 'Ke2', moverColor: 'white' });
    expect(out).toBeNull();
  });
});

describe('describeMoveGeometry — grounded one-phrase "what the move does" (David 2026-06-28)', () => {
  it('names a FORK (royal: king + rook)', () => {
    // Ng4 → f6 hits the g8-king (check) and the e8-rook (white king on g1 so
    // white isn't in check, making Nf6 legal).
    const out = describeMoveGeometry('4r1k1/8/8/8/6N1/8/8/6K1 w - - 0 1', 'Nf6+', 'white');
    expect(out).toContain('forks');
    expect(out).toContain('king on g8');
    expect(out).toContain('rook on e8');
  });

  it('names a PIN (knight to the queen)', () => {
    const out = describeMoveGeometry('3q1rk1/8/5n2/8/8/8/8/2B1K3 w - - 0 1', 'Bg5', 'white');
    expect(out).toBe('pins the knight on f6 to the queen on d8');
  });

  it('names a MATERIAL win', () => {
    const out = describeMoveGeometry('4k3/8/8/3p4/2B5/8/8/4K3 w - - 0 1', 'Bxd5', 'white');
    expect(out).toBe('wins the pawn on d5');
  });

  it('names a CHECK when the move only hits the king', () => {
    const out = describeMoveGeometry('4k3/8/8/8/8/8/8/R3K3 w - - 0 1', 'Ra8+', 'white');
    expect(out).toBe('gives check');
  });

  it('names a single ATTACK (tempo)', () => {
    const out = describeMoveGeometry('4k3/8/8/3n4/8/8/8/4KB2 w - - 0 1', 'Bc4', 'white');
    expect(out).toBe('attacks the knight on d5');
  });

  it('returns null for a quiet move with no threat (G3 — stay silent)', () => {
    expect(describeMoveGeometry('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', 'e3', 'white')).toBeNull();
  });

  it('returns null for an illegal move (never invents)', () => {
    expect(describeMoveGeometry('4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', 'Qh7', 'white')).toBeNull();
  });
});
