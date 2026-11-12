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
