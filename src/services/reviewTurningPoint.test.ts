import { describe, it, expect } from 'vitest';
import {
  buildTurningPointQuestion,
  judgeTurningPointPick,
  TURNING_POINT_MIN_SWING_PAWNS,
  type TurningPointSegmentLike,
} from './reviewTurningPoint';

// The end-of-review "where did this game turn?" question (David 2026-07-11).
// Candidates + the answer are COMPUTED from the eval record — the student
// self-assesses, the board grades (G0).

function seg(o: Partial<TurningPointSegmentLike> & { ply: number }): TurningPointSegmentLike {
  return {
    moveNumber: Math.ceil(o.ply / 2),
    san: 'Nf3',
    playerColor: o.ply % 2 === 1 ? 'white' : 'black',
    evalBefore: 0,
    evalAfter: 0,
    classification: null,
    ...o,
  };
}

describe('buildTurningPointQuestion', () => {
  it('computes candidates from mover-POV cost and names the biggest swing as the answer', () => {
    const segments = [
      // White mistake at ply 9 costing 1.5 pawns.
      seg({ ply: 9, san: 'Qe2', playerColor: 'white', evalBefore: 100, evalAfter: -50, classification: 'mistake' }),
      // Black blunder at ply 18 costing 4.0 pawns (black POV: -30 → +370 for White).
      seg({ ply: 18, san: 'Rd8', playerColor: 'black', evalBefore: -30, evalAfter: 370, classification: 'blunder' }),
      // Quiet move — not a candidate.
      seg({ ply: 20, san: 'Kg2', playerColor: 'black', evalBefore: 370, evalAfter: 360 }),
    ];
    const q = buildTurningPointQuestion(segments);
    expect(q).not.toBeNull();
    expect(q!.answer.ply).toBe(18);
    expect(q!.answer.label).toBe('9… Rd8');
    expect(q!.answer.swingPawns).toBeCloseTo(4.0);
    // Candidates in game order, both costed moments present.
    expect(q!.candidates.map((c) => c.ply)).toEqual([9, 18]);
    expect(q!.reveal).toContain('9… Rd8');
    expect(q!.reveal).toContain('4.0 pawns');
  });

  it('returns null with fewer than two costed moments (a one-blunder game answers itself)', () => {
    const one = [seg({ ply: 18, san: 'Rd8', playerColor: 'black', evalBefore: -30, evalAfter: 370 })];
    expect(buildTurningPointQuestion(one)).toBeNull();
    expect(buildTurningPointQuestion([])).toBeNull();
  });

  it('ignores sub-threshold swings and null evals', () => {
    const segments = [
      seg({ ply: 5, evalBefore: 50, evalAfter: 50 - (TURNING_POINT_MIN_SWING_PAWNS * 100 - 10), playerColor: 'white' }),
      seg({ ply: 7, evalBefore: null, evalAfter: -300, playerColor: 'white' }),
      seg({ ply: 9, evalBefore: 0, evalAfter: -200, playerColor: 'white' }),
    ];
    // Only ply 9 clears the bar → below the 2-candidate minimum → null.
    expect(buildTurningPointQuestion(segments)).toBeNull();
  });

  it('caps candidates at 4, keeping the biggest swings, in game order', () => {
    const segments = [1, 2, 3, 4, 5].map((i) =>
      seg({ ply: i * 2 - 1, san: `Q${i}`, playerColor: 'white', evalBefore: 0, evalAfter: -100 * i }),
    );
    const q = buildTurningPointQuestion(segments)!;
    expect(q.candidates).toHaveLength(4);
    // The smallest swing (ply 1, 1.0 pawns) was dropped; order is by ply.
    expect(q.candidates.map((c) => c.ply)).toEqual([3, 5, 7, 9]);
    expect(q.answer.ply).toBe(9);
  });
});

describe('judgeTurningPointPick', () => {
  it('grades the pick against the computed answer', () => {
    const q = buildTurningPointQuestion([
      seg({ ply: 9, playerColor: 'white', evalBefore: 100, evalAfter: -50 }),
      seg({ ply: 18, playerColor: 'black', evalBefore: -30, evalAfter: 370 }),
    ])!;
    expect(judgeTurningPointPick(q, 18)).toBe(true);
    expect(judgeTurningPointPick(q, 9)).toBe(false);
  });
});
