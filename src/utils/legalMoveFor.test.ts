import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { legalMoveFor, bookContinuation } from './legalMoveFor';

// The live hand walk, 2026-10-09: Italian, Two Knights, then the student
// castled. The book line's next move was …Bb4+ from a position where White
// had not castled — and the coach froze.
const WALK = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'O-O'];
const fenAfter = (sans: string[]): string => { const c = new Chess(); for (const m of sans) c.move(m); return c.fen(); };

describe('a move is matched by what it does', () => {
  it('"Bb4+" with no check left is the move Bb4', () => {
    expect(legalMoveFor(fenAfter(WALK), 'Bb4+')?.san).toBe('Bb4');
  });
  it('an illegal SAN is no move', () => {
    expect(legalMoveFor(fenAfter(WALK), 'Bh3')).toBeNull();
  });
});

describe('the book speaks only while the game is on its line', () => {
  it('a book move from another line is refused, however legal', () => {
    // A book where move 5 is …Bb4+ after c3 instead of O-O.
    const book = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'c3', 'Bb4+'];
    expect(bookContinuation(book, fenAfter(WALK))).toBeNull();
  });
  it('on the line, the next book move is played as it is spelled here', () => {
    const book = [...WALK, 'd6'];
    expect(bookContinuation(book, fenAfter(WALK))).toBe('d6');
  });
  it('past the end of the book there is nothing to say', () => {
    expect(bookContinuation(['e4', 'e5'], fenAfter(WALK))).toBeNull();
  });
});
