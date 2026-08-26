import { describe, it, expect } from 'vitest';
import {
  buildTurningPointQuestion,
  judgeTurningPointPick,
  minSwingPawns,
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

  it('carries each candidate fenBefore so the card can preview the board (David 2026-07-19)', () => {
    const segments = [
      seg({ ply: 9, san: 'Qe2', playerColor: 'white', evalBefore: 100, evalAfter: -50, fenBefore: 'FEN-AT-9' }),
      seg({ ply: 18, san: 'Rd8', playerColor: 'black', evalBefore: -30, evalAfter: 370, fenBefore: 'FEN-AT-18' }),
    ];
    const q = buildTurningPointQuestion(segments);
    expect(q!.candidates.find((c) => c.ply === 9)?.fenBefore).toBe('FEN-AT-9');
    expect(q!.candidates.find((c) => c.ply === 18)?.fenBefore).toBe('FEN-AT-18');
  });

  it('returns null with fewer than two costed moments (a one-blunder game answers itself)', () => {
    const one = [seg({ ply: 18, san: 'Rd8', playerColor: 'black', evalBefore: -30, evalAfter: 370 })];
    expect(buildTurningPointQuestion(one)).toBeNull();
    expect(buildTurningPointQuestion([])).toBeNull();
  });

  it('ignores sub-threshold swings and null evals', () => {
    const segments = [
      seg({ ply: 5, evalBefore: 50, evalAfter: 50 - (minSwingPawns(1500) * 100 - 10), playerColor: 'white' }),
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

describe('the importance model — rating-scaled + contested (David 2026-08-26)', () => {
  it('rating scales which swings count: a 1.2-pawn pair turns an intermediate game, not a beginner blunder-hunt', () => {
    const segs = [
      seg({ ply: 9, playerColor: 'white', evalBefore: 60, evalAfter: -60 }),   // 1.2p
      seg({ ply: 15, playerColor: 'white', evalBefore: 20, evalAfter: -100 }), // 1.2p
    ];
    expect(minSwingPawns(1500)).toBeCloseTo(1.0);
    expect(minSwingPawns(900)).toBeCloseTo(2.0);
    expect(buildTurningPointQuestion(segs, 1500)).not.toBeNull(); // both clear 1.0
    expect(buildTurningPointQuestion(segs, 900)).toBeNull();      // neither clears 2.0
  });

  it('contested gate: a blowout that stays a blowout is NOT a turning point', () => {
    const segs = [
      // Huge RAW swing (2.5p) but both endpoints decided for White — never turned.
      seg({ ply: 7, playerColor: 'white', evalBefore: 900, evalAfter: 650 }),
      seg({ ply: 11, playerColor: 'white', evalBefore: 300, evalAfter: -50 }),  // 3.5p, real
      seg({ ply: 15, playerColor: 'black', evalBefore: -40, evalAfter: 260 }),  // 3.0p, real
    ];
    const q = buildTurningPointQuestion(segs, 1500)!;
    expect(q.candidates.map((c) => c.ply)).toEqual([11, 15]); // ply 7 excluded
    expect(q.answer.ply).toBe(11);
  });

  it('throwing a won game IS a turning point (decided → contested is kept)', () => {
    const segs = [
      seg({ ply: 9, playerColor: 'white', evalBefore: 800, evalAfter: -200 }), // threw the win
      seg({ ply: 13, playerColor: 'white', evalBefore: -50, evalAfter: -350 }),
    ];
    const q = buildTurningPointQuestion(segs, 1500);
    expect(q).not.toBeNull();
    expect(q!.candidates.map((c) => c.ply)).toContain(9);
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
