import { describe, it, expect } from 'vitest';
import {
  sideToMove, solvingSide, materialBalance, strongerSide, framingSide,
} from './conceptEngine';

describe('conceptEngine — side calculators', () => {
  it('sideToMove reads the FEN turn field', () => {
    expect(sideToMove('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe('white');
    expect(sideToMove('8/8/8/8/8/8/8/K6k b - - 0 1')).toBe('black');
  });

  it('solvingSide is opposite the FEN turn (Lichess setup-move convention)', () => {
    // Puzzle FEN with white to move → the opponent (white) plays the setup move,
    // black solves.
    expect(solvingSide('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe('black');
    expect(solvingSide('8/8/8/8/8/8/8/K6k b - - 0 1')).toBe('white');
  });

  it('materialBalance is white-minus-black in pawns', () => {
    expect(materialBalance('8/8/8/8/8/8/8/K6k w - - 0 1')).toBe(0);
    // White an extra rook.
    expect(materialBalance('8/8/8/8/8/8/8/R2K3k w - - 0 1')).toBe(5);
    // Black an extra queen.
    expect(materialBalance('7k/6q1/8/8/8/8/8/4K3 w - - 0 1')).toBe(-9);
  });

  it('strongerSide names the up-material side, balanced within a pawn', () => {
    expect(strongerSide('8/8/8/8/8/8/8/R2K3k w - - 0 1')).toBe('white');
    expect(strongerSide('7k/6q1/8/8/8/8/8/4K3 w - - 0 1')).toBe('black');
    expect(strongerSide('8/5p2/8/4k3/8/4P3/4K3/8 w - - 0 1')).toBe('balanced');
  });

  it('framingSide prefers studentSide, then solver, then stronger, then mover', () => {
    const fen = '8/8/8/8/8/8/8/R2K3k w - - 0 1';
    expect(framingSide(fen, { studentSide: 'black' })).toBe('black'); // override
    expect(framingSide(fen, { hasSolution: true })).toBe('black');    // solver
    expect(framingSide(fen)).toBe('white');                            // stronger
    // Level material, no solution → side to move.
    expect(framingSide('8/5p2/8/4k3/8/4P3/4K3/8 b - - 0 1')).toBe('black');
  });
});
