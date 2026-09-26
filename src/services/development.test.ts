import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { developedMinorCount, homeMinorCount, isOnHomeSquare, minorsAtHome } from './development';

describe('development — one reading, by piece type', () => {
  it('a knight re-routed to f1 has left home (the Ruy Nbd2-f1)', () => {
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6
    // 8.c3 O-O 9.h3 Na5 10.Bc2 c5 11.d4 Qc7 12.Nbd2 Nc6 13.Nf1
    const c = new Chess();
    for (const m of 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Nc6 Nf1'.split(' ')) c.move(m);
    expect(c.get('f1')?.type).toBe('n');
    // c1 bishop still home; knights on f1/f3 and bishop on c2 are out
    expect(minorsAtHome(c, 'w').map((m) => m.square)).toEqual(['c1']);
    expect(homeMinorCount(c, 'w')).toBe(1);
    expect(developedMinorCount(c, 'w')).toBe(3);
  });

  it('start position: four minors at home, none developed', () => {
    const c = new Chess();
    expect(homeMinorCount(c, 'b')).toBe(4);
    expect(developedMinorCount(c, 'b')).toBe(0);
  });

  it('the full table covers rooks, queen and king, and pawns never', () => {
    expect(isOnHomeSquare('R', 'w', 'H1')).toBe(true);
    expect(isOnHomeSquare('q', 'b', 'd8')).toBe(true);
    expect(isOnHomeSquare('k', 'w', 'e1')).toBe(true);
    expect(isOnHomeSquare('p', 'w', 'e2')).toBe(false);
    expect(isOnHomeSquare('n', 'w', 'f1')).toBe(false);
  });
});
