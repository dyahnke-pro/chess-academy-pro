import { describe, expect, it } from 'vitest';
import { attributePrinciples } from './principleAttribution';

// Review walk 2026-10-04, game am-SI5q0VJz, 37.h3: "Pawns in front of the king
// move only for a reason — this one opens a line, and Qa1+ uses it." Qa1+ was
// already a safe check before h3; h3 made luft against it.
const HIST = ["e4", "c6", "Nf3", "d5", "e5", "Bf5", "d4", "e6", "Nc3", "c5", "Bf4", "Nc6", "dxc5", "Bxc5", "Bb5", "a6", "Ba4", "b5", "Bb3", "b4", "Na4", "Bb6", "Nxb6", "Qxb6", "O-O", "a5", "a3", "a4", "Ba2", "b3", "cxb3", "axb3", "Bxb3", "Na5", "Ba2", "Qxb2", "Qa4+", "Ke7", "Bg5+", "f6", "exf6+", "Nxf6", "Rfc1", "Nb7", "Bxf6+", "Qxf6", "Rc7+", "Kf8", "Qxa8+", "Nd8", "Rac1", "e5", "Rc8", "Bxc8", "Rxc8", "Ke8", "Bxd5", "e4", "Qa4+", "Ke7", "Qxe4+", "Kd7", "Qg4+", "Ke7", "Rc7+", "Ke8", "Qe4+", "Kf8", "Qb4+", "Ke8", "Qb5+", "Kf8", "h3"];

describe('a weakened shield names only a check the pawn move opened', () => {
  it('h3 opens nothing for Qa1+', () => {
    const attrs = attributePrinciples({ replySan: null, historySans: HIST, bestSan: 'Qb4+', classification: 'inaccuracy', pvAfterPlayed: ['Qd6'] });
    expect(attrs.some((x) => x.id === 'weakened-king-shield')).toBe(false);
  });
});
