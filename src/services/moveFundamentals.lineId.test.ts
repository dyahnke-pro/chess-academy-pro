import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { fundamentalOfLine, principleLine } from './moveFundamentals';

// A principleLine id has two shapes: the bare id in the opening, and
// `mg:<id>:<wording>` (with `|mg-rule:<id>` riding along) past it. The review's
// claim joins read only the first, so a middlegame rule never joined the line
// that said the same thing (Review tape 2026-10-21, 20.Bd2).
describe('the fundamental behind a rule line', () => {
  it('reads both shapes', () => {
    expect(fundamentalOfLine('development')).toBe('development');
    expect(fundamentalOfLine("mg:keep-working:steps out of the pawn's reach, keeping the bishop rather than letting the pawn win it")).toBe('keep-working');
    expect(fundamentalOfLine('mg:passed-pawn:pushes your passed pawn: on|mg-rule:passed-pawn')).toBe('passed-pawn');
    expect(fundamentalOfLine('hint:count:c5')).toBeNull();
    expect(fundamentalOfLine('mg:')).toBeNull();
  });
  it('a real middlegame rule line carries the shape it reads', () => {
    // 20.Bd2 in Firouzja–Carlsen: the bishop on e3 steps out of the f4 pawn's reach.
    const c = new Chess();
    for (const san of 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O h3 c5 d5 e6 Bd3 Nbd7 O-O e5 Be3 Nh5 a3 Nf4 b4 b6 Rb1 Nxd3 Qxd3 a6 Rfe1 h6 Qd2 Kh7 Na4 f5 bxc5 bxc5 Qc2 f4'.split(' ')) c.move(san);
    const line = principleLine(c.fen(), 'Bd2', 'white', new Set(), 0);
    expect(line?.id.startsWith('mg:keep-working:')).toBe(true);
    expect(fundamentalOfLine(line?.id ?? '')).toBe('keep-working');
  });
});
