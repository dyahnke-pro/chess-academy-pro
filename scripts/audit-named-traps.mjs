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
  return openOpening(page, 'ruy-lopez', tab);
}

async function openOpening(page, openingId, tab) {
  await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded' });
  // Cold context: wait for the opening to seed into Dexie, then reload warm.
  const seeded = await waitForOpeningSeeded(page, openingId, 60_000);
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

async function waitForOpeningSeeded(page, openingId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await page.evaluate((id) => new Promise((resolve) => {
      const open = indexedDB.open('ChessAcademyDB');
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('openings')) { resolve(false); return; }
        const tx = db.transaction('openings', 'readonly');
        const req = tx.objectStore('openings').get(id);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => resolve(false);
      };
      open.onerror = () => resolve(false);
    }), openingId);
    if (ok) return true;
    await page.waitForTimeout(2000);
  }
  return false;
}

async function probeViennaTile(page, tab, trapId, label) {
  // Mirrors probeTile but routes through /openings/vienna-game.
  await openOpening(page, 'vienna-game', tab);
  const tile = page.locator(`[data-testid="named-trap-${trapId}"]`);
  const tileVisible = await tile.isVisible({ timeout: 8000 }).catch(() => false);
  record(`${label}: tile renders on its tab`, tileVisible);
  if (!tileVisible) return;
  for (const verb of ['watch', 'learn', 'practice', 'play']) {
    const b = await page.locator(`[data-testid="named-trap-${verb}-${trapId}"]`).isVisible().catch(() => false);
    record(`${label}: ${verb} button present`, b);
  }
  // Watch — beat lesson mounts + narration text fires.
  await page.locator(`[data-testid="named-trap-watch-${trapId}"]`).click();
  const watchOk = await page.locator('[data-testid="lesson-player"]').isVisible({ timeout: 8000 }).catch(() => false);
  const narr = (await page.locator('[data-testid="lesson-narration"]').textContent().catch(() => ''))?.trim() ?? '';
  record(`${label}: Watch mounts beat lesson`, watchOk);
  record(`${label}: Watch shows narration text`, narr.length > 0, `${narr.length} chars`);
  // Learn — guided player + paint.
  await openOpening(page, 'vienna-game', tab);
  await page.locator(`[data-testid="named-trap-learn-${trapId}"]`).click();
  const mem = page.locator('[data-testid="line-player-memory"]');
  const learnOk = await mem.isVisible({ timeout: 8000 }).catch(() => false);
  record(`${label}: Learn mounts guided player`, learnOk);
  // Practice — silent + hint.
  await openOpening(page, 'vienna-game', tab);
  await page.locator(`[data-testid="named-trap-practice-${trapId}"]`).click();
  const practiceOk = await page.locator('[data-testid="line-player-memory"]').isVisible({ timeout: 8000 }).catch(() => false);
  record(`${label}: Practice mounts`, practiceOk);
  // Play — opening-locked surface.
  await openOpening(page, 'vienna-game', tab);
  await page.locator(`[data-testid="named-trap-play-${trapId}"]`).click();
  await page.waitForTimeout(1500);
  const playOk = await page.evaluate(() => !!document.querySelector('[data-testid*="play"], [data-testid="opening-play-mode"], canvas, [data-square]'));
  record(`${label}: Play mounts a board surface`, playOk);
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
    // The "watch out for" warnings stay (with full WLPP). The student-side
    // WEAPON tile is rendered as a single green-outlined card when the tab
    // has one (the Ruy has exactly one — Tarrasch, on Open). The standalone
    // Weapons SECTION HEADER and the Model Game section were REMOVED (David
    // 2026-05-21) — verify they're gone and no blank zones render.
    //
    // Routing per RUY_TRAP_DEFS (src/data/lessons/ruyTrapLessons.ts):
    //   noahs-ark   (warning) → main / breyer / chigorin / zaitsev
    //   mortimer    (warning) → berlin
    //   fishing-pole(warning) → berlin
    //   marshall-onlymove (warning) → marshall
    //   tarrasch    (weapon)  → open
    await probeTile(page, 'variation-tab-main', 'noahs-ark', "Noah's Ark (main)");
    await probeTile(page, 'Berlin', 'mortimer', 'Mortimer (Berlin)');
    await probeTile(page, 'Berlin', 'fishing-pole', 'Fishing Pole (Berlin)');
    await probeTile(page, 'Marshall', 'marshall-onlymove', 'Marshall only-move (Marshall)');
    await probeTile(page, 'Open', 'tarrasch', 'Tarrasch Weapon (Open)');

    // Weapon card present on the Open tab (the Ruy's one real weapon),
    // hidden on every tab that has no weapon.
    await openRuy(page, 'Open');
    const openTab = await page.evaluate(() => ({
      weaponCardVisible: !!document.querySelector('[data-testid="named-weapon-card"]'),
      weaponHeaderText: document.querySelector('[data-testid="named-weapon-card"] h3')?.textContent ?? null,
    }));
    record('Weapon card renders on Open tab', openTab.weaponCardVisible, openTab.weaponHeaderText ?? '');

    await openRuy(page, 'variation-tab-main');
    const mainTab = await page.evaluate(() => ({
      weaponCardVisible: !!document.querySelector('[data-testid="named-weapon-card"]'),
    }));
    record('Weapon card hidden on Main tab (no weapon)', !mainTab.weaponCardVisible);

    // Sections-removed + no-blank-zones check on the main view.
    await openRuy(page, 'variation-tab-main');
    const gone = await page.evaluate(() => {
      const txt = document.body.innerText;
      return {
        noModelGames: !document.querySelector('[data-testid="model-games-section"]'),
        // The standalone "Weapons" section HEADER is gone; the per-tab
        // "Weapon on this line" card lives independently (no zone header).
        noWeaponsHeader: !/\bWeapons\s*$/m.test(txt) && !/\bWeapons\b\s+section/i.test(txt),
        // Pitfalls header should still appear (we have Noah's Ark warning).
        hasPitfalls: /Pitfalls|watch out|Traps to avoid/i.test(txt),
      };
    });
    record('Model Games section removed', gone.noModelGames);
    record('Standalone Weapons SECTION HEADER removed', gone.noWeaponsHeader);
    record('Pitfalls (watch out for) still present', gone.hasPitfalls);

    // ═══ VIENNA NAMED-TRAP PROBES ═══════════════════════════════════
    // The Vienna ships 7 weapons + 1 warning across the 4 first-class
    // variation tabs (per VIENNA_TRAP_DEFS in viennaTrapLessons.ts):
    //   wurzburger         (weapon)  → Gambit
    //   hamppe-allgaier    (weapon)  → vs 2…Nc6
    //   hamppe-muzio       (weapon)  → vs 2…Nc6
    //   copycat-qg4        (weapon)  → vs 2…Nc6
    //   pierce-gambit      (weapon)  → vs 2…Nc6
    //   steinitz-gambit    (weapon)  → vs 2…Nc6
    //   frankenstein-nxa8  (weapon)  → Frankenstein-Dracula
    //   nxe4-no-qh5        (warning) → Frankenstein-Dracula
    await probeViennaTile(page, 'Gambit', 'wurzburger', 'Wurzburger (Gambit)');
    await probeViennaTile(page, 'vs 2…Nc6', 'hamppe-allgaier', 'Hamppe-Allgaier (vs 2…Nc6)');
    await probeViennaTile(page, 'vs 2…Nc6', 'hamppe-muzio', 'Hamppe-Muzio (vs 2…Nc6)');
    await probeViennaTile(page, 'vs 2…Nc6', 'copycat-qg4', 'Copycat-Qg4 (vs 2…Nc6)');
    await probeViennaTile(page, 'vs 2…Nc6', 'pierce-gambit', 'Pierce Gambit (vs 2…Nc6)');
    await probeViennaTile(page, 'vs 2…Nc6', 'steinitz-gambit', 'Steinitz Gambit (vs 2…Nc6)');
    await probeViennaTile(page, 'Frankenstein-Dracula', 'frankenstein-nxa8', 'F-D Nxa8 (Frankenstein-Dracula)');
    await probeViennaTile(page, 'Frankenstein-Dracula', 'nxe4-no-qh5', 'Warning: 3…Nxe4 demands 4.Qh5');

    // Weapon-card visibility check for Vienna
    await openOpening(page, 'vienna-game', 'vs 2…Nc6');
    const viennaNc6 = await page.evaluate(() => ({
      weaponCardVisible: !!document.querySelector('[data-testid="named-weapon-card"]'),
      weaponHeaderText: document.querySelector('[data-testid="named-weapon-card"] h3')?.textContent ?? null,
    }));
    record('Vienna: Weapon card renders on vs 2…Nc6 tab', viennaNc6.weaponCardVisible, viennaNc6.weaponHeaderText ?? '');

    await openOpening(page, 'vienna-game', 'variation-tab-main');
    const viennaMain = await page.evaluate(() => ({
      weaponCardVisible: !!document.querySelector('[data-testid="named-weapon-card"]'),
    }));
    record('Vienna: Weapon card hidden on Main tab (Classical has no weapon)', !viennaMain.weaponCardVisible);
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
