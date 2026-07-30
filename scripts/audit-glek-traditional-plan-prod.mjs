#!/usr/bin/env node
/**
 * audit-glek-traditional-plan-prod — targeted post-deploy probe for the
 * 2026-07-30 Glek build (b63f35e): the traditional Kh2/Nd2/f4 storm plan +
 * the corpus-grounded main-lesson beats.
 *
 * Asserts on LIVE prod:
 *   1. /openings/glek-system mounts and the middlegame-plans section renders
 *      the NEW 4th plan ("…Kh2, Nd2 and the f4 Storm").
 *   2. The plan's Watch opens the playable-line player (not an empty state).
 *   3. The Watch lesson (main line) still mounts the curated LessonPlayer,
 *      never legacy WalkthroughMode (G9.3 Gate A detector).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-glek-traditional-plan-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const PLAN_TITLE = 'Kh2, Nd2 and the f4 Storm';

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function dismissGates(page) {
  // Strength-calibration bubble (fresh context) then any page-help modal.
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ state: 'visible', timeout: 12000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown — fine */ }
  try {
    const help = page.locator('[data-testid="page-help-modal"]');
    await help.waitFor({ state: 'visible', timeout: 4000 });
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'detached', timeout: 5000 }).catch(() => undefined);
  } catch { /* not shown */ }
}

async function main() {
  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

  await page.goto(`${BASE}/openings/glek-system`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissGates(page);

  // Deferred seed needs time on a cold context; the plans read from Dexie.
  await page.waitForTimeout(45000);
  await seedUnlockedOpenings(page, ['glek-system']).catch(() => undefined);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissGates(page);
  await page.waitForTimeout(8000);

  // 1. The new plan tile renders (by its stable testid; titles can truncate).
  const tile = page.locator('[data-testid="plan-line-mp-gleksystem-traditional-f4"]');
  let planVisible = false;
  try {
    await page.locator('[data-testid="middlegame-plans-section"]').scrollIntoViewIfNeeded({ timeout: 20000 });
    await tile.scrollIntoViewIfNeeded({ timeout: 15000 });
    planVisible = await tile.isVisible();
  } catch { planVisible = false; }
  if (!planVisible) {
    const ids = await page.locator('[data-testid^="plan-line-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
    check('new traditional-f4 plan tile renders', false, `present: ${ids.join(',') || '(none)'}`);
  } else {
    check('new traditional-f4 plan tile renders', true);
  }

  // 2. Its Watch opens a player with a board, not an empty state.
  if (planVisible) {
    try {
      const watchBtn = tile.getByRole('button', { name: new RegExp(`^Watch .*${PLAN_TITLE.slice(-8)}`, 'i') }).or(tile.getByRole('button', { name: /watch/i })).first();
      await watchBtn.click({ timeout: 10000, force: true });
      await page.waitForTimeout(6000);
      const boardVisible = await page.locator('[data-square="e4"]').first().isVisible().catch(() => false);
      check('plan Watch mounts a live board', boardVisible);
    } catch (e) {
      check('plan Watch mounts a live board', false, String(e).slice(0, 100));
    }
  } else {
    check('plan Watch mounts a live board', false, 'skipped — tile missing');
  }

  // 3. Gate A detector on the main Watch: curated player, never WalkthroughMode.
  await page.goto(`${BASE}/openings/glek-system`, { waitUntil: 'domcontentloaded' });
  await dismissGates(page);
  await page.waitForTimeout(5000);
  try {
    const mainWatch = page.getByRole('button', { name: /^watch/i }).first();
    await mainWatch.click({ timeout: 15000, force: true });
    await page.waitForTimeout(6000);
    const legacy = await page.locator('[data-testid="walkthrough-progress"]').count();
    check('main Watch is the curated lesson (no WalkthroughMode)', legacy === 0, `legacy testids: ${legacy}`);
  } catch (e) {
    check('main Watch is the curated lesson (no WalkthroughMode)', false, String(e).slice(0, 100));
  }

  check('zero page errors', pageErrors.length === 0, pageErrors[0] ?? '');

  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[glek-plan-audit] ${results.length - failed}/${results.length} green`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
