import { describe, it, expect } from 'vitest';
import { enemyKingStuckInCenter } from './reviewSacrifice';

// Danya speedrun S-ZY3NtFO20 after 26…Kf8: Black had castled, the king stepped
// to f8 behind f7, g7 and h7, and no rooks were left — "their king is still in
// the centre" was false.
describe('a king on the f-file after castling is not in the centre', () => {
  it('26…Kf8 with no h-rook', () => {
    expect(enemyKingStuckInCenter('1Qnq1k2/p1p2ppp/2P1p3/4P3/8/2N1P2P/PP3PP1/6K1 w - - 2 27', 'w')).toBe(false);
  });
  it('a king that walked to f8 with its rook still on h8 is', () => {
    expect(enemyKingStuckInCenter('rnbq1k1r/ppp2ppp/8/8/8/8/PPP2PPP/RNBQKB1R w KQ - 0 9', 'w')).toBe(true);
  });
});
