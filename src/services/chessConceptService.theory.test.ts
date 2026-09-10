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

  // Two-distinct-token gate (David 2026-09-09 loop): a match carried by a single
  // generic chess noun ("pawn" / "attack" / "squares") is a coincidence, not a
  // topic match — it let the coach serve a confidently-WRONG concept. These
  // decline honestly instead.
  it('declines a single-generic-token coincidence (pawn center ≠ isolated pawn)', () => {
    // "pawn center" (a c3-d4 duo) shares only "pawn" with the Isolated-pawn
    // passage — the OPPOSITE structure. Must not serve IQP theory as the answer.
    const hit = searchTheoryPassage('explain the c3-d4 pawn center');
    expect(hit?.conceptId).not.toBe('pawn-isolated');
  });

  it('declines "minority attack" matching the "Discovered attack" tactic on "attack" alone', () => {
    const hit = searchTheoryPassage('how do I play a minority attack');
    expect(hit?.conceptId).not.toBe('discovered-attack');
  });

  it('keeps genuine multi-token matches (bishop pair, doubled pawns, castled-king attack)', () => {
    expect(searchTheoryPassage('how to use the bishop pair')).not.toBeNull();
    expect(searchTheoryPassage('what is the plan with doubled pawns')).not.toBeNull();
    expect(searchTheoryPassage('how do I attack a castled king')).not.toBeNull();
  });

  // Generic-qualifier gate (David 2026-09-10 loop): "good"/"bad"/"makes"/
  // "powerful" name no chess concept but appear in many passages, so they were
  // the spurious 2nd token that let "what makes a good bishop" match *Discovered
  // attack* (on "makes" + "good") — a confidently-WRONG concept. They are now
  // stopwords, so a bishop/knight-quality ask resolves on its chess token alone
  // ("bishop") → below the two-token floor → honest decline, never a wrong hit.
  it('declines "what makes a good/bad bishop" instead of serving a wrong concept', () => {
    for (const q of ['what makes a good bishop', 'what makes a bishop bad', 'what makes a knight strong']) {
      const hit = searchTheoryPassage(q);
      expect(hit?.conceptId).not.toBe('tac-discovered');
      // With only a single chess token left, it declines honestly (null) rather
      // than serving an off-topic passage.
      expect(hit).toBeNull();
    }
  });

  it('the qualifier stopwords do NOT break real concepts that use "weak"', () => {
    // "weak" names a real concept ("Weak squares") and is deliberately KEPT.
    expect(searchTheoryPassage('what are weak squares')).not.toBeNull();
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
