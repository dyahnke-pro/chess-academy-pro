// The decision baseline's read of the round-2 computers (2026-11-19): the
// opponent is "their", never a colour.
import { describe, it, expect } from 'vitest';
import { pawnCentre } from './pawnCentre';

describe('round 2 producer fixes', () => {
  it('their pawn centre is "their", never "Black\'s"', () => {
    const c = pawnCentre('4k3/8/8/3pp3/8/8/8/4K3 w - - 0 1', 'w');
    expect(c?.text).toMatch(/^Their d- and e-pawns hold the centre/);
    expect(c?.text).not.toMatch(/White|Black/);
  });
});
