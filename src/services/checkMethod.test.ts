import { describe, it, expect } from 'vitest';
import { checkMethod } from './checkMethod';

describe('checkMethod — three ways to meet check (P3)', () => {
  // The black queen on e7 checks the king on e1; the knight on d2 can block on e4.
  const FEN = '4k3/4q3/8/8/8/8/3N4/4K3 w - - 0 1';
  it('names the kinds available when the best answer is not a king move', () => {
    const m = checkMethod(FEN, 'w', 'd2e4');
    expect(m?.kinds).toEqual(['king', 'block']);
    expect(m?.text).toMatch(/Here you can move the king and block the check\./);
    expect(m?.text).not.toMatch(/Ne4|e4/);
  });
  it('silent when the best answer IS the king move, or not in check', () => {
    expect(checkMethod(FEN, 'w', 'e1f1')).toBeNull();
    expect(checkMethod('4k3/8/8/8/8/8/3N4/4K3 w - - 0 1', 'w', 'd2e4')).toBeNull();
  });
});
