/** LOCAL: tap Start, mount the walk, step through, print each flagged
 *  mistake's narration (with the grounded best-move explanation). */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const log = (s) => console.log(s);
const txt = async (p, sel) => { try { const l = p.locator(sel).first(); return (await l.count()) ? (await l.innerText()).replace(/\s+/g, ' ').trim() : ''; } catch { return ''; } };
const has = async (p, sel) => { try { return (await p.locator(sel).count()) > 0; } catch { return false; } };
async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe });
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  const gid = process.env.GID ?? 'sample-italian-amateur-2';
  await page.goto(`${BASE}/coach/review/${gid}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  log(`\n=== ${gid} ===`);
  // wait for start-walk-btn enabled, then tap
  let tapped = false;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const btn = page.locator('[data-testid="start-walk-btn"]').first();
    if (await btn.count() && (await btn.getAttribute('disabled')) === null) { await btn.click().catch(() => {}); tapped = true; break; }
  }
  if (!tapped) { log('start-walk-btn never enabled'); await browser.close(); return; }
  await page.locator('[data-testid="review-forward-btn"]').first().waitFor({ timeout: 15000 }).catch(() => {});
  if (!(await has(page, '[data-testid="review-forward-btn"]'))) { log('walk did not mount after tap'); await browser.close(); return; }
  log('WALK MOUNTED. Stepping through, capturing flagged mistakes:\n');
  const fwd = page.locator('[data-testid="review-forward-btn"]');
  const flagged = [];
  for (let ply = 1; ply <= 80; ply++) {
    await fwd.click().catch(() => {});
    await page.waitForTimeout(350);
    const badge = await txt(page, '[data-testid="review-classification-badge"]');
    const narr = await txt(page, '[data-testid="review-narration-banner"]');
    if (/mistake|blunder|inaccura|miss/i.test(badge)) flagged.push({ ply, badge, narr });
    if ((await fwd.getAttribute('disabled')) !== null) break;
  }
  for (const f of flagged) { log(`  ply ${f.ply} [${f.badge}]: ${f.narr || '(none)'}`); }
  log(`\n${flagged.length} flagged mistakes.\n=== END ===\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
