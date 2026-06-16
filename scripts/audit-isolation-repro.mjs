#!/usr/bin/env node
/**
 * audit-isolation-repro — classify a loop "silent-hang" as REAL vs LOAD.
 * Doctrine (David 2026-06-12): a silent-hang under a fast adversarial loop
 * may be brain-proxy saturation, not a bug. Prove it by repro in ISOLATION —
 * ONE input, FRESH page, no other traffic. If it answers in a few seconds
 * alone, the loop hang was load. Each input gets its own fresh context.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const INPUTS = [
  'teach me the Vienna',                                   // control (known good)
  'what is the single best move and why is it winning?',   // loop silent-hang
  'Réti Opening',                                          // loop silent-hang
];

async function run(browser, text) {
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'AuditIsoBot/1.0' });
  const page = await ctx.newPage();
  let firstSign = null;
  const t0 = Date.now();
  page.on('console', () => {});
  // any brain/route sign of life
  page.on('request', (r) => {
    if (firstSign) return;
    const u = r.url();
    if (/\/api\/(llm|tts)|deepseek|anthropic|lichess-explorer/.test(u)) firstSign = { what: 'network', ms: Date.now() - t0, u: u.slice(0, 60) };
  });
  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.count()) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => {}); await calib.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); }
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    const help = page.locator('[data-testid="page-help-modal"]'); if (await help.count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    const input = page.locator('[data-testid="chat-text-input"]');
    await input.waitFor({ timeout: 15000 });
    const beforeLen = (await page.locator('body').innerText().catch(() => '')).length;
    const ts = Date.now();
    await input.fill(text, { timeout: 8000 });
    await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 8000, force: true });
    // wait up to 90s for ANY response form: a walkthrough panel, a line
    // picker, a returning-visitor chooser, or chat-text growth. (The first
    // detector only checked text growth and wrongly flagged the walkthrough-
    // panel responses as hangs.)
    let respMs = null;
    let respKind = null;
    const dl = Date.now() + 90000;
    while (Date.now() < dl) {
      const panel = await page.locator('[data-testid^="walkthrough-"], [data-testid="line-picker"], [data-testid="teach-picker"], [data-testid="teach-generation-progress"]').first().isVisible().catch(() => false);
      if (panel) { respMs = Date.now() - ts; respKind = 'panel'; break; }
      const len = (await page.locator('body').innerText().catch(() => '')).length;
      if (len > beforeLen + 40) { respMs = Date.now() - ts; respKind = 'text'; break; }
      await page.waitForTimeout(500);
    }
    console.log(`  "${text.slice(0, 50)}"  → firstNetwork=${firstSign ? firstSign.ms + 'ms' : 'NONE'}  responded=${respMs !== null ? `${respMs}ms (${respKind})` : 'NO (90s)'}`);
    return { text, firstSign, respMs };
  } finally {
    await ctx.close().catch(() => {});
  }
}

async function main() {
  console.log(`[iso] base=${BASE_URL}  (each input = its own fresh page, no concurrency)`);
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const results = [];
  for (const t of INPUTS) results.push(await run(browser, t));
  await browser.close().catch(() => {});
  const hung = results.filter((r) => r.respMs === null);
  console.log(`\n[iso] verdict: ${hung.length === 0 ? 'ALL answered in isolation → the loop hangs were LOAD/saturation' : `${hung.length} STILL hung alone → REAL: ${hung.map((h) => `"${h.text.slice(0,40)}"`).join(', ')}`}`);
  process.exit(0);
}
main().catch((e) => { console.error('[iso] FATAL', e); process.exit(2); });
