#!/usr/bin/env node
/**
 * audit-read-position-prod — focused probe for the "Read this position"
 * coach-play narration affordance (usePositionNarration +
 * PositionNarrationBanner).
 *
 * Two regressions this guards (David's buddy report, 2026-06-12):
 *   1. The subtitle banner lived in the scroll container's normal flow,
 *      so scrolling pushed it off the top mid-narration. It must be
 *      `position: sticky` so it stays pinned.
 *   2. The button routed spoken sentences through speakForced, which the
 *      Coach Narration verbosity gate SILENCES on 'silent' / caps on
 *      'brief' — a dead control. It now routes through speakReadAloud
 *      (bypassVerbosity), so an explicit tap ALWAYS engages the voice
 *      path. We verify a /api/tts request fires after the tap even when
 *      the profile's coachNarration is forced to 'silent'.
 *
 * NOTE: headless Chromium can't reproduce the iOS-standalone-PWA
 * web-speech-after-async-gap block, so "voice physically audible on an
 * iPhone" is NOT something this proves — that caveat is flagged to David.
 * What it DOES prove: the banner is sticky, the tap engages the TTS
 * pipeline (request to /api/tts), and the verbosity gate no longer
 * swallows the explicit read.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-read-position-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/read-position-${stamp}`;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` → ${detail}` : ''}`);
}

async function clearOverlays(page) {
  // Either overlay can pop a beat AFTER navigation settles — wait briefly
  // for one to appear before dismissing, then loop (they re-open per
  // surface). Mirrors audit-coach-play's clearFirstRunOverlays.
  await Promise.race([
    page.locator('[data-testid="page-help-modal"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
    page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {}),
  ]);
  for (let i = 0; i < 4; i++) {
    let acted = false;
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.count()) {
      acted = true;
      await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 })
        .catch(() => page.getByText('Intermediate', { exact: false }).first().click({ timeout: 4000 }).catch(() => {}));
      await calib.waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    }
    const help = page.locator('[data-testid="page-help-modal"]');
    if (await help.count()) {
      acted = true;
      const close = page.locator('[data-testid="page-help-close"]');
      if (await close.count()) await close.first().click({ timeout: 4000 }).catch(() => {});
      else await page.keyboard.press('Escape').catch(() => {});
      await help.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    }
    if (!acted) break;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[read-position] base = ${BASE_URL}`);

  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath: await resolveChromiumExecutable(HEADED),
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();

  const ttsRequests = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/tts')) ttsRequests.push(req.url());
  });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await clearOverlays(page);

    // Force coachNarration = 'silent' so we prove the explicit read still
    // engages the voice path (the dead-button regression).
    await page.evaluate(async () => {
      const open = indexedDB.open('ChessAcademyDB');
      await new Promise((resolve) => {
        open.onsuccess = () => {
          const db = open.result;
          try {
            const tx = db.transaction('profiles', 'readwrite');
            const store = tx.objectStore('profiles');
            const getReq = store.get('main');
            getReq.onsuccess = () => {
              const p = getReq.result;
              if (p) {
                p.preferences = { ...(p.preferences || {}), coachNarration: 'silent', voiceEnabled: true, pollyEnabled: true };
                store.put(p);
              }
              resolve();
            };
            getReq.onerror = () => resolve();
          } catch { resolve(); }
        };
        open.onerror = () => resolve();
      });
    });

    // Navigate to /coach/play.
    await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await clearOverlays(page);
    await page.waitForTimeout(3000);

    // Make a couple of moves so there's a non-trivial position to read.
    async function move(from, to) {
      await page.locator(`[data-square="${from}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator(`[data-square="${to}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
    await move('e2', 'e4');
    await move('g1', 'f3');

    const btn = page.locator('[data-testid="read-position-btn"]');
    check('read-position button present', (await btn.count()) > 0);
    if (await btn.count()) {
      await btn.first().click({ timeout: 4000 });
    }

    // Banner should appear with streamed text.
    const banner = page.locator('[data-testid="position-narration-banner"]');
    const appeared = await banner.waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false);
    check('narration banner appears after tap', appeared);

    // Banner must be sticky so it survives a scroll (regression #1).
    if (appeared) {
      const pos = await banner.evaluate((el) => getComputedStyle(el).position).catch(() => 'unknown');
      check('banner is position:sticky', pos === 'sticky', pos);
    }

    // Voice path engaged despite coachNarration='silent' (regression #2).
    // speakReadAloud bypasses the gate → a /api/tts fetch fires.
    await page.waitForTimeout(6000);
    check('voice path engaged (/api/tts fired) on silent', ttsRequests.length > 0, `${ttsRequests.length} tts request(s)`);

    check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

    await page.screenshot({ path: `${OUT_DIR}/read-position.png`, fullPage: false }).catch(() => {});
  } finally {
    await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ base: BASE_URL, results, ttsRequests, consoleErrors, pageErrors }, null, 2));
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[read-position] ${results.length - failed.length}/${results.length} green — report: ${OUT_DIR}/report.json`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
