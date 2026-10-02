/**
 * activeBite — the Up-next bite the student is doing RIGHT NOW (David
 * 2026-10-01: short, with a finish line). Tapping Up next starts it; the
 * surface's natural finish line ends it (a rung completed, a puzzle solved, an
 * opening claimed, Deep Run's third puzzle). Ending marks the rep done, which
 * is the ONE completion signal the ring listens to (`onRepCompleted`).
 *
 * Surfaces never know which pick sent them: they report WHAT finished, and
 * only a bite of that kind ends. Held in memory AND in a meta row, so a reload
 * mid-bite (an app update, iOS evicting the tab) does not lose the finish.
 */
import { db } from '../db/schema';
import { markRepCompletedToday } from './repCompletion';
import type { PickKind } from './upNextPicker';

/** A bite left unfinished this long is not the reason for a later finish. */
const BITE_TTL_MS = 30 * 60 * 1000;

interface Bite { key: string; kind: PickKind; at: number }
const META_KEY = 'up_next_active_bite_v1';
let active: Bite | null = null;
let restored = false;

export function startBite(pick: { key: string; kind: PickKind }, now: number = Date.now()): void {
  active = { key: pick.key, kind: pick.kind, at: now };
  restored = true;
  void db.meta.put({ key: META_KEY, value: JSON.stringify(active) }).catch(() => undefined);
}

async function current(): Promise<Bite | null> {
  if (!restored) {
    restored = true;
    try {
      const rec = await db.meta.get(META_KEY);
      if (rec && !active) active = JSON.parse(rec.value) as Bite;
    } catch { /* no row */ }
  }
  return active;
}

/** A finish line was crossed. Ends the bite only when it is of one of these
 *  kinds. Resolves whether a bite ended. */
export async function finishBite(kinds: PickKind | readonly PickKind[], now: number = Date.now()): Promise<boolean> {
  const ks: readonly PickKind[] = typeof kinds === 'string' ? [kinds] : kinds;
  const bite = await current();
  if (!bite || now - bite.at > BITE_TTL_MS || !ks.includes(bite.kind)) return false;
  active = null;
  await db.meta.delete(META_KEY).catch(() => undefined);
  await markRepCompletedToday(bite.key);
  return true;
}

/** A finish line that belongs to ONE pick (the Start-here steps share a kind,
 *  so the kind alone cannot tell "the fundamentals were read" from "the
 *  Italian was watched"). Ends the bite only when it is that pick. */
export async function finishBiteByKey(key: string, now: number = Date.now()): Promise<boolean> {
  const bite = await current();
  if (!bite || now - bite.at > BITE_TTL_MS || bite.key !== key) return false;
  active = null;
  await db.meta.delete(META_KEY).catch(() => undefined);
  await markRepCompletedToday(bite.key);
  return true;
}

// The Start-here "first coached game" step: any game saved against the coach
// is its finish line. Scheduled out of the Dexie transaction the hook runs in.
try {
  db.games.hook('creating', (_key, obj) => {
    if (obj.source === 'coach') setTimeout(() => { void finishBiteByKey('up:start:first-game'); }, 0);
  });
} catch { /* a test db without hooks */ }

/** The meta row that marks the Start-here Fundamentals step done for good. */
export const START_FUNDAMENTALS_KEY = 'start-path:fundamentals';

/** The Fundamentals page opened: the Start-here step is done, for good. */
export async function markFundamentalsVisited(): Promise<void> {
  await db.meta.put({ key: START_FUNDAMENTALS_KEY, value: new Date().toISOString() }).catch(() => undefined);
  await finishBiteByKey('up:start:fundamentals');
}

/** Test hook. */
export function __resetActiveBiteForTests(): void {
  active = null;
  restored = false;
}
