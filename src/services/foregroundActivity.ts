// foregroundActivity — "is the student using the app right now?", as one leaf
// signal (David's phone, 2026-10-19: hot, slow, and the Learn coach stalling).
//
// The boot backfills re-read the student's whole record (949 games on one real
// device) on the main thread, and they ran straight through a live Learn game:
// the coach's reply waited behind them and the phone heated. The singleton
// engine only ever works for a surface the student is looking at (Learn, Play,
// Review, chat — the background sweep has its own workers), so its use IS the
// signal: a backfill waits until the student has been quiet for a while.
// Zero imports, so the engine and any backfill can both read it.

let lastActivity = 0;

/** Stamp foreground use (the engine calls this on every live analysis). */
export function markForegroundActivity(now: number = Date.now()): void {
  lastActivity = now;
}

/** Milliseconds since the student last used a live surface. */
export function msSinceForegroundActivity(now: number = Date.now()): number {
  return lastActivity === 0 ? Number.POSITIVE_INFINITY : now - lastActivity;
}

/** How long the student must be quiet before background work resumes. */
export const FOREGROUND_QUIET_MS = 20_000;

/** Resolves once the student has been quiet for `quietMs`. */
export async function waitForForegroundQuiet(
  quietMs: number = FOREGROUND_QUIET_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => { setTimeout(r, ms); }),
): Promise<void> {
  for (;;) {
    const since = msSinceForegroundActivity();
    if (since >= quietMs) return;
    await sleep(Math.max(250, quietMs - since));
  }
}

/** Test hook. */
export function __resetForegroundActivityForTests(): void {
  lastActivity = 0;
}
