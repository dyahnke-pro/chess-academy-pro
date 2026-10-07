import { describe, it, expect } from 'vitest';
import { squaresNamedIn } from './moveWhy';


describe('squaresNamedIn — the squares a spoken line names (voiced or computed)', () => {
  it('pulls bare + suffixed squares from prose', () => {
    const s = squaresNamedIn("that pawn move has weakened the d4-square, and the knight eyes e5.");
    expect(s).toContain('d4');
    expect(s).toContain('e5');
  });
  it('pulls SAN destinations', () => {
    expect(squaresNamedIn('Black takes on e4 and the queen to b6 forbids d4.')).toEqual(expect.arrayContaining(['e4', 'b6', 'd4']));
  });
  it('does not false-match inside words / numbers', () => {
    expect(squaresNamedIn('the strategy in 2026 was fine')).toEqual([]);
  });
  it('caps to avoid clutter', () => {
    expect(squaresNamedIn('a1 b2 c3 d4 e5 f6', 3)).toHaveLength(3);
  });
});
