// WO-LAYERS-01 step 6 — two good moves, one board-true difference.
import { describe, it, expect } from 'vitest';
import { contrastMoves, contrastClause } from './moveContrast';

const FEN = '6k1/5ppp/8/8/8/8/P4PPP/R4RK1 w - - 0 20';

describe('contrastMoves', () => {
  it('the f-rook, not the a-rook: the a1-rook stays home to guard a2', () => {
    const c = contrastMoves(FEN, 'Rad1', 'Rfd1');
    expect(c).toEqual({ keeps: 'Rfd1', drops: 'Rad1', piece: 'p', square: 'a2' });
    expect(contrastClause(c!)).toBe('Rfd1 rather than Rad1 — Rfd1 keeps your pawn on a2 defended, and Rad1 leaves it with no guard');
  });

  it('the order of the arguments does not change the answer', () => {
    expect(contrastMoves(FEN, 'Rfd1', 'Rad1')?.keeps).toBe('Rfd1');
  });

  it('no single difference → nothing to say', () => {
    expect(contrastMoves(FEN, 'h3', 'g3')).toBeNull();
  });
});
