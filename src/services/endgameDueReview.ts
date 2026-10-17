/**
 * ENDGAME SPACED REVIEW, WIRED (David 2026-10-17: "The spaced reps for end
 * game. I want it wired in"). The ladder in `endgameProgressService` decides
 * which played positions are due; this names them for the student — the
 * lesson, its tab, how many positions — so the endgame page's "Due for
 * review" row, each lesson card and the Up next ring read ONE list.
 */
import { getDueEndgameLessons } from './endgameProgressService';
import { getEndgamePrinciples, getPawnEndings, getRookEndings, getDrawingPatterns } from './endgameLessonsService';
import type { EndgameLesson } from '../types/endgameLesson';

/** The endgame tabs that hold lessons a student plays through. */
export type EndgameLessonTabId = 'principles' | 'pawn-endings' | 'rook-endings' | 'drawing-patterns';

/** Each tab's lessons. A Record, so a new lesson tab fails to compile until
 *  its lessons can come due. */
const CATALOG: Record<EndgameLessonTabId, () => EndgameLesson[]> = {
  principles: getEndgamePrinciples,
  'pawn-endings': getPawnEndings,
  'rook-endings': getRookEndings,
  'drawing-patterns': getDrawingPatterns,
};

export interface DueEndgameReview {
  lessonId: string;
  name: string;
  tab: EndgameLessonTabId;
  /** Played positions of this lesson due again now. */
  dueCount: number;
}

/** Which tab a lesson lives on, or null for an id no catalog knows. */
export function tabForLesson(lessonId: string): { tab: EndgameLessonTabId; name: string } | null {
  for (const tab of Object.keys(CATALOG) as EndgameLessonTabId[]) {
    const lesson = CATALOG[tab]().find((l) => l.id === lessonId);
    if (lesson) return { tab, name: lesson.name };
  }
  return null;
}

/** Every lesson with positions due, most due first. */
export async function dueEndgameReviews(): Promise<DueEndgameReview[]> {
  const due = await getDueEndgameLessons();
  const out: DueEndgameReview[] = [];
  for (const d of due) {
    const where = tabForLesson(d.lessonId);
    if (where) out.push({ lessonId: d.lessonId, name: where.name, tab: where.tab, dueCount: d.dueCount });
  }
  return out.sort((a, b) => b.dueCount - a.dueCount || a.name.localeCompare(b.name));
}

/** The page that opens a due lesson directly. */
export function endgameReviewPath(r: Pick<DueEndgameReview, 'lessonId' | 'tab'>): string {
  return `/coach/endgame?tab=${r.tab}&lesson=${encodeURIComponent(r.lessonId)}`;
}
