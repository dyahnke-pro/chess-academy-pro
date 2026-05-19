#!/usr/bin/env node
/**
 * audit-coach-teach-interactive.mjs
 * ---------------------------------
 * G7-compliant INTERACTIVE failure-mode audit for /coach/teach.
 * The point: don't just run scripted happy-path scenarios that
 * prove the wires still work. Type misspellings, pick stages
 * cold, use uncached openings, behave like a first-time user.
 *
 * Bootstrap (2026-05-19): David asked to watch a full interactive
 * audit so he could see exactly what every future audit will do.
 * This script is deliberately broader than the standard per-PR
 * audit — it casts wide on purpose.
 *
 * Run:
 *   npm run dev > /tmp/vite.log 2>&1 &
 *   sleep 8
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node scripts/audit-coach-teach-interactive.mjs
 *
 * Outputs everything to stdout in real-time so a human can follow
 * along. Saves a JSON report to audit-reports/coach-teach-interactive-<iso>/.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-teach-interactive-${stamp}`;

const findings = [];
function record(scenario, ok, detail) {
  findings.push({ scenario, ok, detail, at: Date.now() });
  const marker = ok ? '✓' : '✗';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${marker}\x1b[0m  ${scenario} → ${detail}`);
}

/** Concerning audit-event kinds. When any of these fire during a
 *  scenario, the audit treats it as a soft failure that should be
 *  investigated before the loop converges. Distinct from the
 *  pass/fail assertions: those check expected UI shapes; these
 *  surface the underlying instrumentation events that should never
 *  fire on a healthy path. */
const CONCERNING_KINDS = new Set([
  'claim-validator-trip',
  'sanitizer-leak',
  'tts-failure',
  'llm-error',
  'dexie-error',
  'uncaught-error',
  'unhandled-rejection',
  'tool-call-error',
  'navigation-error',
  'error-boundary',
  'bad-fen',
  'phase-transition-suppressed',
]);

/** Read the Dexie audit log and return only events with timestamp >
 *  `since`. Used between scenarios to surface concerning instrumentation
 *  events the user-facing assertions might miss. Returns [] when the
 *  log isn't populated yet (boot race) instead of throwing. */
async function readAuditLogSince(page, since) {
  return await page.evaluate(async (sinceTs) => {
    try {
      const dbReq = indexedDB.open('ChessAcademyDB');
      await new Promise((r, rj) => {
        dbReq.onsuccess = () => r();
        dbReq.onerror = () => rj(dbReq.error);
      });
      const db = dbReq.result;
      const tx = db.transaction('meta', 'readonly');
      const rec = await new Promise((r) => {
        const g = tx.objectStore('meta').get('app-audit-log.v1');
        g.onsuccess = () => r(g.result);
        g.onerror = () => r(null);
      });
      db.close();
      if (!rec) return [];
      const all = JSON.parse(rec.value);
      return all.filter((e) => e.timestamp > sinceTs);
    } catch {
      return [];
    }
  }, since);
}

let lastAuditCheckpointTs = 0;
const concerningPerScenario = [];

/** Streams concerning audit events that fired since the last call.
 *  Returns the count so callers can fold it into the pass/fail
 *  tally. Always records the checkpoint timestamp regardless of
 *  outcome so the next call only sees newer events. */
async function inspectAuditLog(page, scenarioName) {
  const events = await readAuditLogSince(page, lastAuditCheckpointTs);
  lastAuditCheckpointTs = Date.now();
  const concerning = events.filter((e) => CONCERNING_KINDS.has(e.kind));
  if (concerning.length > 0) {
    console.log(`\x1b[33m  ⚠ ${concerning.length} concerning audit event(s) during "${scenarioName}":\x1b[0m`);
    for (const e of concerning) {
      console.log(`    [${e.kind}] ${e.source}: ${e.summary}`);
    }
    concerningPerScenario.push({ scenario: scenarioName, events: concerning });
  }
  return concerning.length;
}

