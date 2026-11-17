import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

// Danya speedrun BGTBTghFQDI, review of …a6: "d5 was stronger: it would create a
// passed pawn on d5". The engine line makes it passed for a moment (cxd4 cxd4)
// and its own bxc3 puts a pawn back on c3, in front of it.
const FEN = 'rnbqkb1r/pp1p1ppp/8/2p5/2Bpn3/2P2N2/PP3PPP/RNBQ1RK1 b kq - 1 6';
const LINE = 'd7d5 c4b5 c8d7 b5d7 d8d7 c3d4 c5d4 f3d4 f8c5 b1c3 e4c3 b2c3 e8g8 d4b3 c5b6'.split(' ');

describe('a passer the line itself un-passes was never created', () => {
  it('d5 is not called a new passed pawn', () => {
    const why = betterMoveReason(FEN, 'a6', 'd5', LINE, 'black', null, false) ?? '';
    expect(why).not.toMatch(/passed pawn/);
  });
});
