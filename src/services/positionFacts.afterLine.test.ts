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
    expect(afterLine(['Qd2'], FUTURE, NOW, 'w', TEXT)).toBe('If you play Qd2, your queen on d2 and your bishop on e3 form a battery.');
  });
  it('reads for a sentence that opens on a verb (the discovery shape)', () => {
    expect(afterLine(['Nd4'], FUTURE, NOW, 'w', 'Moving the knight on e5 would unveil an attack.')).toBe('If you play Nd4, moving the knight on e5 would unveil an attack.');
  });
  it('a longer line keeps "After …"', () => {
    expect(afterLine(['Qd2', 'Nf6'], FUTURE, NOW, 'w', TEXT)).toMatch(/^After Qd2, …Nf6, your queen/);
  });
  it("a line starting with the opponent's move keeps \"After …\"", () => {
    expect(afterLine(['Qd2'], FUTURE, NOW, 'b', TEXT)).toMatch(/^After Qd2, /);
  });
  it('the board on screen needs no line', () => {
    expect(afterLine(['Qd2'], NOW, NOW, 'w', TEXT)).toBe(TEXT);
  });
  it('a long line is said as the mover\'s own moves, never a score sheet nor "and N more moves" (rule 4, 2026-11-20)', () => {
    const line = ['Qc2', 'Bc6', 'Qb1', 'Nd7', 'Bc3', 'c4', 'Rd4', 'Qc5', 'Red1'];
    expect(afterLine(line, FUTURE, NOW, 'w', TEXT)).toBe('After Qc2, Qb1, Bc3, Rd4 and Red1, your queen on d2 and your bishop on e3 form a battery.');
    // Four plies are still said move by move.
    expect(afterLine(line.slice(0, 4), FUTURE, NOW, 'w', TEXT)).toMatch(/^After Qc2, …Bc6, Qb1, …Nd7, /);
  });
});

describe('a line said after a Black move marks Black\'s moves (Danya read: "After Bd5, Qf2, Qe4, your queen pins")', () => {
  it('Black to move: the first and third moves carry "…"', () => {
    const now = '8/8/8/8/8/8/8/k6K b - - 0 1';
    expect(afterLine(['Bd5', 'Qf2', 'Qe4'], '8/8/8/8/8/8/8/k5K1 w - - 0 1', now, 'b', 'Your queen pins their knight.')).toMatch(/^After …Bd5, Qf2, …Qe4, your queen pins/);
  });
});
