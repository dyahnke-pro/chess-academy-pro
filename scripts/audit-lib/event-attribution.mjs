/**
 * event-attribution.mjs — per-scenario audit-event attribution that
 * doesn't race against the audit-stream POST queue.
 *
 * Problem (root cause 2026-05-19): per-scenario `captured.slice(before)`
 * misattributes events because:
 *   1. Audit-stream POSTs are fire-and-forget, fetched async with no
 *      await on the caller side.
 *   2. The browser serializes per-origin connections — POSTs queue
 *      behind asset loads + HMR pings + image requests, often
 *      arriving 5-15s after they were emitted.
 *   3. By the time `captured.slice(before)` runs, the event from
 *      THIS scenario hasn't been received yet — it lands in the
 *      NEXT scenario's window and shows "absent" here + "violation"
 *      there.
 *
 * Fix (three layers, defense-in-depth):
 *   1. Wait for the audit-stream network channel to go quiet for
 *      `quietMs` consecutive milliseconds before snapshotting.
 *   2. Read the in-page Dexie log via `__AUDIT__.dump()` — same
 *      source of truth the audit-stream client uses, but no
 *      network race.
 *   3. Filter by `entry.timestamp` against the [t0, t1] window —
 *      `logAppAudit` sets timestamp at emit-time, so attribution is
 *      tied to WHEN the event was emitted, not when its POST hit
 *      the wire.
 *
 * Usage:
 *
 *   import { attachAuditStreamTracker, attributeScenarioEvents }
 *     from './audit-lib/event-attribution.mjs';
 *
 *   const tracker = attachAuditStreamTracker(page, STREAM_URL);
 *
 *   async function record(name, action, settleMs, expectations) {
 *     const t0 = Date.now();
 *     await action();
 *     await page.waitForTimeout(settleMs);
 *     const events = await attributeScenarioEvents(page, tracker, {
 *       t0, settleMs,
 *     });
 *     // ... evaluate expectations against `events`
 *   }
 */

/**
 * Subscribe to audit-stream POSTs so we can wait for the channel
 * to drain between scenarios. Returns a small handle that
 * `attributeScenarioEvents` reads.
 *
 * @param {import('playwright').Page} page
 * @param {string|RegExp} streamUrlOrRegex - either the exact
 *   audit-stream URL string or a regex (use a regex when the
 *   listener picks a random port).
 */
export function attachAuditStreamTracker(page, streamUrlOrRegex) {
  const state = { lastPostAt: Date.now() };
  page.on('request', (req) => {
    if (req.method() !== 'POST') return;
    const u = req.url();
    const matches = typeof streamUrlOrRegex === 'string'
      ? u === streamUrlOrRegex
      : streamUrlOrRegex.test(u);
    if (matches) state.lastPostAt = Date.now();
  });
  return state;
}

/**
 * Wait until no audit-stream POST has hit the wire for `quietMs`
 * consecutive milliseconds (or `maxMs` total elapsed). Resolves
 * silently in either case.
 */
async function waitForAuditDrain(page, tracker, { quietMs = 1500, maxMs = 8000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (Date.now() - tracker.lastPostAt >= quietMs) return;
    await page.waitForTimeout(250);
  }
}

/**
 * Snapshot all audits in the page's Dexie log via `__AUDIT__.dump()`
 * and filter by `[t0, t1]` emit-time window. Returns a list of
 * audit entries. Falls back to an empty list if __AUDIT__ isn't
 * available on the page (e.g. before app init).
 *
 * @param {import('playwright').Page} page
 * @param {object} tracker - handle from attachAuditStreamTracker
 * @param {object} opts
 * @param {number} opts.t0       - scenario start wall-clock ms
 * @param {number} [opts.t1]     - scenario end wall-clock ms (defaults to Date.now())
 * @param {number} [opts.quietMs] - drain quiet window (default 1500)
 * @param {number} [opts.maxMs]   - drain hard cap (default 8000)
 */
export async function attributeScenarioEvents(page, tracker, opts) {
  await waitForAuditDrain(page, tracker, {
    quietMs: opts.quietMs ?? 1500,
    maxMs: opts.maxMs ?? 8000,
  });
  const t1 = opts.t1 ?? Date.now();
  const entries = await page.evaluate(async () => {
    const a = (window).__AUDIT__;
    if (!a || typeof a.dump !== 'function') return [];
    try { return await a.dump(); } catch { return []; }
  });
  return entries.filter((e) => {
    const ts = typeof e?.timestamp === 'number' ? e.timestamp : null;
    return ts != null && ts >= opts.t0 && ts <= t1;
  });
}

/**
 * Convenience: read the full in-page log (no window filter).
 * Useful for end-of-run global assertions like "did claim-validator-trip
 * fire at least twice anywhere in the run".
 */
export async function readAllPageAudits(page) {
  return page.evaluate(async () => {
    const a = (window).__AUDIT__;
    if (!a || typeof a.dump !== 'function') return [];
    try { return await a.dump(); } catch { return []; }
  });
}
