import { describe, it, expect } from 'vitest';
import { countMethod } from './countMethod';

describe('count before you take (P3 how-to-calculate)', () => {
  it('three attackers on a twice-defended knight: the count and the exchange agree', () => {
    const m = countMethod('3qk3/8/4p3/3n4/2P2N2/2N5/8/4K3 w - - 0 1', 'w');
    expect(m?.square).toBe('d5');
    expect(m?.text).toMatch(/^Count before you take on d5: 3 of your pieces hit it and 2 of theirs defend it/);
  });
  it('silent when not to move, or no square is hit and defended twice (negative controls)', () => {
    expect(countMethod('3qk3/8/4p3/3n4/2P2N2/2N5/8/4K3 b - - 0 1', 'w')).toBeNull();
    expect(countMethod('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w')).toBeNull();
  });
});
