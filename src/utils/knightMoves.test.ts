import { describe, it, expect } from 'vitest';
import { getKnightMoves } from './knightMoves';

describe('getKnightMoves', () => {
  it('returns 8 moves from a center square', () => {
    const moves = getKnightMoves('d4');
    expect(moves).toHaveLength(8);
    expect(moves.sort()).toEqual(
      ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'].sort(),
    );
  });

  it('returns 2 moves from a corner (a1)', () => {
    const moves = getKnightMoves('a1');
    expect(moves).toHaveLength(2);
    expect(moves.sort()).toEqual(['b3', 'c2'].sort());
  });

  it('returns 2 moves from a corner (h8)', () => {
    const moves = getKnightMoves('h8');
    expect(moves).toHaveLength(2);
    expect(moves.sort()).toEqual(['f7', 'g6'].sort());
  });

  it('returns 3 moves from a1 edge corner-like square (a2)', () => {
    const moves = getKnightMoves('a2');
    expect(moves).toHaveLength(3);
    expect(moves.sort()).toEqual(['b4', 'c1', 'c3'].sort());
  });

  it('returns 4 moves from an edge square (a4)', () => {
    const moves = getKnightMoves('a4');
    expect(moves).toHaveLength(4);
    expect(moves.sort()).toEqual(['b2', 'b6', 'c3', 'c5'].sort());
  });

  it('returns correct moves from e1 (Leap Frog start)', () => {
    const moves = getKnightMoves('e1');
    expect(moves).toHaveLength(4);
    expect(moves.sort()).toEqual(['c2', 'd3', 'f3', 'g2'].sort());
  });

  it('returns correct moves from squares that can reach e8', () => {
    // d6 should include e8
    expect(getKnightMoves('d6')).toContain('e8');
    // f6 should include e8
    expect(getKnightMoves('f6')).toContain('e8');
    // c7 should include e8
    expect(getKnightMoves('c7')).toContain('e8');
    // g7 should include e8
    expect(getKnightMoves('g7')).toContain('e8');
  });

  it('returns 8 moves from e4', () => {
    const moves = getKnightMoves('e4');
    expect(moves).toHaveLength(8);
    expect(moves.sort()).toEqual(
      ['c3', 'c5', 'd2', 'd6', 'f2', 'f6', 'g3', 'g5'].sort(),
    );
  });
});
