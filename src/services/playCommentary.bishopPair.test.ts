import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gainedBishopPair } from './playCommentary';

// Re-walk 1380 (Philidor, 2026-09-25): 18.h3 Bxf3 19.Rxf3 — White keeps both
// bishops, Black has one left.
const LINE = 'e4 e5 Nf3 d6 d4 exd4 Nxd4 Be7 Nc3 Nf6 Bc4 O-O Bb3 Nbd7 O-O Ne5 f4 Ned7 Nf3 Nc5 Qe1 Bg4 e5 dxe5 fxe5 Nh5 Be3 Ne6 Rd1 Qe8 Nd5 c6 Nc3 Bb4 h3 Bxf3'.split(' ');
const before = (): string => { const c = new Chess(); for (const s of LINE) c.move(s); return c.fen(); };

describe('gainedBishopPair — the board test the move point and the standing read share', () => {
  it('19.Rxf3 wins the bishop pair', () => {
    expect(gainedBishopPair(before(), 'Rxf3')).toBe(true);
  });
  it('gxf3 also takes the bishop — same pair', () => {
    expect(gainedBishopPair(before(), 'gxf3')).toBe(true);
  });
  it('a move that takes no bishop wins no pair', () => {
    expect(gainedBishopPair(before(), 'Kh1')).toBe(false);
  });
  it('taking a bishop when you have only one of your own is not the pair', () => {
    // White has one bishop (c4); Black two. Bxb4-style capture leaves White with one.
    expect(gainedBishopPair('4k3/8/8/8/1b6/2b5/3N4/2B1K3 w - - 0 30', 'Nxb3')).toBe(false);
    expect(gainedBishopPair('4k3/8/8/8/1b6/2b5/8/2B1K2N w - - 0 30', 'Bb2')).toBe(false);
  });
});
