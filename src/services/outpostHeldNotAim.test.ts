import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

// Clean-pass review walk 2026-10-04, G3 (lichess mZ1GOTOw) 34.Kf3: "the stronger
// move was Ne4 — it would park a piece on d6" — the knight was already on d6;
// the line steps it off and back (Ne4 Kf5 Nd6+).
describe('an outpost the mover already holds is not the idea of the move', () => {
  it('34.Kf3 — Ne4 steps off d6 and comes back', () => {
    const FEN = '3r4/3r2p1/p2Nkp1p/1pp1P3/8/P7/1B2K2P/4R3 w - - 0 34';
    const LINE = 'd6e4 e6f5 e4d6 f5g6 e1g1 g6h5 d6e4 f6e5'.split(' ');
    expect(betterMoveReason(FEN, 'Kf3', 'Ne4', LINE, 'white', null, false) ?? '').not.toMatch(/park a piece on d6/);
  });
});
