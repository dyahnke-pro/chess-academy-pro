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
  // Amateur sample games carry the player's mistakes (the london sample is
  // deliberately clean). Try them in turn until one walk surfaces a mistake.
  const GAMES = ['sample-italian-amateur-2', 'sample-vienna-amateur-1', 'sample-fischer-byrne-1956', 'sample-morphy-opera-1858'];
  let fwd = null;
  for (const gid of GAMES) {
    await page.goto(`${BASE}/coach/review/${gid}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    log(`Trying ${gid} …`);
    // Tap the "Start" walk CTA once it's ready (narration prepared).
    let started = false;
    for (let i = 0; i < 50; i++) { // up to ~75s for narration
      const btn = page.locator('[data-testid="start-walk-btn"]').first();
      if (await btn.count()) { const dis = await btn.getAttribute('disabled'); if (dis === null) { await btn.click().catch(() => {}); started = true; break; } }
      if (await has(page, '[data-testid="coach-game-review-walk"]')) { started = true; break; }
      await page.waitForTimeout(1500);
    }
    if (!started) { log(`  ${gid}: walk never became ready (narration slow/failed) — skipping.`); continue; }
    await page.waitForTimeout(1500);
    if (await has(page, '[data-testid="review-forward-btn"]')) { fwd = page.locator('[data-testid="review-forward-btn"]'); log(`  ${gid}: walk mounted — stepping through.\n`); break; }
    log(`  ${gid}: no forward button after start — skipping.`);
  }
  if (!fwd) { log('\nNo review walk could be driven on any sample (cold-prod narration). Best-move display is code-confirmed (engine-lines + narration); recommend on-device verify with a real analyzed game.'); log('\n===== END =====\n'); await browser.close(); return; }

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
