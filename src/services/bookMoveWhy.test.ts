import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { bookMoveWhy } from './bookMoveWhy';

const fenOf = (line: string): string => { const c = new Chess(); for (const s of line.split(' ')) c.move(s); return c.fen(); };

describe('bookMoveWhy — the book move named, with what it DOES on the board (David 2026-10-14)', () => {
  it('GUARD: Ne2 adds a second guard to the knight on c3 the bishop pins — Nf3 does not', () => {
    const fen = fenOf('e4 e6 d4 d5 Nc3 Bb4');
    const w = bookMoveWhy(fen, 'Ne2', 'Nf3', 'w');
    expect(w?.kind).toBe('guard');
    expect(w?.text).toBe('The book move is Ne2: it adds a second guard to your knight on c3, which their bishop on b4 pins — Nf3 leaves it guarded once.');
    expect(w?.squares).toEqual(['c3', 'b4']);
  });

  it('STOPS A PIN: h6 keeps their bishop off g5, where it pins the knight on f6', () => {
    // Two Knights with d3: …h6 keeps the bishop off g5, where it pins f6 to d8.
    const f2 = fenOf('e4 e5 Nf3 Nc6 Bc4 Nf6 d3');
    const w = bookMoveWhy(f2, 'h6', 'a6', 'b');
    expect(w?.kind).toBe('stopsPin');
    expect(w?.text).toBe('The book move is h6: it keeps their bishop off g5, where it would pin your knight on f6 — a6 allows Bg5.');
  });

  it('CASTLE: the book move clears the way to castle, the student\'s does not', () => {
    // White has Nf3 out and the c4 bishop; Be2/Bc4-type: after e4 e5 Nf3 Nc6, Bc4 lets O-O next.
    const fen = fenOf('e4 e5 Nf3 Nc6');
    const w = bookMoveWhy(fen, 'Bc4', 'h3', 'w');
    expect(w?.kind).toBe('castle');
    expect(w?.text).toBe('The book move is Bc4: it clears the last piece between your king and rook, so you can castle next move — h3 keeps your king in the middle a move longer.');
  });

  it('DEVELOP: a new piece out beats moving one twice', () => {
    const fen = fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5');
    const w = bookMoveWhy(fen, 'c3', 'Ng5', 'w');
    // c3 is a pawn move — no develop job; nothing proven is fine.
    expect(w === null || w.kind !== 'develop').toBe(true);
    const f2 = fenOf('e4 e5 Nf3');
    const w2 = bookMoveWhy(f2, 'Nc6', 'Qe7', 'b');
    expect(w2 === null || w2.text.startsWith('The book move is Nc6')).toBe(true);
    const f3 = fenOf('d4 d5 Nf3');
    const w3 = bookMoveWhy(f3, 'Nf6', 'h6', 'b');
    expect(w3?.kind).toBe('develop');
    expect(w3?.text).toBe("The book move is Nf6: it brings your knight out — h6 spends the move on a wing pawn, and a pawn move can't be taken back.");
  });

  it('the same move, or a board with no job, says nothing', () => {
    const fen = fenOf('e4 e5');
    expect(bookMoveWhy(fen, 'Nf3', 'Nf3', 'w')).toBeNull();
    expect(bookMoveWhy(fen, 'Nf3', 'Zz9', 'w')).toBeNull();
  });
});
