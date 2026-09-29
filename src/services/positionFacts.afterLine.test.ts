import { describe, it, expect } from 'vitest';
import { afterLine } from './positionFacts';

// Walk 3UqPa5eV2e0 ply 33: the student (White) is on move; the engine's best
// line is one move of theirs. Before: "After Qd2, your queen on d2…" read as if
// Qd2 had been played.
const NOW = 'r3k1r1/1qpbbp2/p2p3n/R2Pp1pp/R7/2N1B3/1PP2PPP/3QR1K1 w q - 0 18';
const FUTURE = 'r3k1r1/1qpbbp2/p2p3n/R2Pp1pp/R7/2N1B3/1PPQ1PPP/4R1K1 b q - 1 18';
const TEXT = 'Your queen on d2 and your bishop on e3 form a battery.';

describe('afterLine — a future board is said as the moves that reach it', () => {
  it("one move of the student's own is their option, not a past event", () => {
    expect(afterLine(['Qd2'], FUTURE, NOW, 'w', TEXT)).toBe('Play Qd2 and your queen on d2 and your bishop on e3 form a battery.');
  });
  it('a longer line keeps "After …"', () => {
    expect(afterLine(['Qd2', 'Nf6'], FUTURE, NOW, 'w', TEXT)).toMatch(/^After Qd2, Nf6, your queen/);
  });
  it("a line starting with the opponent's move keeps \"After …\"", () => {
    expect(afterLine(['Qd2'], FUTURE, NOW, 'b', TEXT)).toMatch(/^After Qd2, /);
  });
  it('the board on screen needs no line', () => {
    expect(afterLine(['Qd2'], NOW, NOW, 'w', TEXT)).toBe(TEXT);
  });
});
