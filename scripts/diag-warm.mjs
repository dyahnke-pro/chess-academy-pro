/** RETURNING-USER freeze repro. All prior diags hit the first-run calibration
 *  bubble. A returning user has NO bubble — they boot straight to the dashboard
 *  while the every-boot reconcile (model games / plans / pro-game-refs) runs.
 *  This: loads, dismisses the bubble + seeds once, then RELOADS (now a warm
 *  returning user) and hammers the section tiles, measuring responsiveness the
 *  whole time. If the warm reload freezes, THAT is David's bug. */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const log = (s) => console.log(s);
const responsive = async (page, ms = 4000) => {
  try { return await Promise.race([page.evaluate(() => 1 + 1).then(() => true), new Promise((r) => setTimeout(() => r(false), ms))]); }
  catch { return false; }
};
const hitTest = async (page, id) => page.evaluate((tid) => {
  const el = document.querySelector(`[data-testid="${tid}"]`);
  if (!el) return 'no-el';
  const r = el.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return el.contains(top) ? 'HITTABLE' : `blocked by <${top?.tagName}> testid=${top?.getAttribute?.('data-testid') ?? top?.closest?.('[data-testid]')?.getAttribute('data-testid') ?? '?'}`;
}, id);

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'WarmDiag/1.0' });
  // NOTE: we do NOT inject autoDismissCalibration on the first load — we tap the
  // real band so strengthCalibrated persists, making the RELOAD a true returning user.
  const page = await ctx.newPage();
  const errs = [], cons = [];
  page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 200)); });

  log(`\n========== RETURNING-USER FREEZE REPRO — ${BASE} ==========\n`);

  // --- First load: calibrate so the reload is a returning user ---
  log('--- first load (calibrate to become a returning user) ---');
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  const band = page.locator('[data-testid="skill-band-intermediate"]');
  if (await band.count()) { await band.click({ timeout: 8000 }).catch(() => {}); log('  tapped band'); }
  else log('  (no bubble on first load — already calibrated in this context)');
  // give the deferred seed real time to land + persist calibration
  log('  waiting 50s for deferred seed to complete + persist…');
  await page.waitForTimeout(50000);

  // --- RELOAD: now a warm returning user. Every-boot reconcile runs here. ---
  log('\n--- RELOAD #1 (returning user — reconcile runs) ---');
  const t0 = Date.now();
  await page.goto(`${BASE}/?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  log(`  domcontentloaded ${Date.now() - t0}ms`);
  // Poll responsiveness + tile hit-test repeatedly across the reconcile window.
  for (const t of [1, 3, 6, 10, 15, 22, 30]) {
    await page.waitForTimeout((t === 1 ? 1 : t - [0,1,3,6,10,15,22][[1,3,6,10,15,22,30].indexOf(t)]) * 1000);
    const r = await responsive(page);
    const hb = await hitTest(page, 'strength-calibration-bubble').catch(() => '?');
    const ht = await hitTest(page, 'section-openings').catch(() => '?');
    const bubble = await page.locator('[data-testid="strength-calibration-bubble"]').count();
    log(`  t+${t}s: responsive=${r} | bubble=${bubble} | section-openings=${ht}`);
  }

  // Try actually clicking a tile on the warm dashboard
  log('\n--- click section-openings on warm dashboard ---');
  const tile = page.locator('[data-testid="section-openings"]').first();
  if (await tile.count()) {
    const before = page.url();
    const ce = await tile.click({ timeout: 8000 }).then(() => null).catch((e) => e.message.split('\n')[0]);
    await page.waitForTimeout(3000);
    log(`  click: ${before.replace(BASE,'')} → ${page.url().replace(BASE,'')} | responsive=${await responsive(page)}${ce ? ` | CLICK-FAIL: ${ce}` : ''}`);
  } else log('  no section-openings tile found');

  log(`\nPAGE ERRORS (${errs.length}): ${errs.slice(0,8).join(' || ') || 'none'}`);
  log(`CONSOLE ERRORS (${cons.length}): ${cons.slice(0,8).join(' || ') || 'none'}`);
  log(`\n========== END ==========\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
