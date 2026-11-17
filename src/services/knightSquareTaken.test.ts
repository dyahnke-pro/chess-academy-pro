import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { knightSquareTaken } from './knightSquareTaken';

const after = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('knightSquareTaken — a pawn on the knight\'s natural square', () => {
  it('2…c6 takes c6 from the b8 knight (Danya, NnQmN), a move that cost 1.7 pawns', () => {
    const k = knightSquareTaken(after(['e4', 'e5', 'd4']), 'c6', true, 171);
    expect(k?.knight).toBe('b8');
    expect(k?.roads).toEqual(['a6']);
    expect(k?.clause).toMatch(/c6/);
    expect(k?.clause).toMatch(/knight on b8/);
  });

  it('stays quiet on the Caro-Kann\'s …c6, which costs nothing', () => {
    expect(knightSquareTaken(after(['e4']), 'c6', true, 12)).toBeNull();
  });

  it('stays quiet when the knight is already out', () => {
    expect(knightSquareTaken(after(['e4', 'd6', 'd4', 'Nd7', 'Nf3']), 'c6', true, 171)).toBeNull();
  });

  it('stays quiet when the surface does not know the cost', () => {
    expect(knightSquareTaken(after(['e4', 'e5', 'd4']), 'c6', true, null)).toBeNull();
  });
});
