import { describe, it, expect } from 'vitest';
import { deliberationMarks, fullWeighingSays, HELD_WEIGHING_SAYS, deliberationWeighing, NOTHING_SAID, type Deliberation } from './deliberation';

// The marks sweep, 2026-11-08 (David's game, move 16): Learn held the move
// and said only "Bxh7+? That drops the queen on g4." — and the board still lit
// e5, f6 and d4 and drew Rxe5's whole line. The marks came from the full
// weighing, the words from the held one: the answer handed over on the board.
const FEN = 'r1bqrnk1/5ppp/p3p3/1p1pn1bN/3p2Q1/2PB4/PP3PPP/R1B1R1K1 w - - 0 16';
const d: Deliberation = {
  best: { san: 'Rxe5', evalCp: 250, deltaCp: 0 },
  alternatives: [
    { san: 'Bxh7+', evalCp: -600, deltaCp: 850, shortfall: 'drops-material', drops: { piece: 'q', square: 'g4', line: [], moved: false } },
  ],
  isRealChoice: true,
  bestWhy: 'completes the trade',
  bestLine: 'you play Rxe5 and, two moves later, you play cxd4 — you win a bishop and a pawn',
  bestLineSans: ['Rxe5', 'Bf6', 'Nxf6+', 'Qxf6', 'cxd4'],
} as Deliberation;

describe('a weighing marks what its words say', () => {
  it('the held weighing lights the rule-out and never the held move or its line', () => {
    expect(deliberationWeighing(d, NOTHING_SAID)).toBe('Bxh7+? That drops the queen on g4.');
    const held = deliberationMarks(d, FEN, NOTHING_SAID, HELD_WEIGHING_SAYS);
    expect(new Set(held.squares)).toEqual(new Set(['h7', 'g4']));
    expect(held.lines).toEqual([]);
  });
  it('the full weighing, which says the move and its line, marks them too', () => {
    const full = deliberationMarks(d, FEN, NOTHING_SAID, fullWeighingSays(d, true));
    expect(full.squares).toEqual(expect.arrayContaining(['h7', 'g4', 'e5', 'f6', 'd4']));
    expect(full.lines.map((l) => l.sans[0])).toEqual(['Rxe5']);
  });
  it('a verdict the walk owns says the move, not its line', () => {
    const owned = deliberationMarks(d, FEN, NOTHING_SAID, fullWeighingSays(d, false));
    expect(owned.squares).toContain('e5');
    expect(owned.lines).toEqual([]);
  });
});
