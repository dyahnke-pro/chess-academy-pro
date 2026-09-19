/**
 * strengthCalibrationService
 * --------------------------
 * Establishes a player's BASELINE strength once, and writes it to BOTH
 * rating fields so every difficulty surface starts in the right place:
 *   - `currentRating` drives the Stockfish opponent (coachPlaySession).
 *   - `puzzleRating`  drives puzzle / tactics band selection.
 *
 * These two used to diverge silently — onboarding and Settings only ever
 * wrote `currentRating`, while the puzzle pool read `puzzleRating`, so a
 * beginner who declared "I'm 600" still got 1200-1600 puzzles forever.
 *
 * Strength source order (David 2026-05-26: "difficulty based off imported
 * games, if non-imported then the skill picker"):
 *   1. Imported Lichess / Chess.com games → real rating, applied silently.
 *   2. Otherwise → the first-run skill picker supplies the band.
 *
 * After this one-time baseline the two ratings drift independently via
 * results (puzzle Elo from solving, game Elo from play / continued
 * imports) — that is correct; they are different skills.
 */
import { db } from '../db/schema';
import { DEFAULT_RATING, getPlayerRatingEstimate, type RatingSource } from './playerRatingService';
import type { UserProfile } from '../types';

/** Sane Elo bounds for a stored baseline. Lichess puzzles bottom out
 *  near 400 and the engine floor is 400; nobody needs > 2800. */
const MIN_RATING = 400;
const MAX_RATING = 2800;

/**
 * Beginner-friendly skill bands for the first-run picker. Beginners do
 * not know their Elo, so we ask in plain language and map to a starting
 * rating. Keep these ordered weakest → strongest for rendering.
 */
export interface SkillBand {
  id: 'newcomer' | 'beginner' | 'intermediate' | 'advanced';
  label: string;
  blurb: string;
  rating: number;
}

export const SKILL_BANDS: readonly SkillBand[] = [
  {
    id: 'newcomer',
    label: 'New to chess',
    blurb: 'Still learning how the pieces move',
    rating: 600,
  },
  {
    id: 'beginner',
    label: 'Beginner',
    blurb: 'I know the rules and play casually',
    rating: 900,
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    blurb: 'I know openings and basic tactics',
    rating: 1300,
  },
  {
    id: 'advanced',
    label: 'Advanced',
    blurb: 'I play rated games and study seriously',
    rating: 1800,
  },
] as const;

export function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) return SKILL_BANDS[1].rating;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, Math.round(rating)));
}

/**
 * Seed BOTH rating fields from a single baseline and mark the profile
 * calibrated. Persists to Dexie and returns the updated profile so the
 * caller can rehydrate the store. This is the only place baseline
 * strength should be written — both the import path and the skill
 * picker route through here.
 */
export async function applyStrength(
  profile: UserProfile,
  rating: number,
  opts: { baseline?: number } = {},
): Promise<UserProfile> {
  const clamped = clampRating(rating);
  // FIRST calibration seeds BOTH ratings — that is this function's original
  // job (a beginner who declared 600 must not keep getting 1200 puzzles).
  // A later REFRESH must not: the puzzle SRS owns `puzzleRating` and moves it
  // on solving, so re-seeding it from play results every boot threw away the
  // student's puzzle progress. Derived from the profile, never a parameter, so
  // no caller can get it wrong.
  const firstCalibration = !profile.strengthCalibrated;
  const patch: Partial<UserProfile> = {
    currentRating: clamped,
    ...(firstCalibration ? { puzzleRating: clamped } : {}),
    // WRITTEN ONCE. This is the anchor the adaptive estimate is computed FROM,
    // so rewriting it from that estimate is the drift bug itself. Absent means
    // "never anchored"; after this it never changes again.
    ...(profile.ratingBaseline == null
      ? { ratingBaseline: clampRating(opts.baseline ?? rating) }
      : {}),
    // 🔒 BRIDGED, NOT REMOVED. This flag is PERSISTED in Dexie on live devices
    // and `DashboardPage` reads it, so it is still written — but it no longer
    // GATES re-estimation. Gating on it froze the rating at first boot: once
    // true, `calibrateStrength` returned early forever, so the running K=32 ELO
    // over the student's coach games was computed and never consumed. It now
    // means "has ever been calibrated", which is what its name says.
    strengthCalibrated: true,
  };
  await db.profiles.update(profile.id, patch);
  return { ...profile, ...patch };
}

/**
 * 🔴 `needsPicker` IS GONE (2026-09-18). It is deleted rather than left as a
 * false field, per the correction rule: the picker it waited for was removed on
 * 2026-09-02, and `App.tsx` guarded on `!result.needsPicker`, so the branch did
 * NOTHING. A student with no imported games therefore re-estimated on every
 * boot and threw the answer away.
 */
export type CalibrationResult =
  | { calibrated: true; rating: number; source: RatingSource }
  | { calibrated: false; rating: number; source: 'no-signal' };

/**
 * Run at boot. If the profile is already calibrated, no-op. Otherwise try
 * the imported-games signal; if present, seed silently. If there is no
 * import signal, ask the caller to show the skill picker.
 *
 * Returns the (possibly updated) profile alongside the result so App can
 * rehydrate the store without a second read.
 */
export async function calibrateStrength(
  profile: UserProfile,
): Promise<{ result: CalibrationResult; profile: UserProfile }> {
  const estimate = await getPlayerRatingEstimate();

  // MEASURED, NOT GUESSED — that is the whole distinction, and it is why the
  // 2026-09-02 rule ("with no import we write NOTHING … rather than a guessed
  // band") was right about a GUESS and wrong about a MEASUREMENT.
  // `getPlayerRatingEstimate` ranks its own sources, so by the time one of
  // these two arrives it is the best evidence that exists: imported games, or a
  // running K=32 ELO over the student's real coach games. The `profile` and
  // `default` sources are NOT evidence — they are the number we already hold
  // and the number we made up — so they still write nothing.
  if ((estimate.source === 'imported-games' || estimate.source === 'coach-games') && estimate.rating > 0) {
    // THE ANCHOR, decided here because only this function knows which source
    // produced the reading. An imported rating is external evidence of their
    // level, so it anchors itself. A coach-games reading was already computed
    // FROM `DEFAULT_RATING` (the estimate falls back to it when no baseline is
    // stored), so storing anything else would make boot 2 disagree with boot 1
    // — the drift, reintroduced through the back door.
    const baseline = estimate.source === 'imported-games' ? estimate.rating : DEFAULT_RATING;

    // Idempotent: the common boot is "nothing moved", and a Dexie write per
    // boot for an unchanged value is pure cost. An unanchored profile still
    // writes, even when the number matches, or the anchor never lands and
    // every later boot re-derives it from a moving `currentRating`.
    if (clampRating(estimate.rating) === profile.currentRating && profile.ratingBaseline != null) {
      return { result: { calibrated: true, rating: profile.currentRating, source: estimate.source }, profile };
    }
    const updated = await applyStrength(profile, estimate.rating, { baseline });
    return {
      result: { calibrated: true, rating: updated.currentRating, source: estimate.source },
      profile: updated,
    };
  }

  return { result: { calibrated: false, rating: profile.currentRating, source: 'no-signal' }, profile };
}
