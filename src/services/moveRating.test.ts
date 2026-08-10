import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the engine so we control the evals. analyzePosition returns White-POV.
const analyzePosition = vi.fn();
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzePosition: (...a: unknown[]) => analyzePosition(...a) },
}));

import { computeLastMoveRating, classifyMove } from './moveRating';

function mk(evaluation: number, bestMove: string, mateIn: number | null = null) {
  return { bestMove, evaluation, isMate: mateIn !== null, mateIn, depth: 14, topLines: [], nodesPerSecond: 0 };
}

describe('classifyMove — thresholds + mate override', () => {
  it('bands cpLoss correctly — on the SHARED Stockfish thresholds', () => {
    // Rewritten 2026-08-10. These used to read 80→good, 150→inaccuracy,
    // 300→mistake, which is this file's OWN old set (20/50/100/200/400). The
    // post-game review graded the identical deltas 50/100/300, so a 150 was an
    // inaccuracy here and a mistake there, in the same session, about the same
    // move. The review's numbers won (Stockfish/chess.com convention, and what
    // the app's accuracy percentages have always shown); the coach conforms.
    expect(classifyMove({ wasBest: true, cpLoss: 0, missedMate: null, allowedMate: null })).toBe('best');
    expect(classifyMove({ wasBest: false, cpLoss: 10, missedMate: null, allowedMate: null })).toBe('best');
    expect(classifyMove({ wasBest: false, cpLoss: 40, missedMate: null, allowedMate: null })).toBe('excellent');
    expect(classifyMove({ wasBest: false, cpLoss: 80, missedMate: null, allowedMate: null })).toBe('inaccuracy');
    expect(classifyMove({ wasBest: false, cpLoss: 150, missedMate: null, allowedMate: null })).toBe('mistake');
    expect(classifyMove({ wasBest: false, cpLoss: 300, missedMate: null, allowedMate: null })).toBe('blunder');
    expect(classifyMove({ wasBest: false, cpLoss: 900, missedMate: null, allowedMate: null })).toBe('blunder');
  });
  it('mate context always outranks cp bands', () => {
    expect(classifyMove({ wasBest: false, cpLoss: 5, missedMate: 2, allowedMate: null })).toBe('blunder');
    expect(classifyMove({ wasBest: false, cpLoss: 5, missedMate: null, allowedMate: 1 })).toBe('blunder');
  });
});

