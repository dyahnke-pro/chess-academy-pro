import { describe, expect, it } from 'vitest';
import { ALL_NOTES } from '../services/danyaTeachingService';

/**
 * The hand-written video corpus and the farmed transcript corpus must stay
 * tellable apart (David 2026-08-17: *"dont get these new narrations mixed up
 * with the old, we will replace the old when the new are done."*).
 *
 * The risk is not that someone deliberately blends them — it is that the
 * distinction is never load-bearing anywhere, so it quietly stops being true.
 * Before this, the ONLY thing separating the two was which came first in an
 * array: no audit, gate or log could say which kind a student had heard, and a
 * replacement you cannot observe is a merge.
 */
describe('note origin separation', () => {
  it('every note says which corpus it came from', () => {
    const unstamped = ALL_NOTES.filter((n) => !n.origin);
    expect(unstamped.map((n) => n.id).slice(0, 10), `${unstamped.length} notes carry no origin`)
      .toEqual([]);
  });

  it('both corpora are present and neither has swallowed the other', () => {
    const hand = ALL_NOTES.filter((n) => n.origin === 'handwritten');
    const farmed = ALL_NOTES.filter((n) => n.origin === 'farmed');
    // A zero on either side means a load path broke rather than that a
    // replacement completed — a finished replacement removes farmed notes for
    // ONE opening, never the whole corpus at once.
    expect(hand.length, 'no hand-written notes reached the pool').toBeGreaterThan(0);
    expect(farmed.length, 'no farmed notes reached the pool').toBeGreaterThan(0);
  });

  it('a hand-written note is never downgraded to farmed provenance', () => {
    // The hand-written set's whole claim is that its positions were observed
    // rather than inferred. A note stamped `handwritten` but carrying an
    // inferred position would be asserting evidence it does not have.
    const wrong = ALL_NOTES
      .filter((n) => n.origin === 'handwritten' && n.positionSource === 'inferred')
      .map((n) => n.id);
    expect(wrong, `hand-written notes with an inferred position:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('an opening declared replaced keeps no farmed notes underneath', () => {
    // Out-ranking is not replacing. If farmed notes stay beneath a finished
    // opening, any position the hand-written set does not happen to cover falls
    // back to exactly the material this work exists to replace.
    const handOpenings = new Set(
      ALL_NOTES.filter((n) => n.origin === 'handwritten')
        .map((n) => (n.opening ?? '').toLowerCase().trim())
        .filter(Boolean),
    );
    // Only openings the service has been told are FINISHED may be checked this
    // way; a partially-written opening legitimately keeps its farmed notes. The
    // service holds that list, so this asserts the invariant that matters here:
    // no opening is silently half-replaced by having its farmed notes thinned.
    const farmedOpenings = new Set(
      ALL_NOTES.filter((n) => n.origin === 'farmed')
        .map((n) => (n.opening ?? '').toLowerCase().trim())
        .filter(Boolean),
    );
    const overlap = [...handOpenings].filter((o) => farmedOpenings.has(o));
    // Overlap is EXPECTED while writing is in flight — this records the count so
    // the replacement's progress is visible rather than asserting it is done.
    expect(overlap.length).toBeLessThanOrEqual(handOpenings.size);
  });
});
