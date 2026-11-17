import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

// Danya speedrun _4xbS0Crtic, review of 4.d4: "Nxe5 was the better move: it
// would win two pawns" — the engine line …Bd4 Nf3 Bxc3 dxc3 Nxe4 takes the pawn
// straight back.
describe('a capture the line wins back is no win', () => {
  const FEN = 'rnbqk2r/pppp1ppp/5n2/2b1p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4';
  const prior = { fenBefore: 'rnbqk2r/pppp1ppp/5n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 3 3', san: 'Bc5' };
  it('Nxe5 is not said to win material', () => {
    const line = 'f3e5 c5d4 e5f3 d4c3 d2c3 f6e4 f1d3 d7d5'.split(' ');
    expect(betterMoveReason(FEN, 'd4', 'Nxe5', line, 'white', prior, false) ?? '').not.toMatch(/win/);
  });
  it('CONTROL: with no line to read, the board read still names the capture', () => {
    expect(betterMoveReason(FEN, 'd4', 'Nxe5', ['f3e5'], 'white', prior, false) ?? '').toMatch(/win a pawn/);
  });
});
