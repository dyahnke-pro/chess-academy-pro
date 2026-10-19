// backfillSchedule — HOW A BOOT-TIME BACKFILL IS SCHEDULED, in one place.
//
// Every knob exists because of one device: David's iPhone on 2026-09-22, the
// first launch of the bundle that carried the tactic-tag backfill. That loop
// re-tagged thousands of rows through a ~260 ms computer in one synchronous
// pass at boot with nothing persisted until the end. The main thread pegged
// within seconds of every launch, the phone heated, taps died, and a
// force-quit threw the work away so the next launch started from zero — a
// freeze that could never end. Three rules, one per defect of that loop:
//   1. YIELD between rows, so a tap, a paint, or the OTA launch-install runs.
//   2. PERSIST every `batch` rows, so a killed app keeps its progress.
//   3. START LATE — the first paint and the launch-install go first.
//   4. THE STUDENT FIRST (2026-10-19) — heavy units wait while the student is
//      on a live board (`foregroundActivity`), so a re-read of 949 games never
//      runs under a Learn game's coach.
// A second backfill (the opening-key re-mint, A1) has the same shape; it
// reads the same schedule so the rule cannot drift between them. One import
// (the foreground leaf, itself import-free): a leaf any reconciler can read.
import { waitForForegroundQuiet, waitWhileHeld } from './foregroundActivity';

export interface BackfillSchedule {
  /** Milliseconds to wait before touching the database. */
  startDelayMs: number;
  /** Rows processed between persists. */
  batch: number;
  /** Awaited between every two rows — hands the thread back. */
  yieldBetweenRows: () => Promise<void>;
  /** Awaited before each heavy unit (a whole game re-read): resolves once the
   *  student has been away from a live board for a while (rule 4 below). */
  waitForQuiet?: () => Promise<void>;
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/** Idle-callback yield with a timer fallback: at least 40 ms of breathing room
 *  per row on a phone, longer when the browser says the thread is busy. */
export function idleYield(): Promise<void> {
  const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback;
  if (typeof ric === 'function') return new Promise((resolve) => { ric(() => resolve(), { timeout: 250 }); });
  return sleep(40);
}

export const PRODUCTION_BACKFILL_SCHEDULE: BackfillSchedule = {
  startDelayMs: 8_000,
  batch: 10,
  // Every row, every backfill: a Learn game on the board stops the pass
  // between rows, not only before a whole game (the hold, foregroundActivity).
  yieldBetweenRows: async () => { await waitWhileHeld(); await idleYield(); },
  waitForQuiet: () => waitForForegroundQuiet(),
};

/** Tests and one-shot callers: no delay, no yield — the same rows, at once. */
export const IMMEDIATE_BACKFILL_SCHEDULE: BackfillSchedule = {
  startDelayMs: 0,
  batch: 10,
  yieldBetweenRows: () => Promise.resolve(),
  waitForQuiet: () => Promise.resolve(),
};
