import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

// Speedrun _4xbS0Crtic, review of 10.Nf5: "Nxe4 was the better move: it would
// win a knight for a pawn". …Nxe4 had taken a pawn; Nxe4 takes the knight back,
// and …Rxe4 takes that knight in turn — an even trade, nothing won.
describe('a take-back they can take back again wins nothing', () => {
  it('Nxe4 is not "a knight for a pawn"', () => {
    const fen = 'rnbqr1k1/pppp1p2/7p/2b3p1/3Nn3/2N3B1/PPP1BPPP/R2QK2R w KQ - 0 10';
    const prior = { fenBefore: 'rnbqr1k1/pppp1p2/5n1p/2b3p1/3NP3/2N3B1/PPP1BPPP/R2QK2R b KQ - 1 9', san: 'Nxe4' };
    const line = 'c3e4 e8e4 d4b3 c5b6 c2c4 d8e7 c4c5 b6c5'.split(' ');
    expect(betterMoveReason(fen, 'Nf5', 'Nxe4', line, 'white', prior, false) ?? '').not.toMatch(/knight for a pawn/);
  });
});
