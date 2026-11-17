import { describe, it, expect } from 'vitest';
import { secondWeakness } from './pawnJudgement';

// Danya bench board (2026-11-17), Black to move: their a4 pawn is weak and
// …Nc3 adds the attacker that wins it. It does not "hold for now" — the
// structure read said "Their a4 pawn is defended enough today" beside the
// priority read "aim at it: Nc3 does".
describe('second weakness', () => {
  it('never calls a pawn safe when one more attacker wins it', () => {
    const r = secondWeakness('r4rk1/1p3ppp/2q1p3/1N1pn3/P3n3/4P2P/2P1B1P1/R2Q1RK1 b - - 0 20', 'b');
    expect(r?.text ?? '').not.toMatch(/a4 pawn is defended enough|Don't rush their a4/);
  });
});
