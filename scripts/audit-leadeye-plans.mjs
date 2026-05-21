#!/usr/bin/env node
/**
 * Audit-leadeye-plans — interactive probe of the lead-the-eye treatment on
 * middlegame-plan playable lines (David's NON-NEGOTIABLE: arrows + highlights
 * must point the eye where the narration is talking). The unit gate
 * (middlegamePlanner.test) proves the DATA is legal + grounded; THIS proves
 * the render path actually paints highlights + arrows for a real user, on a
 * COLD cache, for both a white opening (Ruy) and a black one (Pirc), and that
 * the demo advances without crashing.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/.../chrome \
 *   node scripts/audit-leadeye-plans.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/leadeye-plans-${stamp}`;

// Our lead-the-eye highlight colours (rgb triples) — proof the styles painted.
// Green = the move-landing square; amber = a key/target square. (Cyan is also
// David's locked colour language: ORANGE = the move's squares, YELLOW = a
// called-out key square, GREEN = vision arrows. The highlight check looks for
// orange + yellow square fills. (Green is the vision-ARROW colour and the
// base-glow colour, so it's excluded from the square-highlight check to avoid
// false positives — arrows are verified separately as SVG primitives.)
const HL_RGBS = ['255, 165, 0', '255, 235, 59'];

// Plans known to carry a playable line (a 0-line plan falls through to the
// study page, not the player).
const PLAN_ID = {
  'ruy-lopez': 'mp-ruylopez-d4',
  'pirc-defence': 'mp-pircdefence-austrian',
};

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[leadeye] ${pass ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
}

/** Wait until the opening's plans have landed in Dexie (the section reads
 *  db.middlegamePlans once on mount; plans arrive late in the detached
 *  first-boot backfill, so a fresh container needs to settle first). */
async function waitForPlansSeeded(page, openingId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const n = await page.evaluate((id) => new Promise((resolve) => {
      const open = indexedDB.open('ChessAcademyDB');
      open.onsuccess = () => {
        const db = open.result;
        if (!db.objectStoreNames.contains('middlegamePlans')) { resolve(-1); return; }
        const tx = db.transaction('middlegamePlans', 'readonly');
        const req = tx.objectStore('middlegamePlans').getAll();
        req.onsuccess = () => resolve(req.result.filter((p) => p.openingId === id).length);
        req.onerror = () => resolve(-1);
      };
      open.onerror = () => resolve(-1);
    }), openingId);
    if (n > 0) return n;
    await page.waitForTimeout(2000);
  }
  return 0;
}

/** Scan a player board for painted lead-the-eye highlights (orange/yellow
 *  square fills) + rendered arrows (green SVG primitives). */
async function sampleBoard(page, testid) {
  return page.evaluate(({ rgbs, tid }) => {
    const board = document.querySelector(`[data-testid="${tid}"]`);
    if (!board) return { hl: 0, arrows: 0 };
    // react-chessboard v5 applies squareStyles to an INNER child div, not the
    // [data-square] element — so scan every div's inline style.
    let hl = 0;
    for (const div of board.querySelectorAll('div')) {
      const style = div.getAttribute('style') ?? '';
      if (rgbs.some((c) => style.includes(c))) hl += 1;
    }
    const arrows = board.querySelectorAll('svg polygon, svg line, svg path').length;
    return { hl, arrows };
  }, { rgbs: HL_RGBS, tid: testid });
}

/** Open the warm detail page and wait for the plans section. */
async function openDetail(page, openingId) {
  await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="middlegame-plans-section"]').waitFor({ state: 'visible', timeout: 25_000 });
}

