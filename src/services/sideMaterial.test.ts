import { describe, it, expect } from 'vitest';
import { sideMaterial, materialBalance } from './pieceValues';

describe('sideMaterial — one side sum, the same table as materialBalance', () => {
  it('counts each side, king worth nothing', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    expect(sideMaterial(start, 'w')).toBe(39);
    expect(sideMaterial(start, 'b')).toBe(39);
  });
  it('the two sides differ by the balance', () => {
    const fen = 'r3k3/pp6/8/8/8/8/PPP5/R2QK3 w - - 0 1';
    expect(sideMaterial(fen, 'w') - sideMaterial(fen, 'b')).toBe(materialBalance(fen));
  });
});
