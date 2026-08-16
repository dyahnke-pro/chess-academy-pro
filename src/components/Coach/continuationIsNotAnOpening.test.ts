/**
 * "MORE" IS NOT AN OPENING.
 *
 * From David's device log, 2026-08-16, three consecutive turns:
 *
 *   21:04:10  "Teach me traps in the bishops opening" → walkthrough starts,
 *             Bishop's Opening
 *   21:08:53  "Teach me more traps"
 *               · followupDetector: expecting context: Bishop's Opening
 *               · 73ms later, fuzzyPickerScores: "more" → Sicilian Defense:
 *                 Modern Variations (0.75) | Semi-Slav Accelerated Move Order
 *                 (0.75) | Torre Attack …
 *               · picker shown: "I don't have an exact match for 'more'"
 *
 * The stage keyword ("traps") is stripped and whatever remains is treated as
 * the opening name. "more" remains, so the fuzzy matcher scored a continuation
 * word against the entire openings DB. The follow-up detector had ALREADY
 * worked out the right context and logged it — it is audit instrumentation and
 * nothing reads it.
 *
 * The deictic guard beside this one already handles the identical shape ("quiz
 * me on this position" → "this position"); continuation words simply were not
 * in it. This pins the vocabulary so the next word added to one list is
 * checked against the other.
 */
import { describe, it, expect } from 'vitest';

/** Mirror of the guard in CoachTeachPage's requestedName resolution. */
const namesNoOpening = (remainder: string): boolean =>
  /^(?:(?:this|that|the|current|my)\s+)?(?:position|board|game|line|here|it)$/i.test(remainder)
  || /^(?:some\s+|any\s+|a\s+few\s+)?(?:more|another|other|others|again|next|else|extra)(?:\s+(?:one|ones))?$/i.test(remainder);

describe('a continuation word is not an opening name', () => {
  it('catches "more" — the exact remainder that offered the Sicilian mid-Bishop\'s-Opening', () => {
    expect(namesNoOpening('more')).toBe(true);
  });

  it('catches the rest of the ways a student asks for the next one', () => {
    for (const r of ['another', 'others', 'again', 'next', 'some more', 'a few more', 'another one', 'any other'])
      expect(namesNoOpening(r), r).toBe(true);
  });

  it('still catches the deictic remainders it already handled', () => {
    for (const r of ['this position', 'the board', 'my game', 'here', 'it'])
      expect(namesNoOpening(r), r).toBe(true);
  });

  it('does NOT swallow a real opening name', () => {
    // The risk of widening: an opening whose name merely starts with one of
    // these words must still resolve normally.
    for (const r of [
      'Vienna', "Bishop's Opening", 'Sicilian Defense', 'Modern Defense',
      'Nextor Attack',            // fictional, but proves the anchor is not a prefix match
      'Extra Sharp Gambit',
      'another gambit',           // two real words — an opening search, not "another"
    ]) expect(namesNoOpening(r), r).toBe(false);
  });
});
