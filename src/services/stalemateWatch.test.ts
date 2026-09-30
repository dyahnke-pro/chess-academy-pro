import { describe, it, expect } from 'vitest';
import { stalemateWatch } from './stalemateWatch';

describe('stalemateWatch (P2 #9)', () => {
  it('names the queen move that stalemates a lone king', () => {
    // White K f6, Q g1; Black K h8. Qg7+?? is check; Qg6 stalemates.
    const w = stalemateWatch('7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', 'w');
    expect(w?.moves).toContain('Qg6');
    expect(w?.text).toMatch(/^Careful — .*Qg6.* stalemate/);
    expect(w?.moves.every((san) => !san.includes('#'))).toBe(true);
  });
  it('silent when not ahead, not to move, or nothing stalemates', () => {
    expect(stalemateWatch('7k/8/5K2/8/8/8/8/6Q1 b - - 0 1', 'w')).toBeNull();
    expect(stalemateWatch('7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', 'b')).toBeNull();
    expect(stalemateWatch('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'w')).toBeNull();
    expect(stalemateWatch('4k3/8/8/8/8/8/8/Q3K3 w - - 0 1', 'w')).toBeNull();
  });
});
