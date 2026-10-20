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
/** Live holds: a Learn game on the board, a review being read. While any is
 *  held, background work waits however long the student thinks (David
 *  2026-10-19: "analyze in the background, just not while playing a chess game
 *  in learn"). The engine-quiet signal alone could not see a student thinking:
 *  the engine sits idle between moves, so 20 s later the sweep resumed mid-game. */
let holds = 0;

/** Hold background work until the returned release is called (once). */
export function holdBackground(): () => void {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
  };
}

/** Resolves once no hold is live. */
export async function waitWhileHeld(
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => { setTimeout(r, ms); }),
): Promise<void> {
  while (holds > 0) await sleep(500);
}

/** How many holds are live. */
export function backgroundHolds(): number {
  return holds;
}

/** Stamp foreground use (the engine calls this on every live analysis). */
export function markForegroundActivity(now: number = Date.now()): void {
  lastActivity = now;
}

/** Milliseconds since the student last used a live surface. */
function msSinceForegroundActivity(now: number = Date.now()): number {
  return lastActivity === 0 ? Number.POSITIVE_INFINITY : now - lastActivity;
}

/** How long the student must be quiet before background work resumes. */
const FOREGROUND_QUIET_MS = 20_000;

/** Resolves once the student has been quiet for `quietMs`. */
export async function waitForForegroundQuiet(
  quietMs: number = FOREGROUND_QUIET_MS,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => { setTimeout(r, ms); }),
): Promise<void> {
  for (;;) {
    if (holds > 0) { await sleep(500); continue; }
    const since = msSinceForegroundActivity();
    if (since >= quietMs) return;
    await sleep(Math.max(250, quietMs - since));
  }
}

/** Test hook. */
export function __resetForegroundActivityForTests(): void {
  lastActivity = 0;
  holds = 0;
}
