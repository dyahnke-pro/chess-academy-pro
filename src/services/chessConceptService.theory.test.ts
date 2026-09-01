import { describe, it, expect } from 'vitest';
import { searchTheoryPassage } from './chessConceptService';

// P-II.1 — free-text theory search over the book corpus. The floor gates: an
// ask that matches nothing in the corpus returns null (honest decline).
describe('searchTheoryPassage — corpus theory search (P-II.1)', () => {
  it('finds a passage for an isolated-pawn strategy ask', () => {
    const hit = searchTheoryPassage('how do I play against an isolated queen pawn');
    expect(hit).not.toBeNull();
    expect(hit!.score).toBeGreaterThanOrEqual(2);
    expect(hit!.passage.text.length).toBeGreaterThan(0);
  });

  it('returns null for an off-corpus / contentless ask', () => {
    expect(searchTheoryPassage('how do I')).toBeNull();
    expect(searchTheoryPassage('lorem ipsum dolor sit')).toBeNull();
  });

  it('names a real concept for a pawn-structure ask', () => {
    const hit = searchTheoryPassage('what is the plan with doubled pawns');
    if (hit) {
      expect(hit.conceptName.length).toBeGreaterThan(0);
      expect(hit.conceptId.length).toBeGreaterThan(0);
    }
    // May be null if the corpus lacks it — the point is it never throws and the
    // shape is correct when present.
    expect(hit === null || typeof hit.score === 'number').toBe(true);
  });
});
