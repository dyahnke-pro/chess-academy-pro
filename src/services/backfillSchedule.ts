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
// A second backfill (the opening-key re-mint, A1) has the same shape; it
// reads the same schedule so the rule cannot drift between them. Zero
// imports: a leaf any reconciler can read.

export interface BackfillSchedule {
  /** Milliseconds to wait before touching the database. */
  startDelayMs: number;
  /** Rows processed between persists. */
  batch: number;
  /** Awaited between every two rows — hands the thread back. */
  yieldBetweenRows: () => Promise<void>;
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
  yieldBetweenRows: idleYield,
};

/** Tests and one-shot callers: no delay, no yield — the same rows, at once. */
export const IMMEDIATE_BACKFILL_SCHEDULE: BackfillSchedule = {
  startDelayMs: 0,
  batch: 10,
  yieldBetweenRows: () => Promise.resolve(),
};
