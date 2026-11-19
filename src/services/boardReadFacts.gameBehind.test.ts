import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { gameBehind } from './boardReadFacts';

describe('gameBehind — the game behind a tapped read', () => {
  it('hands the moves played and the last of them when they reach the board', () => {
    const c = new Chess();
    for (const s of ['e4', 'e5', 'Nf3']) c.move(s);
    const g = gameBehind(['e4', 'e5', 'Nf3'], c.fen());
    expect(g.history).toEqual(['e4', 'e5', 'Nf3']);
    expect(g.theirLast?.san).toBe('Nf3');
    expect(g.theirLast?.fenBefore.split(' ')[0]).toBe('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR');
  });
  it('hands an empty game on a board the moves do not reach (a puzzle)', () => {
    expect(gameBehind(['e4'], '8/8/8/8/8/8/8/K6k w - - 0 1')).toEqual({ history: [], theirLast: null });
    expect(gameBehind([], '8/8/8/8/8/8/8/K6k w - - 0 1')).toEqual({ history: [], theirLast: null });
  });
});
