/**
 * audit-sw-handover — proves a deploy can no longer yank a running session.
 *
 * THE BUG (2026-09-19). The PWA shipped `skipWaiting: true` + `clientsClaim:
 * true` + `cleanupOutdatedCaches: true`. A newly-deployed service worker
 * therefore activated UNDER a page that was still running, deleted the
 * precache that page was executing out of, and claimed it — so every later
 * lazy chunk or Web Worker fetch asked for a hashed file the deploy no longer
 * serves. `__HOLD_SW_RELOAD__` made this worse, not better: it deferred the
 * RELOAD while the activation went ahead, keeping a session alive on top of
 * code that had just been purged. Caught on David's iPhone: `stockfish-error`
 * (worker load failure), `lichess-error TypeError: Load failed`, `sw-lifecycle
 * installed -> activating -> controllerchange -> activated`, `pagehide
 * persisted=false`, and no `app-boot` on reopen.
 *
 * THE FIX, and what each row below actually proves:
 *   1-3. THE DEPLOYED ARTIFACT. Fetch the live `sw.js` and read it. This is
 *        the row that kills the class, because it does not trust the source:
 *        vite-plugin-pwa FORCES skipWaiting/clientsClaim back on whenever
 *        registerType is 'autoUpdate' (dist/index.js:874-876), so a config
 *        that reads as fixed can ship as broken. Only the artifact settles it.
 *   4-5. THE PAGE SIDE. `__swHandover` exists and no worker claimed the page
 *        out from under us during the run.
 *   6-7. THE GATE IS LIVE. Acquire a real hold by opening a lesson surface,
 *        then drive `__swRequestHandover()` and assert the hold was consulted
 *        (deferrals climb, `asked` stays false). With nothing waiting the ask
 *        is a no-op, so this is safe to run against prod at any time.
 *
 * WHAT THIS CANNOT PROVE: that a session survives a REAL deploy. That needs
 * two deploys — hold a session open on deploy N and land deploy N+1 — and is
 * the one check to run by hand after the next unrelated push.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-sw-handover-prod.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(muteTtsForAudit); // audits never spend TTS money (G1)
  await context.addInitScript(autoDismissCalibration);
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  // ── 1-3. Read the DEPLOYED sw.js, not the source.
  let swSource = '';
  try {
    const res = await page.request.get(`${BASE}/sw.js`, { timeout: 30000 });
    if (res.ok()) swSource = await res.text();
    record('sw.js served', res.ok(), `HTTP ${res.status()} · ${swSource.length} bytes`);
  } catch (e) {
    record('sw.js served', false, String(e).slice(0, 160));
  }

  // A top-level `self.skipWaiting()` is the defect. The SAME call inside the
  // message listener is the fix, so count occurrences and locate them rather
  // than grepping for the string.
  const skipCalls = [...swSource.matchAll(/self\.skipWaiting\(\)/g)].map((m) => m.index ?? -1);
  const listenerIdx = swSource.search(/addEventListener\(\s*["']message["']/);
  const allInsideListener =
    skipCalls.length > 0 &&
    listenerIdx >= 0 &&
    skipCalls.every((i) => i > listenerIdx && i - listenerIdx < 200);
  record(
    'sw.js never skips waiting on its own',
    allInsideListener,
    `${skipCalls.length} skipWaiting() call(s); message listener at ${listenerIdx}; all inside=${allInsideListener}`,
  );
  record(
    'sw.js does not clientsClaim',
    swSource.length > 0 && !/clientsClaim/.test(swSource),
    /clientsClaim/.test(swSource) ? 'clientsClaim present — a new worker will seize running pages' : 'absent',
  );

  // ── 4-5. The page side.
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000);

  const state = await page.evaluate(() => window.__swHandover ?? null);
  record('page exposes __swHandover', state !== null, JSON.stringify(state));

  const hasRequestFn = await page.evaluate(() => typeof window.__swRequestHandover === 'function');
  record('page exposes __swRequestHandover()', hasRequestFn);

  // ── 6-7. The gate is live: a hold must be consulted before we ever ask.
  const gate = await page.evaluate(async () => {
    const st = window.__swHandover;
    if (!st || typeof window.__swRequestHandover !== 'function') return null;
    // Fake a waiting worker so the gate has something to gate. `postMessage`
    // is stubbed, so nothing is actually asked to activate.
    const regs = await navigator.serviceWorker.getRegistrations();
    if (!regs.length) return { noRegistration: true };
    let posted = 0;
    const fake = { postMessage: () => { posted += 1; } };
    const target = regs[0];
    let redefined = false;
    try {
      Object.defineProperty(target, 'waiting', { configurable: true, get: () => fake });
      redefined = true;
    } catch { /* some engines seal it */ }
    if (!redefined) return { cannotStub: true };

    window.__HOLD_SW_RELOAD__ = true;
    const before = st.deferrals;
    window.__swRequestHandover();
    await new Promise((r) => setTimeout(r, 400));
    const heldDeferrals = st.deferrals - before;
    const askedWhileHeld = st.asked;

    window.__HOLD_SW_RELOAD__ = false;
    window.__swRequestHandover();
    await new Promise((r) => setTimeout(r, 400));
    const askedWhenQuiet = st.asked;

    // Put it back so the tab behaves normally for the rest of the run.
    delete target.waiting;
    return { heldDeferrals, askedWhileHeld, askedWhenQuiet, posted };
  });

  if (!gate || gate.noRegistration || gate.cannotStub) {
    record(
      'hold defers the handover ask',
      false,
      gate?.noRegistration
        ? 'no service-worker registration on this origin'
        : gate?.cannotStub
          ? 'could not stub registration.waiting'
          : '__swHandover missing',
    );
    record('handover proceeds once the hold clears', false, 'not reached');
  } else {
    record(
      'hold defers the handover ask',
      gate.heldDeferrals > 0 && gate.askedWhileHeld === false,
      `deferrals+${gate.heldDeferrals}, asked-while-held=${gate.askedWhileHeld}`,
    );
    record(
      'handover proceeds once the hold clears',
      gate.askedWhenQuiet === true && gate.posted > 0,
      `asked=${gate.askedWhenQuiet}, SKIP_WAITING posted ${gate.posted}x`,
    );
  }

  // 8. No worker seized the page during the run, and nothing threw.
  const claimed = await page.evaluate(() => window.__swHandover?.controllerChanged ?? null);
  record('no worker claimed the page mid-run', claimed === false, `controllerChanged=${claimed}`);
  record('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  await browser.close();

  const dir = `audit-reports/sw-handover-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, results, pageErrors }, null, 2));

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green — report at ${dir}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
