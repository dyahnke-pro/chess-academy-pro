import { describe, expect, it } from 'vitest';
import { Chess } from 'chess.js';
import { wedgePaysLater } from './planJudgement';

// The wedge that pays later (missed computers, 2026-10-08).
const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };

describe('wedgePaysLater', () => {
  const fen = fenAfter(['d4', 'd6', 'e3', 'Nf6']); // White to move; d4-d5 is the wedge
  it('names the check the wedge pawn keeps from being blocked', () => {
    const r = wedgePaysLater(fen, 'd5', 'w', ['d4d5', 'h7h6', 'f1b5'], 0);
    expect(r?.text).toBe("Your pawn on d5 pays later: in the line, the check Bb5 can't be safely blocked on c6, because the pawn covers it.");
  });
  it('silent when the move is not the engine\'s', () => {
    expect(wedgePaysLater(fen, 'd5', 'w', ['e3e4', 'h7h6', 'f1b5'], 0)).toBeNull();
  });
  it('silent when the pawn leaves before the check', () => {
    expect(wedgePaysLater(fen, 'd5', 'w', ['d4d5', 'e7e6', 'd5e6', 'h7h6', 'f1b5'], 0)).toBeNull();
  });
});
