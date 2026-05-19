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

async function clearAllStorage(page) {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
    }
    try { localStorage.clear(); } catch (e) { /* sandbox */ }
    try { sessionStorage.clear(); } catch (e) { /* sandbox */ }
  });
}

async function typeAndSend(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.click();
  await input.fill(text);
  await page.locator('[data-testid="chat-send-btn"]').click();
}

async function waitForCoachResponse(page, timeoutMs = 30_000) {
  // The assistant's reply renders as a chat-message with role=assistant.
  // Wait for the message count to grow OR for the typing indicator to
  // disappear.
  const before = await page.locator('[data-testid^="chat-message-"]').count();
  await page.waitForFunction(
    (prev) => document.querySelectorAll('[data-testid^="chat-message-"]').length > prev,
    before,
    { timeout: timeoutMs },
  );
  // Give the stream a beat to settle.
  await page.waitForTimeout(800);
}

async function lastAssistantText(page) {
  const msgs = page.locator('[data-testid^="chat-message-"]');
  const count = await msgs.count();
  if (count === 0) return '';
  for (let i = count - 1; i >= 0; i--) {
    const m = msgs.nth(i);
    const role = await m.getAttribute('data-role');
    if (role === 'assistant') return (await m.textContent()) ?? '';
  }
  return '';
}

async function gotoCoachTeach(page) {
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
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
  });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await ctx.newPage();

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
  // deepseek is much cheaper." The flag is set in Dexie's meta table;
  // getProviderConfig reads it and honors the override without
  // touching real user preferences. Set this AFTER the initial goto
  // so Dexie is open. Default: force deepseek; opt out with
  // AUDIT_FORCE_PROVIDER=anthropic to test the production path.
  const FORCE_PROVIDER = process.env.AUDIT_FORCE_PROVIDER ?? 'deepseek';
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
  await typeAndSend(page, 'Philidor Defence');
  await waitForCoachResponse(page, 60_000);
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
  await typeAndSend(page, 'Najdorff');
  await waitForCoachResponse(page, 60_000);
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
  await typeAndSend(page, 'Caro Cann');
  await waitForCoachResponse(page, 60_000);
  await page.waitForTimeout(1500);
  const route4 = page.url();
  record('Caro Cann stays on /coach/teach', !route4.includes('/coach/session/walkthrough'), route4);
  const chips4 = await page.locator('[data-testid="coach-choice-chips"]').count();
  const text4 = (await lastAssistantText(page)).toLowerCase();
  const handled4 = chips4 > 0 || text4.includes('caro') || text4.includes('putting together');
  record('Caro Cann handled', handled4, chips4 > 0 ? `picker shown (${chips4})` : `reply: "${text4.slice(0, 120)}"`);

  // ── Scenario 5: garbage input ──────────────────────────────
  console.log('\n[5] garbage input: "asdfghjklqwerty"');
  await typeAndSend(page, 'asdfghjklqwerty');
  await waitForCoachResponse(page, 60_000);
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
    await typeAndSend(page, ask);
    await waitForCoachResponse(page, 60_000);
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
