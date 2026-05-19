#!/usr/bin/env node
/**
 * audit-coach-teach-explore.mjs
 * -----------------------------
 * "First-time user exploration" audit — drives /coach/teach (and the
 * surrounding hub) the way a curious new user would. Not a checklist;
 * not a scripted regression. The point is to expose the surface to
 * real-world poking: misspellings, taps on things that aren't ready,
 * navigating away mid-flow, coming back, asking the coach weird
 * questions.
 *
 * Records the whole session as a .webm video the user can watch back.
 *
 * David requested this on 2026-05-19 as the bootstrap interactive
 * audit under the new G7 standard.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-teach-explore-${stamp}`;
const VIDEO_DIR = join(OUT_DIR, 'video');

function log(line) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${line}`);
}

async function pause(page, ms, label) {
  if (label) log(`  ⏳ ${label} (${ms}ms)`);
  await page.waitForTimeout(ms);
}

async function tryFill(page, selector, text) {
  try {
    const el = page.locator(selector);
    await el.waitFor({ state: 'visible', timeout: 4000 });
    await el.click();
    await el.fill(text);
    return true;
  } catch {
    return false;
  }
}

async function tryClick(page, selector, opts) {
  try {
    const el = page.locator(selector);
    await el.waitFor({ state: 'visible', timeout: opts?.timeout ?? 4000 });
    await el.click();
    return true;
  } catch {
    return false;
  }
}

async function send(page, text) {
  log(`  ⌨  type: "${text}"`);
  const ok = await tryFill(page, '[data-testid="chat-text-input"]', text);
  if (!ok) {
    log('  ⚠ chat input not present — skipping');
    return;
  }
  await pause(page, 600);
  await tryClick(page, '[data-testid="chat-send-btn"]');
}

async function waitForReply(page, maxMs = 45_000) {
  const start = Date.now();
  const beforeCount = await page.locator('[data-testid^="chat-message-"]').count();
  while (Date.now() - start < maxMs) {
    const now = await page.locator('[data-testid^="chat-message-"]').count();
    if (now > beforeCount) {
      await pause(page, 1200);
      return;
    }
    await page.waitForTimeout(500);
  }
  log('  ⚠ no new reply within budget — continuing anyway');
}

async function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  /coach/teach — first-time-user exploration');
  log(`  target: ${BASE_URL}`);
  log(`  video → ${VIDEO_DIR}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mkdir(VIDEO_DIR, { recursive: true });
  const executablePath = await resolveChromiumExecutable({
    preferred: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const browser = await chromium.launch({ headless: true, executablePath });
  // Mobile-ish portrait viewport — matches David's primary use surface
  // (iPhone) so the video reflects what the surface looks like there.
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 420, height: 900 } },
  });
  const page = await ctx.newPage();

  // Track navigations so we can correlate against the video later.
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) log(`  ↪ nav: ${frame.url()}`);
  });
  page.on('pageerror', (err) => log(`  ✗ pageerror: ${err.message}`));

  // ── Land on the app fresh ──────────────────────────────────
  log('\n▶ Step 1: land on the app for the very first time');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await pause(page, 3500, 'read the dashboard');

  // NB: skipping /openings — another session is working on that
  // surface today and concurrent driving would conflict.

  log('\n▶ Step 3: look at Tactics');
  await tryClick(page, 'a[href="/tactics"], [data-testid="nav-tactics"]');
  await pause(page, 3500, 'see tactics options');

  log('\n▶ Step 4: head to the Coach tab');
  await tryClick(page, 'a[href="/coach/home"], [data-testid="nav-coach"]');
  await pause(page, 3500, 'read the coach hub');

  log('\n▶ Step 5: tap Learn with Coach');
  await tryClick(page, '[data-testid="coach-action-teach"]');
  await pause(page, 4000, 'wait for the welcome line + voice + read it');

  // ── First-time user starts trying stuff in chat ────────────
  log('\n▶ Step 6: type the British spelling of an opening');
  await send(page, 'Philidor Defence');
  await waitForReply(page);

  log('\n▶ Step 7: get curious — try a typo');
  await send(page, 'show me the Najdorff');
  await waitForReply(page);

  log('\n▶ Step 8: try a missing-letter version');
  await send(page, 'teach me the Caro Cann');
  await waitForReply(page);

  log('\n▶ Step 9: try an acronym');
  await send(page, 'KID');
  await waitForReply(page);

  log('\n▶ Step 10: type something nonsensical to see what coach does');
  await send(page, 'asdfghjkl');
  await waitForReply(page);

  // ── Try the action picker chips above the input ────────────
  log('\n▶ Step 11: look at the picker chips above the input');
  await pause(page, 2500, 'visually scan the chips');
  // Tap "Trap lines" chip if present.
  const trapChipClicked = await tryClick(page, '[data-testid="picker-action-trap"], button:has-text("Trap")');
  if (trapChipClicked) {
    log('  ⌨  picker switched to Trap mode');
    await pause(page, 1200);
  }

  log('\n▶ Step 12: ask for trap lines on an opening that isn\'t cached');
  await send(page, 'trap lines for Evans Gambit');
  // Long-running generation — give it room.
  await waitForReply(page, 90_000);
  // Try picking a stage IMMEDIATELY while it might still be loading.
  log('\n▶ Step 13: tap a stage right away (pick-before-load probe)');
  await tryClick(page, '[data-testid="walkthrough-stage-punish"]', { timeout: 2000 });
  await pause(page, 4000, 'see what happens — pending indicator? jump? empty?');

  log('\n▶ Step 14: navigate to /coach/play (curious about the other coach mode)');
  await tryClick(page, 'a[href="/coach/home"], [data-testid="nav-coach"]');
  await pause(page, 2500);
  await tryClick(page, '[data-testid="coach-action-play"]');
  await pause(page, 3500, 'see the play surface');

  log('\n▶ Step 15: go back to Learn with Coach to see if state survived');
  await tryClick(page, 'a[href="/coach/home"], [data-testid="nav-coach"]');
  await pause(page, 2000);
  await tryClick(page, '[data-testid="coach-action-teach"]');
  await pause(page, 4000, 'is anything still active?');

  log('\n▶ Step 16: try the Training Plan tile (David\'s new wide tile)');
  await tryClick(page, 'a[href="/coach/home"], [data-testid="nav-coach"]');
  await pause(page, 2000);
  await tryClick(page, '[data-testid="coach-action-plan"]');
  await pause(page, 4000, 'read the rolodex');

  log('\n▶ Step 17: try the Endgame tile (David\'s new secondary slot)');
  await tryClick(page, 'a[href="/coach/home"], [data-testid="nav-coach"]');
  await pause(page, 2000);
  await tryClick(page, '[data-testid="coach-action-endgame"]');
  await pause(page, 4000, 'read endgame tabs');

  log('\n▶ Step 18: settings — what can a new user configure?');
  await tryClick(page, 'a[href="/settings"], [data-testid="nav-settings"]');
  await pause(page, 4000, 'scan settings');

  log('\n▶ Step 19: head back to Learn with Coach for one more typed test');
  await tryClick(page, 'a[href="/coach/home"], [data-testid="nav-coach"]');
  await pause(page, 1500);
  await tryClick(page, '[data-testid="coach-action-teach"]');
  await pause(page, 2500);
  await send(page, 'what should I learn first?');
  await waitForReply(page);

  log('\n▶ Done. closing context to flush video.');
  await pause(page, 1000);

  await ctx.close();
  await browser.close();

  log(`\n━━━ video saved to: ${VIDEO_DIR}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
