// B3: the raw `lastMove` a live surface hands the composer — the STUDENT's move
// only, and only when the line really produces the narrated board.
// Negative control: drop the `lm.mover !== studentColor` guard → the opponent
// test fails (their move would be filed under the student).
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { lastMoveIfStudent, lastMoveOfLine, sansOfPgn } from './lastMoveOfLine';

const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const s of sans) c.move(s); return c.fen(); };

describe('sansOfPgn', () => {
  it('strips move numbers, dots and results', () => {
    expect(sansOfPgn('1. e4 e5 2.Nf3 Nc6 1-0')).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
    expect(sansOfPgn('')).toEqual([]);
  });
});

describe('lastMoveOfLine', () => {
  it('names the last move, its mover, and the boards around it', () => {
    const lm = lastMoveOfLine(['e4', 'e5', 'Nf3'])!;
    expect(lm.san).toBe('Nf3');
    expect(lm.mover).toBe('white');
    expect(lm.fenBefore).toBe(fenAfter(['e4', 'e5']));
    expect(lm.fenAfter).toBe(fenAfter(['e4', 'e5', 'Nf3']));
  });
  it('is null on an empty or illegal line — never a guessed board', () => {
    expect(lastMoveOfLine([])).toBeNull();
    expect(lastMoveOfLine(['e4', 'e4'])).toBeNull();
  });
});

describe('lastMoveIfStudent', () => {
  const line = ['e4', 'e5', 'Nf3'];
  it('the student\'s own move, on the board it produced', () => {
    expect(lastMoveIfStudent(line, 'white', fenAfter(line), true)).toEqual({ fenBefore: fenAfter(['e4', 'e5']), san: 'Nf3', cpLoss: null, inBook: true, reads: null });
  });
  it('the OPPONENT\'s move is never handed over as the student\'s', () => {
    expect(lastMoveIfStudent(line, 'black', fenAfter(line), true)).toBeNull();
  });
  it('a PGN that does not produce the live board is not evidence about it', () => {
    expect(lastMoveIfStudent(line, 'white', fenAfter(['d4', 'd5', 'c4']), true)).toBeNull();
  });
  it('a graded cost rides through unchanged', () => {
    expect(lastMoveIfStudent(line, 'white', null, false, 40)?.cpLoss).toBe(40);
  });
});