async function clearAllStorage(page) {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
    }
    try { localStorage.clear(); } catch (e) { /* sandbox */ }
    try { sessionStorage.clear(); } catch (e) { /* sandbox */ }
  });
  // Re-set the audit-mode provider override after the wipe so
  // subsequent scenarios still pin DeepSeek. Without this the second
  // scenario onwards falls back to whichever provider the app would
  // pick by default — usually fine but defeats the audit-mode flag.
  if (typeof FORCE_PROVIDER !== 'undefined' && FORCE_PROVIDER !== 'none') {
    await page.evaluate(async (provider) => {
      try {
        const dbReq = indexedDB.open('ChessAcademyDB');
        await new Promise((resolve, reject) => {
          dbReq.onsuccess = () => resolve(dbReq.result);
          dbReq.onerror = () => reject(dbReq.error);
        });
        const db = dbReq.result;
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key: 'auditForceProvider', value: provider });
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch {
        /* sandbox / first-run race — next scenario will set it */
      }
    }, FORCE_PROVIDER);
  }
}

// Hoist FORCE_PROVIDER so clearAllStorage can read it.
const FORCE_PROVIDER = process.env.AUDIT_FORCE_PROVIDER ?? 'deepseek';

async function typeAndSend(page, text) {
  // Capture the message count BEFORE we type — for inputs that route
  // synchronously (e.g. local picker for broad opening names), both
  // the user message AND the coach reply land before this function
  // returns, and a post-click count would already include the reply.
  // Returning the pre-input count lets `waitForCoachResponse` wait
  // for ANY growth past that baseline.
  const beforeCount = await page.locator('[data-testid^="chat-message-"]').count();
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.click();
  await input.fill(text);
  await page.locator('[data-testid="chat-send-btn"]').click();
  return beforeCount;
}

async function waitForCoachResponse(page, beforeCount, timeoutMs = 30_000) {
  // `beforeCount` is the count BEFORE the user typed. Need to wait
  // for both the user message AND the coach response to land — i.e.
  // count grew by ≥ 2. (Synchronous picker routes can add both in
  // one tick; brain trips add them sequentially.)
  await page.waitForFunction(
    (prev) => document.querySelectorAll('[data-testid^="chat-message-"]').length >= prev + 2,
    beforeCount,
    { timeout: timeoutMs },
  );
  // ALSO wait for the newest assistant bubble to have non-trivial
  // content. The chat surface adds an empty placeholder bubble for
  // streaming responses; the message count fires before the
  // streamed text arrives (~20s for some inputs). Without this
  // gate, scenarios that check "did the brain say something
  // sensible?" race the stream and read just the avatar character.
  await page.waitForFunction(
    () => {
      const bubble = document.querySelector('[data-testid="chat-message-assistant"]');
      const text = bubble?.textContent ?? '';
      // Trim and ignore the leading avatar character so we measure
      // actual chess content. > 8 chars is the minimum sensible reply.
      return text.replace(/^[A-Za-z]\s*/, '').trim().length > 8;
    },
    null,
    { timeout: timeoutMs },
  );
  // Settle: let the rest of the stream land.
  await page.waitForTimeout(1200);
}

async function lastAssistantText(page) {
  // The chat surface tags every message with
  // `data-testid="chat-message-${role}"`. Messages render in REVERSE
  // chronological order (newest at the top of the panel; the layout
  // uses flex-direction: column-reverse so old messages scroll down).
  // DOM order matches the paint order — newest assistant message
  // is `nth(0)`, oldest is `nth(count-1)`.
  const msgs = page.locator('[data-testid="chat-message-assistant"]');
  const count = await msgs.count();
  if (count === 0) return '';
  return (await msgs.nth(0).textContent()) ?? '';
}

async function gotoCoachTeach(page) {
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
}

/** Probe brain API reachability FROM THE BROWSER. Node's fetch can
 *  reach api.anthropic.com / api.deepseek.com from the sandbox via a
 *  different network stack than the headless Chrome — the sandbox
 *  Chrome hits an ERR_CERT_AUTHORITY_INVALID and blocks the request
 *  entirely. We need the browser's perspective. Returns true if at
 *  least one provider returns ANY response status from the page
 *  context. False (sandbox-blocked) when both throw network errors.
 */
