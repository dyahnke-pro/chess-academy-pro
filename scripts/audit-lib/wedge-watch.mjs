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
 *  2. **Keep a wall-clock deadline.** It is the only part that survives a
 *     failure mode nobody has imagined yet.
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
