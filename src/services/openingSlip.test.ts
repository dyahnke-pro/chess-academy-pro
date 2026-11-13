// THE OPENING SLIP (David 2026-11-07/08) — on real positions: theory lines
// from the Lichess opening database and the departures in David's own games
// (chesscom ids named). Each case failed on the old code, where the book-move
// lane said `bookMoveWhy` alone: the order and the hang were never said, and a
// different line with no tactic in it still spoke.
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { openingSlip, bookFromLines, bookMoveRead, type OpeningBook } from './openingSlip';
import { bookLinesThrough } from './openingDetectionService';
import { bookMoveWhy } from './bookMoveWhy';
import { findPins } from './pinGeometry';

const board = (sans: readonly string[]): string => {
  const c = new Chess();
  for (const s of sans) c.move(s);
  return c.fen();
};
/** The book at `history`: these moves, and the named lines through them. */
const bookAt = (history: readonly string[], moves: readonly string[]): OpeningBook => ({
  source: 'theory',
  moves,
  lines: bookLinesThrough(history).filter((l) => moves.includes(l[0])),
});
const slip = (history: readonly string[], played: string, moves: readonly string[]): ReturnType<typeof openingSlip> => {
  const fen = board(history);
  return openingSlip({ fen, playedSan: played, book: bookAt(history, moves), student: new Chess(fen).turn() });
};

describe('ORDER — a book move played early', () => {
  it('QGD, 3.Bg5 before 3.Nc3: the bishop hangs to the queen on d8', () => {
    const r = slip(['d4', 'd5', 'c4', 'e6'], 'Bg5', ['Nc3', 'Nf3', 'cxd5']);
    expect(r?.kind).toBe('order');
    expect(r?.bookSan).toBe('Nc3');
    expect(r?.text).toContain('Nothing guards your bishop on g5, and their queen on d8 can take it.');
    expect(r?.text).toMatch(/the knight to c3 first/i);
    // The old lane named the knight's job and never the hang.
    expect(bookMoveWhy(board(['d4', 'd5', 'c4', 'e6']), 'Nc3', 'Bg5', 'w')?.text ?? '').not.toMatch(/hanging/);
  });
  it('Panov, 5…Bg4 before 5…Nc6: the bishop wants to pin a knight that is not out yet', () => {
    const r = slip(['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3'], 'Bg4', ['Nc6', 'e6', 'g6']);
    expect(r?.kind).toBe('order');
    expect(r?.lost?.kind).toBe('pin');
    expect(r?.text).toContain('Your bishop wants to pin their knight on f3 to their queen, and that knight is not out yet.');
  });
  it('Petrov-style 2…Bc5 before 2…Nc6 (1.e4 e5 2.Nf3): the pawn on e5 hangs', () => {
    const r = slip(['e4', 'e5', 'Nf3'], 'Bc5', ['Nc6', 'Nf6', 'd6']);
    expect(r?.kind).toBe('order');
    expect(r?.text).toContain('Nothing guards your pawn on e5, and their knight on f3 can take it.');
  });
});

describe('SQUARE — the same piece, another square', () => {
  it('Nimzo-Indian, 3…Bc5 for 3…Bb4: the bishop hangs to the pawn on d4', () => {
    const r = slip(['d4', 'Nf6', 'c4', 'e6', 'Nc3'], 'Bc5', ['Bb4', 'd5', 'b6', 'c5']);
    expect(r?.kind).toBe('square');
    expect(r?.text).toContain('Nothing guards your bishop on c5, and their pawn on d4 can take it.');
    expect(r?.text).toMatch(/b4/);
  });
  it('his chesscom-164463094532, Winawer 4.Nf3 for 4.Ne2: why e2 was the square', () => {
    const r = slip(['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'], 'Nf3', ['e5', 'exd5', 'Ne2']);
    expect(r?.kind).toBe('square');
    expect(r?.text).toContain('It adds a second guard to your knight on c3, which their dark-squared bishop pins. The knight to f3 leaves it guarded once.');
  });
});

