import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pawnHit, trappedAt } from './trappedPiece';

const after = (sans: string[]): { fen: string; last: ReturnType<Chess['move']> } => {
  const c = new Chess(); let last!: ReturnType<Chess['move']>;
  for (const s of sans) last = c.move(s);
  return { fen: c.fen(), last };
};

describe('kick or trap (contract 2026-10-10)', () => {
  it('b4 traps the knight on a5 — every square it can reach loses it', () => {
    const { fen, last } = after('e4 e5 Nf3 Nc6 Bc4 Bc5 d3 h6 O-O d6 c3 Bb6 d4 Na5 Bb5+ c6 Be2 Nf6 b4'.split(' '));
    expect(pawnHit(fen, last)).toEqual({ square: 'a5', type: 'n', trapped: true });
    expect(trappedAt(fen, 'a5')).not.toBeNull();
  });
  it('e5 only kicks the knight on f6 — it has d5 and more', () => {
    const { fen, last } = after('e4 Nf6 Nc3 e6 e5'.split(' '));
    expect(pawnHit(fen, last)).toEqual({ square: 'f6', type: 'n', trapped: false });
  });
  it('a piece that can take the attacker is not trapped', () => {
    // 1.e4 Nc6 2.d4 Nf6 3.d5: the c6 knight can take d4? no — but it has e5/b4/a5.
    const { fen, last } = after('e4 Nc6 d4 Nf6 d5'.split(' '));
    expect(pawnHit(fen, last)?.trapped).toBe(false);
  });
});

describe('a rescue that costs more than the piece is no rescue', () => {
  // Speedrun _4xbS0Crtic, …g4 against Bf3: every bishop move loses it, and
  // Qxf7+ only delays the capture by giving the queen away.
  it('…g4 traps the bishop on f3', () => {
    const c = new Chess('6k1/pp2rp2/2pp1q1p/5bp1/3b4/1Q3BB1/P1P2PPP/3R2K1 b - - 1 21');
    const mv = c.move('g4');
    expect(trappedAt(c.fen(), 'f3')).not.toBeNull();
    expect(pawnHit(c.fen(), mv)?.trapped).toBe(true);
  });
});
