import { describe, it, expect } from 'vitest';
import { poisonedPiece, poisonedPieceLine } from './poisonedPiece';

const BE2 = 'rnbqkbnr/ppppp3/5p2/6Bp/3PP3/8/PPP2PPP/RN1QKBNR w KQkq - 0 4';       // PHAmfkkrSSs, 4.Be2
const E4 = 'rnbqkbnr/ppppp2p/5p2/6B1/3P4/8/PPP1PPPP/RN1QKBNR w KQkq - 0 3';        // PHAmfkkrSSs, 3.e4

describe('poisonedPiece — looks loose, but taking it walks into mate', () => {
  it('Be2: …fxg5 runs into Bxh5+ Rxh5 Qxh5 mate', () => {
    const p = poisonedPiece(BE2, 'Be2');
    expect(p).toMatchObject({ square: 'g5', piece: 'b', capture: 'fxg5' });
    expect(p?.mate).toEqual(['Bxh5+', 'Rxh5', 'Qxh5#']);
    expect(poisonedPieceLine(p!, 'your', BE2)).toMatch(/Bxh5\+ Rxh5 Qxh5/);
  });

  it('e4: …fxg5 runs into Qh5 mate', () => {
    expect(poisonedPiece(E4, 'e4')?.mate).toEqual(['Qh5#']);
  });

  it('stays quiet when the capture is safe', () => {
    // Nf3 instead of Be2: …fxg5 Nxg5 is no mate.
    expect(poisonedPiece(BE2, 'Nf3')).toBeNull();
  });
});
