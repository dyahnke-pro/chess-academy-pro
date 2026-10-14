import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { bookMoveWhy } from './bookMoveWhy';

const fenOf = (line: string): string => { const c = new Chess(); for (const s of line.split(' ')) c.move(s); return c.fen(); };

describe('bookMoveWhy — the book move named, with what it DOES on the board (David 2026-10-14)', () => {
  it('GUARD: Ne2 adds a second guard to the knight on c3 the bishop pins — Nf3 does not', () => {
    const fen = fenOf('e4 e6 d4 d5 Nc3 Bb4');
    const w = bookMoveWhy(fen, 'Ne2', 'Nf3', 'w');
    expect(w?.kind).toBe('guard');
    expect(w?.text).toBe('The book move is the knight to e2: it adds a second guard to your knight on c3, which their bishop on b4 pins — the knight to f3 leaves it guarded once.');
    expect(w?.squares).toEqual(['c3', 'b4']);
  });

  it('STOPS A PIN: h6 keeps their bishop off g5, where it pins the knight on f6', () => {
    // Two Knights with d3: …h6 keeps the bishop off g5, where it pins f6 to d8.
    const f2 = fenOf('e4 e5 Nf3 Nc6 Bc4 Nf6 d3');
    const w = bookMoveWhy(f2, 'h6', 'a6', 'b');
    expect(w?.kind).toBe('stopsPin');
    expect(w?.text).toBe('The book move is the pawn to h6: it keeps their bishop off g5, where it would pin your knight on f6 — the pawn to a6 allows the bishop to g5.');
  });

  it('CASTLE: the book move clears the way to castle, the student\'s does not', () => {
    // White has Nf3 out and the c4 bishop; Be2/Bc4-type: after e4 e5 Nf3 Nc6, Bc4 lets O-O next.
    const fen = fenOf('e4 e5 Nf3 Nc6');
    const w = bookMoveWhy(fen, 'Bc4', 'h3', 'w');
    // The job, then its consequence (his register): it develops, and that clears the way to castle.
    expect(w?.kind).toBe('develop');
    expect(w?.text).toBe("The book move is the bishop to c4: it brings your bishop out and clears the way to castle next move — the pawn to h3 spends the move on a wing pawn, and a pawn move can't be taken back.");
  });

  it('DEVELOP: a new piece out beats moving one twice', () => {
    const fen = fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5');
    const w = bookMoveWhy(fen, 'c3', 'Ng5', 'w');
    // c3 is a pawn move — no develop job; nothing proven is fine.
    expect(w === null || w.kind !== 'develop').toBe(true);
    const f2 = fenOf('e4 e5 Nf3');
    const w2 = bookMoveWhy(f2, 'Nc6', 'Qe7', 'b');
    expect(w2 === null || w2.text.startsWith('The book move is the knight to c6')).toBe(true);
    const f3 = fenOf('d4 d5 Nf3');
    const w3 = bookMoveWhy(f3, 'Nf6', 'h6', 'b');
    expect(w3?.kind).toBe('develop');
    expect(w3?.text).toBe("The book move is the knight to f6: it brings your knight out — the pawn to h6 spends the move on a wing pawn, and a pawn move can't be taken back.");
  });

  it('the same move, or a board with no job, says nothing', () => {
    const fen = fenOf('e4 e5');
    expect(bookMoveWhy(fen, 'Nf3', 'Nf3', 'w')).toBeNull();
    expect(bookMoveWhy(fen, 'Nf3', 'Zz9', 'w')).toBeNull();
  });

  it('samples 2026-10-14: a capture is never given a side-effect reason; castling is about the king; standing is not covering', () => {
    expect(bookMoveWhy(fenOf('e4 d5'), 'exd5', 'Nc3', 'w')).toBeNull();
    const c = bookMoveWhy(fenOf('e4 e5 Nf3 Nc6 Bc4 Bc5'), 'O-O', 'h3', 'w');
    expect(c?.text).toBe('The book move is castling short: it tucks your king away on the wing and brings your rook toward the centre — the pawn to h3 keeps your king in the middle a move longer.');
    const e = bookMoveWhy(new Chess().fen(), 'e4', 'a3', 'w');
    expect(e?.text).toBe('The book move is the pawn to e4: it fights for the centre — it stands on e4 and it covers d5 — the pawn to a3 leaves d5 and e4 to them.');
  });
});

