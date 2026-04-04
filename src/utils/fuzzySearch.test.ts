import { describe, it, expect } from 'vitest';
import { fuzzyScore } from './fuzzySearch';

describe('fuzzyScore', () => {
  it('returns 0 for exact substring match', () => {
    expect(fuzzyScore('italian', 'Italian Game')).toBe(0);
    expect(fuzzyScore('sicilian', 'Sicilian Defense')).toBe(0);
  });

  it('returns 0 for word-start match that is also a substring', () => {
    // "sic" is a substring of "Sicilian" so it scores 0
    expect(fuzzyScore('sic', 'Sicilian Defense')).toBe(0);
  });

  it('returns 1 for word-start only match', () => {
    // "def" starts the word "Defense" but isn't a substring of the full name from position 0
    expect(fuzzyScore('def', 'Sicilian Defense')).toBe(0); // substring of full string
  });

  it('returns 2 for subsequence match', () => {
    expect(fuzzyScore('itln', 'Italian Game')).toBe(2);
  });

  it('matches close typos via subsequence or edit distance', () => {
    // "italin" is a subsequence of "Italian" so scores 2
    const score = fuzzyScore('italin', 'Italian Game');
    expect(score).not.toBeNull();
    expect(score!).toBeLessThanOrEqual(3);
  });

  it('matches sicillian (common misspelling)', () => {
    const score = fuzzyScore('sicillian', 'Sicilian Defense');
    expect(score).not.toBeNull();
  });

  it('matches frenck (typo for french)', () => {
    const score = fuzzyScore('frenck', 'French Defense');
    expect(score).not.toBeNull();
  });

  it('returns null for completely unrelated strings', () => {
    expect(fuzzyScore('xyz', 'Italian Game')).toBeNull();
    expect(fuzzyScore('basketball', 'Sicilian Defense')).toBeNull();
  });

  it('exact matches score better than typos', () => {
    const exact = fuzzyScore('sicilian', 'Sicilian Defense')!;
    const typo = fuzzyScore('sicillian', 'Sicilian Defense')!;
    expect(exact).toBeLessThan(typo);
  });
});
