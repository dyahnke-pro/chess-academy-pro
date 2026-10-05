import { describe, expect, it } from 'vitest';
import { sayLine, sayMoveClause, sayMoveNoun } from './spokenMove';

describe('disambiguation survives into speech (walk 2026-09-30, game 2)', () => {
  it('two rooks that can take on one square are told apart', () => {
    expect(sayMoveNoun('R1xe3', null)).toBe('the first-rank rook taking on e3');
    expect(sayMoveNoun('R8xe3', null)).toBe('the eighth-rank rook taking on e3');
    expect(sayMoveNoun('Nbd2', null)).toBe('the b-file knight to d2');
    expect(sayMoveClause('Rxe3', null)).toBe('the rook takes e3');
  });
});

describe('the board names the square a piece comes FROM (walk 2026-10-04, defect 8)', () => {
  // Black to move: both knights (c6 and g8) can go to e7.
  const FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 3';
  it('"Nce7" is "the knight from c6", never "the c-file knight"', () => {
    expect(sayMoveClause('Nce7', FEN)).toBe('the knight from c6 to e7');
    expect(sayMoveNoun('Nge7', FEN)).toBe('the knight from g8 to e7');
    expect(sayMoveClause('Nce7', FEN)).not.toMatch(/-file/);
  });
  it('one piece that can go is just "the knight" — no from-square', () => {
    expect(sayMoveClause('Nf6', FEN)).toBe('the knight to f6');
  });
  it('a board the move is not legal on never puts a square in the ear', () => {
    expect(sayMoveClause('Nce7', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe('the c-file knight to e7');
  });
  it('a full-square SAN names it as the from-square', () => {
    expect(sayMoveNoun('Ng1f3', null)).toBe('the knight from g1 to f3');
  });
  it('sayLine walks the board move by move', () => {
    expect(sayLine(FEN, ['Nce7', 'd4', 'Ng6'], 'clause')).toEqual(['the knight from c6 to e7', 'the pawn to d4', 'the knight to g6']);
  });
});
