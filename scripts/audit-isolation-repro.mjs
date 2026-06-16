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
const INPUTS = (process.env.AUDIT_ISO_INPUTS
  ? process.env.AUDIT_ISO_INPUTS.split('||')
  : [
      'teach me the Vienna',                                   // control (known good)
      'what is the single best move and why is it winning?',   // loop silent-hang
      'Réti Opening',                                          // loop silent-hang
    ]);
import { mkdir } from 'node:fs/promises';
const SHOT_DIR = 'audit-reports/iso-shots';

async function run(browser, text) {
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'AuditIsoBot/1.0' });
  const page = await ctx.newPage();
  let askFiredMs = null;   // brain REQUEST went out
  let llmDoneMs = null;    // brain RESPONSE returned (the authoritative "answered")
  let ttsMs = null;        // voice fired (answer produced)
  let armed = false;       // only count signals AFTER we send the input
  let ts = 0;
  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push({ name: err?.name, message: err?.message || '(empty)', stack: (err?.stack || '').slice(0, 600) });
  });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  const isLLM = (u) => /\/api\/llm|deepseek|anthropic/.test(u);
  const isTTS = (u) => /\/api\/tts\b/.test(u);
  page.on('request', (r) => { if (armed && askFiredMs === null && isLLM(r.url())) askFiredMs = Date.now() - ts; });
  page.on('response', (r) => {
    if (!armed) return;
    const u = r.url();
    if (llmDoneMs === null && isLLM(u)) llmDoneMs = Date.now() - ts;
    if (ttsMs === null && isTTS(u)) ttsMs = Date.now() - ts;
  });
  try {
    // Single full load of /coach/teach, then WAIT OUT THE BOOT SPLASH + the
    // deferred seed (25-60s) before the chat input exists — the prior probe
    // did a 2nd page.goto that re-triggered the splash and gave up at 15s,
    // sitting on the loading screen (false "no response").
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const a = window.__AUDIT__;
      return !!a && typeof a.isStreamHydrated === 'function' && a.isStreamHydrated();
    }, { timeout: 45000 }).catch(() => {});
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.count()) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => {}); await calib.waitFor({ state: 'detached', timeout: 20000 }).catch(() => {}); }
    const help = page.locator('[data-testid="page-help-modal"]'); if (await help.count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
    const input = page.locator('[data-testid="chat-text-input"]');
    await mkdir(SHOT_DIR, { recursive: true }).catch(() => {});
    const slug = text.slice(0, 16).replace(/[^a-z0-9]/gi, '_');
    // Wait (up to 60s) for the input to actually exist — i.e. boot is done.
    const appeared = await input.waitFor({ state: 'visible', timeout: 60000 }).then(() => true).catch(() => false);
    await page.screenshot({ path: `${SHOT_DIR}/${slug}-before.png` }).catch(() => {});
    console.log(`    [${slug}] chat-input ready=${appeared} url=${page.url()}`);
    if (!appeared) { console.log(`  "${text.slice(0, 48)}"  → BOOT-FAILED (input never appeared) — harness, not app`); return { text, harnessFail: true }; }
    // Baseline: a NARRATING walkthrough panel that's already up (none expected
    // on a fresh teach — the ever-present empty-state teach-picker is NOT a
    // response and is intentionally excluded).
    const narratingVisible = async () => page.locator('[data-testid="walkthrough-narrating-panel"], [data-testid="walkthrough-fork-panel"], [data-testid="walkthrough-leaf-panel"], [data-testid="line-picker"]').first().isVisible().catch(() => false);
    const baseNarrating = await narratingVisible();
    const beforeLen = (await page.locator('body').innerText().catch(() => '')).length;

    ts = Date.now();
    armed = true;
    if (text === 'MASH') {
      // Reproduce the loop's chaos #1: rapid-fire opening names without
      // letting each settle — the suspected trigger of the 51-pageerror
      // flood on "Sicilian" (a fast-use render/state collision invisible
      // in slow play). Do several rounds to provoke the flood.
      for (let round = 0; round < 4; round++) {
        for (const t of ['Vienna', 'Sicilian', 'teach me the Najdorf', 'Caro-Kann']) {
          await input.fill(t, { timeout: 3000 }).catch(() => {});
          await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 3000, force: true }).catch(() => {});
          await page.waitForTimeout(130); // mash — don't settle
        }
      }
      await page.waitForTimeout(6000);
    } else {
      await input.fill(text, { timeout: 8000 });
      await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 8000, force: true });
    }

    // Authoritative "responded" = the brain RESPONSE returned, OR the voice
    // fired, OR a NARRATING lesson panel/line-picker newly appeared, OR the
    // chat transcript grew. NOT the pre-existing empty-state picker.
    let respMs = null;
    let respKind = null;
    const dl = Date.now() + 90000;
    while (Date.now() < dl) {
      if (llmDoneMs !== null) { respMs = llmDoneMs; respKind = 'llm-response'; break; }
      if (ttsMs !== null) { respMs = ttsMs; respKind = 'tts'; break; }
      if (!baseNarrating && (await narratingVisible())) { respMs = Date.now() - ts; respKind = 'lesson-panel'; break; }
      const len = (await page.locator('body').innerText().catch(() => '')).length;
      if (len > beforeLen + 60) { respMs = Date.now() - ts; respKind = 'text'; break; }
      await page.waitForTimeout(400);
    }
    // Give errors time to fire, then try interacting with a line-picker
    // variation (the loop's pageerror flood was on "Sicilian" → picker).
    await page.waitForTimeout(2500);
    const variation = page.locator('[data-testid^="line-picker-option"], [data-testid="line-picker"] button').first();
    if (await variation.count()) { await variation.click({ force: true, timeout: 3000 }).catch(() => {}); await page.waitForTimeout(3000); }
    await page.screenshot({ path: `${SHOT_DIR}/${slug}-after.png` }).catch(() => {});
    const inputDisabled = await input.isDisabled().catch(() => 'unknown');
    console.log(`  "${text.slice(0, 48)}"  → askFired=${askFiredMs ?? 'NONE'}ms  responded=${respMs !== null ? `${respMs}ms (${respKind})` : 'NO (90s)'}  inputDisabledAtEnd=${inputDisabled}`);
    console.log(`     pageErrors=${pageErrors.length}  consoleErrors=${consoleErrors.length}`);
    for (const e of pageErrors.slice(0, 4)) console.log(`     PAGEERROR [${e.name}] ${e.message}\n        ${e.stack.split('\n').slice(0, 4).join('\n        ')}`);
    for (const e of consoleErrors.slice(0, 4)) console.log(`     CONSOLE-ERR ${e}`);
    return { text, askFiredMs, respMs, respKind, pageErrors: pageErrors.length, consoleErrors: consoleErrors.length };
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
