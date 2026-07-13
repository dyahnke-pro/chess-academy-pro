import { describe, it, expect } from 'vitest';
import { assembleMoveEvalAnswer, assembleCandidateMoveAnswer, assembleTacticsAnswer, assembleProgressAnswer, assembleWeaknessRecommendation, weaknessTopicFromText, assembleOpeningProfileAnswer, assembleStatsAnswer, assembleStrengthsAnswer, assembleOpeningAccuracyAnswer, assembleOpeningTrapsAnswer, assembleReviewDueAnswer, assembleMistakesAnswer, assembleErrorsBySituationAnswer, assembleMisconceptionsAnswer, assembleTacticsProfileAnswer, assemblePhaseProfileAnswer, assembleRepertoireGapAnswer, assembleAccuracyAnswer, assembleConsistencyAnswer, assembleConvertingAnswer, assembleColorAnswer, assembleRecordsAnswer, assembleOpeningRecordAnswer, assembleOpponentRecordAnswer, assembleMoveRatingAnswer, assemblePuzzleStatsAnswer, assembleTransferGapAnswer, assembleSkillRadarAnswer, assembleMasterPlayAnswer, assemblePlanAnswer, assembleConceptAnswer, assemblePlayerGamesAnswer, assembleEndgameAnswer, assemblePositionAssessment, assembleTrendAnswer, assembleAppHelpAnswer, explainBestMoveGrounded, explainMoveOrder, describeMoveGeometry, assembleAlternativesAnswer } from './groundedAnswer';
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

