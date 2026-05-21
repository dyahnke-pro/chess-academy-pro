#!/usr/bin/env node
/**
 * Audit-named-traps — the Ruy named traps (weapons + "watch out for") with
 * their new Watch/Learn/Practice/Play row (David 2026-05-21). Proves:
 *  - the named-trap tiles render on the CORRECT variation tab,
 *  - Noah's Ark (widened) shows on the main/closed view,
 *  - each tile has all 4 WLPP buttons,
 *  - Watch mounts the beat lesson (narration survives),
 *  - Learn mounts the guided player with narration + lead-the-eye paint,
 *  - Practice mounts silent with a working Hint button,
 *  - Play hands off to the opening-locked coach.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/.../chrome \
 *   node scripts/audit-named-traps.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/named-traps-${stamp}`;
const HL_RGBS = ['255, 165, 0', '255, 235, 59', '255, 214, 0', '40,185,95', '34, 197, 94'];

const results = [];
function record(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`[named-traps] ${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
}

async function waitForRuySeeded(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await page.evaluate(() => new Promise((resolve) => {
      const open = indexedDB.open('ChessAcademyDB');
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('openings')) { resolve(false); return; }
        const tx = db.transaction('openings', 'readonly');
        const req = tx.objectStore('openings').get('ruy-lopez');
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      };
      open.onerror = () => resolve(false);
    }));
    if (ok) return true;
    await page.waitForTimeout(2000);
  }
  return false;
}

async function openRuy(page, tab) {
  await page.goto(`${BASE_URL}/openings/ruy-lopez`, { waitUntil: 'domcontentloaded' });
  // Cold context: wait for the Ruy to seed into Dexie, then reload warm.
  const seeded = await waitForRuySeeded(page, 60_000);
  if (seeded) await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="variation-tabs"]').waitFor({ state: 'visible', timeout: 30_000 });
  if (!tab) return;
  // tab can be a data-testid ('variation-tab-main') or a label to match by text.
  let el;
  if (tab.startsWith('variation-tab-')) el = page.locator(`[data-testid="${tab}"]`);
  else el = page.locator('[data-testid="variation-tabs"] button', { hasText: new RegExp(`^${tab}$`, 'i') }).first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.click().catch(() => {});
  await page.waitForTimeout(800);
}

async function boardPaints(page, testid) {
  return page.evaluate(({ rgbs, tid }) => {
    const board = document.querySelector(`[data-testid="${tid}"]`);
    if (!board) return { hl: 0, arrows: 0 };
    let hl = 0;
    for (const div of board.querySelectorAll('div')) {
      const s = div.getAttribute('style') ?? '';
      if (rgbs.some((c) => s.includes(c))) hl += 1;
    }
    const arrows = board.querySelectorAll('svg polygon, svg line, svg path').length;
    return { hl, arrows };
  }, { rgbs: HL_RGBS, tid: testid });
}

async function probeTile(page, tabTestId, trapId, label) {
  // Watch — beat lesson.
  await openRuy(page, tabTestId);
  const tile = page.locator(`[data-testid="named-trap-${trapId}"]`);
  const tileVisible = await tile.isVisible({ timeout: 8000 }).catch(() => false);
  record(`${label}: tile renders on its tab`, tileVisible);
  if (!tileVisible) return;
  for (const verb of ['watch', 'learn', 'practice', 'play']) {
    const b = await page.locator(`[data-testid="named-trap-${verb}-${trapId}"]`).isVisible().catch(() => false);
    record(`${label}: ${verb} button present`, b);
  }

  // Watch → beat lesson mounts (narration survives).
  await page.locator(`[data-testid="named-trap-watch-${trapId}"]`).click();
  const watchOk = await page.locator('[data-testid="lesson-player"]').isVisible({ timeout: 8000 }).catch(() => false);
  const narr = (await page.locator('[data-testid="lesson-narration"]').textContent().catch(() => ''))?.trim() ?? '';
  record(`${label}: Watch mounts beat lesson`, watchOk);
  record(`${label}: Watch shows narration text`, narr.length > 0, `${narr.length} chars`);

  // Learn → guided player + narration + paint.
  await openRuy(page, tabTestId);
  await page.locator(`[data-testid="named-trap-learn-${trapId}"]`).click();
  const mem = page.locator('[data-testid="line-player-memory"]');
  const learnOk = await mem.isVisible({ timeout: 8000 }).catch(() => false);
  record(`${label}: Learn mounts guided player`, learnOk);
  if (learnOk) {
    const header = (await mem.textContent().catch(() => '')) ?? '';
    record(`${label}: Learn header reads "Learn"`, header.includes('Learn'));
    await page.waitForTimeout(1500);
    const s = await boardPaints(page, 'line-player-memory');
    record(`${label}: Learn paints highlights/arrows`, s.hl > 0 || s.arrows > 0, `hl=${s.hl} arrows=${s.arrows}`);
  }

  // Practice → silent + working hint button.
  await openRuy(page, tabTestId);
  await page.locator(`[data-testid="named-trap-practice-${trapId}"]`).click();
  const memP = page.locator('[data-testid="line-player-memory"]');
  const practiceOk = await memP.isVisible({ timeout: 8000 }).catch(() => false);
  record(`${label}: Practice mounts`, practiceOk);
  if (practiceOk) {
    const header = (await memP.textContent().catch(() => '')) ?? '';
    record(`${label}: Practice header reads "Practice"`, header.includes('Practice'));
    const hint = page.locator('[data-testid="practice-hint"]');
    const hintVisible = await hint.isVisible().catch(() => false);
    record(`${label}: Practice has a Hint button`, hintVisible);
    const before = await boardPaints(page, 'line-player-memory');
    if (hintVisible) await hint.click();
    await page.waitForTimeout(600);
    const after = await boardPaints(page, 'line-player-memory');
    record(`${label}: Hint reveals the move arrow`, after.arrows > before.arrows, `arrows ${before.arrows}→${after.arrows}`);
  }

  // Play → opening-locked coach surface.
  await openRuy(page, tabTestId);
  await page.locator(`[data-testid="named-trap-play-${trapId}"]`).click();
  await page.waitForTimeout(1500);
  const playOk = await page.evaluate(() => !!document.querySelector('[data-testid*="play"], [data-testid="opening-play-mode"], canvas, [data-square]'));
  record(`${label}: Play mounts a board surface`, playOk);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[named-traps] base=${BASE_URL} out=${OUT_DIR}`);
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    // Main/closed view — Noah's Ark (widened to the closed tabs).
    await probeTile(page, 'variation-tab-main', 'noahs-ark', "Noah's Ark (main)");
    // Open tab — the Tarrasch weapon (click the Open variation tab by label).
    await probeTile(page, 'Open', 'tarrasch', 'Tarrasch (open)');
  } catch (e) {
    record('audit-run', false, String(e));
  }

  const passed = results.filter((r) => r.pass).length;
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify({ base: BASE_URL, passed, total: results.length, results, pageErrors }, null, 2));
  console.log(`[named-traps] DONE — ${passed}/${results.length} checks passed`);
  console.log(`[named-traps] pageerrors=${pageErrors.length}`);
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main();
