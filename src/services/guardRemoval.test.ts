// Remove the guard — one computer, both seats (David 2026-10-13: "All computers
// MUST work both ways").
import { describe, it, expect } from 'vitest';
import { findGuardRemovals, isGuardRemovalMove } from './guardRemoval';

const CHASE = '3q2k1/3p1p1p/5n2/3n4/6P1/1B6/5P1P/6K1 w - - 0 20';
const CAPTURE = '3q2k1/3p1ppp/5n2/3b2B1/8/8/5PPP/3R2K1 w - - 0 20';

describe('guardRemoval', () => {
  it('chase: g5 hits the only guard of the knight on d5', () => {
    const r = findGuardRemovals(CHASE);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ target: 'd5', guard: 'f6', targetPiece: 'n', guardPiece: 'n' });
    expect(r[0].moves.map((m) => `${m.san}:${m.kind}`)).toEqual(['g5:chase']);
    expect(isGuardRemovalMove(CHASE, 'g4', 'g5')).toBe(true);
  });

  it('capture: Bxf6 takes the only guard of the bishop on d5', () => {
    const r = findGuardRemovals(CAPTURE);
    expect(r[0]).toMatchObject({ target: 'd5', guard: 'f6' });
    expect(r[0].moves.map((m) => `${m.san}:${m.kind}`)).toEqual(['Bxf6:capture']);
  });

  it('BOTH WAYS: read from the other seat it is the threat against them', () => {
    // Black to move, the same board: White's chance is Black's danger.
    const threat = findGuardRemovals(CHASE.replace(' w ', ' b '), 'w');
    expect(threat.map((r) => r.target)).toEqual(['d5']);
    // …and Black has no such chance of its own here.
    expect(findGuardRemovals(CHASE.replace(' w ', ' b '))).toEqual([]);
  });

  it('NEGATIVE: a guard that can retreat and still guard is not removed', () => {
    // b5 hits the c6 bishop, which steps to b7 and still holds d5.
    expect(findGuardRemovals('3q2k1/3p1p1p/2b5/3n4/1P6/1B6/5P1P/6K1 w - - 0 20')).toEqual([]);
  });

  it('NEGATIVE: a target that can take back on the guard square is not lost', () => {
    // Bxf6 Nxf6 is a trade — the d5 knight recaptures the remover.
    expect(findGuardRemovals('3q2k1/3p1ppp/5n2/3n2B1/8/1B6/5PPP/6K1 w - - 0 20')).toEqual([]);
  });

  it('game A (nHdi6Qpx, 17…Qf5): Rc5 chases the queen, but …Qg4 and …Ba6 save the bishop — not claimed', () => {
    expect(findGuardRemovals('r4rk1/pp2ppb1/6pp/5q2/3P4/1Q1bPN2/PP2NPPP/2R1K2R w K - 2 18')).toEqual([]);
  });
});
