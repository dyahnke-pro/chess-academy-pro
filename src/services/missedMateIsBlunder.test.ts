import { describe, expect, it } from 'vitest';
import { classifyCpLoss, mateKeptDeeper } from './gameAnalysisService';

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
