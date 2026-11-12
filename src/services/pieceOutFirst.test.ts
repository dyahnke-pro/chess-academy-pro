// Gap B1 — a piece out before its own pawn shuts it in.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { pieceOutFirst } from './pieceOutFirst';

const fenAfter = (sans: string): string => { const c = new Chess(); for (const s of sans.split(' ')) c.move(s); return c.fen(); };

describe('pieceOutFirst', () => {
  it('Caro-Kann: …Bf5 comes out before …e6', () => {
    expect(pieceOutFirst(fenAfter('e4 c6 d4 d5 e5'), 'Bf5', ['Nf3', 'e6'])).toEqual({ pawn: '…e6', piece: 'bishop', squares: ['c8', 'f5', 'e6'] });
  });
  it('Italian: Bc4 comes out before d3', () => {
    expect(pieceOutFirst(fenAfter('e4 e5 Nf3 Nc6'), 'Bc4', ['Bc5', 'd3'])?.pawn).toBe('d3');
  });
  it('no pawn on the road later: nothing to say', () => {
    expect(pieceOutFirst(fenAfter('e4 e5 Nf3 Nc6'), 'Bc4', ['Bc5', 'c3'])).toBeNull();
  });
});
