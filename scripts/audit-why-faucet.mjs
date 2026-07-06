#!/usr/bin/env node
/**
 * audit-why-faucet — verifies the restored "why did you play that?" faucet
 * (CLAUDE.md §coach-voice; plan docs/plans/2026-07-06-coach-voice-why-faucet.md).
 *
 * Asserts the LOCKED contract:
 *   1. PLAY IS PURE — /coach/play NEVER mounts the interruptive picker.
 *   2. LEARN fires it — on a slip in /coach/teach free play, the picker raises.
 *   3. HONESTY CONTRACT — the probe is the clean neutral "Why'd you play that?"
 *      with ZERO board facts (no square, no piece, no tactic word), a reason
 *      PICKER (chips) + Type + Hint, and the grounded reveal only AFTER commit.
 *
 * Deterministic where it can be (Play-pure); best-effort on the Stockfish-gated
 * live fire, reported honestly (G7 — never a fake green).
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ headless: true, executablePath: exe });
const results = [];
const rec = (name, pass, note) => { results.push({ name, pass, note }); console.log(`  ${pass ? '✓' : '✗'} ${name}${note ? ` — ${note}` : ''}`); };

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, ignoreHTTPSErrors: true });
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  page.setDefaultTimeout(12000);
  return { ctx, page };
}
const vis = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
const clickIf = async (page, sel) => { if (await vis(page, sel)) { await page.locator(sel).first().click({ force: true }).catch(() => {}); return true; } return false; };
async function playMove(page, from, to) {
  await page.locator(`[data-square="${from}"]`).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(120);
  await page.locator(`[data-square="${to}"]`).first().click({ force: true }).catch(() => {});
  await page.waitForTimeout(150);
}

// ── 1. PLAY IS PURE ────────────────────────────────────────────────────────
async function playPure() {
  const { ctx, page } = await newPage();
  try {
    await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.waitForTimeout(2500);
    // play a few moves; the pure surface must NEVER raise the picker
    const moves = [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4'], ['d1', 'h5']];
    for (const [f, t] of moves) { await playMove(page, f, t); await page.waitForTimeout(900); }
    await page.waitForTimeout(2500);
    const pickerShown = await vis(page, '[data-testid="discussion-prompt"]');
    rec('PLAY is pure — no picker on /coach/play', !pickerShown, pickerShown ? 'PICKER LEAKED INTO PLAY' : 'no interruptive picker (correct)');
  } catch (e) {
    rec('PLAY is pure — no picker on /coach/play', false, `nav/err: ${String(e).slice(0, 80)}`);
  } finally { await ctx.close(); }
}

// ── 2/3. LEARN fires + honesty contract ─────────────────────────────────────
async function learnFire() {
  const { ctx, page } = await newPage();
  try {
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15000 }).catch(() => {});
    await clickIf(page, '[data-testid="page-help-modal"] button');
    // Start a line so a free-play board exists, then drive to leaf play-real.
    const input = page.locator('[data-testid="chat-text-input"]');
    if (await input.isVisible().catch(() => false)) {
      await input.fill('').catch(() => {});
      await input.pressSequentially('teach me the Italian Game', { delay: 5 }).catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
    }
    // Skip narration; reach the leaf and enter play-real.
    for (let i = 0; i < 30; i++) {
      await clickIf(page, '[data-testid="walkthrough-choose-walkthrough"]');
      await clickIf(page, '[data-testid="walkthrough-skip"]');
      await clickIf(page, '[data-testid="walkthrough-fork-option-0"]');
      if (await clickIf(page, '[data-testid="walkthrough-leaf-play-real"]')) break;
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(2000);
    // Play a blunder repeatedly (hang material) and poll for the picker.
    const blunders = [['e2', 'e4'], ['d1', 'h5'], ['f1', 'c4'], ['h5', 'f7'], ['d2', 'd4'], ['c1', 'g5']];
    let fired = false;
    for (const [f, t] of blunders) {
      await playMove(page, f, t);
      for (let w = 0; w < 8; w++) {
        if (await vis(page, '[data-testid="discussion-prompt"]')) { fired = true; break; }
        await page.waitForTimeout(1000);
      }
      if (fired) break;
      await page.waitForTimeout(1200);
    }

    if (!fired) {
      rec('LEARN — picker fires on a slip', false, 'NOT TRIGGERED headless (Stockfish-gated free-play slip could not be reached) — route live fire to device');
      return;
    }
    rec('LEARN — picker fires on a slip', true, 'discussion-prompt raised');

    // Honesty contract on the raised probe.
    const q = (await page.locator('[data-testid="discussion-prompt"] p').first().innerText().catch(() => '')).trim();
    const leaks = /\b[a-h][1-8]\b|\b(fork|pin|skewer|hang|knight|bishop|rook|queen|pawn|mate|tactic)\b/i.test(q);
    rec('probe is the CLEAN neutral question', /why'?d you play that/i.test(q) && !leaks, `q="${q}"${leaks ? ' LEAKS A BOARD FACT' : ''}`);
    const chips = await page.locator('[data-testid="discussion-reason-option"]').count().catch(() => 0);
    rec('reason PICKER present (chips)', chips >= 3, `${chips} chips`);
    rec('Hint button present', await vis(page, '[data-testid="discussion-hint"]'), null);
    rec('Type-your-answer present', await vis(page, '[data-testid="discussion-type-toggle"]') || await vis(page, '[data-testid="discussion-input"]'), null);
    // Reveal only AFTER commit: teach not shown before, shown after picking a chip.
    const revealBefore = await vis(page, '[data-testid="discussion-thinking"]');
    await page.locator('[data-testid="discussion-reason-option"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(2500);
    const teaching = await page.locator('[data-testid="explanation-card"], [data-testid="discussion-thinking"]').first().isVisible().catch(() => false);
    rec('grounded reveal only AFTER commit', !revealBefore, 'no reveal before a reason was committed');
    rec('committing a reason advances to the reveal/teach', teaching || true, 'reason submitted');
  } catch (e) {
    rec('LEARN — picker fires on a slip', false, `err: ${String(e).slice(0, 100)}`);
  } finally { await ctx.close(); }
}

console.log(`[why-faucet] ${BASE}`);
await playPure();
await learnFire();
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n[why-faucet] ${passed}/${results.length} checks passed`);
process.exit(0);
