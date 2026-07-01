/**
 * ratingKey — keep rating values valid as IndexedDB range keys.
 *
 * The disease this guards against (caught in prod 2026-07-01, real beta
 * testers): a NaN rating gets durably written into the profile (JS `??`
 * does NOT catch NaN — `NaN ?? 1200` is NaN — and `puzzleRating` isn't an
 * indexed field, so the bad write silently succeeds). On the next boot every
 * rating range read does `.between(NaN - bw, NaN + bw)` → Dexie builds
 * `IDBKeyRange.bound(NaN, NaN)` → throws "The parameter is not a valid key",
 * and the app can't load puzzles until the profile is reset.
 *
 * `safeRatingKey` collapses any non-finite input to a sane fallback so a
 * range query can never be built from a bad key. Use it BOTH at the DB read
 * boundary (rescues already-poisoned profiles in the wild) and when computing
 * a new rating to persist (so the profile self-heals to a finite value).
 */
export function safeRatingKey(rating: number | null | undefined, fallback = 1200): number {
  return typeof rating === 'number' && Number.isFinite(rating) ? rating : fallback;
}
