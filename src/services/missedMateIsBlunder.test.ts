import { describe, expect, it } from 'vitest';
import { classifyCpLoss, mateKeptDeeper } from './gameAnalysisService';
import { mateEvalFor, mateDistanceOf } from './engineConstants';
import { mateContext } from '../utils/mateContext';

// Review walk 2026-10-04, G1 (lichess SI5q0VJz) 41.Qxe5+: Qxd8# was mate in one,
// the move left White +7.8 and Review graded it GOOD while Learn called it a
// blunder. David 2026-10-04: "Keep it as a blunder in review."
const MATE_FOR_WHITE = 29_999;

describe('a missed forced mate is a blunder in review', () => {
  it('mate before, +7.8 after: blunder', () => {
    expect(classifyCpLoss(0, MATE_FOR_WHITE, 779, true)).toBe('blunder');
  });
  it('mate before, still mate after (a longer one): not a blunder', () => {
    expect(classifyCpLoss(0, MATE_FOR_WHITE, MATE_FOR_WHITE - 5, true)).not.toBe('blunder');
  });
  it('the same for Black', () => {
    expect(classifyCpLoss(0, -MATE_FOR_WHITE, -779, false)).toBe('blunder');
  });
});

// Clean-pass review walk 2026-10-04, G1 36.Qb5+: graded a BLUNDER for missing
// Qe4+'s mate in 8 — but Qb5+ mates in 10, past the depth-16 read after it.
// The blunder verdict is confirmed by a deeper search of the position after.
describe('a mate the move keeps past the horizon is not given up', () => {
  const after = '3nk2r/2R3pp/5q2/1Q1B4/8/P4N2/5PPP/6K1 b - - 10 36';
  it('deeper search finds the mover still mating → kept', async () => {
    const search = async (_f: string, depth: number) => ({ evaluation: depth >= 20 ? MATE_FOR_WHITE : 1500 });
    expect(await mateKeptDeeper(after, MATE_FOR_WHITE, 1500, true, search)).toBe(true);
  });
  it('deeper search finds no mate → really given up (the blunder stands)', async () => {
    const search = async () => ({ evaluation: 779 });
    expect(await mateKeptDeeper(after, MATE_FOR_WHITE, 779, true, search)).toBe(false);
  });
  it('no mate before → nothing to confirm', async () => {
    let called = false;
    const search = async () => { called = true; return { evaluation: MATE_FOR_WHITE }; };
    expect(await mateKeptDeeper(after, 900, 500, true, search)).toBe(false);
    expect(called).toBe(false);
  });
});

// Clean-pass review walk 2026-10-04, G1 37.h3 (3n1k1r/2R3pp/5q2/1Q1B4/8/P4N2/
// 5PPP/6K1 w): Qb4+ mates in 11 (SF 18 d20), h3 still mates in 14 (d22), but
// the read after h3 showed +7.46 and review called h3 a BLUNDER — "it starts a
// forced mate". Only a SHORT mate's absence after the move is proof it was lost.
describe('a mate score carries its distance', () => {
  it('round-trips, signed', () => {
    expect(mateDistanceOf(mateEvalFor(11))).toBe(11);
    expect(mateEvalFor(-3)).toBeLessThan(0);
    expect(mateDistanceOf(mateEvalFor(-3))).toBe(3);
    expect(mateEvalFor(1)).toBeGreaterThan(mateEvalFor(5));
    expect(mateDistanceOf(746)).toBeNull();
  });
});

describe('only a short mate given up is a blunder by itself', () => {
  it('37.h3: mate in 11 before, +7.46 read after → not flagged (the mate may sit past the read)', () => {
    expect(classifyCpLoss(0, mateEvalFor(11), 746, true)).toBe('good');
    expect(classifyCpLoss(0, -mateEvalFor(11), -746, false)).toBe('good');
  });
  it('a long mate dropped out of the decisive range is still a slip', () => {
    expect(['mistake', 'blunder']).toContain(classifyCpLoss(0, mateEvalFor(11), 150, true));
  });
  it('41.Qxe5+: mate in 1 before, +7.8 after → blunder', () => {
    expect(classifyCpLoss(0, mateEvalFor(1), 779, true)).toBe('blunder');
  });
  it('Learn: a long mate is not "missed" off one read; a short one is', () => {
    expect(mateContext({ isMate: true, mateIn: 11 }, { isMate: false, mateIn: null }, 'white').missedMate).toBeNull();
    expect(mateContext({ isMate: true, mateIn: 2 }, { isMate: false, mateIn: null }, 'white').missedMate).toBe(2);
    expect(mateContext({ isMate: true, mateIn: -2 }, { isMate: false, mateIn: null }, 'black').missedMate).toBe(2);
  });
});
