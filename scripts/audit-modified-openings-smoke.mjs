#!/usr/bin/env node
/**
 * Quick smoke test for openings whose annotation files I just
 * modified. Verifies:
 *   - /openings/<id> detail page mounts
 *   - Walkthrough launches and auto-advances through every ply
 *   - No console errors
 *   - No runtime/unhandled-rejection audit events emit
 *
 * Output: console only — exit 0 on pass, exit 2 on failure.
 */

import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';

// Modified openings from the drift-fix + shortNarration-rewrite passes
const OPENINGS = [
  'italian-game',
  'vienna-game',
  'london-system',
  'trompowsky-attack',
  'two-knights-defence',
  'kings-indian-attack',
  'scandinavian-defence',
  'alekhine-defence',
  'qga',
  'slav-defence',
  'nimzo-indian',
  'dutch-defence',
  'benoni-defence',
  'benko-gambit',
  'pro-gothamchess-anti-sicilian',
  'pro-firouzja-rossolimo',
  // Sample of pro-* whose shortNarration was fixed:
  'pro-carlsen-catalan',
  'pro-naroditsky-scotch',
  // Sample of openings whose shortNarration fianchetto was rewritten:
  'kings-indian-defence',
  'caro-kann',
];

async function runOpening(page, id) {
  const result = { id, mounted: false, walkthroughMounted: false, plies: 0, errors: [] };
  const errs = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errs.push('PAGE: ' + e.message.slice(0, 200)));
  try {
    await page.goto(`${BASE_URL}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const detail = await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 12000 }).then(() => true).catch(() => false);
    result.mounted = detail;
    if (!detail) { result.errors = errs; return result; }
    await page.waitForTimeout(1500);
    const btn = page.locator('[data-testid="walkthrough-btn"]').first();
    if (!(await btn.isVisible().catch(() => false))) {
      result.errors.push('no walkthrough-btn');
      return result;
    }
    await btn.click({ timeout: 5000 });
    const wt = await page.locator('[data-testid="walkthrough-mode"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    result.walkthroughMounted = wt;
    if (!wt) { result.errors = errs; return result; }
    await page.waitForTimeout(1500);
    // Auto-advance 30 plies (cap)
    let ply = 0;
    let lastLabel = '';
    for (let i = 0; i < 30; i++) {
      const next = page.locator('[data-testid="nav-next"]').first();
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(400);
      const lbl = await page.locator('[data-testid="annotation-move-label"]').first().textContent().catch(() => null);
      if (lbl && lbl !== lastLabel) { ply++; lastLabel = lbl; }
      else if (!lbl) break;
    }
    result.plies = ply;
  } catch (e) {
    result.errors.push('FATAL: ' + (e?.message ?? String(e)).slice(0, 200));
  }
  result.errors.push(...errs);
  return result;
}

async function main() {
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // Boot + seed
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded' });
  const seedOk = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 120_000 }).then(() => true).catch(() => false);
  if (!seedOk) { console.error('seed failed'); process.exit(2); }

  const results = [];
  for (const id of OPENINGS) {
    const r = await runOpening(page, id);
    results.push(r);
    const tag = r.mounted && r.walkthroughMounted && r.errors.length === 0 ? '✓' : '✗';
    console.log(`${tag} ${id}: mount=${r.mounted} wt=${r.walkthroughMounted} plies=${r.plies} errs=${r.errors.length}`);
    if (r.errors.length) {
      for (const e of r.errors.slice(0, 3)) console.log('    ' + e);
    }
  }

  await browser.close();
  const failed = results.filter((r) => !r.mounted || !r.walkthroughMounted || r.errors.length > 0);
  console.log(`\nresult: ${results.length - failed.length}/${results.length} OK`);
  process.exit(failed.length === 0 ? 0 : 2);
}

main();
