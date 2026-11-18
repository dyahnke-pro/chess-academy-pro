import { describe, it, expect } from 'vitest';
import { findMinorityAttack } from './positionReadingService';

describe('the minority lever never carries a check it does not give (walk 5)', () => {
  it('White\'s b3 read while Black stands in check from Qh4 is "b3", not "b3+"', () => {
    // Black to move after Qh4+: the lever is read with White forced to move.
    // A REAL minority — a4+b4 against a7, b7, c6: b5 hits c6, b7 takes back,
    // and the c6 pawn is left backward on the half-open c-file. (The walk's
    // own board, White a2+b2 against doubled c-pawns, has no pawn guarding
    // c4, so the trade leaves no weak pawn there — Danya article boards
    // 2026-11-18 — and it no longer reads as a minority attack.)
    const ma = findMinorityAttack('4r3/pp2kp2/2p5/8/PP5Q/8/5PPP/4K2R b K - 0 1', 'w');
    expect(ma?.leverSan).toBe('b5');
  });
});

describe('a minority attack names the weak pawn the trade really leaves (Danya article boards 2026-11-18)', () => {
  it('no lever when no pawn guards the target: …g5 against an unguarded f4 leaves no pawn on f4', () => {
    // Black g7+h6 against f4, g2, h2; nothing of White's guards f4 by a pawn.
    expect(findMinorityAttack('1r3n1k/r3q1p1/4p2p/p1p1P3/2Bp1P2/1P5Q/P5PP/2R2RK1 w - - 0 26', 'b')).toBeNull();
  });
  it('no lever when the pushed pawn simply drops: …g5 is taken twice and nothing takes back', () => {
    expect(findMinorityAttack('2b5/p3k3/2p1p1p1/PrN4p/1P1R1P1P/3K2P1/8/8 w - - 0 55', 'b')).toBeNull();
  });
  it('no lever when a second pawn of theirs still guards the recaptured pawn: a4 against b5 with a7 to step up', () => {
    expect(findMinorityAttack('6k1/p4pp1/2p5/1pp1P3/3q1PPp/P3NQ1P/b1P1K3/8 b - - 0 30', 'w')).toBeNull();
  });
  it('no lever when our own pawn shuts the file: …b5 against a4 with our a7 pawn on the a-file', () => {
    expect(findMinorityAttack('3r2k1/pp1q2pp/5p2/2bN4/P3n3/1P1Q3P/1BP2PP1/3R2K1 b - - 0 26', 'b')).toBeNull();
  });
});
