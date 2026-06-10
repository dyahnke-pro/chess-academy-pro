import { describe, it, expect } from 'vitest';
import { assembleMoveEvalAnswer, assembleTacticsAnswer, assembleProgressAnswer, assembleMasterPlayAnswer, assemblePlanAnswer, assembleConceptAnswer, assemblePlayerGamesAnswer, assembleEndgameAnswer } from './groundedAnswer';
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
