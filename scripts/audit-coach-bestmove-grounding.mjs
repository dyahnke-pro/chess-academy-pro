#!/usr/bin/env node
/**
 * audit-coach-bestmove-grounding — verifies the WO-coach-engine-grounding fix
 * on the DEPLOYED build (David 2026-06-09 "No bueno", PR #712).
 *
 * Drives /coach/play, plays a few moves to reach an off-book-ish position,
 * then asks "What is the best move here?" and asserts the coach ANSWERS —
 * i.e. the reply is NOT the cold stock fallback ("I can't verify which moves
 * are sound here from master practice right now … run the position through
 * the engine"). Before the fix, the bare-SAN gate flagged the forward
 * continuation in the best-move explanation and served exactly that string.
 *
 * Usage: AUDIT_SANDBOX=1 node scripts/audit-coach-bestmove-grounding.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const BOOT = 30_000;
const COLD = /can'?t verify which moves are sound|run the position through the engine|rather stay honest than guess/i;

async function main() {
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 }, userAgent: 'AuditCoachPlayBot/1.0 (bestmove)' });
  const page = await ctx.newPage();
  const results = [];
  const ok = (n, p, d) => { results.push({ n, p }); console.log(`${p ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };

  try {
    await page.goto(`${BASE_URL}/coach`, { waitUntil: 'domcontentloaded', timeout: BOOT });
    // Dismiss onboarding + page-help.
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => {});
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    await page.locator('[data-testid="coach-action-play"]').click({ timeout: 8000 }).catch(async () => {
      await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: BOOT });
    });
    await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: BOOT }).catch(() => {});
    const pageHelpClose = page.locator('[data-testid="page-help-modal"] [aria-label="Close"], [data-testid="page-help-close"]');
    if (await pageHelpClose.count()) await pageHelpClose.first().click({ timeout: 3000 }).catch(() => {});

    // A few moves into an off-beat structure (Bird's-ish): f4, then natural dev.
    const moves = [['f2', 'f4'], ['g1', 'f3'], ['e2', 'e3']];
    for (const [f, t] of moves) {
      await page.locator(`[data-square="${f}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator(`[data-square="${t}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(4000); // let the coach reply
    }

    // Open chat, ask the best-move question.
    await page.locator('[data-testid="play-chat-button"]').click({ timeout: 8000 });
    await page.locator('[data-testid="game-chat-panel"]').first().waitFor({ timeout: 6000 });
    await page.waitForTimeout(600);
    const panel = page.locator('[data-testid="game-chat-panel"]').first();
    const before = (await panel.innerText().catch(() => '')).length;
    const input = page.locator('[data-testid="game-chat-panel"] [data-testid="chat-text-input"]').first();
    await input.fill('What is the best move here and why?');
    await input.press('Enter');

    // Poll the whole panel for substantial new text (the coach reply), up to 90s.
    let full = '';
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(1500);
      full = await panel.innerText().catch(() => '');
      // grown well past (question echo + our prompt) → a real reply landed
      if (full.length > before + 80) break;
    }
    const grew = full.length > before + 80;
    const cold = COLD.test(full);
    console.log(`[diag] panel grew ${before}→${full.length} chars; tail: “${full.slice(-220).replace(/\s+/g, ' ')}”`);
    ok('coach produced a reply', grew, grew ? 'reply landed' : 'no reply within 90s');
    ok('reply is NOT the cold "run it through the engine" fallback', grew && !cold,
      cold ? 'STILL serving the stock refusal' : 'engaged answer');
  } catch (err) {
    ok('probe completed without throwing', false, err instanceof Error ? err.message : String(err));
  }

  const passed = results.filter((r) => r.p).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
