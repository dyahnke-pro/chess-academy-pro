import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the engine so we control the evals. analyzePosition returns White-POV.
const analyzePosition = vi.fn();
vi.mock('./stockfishEngine', () => ({
  stockfishEngine: { analyzePosition: (...a: unknown[]) => analyzePosition(...a) },
}));

import { computeMoveRatingAt, computeLastMoveRating } from './moveRating';

function mk(evaluation: number, bestMove: string, mateIn: number | null = null) {
  return { bestMove, evaluation, isMate: mateIn !== null, mateIn, depth: 14, topLines: [], nodesPerSecond: 0 };
}

/**
 * computeMoveRatingAt — the RETROSPECTIVE computer (PLAN §E1). "why was Ke2
 * bad?" used to rate whatever move was LAST because only the last-move form
 * existed. This rates the ply the student NAMED — and the last-move form is
 * now a call to it, so the two can never drift.
 */
describe('computeMoveRatingAt', () => {
  beforeEach(() => analyzePosition.mockReset());

  it('rates the NAMED ply, not the last one — Ke2 at ply 4 while Nc6 was last', async () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Ke2?? Nc6... use a short legal history: e4 e5 Nf3 Nc6 Ke2 a6
    const history = ['e4', 'e5', 'Nf3', 'Nc6', 'Ke2', 'a6'];
    // Pre-move (White to move at ply 4): engine wants Bc4 (f1c4) at +0.3; after Ke2 it is -0.9.
    analyzePosition
      .mockResolvedValueOnce(mk(30, 'f1c4'))
      .mockResolvedValueOnce(mk(-90, 'f8c5'));
    const r = await computeMoveRatingAt(history, 4);
    expect(r).not.toBeNull();
    expect(r!.playedSan).toBe('Ke2');
    expect(r!.studentColor).toBe('white');      // the MOVER's colour at that ply
    expect(r!.wasBest).toBe(false);
    expect(r!.cpLoss).toBe(120);
    expect(r!.quality).toBe('mistake');
    expect(r!.betterSan).toBe('Bc4');
    expect(r!.betterFromTo).toEqual({ from: 'f1', to: 'c4' });
    // The engine was asked about the position BEFORE Ke2 and AFTER it — not the last ply.
    const [preFen, postFen] = [analyzePosition.mock.calls[0][0], analyzePosition.mock.calls[1][0]] as [string, string];
    expect(preFen).toMatch(/ w /);
    expect(preFen).toMatch(/^r1bqkbnr/);
    expect(postFen).toMatch(/ b /);
  });

  it('the last-move form is the same computer at the last index', async () => {
    analyzePosition
      .mockResolvedValueOnce(mk(30, 'g1f3'))
      .mockResolvedValueOnce(mk(30, 'b8c6'));
    const r = await computeLastMoveRating(['e4', 'e5', 'Nf3'], null);
    expect(r?.playedSan).toBe('Nf3');
    expect(r?.wasBest).toBe(true);
  });

  it('out-of-range index → null (never a fabricated rating)', async () => {
    expect(await computeMoveRatingAt(['e4', 'e5'], 2)).toBeNull();
    expect(await computeMoveRatingAt(['e4', 'e5'], -1)).toBeNull();
    expect(analyzePosition).not.toHaveBeenCalled();
  });
});
