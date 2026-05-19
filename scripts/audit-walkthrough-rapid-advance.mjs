#!/usr/bin/env node
/**
 * G7 interactive audit: rapidly fires Next clicks on a walkthrough
 * and verifies only the LATEST narration plays — no stale-audio
 * pile-up.
 *
 * Reproduces David's 2026-05-19 report: "I rapidly fast forwarded
 * through like 7 or 8 moves in a walk through and I get like 3
 * voices narrating all at once from the previous lines that I blew
 * past."
 *
 * Detection strategy:
 *  - Watch for /api/tts requests fired and per-request
 *    completion-vs-abort
 *  - Probe document.querySelectorAll('audio') to count live audio
 *    elements; expect 0 or 1 unaborted at any time
 *  - After rapid-clicking through 8 plies, count how many distinct
 *    audio elements are still in the document with `src` set
 *
 * Pass criteria: at most 1 audio element actively playing after the
 * rapid-click sequence. Fail = race detected.
 */

import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const OPENING = process.env.OPENING ?? 'italian-game';
const RAPID_CLICKS = parseInt(process.env.RAPID_CLICKS ?? '8', 10);
const CLICK_INTERVAL_MS = parseInt(process.env.CLICK_INTERVAL_MS ?? '150', 10);

async function main() {
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  // Track TTS fetch + abort signals
  const ttsRequests = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/tts')) {
      ttsRequests.push({ at: Date.now(), url: req.url().slice(0, 120), kind: 'request' });
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('/api/tts')) {
      ttsRequests.push({ at: Date.now(), url: req.url().slice(0, 120), kind: 'aborted', failure: req.failure()?.errorText });
    }
  });
  page.on('requestfinished', (req) => {
    if (req.url().includes('/api/tts')) {
      ttsRequests.push({ at: Date.now(), url: req.url().slice(0, 120), kind: 'finished' });
    }
  });

  console.log(`Boot + seed openings (this can take 60s if cold)`);
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const seedOk = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
  if (!seedOk) { console.error('seed failed'); process.exit(2); }

  console.log(`Navigating to /openings/${OPENING}`);
  await page.goto(`${BASE_URL}/openings/${OPENING}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(2000);

  // Launch walkthrough
  const wt = page.locator('[data-testid="walkthrough-btn"]').first();
  await wt.click({ timeout: 5000 });
  await page.locator('[data-testid="walkthrough-mode"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(3000);

  console.log(`\nNow rapidly clicking Next ${RAPID_CLICKS}x at ${CLICK_INTERVAL_MS}ms intervals (sim user blasting through plies)`);
  const tNext = page.locator('[data-testid="nav-next"]').first();
  const startTime = Date.now();
  for (let i = 0; i < RAPID_CLICKS; i++) {
    await tNext.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(CLICK_INTERVAL_MS);
  }
  console.log(`Rapid sequence done in ${Date.now() - startTime}ms`);

  // Wait a moment for any in-flight audio to either finish or abort
  await page.waitForTimeout(3000);

  // Probe the DOM for active audio elements
  const audioState = await page.evaluate(() => {
    const audios = Array.from(document.querySelectorAll('audio'));
    return audios.map((a) => ({
      src: a.src ? a.src.slice(0, 80) : null,
      currentTime: a.currentTime,
      paused: a.paused,
      readyState: a.readyState,
      ended: a.ended,
      duration: a.duration,
      hasSrc: !!a.getAttribute('src'),
    }));
  });

  // Count: how many TTS requests were fired vs finished cleanly
  const counts = ttsRequests.reduce((acc, r) => { acc[r.kind] = (acc[r.kind] || 0) + 1; return acc; }, {});

  console.log('\n=== RESULTS ===');
  console.log('TTS request events:');
  for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  console.log('');
  console.log(`Audio elements found in DOM: ${audioState.length}`);
  let activelyPlaying = 0;
  for (const a of audioState) {
    const playing = !a.paused && !a.ended && a.hasSrc;
    if (playing) activelyPlaying++;
    console.log(`  src=${a.src} paused=${a.paused} ended=${a.ended} hasSrc=${a.hasSrc} t=${a.currentTime.toFixed(2)}s`);
  }

  console.log('');
  if (activelyPlaying > 1) {
    console.log(`❌ FAIL: ${activelyPlaying} audio elements actively playing simultaneously after rapid clicks`);
    console.log(`This is the bug David reported — voice queue isn't being cancelled between Next clicks.`);
    await browser.close();
    process.exit(2);
  } else {
    console.log(`✓ PASS: ${activelyPlaying} audio elements active. Voice cancellation working under rapid clicks.`);
    await browser.close();
    process.exit(0);
  }
}

main().catch((e) => { console.error('fatal:', e); process.exit(1); });
