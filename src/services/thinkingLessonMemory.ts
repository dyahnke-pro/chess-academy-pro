// thinkingLessonMemory — what a "Learn how to think" student has already been
// shown, so every visit is different (David 2026-10-04: "each encounter … needs
// to be different and remember what was done").
//
// Small facts, kept in the existing `meta` key-value store (no schema
// migration): the boards already used per step (never served again), where the
// last lesson was, and — when a lesson was stopped part-way — the board index
// it stopped at, so the next start of the same step resumes there (plan D8).
// Progress and weaknesses themselves are NOT kept here — they live in the one
// evidence record and the weakness spine; this only remembers which boards
// were used and where the student left off.
import { db } from '../db/schema';
import { boardIdentity } from './thinkingPositions';
import type { LessonStage } from './thinkingLesson';

const META_KEY = 'thinking-lesson-memory.v1';

/** A lesson stopped part-way: its stage plan and the board it was on. */
export interface LessonResume {
  step: string;
  stages: LessonStage[];
  /** 0-based index into `stages` of the board the lesson stopped on. */
  cursor: number;
  at: string;
}

export interface ThinkingLessonMemory {
  /** step id → board identities already used for it. */
  seen: Record<string, string[]>;
  /** The step the last lesson was on, and when. */
  last: { step: string; at: string } | null;
  /** Where an unfinished lesson stopped; null once a lesson runs to its end. */
  resume: LessonResume | null;
}

function empty(): ThinkingLessonMemory {
  return { seen: {}, last: null, resume: null };
}

const STAGES: readonly LessonStage[] = ['show', 'guide', 'solo'];

function validResume(r: unknown): LessonResume | null {
  if (!r || typeof r !== 'object') return null;
  const o = r as Partial<LessonResume>;
  if (typeof o.step !== 'string' || typeof o.cursor !== 'number' || !Array.isArray(o.stages)) return null;
  if (!o.stages.every((s) => STAGES.includes(s))) return null;
  return { step: o.step, stages: o.stages, cursor: o.cursor, at: typeof o.at === 'string' ? o.at : '' };
}

export async function getThinkingLessonMemory(): Promise<ThinkingLessonMemory> {
  try {
    const rec = await db.meta.get(META_KEY);
    if (!rec?.value) return empty();
    const parsed = JSON.parse(rec.value) as Partial<ThinkingLessonMemory>;
    return {
      seen: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {},
      last: parsed.last ?? null,
      resume: validResume(parsed.resume),
    };
  } catch {
    return empty();
  }
}

export function seenFor(mem: ThinkingLessonMemory, step: string): Set<string> {
  return new Set(mem.seen[step] ?? []);
}

/** Where to resume this step: the stopped lesson's plan and board index, or
 *  null when the last unfinished lesson was another step, or none is open. */
export function resumeFor(mem: ThinkingLessonMemory, step: string): LessonResume | null {
  const r = mem.resume;
  if (!r || r.step !== step) return null;
  if (r.cursor < 0 || r.cursor >= r.stages.length) return null;
  return r;
}

// Writes are read-modify-write on one record; a lesson fires them back to back
// (a board remembered, then its progress), so they are serialised here or the
// second would overwrite the first with a stale copy.
let queue: Promise<unknown> = Promise.resolve();
function mutate(fn: (mem: ThinkingLessonMemory) => void): Promise<void> {
  const run = queue.then(async () => {
    const mem = await getThinkingLessonMemory();
    fn(mem);
    await db.meta.put({ key: META_KEY, value: JSON.stringify(mem) });
  });
  queue = run.catch(() => undefined);
  return run;
}

/** Remember that `fen` was used for `step`, and that the lesson is on `step`. */
export function rememberLessonBoard(step: string, fen: string, at: string): Promise<void> {
  return mutate((mem) => {
    const id = boardIdentity(fen);
    const list = mem.seen[step] ?? [];
    if (!list.includes(id)) list.push(id);
    mem.seen[step] = list;
    mem.last = { step, at };
  });
}

/** Record where a running lesson is (null: it ran to its end — nothing to
 *  resume). A stopped lesson leaves its last position here. */
export function saveLessonResume(progress: Omit<LessonResume, 'at'> | null, at: string): Promise<void> {
  return mutate((mem) => {
    mem.resume = progress ? { ...progress, stages: [...progress.stages], at } : null;
  });
}
