import { describe, expect, it } from 'vitest';
import { computeMoveFundamentals, ruleForPurpose } from './moveFundamentals';

// Review walk 2026-10-04 (am-SI5q0VJz, 30.Qa4+): "Your Qa4+ takes aim at the
// center, hitting d4 and e4 — pieces behind a strong center reach either wing
// in a move or two." A pawn-center reason, said of a queen check.
const FEN = 'Q1Rnk2r/6pp/5q2/3B4/4p3/P4N2/5PPP/6K1 w - - 0 30';

describe('a piece aiming at the center carries no pawn-center reason', () => {
  it('Qa4+: the center shape has no reason', () => {
    const c = computeMoveFundamentals(FEN, 'Qa4+', 'white').find((f) => f.id === 'center');
    expect(c).toBeDefined();
    expect(c?.reason).toBeNull();
  });
  it('the rule lane does not hand out the pawn-center reason for it', () => {
    expect(ruleForPurpose(FEN, 'Qa4+', 'white', new Set(), 'student')?.text ?? '').not.toMatch(/strong center/);
  });
});
