#!/usr/bin/env node
/**
 * coach-teach-probe — a FOCUSED diagnostic: type "teach me the Vienna" on prod
 * and dump EXACTLY what's on screen into stdout (readable in the CI job log,
 * since artifact download needs auth). Resolves the three hypotheses for the
 * silent-hangs the loop audit found:
 *   (a) real walkthrough-start bug  (b) cold-deploy artifact  (c) stale harness
 *       (a walkthrough started but with a testid the harness no longer knows).
 *
 * Prints, at each poll: every data-testid present, the last transcript text,
 * the visible "generating/loading/snag" text, and the current URL. So we SEE
 * what "hang" actually means without a screenshot.
 *
 * Usage: node scripts/coach-teach-probe.mjs   (AUDIT_SMOKE_URL=prod)
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ headless: true, executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));

async function allTestids() {
  return page.evaluate(() =>
    [...document.querySelectorAll('[data-testid]')]
      .map((e) => e.getAttribute('data-testid'))
      .filter((v, i, a) => a.indexOf(v) === i),
  ).catch(() => []);
}
async function bodyText(max = 260) {
  return page.evaluate(() => document.body?.innerText || '').then((t) => t.replace(/\s+/g, ' ').trim().slice(0, max)).catch(() => '');
}
async function openingsSeeded() {
  return page.evaluate(() => new Promise((res) => {
    try {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('openings')) return res(0);
        const c = db.transaction('openings', 'readonly').objectStore('openings').count();
        c.onsuccess = () => res(c.result);
        c.onerror = () => res(-1);
      };
      req.onerror = () => res(-1);
    } catch { res(-1); }
  })).catch(() => -1);
}

console.log(`[probe] BASE=${BASE}`);
await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 40000 });
await page.waitForTimeout(2500);
// dismiss any modal
for (const t of ['strength-calibration-bubble', 'page-help-modal', 'ai-consent-modal']) {
  const el = page.locator(`[data-testid="${t}"]`);
  if (await el.isVisible().catch(() => false)) {
    await el.locator('button').first().click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(400);
  }
}
// wait for the chat input to be enabled
await page.waitForFunction(() => {
  const el = document.querySelector('[data-testid="chat-text-input"]');
  return el && !el.disabled;
}, { timeout: 60000 }).catch(() => console.log('[probe] WARN: chat-text-input never enabled in 60s'));

// wait for the openings deferred-seed (rules out a seed race as a false hang)
let seeded = 0;
for (let i = 0; i < 18; i++) {  // up to ~90s
  seeded = await openingsSeeded();
  console.log(`[probe] seed poll ${i}: openings in Dexie = ${seeded}`);
  if (seeded >= 100) break;
  await page.waitForTimeout(5000);
}
console.log(`[probe] openings seeded = ${seeded}`);
console.log(`[probe] testids BEFORE ask: ${(await allTestids()).join(', ')}`);

// TYPE the exact input that silent-hung in the loop
const input = page.locator('[data-testid="chat-text-input"]');
await input.click({ timeout: 5000 }).catch(() => {});
await input.fill('teach me the Vienna');
await page.keyboard.press('Enter');
console.log(`[probe] >>> typed "teach me the Vienna" @ ${new Date().toISOString()}`);

// poll for 75s, dumping the full on-screen state
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(5000);
  const ids = await allTestids();
  const notable = ids.filter((x) => /walkthrough|teach|lesson|quiz|drill|punish|line-picker|generation|coach|fork|leaf|stage|narrat|snag|error/i.test(x));
  console.log(`[probe] t+${(i + 1) * 5}s url=${page.url().replace(BASE, '')} | notable-testids=[${notable.join(', ')}]`);
  console.log(`         body="${await bodyText()}"`);
}
console.log(`[probe] console/page errors: ${errs.length}`);
for (const e of errs.slice(0, 15)) console.log('   •', e);
await browser.close();
console.log('[probe] done');
