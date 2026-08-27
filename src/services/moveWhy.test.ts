import { describe, it, expect } from 'vitest';
import { computeMoveWhy } from './moveWhy';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('computeMoveWhy — board-true, specific, no filler', () => {
  it('names the real central squares a developing knight covers', () => {
    // 1.Nf3 — the knight on f3 covers e5 and d4.
    const why = computeMoveWhy(START, 'Nf3');
    expect(why).toMatch(/knight to f3 develops/i);
    expect(why).toMatch(/e5/);
    expect(why).toMatch(/d4/);
  });

  it('calls a fianchetto the long diagonal with what it eyes', () => {
    // Bg2 with the long diagonal open through to d5.
    const fen = 'rnbqkbnr/ppp1pppp/8/3p4/8/6P1/PPPPPP1P/RNBQKBNR w KQkq - 0 3';
    const why = computeMoveWhy(fen, 'Bg2');
    expect(why).toMatch(/long diagonal/i);
    expect(why).toMatch(/d5/);
  });

  it('says what a capture takes', () => {
    // 1.e4 d5 2.exd5 — the e4 pawn takes on d5.
    const c = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(computeMoveWhy(c, 'exd5')).toMatch(/takes the pawn on d5/i);
  });

  it('names king safety on castling', () => {
    const fen = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    expect(computeMoveWhy(fen, 'O-O')).toMatch(/king to safety/i);
  });

  it('flags a check as forcing', () => {
    // Rook on a1 to a8 checks the king on e8 along the back rank.
    const fen = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';
    expect(computeMoveWhy(fen, 'Ra8+')).toMatch(/checks the king/i);
  });

  it('returns empty on illegal / unparseable input (silence over guessing)', () => {
    expect(computeMoveWhy(START, 'Zz9')).toBe('');
    expect(computeMoveWhy('', 'e4')).toBe('');
  });
});
