// Run C / run F walks 2026-09-30: the student's own tactic line, seated from the board.
import { describe, it, expect } from 'vitest';
import { seatedTacticLine } from './lookaheadPlan';

describe('seatedTacticLine', () => {
  it('a pin names your pinner and their pinned piece (C2unZJEz01o)', () => {
    const fen = '8/8/8/8/8/7B/6r1/K4k2 w - - 0 1';
    expect(seatedTacticLine('pin', 'Bishop on h3 pins rook on g2 against king on f1', fen, 'w'))
      .toBe('You have a pin: your bishop on h3 pins their rook on g2 against their king on f1.');
  });
  it('a back-rank threat names THEIR king — the victim comes first (oH407-a1v-4 ply 30)', () => {
    const fen = '4r1k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1';
    const line = seatedTacticLine('back-rank threat', 'King on g1 has no escape square and the back rank can be invaded from e8', fen, 'b');
    expect(line).toMatch(/their king on g1/);
    expect(line).not.toMatch(/your king on g1/);
  });
  it('a discovery that already names itself is the sentence', () => {
    const fen = '4k3/8/8/8/6B1/5N2/4q3/K7 w - - 0 1';
    expect(seatedTacticLine('discovered attack', 'The knight on f3 is a discovered attack in waiting — moving it unveils the bishop on g4 against the queen on e2', fen, 'w'))
      .toBe('Your knight on f3 is a discovered attack in waiting — moving it unveils your bishop on g4 against their queen on e2.');
  });
  it('no description says the motif alone', () => {
    expect(seatedTacticLine('fork', null, '8/8/8/8/8/8/8/K6k w - - 0 1', 'w')).toBe('You have a fork.');
  });
});
