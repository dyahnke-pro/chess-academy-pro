/**
 * wedge-watch — shared detection for a browser that has stopped answering.
 *
 * WHY THIS IS A LIBRARY AND NOT ONE SCRIPT'S FIX. On 2026-09-20 the review
 * audit wedged twice in a single run: the walk readout went unreadable at ply
 * 68/69 and stayed dead for 250 polls while each poll stretched 1s → 4s, and
 * the renderer later pinned at 100% CPU with a static stack. It manufactured
 * FOUR red rows (recap, thesis, fundamentals-lead, show-me) that looked exactly
 * like product defects and were not. PostHog then showed no real user has ever
 * hit it — so this is an instrument failure, and any audit that drives a
 * browser can suffer it, not just the one that found it.
 *
 * TWO RULES THIS ENCODES, both learned the expensive way:
 *  1. **A detector must not depend on the thing it detects.** The first guard
 *     could not fire because it called `locator.count()`, which takes NO
 *     timeout, on the wedged page BEFORE its own check. Every read here is
 *     raced to a fallback.
 *  2. **Keep a wall-clock deadline — and make sure the deadline can actually be
 *     REACHED.** This is the deceptive half, found by the focused-noyce session
 *     reading its own audit after mine: the common
 *     `while (Date.now() - t0 < ms) { if (await fn()) return true; … }` poll
 *     evaluates its deadline only BETWEEN iterations, so a predicate that never
 *     settles means the loop never returns to its own condition. It reads as a
 *     bounded 60-second wait and is unbounded against a wedged renderer. A
 *     `try/catch` around the read does not save it either — a catch handles a
 *     THROW, and a wedge never throws. Measured the same day: 18 such call
 *     sites in the review audit, 9 in the loop audit, plus three audit-lib
 *     helpers. Use `until` below, which races each predicate against the
 *     REMAINING budget, and keep `overdue()` separate from `observe()` so the
 *     caller checks the clock on every poll rather than trusting the loop.
 */

/** Race a page read against a deadline so a wedged renderer cannot hang it. */
export async function raced(promise, fallback, ms = 3000) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

/** `locator.count()` with a bound — the call that hung the first guard. */
export async function boundedHas(page, sel, ms = 3000) {
  return raced(page.locator(sel).count().then((n) => n > 0), false, ms);
}

/**
 * Watch a polling loop for the two shapes a wedge takes.
 *
 * `observe(readOk, where)` on every poll: a run of failed reads longer than
 * `unreadableLimit` is a wedge. `overdue()` reports the wall-clock deadline.
 * `reason` is null while healthy and a sentence once wedged — put that sentence
 * in the verdict and STOP, rather than filing the rows that follow it.
 */
export function wedgeWatch({ unreadableLimit = 30, deadlineMs = 180_000, label = 'walk' } = {}) {
  const started = Date.now();
  let consecutive = 0;
  let lastGood = null;
  let reason = null;
  return {
    observe(readOk, where = null) {
      if (readOk) { consecutive = 0; if (where !== null) lastGood = where; return null; }
      consecutive += 1;
      if (!reason && consecutive > unreadableLimit) {
        reason = `the ${label} readout stopped answering for ${consecutive} consecutive polls`
          + (lastGood !== null ? ` at ${lastGood}` : '') + ' — the page wedged, this is not a product result';
      }
      return reason;
    },
    overdue() {
      if (!reason && Date.now() - started > deadlineMs) {
        reason = `the ${label} loop exceeded its ${Math.round(deadlineMs / 1000)}s deadline — a read is hanging, not the ${label} being slow`;
      }
      return reason;
    },
    get reason() { return reason; },
    get consecutive() { return consecutive; },
  };
}

/**
 * `until`, with a deadline that the failure CANNOT outlive.
 *
 * Same contract as the hand-rolled version every audit carries — poll `fn`
 * every `step` ms, return true as soon as it is truthy, false at `ms` — except
 * each call is raced against the REMAINING budget, so a predicate that hangs
 * on a wedged page ends the wait instead of ending the run. Racing against the
 * remaining time rather than a fixed slice matters: a legitimately slow read
 * (a cold analysis, a 90s generation) still gets all the time it is owed.
 */
export async function until(fn, ms, step = 400) {
  const t0 = Date.now();
  for (;;) {
    const left = ms - (Date.now() - t0);
    if (left <= 0) return false;
    if (await raced(Promise.resolve().then(fn), false, left)) return true;
    if (ms - (Date.now() - t0) <= 0) return false;
    await new Promise((r) => setTimeout(r, step));
  }
}