describe('computeLastMoveRating', () => {
  beforeEach(() => analyzePosition.mockReset());

  it('rates a best move as best (White to move played the engine pick)', async () => {
    // After 1.e4 e5, White to move. Say the engine's best is 2.Nf3 (g1f3), eval +0.3.
    // Post-move eval also +0.3 → cpLoss 0, wasBest true.
    analyzePosition
      .mockResolvedValueOnce(mk(30, 'g1f3'))  // pre-move (White to move)
      .mockResolvedValueOnce(mk(30, 'b8c6')); // post-move (Black to move) — value irrelevant here
    const r = await computeLastMoveRating(['e4', 'e5', 'Nf3']);
    expect(r).not.toBeNull();
    expect(r!.studentColor).toBe('white');
    expect(r!.wasBest).toBe(true);
    expect(r!.quality).toBe('best');
    expect(r!.betterSan).toBeNull();
  });

  it('flags a White blunder that drops eval and names the better move + arrow', async () => {
    // Pre-move: White +0.5, best = d2d4. Student played a bad move → post +(-2.0 White).
    analyzePosition
      .mockResolvedValueOnce(mk(50, 'd2d4'))    // pre-move best is d4
      .mockResolvedValueOnce(mk(-200, 'e7e5')); // after student's move White is -2.0
    const r = await computeLastMoveRating(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3']);
    expect(r).not.toBeNull();
    expect(r!.studentColor).toBe('white');
    expect(r!.wasBest).toBe(false);
    // cpLoss (White POV) = preStudent(50) - postStudent(-200) = 250 → mistake.
    expect(r!.cpLoss).toBe(250);
    expect(r!.quality).toBe('mistake');
    expect(r!.betterSan).toBe('d4');
    expect(r!.betterFromTo).toEqual({ from: 'd2', to: 'd4' });
  });

  it('flips POV for a Black move (lower White eval is better for Black)', async () => {
    // After 1.e4, Black to move. Engine best = c7c5 (Sicilian), White eval at pre = +0.2.
    // Student plays a weak move → White eval rises to +1.2 → Black gave up ~1.0.
    analyzePosition
      .mockResolvedValueOnce(mk(20, 'c7c5'))   // pre-move, Black to move; White +0.2
      .mockResolvedValueOnce(mk(120, 'd2d4')); // after Black's move, White +1.2
    const r = await computeLastMoveRating(['e4', 'a6']);
    expect(r).not.toBeNull();
    expect(r!.studentColor).toBe('black');
    // studentPOV: pre = -20, post = -120 → cpLoss = 100 → mistake on the shared
    // Stockfish bands (it read 'inaccuracy' under this file's old private set).
    expect(r!.cpLoss).toBe(100);
    expect(r!.quality).toBe('mistake');
    expect(r!.betterSan).toBe('c5');
  });

  it('detects a missed forced mate', async () => {
    // Pre-move: White has mate in 2 (mateIn +2), best = some mating move. Student
    // played a non-mating move → post no mate, eval +5.
    analyzePosition
      .mockResolvedValueOnce(mk(0, 'd1h5', 2))  // White mates in 2 with the best move
      .mockResolvedValueOnce(mk(500, 'e8e7'));  // student's move: up material but no mate
    const r = await computeLastMoveRating(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'Nc3']);
    expect(r).not.toBeNull();
    expect(r!.missedMate).toBe(2);
    expect(r!.quality).toBe('blunder');
  });

  it('rates a Black BEST move as best (sign-flip, wasBest true)', async () => {
    // After 1.e4, Black to move plays the engine pick c7c5. White eval steady.
    analyzePosition
      .mockResolvedValueOnce(mk(15, 'c7c5'))   // pre-move, Black to move
      .mockResolvedValueOnce(mk(15, 'g1f3'));  // post-move, White to move
    const r = await computeLastMoveRating(['e4', 'c5']);
    expect(r).not.toBeNull();
    expect(r!.studentColor).toBe('black');
    expect(r!.wasBest).toBe(true);
    expect(r!.cpLoss).toBe(0);
    expect(r!.quality).toBe('best');
  });

  it('clamps cpLoss to 0 when the position eval improves for the mover (never negative)', async () => {
    // Depth noise / a sharpening move can read the post-position as BETTER for
    // the student than the pre. cpLoss must floor at 0, not go negative.
    analyzePosition
      .mockResolvedValueOnce(mk(20, 'd2d4'))   // pre: White +0.2, best d4
      .mockResolvedValueOnce(mk(90, 'e7e5'));  // post: White +0.9 (improved)
    const r = await computeLastMoveRating(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'd3']);
    expect(r).not.toBeNull();
    expect(r!.studentColor).toBe('white');
    expect(r!.cpLoss).toBe(0);       // max(0, 20 - 90) = 0, NOT -70
    expect(r!.quality).toBe('best'); // cpLoss < 20
  });

  it('a Black inaccuracy: White eval RISING is the loss (sign convention pinned)', async () => {
    // The bug class this guards: forgetting to flip, so a Black mistake (White
    // eval up) reads as a gain. Pre White +0.1, post White +1.6 → Black gave up
    // 1.5 → mistake, NOT "best".
    analyzePosition
      .mockResolvedValueOnce(mk(10, 'g8f6'))   // pre, Black to move
      .mockResolvedValueOnce(mk(160, 'd2d4')); // post, White to move — White jumped
    const r = await computeLastMoveRating(['e4', 'e5', 'Nf3', 'd6', 'd4', 'Bg4']);
    expect(r).not.toBeNull();
    expect(r!.studentColor).toBe('black');
    expect(r!.cpLoss).toBe(150);       // -10 - (-160) = 150 in student POV
    // The comment above this test always said "→ mistake, NOT best". It was the
    // ASSERTION that said inaccuracy, on the old private bands. Now they agree.
    expect(r!.quality).toBe('mistake');
  });

  it('returns null on empty history or engine failure', async () => {
    expect(await computeLastMoveRating([])).toBeNull();
    analyzePosition.mockRejectedValueOnce(new Error('engine down'));
    expect(await computeLastMoveRating(['e4', 'e5'])).toBeNull();
  });

  it('returns null when the history does not replay legally', async () => {
    expect(await computeLastMoveRating(['e4', 'e4'])).toBeNull(); // second e4 illegal
  });
});
