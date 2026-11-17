// A real board from his speedruns (S4): castle away from the files their pawns left.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { castlingWing } from './castlingWing';
import { readBoardAll } from './boardComputers';

const fenOf = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };
const PHAM = ['d4', 'g5', 'Bxg5', 'f6', 'e4', 'h5', 'Be2', 'e5', 'Bxh5+', 'Ke7', 'Be3', 'd6', 'Nc3', 'c6', 'Be2', 'Bh6', 'Bxh6', 'Nxh6', 'Nf3', 'Ng4', 'Qd2', 'Na6', 'h3', 'Nh6'];

describe('castlingWing', () => {
  it('PHAm 13.O-O-O: long, away from the g- and h-files Black\'s pawns left', () => {
    const r = castlingWing(fenOf(PHAM), 'O-O-O', 'w');
    expect(r?.kind).toBe('away');
    expect(r?.text).toMatch(/g- and h-files/);
    expect(r?.text).toMatch(/long/);
    const f = readBoardAll('castlingWing', { fenBefore: fenOf(PHAM), san: 'O-O-O', student: 'w' }).at(0);
    expect(f?.seat).toBe('student');
  });

  it('negative control: an ordinary short castle with every pawn home says nothing', () => {
    expect(castlingWing(fenOf(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']), 'O-O', 'w')).toBeNull();
  });

  it('negative control: not a castling move', () => {
    expect(castlingWing(fenOf(PHAM), 'Kf1', 'w')).toBeNull();
  });
});
