// foregroundActivity — "is the student using the app right now?", as one leaf
// signal (David's phone, 2026-10-19: hot, slow, and the Learn coach stalling).
//
// The boot backfills re-read the student's whole record (949 games on one real
// device) on the main thread, and they ran straight through a live Learn game:
// the coach's reply waited behind them and the phone heated. The singleton
// engine only ever works for a surface the student is looking at (Learn, Play,
// Review, chat — the background sweep has its own workers), so its use IS the
// signal: a backfill waits until the student has been quiet for a while.
// Zero imports, so the engine and any backfill can both read it. The Learn
// turn's timing lives here too (OS-18): when the reply lands and when the
// next board is read, so the first line of a turn is not starved.

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

/** Past this the instant line speaks anyway: a slow engine must never cost the
 *  student the warning. */
export const VERDICT_HOLD_MS = 4000;

/** Past this, counted from the move, the next board is read anyway: a stalled
 *  verdict must never cost the student the rest of the turn. */
export const NEXT_BOARD_HOLD_MS = 6000;

/** THE NEXT BOARD IS READ ONCE THE VERDICT IS ON THE AIR (OS-18 replay
 *  2026-10-20, 14.Rd5: the verdict was handed to the voice at +4.7 s and was
 *  heard at +9.2 s; in between, the next board's reads — position facts, the
 *  plan choice, the tactical read, ~3 s of synchronous work — held the main
 *  thread, and every step the voice takes to reach the speaker waited behind
 *  them). Those reads feed the late wave, which is spoken after the verdict
 *  anyway, so on a turn whose verdict is coming they start once it is playing.
 *  Resolves at once when the move cannot be a mistake, when its price comes in
 *  under the bar, once the turn's leading lines are handed over and the voice
 *  is playing, or at the hold. When the verdict was quiet, the instant line
 *  leads, and the reads wait for it the same way (14.Rd5 priced as a quiet
 *  inaccuracy: the instant line was handed over at +4.5 s and voiced at +8.2 s
 *  behind the next board's reads). */
export function nextBoardGate(input: {
  verdictUrgent: boolean;
  price: Promise<number | null>;
  /** The cost (cp) from which the move's verdict is called — the door's bar. */
  bar: number;
  /** Resolves when the lines that lead the turn — the verdict, and the
   *  instant line — have been handed to the voice (or found none). */
  linesHeard: Promise<void>;
  untilOnAir: (maxWaitMs: number) => Promise<void>;
  holdMs?: number;
}): Promise<void> {
  if (!input.verdictUrgent) return Promise.resolve();
  const never = new Promise<void>(() => {});
  const cheap = input.price.then((c) => (c !== null && c < input.bar ? undefined : never), () => never);
  const aired = input.linesHeard.then(() => input.untilOnAir(VERDICT_HOLD_MS));
  const hold = new Promise<void>((r) => { setTimeout(r, input.holdMs ?? NEXT_BOARD_HOLD_MS); });
  return Promise.race([cheap, aired, hold]);
}

/** THE REPLY WAITS FOR THE REASON — FOR AT MOST THE CEILING, COUNTED FROM THE
 *  MOVE (David 2026-10-17, "Delay the computer move obviously"; OS-18). The
 *  reason's reads warm DURING the think pad, so the reply lands at the later of
 *  the pad and the reason, never past the ceiling. The pad used to run first
 *  and the ceiling start after it, so a reply could land pad + ceiling after
 *  the move — 4.9 s at 14.Rd5 — and the verdict, which names the reply, waited
 *  for it. */
export function replyWait(input: {
  /** When the student's move landed (`Date.now()` clock). */
  startedAt: number;
  minThinkMs: number;
  reason: Promise<unknown>;
  ceilingMs: number;
  now?: () => number;
}): Promise<void> {
  const now = input.now ?? Date.now;
  const left = (ms: number): number => Math.max(0, ms - (now() - input.startedAt));
  const pad = new Promise<void>((r) => { setTimeout(r, left(input.minThinkMs)); });
  const reason = Promise.race([
    input.reason.then(() => undefined, () => undefined),
    new Promise<void>((r) => { setTimeout(r, left(input.ceilingMs)); }),
  ]);
  return Promise.all([pad, reason]).then(() => undefined);
}
