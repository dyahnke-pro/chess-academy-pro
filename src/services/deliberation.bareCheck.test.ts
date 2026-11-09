/**
 * A CHECK ALONE IS NEVER WHY A MOVE IS BEST (prod Review audit 2026-11-09,
 * Ruy Lopez 22…Nh5): "Better was knight to e2, check: it would check your
 * king." The why-best computer fell back to the plain fact of the check; the
 * better move is now named only with a reason the board proves.
 */
import { describe, expect, it } from 'vitest';
import { bestMoveReason, moveWhy } from './deliberation';

/** After 22.Qg4: Black's knight on f4 can check on e2, and that is all it does. */
const FEN = 'r4rk1/1bp2pb1/3p2p1/pp1Pq1B1/PP2PnQ1/4N3/2B2PPP/R3R1K1 b - - 2 22';

describe('bestMoveReason — no bare check as a reason', () => {
  it('Ne2+ has no reason to be best beyond the check', () => {
    expect(bestMoveReason(FEN, 'Ne2+', 'b', { mateIn: null, prevCapture: null })).toBeNull();
  });
  it('CONTROL: what the move does is still described', () => {
    expect(moveWhy(FEN, 'Ne2+', 'b', null)).toBe('checks the king on g1');
  });
});
