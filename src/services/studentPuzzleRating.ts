/**
 * studentPuzzleRating — the ONE reader for the two numbers every Tactics
 * surface shows, so no page can compute either its own way again.
 *
 * Hand walk 2026-10-04 (D11): one fresh device read SIX different "ratings"
 * across the Tactics tab — the adaptive page showed the reach-ladder TARGET
 * ("Level 11 · 1700") as if it were the student's level, the drill called the
 * same ladder "Target", Classic and Opening Traps showed `puzzleRating`, Master
 * showed `puzzleRating` while loading and then its elite ladder, and tapping
 * Medium ("~1500") served a 997 because the card's band was never consulted.
 *
 * The two numbers ARE different things, and that is what this module names:
 *
 *  - `studentPuzzleRating` — THE STUDENT'S puzzle rating. `profile.puzzleRating`,
 *    moved by every solve, shown on Stats and spoken by the coach ("Your puzzle
 *    rating is …"). Every place that shows "your rating" reads it here.
 *  - `puzzleTarget` — the DIFFICULTY a surface serves around: the persisted
 *    reach ladder (reachRating.ts), seeded a stretch above the student on first
 *    use, plus the chosen difficulty's offset. It is a target, and every place
 *    that shows it labels it as one.
 *
 * Pure: no Dexie, no store — same leaf discipline as `ratingBands`.
 */
import { resolveReachState, FLOOR, CEILING, MASTER_FLOOR, MASTER_CEILING, type ReachState } from './reachRating';

/** A new profile's puzzle rating before any solve (dbService). The puzzle
 *  ladder keeps its own cold start — it is a different skill from playing
 *  strength (`DEFAULT_STUDENT_RATING`), and the puzzle SRS owns it. ONE literal:
 *  the profile default and every "no profile yet" read use this. */
export const DEFAULT_PUZZLE_RATING = 800;

/** The profile fields this module reads — a structural slice, so a test (or a
 *  caller holding a partial profile) never has to fabricate a whole one. */
export interface PuzzleRatingProfile {
  puzzleRating?: number | null;
  preferences?: {
    reachState?: ReachState;
    masterReachState?: ReachState;
  } | null;
}

/** The student's puzzle rating. A missing or poisoned value (NaN) reads as the
 *  cold start, never as `undefined` on screen. */
export function studentPuzzleRating(profile: PuzzleRatingProfile | null | undefined): number {
  const r = profile?.puzzleRating;
  return typeof r === 'number' && Number.isFinite(r) ? Math.round(r) : DEFAULT_PUZZLE_RATING;
}

/** How far each adaptive difficulty sits from the student's ladder target.
 *  Medium IS the ladder; Easy and Hard serve below / above it. A `Record` over
 *  the union, so a fourth difficulty fails to compile until it has an answer. */
export type PuzzleDifficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTY_OFFSET: Record<PuzzleDifficulty, number> = {
  easy: -200,
  medium: 0,
  hard: 200,
};

export interface PuzzleTargetOptions {
  /** Master Level rides its own elite ladder. */
  master?: boolean;
  /** Signed offset from the ladder (DIFFICULTY_OFFSET). */
  offset?: number;
}

const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Clamp a target into the ladder's bounds. */
export function clampTarget(target: number, master = false): number {
  return clamp(Math.round(target), master ? MASTER_FLOOR : FLOOR, master ? MASTER_CEILING : CEILING);
}

/** The ladder state a surface resumes — persisted, or seeded from the
 *  student's puzzle rating on first use. */
export function puzzleLadder(
  profile: PuzzleRatingProfile | null | undefined,
  opts: { master?: boolean } = {},
): ReachState {
  const persisted = opts.master ? profile?.preferences?.masterReachState : profile?.preferences?.reachState;
  return resolveReachState(persisted, studentPuzzleRating(profile), { master: opts.master });
}

/** The difficulty a surface will serve around for this student. */
export function puzzleTarget(
  profile: PuzzleRatingProfile | null | undefined,
  opts: PuzzleTargetOptions = {},
): number {
  return clampTarget(puzzleLadder(profile, opts).rating + (opts.offset ?? 0), opts.master);
}
