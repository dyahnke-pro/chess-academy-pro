// A flagged move that gets no fundamental must still SAY WHY (review N900,
// ply 30, 2026-09-26): the review's declined row only fires on a reason, so an
// empty `why` made the audit's diagnosis blind.
import { describe, it, expect } from 'vitest';
import { attributePrinciples } from './principleAttribution';

const N900 = 'e4 c5 Nf3 d6 c3 Nf6 e5 dxe5 Nxe5 Nbd7 Nxd7 Bxd7 Bc4 Bc6 O-O e6 Na3 a6 Bb3 b5 Nc2 Bd6 c4 h5 d4 bxc4 Bxc4 Ng4 h3 Qc7'.split(' ');

describe('attribution is never blind', () => {
  it('names a fundamental or the reason there is none', () => {
    for (const best of ['Nf6', 'Nh6', 'Qb6', 'Qh4']) {
      const why: string[] = [];
      const r = attributePrinciples({ historySans: N900, bestSan: best, classification: 'inaccuracy', replySan: null }, why);
      expect(r.length > 0 || why.length > 0, `best=${best}: no fundamental and no reason`).toBe(true);
    }
  });
});
