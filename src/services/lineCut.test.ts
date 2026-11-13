// Gap B3 — the moved piece blocks its own side's line.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lineCut } from './lineCut';

const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };

describe('lineCut', () => {
  it('Bd3 cuts the queen off from d4', () => {
    const cut = lineCut(fenAfter('e4 e6 d4 d5 exd5 exd5 Nf3 Nf6'), 'Bd3', true);
    expect(cut).toEqual({ piece: 'your queen', lost: 'your pawn on d4', squares: ['d1', 'd3', 'd4'] });
  });
  it('a move in no line cuts nothing', () => {
    expect(lineCut(new Chess().fen(), 'Nf3', true)).toBeNull();
  });
});

describe('the moved piece is never the piece cut off', () => {
  it('Kasparov–Karpov 1985 g24, e5: the rook on e6 is not cut off from the pawn that moved', () => {
    const cut = lineCut('bq2r2k/6bp/4R3/6P1/P1Q1P2R/2N5/1rn3BP/6K1 w - - 2 40', 'e5', true);
    expect(cut?.lost ?? '').not.toMatch(/e4/);
  });
});

describe('the piece that moved cuts nothing of its own', () => {
  it('Qe2 does not cut the queen off from the knight on f3', () => {
    expect(lineCut('r1bqkb1r/ppp2pp1/5n1p/n2P4/2B1p3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 8', 'Qe2', true)).toBeNull();
  });
});
