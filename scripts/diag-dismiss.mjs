/** Does the REAL calibration-dismiss path work on prod? Tap a skill band
 *  (no CSS workaround), watch if the bubble detaches, then drive nav. This is
 *  exactly what David does. Captures console/pageerror + audit 'strength-
 *  calibrated' / 'uncaught-error' signals. */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const log = (s) => console.log(s);
const responsive = async (page, ms = 4000) => {
  try { return await Promise.race([page.evaluate(() => 1 + 1).then(() => true), new Promise((r) => setTimeout(() => r(false), ms))]); }
  catch { return false; }
};

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'DismissDiag/1.0' });
  const page = await ctx.newPage();
  const errs = [], cons = [];
  page.on('pageerror', (e) => errs.push(`${e.name}: ${e.message}`.slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') cons.push(m.text().slice(0, 200)); });

  log(`\n========== DISMISS-PATH DIAGNOSTIC — ${BASE} ==========\n`);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
  log(`bubble present on load: ${(await bubble.count()) > 0}`);

  // Tap the band exactly as a user would.
  const band = page.locator('[data-testid="skill-band-intermediate"]');
  if (!(await band.count())) { log('no band button — bubble not showing; nav test only'); }
  else {
    log('tapping skill-band-intermediate (real applyStrength → Dexie write)…');
    const tClick = Date.now();
    await band.click({ timeout: 8000 }).catch((e) => log(`band click threw: ${e.message.split('\n')[0]}`));
    // Watch for the bubble to detach — poll up to 30s.
    let detached = false;
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      if ((await bubble.count()) === 0) { detached = true; break; }
      // surface 'Saving…' / error text
      if (i === 4 || i === 14) {
        const saving = await page.locator('text=Saving…').count();
        const err = await page.locator('[data-testid="calibration-error"]').count();
        log(`  t+${i + 1}s: still up (saving=${saving} error=${err})`);
      }
    }
    log(`bubble detached after band tap? ${detached ? `YES (~${Math.round((Date.now() - tClick) / 1000)}s)` : 'NO — STILL UP after 30s (★ FREEZE ★)'}`);
  }

  // Whether or not it detached, is the dashboard now usable?
  const r1 = await responsive(page);
  const tileHit = await page.evaluate(() => {
    const tile = document.querySelector('[data-testid="section-openings"]');
    if (!tile) return 'no-tile';
    const rr = tile.getBoundingClientRect();
    const top = document.elementFromPoint(rr.left + rr.width / 2, rr.top + rr.height / 2);
    return tile.contains(top) ? 'HITTABLE' : `blocked by ${top?.getAttribute?.('data-testid') ?? top?.tagName}`;
  }).catch((e) => `err ${e.message}`);
  log(`\npost-dismiss: responsive=${r1} | section-openings=${tileHit}`);

  // Now click a main tab (symptom 2: "freezes after clicking a main tab")
  for (const id of ['section-openings', 'nav-tactics-tab', 'nav-coach-home-tab']) {
    const loc = page.locator(`[data-testid="${id}"]`).first();
    if (!(await loc.count())) { log(`  (skip ${id})`); continue; }
    const before = page.url();
    const ce = await loc.click({ timeout: 6000 }).then(() => null).catch((e) => e.message.split('\n')[0]);
    await page.waitForTimeout(4000);
    const r = await responsive(page);
    log(`  click ${id}: ${before.replace(BASE, '')} → ${page.url().replace(BASE, '')} | responsive=${r}${ce ? ` | CLICK-FAIL ${ce}` : ''}`);
    if (!r) { log(`  *** FROZE after ${id} ***`); break; }
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
  }

  log(`\nPAGE ERRORS (${errs.length}): ${errs.slice(0, 10).join(' || ') || 'none'}`);
  log(`CONSOLE ERRORS (${cons.length}): ${cons.slice(0, 10).join(' || ') || 'none'}`);
  log(`\n========== END ==========\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
