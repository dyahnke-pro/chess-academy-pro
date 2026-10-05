import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { bookMoveAnswer, gradeBookMove, bookMoveHint, bookMoveFound } from './bookMoveQuestion';
import { COACHES_LIBRARY } from '../data/coachesLibrary';

// Capablanca, Chess Fundamentals, Example 11 — the book's own diagram and line.
const cap = COACHES_LIBRARY.find((b) => b.id === 'capablanca-chess-fundamentals')!;
const ex11 = cap.pages.find((p) => p.board && /Example 11/.test(p.heading ?? ''))!.board!;

describe('the chapter question: what does the book play here?', () => {
  it('reads the answer off the book line, on the book board', () => {
    const a = bookMoveAnswer(ex11.fen, ex11.moves);
    expect(a).not.toBeNull();
    const played = new Chess(ex11.fen).move(ex11.moves[0]);
    expect(a).toMatchObject({ san: played.san, from: played.from, to: played.to });
  });

  it('grades by coordinates: right, a legal wrong move, an illegal one', () => {
    const a = bookMoveAnswer(ex11.fen, ex11.moves)!;
    expect(gradeBookMove(ex11.fen, a, a.from, a.to)).toBe('right');
    expect(gradeBookMove(ex11.fen, a, 'a1', 'h8')).toBe('illegal');
  });

  it('the hint climbs: the piece, its square, then the move', () => {
    const a = { from: 'e2', to: 'e4', san: 'e4', piece: 'pawn' } as const;
    expect(bookMoveHint(a, 1)).toBe("Not the book's move. It is a pawn move.");
    expect(bookMoveHint(a, 2)).toBe('Look at your pawn on e2.');
    expect(bookMoveHint(a, 3)).toBe('The book plays e4.');
    expect(bookMoveFound(a, 0)).toMatch(/first try/);
  });

  it('no line, or a line that does not play from the board: no question', () => {
    expect(bookMoveAnswer('4k3/8/8/8/8/8/8/4K3 w - - 0 1', [])).toBeNull();
    expect(bookMoveAnswer('4k3/8/8/8/8/8/8/4K3 w - - 0 1', ['Qd8'])).toBeNull();
  });

  it('every book diagram with a line has an answer that plays from it', () => {
    let lines = 0;
    for (const b of COACHES_LIBRARY) for (const p of b.pages) {
      if (!p.board || p.board.moves.length === 0) continue;
      lines++;
      expect(bookMoveAnswer(p.board.fen, p.board.moves), `${b.id} ${p.id}`).not.toBeNull();
    }
    expect(lines).toBeGreaterThan(0);
  });
});
