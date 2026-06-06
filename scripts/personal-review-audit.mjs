/** Personal review audit — I drive prod's /coach/review walk, tap Start,
 *  step every ply, and dump each flagged mistake's narration VERBATIM so I
 *  can judge whether the grounded "why the best move is best" explanation is
 *  real ("It wins the knight on a4" / "left the pawn on c2 hanging") and not
 *  hand-wavy. Covers the three amateur sample games (the ones with real
 *  student mistakes). */
import { chromium } from 'playwright';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const log = (s) => console.log(s);
const txt = async (p, sel) => {
  try {
    const l = p.locator(sel).first();
    return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ').trim() : '';
  } catch { return ''; }
};
const has = async (p, sel) => {
  try { return (await p.locator(sel).count()) > 0; } catch { return false; }
};

const GAMES = ['sample-vienna-amateur-1', 'sample-italian-amateur-2', 'sample-london-amateur-3'];

async function driveGame(page, gid) {
  log(`\n================ ${gid} ================`);
  // Warm the review surface so the samples seed, then open the game.
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.goto(`${BASE}/coach/review/${gid}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the Start-walk button to enable (analysis settles), then tap.
  let tapped = false;
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(1000);
    const btn = page.locator('[data-testid="start-walk-btn"]').first();
    if ((await btn.count()) && (await btn.getAttribute('disabled')) === null) {
      await btn.click().catch(() => {});
      tapped = true;
      break;
    }
  }
  if (!tapped) { log('  start-walk-btn never enabled (analysis did not settle)'); return; }

  await page.locator('[data-testid="coach-game-review-walk"]').first()
    .waitFor({ timeout: 20000 }).catch(() => {});
  if (!(await has(page, '[data-testid="review-forward-btn"]'))) {
    log('  walk did not mount after Start'); return;
  }

  const fwd = page.locator('[data-testid="review-forward-btn"]').first();
  const flagged = [];
  let lastNarr = '';
  for (let ply = 1; ply <= 90; ply++) {
    await fwd.click().catch(() => {});
    await page.waitForTimeout(450);
    const badge = await txt(page, '[data-testid="review-classification-badge"]');
    const narr = await txt(page, '[data-testid="review-narration-banner"]');
    if (/mistake|blunder|inaccura|miss/i.test(badge) && narr && narr !== lastNarr) {
      flagged.push({ ply, badge, narr });
    }
    lastNarr = narr;
    if ((await fwd.getAttribute('disabled')) !== null) break;
  }

  if (!flagged.length) { log('  (no flagged mistakes captured)'); return; }
  for (const f of flagged) {
    log(`\n  ply ${f.ply}  [${f.badge}]`);
    log(`    ${f.narr}`);
  }
  log(`\n  → ${flagged.length} flagged mistakes captured.`);
}

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({
    headless: true, executablePath: exe, args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    userAgent: 'PersonalReviewAudit/1.0',
  });
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  log(`\n========== PERSONAL REVIEW AUDIT — ${BASE} ==========`);
  for (const gid of GAMES) {
    try { await driveGame(page, gid); } catch (e) { log(`  fatal on ${gid}: ${e.message}`); }
  }
  log(`\n========== END ==========\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
