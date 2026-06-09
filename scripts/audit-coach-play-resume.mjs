#!/usr/bin/env node
/**
 * audit-coach-play-resume — WO-RESUME-01 regression audit.
 *
 * Proves the coach game PERSISTS across leaving and re-entering the
 * Play tab (David 2026-06-09: "if you leave the tab and then reenter you
 * lose your game and need to start over"). Drives the LIVE app:
 *
 *   1. /coach/play, dismiss onboarding + page-help.
 *   2. Play a few student moves (Stockfish replies).
 *   3. Assert the move list rendered (move-cell-* cells) AND the resumable
 *      snapshot was written to IndexedDB (coachPlayActive.v2 with sans).
 *   4. Navigate AWAY to /coach, then BACK to /coach/play.
 *   5. Assert the game RESUMED — the move list is restored (same move
 *      count, not 0) and the snapshot's SAN history is intact. The old
 *      bug (resume disabled) would show a fresh empty board here.
 *   6. Resign → assert the snapshot is CLEARED (a new game can only begin
 *      on completion / resign).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-coach-play-resume.mjs
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-coach-play-resume.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-play-resume-${stamp}`;
const BOOT_TIMEOUT_MS = 30_000;
const MOVE_SETTLE_MS = 7000;

/** Read the active-game snapshot straight from IndexedDB (the oracle). */
async function readSnapshot(page) {
  return page.evaluate(async () => {
    return new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const dbi = req.result;
        let tx;
        try { tx = dbi.transaction('meta', 'readonly'); } catch { resolve(null); return; }
        const get = tx.objectStore('meta').get('coachPlayActive.v2');
        get.onsuccess = () => resolve(get.result?.value ?? null);
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[resume] base = ${BASE_URL}`);
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    // Desktop viewport so the MoveListPanel renders (it's gated to
    // !isMobile) — gives a visible move-list oracle. The persistence /
    // resume logic itself is viewport-independent.
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    userAgent: 'AuditCoachPlayBot/1.0 (resume)',
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message.slice(0, 300)));

  const results = [];
  const ok = (name, pass, detail) => {
    results.push({ name, pass, detail });
    console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  async function dismissOverlays() {
    await page.locator('[data-testid="strength-calibration-bubble"]')
      .waitFor({ state: 'visible', timeout: 6000 }).catch(() => undefined);
    await page.locator('[data-testid="skill-band-intermediate"]').first()
      .click({ timeout: 4000 }).catch(() => undefined);
    await page.locator('[data-testid="strength-calibration-bubble"]')
      .waitFor({ state: 'detached', timeout: 15000 }).catch(() => undefined);
    const close = page.locator('[data-testid="page-help-modal"] [aria-label="Close"], [data-testid="page-help-close"]');
    if (await close.count()) await close.first().click({ timeout: 3000 }).catch(() => undefined);
  }
  async function gotoPlay() {
    await page.locator('[data-testid="coach-action-play"]').click({ timeout: 8000 }).catch(async () => {
      await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    });
    await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: BOOT_TIMEOUT_MS }).catch(() => undefined);
  }
  async function move(from, to) {
    await page.locator(`[data-square="${from}"]`).first().click({ timeout: 2500 });
    await page.waitForTimeout(200);
    await page.locator(`[data-square="${to}"]`).first().click({ timeout: 2500 });
    await page.waitForTimeout(MOVE_SETTLE_MS);
  }
  const moveCells = () => page.locator('[data-testid^="move-cell-"]').count();

  try {
    await page.goto(`${BASE_URL}/coach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await dismissOverlays();
    await gotoPlay();

    // ── Play two student moves ───────────────────────────────────────
    await move('e2', 'e4');
    await move('b1', 'c3').catch(() => undefined);
    const cellsBefore = await moveCells();
    ok('moves played → move list rendered', cellsBefore > 0, `${cellsBefore} cells`);

    const snapBefore = await readSnapshot(page);
    ok('snapshot written to IndexedDB', !!snapBefore && Array.isArray(snapBefore.sans) && snapBefore.sans.length > 0,
      snapBefore ? `sans=${JSON.stringify(snapBefore.sans)}` : 'no snapshot');

    // ── Leave the Play tab, then return ──────────────────────────────
    await page.getByRole('link', { name: 'Coach' }).first().click({ timeout: 8000 })
      .catch(() => page.goto(`${BASE_URL}/coach`, { waitUntil: 'domcontentloaded' }));
    await page.waitForTimeout(1500);
    await gotoPlay();
    await page.waitForTimeout(2500); // let the resume effect replay the history

    const cellsAfter = await moveCells();
    ok('game RESUMED after re-entry (move list restored)', cellsAfter >= cellsBefore && cellsAfter > 0,
      `before=${cellsBefore} after=${cellsAfter}`);

    const snapAfter = await readSnapshot(page);
    ok('snapshot SAN history intact after re-entry',
      !!snapAfter && JSON.stringify(snapAfter.sans) === JSON.stringify(snapBefore?.sans),
      snapAfter ? `sans=${JSON.stringify(snapAfter.sans)}` : 'no snapshot');

    // ── Deterministic proof the BOARD resumed: play one more move and
    //    confirm the history APPENDS to the resumed line (prefix preserved,
    //    length grows) instead of resetting to a fresh game (length 1).
    const resumedLen = Array.isArray(snapAfter?.sans) ? snapAfter.sans.length : 0;
    // White is to move after an even-ply history; a knight develop is legal
    // from the standard opening shapes this audit produces.
    await move('g1', 'f3').catch(() => undefined);
    const snapAppended = await readSnapshot(page);
    const appended = Array.isArray(snapAppended?.sans)
      && snapAppended.sans.length > resumedLen
      && JSON.stringify(snapAppended.sans.slice(0, resumedLen)) === JSON.stringify(snapAfter?.sans);
    ok('next move APPENDS to the resumed game (not a fresh restart)', appended,
      snapAppended ? `len ${resumedLen} → ${snapAppended.sans.length}` : 'no snapshot');

    // ── Resign clears the snapshot (new game only on completion/resign) ─
    const resign = page.locator('[data-testid="resign-btn"]').first();
    if (await resign.count()) {
      await resign.click({ timeout: 4000 }).catch(() => undefined);
      await page.locator('[data-testid="resign-yes"]').first().click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(2500);
      const snapResigned = await readSnapshot(page);
      ok('snapshot CLEARED on resign', snapResigned === null, snapResigned ? 'still present' : 'cleared');
    } else {
      ok('resign button present', false, 'resign control not found (skipped clear check)');
    }

    ok('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  } catch (err) {
    ok('audit completed without throwing', false, err instanceof Error ? err.message : String(err));
  }

  await page.screenshot({ path: `${OUT_DIR}/final.png` }).catch(() => undefined);
  const passed = results.filter((r) => r.pass).length;
  const report = { base: BASE_URL, startedAt: stamp, passed, total: results.length, results, pageErrors };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\n${passed}/${results.length} checks passed — report: ${OUT_DIR}/report.json`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
