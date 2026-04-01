import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { getPieceNameOnSquare, getWrongMoveHint } from './puzzleHints';

describe('getPieceNameOnSquare', () => {
  it('returns piece name for occupied square', () => {
    const chess = new Chess(); // starting position
    expect(getPieceNameOnSquare(chess, 'e1')).toBe('king');
    expect(getPieceNameOnSquare(chess, 'd1')).toBe('queen');
    expect(getPieceNameOnSquare(chess, 'b1')).toBe('knight');
    expect(getPieceNameOnSquare(chess, 'e2')).toBe('pawn');
  });

  it('returns null for empty square', () => {
    const chess = new Chess();
    expect(getPieceNameOnSquare(chess, 'e4')).toBeNull();
  });
});

describe('getWrongMoveHint', () => {
  const chess = new Chess(); // starting position

  it('returns a theme-based hint on first attempt when theme matches', () => {
    const hint = getWrongMoveHint(1, ['fork', 'middlegame'], 'e2', 'e4', chess);
    expect(hint).toMatch(/attack|two targets/i);
  });

  it('returns a general forcing-move hint on first attempt when no theme matches', () => {
    const hint = getWrongMoveHint(1, ['middlegame', 'short'], 'e2', 'e4', chess);
    expect(hint).toBe('Look for the most forcing move in this position.');
  });

  it('returns a piece hint on second attempt', () => {
    const hint = getWrongMoveHint(2, ['fork'], 'b1', 'c3', chess);
    expect(hint).toBe('Look at what your knight can do.');
  });

  it('returns a generic piece hint when square has no piece', () => {
    const hint = getWrongMoveHint(2, ['fork'], 'e4', 'e5', chess);
    expect(hint).toBe('One of your pieces has a strong move available.');
  });

  it('returns a square hint on third attempt', () => {
    const hint = getWrongMoveHint(3, ['fork'], 'b1', 'c3', chess);
    expect(hint).toBe('The key square is c3. What can reach it?');
  });

  it('returns a square hint on fourth+ attempt', () => {
    const hint = getWrongMoveHint(5, ['fork'], 'b1', 'c3', chess);
    expect(hint).toBe('The key square is c3. What can reach it?');
  });

  it('returns mate hint for mateIn1 theme', () => {
    const hint = getWrongMoveHint(1, ['mateIn1', 'mate'], 'e2', 'e4', chess);
    expect(hint).toMatch(/checkmate in one/i);
  });

  it('returns pin hint for pin theme', () => {
    const hint = getWrongMoveHint(1, ['pin', 'middlegame'], 'e2', 'e4', chess);
    expect(hint).toMatch(/shielding|can't move/i);
  });

  it('returns backRankMate hint', () => {
    const hint = getWrongMoveHint(1, ['backRankMate'], 'e2', 'e4', chess);
    expect(hint).toMatch(/back r(ank|ow)/i);
  });
});
