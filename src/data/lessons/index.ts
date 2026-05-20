import type { LessonScript } from '../../types';
import { RUY_LOPEZ_LESSON } from './ruyLopez';
import { RUY_VARIATION_LESSONS } from './ruyVariations';

/**
 * Registry of story-first master-class lessons.
 *
 * - LESSONS: keyed by openingId — the main-line master class, launched
 *   from an opening's "Watch" entry.
 * - VARIATION_LESSONS: keyed by `${openingId}::${variationName}` — a
 *   subline's own master class. NOTE: the Ruy subline scripts below are
 *   authored but not yet wired into a launch path (and pending a line-by
 *   -line chess verification pass), so they are inert until then.
 *
 * When a script exists, the openings surface plays the LessonPlayer
 * instead of the move-by-move WalkthroughMode.
 */
const LESSONS: Record<string, LessonScript> = {
  [RUY_LOPEZ_LESSON.openingId]: RUY_LOPEZ_LESSON,
};

const VARIATION_LESSONS: Record<string, LessonScript> = {
  ...RUY_VARIATION_LESSONS,
};

export function getLessonScript(openingId: string | undefined | null): LessonScript | null {
  if (!openingId) return null;
  return LESSONS[openingId] ?? null;
}

export function hasLessonScript(openingId: string | undefined | null): boolean {
  return getLessonScript(openingId) !== null;
}

export function getVariationLessonScript(
  openingId: string | undefined | null,
  variationName: string | undefined | null,
): LessonScript | null {
  if (!openingId || !variationName) return null;
  return VARIATION_LESSONS[`${openingId}::${variationName}`] ?? null;
}
