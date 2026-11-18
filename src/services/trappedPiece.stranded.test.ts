import { describe, it, expect } from 'vitest';
import { strandedAt } from './trappedPiece';

describe('strandedAt — every square a deep minor can go to loses it', () => {
  it('the positional rook lift #2: Bh6, with g7/f8 covered by the rooks and Bxg5 met by Qxg5', () => {
    expect(strandedAt('2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P1R/3RK3 b - - 0 25', 'h6')).toEqual({ squares: ['f8', 'g5', 'g7'] });
  });
  it('a knight with one safe square is not stranded (miracle on the chess board #4, Ne2)', () => {
    expect(strandedAt('6k1/6p1/1r5p/1P3p2/1R2p1P1/3p3P/3RnP1K/8 b - - 0 41', 'e2')).toBeNull();
  });
  it('a piece already lost where it stands is trapped or hanging, not stranded', () => {
    // The h6 bishop with the defending rook gone: the queen just takes it.
    expect(strandedAt('2kr2r1/1b5p/p2pn1qB/1pp1p1p1/4P3/1PPPQNP1/1P3P2/3RK3 b - - 0 25', 'h6')).toBeNull();
  });
});
