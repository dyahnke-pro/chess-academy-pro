#!/usr/bin/env node
/**
 * coach-teach-probe — controlled experiment to find WHY the harness "silent-hangs"
 * on "teach me the Vienna" while the standalone probe starts it in 5s.
 *
 * Runs the SAME input three ways in three fresh contexts and dumps whether the
 * walkthrough started (walkthrough-narrating-panel appears):
 *   A) type + IMMEDIATELY force-click chat-send-btn   (what the harness does)
 *   B) type + WAIT for chat-send-btn enabled + click  (button-race hypothesis)
 *   C) type + press Enter                             (what the working probe does)
 *
 * If A hangs but C works → the send is a disabled-button race → fix = press Enter
 * (or wait-for-enabled) in the harness.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ headless: true, executablePath: exe });

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  return { ctx, page };
}
async function boot(page) {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await page.waitForTimeout(2500);
  for (const t of ['strength-calibration-bubble', 'page-help-modal', 'ai-consent-modal']) {
    const el = page.locator(`[data-testid="${t}"]`);
    if (await el.isVisible().catch(() => false)) {
      await el.locator('button').first().click({ timeout: 3000 }).catch(() => {});
      await page.waitForTimeout(400);
    }
  }
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="chat-text-input"]');
    return el && !el.disabled;
  }, { timeout: 60000 }).catch(() => {});
  // let the openings seed settle
  for (let i = 0; i < 12; i++) {
    const n = await page.evaluate(() => new Promise((res) => {
      try { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('openings')) return res(0); const c = db.transaction('openings','readonly').objectStore('openings').count(); c.onsuccess = () => res(c.result); c.onerror = () => res(-1); }; r.onerror = () => res(-1); } catch { res(-1); }
    })).catch(() => -1);
    if (n >= 100) break;
    await page.waitForTimeout(3000);
  }
}
async function typeText(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.fill('');
  await input.pressSequentially(text, { delay: 4 });
}
async function started(page, secs = 45) {
  for (let i = 0; i < secs / 3; i++) {
    const panel = await page.locator('[data-testid="walkthrough-narrating-panel"]').isVisible().catch(() => false);
    const gen = await page.locator('[data-testid="teach-generation-progress"]').isVisible().catch(() => false);
    if (panel || gen) return `STARTED @ ${(i + 1) * 3}s (${panel ? 'narrating-panel' : 'generation-progress'})`;
    await page.waitForTimeout(3000);
  }
  return 'NEVER STARTED';
}
async function sendBtnState(page) {
  return page.evaluate(() => {
    const b = document.querySelector('[data-testid="chat-send-btn"]');
    return b ? { disabled: b.disabled, ariaDisabled: b.getAttribute('aria-disabled') } : 'no-btn';
  }).catch(() => 'err');
}

const INPUT = 'teach me the Vienna';

// Warm the coach LLM function first so cold-vs-warm doesn't confound A/B/C.
try {
  for (let i = 0; i < 3; i++) {
    await fetch(`${BASE}/api/llm-proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ warm: 1 }) }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log('[probe] warmed llm-proxy');
} catch { /* ignore */ }

// A) type + immediate force-click send-btn (harness behavior)
{
  const { ctx, page } = await newPage();
  await boot(page);
  await typeText(page, INPUT);
  console.log(`[A] send-btn state right after typing: ${JSON.stringify(await sendBtnState(page))}`);
  await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch((e) => console.log('[A] click err', e.message.slice(0, 60)));
  console.log(`[A] immediate force-click send-btn → ${await started(page)}`);
  await ctx.close();
}
// B) type + wait for send-btn enabled + click
{
  const { ctx, page } = await newPage();
  await boot(page);
  await typeText(page, INPUT);
  const enabled = await page.waitForFunction(() => {
    const b = document.querySelector('[data-testid="chat-send-btn"]');
    return b && !b.disabled && b.getAttribute('aria-disabled') !== 'true';
  }, { timeout: 8000 }).then(() => true).catch(() => false);
  console.log(`[B] waited for send-btn enabled: ${enabled}`);
  await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => {});
  console.log(`[B] wait-enabled + click send-btn → ${await started(page)}`);
  await ctx.close();
}
// C) type + press Enter (working-probe behavior)
{
  const { ctx, page } = await newPage();
  await boot(page);
  await typeText(page, INPUT);
  await page.keyboard.press('Enter');
  console.log(`[C] press Enter → ${await started(page)}`);
  await ctx.close();
}

await browser.close();
console.log('[probe] done');
