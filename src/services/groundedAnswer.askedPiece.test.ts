// The best-move answer, told what the student narrowed to.
import { describe, it, expect } from 'vitest';
import { assembleMoveEvalAnswer } from './groundedAnswer';

// An Italian where White is castled-ready: O-O is legal, and so are pawn moves.
const FEN = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 6 5';

describe('a move question that narrowed to one piece', () => {
  it('says plainly that the answer is not the piece asked about', () => {
    // e1g1 = O-O. This is his case: asked about a pawn, answered with a king move.
    const a = assembleMoveEvalAnswer({ fen: FEN, bestMoveUci: 'e1g1', evalCp: 140, askedPiece: 'pawn' });
    expect(a?.facts).toContain('No pawn move is the answer here');
    // The move is still named — the honest answer is not withheld, only framed.
    expect(a?.facts).toContain('O-O');
  });

  it('says nothing extra when the best move IS the piece asked about', () => {
    // d2d4 is a pawn move.
    const a = assembleMoveEvalAnswer({ fen: FEN, bestMoveUci: 'd2d4', evalCp: 140, askedPiece: 'pawn' });
    expect(a?.facts.startsWith('The best move is d4.')).toBe(true);
    expect(a?.facts).not.toContain('No pawn move');
  });

  it('is unchanged when the question named no piece', () => {
    const a = assembleMoveEvalAnswer({ fen: FEN, bestMoveUci: 'e1g1', evalCp: 140 });
    expect(a?.facts.startsWith('The best move is O-O.')).toBe(true);
  });

  it('never overrides the opponent framing', () => {
    // Their move stays their move — the restriction is about the student's ask,
    // not about whose board it is.
    const a = assembleMoveEvalAnswer({ fen: FEN, bestMoveUci: 'e1g1', evalCp: 140, askedPiece: 'pawn', studentColor: 'black' });
    expect(a?.facts.startsWith('Their strongest reply is O-O.')).toBe(true);
  });
});
