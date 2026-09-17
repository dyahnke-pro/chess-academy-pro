// ratingBands — THE single rating→tier taxonomy (P7 unification, David 2026-09-08:
// "change any other 'adaptive function' to the new algo ... roll in the orphans").
//
// The coarse teaching taxonomy — beginner / intermediate / advanced at the
// <1000 / 1000–2000 / >2000 boundaries — was hand-copied in three places that all
// agreed by luck (criticalityThresholds, slipDetector.slipWarrantsInterjection,
// hintRegister.openingRegister), each admitting in comments it was mirroring
// another "so there is one taxonomy, not two that drift apart." This makes it
// literally one taxonomy. Each consumer maps the tier to its OWN output (a cp
// threshold, a hint register, an interjection bar) — we unify the BANDING, not
// the outputs.
//
// Unknown rating defaults to 1200 (intermediate), matching the prior behavior of
// every consumer.

export type RatingTier = 'beginner' | 'intermediate' | 'advanced';

/** The coarse teaching tier for a rating. Boundaries: beginner < 1000,
 *  intermediate 1000–2000 (inclusive), advanced > 2000. */
export function coreRatingTier(rating: number | undefined | null): RatingTier {
  const r = rating ?? 1200;
  if (r < 1000) return 'beginner';
  if (r <= 2000) return 'intermediate';
  return 'advanced';
}

// ── The Lichess explorer band ────────────────────────────────────────────────
// Three call sites picked this band three different ways, over TWO different
// bucket lists, all three claiming the same intent ("the amateur band around a
// student rating, as the explorer expects" — the identical comment sat over two
// of them). Measured disagreements before this: 1300 → `1200,1400` vs
// `1400,1600`; 1900 → `1800,2000` vs `1600,1800`; 2400 → a LONE `2200`, because
// amateurPlayCache's list stopped at 2200 and had no bucket to pair with.
//
// A band is not a matter of taste — it decides which humans' games we quote back
// as "what people at your level play". Two students at the same rating were
// being told about two different populations depending on which surface asked.

/** Lichess explorer rating buckets. A bucket labelled 1600 holds games by
 *  players rated 1600–1799, so the label is the FLOOR of the band. 2500 is the
 *  explorer's top bucket. */
const EXPLORER_BUCKETS = [1000, 1200, 1400, 1600, 1800, 2000, 2200, 2500] as const;

export interface ExplorerBand {
  /** The `ratings=` value the explorer API takes, e.g. `"1400,1600"`. */
  band: string;
  /** Spoken form, e.g. `"around 1400–1600"`. */
  bandLabel: string;
}

/**
 * The two buckets bracketing `rating` — the pool a player at this level
 * actually comes from. Pairs DOWNWARD at the top so the strongest band still
 * has two buckets rather than a lone one. Unknown/non-finite rating falls to
 * the same 1200 cold-start prior `coreRatingTier` uses.
 */
export function explorerBandFor(rating: number | null | undefined): ExplorerBand {
  const r = typeof rating === 'number' && Number.isFinite(rating) ? rating : 1200;
  let i = 0;
  for (let k = 0; k < EXPLORER_BUCKETS.length; k++) {
    if (EXPLORER_BUCKETS[k] <= r) i = k;
  }
  const pair = i + 1 < EXPLORER_BUCKETS.length
    ? [EXPLORER_BUCKETS[i], EXPLORER_BUCKETS[i + 1]]
    : [EXPLORER_BUCKETS[i - 1], EXPLORER_BUCKETS[i]];
  return { band: pair.join(','), bandLabel: `around ${pair[0]}–${pair[1]}` };
}
