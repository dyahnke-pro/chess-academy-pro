import { describe, it, expect } from 'vitest';
import { isBookLine } from './openingDetectionService';

// David 2026-08-28: "Move 1 or 2 shouldn't be auto marked as mistakes. Check the
// mistake guidelines, don't just code to never show an error in the first 2
// moves." isBookLine is the principled gate: a move is book iff real theory
// continues it (at any depth), so move-quality analysis marks it 'book' instead
// of grading opening eval-noise as an inaccuracy/mistake.
describe('isBookLine — theory detection for move-quality grading', () => {
  it('treats the start position as book', () => {
    expect(isBookLine([])).toBe(true);
  });
  it('recognises a mainline opening move (the Sicilian) as book', () => {
    expect(isBookLine(['e4'])).toBe(true);
    expect(isBookLine(['e4', 'c5'])).toBe(true); // David's example: "playing the Sicilian"
  });
  it('recognises a deeper mainline (Ruy Lopez) as book', () => {
    expect(isBookLine(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])).toBe(true);
  });
  it('is FALSE once the line leaves book (an early blunder no theory covers)', () => {
    // 1.e4 e5 2.Qh5 Ke7?? — no theory line continues it, so real grading resumes.
    // (Intentionally permissive up to that point: even joke lines the Lichess DB
    // names, e.g. 1.e4 c5 2.Ke2, count as "book" — better to under-flag the
    // opening than to call a real theory move a mistake.)
    expect(isBookLine(['e4', 'e5', 'Qh5', 'Ke7'])).toBe(false);
  });
});
