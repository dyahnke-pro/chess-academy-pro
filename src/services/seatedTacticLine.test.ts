// Run C / run F walks 2026-09-30: the student's own tactic line, seated from the board.
import { describe, it, expect } from 'vitest';
import { seatedTacticLine } from './lookaheadPlan';

const tac = (type: string, description: string) => ({ type, description, involvedSquares: [] as string[] });

describe('seatedTacticLine', () => {
  it('a pin names your pinner and their pinned piece (C2unZJEz01o)', () => {
    const fen = '8/8/8/8/8/7B/6r1/K4k2 w - - 0 1';
    expect(seatedTacticLine('pin', tac('pin', 'Bishop on h3 pins rook on g2 against king on f1'), fen, 'w', 0))
      .toBe('You have a pin: your bishop pins their rook against their king.');
  });
  it('a back-rank threat names THEIR king — the victim comes first (oH407-a1v-4 ply 30)', () => {
    const fen = '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1';
    const line = seatedTacticLine('back-rank threat', tac('back_rank', 'King on g1 has no escape square and the back rank can be invaded from e8'), fen, 'b', 0);
    expect(line).toMatch(/their king/);
    expect(line).not.toMatch(/your king/);
  });
  it('a discovery that already names itself is the sentence', () => {
    const fen = '4k3/8/8/8/6B1/5N2/4q3/K7 w - - 0 1';
    expect(seatedTacticLine('discovered attack', tac('discovery', 'The knight on f3 is a discovered attack in waiting — moving it unveils the bishop on g4 against the queen on e2'), fen, 'w', 0))
      .toBe('Your knight is a discovered attack in waiting — moving it unveils your bishop against their queen.');
  });
  it('no description says the motif alone', () => {
    expect(seatedTacticLine('fork', null, '8/8/8/8/8/8/8/K6k w - - 0 1', 'w', 0)).toBe('You have a fork.');
  });
  it('a removal of the guard is said at its instance\'s stem, seated (Review prod audit 2026-11-04)', () => {
    const fen = '4k3/2q5/3b4/8/8/8/8/4K3 w - - 0 1';
    const guard = { type: 'removal_of_guard', description: 'The queen on c7 is the only defender of the bishop on d6 — and it can be taken', involvedSquares: ['c7', 'd6'] };
    expect(seatedTacticLine('removal of the guard', guard, fen, 'w', 1)).toMatch(/their queen and their bishop loses its only guard/i);
  });
});

// Prod Learn audit 2026-11-09: "You have an overloaded defender: their queen is
// overloaded — it's the only defender of both…" named the motif twice.
describe('a description that names its motif is the sentence', () => {
  it('an overloaded queen is said once', () => {
    const fen = 'r3r1k1/8/8/8/8/8/8/3q2K1 w - - 0 1';
    const overload = { type: 'overload', description: "The queen on d1 is overloaded — it's the only defender of both the rook on a8 and the rook on e8", involvedSquares: ['d1', 'a8', 'e8'] };
    const line = seatedTacticLine('overloaded defender', overload, fen, 'w', 0);
    expect(line).not.toMatch(/You have an overloaded defender/);
    expect(line).toMatch(/^Their queen is overloaded/);
  });
});
