import { describe, it, expect } from 'vitest';
import { assembleThreatAnswer } from './groundedAnswer';

describe('chat threat answer — the same take-the-attacker check Learn runs', () => {
  it('a pawn hitting a bishop, nothing guarding the pawn: take it', () => {
    // h3 hits the g4 bishop and nothing guards h3, so …Bxh3 answers it.
    const fen = '4k3/8/8/8/6b1/7P/8/4K3 b - - 0 1';
    const a = assembleThreatAnswer(fen, null, 'black', 'opponent');
    expect(a?.facts).toMatch(/bishop on g4/);
    expect(a?.facts).toMatch(/you can take their pawn on h3, and that answers it/);
  });

  it('…Bxh3 gxh3 gives a bishop for a pawn — no answer, the warning stands', () => {
    const fen = '4k3/8/8/8/6b1/7P/6P1/4K3 b - - 0 1';
    const a = assembleThreatAnswer(fen, null, 'black', 'opponent');
    expect(a?.facts).toMatch(/bishop on g4/);
    expect(a?.facts).not.toMatch(/that answers it/);
  });
});
