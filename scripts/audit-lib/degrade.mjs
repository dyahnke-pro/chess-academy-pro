/**
 * DEGRADED-DEPENDENCY HARNESS — run a surface with one of its dependencies dead.
 *
 * Every serious coach bug found on 2026-09-02 was invisible while the engine was
 * healthy and obvious the moment it died:
 *
 *   - "whose turn is it?" collapsed to the stock refusal
 *   - "what's the best move?" refused on a position it had just answered
 *     "mate in 15" for, out of the same tablebase response
 *   - "am I winning?" was captured by the opening-name picker
 *
 * None of that reproduces on a warm engine, and the capability to reproduce it
 * existed as an inline `KILL_ENGINE` in exactly ONE script. CLAUDE.md G7 already
 * demands off-canonical input, cold cache, first-run and out-of-order probing —
 * this adds the axis it is missing: what happens when a dependency is gone.
 *
 * Each helper fails a dependency the way production actually fails it (abort =
 * the script never loads; 503 = the proxy is up and unhappy; 401 = the provider
 * rejects us), because a surface can behave differently for each.
 *
 * THE CONTRACT WORTH TESTING MOST is `killLlm`. G0 says the LLM decides nothing
 * and only phrases facts computed in code. If that inversion is real, then with
 * the provider dead the coach must still answer CORRECTLY — just in the raw
 * computed register instead of the warm one. Anything that goes silent or
 * refuses under `killLlm` was never inverted; it was only ever asking the model
 * nicely. That is the single sharpest test of whether the inversion happened,
 * and nothing has ever run it.
 *
 *   import { killEngine, killLlm, describeDegradations } from './audit-lib/degrade.mjs';
 *   const off = await killEngine(page);        // before the first goto
 *   console.log(describeDegradations(off));
 */

/** Stockfish can never initialise: the worker scripts never load. Matches a
 *  real crashed/blocked engine more closely than a slow one — the app's own
 *  fallback chain is what we want to exercise. */
export async function killEngine(page) {
  await page.route('**/stockfish/**', async (route) => { await route.abort(); });
  return 'engine';
}

/** The syzygy proxy is up and refusing. Exercises the "off-tablebase, decide
 *  from the threaded engine data" path, which is otherwise only reachable on
 *  positions with more than 7 pieces. */
export async function killTablebase(page) {
  await page.route('**/api/lichess-tablebase**', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"degraded-audit"}' });
  });
  return 'tablebase';
}

/** The provider rejects every call — a dead key, a quota wall, an outage.
 *  Under G0 the coach must STILL answer: the facts are computed, the model only
 *  phrases them. Silence or a refusal here is an un-inverted surface. */
export async function killLlm(page) {
  await page.route('**/api/llm/**', async (route) => {
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{"error":"degraded-audit"}' });
  });
  return 'llm';
}

/** The Lichess explorer proxy is down — masters/amateur move data unavailable.
 *  The claim validator must then refuse to cite frequencies rather than let the
 *  model invent them. */
export async function killExplorer(page) {
  await page.route('**/api/lichess-explorer**', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"degraded-audit"}' });
  });
  return 'explorer';
}

/** Voice synthesis unavailable. NOT the same as the audit mute: the mute keeps
 *  the narration EVENTS flowing while skipping synthesis, whereas this makes
 *  the request fail, so it exercises the app's own fallback rather than the
 *  audit harness's. Use the mute for cost, this for behaviour. */
export async function killTts(page) {
  await page.route('**/api/tts**', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"degraded-audit"}' });
  });
  return 'tts';
}

const REGISTRY = {
  engine: killEngine,
  tablebase: killTablebase,
  llm: killLlm,
  explorer: killExplorer,
  tts: killTts,
};

/** Apply several at once: `await degrade(page, ['engine', 'llm'])`.
 *  Also reads DEGRADE=engine,llm from the environment so any audit can be run
 *  degraded without editing it. */
export async function degrade(page, kinds) {
  const requested = kinds ?? (process.env.DEGRADE ? process.env.DEGRADE.split(',') : []);
  const applied = [];
  for (const raw of requested) {
    const kind = String(raw).trim();
    if (!kind) continue;
    const fn = REGISTRY[kind];
    if (!fn) throw new Error(`degrade: unknown dependency "${kind}" (known: ${Object.keys(REGISTRY).join(', ')})`);
    applied.push(await fn(page));
  }
  return applied;
}

/** A report-header line, so a degraded run is never mistaken for a healthy one.
 *  An audit that does not SAY it ran degraded will be read as a clean pass by
 *  whoever finds the report later. */
export function describeDegradations(applied) {
  const list = Array.isArray(applied) ? applied.filter(Boolean) : [applied].filter(Boolean);
  return list.length === 0
    ? '[degrade] none — all dependencies healthy'
    : `[degrade] DEAD: ${list.join(', ')} — failures below may be EXPECTED; read against the degraded contract`;
}

export const DEGRADABLE = Object.keys(REGISTRY);