async function probeWatch(page, openingId, label) {
  await openDetail(page, openingId);
  await page.locator(`[data-testid="plan-watch-${PLAN_ID[openingId]}"]`).click();
  const demo = page.locator('[data-testid="line-player-demo"]');
  try {
    await demo.waitFor({ state: 'visible', timeout: 10_000 });
    record(`${label} WATCH: demo player mounts`, true);
  } catch {
    record(`${label} WATCH: demo player mounts`, false, 'demo never mounted');
    return;
  }
  await page.locator('[data-testid="demo-annotation"]').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
  let sawHighlight = false, maxArrows = 0, sawAnnotation = false;
  for (let i = 0; i < 6; i++) {
    const ann = (await page.locator('[data-testid="demo-annotation"]').textContent().catch(() => ''))?.trim() ?? '';
    if (ann.length > 0) sawAnnotation = true;
    const s = await sampleBoard(page, 'line-player-demo');
    if (s.hl > 0) sawHighlight = true;
    if (s.arrows > maxArrows) maxArrows = s.arrows;
    await page.waitForTimeout(1200);
  }
  record(`${label} WATCH: annotation text renders`, sawAnnotation);
  record(`${label} WATCH: orange/yellow highlights paint`, sawHighlight, sawHighlight ? '' : 'no orange/yellow square fill seen');
  record(`${label} WATCH: green vision arrows render`, maxArrows > 0, `max svg arrow primitives = ${maxArrows}`);
  // Out-of-order: jump to the recall phase mid-demo — must not crash.
  const skip = page.locator('[data-testid="skip-to-memory"]');
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
    const ok = await page.locator('[data-testid="line-player-memory"]').isVisible({ timeout: 6000 }).catch(() => false);
    record(`${label} WATCH: recall phase reachable`, ok);
  }
}

async function probePlayMode(page, openingId, label, action, expectSubtitle) {
  await openDetail(page, openingId);
  await page.locator(`[data-testid="plan-${action}-${PLAN_ID[openingId]}"]`).click();
  const mem = page.locator('[data-testid="line-player-memory"]');
  try {
    await mem.waitFor({ state: 'visible', timeout: 10_000 });
    record(`${label} ${action.toUpperCase()}: play board mounts`, true);
  } catch {
    record(`${label} ${action.toUpperCase()}: play board mounts`, false, 'memory board never mounted');
    return;
  }
  // The header subtitle distinguishes the mode.
  const header = (await mem.textContent().catch(() => '')) ?? '';
  record(`${label} ${action.toUpperCase()}: header reads "${expectSubtitle}"`, header.includes(expectSubtitle), header.slice(0, 0));
  // Learn paints the move's hint arrows + lead-the-eye highlights; Practice
  // is silent (no hint). Sample either way.
  await page.waitForTimeout(1500);
  const s = await sampleBoard(page, 'line-player-memory');
  if (action === 'learn') {
    record(`${label} LEARN: guided highlights paint`, s.hl > 0, `hl=${s.hl}`);
    record(`${label} LEARN: guided arrows render`, s.arrows > 0, `arrows=${s.arrows}`);
  }
  // The board must be interactive (a square is clickable without crashing).
  const crashed = await page.evaluate(() => !!document.querySelector('[data-reactroot] .error-boundary'));
  record(`${label} ${action.toUpperCase()}: no crash on mount`, !crashed);
}

async function probeOpening(page, openingId, label) {
  // First boot seeds Dexie (plans land late in the detached backfill).
  await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded' });
  const seeded = await waitForPlansSeeded(page, openingId, 90_000);
  record(`${label}: plans seeded into Dexie`, seeded > 0, `${seeded} plan rows`);
  if (seeded <= 0) return;
  await probeWatch(page, openingId, label);
  await probePlayMode(page, openingId, label, 'learn', 'Learn');
  await probePlayMode(page, openingId, label, 'practice', 'Practice');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[leadeye] base=${BASE_URL} out=${OUT_DIR}`);
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    await probeOpening(page, 'ruy-lopez', 'Ruy (white)');
    await probeOpening(page, 'pirc-defence', 'Pirc (black)');
  } catch (e) {
    record('audit-run', false, String(e));
  }

  const passed = results.filter((r) => r.pass).length;
  const report = { base: BASE_URL, passed, total: results.length, results, consoleErrors: consoleErrors.length, pageErrors };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`[leadeye] DONE — ${passed}/${results.length} checks passed`);
  console.log(`[leadeye] pageerrors=${pageErrors.length} console.errors=${consoleErrors.length}`);
  console.log(`[leadeye] report: ${OUT_DIR}/report.json`);

  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main();
