// Learn walk oct3b (2026-10-03): two plan clauses that read the root board or a
// tactic's mere existence instead of what the engine's line does.
import { describe, it, expect } from 'vitest';
import { betterMoveReason } from './inaccuracyCall';

describe('a plan clause is what the line does (walk oct3b)', () => {
  it('21…Rac8: the rook arrives on c1 after the bishop left — no "take the bishop there"', () => {
    const r = betterMoveReason('r3r1k1/p2q1pbp/6p1/3p2P1/Pp1n4/1P1Q4/R4P1P/1NB2K1R b - - 1 21', 'Nf5', 'Rac8',
      ['a8c8', 'c1d2', 'e8e4', 'd2b4', 'c8c1', 'f1g2', 'e4g4', 'd3g3'], 'black', null);
    expect(r ?? '').not.toMatch(/take the bishop/);
  });
  it('20.d3: a discovery the knight simply steps out of is not "the idea"', () => {
    const r = betterMoveReason('r2q3r/1b1p1kp1/p3p1p1/2p1b2p/1pP1n2N/1P4P1/P1NPQP1P/1RB2RK1 w - - 0 20', 'Qf3+', 'd3',
      ['d2d3', 'e4c3', 'e2e5', 'd8f6', 'f2f4', 'c3b1', 'c1e3', 'b1c3'], 'white', null);
    expect(r ?? '').not.toMatch(/discovered attack/);
  });
});

describe('one point, one saying (walk oct3b, 15…e5)', () => {
  it('a found slip-answer carries the move-point claim key, so the point is not said twice', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/components/Coach/CoachTeachPage.tsx', 'utf8');
    expect(src).toMatch(/const foundKeys = \[`slip-found:\$\{move\.san\}`, move\.san\.includes\('x'\) \? `capture:\$\{move\.to\}:\$\{move\.history\.length\}` : `point:\$\{move\.history\.length\}`\]/);
    expect(src).toMatch(/\[`point:\$\{move\.history\.length\}`\]/);
  });
});
