// Interactive audit for the WLPP "expert pass" unlock budget (David 2026-05-24:
// "Give user only 2 weapon unlocks. One for each color. I don't want everyone
// just clicking 'I'm an expert' defeating the purpose.").
//
// Drives the real masterclass UI and proves:
//   1. A fresh White opening (vienna-game) offers a White expert pass.
//   2. It takes TWO taps to spend (misclick guard), then the whole opening
//      unlocks (ladder shows "All unlocked").
//   3. The unlock PERSISTS across reload.
//   4. A DIFFERENT White opening (ruy-lopez) now shows the pass spent — the
//      ladder can't be skipped a second time on White.
//   5. A Black opening (caro-kann) still offers a fresh Black pass — colors
//      are independent.
//
//   AUDIT_SMOKE_URL=http://localhost:5173 \
//   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//   node scripts/audit-wlpp-unlock-budget.mjs
//
// ⚠️ SANDBOX CAVEAT: in the Claude Code sandbox, IndexedDB *writes* to the
// `openings` store stall (a raw `indexedDB.open` times out too — reproduced
// with this feature stashed, so it's the sandbox env, not the feature). That
// means the "two-tap → unlock commits" + persistence + cross-opening scenarios
// will FAIL in-sandbox even though the logic is correct. The write itself is
// unit-proven in src/services/openingService.ladder.test.ts (fake-indexeddb).
// Run this script on a real device / prod to confirm the commit path; in the
// sandbox, the meaningful assertions are the budget DISPLAY + the two-tap ARM.

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function closeHelp(page) {
  const modal = page.locator('[data-testid="page-help-modal"]');
  if (await modal.count()) {
    await page.locator('[data-testid="page-help-close"]').first().click().catch(() => {});
    await sleep(200);
  }
}

async function gotoOpening(page, id) {
  await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="variation-tabs"]').first().waitFor({ timeout: 20000 });
  await sleep(600);
  await closeHelp(page);
}

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`);
};

async function btnText(page, testid) {
  const el = page.locator(`[data-testid="${testid}"]`).first();
  if (!(await el.count())) return null;
  return (await el.innerText()).replace(/\s+/g, ' ').trim();
}

async function main() {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log(`  [pageerror] ${String(e).slice(0, 140)}`));

  // Boot-seed Dexie with the masterclass openings. dataLoader bulk-puts
  // thousands of records on first load; give it a long settle so seeding's
  // readwrite lock is released before we attempt the unlock write.
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await sleep(12000);
  await page.goto(`${URL}/openings`, { waitUntil: 'networkidle' });
  await sleep(2000);

  // ── 1. Fresh White opening offers a White pass ──────────────────────────
  console.log('\n=== vienna-game (White): fresh pass available ===');
  await gotoOpening(page, 'vienna-game');
  const hint0 = await btnText(page, 'ladder-hint');
  const avail = await btnText(page, 'unlock-all-btn');
  check('vienna: not already unlocked', hint0 !== 'All unlocked', `hint="${hint0}"`);
  check('vienna: White pass offered', !!avail && /White expert pass/i.test(avail) && !/Spend/i.test(avail), `btn="${avail}"`);

  // ── 2. Two-tap to spend; then whole opening unlocks ─────────────────────
  console.log('\n=== two-tap spend ===');
  const btn = page.locator('[data-testid="unlock-all-btn"]').first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await sleep(400);
  const arming = await btnText(page, 'unlock-all-btn');
  check('first tap arms confirm (does NOT unlock)', !!arming && /Spend|confirm/i.test(arming), `btn="${arming}"`);
  check('first tap did NOT unlock', (await btnText(page, 'ladder-hint')) !== 'All unlocked');

  await page.locator('[data-testid="unlock-all-btn"]').first().click();
  await sleep(2500);
  const hintAfter = await btnText(page, 'ladder-hint');
  check('second tap unlocks the whole opening', hintAfter === 'All unlocked', `hint="${hintAfter}"`);
  check('unlock-all button gone once unlocked', (await page.locator('[data-testid="unlock-all-btn"]').count()) === 0);

  // ── 3. Persists across reload ───────────────────────────────────────────
  console.log('\n=== persistence across reload ===');
  await gotoOpening(page, 'vienna-game');
  check('vienna still unlocked after reload', (await btnText(page, 'ladder-hint')) === 'All unlocked');

  // ── 4. A different White opening shows the pass spent ───────────────────
  console.log('\n=== ruy-lopez (White): pass already spent elsewhere ===');
  await gotoOpening(page, 'ruy-lopez');
  const ruyHint = await btnText(page, 'ladder-hint');
  const spent = await btnText(page, 'unlock-all-spent');
  check('ruy: not auto-unlocked', ruyHint !== 'All unlocked', `hint="${ruyHint}"`);
  check('ruy: White pass shown as spent', !!spent && /White expert pass already used/i.test(spent), `txt="${spent}"`);
  check('ruy: no live unlock button (cannot skip again on White)', (await page.locator('[data-testid="unlock-all-btn"]').count()) === 0);

  // ── 5. A Black opening still has a fresh Black pass ─────────────────────
  console.log('\n=== caro-kann (Black): independent fresh pass ===');
  await gotoOpening(page, 'caro-kann');
  const caroBtn = await btnText(page, 'unlock-all-btn');
  check('caro: Black pass offered (colors independent)', !!caroBtn && /Black expert pass/i.test(caroBtn), `btn="${caroBtn}"`);

  await browser.close();

  const passed = results.filter((r) => r.ok).length;
  const report = { url: URL, ts: new Date().toISOString(), passed, total: results.length, results };
  const dir = `audit-reports/wlpp-unlock-budget-${report.ts.replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\n${passed}/${results.length} scenarios green — report at ${dir}/report.json`);
  process.exit(passed === results.length ? 0 : 1);
}

void main();
