// thinkingLessonMemory — what a "Learn how to think" student has already been
// shown, so every visit is different (David 2026-10-04: "each encounter … needs
// to be different and remember what was done").
//
// Two small facts, kept in the existing `meta` key-value store (no schema
// migration): the boards already used per step (never served again) and where
// the last lesson stopped (the opener picks up from there). Progress and
// weaknesses themselves are NOT kept here — they live in the one evidence
// record and the weakness spine; this only remembers which boards were used.
import { db } from '../db/schema';
import { boardIdentity } from './thinkingPositions';

const META_KEY = 'thinking-lesson-memory.v1';

export interface ThinkingLessonMemory {
  /** step id → board identities already used for it. */
  seen: Record<string, string[]>;
  /** The step the last lesson was on, and when. */
  last: { step: string; at: string } | null;
}

const EMPTY: ThinkingLessonMemory = { seen: {}, last: null };

export async function getThinkingLessonMemory(): Promise<ThinkingLessonMemory> {
  try {
    const rec = await db.meta.get(META_KEY);
    if (!rec?.value) return { seen: {}, last: null };
    const parsed = JSON.parse(rec.value) as Partial<ThinkingLessonMemory>;
    return {
      seen: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {},
      last: parsed.last ?? null,
    };
  } catch {
    return { ...EMPTY, seen: {} };
  }
}

export function seenFor(mem: ThinkingLessonMemory, step: string): Set<string> {
  return new Set(mem.seen[step] ?? []);
}

/** Remember that `fen` was used for `step`, and that the lesson is on `step`. */
export async function rememberLessonBoard(step: string, fen: string, at: string): Promise<void> {
  const mem = await getThinkingLessonMemory();
  const id = boardIdentity(fen);
  const list = mem.seen[step] ?? [];
  if (!list.includes(id)) list.push(id);
  mem.seen[step] = list;
  mem.last = { step, at };
  await db.meta.put({ key: META_KEY, value: JSON.stringify(mem) });
}
