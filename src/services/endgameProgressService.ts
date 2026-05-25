/**
 * endgameProgressService
 * ----------------------
 * Persistence layer for per-position endgame lesson progress.
 * Tracks whether the student has played each keystone/drill
 * position perfectly on their first try (mastery) plus cumulative
 * play counts. Composite key `<lessonId>::<fen>` scopes records to
 * a specific position-in-lesson, so the same FEN appearing in two
 * lessons gets two independent records.
 *
 * `mastered` is sticky — once true, never goes false. The student
 * earned the mastery; we don't take it away on a later retry slip.
 *
 * Storage is Dexie (IndexedDB). Per CLAUDE.md, persistent state
 * lives in Dexie and runtime state in Zustand — this service
 * surfaces the Dexie reads/writes; React components hold the
 * derived in-memory snapshot only as long as they're mounted.
 */
import { db } from '../db/schema';
import type { EndgameProgressRecord } from '../types';

/** Compose the deterministic id from lesson + FEN. */
export function progressIdFor(lessonId: string, fen: string): string {
  return `${lessonId}::${fen}`;
}

/** Read the progress record for one position. Returns null when no
 *  record exists (i.e. the student has never completed this
 *  position before). */
export async function getProgress(
  lessonId: string,
  fen: string,
): Promise<EndgameProgressRecord | null> {
  const id = progressIdFor(lessonId, fen);
  const record = await db.endgameProgress.get(id);
  return record ?? null;
}

/** Read all progress records for a lesson. Used by the picker to
 *  show "X of Y mastered" badges and the lesson view to surface
 *  per-position checkmarks. Returns an empty array when no
 *  positions in the lesson have been played. */
export async function getLessonProgress(lessonId: string): Promise<EndgameProgressRecord[]> {
  return db.endgameProgress.where('lessonId').equals(lessonId).toArray();
}

/** Count mastered positions across all lessons. Cheap aggregate
 *  for the endgame hub badge. Filters in-memory rather than via an
 *  IndexedDB index because IndexedDB doesn't natively index
 *  booleans (see https://dexie.org/docs/Indexable-Type). The
 *  table is tiny (≤ a few hundred rows even with full mastery)
 *  so the scan is cheap. */
export async function getMasteredCount(): Promise<number> {
  const all = await db.endgameProgress.toArray();
  return all.filter((r) => r.mastered).length;
}

// Spaced-review ladder for endgame positions (David 2026-05-25): a position
// you've played resurfaces for review on a widening interval keyed off how
// many times you've completed it. Derived from the existing `timesPlayed` +
// `lastPlayedAt` fields — no schema change. A position never "graduates out";
// it just resurfaces less often, like the misconception loop.
const ENDGAME_REVIEW_INTERVALS_MS: readonly number[] = [
  1 * 24 * 60 * 60 * 1000, //  played 1× → 1 day
  3 * 24 * 60 * 60 * 1000, //  2× → 3 days
  7 * 24 * 60 * 60 * 1000, //  3× → 1 week
  16 * 24 * 60 * 60 * 1000, // 4× → ~2 weeks
  35 * 24 * 60 * 60 * 1000, // 5×+ → ~5 weeks (cap)
];

function endgameReviewIntervalMs(timesPlayed: number): number {
  const i = Math.min(Math.max(timesPlayed - 1, 0), ENDGAME_REVIEW_INTERVALS_MS.length - 1);
  return ENDGAME_REVIEW_INTERVALS_MS[i];
}

/** Is this played position due to resurface for review now? */
function isEndgameRecordDue(rec: EndgameProgressRecord, now: number): boolean {
  return now - rec.lastPlayedAt >= endgameReviewIntervalMs(rec.timesPlayed);
}

/** Endgame LESSONS with at least one position due for spaced review now,
 *  paired with the due-position count. Feeds the unified "due today"
 *  scheduler so endgame review enters the daily path like opening SRS. */
export async function getDueEndgameLessons(): Promise<{ lessonId: string; dueCount: number }[]> {
  const now = Date.now();
  const all = await db.endgameProgress.toArray();
  const byLesson = new Map<string, number>();
  for (const rec of all) {
    if (!isEndgameRecordDue(rec, now)) continue;
    byLesson.set(rec.lessonId, (byLesson.get(rec.lessonId) ?? 0) + 1);
  }
  return Array.from(byLesson.entries()).map(([lessonId, dueCount]) => ({ lessonId, dueCount }));
}

/** Count of distinct endgame lessons with positions due for review now. */
export async function getDueEndgameCount(): Promise<number> {
  return (await getDueEndgameLessons()).length;
}

/** Record a completed playout. Updates the existing record (if any)
 *  with the new play count + wrong-attempt total, and SETS
 *  `mastered: true` if either the new play was first-try-perfect
 *  OR the existing record was already mastered.
 *
 *  Idempotent on `firstTryPerfect` — a perfect play after a
 *  previous mistake-laden play still upgrades the record to
 *  mastered. */
export async function recordPlay(args: {
  lessonId: string;
  fen: string;
  firstTryPerfect: boolean;
  wrongAttempts: number;
}): Promise<EndgameProgressRecord> {
  const id = progressIdFor(args.lessonId, args.fen);
  const existing = await db.endgameProgress.get(id);
  const now = Date.now();
  const record: EndgameProgressRecord = existing
    ? {
        id,
        lessonId: args.lessonId,
        fen: args.fen,
        mastered: existing.mastered || args.firstTryPerfect,
        timesPlayed: existing.timesPlayed + 1,
        totalWrongAttempts: existing.totalWrongAttempts + args.wrongAttempts,
        lastPlayedAt: now,
      }
    : {
        id,
        lessonId: args.lessonId,
        fen: args.fen,
        mastered: args.firstTryPerfect,
        timesPlayed: 1,
        totalWrongAttempts: args.wrongAttempts,
        lastPlayedAt: now,
      };
  await db.endgameProgress.put(record);
  return record;
}

/** Reset the lesson's progress — wipes every record under this
 *  lessonId. Surfaced behind a confirm prompt in the UI so a
 *  fat-finger tap doesn't lose mastery. */
export async function resetLessonProgress(lessonId: string): Promise<void> {
  await db.endgameProgress.where('lessonId').equals(lessonId).delete();
}
