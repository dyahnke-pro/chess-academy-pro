/**
 * ENDGAME SPACED REVIEW, WIRED (David 2026-10-17: "The spaced reps for end
 * game. I want it wired in"). The ladder in `endgameProgressService` decides
 * which played positions are due; this names them for the student — the
 * lesson, its tab, how many positions — so the endgame page's "Due for
 * review" row, each lesson card and the Up next ring read ONE list.
 */
import { getDueEndgameLessons, getMasteredCount } from './endgameProgressService';
import { getEndgamePrinciples, getPawnEndings, getRookEndings, getDrawingPatterns } from './endgameLessonsService';
import type { EndgameLesson } from '../types/endgameLesson';
import { emitEndgameReview } from './endgameReviewEvents';

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
  /** One of them fell back on a mistake — it is what you got wrong. */
  missed: boolean;
  /** How many days past its due date the most overdue one is. */
  overdueDays: number;
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
    if (where) out.push({ lessonId: d.lessonId, name: where.name, tab: where.tab, dueCount: d.dueCount, missed: d.missed, overdueDays: d.overdueDays });
  }
  // What you got wrong first, then the most positions, then the most overdue.
  out.sort((a, b) => Number(b.missed) - Number(a.missed) || b.dueCount - a.dueCount || b.overdueDays - a.overdueDays || a.name.localeCompare(b.name));
  emitEndgameReview({
    event: 'due', lessonId: null, clean: null, stepBefore: null, stepAfter: null, intervalDays: null,
    lessons: out.length, positions: out.reduce((n, d) => n + d.dueCount, 0),
  });
  return out;
}

/** THE ENDGAME PAGE'S ONE READ of the student's endgame record: how many
 *  positions are mastered, and what is due again. */
export async function endgameRecordSummary(): Promise<{ mastered: number; due: DueEndgameReview[] }> {
  const [mastered, due] = await Promise.all([getMasteredCount().catch(() => 0), dueEndgameReviews().catch(() => [])]);
  return { mastered, due };
}

/** The page that opens a due lesson directly. */
export function endgameReviewPath(r: Pick<DueEndgameReview, 'lessonId' | 'tab'>): string {
  return `/coach/endgame?tab=${r.tab}&lesson=${encodeURIComponent(r.lessonId)}`;
}
