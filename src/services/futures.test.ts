import { describe, it, expect } from 'vitest';
import { lineStory, futureBoards, whatChanged } from './futures';

describe('what the try line does (fixes 2–3)', () => {
  it('reads a perpetual check his way: the checks never stop', () => {
    // Rb1 lets the queen check from f3 and g4 forever.
    const fen = '7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1';
    const s = lineStory(fen, ['a1b1', 'f4f3', 'h1g1', 'f3g4', 'g1h1', 'g4f3'], 'their');
    expect(s?.kind).toBe('perpetual');
    expect(s?.text).toMatch(/^…Qf3\+ starts a perpetual check/);
  });

  it('reads a pawn that runs through and queens', () => {
    const s = lineStory('7k/8/8/8/8/8/p7/6K1 w - - 0 1', ['g1f2', 'a2a1q'], 'their');
    expect(s?.kind).toBe('promotes');
    expect(s?.text).toBe('Their a-pawn runs through and queens on a1.');
  });

  it('says nothing when the line is quiet', () => {
    expect(lineStory('7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1', ['a1a2', 'h7h6'], 'their')).toBeNull();
  });

  it('finds the reply board and the quiet end', () => {
    const f = futureBoards('7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1', ['a1b1', 'f4f3', 'h1g1', 'f3g4']);
    expect(f.reply?.ply).toBe(2);
    expect(f.quiet?.ply).toBe(3);
  });

  it('the same line on both sides changes nothing', () => {
    const fen = '7k/6pp/8/8/5q2/8/7P/R6K w - - 0 1';
    const line = { moves: ['a1a2', 'h7h6', 'a2a3'], cp: -900, mate: null };
    const wc = whatChanged({ fen, student: 'w', rating: 1500, tryLine: line, bestLine: line });
    expect(wc.appeared).toEqual([]);
    expect(wc.lost).toEqual([]);
  });
});
