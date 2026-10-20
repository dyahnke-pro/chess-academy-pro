// "c2 is its base, the one pawn nothing else guards" — the queen on d1 guards
// c2 (David's Keres, 10.d3). The base of a chain is the pawn no PAWN guards.
import { describe, it, expect } from 'vitest';
import { formation } from './pawnJudgement';

const BEFORE_D3 = 'r2q1rk1/pp2bppp/3pbn2/2p1p3/2BnP3/2N3NP/PPPP1PP1/R1BQ1RK1 w - - 7 10';

describe('the chain base, said truly', () => {
  it('10.d3 builds c2-d3-e4; c2 is guarded by the queen, so it is not "the one nothing else guards"', () => {
    const r = formation(BEFORE_D3, 'd3', 'w');
    expect(r?.text).toMatch(/c2, d3 and e4 form a chain/);
    expect(r?.text).not.toMatch(/nothing else guards/);
    expect(r?.text).toMatch(/no other pawn guards/);
  });
});
