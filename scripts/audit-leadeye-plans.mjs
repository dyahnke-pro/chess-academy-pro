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
// the base-glow/last-move colour, so it's excluded to avoid false positives.)
const HL_RGBS = ['34, 197, 94', '255, 209, 71'];

// Plans known to carry a playable line (a 0-line plan falls through to the
// study page, not the Watch player).
const WATCH_TESTID = {
  'ruy-lopez': 'plan-watch-mp-ruylopez-d4',
  'pirc-defence': 'plan-watch-mp-pircdefence-austrian',
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

async function probeOpening(page, openingId, label) {
  // First boot seeds Dexie (plans land late in the detached backfill).
  await page.goto(`${BASE_URL}/openings/${openingId}`, { waitUntil: 'domcontentloaded' });
  const seeded = await waitForPlansSeeded(page, openingId, 90_000);
  record(`${label}: plans seeded into Dexie`, seeded > 0, `${seeded} plan rows`);
  if (seeded <= 0) return;
  // Reload warm so the section reads the now-present plans on mount.
  await page.reload({ waitUntil: 'domcontentloaded' });

  const section = page.locator('[data-testid="middlegame-plans-section"]');
  try {
    await section.waitFor({ state: 'visible', timeout: 25_000 });
    record(`${label}: middlegame-plans section renders`, true);
  } catch {
    record(`${label}: middlegame-plans section renders`, false, 'section never appeared');
    return;
  }

  // Open a plan that has a playable line (Watch player, not the study page).
  const watchBtn = page.locator(`[data-testid="${WATCH_TESTID[openingId]}"]`);
  await watchBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await watchBtn.click();

  const demo = page.locator('[data-testid="line-player-demo"]');
  try {
    await demo.waitFor({ state: 'visible', timeout: 10_000 });
    record(`${label}: Watch player (line-player-demo) mounts`, true);
  } catch {
    record(`${label}: Watch player (line-player-demo) mounts`, false, 'demo never mounted');
    return;
  }

  // Let the voice-gated demo advance past the intro into the first narrated
  // move, then sample the board. (No TTS in headless, so speak() resolves
  // immediately and the demo steps quickly.)
  await page.locator('[data-testid="demo-annotation"]').waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});

  // Sample across the first few moves — collect the union of painted
  // highlights + arrow counts as the demo walks forward.
  let sawHighlight = false;
  let maxArrows = 0;
  let sawAnnotation = false;
  for (let i = 0; i < 6; i++) {
    const ann = (await page.locator('[data-testid="demo-annotation"]').textContent().catch(() => ''))?.trim() ?? '';
    if (ann.length > 0) sawAnnotation = true;

    const sample = await page.evaluate((rgbs) => {
      const board = document.querySelector('[data-testid="line-player-demo"]');
      if (!board) return { hl: 0, arrows: 0 };
      // react-chessboard v5 applies squareStyles to an INNER child div, not
      // the [data-square] element — so scan every div's inline style.
      let hl = 0;
      for (const div of board.querySelectorAll('div')) {
        const style = div.getAttribute('style') ?? '';
        if (rgbs.some((c) => style.includes(c))) hl += 1;
      }
      // Arrows render as SVG polygons/lines in the board overlay.
      const arrows = board.querySelectorAll('svg polygon, svg line, svg path').length;
      return { hl, arrows };
    }, HL_RGBS);

    if (sample.hl > 0) sawHighlight = true;
    if (sample.arrows > maxArrows) maxArrows = sample.arrows;
    await page.waitForTimeout(1200);
  }

  record(`${label}: annotation text renders during demo`, sawAnnotation);
  record(`${label}: lead-the-eye highlights paint on the board`, sawHighlight, sawHighlight ? '' : 'no square carried a lead-the-eye background colour');
  record(`${label}: arrows render on the board`, maxArrows > 0, `max svg arrow primitives seen = ${maxArrows}`);

  // Out-of-order: hit Practice (skip-to-memory) mid-demo — must not crash.
  const practice = page.locator('[data-testid="skip-to-memory"]');
  if (await practice.isVisible().catch(() => false)) {
    await practice.click();
    const ok = await page.locator('[data-testid="line-player-memory"]').isVisible({ timeout: 6000 }).catch(() => false);
    record(`${label}: Practice phase reachable from demo`, ok);
  }
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
