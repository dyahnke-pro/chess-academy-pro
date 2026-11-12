// WO-LAYERS-01 step 6 — two good moves, one board-true difference.
import { Chess } from 'chess.js';
import { describe, it, expect } from 'vitest';
import { contrastMoves, contrastClause } from './moveContrast';

const FEN = '6k1/5ppp/8/8/8/8/P4PPP/R4RK1 w - - 0 20';

describe('contrastMoves', () => {
  it('the f-rook, not the a-rook: the a1-rook stays home to guard a2', () => {
    const c = contrastMoves(FEN, 'Rad1', 'Rfd1');
    expect(c).toEqual({ keeps: 'Rfd1', drops: 'Rad1', piece: 'p', square: 'a2' });
    // The pawn is named by its file (`pieceRef`); a2 is lit, not read out.
    expect(contrastClause(c!, FEN, 'w', null)).toBe('The difference between Rfd1 and Rad1: Rfd1 keeps your a-pawn defended, and Rad1 leaves it with no guard');
    // Played, the move is "your move": the turn names it once.
    expect(contrastClause(c!, FEN, 'w', 'Rfd1')).toBe('Here Rad1 would leave your a-pawn with no guard, and your move keeps it defended');
    expect(contrastClause(c!, FEN, 'w', 'Rad1')).toBe('Here Rfd1 keeps your a-pawn defended, and your move leaves it with no guard');
  });

  it('the order of the arguments does not change the answer', () => {
    expect(contrastMoves(FEN, 'Rfd1', 'Rad1')?.keeps).toBe('Rfd1');
  });

  it('no single difference → nothing to say', () => {
    expect(contrastMoves(FEN, 'h3', 'g3')).toBeNull();
  });
});

describe('contrastMoves — a loose piece nothing can reach is no difference (review walk 2026-10-01)', () => {
  it('h4 vs Qb3: the c1 bishop is unreachable, so nothing separates the moves', () => {
    const fen = (() => { const c = new Chess(); for (const m of 'e4 d5 exd5 Nf6 Bb5+ Bd7 Be2 Nxd5 d4 Nc6 c4 Nf6 d5 Ne5 Nf3 Ng6'.split(' ')) c.move(m); return c.fen(); })();
    expect(contrastMoves(fen, 'h4', 'Qb3')).toBeNull();
  });
});
