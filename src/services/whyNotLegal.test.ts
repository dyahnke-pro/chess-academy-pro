import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { whyNotLegal } from './whyNotLegal';

const play = (s: string): string => { const c = new Chess(); for (const m of s.split(' ')) c.move(m); return c.fen(); };

describe('why the board refused the move', () => {
  it('a pinned knight: names the pinner', () => {
    // 1.e4 e5 2.Nc3 Nf6 3.d3 Bb4 — the c3-knight is pinned? No: e1 king, b4 bishop, c3 knight, d2 empty.
    const fen = play('e4 e5 Nc3 Nf6 d3 Bb4 Bg5 d6');
    // White to move; Nc3 is pinned to the king on e1 by the bishop on b4.
    expect(whyNotLegal(fen, 'b5', 'white')).toBe('Your knight on c3 is pinned — moving it would expose your king to their bishop on b4.');
  });
  it('not your turn', () => {
    expect(whyNotLegal(play('e4'), 'e5', 'white')).toMatch(/^It's their move/);
  });
  it('your own piece is on the square', () => {
    expect(whyNotLegal(new Chess().fen(), 'd2', 'white')).toMatch(/^d2 has your own pawn on it/);
  });
  it('a pawn cannot take an empty square', () => {
    expect(whyNotLegal(play('e4 a6'), 'd5', 'white')).toMatch(/nothing on d5 to take — a pawn moves diagonally only when it captures/);
  });
  it('in check: the move does not get out of it', () => {
    const fen = play('e4 e5 f4 Qh4+');
    expect(whyNotLegal(fen, 'f3', 'white')).toBe('Your king is in check from their queen on h4, and neither your queen nor your knight going to f3 gets it out.');
  });
  it('nothing reaches it', () => {
    expect(whyNotLegal(new Chess().fen(), 'e5', 'white')).toBe('None of your pieces can reach e5 from where they stand.');
  });
  it('a legal move has no complaint', () => {
    expect(whyNotLegal(new Chess().fen(), 'e4', 'white')).toBeNull();
  });
});
