import { describe, it, expect } from 'vitest';
import { countFullMovesInPgn } from './pgnMoveCount';

describe('countFullMovesInPgn', () => {
  it('counts full moves (plies / 2)', () => {
    // 4 plies = 2 full moves
    expect(countFullMovesInPgn('1. e4 e5 2. Nf3 Nc6')).toBe(2);
    // 3 plies (white to move last) rounds up to 2 full moves
    expect(countFullMovesInPgn('1. e4 e5 2. Nf3')).toBe(2);
  });

  it('ignores the result token', () => {
    expect(countFullMovesInPgn('1. e4 e5 2. Nf3 Nc6 1-0')).toBe(2);
    expect(countFullMovesInPgn('1. d4 d5 1/2-1/2')).toBe(1);
  });

  it('does NOT count clock/eval comments as plies (the bug)', () => {
    const withClocks =
      '1. d4 {[%clk 0:03:00]} d5 {[%clk 0:02:58]} 2. c4 {[%clk 0:02:55]} e6 {[%clk 0:02:50]} 1-0';
    // 4 real plies → 2 full moves, NOT inflated by the 4 comment blocks.
    expect(countFullMovesInPgn(withClocks)).toBe(2);
  });

  it('strips NAG annotations', () => {
    expect(countFullMovesInPgn('1. e4 e5 2. Nf3 $1 Nc6 $6')).toBe(2);
  });

  it('handles empty / missing pgn', () => {
    expect(countFullMovesInPgn('')).toBe(0);
  });

  it('a long real-ish game counts as full moves, not plies', () => {
    // 40 plies of filler → 20 full moves.
    const plies = Array.from({ length: 40 }, (_, i) => (i % 2 === 0 ? 'Nf3' : 'Nf6'));
    const pgn = plies.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m}` : m)).join(' ');
    expect(countFullMovesInPgn(pgn)).toBe(20);
  });
});
