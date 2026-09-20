/**
 * analysisDeterminism — the audit-only DEPTH-ONLY switch for engine analysis.
 *
 * Review analysis sends `go depth N movetime B` and the clock wins under
 * load: the depth REACHED varies, so the evals vary, so which plies get
 * flagged varies, so no audit row that depends on which plies were flagged is
 * reproducible on the same game and bundle (PLAN #70, measured 2026-09-20:
 * ply 50 graded an inaccuracy at 0.8 in one run and a mistake at 1.1 in the
 * next). The product keeps its budgets — they are what bound a phone's
 * battery — but an AUDIT that asks "did the same game give the same verdict"
 * needs the annotations to be a pure function of the game.
 *
 * This is the TTS mute's twin (`voiceService.auditMuteTts`): a flag only the
 * audit harness sets, read once and cached, that makes every review budget
 * effectively unbounded so the depth ceiling is the only limit. Product code
 * may never set it — `analysisDeterminism.test.ts` scans for a writer.
 *
 * Harness usage (init script, before boot):
 *   window.localStorage.setItem('auditDeterministicAnalysis', '1');
 */
export const AUDIT_DETERMINISTIC_KEY = 'auditDeterministicAnalysis';

/** The critical-moment fan under the flag: a NODE limit instead of a clock.
 *  The fan is `go depth 14 movetime 1500` in the product — a clock, so the
 *  depth reached and the MultiPV counts vary run to run (a pinned pair read
 *  "10 speak" vs "9 speak"). Lifting the clock to the ten-minute ceiling was
 *  measured wrong on 2026-09-20: MultiPV 3 at depth 14 from a COLD hash on one
 *  single-thread worker did not finish 22 plies before the reopen aborted the
 *  pass, so the question never fired at all. A node count is the third kind of
 *  limit: deterministic on one thread with a cold table, and it completes in
 *  about the product's budget. Sized for the WASM single-thread build at
 *  roughly one second of search. */
export const DETERMINISTIC_FAN_NODES = 1_200_000;
/** Watchdog for a node-bound fan search: generous, because a slow machine
 *  still finishes N nodes — it just takes longer — and a watchdog that fires
 *  first turns a deterministic read into a nondeterministic "failed". */
export const DETERMINISTIC_FAN_WATCHDOG_MS = 30_000;

/** A budget the depth ceiling always beats — ten minutes per position. Not
 *  "no budget": the worker protocol's watchdogs still key off a number, and a
 *  wedged engine must still be recovered, just never before depth lands. */
export const DETERMINISTIC_BUDGET_MS = 600_000;

let cached: boolean | null = null;

/** True only when the audit harness turned it on for this page. */
export function deterministicAnalysisForAudit(): boolean {
  if (cached !== null) return cached;
  try {
    const mem = (globalThis as { __auditDeterministicAnalysis?: unknown }).__auditDeterministicAnalysis === true;
    // The WINDOW's storage, explicitly: on Node 26 a bare `localStorage` can
    // resolve to Node's own (unavailable) global instead of jsdom's, and the
    // flag silently never lands — same read the TTS mute uses.
    const store = (globalThis as { window?: { localStorage?: Storage } }).window?.localStorage;
    const ls = !!store && store.getItem(AUDIT_DETERMINISTIC_KEY) === '1';
    cached = mem || ls;
  } catch {
    cached = false;
  }
  return cached;
}

/** The budget a review site should send: its own under real use, the
 *  depth-binding ceiling under the audit switch. */
export function reviewBudget(ms: number): number {
  return deterministicAnalysisForAudit() ? DETERMINISTIC_BUDGET_MS : ms;
}

/** Test hook. */
export function __resetAnalysisDeterminismForTests(): void {
  cached = null;
}
