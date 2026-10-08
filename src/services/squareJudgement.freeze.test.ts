import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { pawnFreeze } from './squareJudgement';

// The pawn half of restriction (missed computers, 2026-10-08).
const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };

describe('pawnFreeze', () => {
  it('h4-h5 freezes their g-pawn', () => {
    const fen = fenAfter(['h4', 'Nf6', 'Nf3', 'e6']); // h4 on the board, White to move
    const r = pawnFreeze(fen, 'h5', 'w', 0);
    expect(r?.text).toBe('Your pawn on h5 freezes their g-pawn: g6 walks into a capture, and g5 is taken en passant.');
    expect(r?.act).toBe('restriction');
  });
  it('silent when the move cost material', () => {
    const fen = fenAfter(['h4', 'Nf6', 'Nf3', 'e6']);
    expect(pawnFreeze(fen, 'h5', 'w', 120)).toBeNull();
  });
  it('silent when their pawn already left home', () => {
    const fen = fenAfter(['h4', 'g6', 'Nf3', 'Nf6']);
    expect(pawnFreeze(fen, 'h5', 'w', 0)).toBeNull();
  });
  it('works from Black\'s seat', () => {
    const fen = fenAfter(['Nf3', 'a5', 'Nc3']);
    expect(pawnFreeze(fen, 'a4', 'b', 0)?.text).toBe('Your pawn on a4 freezes their b-pawn: b3 walks into a capture, and b4 is taken en passant.');
  });
});
