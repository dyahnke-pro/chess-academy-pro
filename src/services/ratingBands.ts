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
