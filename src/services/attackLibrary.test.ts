// Computers batch 2 — a known attacking structure, named by its conditions.
import { describe, it, expect } from 'vitest';
import { knownAttack } from './attackLibrary';

const OPPOSITE = 'r4rk1/ppq2pp1/2n1pn1p/8/3P4/2N1BN2/PPPQ1PPP/2KR3R w - - 0 1';
describe('knownAttack — opposite-side castling with a hook', () => {
  it('names the storm with every condition on the board', () => {
    const k = knownAttack(OPPOSITE, 'w', 40);
    expect(k?.id).toBe('opposite-storm');
    expect(k?.text).toMatch(/opposite/);
    expect(k?.text).toMatch(/h6/);
    expect(k?.text).not.toMatch(/feel/i);
    expect(k?.squares).toEqual(expect.arrayContaining(['c1', 'g8', 'h6']));
    expect(k?.proof.exact).toBe(true);
  });
  it('stays silent with both kings on the same wing', () => {
    expect(knownAttack('r4rk1/ppq2pp1/2n1pn1p/8/3P4/2N1BN2/PPPQ1PPP/R4RK1 w - - 0 1', 'w', 40)).toBeNull();
  });
  it('stays silent from a worse position', () => {
    expect(knownAttack(OPPOSITE, 'w', -120)).toBeNull();
  });
});
