#!/usr/bin/env node
/**
 * audit-coach-why-reasoning — interactive proof that the coach DECIPHERS why the
 * engine likes a move on the live UI (David 2026-07-10). Drives /coach/play,
 * plays a few moves, then asks the WHY forms and asserts the reply is a GROUNDED
 * reasoning walk (names a move + a concrete idea / eval), NOT the cold stock
 * fallback and NOT empty. 3-instrument: this drives the DOM; pair with the prod
 * audit-stream pull for the emitted events.
 *
 * Usage: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-coach-why-reasoning.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const BOOT = 30_000;
const COLD = /can'?t verify which moves are sound|run the position through the engine|rather stay honest than guess/i;
// A grounded reasoning reply names a move and/or a concrete chess idea.
const GROUNDED = /\b([KQRBN]?[a-h]?x?[a-h][1-8]|castl|check|fork|pin|wins the|develops|outpost|pawn|knight|bishop|rook|queen|centre|center|attack|threat|eval|better|winning|equal|advantage)/i;

async function main() {
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 }, userAgent: 'AuditCoachPlayBot/1.0 (why-reasoning)' });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  await ctx.addInitScript(autoDismissCalibration); // CSS-based — a hand-rolled click races the bubble
  const page = await ctx.newPage();
  const results = [];
  const ok = (n, p, d) => { results.push({ n, p }); console.log(`${p ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };

  const dismiss = async () => {
    await page.locator('[data-testid="ai-consent-allow"]').click({ timeout: 5000 }).catch(() => {});
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 6000 }).catch(() => {});
    await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 }).catch(() => {});
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    const help = page.locator('[data-testid="page-help-modal"] [aria-label="Close"], [data-testid="page-help-close"]');
    if (await help.count()) await help.first().click({ timeout: 3000 }).catch(() => {});
  };

  const askAndRead = async (question) => {
    const panel = page.locator('[data-testid="game-chat-panel"]').first();
    const before = (await panel.innerText().catch(() => '')).length;
    const input = page.locator('[data-testid="game-chat-panel"] [data-testid="chat-text-input"]').first();
    await input.fill(question);
    await page.keyboard.press('Enter');
    // Wait for the reply to grow the panel.
    let text = '';
    for (let i = 0; i < 30; i += 1) {
      await page.waitForTimeout(1000);
      text = await panel.innerText().catch(() => '');
      if (text.length > before + 40) break;
    }
    return text.slice(before);
  };

  try {
    await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: BOOT });
    await dismiss();
    await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: BOOT });
    ok('board mounted', true);

    // Play a few moves into a real middlegame-ish position.
    for (const [f, t] of [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4']]) {
      await page.locator(`[data-square="${f}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(150);
      await page.locator(`[data-square="${t}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(3500);
    }

    // Desktop layout renders the chat panel inline — the button toggles the
    // mobile drawer. Click it only if the panel is not already mounted.
    if (!(await page.locator('[data-testid="game-chat-panel"]').count())) {
      await page.locator('[data-testid="play-chat-button"]').click({ timeout: 8000 }).catch(() => {});
    }
    await page.locator('[data-testid="game-chat-panel"]').first().waitFor({ timeout: 6000 });
    await page.waitForTimeout(500);

    for (const q of ['why is that the best move?', 'explain the engine\'s move', 'walk me through the engine line']) {
      const reply = await askAndRead(q);
      const grounded = reply.length > 20 && !COLD.test(reply) && GROUNDED.test(reply);
      ok(`why-form answered grounded: "${q}"`, grounded, reply.replace(/\s+/g, ' ').slice(0, 400));
    }
  } catch (e) {
    ok('audit ran without throwing', false, String(e).split('\n')[0]);
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.p).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  process.exit(passed === results.length ? 0 : 1);
}
main();
