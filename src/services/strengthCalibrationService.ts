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
import { getPlayerRatingEstimate } from './playerRatingService';
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
): Promise<UserProfile> {
  const clamped = clampRating(rating);
  const patch = {
    currentRating: clamped,
    puzzleRating: clamped,
    strengthCalibrated: true,
  };
  await db.profiles.update(profile.id, patch);
  return { ...profile, ...patch };
}

export type CalibrationResult =
  | { calibrated: true; needsPicker: false; rating: number; source: 'imported-games' }
  | { calibrated: true; needsPicker: false; rating: number; source: 'already' }
  | { calibrated: false; needsPicker: true };

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
  if (profile.strengthCalibrated) {
    return {
      result: { calibrated: true, needsPicker: false, rating: profile.currentRating, source: 'already' },
      profile,
    };
  }

  const estimate = await getPlayerRatingEstimate();
  if (estimate.source === 'imported-games' && estimate.rating > 0) {
    const updated = await applyStrength(profile, estimate.rating);
    return {
      result: { calibrated: true, needsPicker: false, rating: updated.currentRating, source: 'imported-games' },
      profile: updated,
    };
  }

  // No real signal — the first-run picker must supply the band.
  return { result: { calibrated: false, needsPicker: true }, profile };
}