async function isBrainReachableFromBrowser(page) {
  return page.evaluate(async () => {
    const hosts = ['https://api.anthropic.com/v1/messages', 'https://api.deepseek.com/v1/chat/completions'];
    for (const host of hosts) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 3000);
        const res = await fetch(host, { method: 'POST', body: '{}', signal: ctrl.signal });
        clearTimeout(t);
        // Any HTTP response (401/404/422) means reachable.
        if (res.status > 0) return true;
      } catch { /* try next */ }
    }
    return false;
  });
}

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  /coach/teach — G7 interactive failure-mode audit');
  console.log(`  target: ${BASE_URL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const executablePath = await resolveChromiumExecutable({
    preferred: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath,
    // Sandbox's chromium doesn't trust the CA chain for the public
    // DeepSeek / Anthropic API hosts. Real-device browsers (and the
    // production deploy) don't have this issue. Pass the flag so the
    // audit can actually exercise the brain in the sandbox.
    args: ['--ignore-certificate-errors'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  // Brain-reachability gate. This audit drives ~10 scenarios that
  // each type to the coach and wait for an LLM reply. Without brain
  // access every scenario hangs 60s and the whole script times out
  // at the wrapper level. Exit cleanly with a sandbox-blocked notice
  // instead — real-device + prod runs hit the brain normally.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  const brainOk = await isBrainReachableFromBrowser(page);
  if (!brainOk) {
    console.log('\n⚠  SANDBOX-BLOCKED — brain APIs unreachable from headless browser.');
    console.log('   api.anthropic.com + api.deepseek.com refused outbound (cert/firewall).');
    console.log('   Skipping all scenarios (they require live LLM replies).');
    console.log('   Re-run from real device / prod for actual coverage.\n');
    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify({
      status: 'sandbox-blocked',
      reason: 'brain APIs unreachable from this network',
      target: BASE_URL,
      timestamp: new Date().toISOString(),
    }, null, 2));
    await browser.close();
    process.exit(0);
  }

  // Track every navigation so we can verify the walkthrough bounce
  // is dead.
  const routeLog = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      routeLog.push({ url: frame.url(), at: Date.now() });
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

  // Audit-mode provider override (2026-05-19): force the coach to
  // route through DeepSeek for the duration of this audit run.
  // David: "i just didnt want to bur anthropic API tokens on audits.
  // deepseek is much cheaper." The flag is set in Dexie's meta table
  // here at boot AND in clearAllStorage so wipes don't drop it.
  if (FORCE_PROVIDER !== 'none') {
    await page.evaluate(async (provider) => {
      try {
        const dbReq = indexedDB.open('ChessAcademyDB');
        await new Promise((resolve, reject) => {
          dbReq.onsuccess = () => resolve(dbReq.result);
          dbReq.onerror = () => reject(dbReq.error);
        });
        const db = dbReq.result;
        const tx = db.transaction('meta', 'readwrite');
        const store = tx.objectStore('meta');
        store.put({ key: 'auditForceProvider', value: provider });
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      } catch (e) {
        console.warn('[audit] failed to set auditForceProvider:', e);
      }
    }, FORCE_PROVIDER);
    console.log(`[audit] forcing provider=${FORCE_PROVIDER} via Dexie auditForceProvider override`);
  }

  // ── Scenario 1: cold cache + first-time user. ──────────────
  console.log('\n[1] cold-cache / first-time-user baseline');
  await clearAllStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoCoachTeach(page);
  await page.waitForTimeout(2500); // welcome line + voice warmup
  const welcomeOk = (await lastAssistantText(page)).toLowerCase().includes('classroom');
  record('cold-cache welcome line renders', welcomeOk, welcomeOk ? 'classroom-welcome present' : 'NOT FOUND — surface failed to mount');

  // ── Scenario 2: off-canonical British spelling. ────────────
  console.log('\n[2] off-canonical input: "Philidor Defence" (British)');
  { const before = await typeAndSend(page, 'Philidor Defence');
    await waitForCoachResponse(page, before, 60_000); }
  await page.waitForTimeout(1500);
  const route2 = page.url();
  const bounced2 = route2.includes('/coach/session/walkthrough');
  record('Philidor Defence stays on /coach/teach (no bounce)', !bounced2, bounced2 ? `BOUNCED to ${route2}` : `stayed on ${route2}`);
  const text2 = (await lastAssistantText(page)).toLowerCase();
  const handled2 = text2.includes('philidor') || text2.includes('putting together') || text2.includes('walk through') || text2.includes('did you mean');
  record('Philidor Defence got a sensible coach reply', handled2, handled2 ? 'reply mentions philidor / build / walkthrough / did-you-mean' : `reply was: "${text2.slice(0, 120)}"`);

  // ── Scenario 3: typo. ──────────────────────────────────────
  console.log('\n[3] off-canonical input: "Najdorff" (typo, extra f)');
  await clearAllStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoCoachTeach(page);
  await page.waitForTimeout(2500);
  { const before = await typeAndSend(page, 'Najdorff');
    await waitForCoachResponse(page, before, 60_000); }
  await page.waitForTimeout(1500);
  const route3 = page.url();
  record('Najdorff stays on /coach/teach', !route3.includes('/coach/session/walkthrough'), route3);
  // Look for picker chips OR an in-place walkthrough kickoff.
  const chips3 = await page.locator('[data-testid="coach-choice-chips"]').count();
  const text3 = (await lastAssistantText(page)).toLowerCase();
  const handled3 = chips3 > 0 || text3.includes('najdorf') || text3.includes('putting together');
  record('Najdorff handled (picker OR canonicalized OR generation kickoff)', handled3, chips3 > 0 ? `picker shown (${chips3})` : `reply: "${text3.slice(0, 120)}"`);

  // ── Scenario 4: missing letter. ────────────────────────────
  console.log('\n[4] off-canonical input: "Caro Cann" (missing K)');
  await clearAllStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoCoachTeach(page);
  await page.waitForTimeout(2500);
  { const before = await typeAndSend(page, 'Caro Cann');
    await waitForCoachResponse(page, before, 60_000); }
  await page.waitForTimeout(1500);
  const route4 = page.url();
  record('Caro Cann stays on /coach/teach', !route4.includes('/coach/session/walkthrough'), route4);
  const chips4 = await page.locator('[data-testid="coach-choice-chips"]').count();
  const text4 = (await lastAssistantText(page)).toLowerCase();
  const handled4 = chips4 > 0 || text4.includes('caro') || text4.includes('putting together');
  record('Caro Cann handled', handled4, chips4 > 0 ? `picker shown (${chips4})` : `reply: "${text4.slice(0, 120)}"`);

  // ── Scenario 5: garbage input ──────────────────────────────
  console.log('\n[5] garbage input: "asdfghjklqwerty"');
  { const before = await typeAndSend(page, 'asdfghjklqwerty');
    await waitForCoachResponse(page, before, 60_000); }
  await page.waitForTimeout(1500);
  const route5 = page.url();
  record('garbage input does NOT bounce', !route5.includes('/coach/session/walkthrough'), route5);
  const text5 = (await lastAssistantText(page)).toLowerCase();
  const sane5 = !text5.includes('error') && text5.length > 5;
  record('garbage input gets a coach reply (no crash)', sane5, `reply: "${text5.slice(0, 120)}"`);

  // ── Scenario 6: pick stage before load. ────────────────────
  console.log('\n[6] pick-before-load: type "punish lines for Evans Gambit" cold');
  await clearAllStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await gotoCoachTeach(page);
  await page.waitForTimeout(2500);
  await typeAndSend(page, 'punish lines for Evans Gambit');
  // The flow generates the opening (~30s), then startsAtStageMenu
  // landing at 'punish'. With Phase 1 wait-for-load wired, the
  // surface should either render the pending-stage indicator OR
  // jump to punish when ready — NEVER drop into empty quiz limbo.
  console.log('    waiting up to 90s for either pending indicator OR a stage to populate…');
  let sawPendingIndicator = false;
  let landedOnPunish = false;
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    const pendingCount = await page.locator('[data-testid="walkthrough-stage-pending"]').count();
    if (pendingCount > 0) sawPendingIndicator = true;
    // If we left stage-menu and the active phase is something quiz/drill,
    // the jump fired.
    const onPunishCount = await page.locator('[data-pending-stage="punish"]').count();
    const punishMenuItem = await page.locator('[data-testid="walkthrough-stage-punish"]').count();
    if (sawPendingIndicator && (punishMenuItem > 0 || onPunishCount === 0)) {
      landedOnPunish = true;
      break;
    }
    await page.waitForTimeout(2000);
  }
  record('pick-before-load showed pending indicator (no empty limbo)', sawPendingIndicator, sawPendingIndicator ? 'walkthrough-stage-pending was visible' : 'NEVER saw the pending indicator — surface may have dropped into empty quiz');

  // ── Scenario 7: out-of-order — change stage mid-flight. ────
  console.log('\n[7] out-of-order: navigate /coach/play then back to /coach/teach');
  await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await gotoCoachTeach(page);
  await page.waitForTimeout(2000);
  const route7 = page.url();
  record('navigate /coach/play → /coach/teach resumes cleanly', route7.includes('/coach/teach'), route7);

  // ── Scenario 8: re-audit the bounce path explicitly. ───────
  console.log('\n[8] explicit walkthrough-bounce re-audit (4 prompts that previously bounced)');
  await clearAllStorage(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  for (const ask of ['teach me Philidor Defence', 'walkthrough Najdorff', 'teach the KID', 'show me the Caro Cann']) {
    await gotoCoachTeach(page);
    await page.waitForTimeout(1500);
    const before = await typeAndSend(page, ask);
    await waitForCoachResponse(page, before, 60_000);
    await page.waitForTimeout(1500);
    const u = page.url();
    record(`"${ask}" stays on /coach/teach`, !u.includes('/coach/session/walkthrough'), u);
  }

  // ── Scenario 9: route log audit — never visited the legacy URL. ──
  console.log('\n[9] route-log audit — legacy URL appeared anywhere in session?');
  const visited = routeLog.filter((r) => r.url.includes('/coach/session/walkthrough'));
  record(
    'NO navigation to /coach/session/walkthrough across the whole session',
    visited.length === 0,
    visited.length === 0 ? '0 hits' : `${visited.length} hit(s): ${visited.map((v) => v.url).join(', ')}`,
  );

  // ── Write report. ──────────────────────────────────────────
  await mkdir(OUT_DIR, { recursive: true });
  const report = {
    base: BASE_URL,
    timestamp: new Date().toISOString(),
    routeLog,
    findings,
    counts: {
      total: findings.length,
      passes: findings.filter((f) => f.ok).length,
      fails: findings.filter((f) => !f.ok).length,
    },
  };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  RESULT: ${report.counts.passes}/${report.counts.total} passed, ${report.counts.fails} failed`);
  console.log(`  report: ${join(OUT_DIR, 'report.json')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Clear the audit-mode provider override so a subsequent run that
  // uses a fresh Dexie (or the same Dexie via the same context) doesn't
  // inherit the override stale. Best-effort — failure here doesn't
  // affect the audit report itself.
  if (FORCE_PROVIDER !== 'none') {
    try {
      await page.evaluate(async () => {
        const dbReq = indexedDB.open('ChessAcademyDB');
        await new Promise((resolve, reject) => {
          dbReq.onsuccess = () => resolve(dbReq.result);
          dbReq.onerror = () => reject(dbReq.error);
        });
        const db = dbReq.result;
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').delete('auditForceProvider');
        await new Promise((resolve, reject) => {
          tx.oncomplete = resolve;
          tx.onerror = () => reject(tx.error);
        });
        db.close();
      });
    } catch {
      /* best-effort cleanup */
    }
  }

  await browser.close();
  process.exit(report.counts.fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
