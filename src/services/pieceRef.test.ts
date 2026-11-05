// A piece named the way a person names it: the square only where the words
// cannot tell two pieces apart, and the square always returned for the board.
import { describe, it, expect } from 'vitest';
import { pieceRef } from './pieceRef';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('pieceRef', () => {
  it('a king and a lone queen need no square', () => {
    expect(pieceRef(START, 'e1', 'w')).toEqual({ words: 'your king', square: 'e1', saysSquare: false });
    expect(pieceRef(START, 'd8', 'w')).toEqual({ words: 'their queen', square: 'd8', saysSquare: false });
  });

  it('a pawn is its file', () => {
    expect(pieceRef(START, 'f2', 'w')?.words).toBe('your f-pawn');
    expect(pieceRef(START, 'c7', 'w')?.words).toBe('their c-pawn');
  });

  it('two bishops are told apart by their colour', () => {
    expect(pieceRef(START, 'c1', 'w')?.words).toBe('your dark-squared bishop');
    expect(pieceRef(START, 'f1', 'w')?.words).toBe('your light-squared bishop');
    expect(pieceRef(START, 'f8', 'b')?.words).toBe('your dark-squared bishop');
  });

  it('two knights or two rooks need the square', () => {
    expect(pieceRef(START, 'g1', 'w')).toEqual({ words: 'your knight on g1', square: 'g1', saysSquare: true });
    expect(pieceRef(START, 'a8', 'w')?.words).toBe('their rook on a8');
  });

  it('a lone knight needs none, and doubled pawns need the square', () => {
    const fen = '4k3/8/8/8/8/2P5/2P2N2/4K3 w - - 0 1';
    expect(pieceRef(fen, 'f2', 'w')?.words).toBe('your knight');
    expect(pieceRef(fen, 'c3', 'w')).toEqual({ words: 'your c-pawn on c3', square: 'c3', saysSquare: true });
  });

  it('an empty square or a bad board is null', () => {
    expect(pieceRef(START, 'e4', 'w')).toBeNull();
    expect(pieceRef('not a fen', 'e1', 'w')).toBeNull();
  });
});
