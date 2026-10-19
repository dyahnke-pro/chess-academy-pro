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
import { emitEndgameReview } from './endgameReviewEvents';
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

// Spaced-review ladder for endgame positions (David 2026-05-25; made to
// follow the student's results 2026-10-17, "make sure the algo is attached").
// A clean play (no wrong move) climbs a rung; a play with mistakes falls back
// to the bottom, so what you got wrong comes back tomorrow and what you know
// spaces out. A position never "graduates out"; it resurfaces less often.
export const ENDGAME_REVIEW_INTERVALS_MS: readonly number[] = [
  1 * 24 * 60 * 60 * 1000, //  rung 0 → 1 day
  3 * 24 * 60 * 60 * 1000, //  rung 1 → 3 days
  7 * 24 * 60 * 60 * 1000, //  rung 2 → 1 week
  16 * 24 * 60 * 60 * 1000, // rung 3 → ~2 weeks
  35 * 24 * 60 * 60 * 1000, // rung 4 → ~5 weeks (cap)
];
const TOP_RUNG = ENDGAME_REVIEW_INTERVALS_MS.length - 1;

/** The rung a record stands on (older records: the play-count ladder). */
export function reviewStepOf(rec: Pick<EndgameProgressRecord, 'reviewStep' | 'timesPlayed'>): number {
  const step = rec.reviewStep ?? rec.timesPlayed - 1;
  return Math.min(Math.max(step, 0), TOP_RUNG);
}

/** The rung after a play: up one when clean, back to the bottom otherwise. */
export function nextReviewStep(stepBefore: number, clean: boolean): number {
  return clean ? Math.min(stepBefore + 1, TOP_RUNG) : 0;
}

/** Is this played position due to resurface for review now? */
function isEndgameRecordDue(rec: EndgameProgressRecord, now: number): boolean {
  return now - rec.lastPlayedAt >= ENDGAME_REVIEW_INTERVALS_MS[reviewStepOf(rec)];
}

/** Endgame LESSONS with at least one position due for spaced review now,
 *  paired with the due-position count. Feeds the unified "due today"
 *  scheduler so endgame review enters the daily path like opening SRS. */
export async function getDueEndgameLessons(): Promise<{ lessonId: string; dueCount: number; missed: boolean; overdueDays: number }[]> {
  const now = Date.now();
  const all = await db.endgameProgress.toArray();
  const byLesson = new Map<string, { dueCount: number; missed: boolean; overdueDays: number }>();
  for (const rec of all) {
    if (!isEndgameRecordDue(rec, now)) continue;
    const step = reviewStepOf(rec);
    const over = (now - rec.lastPlayedAt - ENDGAME_REVIEW_INTERVALS_MS[step]) / (24 * 60 * 60 * 1000);
    const cur = byLesson.get(rec.lessonId) ?? { dueCount: 0, missed: false, overdueDays: 0 };
    byLesson.set(rec.lessonId, {
      dueCount: cur.dueCount + 1,
      // Back on the bottom rung after more than one play: it fell there on a
      // mistake (a clean play always climbs).
      missed: cur.missed || (step === 0 && rec.timesPlayed > 1),
      overdueDays: Math.max(cur.overdueDays, Math.max(0, over)),
    });
  }
  return Array.from(byLesson.entries()).map(([lessonId, v]) => ({ lessonId, ...v }));
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
  // THE LADDER FOLLOWS THE RESULT: clean climbs, mistakes fall to the bottom.
  // A first play starts on the bottom rung either way.
  const clean = args.wrongAttempts === 0 && args.firstTryPerfect;
  const stepBefore = existing ? reviewStepOf(existing) : 0;
  const stepAfter = existing ? nextReviewStep(stepBefore, clean) : 0;
  const record: EndgameProgressRecord = existing
    ? {
        id,
        lessonId: args.lessonId,
        fen: args.fen,
        mastered: existing.mastered || args.firstTryPerfect,
        timesPlayed: existing.timesPlayed + 1,
        totalWrongAttempts: existing.totalWrongAttempts + args.wrongAttempts,
        lastPlayedAt: now,
        reviewStep: stepAfter,
      }
    : {
        id,
        lessonId: args.lessonId,
        fen: args.fen,
        mastered: args.firstTryPerfect,
        timesPlayed: 1,
        totalWrongAttempts: args.wrongAttempts,
        lastPlayedAt: now,
        reviewStep: 0,
      };
  await db.endgameProgress.put(record);
  emitEndgameReview({
    event: 'scheduled', lessonId: args.lessonId, clean, stepBefore, stepAfter,
    intervalDays: Math.round(ENDGAME_REVIEW_INTERVALS_MS[stepAfter] / (24 * 60 * 60 * 1000)),
    lessons: null, positions: null,
  });
  return record;
}

/** Reset the lesson's progress — wipes every record under this
 *  lessonId. Surfaced behind a confirm prompt in the UI so a
 *  fat-finger tap doesn't lose mastery. */
export async function resetLessonProgress(lessonId: string): Promise<void> {
  await db.endgameProgress.where('lessonId').equals(lessonId).delete();
}

/** Where a re-opened lesson starts, from the student's endgame record: after
 *  the last keystone with a record, or on it while it is not mastered; 0 when
 *  nothing was played or everything after it is done. */
export function resumeKeystoneIndex(fens: readonly string[], mastered: Readonly<Record<string, boolean>>): number {
  let last = -1;
  fens.forEach((f, i) => { if (Object.hasOwn(mastered, f)) last = i; });
  if (last < 0) return 0;
  const at = mastered[fens[last]] ? last + 1 : last;
  return at >= fens.length ? 0 : at;
}
