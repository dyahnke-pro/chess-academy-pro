/**
 * studentMemory — ONE STORE, ONE DOOR for what the app remembers about the
 * student that has no other home (David 2026-10-19: "i want persistent memory
 * throughout the app"). Plan: docs/plans/2026-10-19-persistent-memory.md.
 *
 * What lives here: WHERE THEY WERE (a Watch beat, the variation tab they
 * picked, a book page, a kid game's stars), what they CHOSE (a setting, the
 * line at a fork), and PROGRESS nothing else keeps (an all-time best streak).
 *
 * What NEVER lives here: evidence about the student — answers, finds, games,
 * slips. Those go to the record (`capabilityEvidence`, `misconceptionTags`,
 * `db.games`), so the heat map and the weakness spine read one copy. A kind
 * below that duplicates a fact the record holds is a defect.
 *
 * Every kind is declared once in `MEMORY_KINDS` with the surface that owns it
 * and the shape of its data, so a new kind fails to compile until someone
 * says what it is. FAIL-OPEN: a storage error reads as "nothing remembered"
 * and the surface behaves as it did before this store existed.
 */
import { db } from '../db/schema';

/** The data each kind carries. Add a kind here AND in `MEMORY_KINDS`. */
export interface MemoryDataByKind {
  // ── B. where they were ──
  /** Masterclass Watch: the beat they reached. key = lesson id. */
  'watch-beat': { beatIndex: number; beatCount: number };
  /** Opening page: the variation tab they picked. key = opening id. */
  'variation-tab': { tabIndex: number };
  /** Opening checkpoint quiz: the question reached, or done. key = opening id. */
  'quiz-progress': { index: number; completed: boolean };
  /** Book reader: the chapter and page. key = book id. */
  'book-page': { activeIdx: number; page: number };
  /** A chat thread to show again on reopen. key = surface thread id. */
  'chat-thread': { messages: StoredChatMessage[] };
  /** Kid games: levels finished and stars. key = game id. */
  'kid-progress': { levelsCompleted: number[]; stars: Record<string, number> };
  /** Puzzles served on a surface that has no attempt record to read. key = surface. */
  'served-puzzles': { ids: string[] };
  // ── C. settings ──
  /** A remembered choice. key = setting name. */
  setting: { value: string | number | boolean };
  /** The hint dial — how subtle hints should be, moved by the student's own
   *  found/missed run on every sparring surface. key = 'student'. */
  'hint-dial': { register: 'obvious' | 'moderate' | 'subtle'; recent: boolean[] };
  /** The opponent strength the board measured, carried into the next game
   *  instead of restarting at the profile rating. key = 'student'. */
  'live-strength': { rating: number; evidence: number };
  // ── E. progress ──
  /** All-time best. key = what (e.g. 'puzzle-streak'). */
  best: { value: number; at: number };
  /** One reading per day. key = series (e.g. 'puzzle-rating'). */
  trend: { points: Array<{ day: string; value: number }> };
  // ── Learn (wired by the lead) ──
  /** Roads walked and the line chosen at each fork. key = opening id. */
  'learn-forks': { walked: string[]; chosen: Record<string, string> };
  /** Traps already taught. key = opening id. */
  'learn-traps-taught': { gemIds: string[] };
  /** The "play it out yourself?" prompt was asked. key = opening id. */
  'learn-playout-prompted': { at: number };
  /** A Learn game in progress, saved so a killed app keeps it. key = 'current'. */
  'learn-game-snapshot': { snapshot: unknown };
}

export type MemoryKind = keyof MemoryDataByKind;

export type MemorySurface =
  | 'openings' | 'review' | 'play' | 'learn' | 'chat' | 'tactics' | 'endgame' | 'kid' | 'app';

/** One line per kind: who owns it. A `Record` so a new kind cannot compile
 *  until it names its surface. */
export const MEMORY_KINDS: Record<MemoryKind, { surface: MemorySurface }> = {
  'watch-beat': { surface: 'openings' },
  'variation-tab': { surface: 'openings' },
  'book-page': { surface: 'openings' },
  'quiz-progress': { surface: 'openings' },
  'chat-thread': { surface: 'chat' },
  'kid-progress': { surface: 'kid' },
  'served-puzzles': { surface: 'tactics' },
  setting: { surface: 'app' },
  'hint-dial': { surface: 'app' },
  'live-strength': { surface: 'play' },
  best: { surface: 'app' },
  trend: { surface: 'app' },
  'learn-forks': { surface: 'learn' },
  'learn-traps-taught': { surface: 'learn' },
  'learn-playout-prompted': { surface: 'learn' },
  'learn-game-snapshot': { surface: 'learn' },
};

export interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface StudentMemoryRecord<K extends MemoryKind = MemoryKind> {
  /** `${kind}:${key}` */
  id: string;
  kind: K;
  key: string;
  surface: MemorySurface;
  /** How many times it has been remembered. */
  count: number;
  firstAt: number;
  lastAt: number;
  data: MemoryDataByKind[K];
}

export function memoryId(kind: MemoryKind, key: string): string {
  return `${kind}:${key}`;
}

/** Remember `data` under (kind, key). Pass a function to build the new data
 *  from what was remembered before (null the first time). Returns the row, or
 *  null when storage failed (fail-open). */
export async function remember<K extends MemoryKind>(
  kind: K,
  key: string,
  data: MemoryDataByKind[K] | ((prev: MemoryDataByKind[K] | null) => MemoryDataByKind[K]),
  now: number = Date.now(),
): Promise<StudentMemoryRecord<K> | null> {
  try {
    const id = memoryId(kind, key);
    return await db.transaction('rw', db.studentMemory, async () => {
      const prev = (await db.studentMemory.get(id)) as StudentMemoryRecord<K> | undefined;
      const next = typeof data === 'function'
        ? (data as (p: MemoryDataByKind[K] | null) => MemoryDataByKind[K])(prev?.data ?? null)
        : data;
      const row: StudentMemoryRecord<K> = {
        id,
        kind,
        key,
        surface: MEMORY_KINDS[kind].surface,
        count: (prev?.count ?? 0) + 1,
        firstAt: prev?.firstAt ?? now,
        lastAt: now,
        data: next,
      };
      await db.studentMemory.put(row as StudentMemoryRecord);
      return row;
    });
  } catch {
    return null;
  }
}

/** What was remembered under (kind, key), or null. */
export async function recall<K extends MemoryKind>(kind: K, key: string): Promise<StudentMemoryRecord<K> | null> {
  try {
    const row = await db.studentMemory.get(memoryId(kind, key));
    return (row as StudentMemoryRecord<K> | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Just the data, or null. */
export async function recallData<K extends MemoryKind>(kind: K, key: string): Promise<MemoryDataByKind[K] | null> {
  return (await recall(kind, key))?.data ?? null;
}

/** Forget one key, or every key of a kind when `key` is omitted. */
export async function forget(kind: MemoryKind, key?: string): Promise<void> {
  try {
    if (key !== undefined) await db.studentMemory.delete(memoryId(kind, key));
    else await db.studentMemory.where('kind').equals(kind).delete();
  } catch {
    /* fail-open */
  }
}

// ── small typed helpers the surfaces share ──

/** A remembered setting, or `fallback`. */
export async function recallSetting<T extends string | number | boolean>(name: string, fallback: T): Promise<T> {
  const v = (await recallData('setting', name))?.value;
  return typeof v === typeof fallback ? (v as T) : fallback;
}

export function rememberSetting(name: string, value: string | number | boolean): Promise<unknown> {
  return remember('setting', name, { value });
}

/** Raise an all-time best; never lowers it. Returns the best after the write. */
export async function rememberBest(what: string, value: number, now: number = Date.now()): Promise<number> {
  const row = await remember('best', what, (prev) =>
    prev && prev.value >= value ? prev : { value, at: now }, now);
  return row?.data.value ?? value;
}

/** Record today's reading of a series (the last reading of the day wins). */
export async function rememberTrendPoint(series: string, value: number, now: number = Date.now()): Promise<void> {
  const day = new Date(now).toISOString().slice(0, 10);
  await remember('trend', series, (prev) => {
    const points = (prev?.points ?? []).filter((p) => p.day !== day);
    points.push({ day, value });
    return { points };
  }, now);
}

/** How many served puzzle ids a surface keeps. A storage window, not a cap on
 *  teaching: the oldest fall out and may be served again. */
export const SERVED_WINDOW = 2000;

/** Puzzles a surface already served in earlier sessions (surfaces whose puzzle
 *  attempts are not on `db.puzzles`). */
export async function recallServed(surface: string): Promise<Set<string>> {
  return new Set((await recallData('served-puzzles', surface))?.ids ?? []);
}

export async function rememberServed(surface: string, id: string): Promise<void> {
  await remember('served-puzzles', surface, (prev) => {
    const ids = (prev?.ids ?? []).filter((x) => x !== id);
    ids.push(id);
    return { ids: ids.slice(-SERVED_WINDOW) };
  });
}