describe('assembleOpeningAccuracyAnswer — grounded "how accurate am I in my opening / weakest part to work on"', () => {
  const base = { openingName: 'Caro-Kann Defense', color: 'black', drillAccuracy: 0.78, drillAttempts: 12 };
  it('voices the opening-level accuracy from drill data', () => {
    const a = assembleOpeningAccuracyAnswer(base);
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/In your Caro-Kann Defense as Black, you're drilling at 78% over 12 attempts/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('names the weakest variation when variationAccuracy is present', () => {
    const a = assembleOpeningAccuracyAnswer({ ...base, weakestVariation: { name: 'Advance Variation', accuracy: 0.41 } });
    expect(a!.facts).toMatch(/weakest line is the Advance Variation at 41%/);
  });
  it('names the most-missed position from the weak-spot store', () => {
    const a = assembleOpeningAccuracyAnswer({ ...base, topWeakSpot: { san: 'Bf5', failCount: 4 } });
    expect(a!.facts).toMatch(/the right move is Bf5, and you've slipped there 4 times/);
  });
  it('handles the singular "1 time" / "1 attempt" grammar', () => {
    const a = assembleOpeningAccuracyAnswer({ ...base, drillAttempts: 1, topWeakSpot: { san: 'Bf5', failCount: 1 } });
    expect(a!.facts).toMatch(/over 1 attempt\b/);
    expect(a!.facts).toMatch(/slipped there 1 time\b/);
  });
  it('leads with an un-drilled line when there are weak spots but no drills', () => {
    const a = assembleOpeningAccuracyAnswer({ ...base, drillAccuracy: 0, drillAttempts: 0, topWeakSpot: { san: 'Bf5', failCount: 2 } });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/haven't drilled the Caro-Kann Defense as Black main line yet/);
    expect(a!.facts).toMatch(/the right move is Bf5/);
  });
  it('omits the color clause when color is null', () => {
    const a = assembleOpeningAccuracyAnswer({ ...base, color: null });
    expect(a!.facts).toMatch(/In your Caro-Kann Defense, you're drilling/);
    expect(a!.facts).not.toMatch(/as (White|Black)/);
  });
  it('returns null when nothing drilled and no weak spot / variation data', () => {
    expect(assembleOpeningAccuracyAnswer({ openingName: 'X', drillAccuracy: 0, drillAttempts: 0 })).toBeNull();
  });
});

describe('assembleOpeningTrapsAnswer — grounded "traps in my strongest opening / watch out for"', () => {
  const white = { name: 'Italian Game', color: 'white' as const, traps: ['Fried Liver Attack', 'Legal Mate'], warnings: ['Blackburne Shilling Gambit'] };
  const black = { name: 'Caro-Kann Defense', color: 'black' as const, traps: ['Elephant Trap'], warnings: [] };
  it('names trap weapons + watch-outs per side and points at the drill', () => {
    const a = assembleOpeningTrapsAnswer({ sides: [white, black] });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/Your strongest White opening is the Italian Game\./);
    expect(a!.facts).toMatch(/Trap weapons you can spring: Fried Liver Attack; Legal Mate\./);
    expect(a!.facts).toMatch(/Watch out for: Blackburne Shilling Gambit\./);
    expect(a!.facts).toMatch(/Your strongest Black opening is the Caro-Kann Defense\./);
    expect(a!.facts).toMatch(/Say "punish lines for the Italian Game" and I'll run the drill\./);
    expect(a!.sources).toContain('data:your-games');
  });
  it('caps trap weapons at 3', () => {
    const a = assembleOpeningTrapsAnswer({ sides: [{ name: 'X', color: 'white', traps: ['a', 'b', 'c', 'd', 'e'], warnings: [] }] });
    expect(a!.facts).toMatch(/a; b; c\./);
    expect(a!.facts).not.toMatch(/\bd; e\b/);
  });
  it('appends the WLPP teaching-system explanation only when asked', () => {
    const withSys = assembleOpeningTrapsAnswer({ sides: [white], explainSystem: true });
    expect(withSys!.facts).toMatch(/Watch, Learn, Practice, Play/);
    const without = assembleOpeningTrapsAnswer({ sides: [white] });
    expect(without!.facts).not.toMatch(/Watch, Learn, Practice, Play/);
  });
  it('handles a side with only warnings (no trap weapons)', () => {
    const a = assembleOpeningTrapsAnswer({ sides: [{ name: 'Petroff', color: 'black', traps: [], warnings: ['the early queen sortie'] }] });
    expect(a!.facts).toMatch(/Watch out for: the early queen sortie\./);
    expect(a!.facts).not.toMatch(/Trap weapons/);
  });
  it('filters empty strings and drops sides with no traps or warnings', () => {
    const a = assembleOpeningTrapsAnswer({ sides: [
      { name: 'Empty', color: 'white', traps: ['', '  '], warnings: [] },
      black,
    ] });
    expect(a!.facts).not.toMatch(/Empty/);
    expect(a!.facts).toMatch(/Caro-Kann/);
  });
  it('returns null when no side carries any trap or warning (and no system ask)', () => {
    expect(assembleOpeningTrapsAnswer({ sides: [] })).toBeNull();
    expect(assembleOpeningTrapsAnswer({ sides: [{ name: 'X', color: 'white', traps: [], warnings: [] }] })).toBeNull();
  });
  it('answers the teaching-SYSTEM ask even with no named traps (never a drill freestyle)', () => {
    const a = assembleOpeningTrapsAnswer({ sides: [], explainSystem: true });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/Watch, Learn, Practice, Play/);
    expect(a!.facts).toMatch(/Ask me for the traps in your strongest opening/);
    // no named traps → no "punish lines for" drill-launch line
    expect(a!.facts).not.toMatch(/punish lines for/);
  });
});

describe('assembleReviewDueAnswer — grounded "what\'s due for review today"', () => {
  it('voices the due count + per-opening breakdown + the CTA', () => {
    const a = assembleReviewDueAnswer({
      dueCount: 14, totalEnrolled: 40,
      dueOpenings: [{ name: 'Caro-Kann Defense', dueCards: 9 }, { name: 'Italian Game', dueCards: 5 }],
    });
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/14 cards due for review right now across 2 openings/);
    expect(a!.facts).toMatch(/Mostly the Caro-Kann Defense \(9\), the Italian Game \(5\)/);
    expect(a!.facts).toMatch(/Say "review my openings" and I'll run today's reps/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('caps the per-opening breakdown at 3', () => {
    const a = assembleReviewDueAnswer({
      dueCount: 20, totalEnrolled: 50,
      dueOpenings: [
        { name: 'A', dueCards: 8 }, { name: 'B', dueCards: 6 }, { name: 'C', dueCards: 4 }, { name: 'D', dueCards: 2 },
      ],
    });
    expect(a!.facts).toMatch(/the A \(8\), the B \(6\), the C \(4\)/);
    expect(a!.facts).not.toMatch(/the D \(2\)/);
  });
  it('handles the singular "1 card" grammar', () => {
    const a = assembleReviewDueAnswer({ dueCount: 1, totalEnrolled: 10, dueOpenings: [{ name: 'X', dueCards: 1 }] });
    expect(a!.facts).toMatch(/1 card due for review right now\b/);
    expect(a!.facts).not.toMatch(/across \d+ openings/); // 1 opening → no "across"
  });
  it('gives the all-caught-up line when nothing is due but cards are enrolled', () => {
    const a = assembleReviewDueAnswer({ dueCount: 0, totalEnrolled: 25, dueOpenings: [] });
    expect(a!.facts).toMatch(/all caught up/);
    expect(a!.facts).toMatch(/25 opening cards in rotation/);
  });
  it('returns null when nothing is enrolled (caller takes the onboarding line)', () => {
    expect(assembleReviewDueAnswer({ dueCount: 0, totalEnrolled: 0, dueOpenings: [] })).toBeNull();
  });
});

describe('assembleMistakesAnswer — Wave 1 "where do I go wrong" (+ suggestion)', () => {
  const base = {
    totalGames: 40, blundersPerGame: 1.2, mistakesPerGame: 2.4, avgCpLoss: 55,
    worstPhase: { phase: 'middlegame', errors: 31 },
    thrownWins: 1,
    costliest: { san: 'Qxd4', cpLoss: 640, opponentName: 'GM Smith', openingName: 'Caro-Kann' },
  };
  it('voices the rate, worst phase, and costliest slip with a suggestion', () => {
    const a = assembleMistakesAnswer(base);
    expect(a).not.toBeNull();
    expect(a!.facts).toMatch(/Across 40 games you average 1\.2 blunders and 2\.4 mistakes a game, losing about 55 centipawns/);
    expect(a!.facts).toMatch(/Most of your errors land in the middlegame \(31 there\)/);
    expect(a!.facts).toMatch(/costliest slip was Qxd4 against GM Smith, dropping 6\.4 pawns in the Caro-Kann/);
    expect(a!.facts).toMatch(/Focus your training on the middlegame/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('suggests converting when thrown wins dominate', () => {
    const a = assembleMistakesAnswer({ ...base, thrownWins: 4 });
    expect(a!.facts).toMatch(/let 4 winning positions slip/);
    expect(a!.facts).toMatch(/converting winning positions/);
  });
  it('returns null with no analyzed games', () => {
    expect(assembleMistakesAnswer({ ...base, totalGames: 0 })).toBeNull();
  });
});

describe('assembleTacticsProfileAnswer — Wave 1 (+ drill suggestion)', () => {
  const base = {
    totalGames: 40, awarenessRate: 62, found: 18, missed: 11,
    missedByType: [{ type: 'fork', count: 6 }, { type: 'pin', count: 3 }],
    worstPhase: { phase: 'middlegame', count: 7 },
  };
  it('voices awareness + top missed motif + phase, and suggests drilling it', () => {
    const a = assembleTacticsProfileAnswer(base);
    expect(a!.facts).toMatch(/tactical awareness is 62% — you spot 18 tactics and miss 11/);
    expect(a!.facts).toMatch(/motif you miss most is the fork \(6 times\)/);
    expect(a!.facts).toMatch(/misses come in the middlegame/);
    expect(a!.facts).toMatch(/Drill fork puzzles to close that gap/);
  });
  it('voices the miss cost, the single worst miss, and the best sequence when provided (David 2026-07-13)', () => {
    const a = assembleTacticsProfileAnswer({
      ...base,
      topMissAvgCost: 180,
      worstMiss: { san: 'Nxe5', opponentName: 'Rival' },
      bestSequence: { san: 'Qxh7+', opponentName: 'Victim' },
    });
    expect(a!.facts).toMatch(/cost about 1\.8 pawns each/);
    expect(a!.facts).toMatch(/costliest miss was Nxe5 against Rival/);
    expect(a!.facts).toMatch(/sharpest shot on record: Qxh7\+ against Victim/);
  });
  it('returns null when there is no found/missed data', () => {
    expect(assembleTacticsProfileAnswer({ ...base, found: 0, missed: 0 })).toBeNull();
    expect(assembleTacticsProfileAnswer({ ...base, totalGames: 0 })).toBeNull();
  });
  it('voices missed wins and late-game collapses when present (David 2026-07-13)', () => {
    const a = assembleMistakesAnswer({
      totalGames: 40, blundersPerGame: 1.2, mistakesPerGame: 2.1, avgCpLoss: 90,
      worstPhase: { phase: 'middlegame', errors: 30 }, thrownWins: 3,
      missedWins: 5, lateGameCollapses: 4,
      costliest: { san: 'Qxh7', cpLoss: 620, opponentName: 'Rival', openingName: 'the Sicilian' },
    });
    expect(a!.facts).toMatch(/5 winning shots? sat on the board/);
    expect(a!.facts).toMatch(/4 games collapsed late/);
  });
  it('does NOT claim "100% awareness" or contradict itself when nothing was missed (David 2026-07-13)', () => {
    // missed === 0 ⟹ awarenessRate degenerates to 100. The old copy read
    // "tactical awareness is 100% … you miss 0. Keep drilling to lift your
    // awareness rate" — a fake stat + self-contradiction. Assert the new copy.
    const a = assembleTacticsProfileAnswer({
      ...base, awarenessRate: 100, found: 1722, missed: 0, missedByType: [], worstPhase: null,
    });
    expect(a!.facts).not.toMatch(/100%/);
    expect(a!.facts).not.toMatch(/lift your awareness rate/);
    expect(a!.facts).toMatch(/don't see a missed tactical shot/);
    expect(a!.facts).toMatch(/1722 sharp tactical moves/);
  });
});

describe('assembleErrorsBySituationAnswer (David 2026-07-13)', () => {
  it('names where errors concentrate and coaches the winning-relaxation leak', () => {
    const a = assembleErrorsBySituationAnswer({ winning: 12, equal: 5, losing: 3 });
    expect(a!.facts).toMatch(/20 serious errors/);
    expect(a!.facts).toMatch(/60% \(12\) come when you're already winning/);
    expect(a!.facts).toMatch(/relaxing once you're ahead/);
  });
  it('coaches the losing case differently', () => {
    const a = assembleErrorsBySituationAnswer({ winning: 1, equal: 2, losing: 9 });
    expect(a!.facts).toMatch(/when you're already worse/);
    expect(a!.facts).toMatch(/under pressure/);
  });
  it('returns null with no errors', () => {
    expect(assembleErrorsBySituationAnswer({ winning: 0, equal: 0, losing: 0 })).toBeNull();
  });
});

describe('assembleMisconceptionsAnswer (David 2026-07-13)', () => {
  it('voices the top misconception + bucket + still-active + recency', () => {
    const a = assembleMisconceptionsAnswer({
      top: { label: 'hangs a piece to a fork', bucket: 'tactical', total: 14, openCount: 3, lastSeenDaysAgo: 2 },
      distinctTags: 4,
    });
    expect(a!.facts).toMatch(/hangs a piece to a fork/);
    expect(a!.facts).toMatch(/logged 14 times/);
    expect(a!.facts).toMatch(/tactical misconception/);
    expect(a!.facts).toMatch(/last made it 2 days ago/);
    expect(a!.facts).toMatch(/still an active pattern/);
    expect(a!.facts).toMatch(/4 distinct misconception patterns/);
  });
  it('says resting when nothing is due (old error, not still making it)', () => {
    const a = assembleMisconceptionsAnswer({
      top: { label: 'pushes pawns in front of the king', bucket: 'positional', total: 6, openCount: 0, lastSeenDaysAgo: 60 },
      distinctTags: 1,
    });
    expect(a!.facts).toMatch(/about 2 months ago/);
    expect(a!.facts).toMatch(/resting for now/);
  });
  it('returns null with no logged misconceptions', () => {
    expect(assembleMisconceptionsAnswer({ top: null, distinctTags: 0 })).toBeNull();
  });
});

describe('assemblePhaseProfileAnswer — Wave 1 (+ focus suggestion)', () => {
  const base = {
    phaseAccuracy: [
      { phase: 'opening', accuracy: 88, mistakes: 2, moveCount: 300 },
      { phase: 'middlegame', accuracy: 74, mistakes: 20, moveCount: 500 },
      { phase: 'endgame', accuracy: 61, mistakes: 12, moveCount: 180 },
    ],
    criticalByPhase: [
      { phase: 'opening', accuracyPct: 80, total: 20 },
      { phase: 'endgame', accuracyPct: 45, total: 15 },
    ],
  };
  it('reads out per-phase accuracy, names the weakest, and folds in critical moments', () => {
    const a = assemblePhaseProfileAnswer(base);
    expect(a!.facts).toMatch(/opening 88%, middlegame 74%, endgame 61%/);
    expect(a!.facts).toMatch(/weakest is the endgame at 61%/);
    expect(a!.facts).toMatch(/critical moments, the endgame is softest — you find the best move 45%/);
    expect(a!.facts).toMatch(/Put your training into the endgame/);
  });
  it('returns null when no phase has played moves', () => {
    expect(assemblePhaseProfileAnswer({ phaseAccuracy: [{ phase: 'opening', accuracy: 0, mistakes: 0, moveCount: 0 }], criticalByPhase: [] })).toBeNull();
  });
});

describe('assembleRepertoireGapAnswer — Wave 2 (the promoted cluster + suggestion)', () => {
  const worst = [{ name: 'Sicilian Defense', winRate: 34, games: 22 }, { name: 'French Defense', winRate: 41, games: 15 }];
  it('out-of-book: voices the off-book rate + costliest matchup + suggestion', () => {
    const a = assembleRepertoireGapAnswer({ kind: 'out-of-book', offBookPct: 38, totalGames: 60, worstAgainst: worst });
    expect(a!.facts).toMatch(/About 38% of your games leave your prepared repertoire/);
    expect(a!.facts).toMatch(/score only 34% against Sicilian Defense over 22 games/);
    expect(a!.facts).toMatch(/Extend your prep against Sicilian Defense/);
    expect(a!.sources).toContain('data:your-games');
  });
  it('hole: names the softest matchup + runner-up + a fix offer', () => {
    const a = assembleRepertoireGapAnswer({ kind: 'hole', offBookPct: 38, totalGames: 60, worstAgainst: worst });
    expect(a!.facts).toMatch(/softest spot is Sicilian Defense — you score just 34% against it over 22 games/);
    expect(a!.facts).toMatch(/then French Defense \(41%\)/);
    expect(a!.facts).toMatch(/Want a solid line against Sicilian Defense/);
  });
  it('learn-next: recommends a line against the worst matchup', () => {
    const a = assembleRepertoireGapAnswer({ kind: 'learn-next', offBookPct: null, totalGames: 60, worstAgainst: worst });
    expect(a!.facts).toMatch(/opening to learn next is a real answer to Sicilian Defense/);
    expect(a!.facts).toMatch(/worst matchup at 34% over 22 games/);
  });
  it('hole with only off-book data (no worst matchup) points at prep depth', () => {
    const a = assembleRepertoireGapAnswer({ kind: 'hole', offBookPct: 45, totalGames: 30, worstAgainst: [] });
    expect(a!.facts).toMatch(/about 45% of your games leave book/);
  });
  it('returns null with no data', () => {
    expect(assembleRepertoireGapAnswer({ kind: 'hole', offBookPct: null, totalGames: 0, worstAgainst: [] })).toBeNull();
    expect(assembleRepertoireGapAnswer({ kind: 'learn-next', offBookPct: null, totalGames: 50, worstAgainst: [] })).toBeNull();
  });
});

describe('Wave 3 assemblers (staged) — accuracy / consistency / converting', () => {
  it('assembleAccuracyAnswer voices accuracy, per-colour, agreement + suggestion', () => {
    const a = assembleAccuracyAnswer({ totalGames: 40, avgAccuracy: 82, accuracyWhite: 86, accuracyBlack: 74, bestMoveAgreement: 51, brilliant: 3, great: 12, blunders: 40 });
    expect(a!.facts).toMatch(/average accuracy is 82%/);
    expect(a!.facts).toMatch(/As White you play at 86%, as Black 74%/);
    expect(a!.facts).toMatch(/match the engine's top move 51%/);
    expect(a!.facts).toMatch(/Black games are the weaker side/); // colorGap 12 ≥ 8
    expect(a!.sources).toContain('data:your-games');
  });
  it('assembleAccuracyAnswer returns null with no analyzed games', () => {
    expect(assembleAccuracyAnswer({ totalGames: 0, avgAccuracy: 0, accuracyWhite: 0, accuracyBlack: 0, bestMoveAgreement: 0, brilliant: 0, great: 0, blunders: 0 })).toBeNull();
  });
  it('assembleConsistencyAnswer voices streak + best/worst time control + suggestion', () => {
    const a = assembleConsistencyAnswer({ currentWinStreak: 3, longestWinStreak: 7, timeControls: [
      { bucket: 'blitz', winRatePct: 61, games: 120, avgAccuracyPct: 80 },
      { bucket: 'bullet', winRatePct: 44, games: 60, avgAccuracyPct: 72 },
    ] });
    expect(a!.facts).toMatch(/on a 3-game win streak \(your best is 7\)/);
    expect(a!.facts).toMatch(/play best at blitz \(61% over 120 games\), and weakest at bullet \(44%\)/);
    expect(a!.facts).toMatch(/slow down in your bullet games/);
  });
  it('assembleConvertingAnswer voices thrown wins vs comebacks + win shape + suggestion', () => {
    const a = assembleConvertingAnswer({ totalWins: 28, thrownWins: 4, comebackWins: 2, quickWins: 6, grindWins: 14, midLengthWins: 8 });
    expect(a!.facts).toMatch(/thrown away 4 winning positions/);
    expect(a!.facts).toMatch(/pulled off 2 comeback wins/);
    expect(a!.facts).toMatch(/Of your 28 wins: 6 quick, 8 mid-length, 14 grind/);
    expect(a!.facts).toMatch(/Converting winning positions is your biggest leak/); // thrownWins ≥ 2
  });
  it('assembleConvertingAnswer returns null with no wins or data', () => {
    expect(assembleConvertingAnswer({ totalWins: 0, thrownWins: 0, comebackWins: 0, quickWins: 0, grindWins: 0, midLengthWins: 0 })).toBeNull();
  });
});

describe('Wave 4 assemblers — colour / records / puzzle-stats / transfer-gap', () => {
  it('assembleColorAnswer voices per-colour win rate + inversion callout', () => {
    const a = assembleColorAnswer({ totalGames: 50, winRateWhite: 58, winRateBlack: 66, accuracyWhite: 80, accuracyBlack: 82, inversion: { preferredColor: 'White', otherColor: 'Black', inversionPoints: 8 } });
    expect(a!.facts).toMatch(/As White you win 58%, as Black 66%/);
    expect(a!.facts).toMatch(/you play White more, but you actually score better as Black/);
    expect(a!.facts).toMatch(/Lean into your Black games/);
  });
  it('assembleColorAnswer returns null with no games', () => {
    expect(assembleColorAnswer({ totalGames: 0, winRateWhite: 0, winRateBlack: 0, accuracyWhite: 0, accuracyBlack: 0, inversion: null })).toBeNull();
  });
  it('assembleRecordsAnswer voices the bests', () => {
    const a = assembleRecordsAnswer({ totalGames: 40, highestBeaten: { name: 'GM X', elo: 2400 }, fastestWin: { moves: 14 }, longestGame: { moves: 96 }, bestAccuracyGame: { accuracyPct: 97 } });
    expect(a!.facts).toMatch(/best scalp is GM X \(2400\)/);
    expect(a!.facts).toMatch(/fastest win took 14 moves/);
  });
  it('assembleOpeningRecordAnswer voices W/D/L + win rate + a weak-spot suggestion', () => {
    const a = assembleOpeningRecordAnswer({ openingName: 'Sicilian Defense', games: 20, wins: 6, draws: 4, losses: 10, asWhite: 0, asBlack: 20, winRatePct: 30 });
    expect(a!.facts).toMatch(/Sicilian Defense you're 6W-4D-10L across 20 games/);
    expect(a!.facts).toMatch(/30% win rate/);
    expect(a!.facts).toMatch(/weak spot worth drilling/);
    expect(a!.facts).toMatch(/20 as Black/);
  });
  it('assembleOpeningRecordAnswer calls out a strength above 60%', () => {
    const a = assembleOpeningRecordAnswer({ openingName: 'Italian Game', games: 10, wins: 7, draws: 1, losses: 2, asWhite: 10, asBlack: 0, winRatePct: 70 });
    expect(a!.facts).toMatch(/is a strength/);
  });
  it('assembleOpeningRecordAnswer returns null with no games', () => {
    expect(assembleOpeningRecordAnswer({ openingName: 'French Defense', games: 0, wins: 0, draws: 0, losses: 0, asWhite: 0, asBlack: 0, winRatePct: 0 })).toBeNull();
  });
  it('assembleOpponentRecordAnswer voices the head-to-head + avg elo', () => {
    const a = assembleOpponentRecordAnswer({ opponentName: 'DrNykterstein', games: 5, wins: 1, draws: 1, losses: 3, avgOpponentElo: 2850 });
    expect(a!.facts).toMatch(/Against DrNykterstein \(averaging 2850\) you're 1W-1D-3L across 5 games/);
    expect(a!.facts).toMatch(/better of it/);
  });
  it('assembleOpponentRecordAnswer omits elo when unknown and returns null with no games', () => {
    const a = assembleOpponentRecordAnswer({ opponentName: 'rival42', games: 2, wins: 2, draws: 0, losses: 0, avgOpponentElo: null });
    expect(a!.facts).toMatch(/Against rival42 you're 2W-0D-0L/);
    expect(a!.facts).not.toMatch(/averaging/);
    expect(assembleOpponentRecordAnswer({ opponentName: 'x', games: 0, wins: 0, draws: 0, losses: 0, avgOpponentElo: null })).toBeNull();
  });
  it('assembleMoveRatingAnswer voices "best" with no arrow', () => {
    const a = assembleMoveRatingAnswer({ playedSan: 'Nf3', wasBest: true, cpLoss: 0, quality: 'best', betterSan: null, betterFromTo: null, missedMate: null, allowedMate: null });
    expect(a!.facts).toMatch(/Nf3 was the engine's top move/);
    expect(a!.bestMoveFromTo).toBeNull();
    expect(a!.sources).toContain('engine:stockfish');
  });
  it('assembleMoveRatingAnswer voices a mistake with the better move + arrow', () => {
    const a = assembleMoveRatingAnswer({ playedSan: 'd3', wasBest: false, cpLoss: 250, quality: 'mistake', betterSan: 'd4', betterFromTo: { from: 'd2', to: 'd4' }, missedMate: null, allowedMate: null });
    expect(a!.facts).toMatch(/d3 is a mistake: it cost about 2\.5 pawns\. The engine preferred d4\./);
    expect(a!.bestMoveFromTo).toEqual({ from: 'd2', to: 'd4' });
    expect(a!.bestMoveSan).toBe('d4');
  });
  it('assembleMoveRatingAnswer calls out a missed mate and a walked-into mate', () => {
    const missed = assembleMoveRatingAnswer({ playedSan: 'Nc3', wasBest: false, cpLoss: 40, quality: 'blunder', betterSan: 'Qh5', betterFromTo: { from: 'd1', to: 'h5' }, missedMate: 2, allowedMate: null });
    expect(missed!.facts).toMatch(/Nc3 misses a forced mate in 2/);
    const walked = assembleMoveRatingAnswer({ playedSan: 'Kg1', wasBest: false, cpLoss: 900, quality: 'blunder', betterSan: 'Rf1', betterFromTo: { from: 'f8', to: 'f1' }, missedMate: null, allowedMate: 1 });
    expect(walked!.facts).toMatch(/Kg1 walks into a forced mate in 1/);
  });
  it('assemblePuzzleStatsAnswer voices rating + solved + due', () => {
    const a = assemblePuzzleStatsAnswer({ puzzleRating: 1650, totalAttempted: 200, totalCorrect: 150, overallAccuracy: 75, duePuzzles: 8 });
    expect(a!.facts).toMatch(/puzzle rating is 1650/);
    expect(a!.facts).toMatch(/solved 150 of 200 \(75%\)/);
    expect(a!.facts).toMatch(/8 are due to retry/);
  });
  it('assembleTransferGapAnswer voices the puzzle-vs-game gap for the worst motif', () => {
    const a = assembleTransferGapAnswer({ worst: { tacticType: 'fork', puzzleAccuracyPct: 82, gameRecognitionPct: 55, gapPoints: 27 } });
    expect(a!.facts).toMatch(/solve fork puzzles at 82% but only spot them in your own games 55%/);
    expect(a!.facts).toMatch(/27-point gap/);
  });
  it('assembleTransferGapAnswer returns null when the gap is small', () => {
    expect(assembleTransferGapAnswer({ worst: { tacticType: 'pin', puzzleAccuracyPct: 70, gameRecognitionPct: 65, gapPoints: 5 } })).toBeNull();
    expect(assembleTransferGapAnswer({ worst: null })).toBeNull();
  });
});

describe('assembleSkillRadarAnswer — Wave 4 (skill breakdown + weakest-axis suggestion)', () => {
  it('voices the 5 axes, names strongest + weakest, suggests the weakest', () => {
    const a = assembleSkillRadarAnswer({ opening: 72, tactics: 55, endgame: 40, memory: 68, calculation: 60 });
    expect(a!.facts).toMatch(/opening 72, tactics 55, endgame 40, memory 68, calculation 60/);
    expect(a!.facts).toMatch(/strongest is opening \(72\) and your weakest is endgame \(40\)/);
    expect(a!.facts).toMatch(/Put your training into endgame/);
  });
  it('returns null when nothing is computed', () => {
    expect(assembleSkillRadarAnswer({ opening: 0, tactics: 0, endgame: 0, memory: 0, calculation: 0 })).toBeNull();
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

describe('assembleTrendAnswer (David 2026-07-04: "am I improving?" → temporal trend)', () => {
  // Minimal PhaseStrengthMatrix-shaped fixture: 3 months, 3 phases.
  const matrix = (cells: Record<'opening' | 'middlegame' | 'endgame', Array<[number | null, number]>>) => ({
    monthsAsc: ['2026-05', '2026-06', '2026-07'],
    monthLabels: ['May 26', 'Jun 26', 'Jul 26'],
    rows: (['opening', 'middlegame', 'endgame'] as const).map((phase) => ({
      phase,
      cells: cells[phase].map(([accuracyPct, samples]) => ({ accuracyPct, samples })),
    })),
  });

  it('reports a CLIMB when overall accuracy rose', () => {
    const out = assembleTrendAnswer(matrix({
      opening: [[60, 10], [70, 10], [80, 10]],
      middlegame: [[50, 10], [55, 10], [60, 10]],
      endgame: [[40, 10], [45, 10], [50, 10]],
    }));
    expect(out).not.toBeNull();
    expect(out!.facts).toContain('climbed');
    expect(out!.facts).toContain('improving');
    // Every number spoken must come from the computed monthly averages.
    expect(out!.facts).toMatch(/50%.*63%|climbed from 50% in May 26 to 63% in Jul 26/);
  });

  it('reports a SLIP when overall accuracy fell', () => {
    const out = assembleTrendAnswer(matrix({
      opening: [[80, 10], [70, 10], [60, 10]],
      middlegame: [[80, 10], [70, 10], [60, 10]],
      endgame: [[80, 10], [70, 10], [60, 10]],
    }));
    expect(out).not.toBeNull();
    expect(out!.facts).toContain('slipped');
  });

  it('reports STEADY when accuracy barely moved', () => {
    const out = assembleTrendAnswer(matrix({
      opening: [[70, 10], [71, 10], [70, 10]],
      middlegame: [[70, 10], [70, 10], [71, 10]],
      endgame: [[70, 10], [69, 10], [70, 10]],
    }));
    expect(out).not.toBeNull();
    expect(out!.facts).toContain('held roughly steady');
  });

  it('returns null with fewer than two months of data (never fakes a trend)', () => {
    const out = assembleTrendAnswer(matrix({
      opening: [[null, 0], [null, 0], [80, 10]],
      middlegame: [[null, 0], [null, 0], [60, 10]],
      endgame: [[null, 0], [null, 0], [50, 10]],
    }));
    expect(out).toBeNull();
  });

  it('names the standout phase when one swung hardest', () => {
    const out = assembleTrendAnswer(matrix({
      opening: [[50, 10], [65, 10], [80, 10]],   // +30 — biggest swing
      middlegame: [[60, 10], [61, 10], [62, 10]],
      endgame: [[60, 10], [60, 10], [61, 10]],
    }));
    expect(out).not.toBeNull();
    expect(out!.facts).toContain('opening');
    expect(out!.facts).toContain('improved the most');
  });
});

describe('assembleAppHelpAnswer — F15 grounded "what does the X tab do"', () => {
  it('voices the app route manifest title + description', () => {
    const a = assembleAppHelpAnswer({
      title: 'Play with the Coach',
      description: 'Live chess game against the coach with adaptive difficulty, hints, and post-game review.',
    });
    expect(a).not.toBeNull();
    expect(a!.facts).toContain('Play with the Coach');
    expect(a!.facts).toContain('adaptive difficulty');
    expect(a!.sources).toEqual(['app:routes']);
    // Pure app-copy answer — no chess move attached.
    expect(a!.bestMoveSan).toBeNull();
  });

  it('returns null when there is nothing to voice', () => {
    expect(assembleAppHelpAnswer({ title: '', description: 'x' })).toBeNull();
    expect(assembleAppHelpAnswer({ title: 'Tactics', description: '   ' })).toBeNull();
  });
});

// Bug 2 (David 2026-07-10): "is Qf3 ok" must EVALUATE the named move against
// Stockfish + the DB — not deflect to "the best move is Nf3". Everything is
// computed (chess.js legality + the eval params + master frequency); the
// assembler never fabricates.
describe('assembleCandidateMoveAnswer — evaluate the NAMED move', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('affirms when the named move IS the engine best move', () => {
    const a = assembleCandidateMoveAnswer({ fen: START, candidateSan: 'e4', bestMoveUci: 'e2e4', bestEvalCp: 30, candidateEvalCp: 30 });
    expect(a?.facts).toMatch(/e4 is the best move/i);
  });

  it('answers an ILLEGAL named move honestly, never fabricating an eval', () => {
    const a = assembleCandidateMoveAnswer({ fen: START, candidateSan: 'e5', bestMoveUci: 'e2e4', bestEvalCp: 30, candidateEvalCp: 0 });
    expect(a?.facts).toMatch(/isn't a legal move/i);
    expect(a?.bestMoveSan).toBeNull();
  });

  it('grades a slightly-worse legal move as PLAYABLE (cp-loss vs best), not "best is X"', () => {
    // best e4 (+0.3 mover POV), candidate a3 (-0.1 mover POV) → 40cp loss.
    const a = assembleCandidateMoveAnswer({ fen: START, candidateSan: 'a3', bestMoveUci: 'e2e4', bestEvalCp: 30, candidateEvalCp: -10 });
    expect(a?.facts).toMatch(/a3/);
    expect(a?.facts).toMatch(/playable|fine|slightly worse/i);
    expect(a?.facts).not.toMatch(/best move is a3/i);
  });

  it('grades a large cp-loss as a mistake and names the better move', () => {
    const a = assembleCandidateMoveAnswer({ fen: START, candidateSan: 'a3', bestMoveUci: 'e2e4', bestEvalCp: 30, candidateEvalCp: -300 });
    expect(a?.facts).toMatch(/mistake/i);
    expect(a?.facts).toMatch(/\be4\b/);
  });

  it('flags a candidate that walks into mate', () => {
    const a = assembleCandidateMoveAnswer({ fen: START, candidateSan: 'a3', bestMoveUci: 'e2e4', candidateMateIn: -2 });
    expect(a?.facts).toMatch(/mate in 2/i);
  });

  it('cites master frequency when the DB covers the move (DB ground alongside engine)', () => {
    const a = assembleCandidateMoveAnswer({ fen: START, candidateSan: 'a3', bestMoveUci: 'e2e4', bestEvalCp: 30, candidateEvalCp: 22, masterFreqPct: 8 });
    expect(a?.facts).toMatch(/8%/);
  });
});

describe('assemblePlayerGamesAnswer — honest empty for a NAMED player (Bug 1)', () => {
  it('answers honestly when we have no games for the named player (never invents)', () => {
    const a = assemblePlayerGamesAnswer({
      playerId: 'gothamchess', requestedPlayerName: 'GothamChess',
      openingId: 'caro-kann', openingName: 'Caro-Kann', totalAvailable: 0, games: [],
    });
    expect(a?.facts).toMatch(/don't have/i);
    expect(a?.facts).toMatch(/GothamChess/);
    expect(a?.facts).toMatch(/Caro-Kann/);
  });

  it('still returns null for an UN-named empty lookup (falls through, no honest-empty)', () => {
    expect(assemblePlayerGamesAnswer({
      playerId: null, openingId: 'x', openingName: 'X', totalAvailable: 0, games: [],
    })).toBeNull();
  });
});

describe('assembleAlternativesAnswer — grounded "why are the alternatives worse" (David 2026-07-11)', () => {
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  it('names the best move, grades each alternative by cp-gap, cites the punishing reply', () => {
    const a = assembleAlternativesAnswer({
      fen: START,
      lines: [
        { san: 'e4', replySan: 'e5', evalCp: 30, mateIn: null },
        { san: 'd4', replySan: 'd5', evalCp: 25, mateIn: null },   // 5cp gap → essentially as good
        { san: 'f3', replySan: 'e5', evalCp: -80, mateIn: null },  // 110cp gap → real concession
      ],
    });
    expect(a).not.toBeNull();
    expect(a?.facts).toMatch(/best move is e4/i);
    expect(a?.bestMoveSan).toBe('e4');
    expect(a?.bestMoveFromTo).toEqual({ from: 'e2', to: 'e4' });
    // d4 within 30cp → honest "essentially as good", never an invented gap.
    expect(a?.facts).toMatch(/d4 is essentially as good/i);
    // f3 at 110cp loss → concession, with the pawn magnitude.
    expect(a?.facts).toMatch(/f3 concedes about 1\.1 pawns/i);
  });

  it('flips evals to mover POV for Black to move', () => {
    // After 1.e4 — Black to move; WHITE-perspective evals: best reply c5 (+0.3
    // for White = -0.3 mover POV)… a Black alternative at +2.0 White-persp is
    // a 170cp mover-POV loss.
    const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const a = assembleAlternativesAnswer({
      fen: AFTER_E4,
      lines: [
        { san: 'c5', replySan: 'Nf3', evalCp: 30, mateIn: null },
        { san: 'g5', replySan: 'd4', evalCp: 200, mateIn: null },
      ],
    });
    expect(a?.facts).toMatch(/best move is c5/i);
    // mover-POV: best -30, alt -200 → 170cp loss → "concedes about 1.7 pawns"
    expect(a?.facts).toMatch(/g5 concedes about 1\.7 pawns/i);
  });

  it('says an alternative walks into mate when its line is mated', () => {
    // Scholar's-mate-threat board: White to move; f3-ish junk alt gets mated.
    const a = assembleAlternativesAnswer({
      fen: START,
      lines: [
        { san: 'e4', replySan: 'e5', evalCp: 30, mateIn: null },
        { san: 'g4', replySan: 'e5', evalCp: null, mateIn: -3 },  // white gets mated in 3
      ],
    });
    expect(a?.facts).toMatch(/g4 loses outright — it walks into a mate in 3/i);
  });

  it('returns null with fewer than 2 lines (nothing to compare — falls through)', () => {
    expect(assembleAlternativesAnswer({ fen: START, lines: [{ san: 'e4', replySan: null, evalCp: 30, mateIn: null }] })).toBeNull();
    expect(assembleAlternativesAnswer({ fen: START, lines: [] })).toBeNull();
  });

  it('drops an illegal alternative line instead of fabricating', () => {
    const a = assembleAlternativesAnswer({
      fen: START,
      lines: [
        { san: 'e4', replySan: 'e5', evalCp: 30, mateIn: null },
        { san: 'Ke2', replySan: null, evalCp: 0, mateIn: null }, // illegal at start
        { san: 'd4', replySan: 'd5', evalCp: 20, mateIn: null },
      ],
    });
    expect(a?.facts).not.toMatch(/Ke2/);
    expect(a?.facts).toMatch(/d4/);
  });
});

describe('weakness-tab coverage extensions (David 2026-07-13)', () => {
  it('phase answer voices per-phase centipawn loss for the weakest phase', () => {
    const a = assemblePhaseProfileAnswer({
      phaseAccuracy: [
        { phase: 'opening', accuracy: 85, mistakes: 2, moveCount: 100 },
        { phase: 'endgame', accuracy: 55, mistakes: 9, moveCount: 80 },
      ],
      criticalByPhase: [],
      cpLossByPhase: [{ phase: 'opening', avgCpLoss: 20 }, { phase: 'endgame', avgCpLoss: 140 }],
    });
    expect(a!.facts).toMatch(/bleed about 140 centipawns a game there/);
  });
  it('accuracy answer voices the full move-quality distribution', () => {
    const a = assembleAccuracyAnswer({
      totalGames: 40, avgAccuracy: 78, accuracyWhite: 80, accuracyBlack: 76,
      bestMoveAgreement: 50, brilliant: 3, great: 12, blunders: 40,
      good: 900, book: 100, inaccuracies: 60, mistakes: 50,
    });
    expect(a!.facts).toMatch(/Your move mix: 3 brilliant, 12 great, 1000 solid, 60 inaccuracies, 50 mistakes, 40 blunders/);
  });
  it('consistency answer voices first-try solve streak + activity', () => {
    const a = assembleConsistencyAnswer({
      currentWinStreak: 0, longestWinStreak: 5,
      timeControls: [{ bucket: 'blitz', winRatePct: 55, games: 100, avgAccuracyPct: 70 }],
      longestSolveStreak: 12, activity: { totalGames: 300, activeDays: 90 },
    });
    expect(a!.facts).toMatch(/best puzzle run is 12 solved first-try in a row/);
    expect(a!.facts).toMatch(/played 300 games across 90 active days/);
  });
  it('puzzle-stats answer voices mistake-puzzle progress from your own games', () => {
    const a = assemblePuzzleStatsAnswer({
      puzzleRating: 1500, totalAttempted: 200, totalCorrect: 150, overallAccuracy: 75, duePuzzles: 4,
      mistakePuzzles: { mastered: 8, solved: 5, unsolved: 12 },
    });
    expect(a!.facts).toMatch(/8 mistake puzzles mastered, 12 still to crack/);
  });
  it('tactics answer voices tactic breadth when supplied', () => {
    const a = assembleTacticsProfileAnswer({
      totalGames: 40, awarenessRate: 62, found: 18, missed: 11,
      missedByType: [{ type: 'fork', count: 6 }], worstPhase: null,
      breadthDistinct: 9, brillianceShape: 'clustered',
    });
    expect(a!.facts).toMatch(/9 distinct tactic types — a broad tactical vocabulary/);
    expect(a!.facts).toMatch(/brilliancies bunch into a few games/);
  });
  it('repertoire-gap out-of-book answer voices the best matchup flip side', () => {
    const a = assembleRepertoireGapAnswer({
      kind: 'out-of-book', offBookPct: 30, totalGames: 200,
      worstAgainst: [{ name: 'the Sicilian', winRate: 35, games: 40 }],
      bestAgainst: [{ name: 'the Caro-Kann', winRate: 72, games: 25 }],
    });
    expect(a!.facts).toMatch(/strongest against the Caro-Kann \(72% over 25 games\)/);
  });
});
