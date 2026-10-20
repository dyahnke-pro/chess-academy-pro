import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { whyItFailed } from './whyItFailed';
import { sameLossAsGrade } from './mistakeTurnLine';

// David's Smith-Morra (teach-mvfhdihq-7i8vk5), 8.Bxf7+ Kxf7. The grade said
// "That took the pawn on f7, but the king on e8 takes back — you lose a bishop
// for a pawn" and the fundamental said "That pawn was defended: your bishop
// takes on f7 and is taken on the spot" — one loss, heard twice, because the
// grade never named f7 as the lost square (OS-11, 2026-10-20).
const before = (() => {
  const c = new Chess();
  for (const m of 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 d6 Bc4 Nc6 Nf3 g6 O-O Bg7'.split(' ')) c.move(m);
  return c.fen();
})();

describe('whyItFailed names the square where material was lost', () => {
  it('a capture taken back loses the capturing piece on its square', () => {
    const r = whyItFailed({ fenBefore: before, playedSan: 'Bxf7+', studentColor: 'white', playedLineUci: ['e8f7'] });
    expect(r?.kind).toBe('held-by-defender');
    expect(r?.lost).toBe('f7');
    // …so the fundamental about the same square is the same loss.
    expect(sameLossAsGrade({ square: 'f7' }, r?.lost ?? null)).toBe(true);
  });
});
