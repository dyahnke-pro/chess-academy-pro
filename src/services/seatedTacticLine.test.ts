// Run C walk 2026-09-30 (C2unZJEz01o): the tactic line named nobody's pieces.
import { describe, it, expect } from 'vitest';
import { seatedTacticLine } from './lookaheadPlan';

describe('seatedTacticLine', () => {
  it('a pin names your pinner and their pinned piece', () => {
    expect(seatedTacticLine('pin', 'Bishop on h3 pins rook on g2 against king on f1'))
      .toBe('You have a pin: your bishop on h3 pins their rook on g2 against their king on f1.');
  });
  it('a discovery that already names itself is the sentence, and the unveiled piece is yours', () => {
    expect(seatedTacticLine('discovered attack', 'The knight on f3 is a discovered attack in waiting — moving it unveils the bishop on g4 against the queen on e2'))
      .toBe('Your knight on f3 is a discovered attack in waiting — moving it unveils your bishop on g4 against their queen on e2.');
  });
  it('no description says the motif alone', () => {
    expect(seatedTacticLine('fork', null)).toBe('You have a fork.');
  });
});
