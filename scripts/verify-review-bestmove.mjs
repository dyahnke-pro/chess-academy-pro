/** Focused prod check: when reviewing a played game and landing on a move
 *  the player got WRONG, does the app show/explain the BEST move? Steps
 *  through a seeded review game and prints, per ply, the classification
 *  badge + the narration banner + whether engine lines are shown — so a
 *  human can read whether mistakes get a best-move explanation. */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const log = (s) => console.log(s);
const txt = async (page, sel) => { try { const l = page.locator(sel).first(); return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };
const has = async (page, sel) => { try { return (await page.locator(sel).count()) > 0; } catch { return false; } };

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'VerifyReviewBestMove/1.0' });
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();

  log(`\n===== REVIEW BEST-MOVE VERIFY — ${BASE} =====\n`);
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  // wait for cards
  let card = null;
  for (let i = 0; i < 30; i++) { const c = page.locator('[data-testid^="review-game-card"], [data-testid="review-card"], a[href*="/coach/review/"]'); if (await c.count()) { card = c.first(); break; } await page.waitForTimeout(1000); }
  if (!card) { log('NO review cards found — cannot verify.'); await browser.close(); return; }
  await card.click().catch(() => {});
  await page.waitForTimeout(4000);
  log(`Review session: ${page.url()}`);
  // The walk-the-game view (with nav controls) only renders once narration
  // segments are ready; until then the ReviewSummaryCard fallback shows.
  // On a cold prod context narration generation can take a while — wait.
  let walked = false;
  for (let i = 0; i < 60; i++) { // up to ~90s
    if (await has(page, '[data-testid="coach-game-review-walk"]') && await has(page, '[data-testid="review-forward-btn"]')) { walked = true; break; }
    await page.waitForTimeout(1500);
  }
  if (!walked) {
    const summary = await txt(page, '[data-testid="review-summary-card"], .review-summary, [class*="summary"]');
    log(`\nWalk view did not appear (narration still generating or fell back to summary).`);
    log(`Summary card text (first 600): ${summary.slice(0, 600) || '(none captured)'}`);
    log(`\n===== END =====\n`);
    await browser.close();
    return;
  }
  log('Walk view mounted — stepping through.\n');
  const fwd = page.locator('[data-testid="review-forward-btn"]');

  const flagged = [];
  for (let ply = 1; ply <= 80; ply++) {
    await fwd.click().catch(() => {});
    await page.waitForTimeout(450);
    const badge = await txt(page, '[data-testid="review-classification-badge"]');
    const narr = await txt(page, '[data-testid="review-narration-banner"]');
    // Record any ply flagged as a real mistake (badge mentions mistake/blunder/inaccuracy/miss)
    if (/mistake|blunder|inaccura|missed|\?\?|\?!/i.test(badge)) {
      // Open the engine-lines panel to capture the deterministic best line.
      let engineLine = '';
      const toggle = page.locator('[data-testid="review-engine-lines-toggle"]').first();
      if (await toggle.count()) { await toggle.click().catch(() => {}); await page.waitForTimeout(500); engineLine = await txt(page, '[data-testid="review-engine-lines-panel"]'); }
      flagged.push({ ply, badge, narr, engineLine });
    }
    if (await fwd.getAttribute('disabled') !== null) break;
  }

  if (flagged.length === 0) {
    log('No moves were flagged as mistakes in this game (clean game or unanalyzed).');
  } else {
    log(`Flagged mistakes in this game: ${flagged.length}\n`);
    for (const f of flagged) {
      const namesBest = /best (?:was|move|is)|should have|instead of|stronger|the move was|engine prefers/i.test(f.narr);
      log(`  ply ${f.ply} — badge: "${f.badge}"`);
      log(`     narration: "${f.narr || '(none)'}"`);
      log(`     narration names a best move: ${namesBest}`);
      log(`     engine-lines panel: "${(f.engineLine || '(not shown)').slice(0, 120)}"`);
    }
  }
  log(`\n===== END =====\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
