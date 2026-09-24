import { describe, it, expect } from 'vitest';
import { principleOnceLine, principleToTeach } from './moveFundamentals';

// WO-TEACH-02 S2 — a quiet owed opening ply teaches the RULE the move follows,
// from the board's own positive fundamentals, never a description.
describe('principle-once line', () => {
  it('names the move and the rule the board proves it follows', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    const lead = principleToTeach(start, 'Nc6', 'black', new Set());
    expect(lead?.id).toBe('development');
    const line = principleOnceLine('Nc6', lead!, 0);
    expect(line.startsWith('Nc6 follows a principle worth keeping: ')).toBe(true);
    // Rotated, not rolled: every key names the move and the SAME rule.
    const all = new Set([0, 1, 2, 3].map((k) => principleOnceLine('Nc6', lead!, k)));
    expect(all.size).toBeGreaterThan(1);
    for (const t of all) { expect(t).toMatch(/Nc6/); expect(t).toContain(lead!.imperative); }
    expect(line).not.toMatch(/now eyes|newly undefended/i);
  });

  it('NEGATIVE CONTROL: a flank space grab is a fundamental, not a principle to teach', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(principleToTeach(start, 'h5', 'black', new Set())).toBeNull();
  });

  it('each principle is taught once per game', () => {
    const start = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
    expect(principleToTeach(start, 'Nc6', 'black', new Set(['development']))).toBeNull();
  });
});
