import { describe, it, expect } from 'vitest';

import { deriveNextPlans } from './nextPlans';
describe('findWorstPlacedPiece — undeveloped is not misplaced (walk 5, 2026-09-23)', () => {
  it('at move 10 the bishop still on c8 is not "your worst piece"', async () => {
    const { Chess } = await import('chess.js');
    const { findWorstPlacedPiece } = await import('./nextPlans');
    // The walk-5 Najdorf after 10.Qe2 — Black to move, c8 bishop unmoved.
    const c = new Chess('r1bq1rk1/1p1nbppp/p2ppn2/8/P2NP3/2N5/BPP1QPPP/R1B1K2R b KQ - 5 10');
    expect(findWorstPlacedPiece(c, 'b')?.sq).not.toBe('c8');
  });
});

describe('the weak-pawn plan reads the board it prescribes on (walk 5, R7)', () => {
  it('does not tell the student to plant a knight on a square their own pawn holds', () => {
    const plans = deriveNextPlans('6k1/pp4pp/2n1p3/4P3/8/8/PP4PP/6K1 b - - 0 20', 'b');
    const weak = plans.find((p) => /weak pawn on e5/.test(p));
    expect(weak).toBeDefined();
    expect(weak).not.toMatch(/plant your (knight|bishop)/);
    expect(weak).toMatch(/your pawn on e6 already stops it/);
  });

  it('states no plan while a whole student piece is en prise', () => {
    expect(deriveNextPlans('6k1/pp4pp/4pn2/4P3/8/8/PP4PP/6K1 b - - 0 20', 'b')).toEqual([]);
  });
});
