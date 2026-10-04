import { describe, expect, it } from 'vitest';
import { readTiming, timingClause } from './moveTiming';

// Review walk 2026-10-04, game am-SI5q0VJz, 17.Bxb3: "a move earlier, their
// queen would have taken on b3 and won your bishop". A move earlier the a-pawn
// takes on b3 — c2 guards b3 against the queen.
describe('the timing line names the capture that starts the exchange', () => {
  it('17.Bxb3: their pawn, not their queen', () => {
    const earlier = 'r3k1nr/5ppp/1qn1p3/3pPb2/p4B2/Pp3N2/BPP2PPP/R2Q1RK1 w kq - 0 16';
    const now = 'r3k1nr/5ppp/1qn1p3/3pPb2/5B2/Pp3N2/BP3PPP/R2Q1RK1 w kq - 0 17';
    const t = readTiming(earlier, now, 'Bxb3');
    expect(t).not.toBeNull();
    expect(timingClause(t!)).toMatch(/their pawn would have taken on b3/);
  });
});
