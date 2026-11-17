import { describe, it, expect } from 'vitest';
import { queenTradeRead } from './practicalReads';

// Danya speedrun kYbh2NTFsS8, 13…Rxd8: "Trading queens a piece up is the safe
// road" — the extra piece is the bishop on c3, which bxc3 takes back next move.
describe('a queen trade is "a piece up" only when the piece stays', () => {
  it('13…Rxd8 with bxc3 to come says nothing about a piece up', () => {
    const r = queenTradeRead('r1bQ1rk1/p3pp1p/2p3p1/8/8/2b5/PPP1BPPP/R4RK1 b - - 0 13', 'Rxd8', 'b', 0);
    expect(r?.text ?? '').not.toMatch(/piece up/);
  });
});
