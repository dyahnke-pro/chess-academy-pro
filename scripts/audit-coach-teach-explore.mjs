#!/usr/bin/env node
/**
 * audit-coach-teach-explore.mjs
 * -----------------------------
 * First-time-user exploration of /coach/teach. Records the session
 * as .webm so a human can watch back.
 *
 * Lessons baked in from the 2026-05-19 first run:
 *   - Wait for the bottom-nav to actually mount BEFORE the first
 *     click. The sandbox cold-boot is 5-8s; tapping early = silent
 *     fail because the nav isn't on the page yet, and the script
 *     spends 8 minutes staring at the splash screen.
 *   - Use the real testids (`nav-coach-home-tab`, `nav-tactics-tab`,
 *     `coach-action-teach`) — NOT speculative `href` selectors.
 *   - After EVERY navigation, waitFor the new surface's landmark
 *     testid before proceeding. No fixed-time pauses for mount.
 *
 * David's instruction (2026-05-19): stay out of /openings — another
 * session is driving that surface in parallel.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-teach-explore-${stamp}`;
const VIDEO_DIR = join(OUT_DIR, 'video');

function log(line) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${line}`);
}

async function waitForMount(page, selector, label, ms = 15_000) {
  log(`  ⏳ wait for ${label}`);
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: ms });
    log(`  ✓ ${label} mounted`);
    return true;
  } catch (e) {
    log(`  ✗ ${label} NEVER MOUNTED (${ms}ms timeout)`);
    return false;
  }
}

async function tap(page, selector, label) {
  log(`  👆 tap: ${label}`);
  const el = page.locator(selector).first();
  try {
    await el.waitFor({ state: 'visible', timeout: 8000 });
    await el.click();
    return true;
  } catch (e) {
    log(`  ✗ tap "${label}" failed: ${e.message.split('\n')[0]}`);
    return false;
  }
}

async function send(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]').first();
  try {
    await input.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    log(`  ✗ chat input NOT visible — can't send "${text}"`);
    return false;
  }
  log(`  ⌨  type: "${text}"`);
  await input.click();
  await input.fill(text);
  await page.waitForTimeout(500);
  await page.locator('[data-testid="chat-send-btn"]').first().click();
  return true;
}

async function waitForReply(page, sinceCount, maxMs = 60_000) {
  try {
    await page.waitForFunction(
      (prev) => document.querySelectorAll('[data-testid^="chat-message-"]').length > prev,
      sinceCount,
      { timeout: maxMs },
    );
    await page.waitForTimeout(1500);
    return true;
  } catch {
    log(`  ⚠ no new chat message within ${maxMs}ms`);
    return false;
  }
}

async function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  /coach/teach exploration — first-time user');
  log(`  target: ${BASE_URL}`);
  log(`  video → ${VIDEO_DIR}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mkdir(VIDEO_DIR, { recursive: true });
  const executablePath = await resolveChromiumExecutable({
    preferred: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const browser = await chromium.launch({ headless: true, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 420, height: 900 } },
  });
  const page = await ctx.newPage();
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) log(`  ↪ url: ${frame.url()}`);
  });
  page.on('pageerror', (e) => log(`  ✗ pageerror: ${e.message}`));

  // ── Land + WAIT FOR MOUNT ──────────────────────────────────
  log('\n▶ Step 1: land on the app');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  // The bottom-nav is the universal mount signal — once it's
  // visible, the app shell has booted enough to receive clicks.
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'bottom-nav (app shell)', 20_000);
  await page.waitForTimeout(2000); // read the dashboard

  // ── Tap a few tabs as a curious new user ───────────────────
  log('\n▶ Step 2: poke around — Tactics first');
  await tap(page, '[data-testid="nav-tactics-tab"]', 'nav: Tactics');
  await page.waitForTimeout(2500);

  log('\n▶ Step 3: head to Coach');
  await tap(page, '[data-testid="nav-coach-home-tab"]', 'nav: Coach');
  await waitForMount(page, '[data-testid="coach-home-page"]', '/coach/home');
  await page.waitForTimeout(2000); // read the hub

  log('\n▶ Step 4: tap Learn with Coach');
  await tap(page, '[data-testid="coach-action-teach"]', 'Learn with Coach tile');
  await waitForMount(page, '[data-testid="coach-teach-page"]', '/coach/teach');
  await waitForMount(page, '[data-testid="chat-text-input"]', 'chat input');
  await page.waitForTimeout(3000); // welcome line + voice

  // ── Type stuff a confused new user would type ──────────────
  log('\n▶ Step 5: British spelling — "Philidor Defence"');
  let n = await page.locator('[data-testid^="chat-message-"]').count();
  if (await send(page, 'Philidor Defence')) await waitForReply(page, n);
  await page.waitForTimeout(2500);
  log(`  → on: ${page.url()}`);

  log('\n▶ Step 6: typo — "show me the Najdorff"');
  n = await page.locator('[data-testid^="chat-message-"]').count();
  if (await send(page, 'show me the Najdorff')) await waitForReply(page, n);
  await page.waitForTimeout(2500);

  log('\n▶ Step 7: missing letter — "teach me the Caro Cann"');
  n = await page.locator('[data-testid^="chat-message-"]').count();
  if (await send(page, 'teach me the Caro Cann')) await waitForReply(page, n);
  await page.waitForTimeout(2500);

  log('\n▶ Step 8: acronym — "KID"');
  n = await page.locator('[data-testid^="chat-message-"]').count();
  if (await send(page, 'KID')) await waitForReply(page, n);
  await page.waitForTimeout(2500);

  log('\n▶ Step 9: garbage — "asdfghjkl"');
  n = await page.locator('[data-testid^="chat-message-"]').count();
  if (await send(page, 'asdfghjkl')) await waitForReply(page, n);
  await page.waitForTimeout(2500);

  log('\n▶ Step 10: trap-lines on uncached opening + pick-before-load');
  n = await page.locator('[data-testid^="chat-message-"]').count();
  if (await send(page, 'trap lines for Evans Gambit')) {
    // Don't wait for full reply — race to tap the stage cold.
    await page.waitForTimeout(3000);
    log('  👆 attempting cold tap on punish stage (may not be ready yet)');
    await tap(page, '[data-testid="walkthrough-stage-punish"]', 'punish stage');
    // Let the pending indicator surface if our Phase 1 wait-for-load
    // fix is doing its job.
    await page.waitForTimeout(8000);
    const pending = await page.locator('[data-testid="walkthrough-stage-pending"]').count();
    log(`  → pending indicator visible: ${pending > 0 ? 'YES' : 'no'}`);
  }
  await page.waitForTimeout(4000);

  log('\n▶ Step 11: back to Coach, peek at Training Plan (David\'s new wide tile)');
  await tap(page, '[data-testid="nav-coach-home-tab"]', 'nav: Coach');
  await waitForMount(page, '[data-testid="coach-home-page"]', '/coach/home');
  await page.waitForTimeout(2000);
  await tap(page, '[data-testid="coach-action-plan"]', 'Training Plan tile');
  await page.waitForTimeout(3500);

  log('\n▶ Step 12: peek at Endgame (David\'s demoted secondary tile)');
  await tap(page, '[data-testid="nav-coach-home-tab"]', 'nav: Coach');
  await waitForMount(page, '[data-testid="coach-home-page"]', '/coach/home');
  await page.waitForTimeout(1500);
  await tap(page, '[data-testid="coach-action-endgame"]', 'Endgame tile');
  await page.waitForTimeout(3500);

  log('\n▶ Step 13: settings sweep');
  await tap(page, '[data-testid="nav-settings-tab"]', 'nav: Settings');
  await page.waitForTimeout(3000);

  log('\n▶ Step 14: one last typed prompt back on Learn');
  await tap(page, '[data-testid="nav-coach-home-tab"]', 'nav: Coach');
  await waitForMount(page, '[data-testid="coach-home-page"]', '/coach/home');
  await tap(page, '[data-testid="coach-action-teach"]', 'Learn with Coach tile');
  await waitForMount(page, '[data-testid="chat-text-input"]', 'chat input');
  await page.waitForTimeout(1500);
  n = await page.locator('[data-testid^="chat-message-"]').count();
  if (await send(page, 'what should I learn first?')) await waitForReply(page, n);
  await page.waitForTimeout(2500);

  log('\n▶ Done. closing context to flush video.');
  await ctx.close();
  await browser.close();
  log(`\n━━━ video saved to: ${VIDEO_DIR}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
