import type { LessonScript } from '../../types';
import { RUY_LOPEZ_LESSON } from './ruyLopez';

/**
 * Registry of story-first master-class lessons, keyed by openingId.
 * When an opening has a script here, the walkthrough surface plays the
 * LessonPlayer instead of the move-by-move WalkthroughMode.
 */
const LESSONS: Record<string, LessonScript> = {
  [RUY_LOPEZ_LESSON.openingId]: RUY_LOPEZ_LESSON,
};

export function getLessonScript(openingId: string | undefined | null): LessonScript | null {
  if (!openingId) return null;
  return LESSONS[openingId] ?? null;
}

export function hasLessonScript(openingId: string | undefined | null): boolean {
  return getLessonScript(openingId) !== null;
}