describe('the book-move why routes through the door on the DNA "but" beat (David 2026-10-14)', () => {
  it('the registry reads it off the student\'s own departure, and the door speaks it after the name', async () => {
    const { __setLocalDbForTests } = await import('./masterPlayLookup');
    const { positionFen } = await import('./masterPlayCache');
    const { readBoard } = await import('./boardComputers');
    const { decideTurn, DNA_BEAT } = await import('./learnTurnDoor');
    expect(DNA_BEAT.bookMove).toBe('but');
    // SYNTHETIC counts — what is tested is the routing, not the theory: every
    // book ply played, then Ne2 the book move where the student plays Nf3.
    const history = ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4', 'Nf3'];
    const positions: Record<string, Array<{ san: string; games: number }>> = {};
    const c = new Chess();
    history.forEach((san, i) => {
      positions[positionFen(c.fen())] = i === history.length - 1 ? [{ san: 'Ne2', games: 400 }] : [{ san, games: 900 }];
      c.move(san);
    });
    __setLocalDbForTests({ positions });
    try {
      const read = readBoard('bookMove', { history, student: 'w' });
      expect(read?.text).toBe('The book move is the knight to e2: it adds a second guard to your knight on c3, which their bishop on b4 pins — the knight to f3 leaves it guarded once.');
      // Not their departure, not the student's seat: nothing.
      expect(readBoard('bookMove', { history, student: 'b' })).toBeNull();
      const fen = c.fen();
      const out = decideTurn([
        { lane: 'bookMove', text: read!.text, fen, squares: read!.squares, claims: [read!.key], role: 'teach', proof: read!.proof },
        { lane: 'opening', text: 'You left the book with the knight to f3.', fen, proof: { kind: 'name' } as never },
      ]);
      expect(out.spoke).toContain('bookMove');
      expect(out.held).not.toContain('bookMove');
      expect(out.pkg.spoken.indexOf('You left the book')).toBeLessThan(out.pkg.spoken.indexOf('The book move is'));
    } finally {
      __setLocalDbForTests(null);
    }
  }, 30_000);
});

describe('the hand-graded falsehoods of 2026-10-14 stay fixed (each failed on the old code)', () => {
  it('a guard the student\'s move took away is not a guard the book move adds', () => {
    const w = bookMoveWhy('r1bq1rk1/pppnbppp/4pn2/3p2B1/2PP4/2N1PN2/PP3PPP/2RQKB1R b K - 0 10', 'c6', 'Nb8', 'b');
    expect(w?.text ?? '').not.toMatch(/adds .* guard to your knight on f6/);
  });
  it('the centre squares are the book piece\'s own, not the departing knight\'s', () => {
    const w = bookMoveWhy('rnb1k2r/pppnqppp/4p3/3pP3/3P4/2N5/PPP2PPP/R2QKBNR w KQkq - 0 10', 'f4', 'Na4', 'w');
    expect(w?.text ?? '').not.toMatch(/covers d5 and e4/);
  });
  it('a pin that loses the pinner is no pin the book move stops', () => {
    const w = bookMoveWhy('rnbq1rk1/2p1bppp/p2p1n2/1p2p3/4P3/1BP2N1P/PP1P1PP1/RNBQR1K1 w - - 0 10', 'd4', 'Ba4', 'w');
    expect(w?.text ?? '').not.toMatch(/keeps their bishop off g4/);
  });
  it('a hanging pawn is never praised as a structure', () => {
    const w = bookMoveWhy('rnbqkbnr/ppp2ppp/3p4/4p3/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 10', 'Nf3', 'c5', 'w');
    expect(w?.text ?? '').not.toMatch(/freezes/);
  });
});
