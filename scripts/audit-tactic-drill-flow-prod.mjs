#!/usr/bin/env node
/**
 * audit-tactic-drill-flow-prod — post-deploy verification for the drill-flow
 * landing (auto-advance + post-solve note). Muted per G1 — zero TTS spend.
 *
 * What it proves on the LIVE deploy:
 *   A. The drill boots and serves a real puzzle (board + counter render).
 *   B. FAIL HOLDS — "Show solution" grades the puzzle as failed; the counter
 *      must still read "1 / 10" well past the 3s auto-advance window. (The
 *      solve→auto-advance leg needs the puzzle's solution, which a headless
 *      run can't know for a random puzzle — that leg is pinned by
 *      TacticDrillPage.test.tsx; this audit proves the deployed fail-hold.)
 *   C. Manual nav still works — nav-next lands on "2 / 10".
 *   D. The post-solve note, when present, appears only AFTER grading (it is
 *      corpus-dependent, so presence is informational, timing is the contract).
 *   E. No uncaught page errors.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-tactic-drill-flow-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/tactic-drill-flow-${stamp}`;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

try {
  await page.goto(`${BASE_URL}/tactics/drill`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  // Fresh contexts surface the calibration bubble / help modal before the
  // board; the init script dismisses, give it a beat.
  await page.waitForTimeout(3000);
  for (const [gate, btn] of [
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 6000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15_000 }); } catch { /* absent */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* absent */ }

  // A — a real puzzle served. The deferred seed can take a while cold.
  const board = page.locator('[data-testid="puzzle-board"]');
  await board.waitFor({ timeout: 90_000 });
  const counter = page.locator('[data-testid="puzzle-nav"] span');
  record('A. drill boots with a real puzzle', await board.isVisible() && (await counter.innerText()).includes('1 / 10'), await counter.innerText());

  // B — show-solution grades as FAILED; a fail must HOLD (no auto-advance).
  // The note-timing contract rides along: no note may exist before grading.
  const notePre = await page.locator('[data-testid="post-solve-note"]').count();
  const solutionBtn = page.locator('[data-testid="show-solution-button"]');
  await solutionBtn.waitFor({ timeout: 30_000 }); // appears after the hint ladder arms
  await solutionBtn.click();
  // Solution playback animates the remaining moves, then grades.
  await page.waitForTimeout(5000);
  // Well past the 3s auto-advance window a SOLVE would have used.
  await page.waitForTimeout(4000);
  const counterAfterFail = await counter.innerText();
  record('B. a failed puzzle holds — no auto-advance', counterAfterFail.includes('1 / 10'), counterAfterFail);
  const notePost = await page.locator('[data-testid="post-solve-note"]').count();
  record('D. post-solve note only after grading', notePre === 0, `pre=${notePre} post=${notePost} (post presence is corpus-dependent)`);

  // C — manual nav still advances.
  await page.locator('[data-testid="nav-next"]').click();
  await page.waitForTimeout(2500);
  const counterAfterNav = await counter.innerText().catch(() => '(gone)');
  record('C. manual nav advances', counterAfterNav.includes('2 / 10'), counterAfterNav);

  record('E. no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} finally {
  await browser.close().catch(() => {});
}

await mkdir(OUT_DIR, { recursive: true });
await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, results, pageErrors }, null, 2));
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} green — report at ${OUT_DIR}/report.json`);
process.exit(passed === results.length ? 0 : 1);