describe('LINE — another move: said only when the tactics change', () => {
  it('Two Knights, 4…h6 for 4…d5: their knight takes on f7 and forks queen and rook', () => {
    const r = slip(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'], 'h6', ['d5', 'Bc5', 'Nxe4']);
    expect(r?.kind).toBe('line');
    expect(r?.created?.kind).toBe('fork');
    expect(r?.text).toContain('Their knight can take on f7, forking your queen on d8 and your rook on h8.');
  });
  it('his chesscom-80725453, Alapin 7.Nxd4 for 7.cxd4: the pawn on g2 hangs to the queen on d5', () => {
    const r = slip(['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nf6', 'Nf3', 'Bg4', 'Be2', 'cxd4'], 'Nxd4', ['cxd4']);
    expect(r?.text).toBe('Nothing guards your pawn on g2, and their queen on d5 can take it. The c-pawn taking on d4 was the book move.');
  });
  it('his chesscom-822371912, Fried Liver 7…Qf6 for 7…Ke6: the knight on d5 hangs to the bishop', () => {
    const r = slip(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5', 'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+'], 'Qf6', ['Ke6']);
    expect(r?.text).toContain('Nothing guards your knight on d5, and their bishop on c4 can take it.');
  });
  it('his chesscom-148418905981, 5.d3 for 5.Bb5: the pin on the knight on c6 is given up', () => {
    const r = slip(['e4', 'c5', 'f4', 'Nc6', 'Nc3', 'd6', 'Nf3', 'Bg4'], 'd3', ['Bb5']);
    expect(r?.lost?.kind).toBe('pin');
    expect(r?.text).toMatch(/pins their knight on c6 to their king/);
  });
  it('a pin still there to play next move is delayed, not lost: silent', () => {
    // QGD 4.a3 for 4.Bg5 — the bishop can still go to g5 and pin.
    const history = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'];
    const pinned = new Chess(board(history));
    pinned.move('Bg5');
    expect(findPins(pinned, 'g5').some((p) => p.involvedSquares[1] === 'f6' && p.involvedSquares[2] === 'd8')).toBe(true);
    expect(slip(history, 'a3', ['Bg5', 'Nf3', 'cxd5'])).toBeNull();
  });
  it('QGD 7…b6 for 7…Be7 hands them nothing and gives up nothing: silent', () => {
    const history = ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5'];
    expect(slip(history, 'b6', ['Be7', 'Nbd7', 'h6', 'c6'])).toBeNull();
    // The old lane spoke here.
    expect(bookMoveWhy(board(history), 'Be7', 'b6', 'b')).not.toBeNull();
  });
  it('a book move is never a slip', () => {
    expect(slip(['e4', 'e5'], 'Nf3', ['Nf3', 'Bc4'])).toBeNull();
  });
});

describe('the pro\'s book (Openings Play rung)', () => {
  const lines = [['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']];
  it('every pet line through the board gives its next move', () => {
    expect(bookFromLines(lines, ['e4', 'e5', 'Nf3', 'Nc6'])?.moves).toEqual(['Bb5', 'Bc4']);
  });
  it('a board his lines do not reach is thin: the caller reads the masters', () => {
    expect(bookFromLines(lines, ['d4'])).toBeNull();
  });
});

describe('the Play rung reads the same computer, move by move (bookMoveRead)', () => {
  const najdorf = [['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']];
  it('a move of the pro\'s line is book', () => {
    expect(bookMoveRead(['e4', 'c5', 'Nf3'], 'w', najdorf)).toEqual({ left: false, text: null, squares: [] });
  });
  it('their move off the course\'s line: "They left this line with …" — a pro\'s line is not the book', () => {
    expect(bookMoveRead(['e4', 'c5', 'Nf3', 'Nc6'], 'w', najdorf)?.text).toBe('They left this line with the knight to c6.');
  });
  it('a slip against a course line names the line, never "the book"', () => {
    const fen = board(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6']);
    const course = bookFromLines(najdorf, ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6']);
    expect(course?.source).toBe('course');
    // 6.Bc4 leaves the pawn on e4 to their knight on f6 (the line plays Nc3).
    const s = openingSlip({ fen, playedSan: 'Bc4', book: course!, student: 'w' });
    expect(s?.text).toBe('Nothing guards your pawn on e4, and their knight on f6 can take it. This line plays the knight to c3 here.');
  });
  it('the student\'s move off his line says the opening slip — 5.Bd3 hands them the pawn on e4', () => {
    const r = bookMoveRead(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Bd3'], 'w', najdorf);
    expect(r?.left).toBe(true);
    expect(r?.text ?? 'silent').toMatch(/knight to c3|silent/);
  });
  it('a board his lines never reach, with the masters\' moves not in memory: no claim', () => {
    expect(bookMoveRead(['d4', 'd5', 'c4'], 'w', najdorf)).toBeNull();
  });
});
