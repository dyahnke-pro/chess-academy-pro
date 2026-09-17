import { describe, it, expect } from 'vitest';
import {
  POSITIONAL_TO_REVIEW, REVIEW_TO_POSITIONAL, sameConcept, asPositionalConcept,
  type PositionalConceptId, type ReviewConceptId,
} from './conceptVocabulary';
import { positionalConcepts } from './conceptEngine';

// The concept axis carried TWO vocabularies that never reconciled — the live
// positional tags and the review per-ply beat keys — spelling SIX of the same
// ideas differently (docs/plans/2026-09-17-computer-unification.md §0.2).
describe('conceptVocabulary — the live and review concept vocabularies reconcile', () => {
  it('the six shared ideas join in BOTH directions', () => {
    const pairs: Array<[PositionalConceptId, ReviewConceptId]> = [
      ['knight-outpost', 'outpost'],
      ['passed-pawn', 'passed-pawn-push'],
      ['open-file', 'rook-open-file'],
      ['king-safety', 'king-safety-castle'],
      ['bishop-pair', 'two-bishops'],
      ['pawn-storm', 'open-lines-at-king'],
    ];
    for (const [live, review] of pairs) {
      expect(POSITIONAL_TO_REVIEW[live], `${live} → review`).toBe(review);
      expect(REVIEW_TO_POSITIONAL[review], `${review} → live`).toBe(live);
      expect(sameConcept(live, review)).toBe(true);
    }
  });

  it('the two directions never disagree', () => {
    // A round trip that lands somewhere else would be worse than no bridge:
    // it would join two ideas that are not the same claim.
    for (const [live, review] of Object.entries(POSITIONAL_TO_REVIEW)) {
      if (!review) continue;
      const back = REVIEW_TO_POSITIONAL[review];
      expect(back, `${live} → ${review} → ${back}`).toBe(live);
    }
  });

  it('a non-join is NOT a match', () => {
    expect(sameConcept('development', 'outpost')).toBe(false);
    expect(sameConcept('pawn-structure', 'create-weakness')).toBe(false);
  });

  it('the nulls are deliberate and shrink-only', () => {
    // `pawn-structure` vs `create-weakness`: HAVING a weak pawn is not the same
    // claim as a plan to CREATE one in their camp — joining them would file the
    // student's own weakness under an attacking idea.
    // `development` belongs to the FUNDAMENTALS axis, not this one.
    const liveNulls = Object.entries(POSITIONAL_TO_REVIEW).filter(([, v]) => v === null).map(([k]) => k).sort();
    expect(liveNulls).toEqual(['development', 'pawn-structure']);
    const reviewNulls = Object.entries(REVIEW_TO_POSITIONAL).filter(([, v]) => v === null).map(([k]) => k).sort();
    expect(reviewNulls).toEqual(['centralize-king', 'convert-dont-rush', 'create-weakness', 'simplify-when-ahead', 'space-advantage']);
  });

  it('every id the LIVE engine actually emits is in the union', () => {
    // Non-vacuous: the engine must really produce positional concepts, and each
    // must narrow. A Record<string,...> used to let a typo yield no concept at all.
    const seen = new Set<string>();
    for (const fen of [
      '8/5pk1/6p1/8/3P4/6P1/5PK1/8 w - - 0 40',              // passed d-pawn
      'r1bq1rk1/pp2bppp/2n1pn2/2pp4/3P1B2/2PBPN2/PP1N1PPP/R2Q1RK1 w - - 0 9', // quiet middlegame
      'r2q1rk1/pp1nbppp/2p1pn2/3p4/2PP4/2N1PN2/PPQ1BPPP/R3K2R w KQ - 0 10',
    ]) {
      for (const c of positionalConcepts(fen)) seen.add(c.id);
    }
    expect(seen.size, 'the engine emitted no positional concepts at all').toBeGreaterThan(0);
    for (const id of seen) {
      expect(asPositionalConcept(id), `engine emitted '${id}', which is not in PositionalConceptId`).not.toBeNull();
    }
  });
});
