/** P0 freeze diagnostic — load the dashboard, click main tabs, capture EVERY
 *  console msg, page error, failed request, and detect a frozen main thread.
 *  Prints a verbatim dump so I can see exactly what crashes/hangs. */
import { chromium } from 'playwright';
import {
  resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions,
} from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const log = (s) => console.log(s);

async function responsive(page, ms = 4000) {
  // Is the JS main thread still pumping? Race a trivial evaluate vs a timer.
  try {
    return await Promise.race([
      page.evaluate(() => { return 1 + 1; }).then(() => true),
      new Promise((r) => setTimeout(() => r(false), ms)),
    ]);
  } catch { return false; }
}

async function main() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'FreezeDiag/1.0',
  });
  if (process.env.DISMISS_BUBBLE !== '0') await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();

  const consoleMsgs = [];
  const pageErrors = [];
  const failedReqs = [];
  page.on('console', (m) => {
    const t = m.type();
    if (t === 'error' || t === 'warning') consoleMsgs.push(`[${t}] ${m.text().slice(0, 300)}`);
  });
  page.on('pageerror', (e) => pageErrors.push(`${e.name}: ${e.message}`.slice(0, 400)));
  page.on('requestfailed', (r) => failedReqs.push(`${r.failure()?.errorText ?? '?'} ${r.url().slice(0, 140)}`));
  page.on('crash', () => pageErrors.push('*** PAGE CRASHED ***'));

  log(`\n========== FREEZE DIAGNOSTIC — ${BASE} ==========\n`);

  // 1. Cold dashboard load
  log('--- loading dashboard (cold) ---');
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  } catch (e) { log(`goto threw: ${e.message}`); }
  log(`  domcontentloaded in ${Date.now() - t0}ms`);
  await page.waitForTimeout(6000);
  log(`  responsive after load? ${await responsive(page)}`);
  log(`  url: ${page.url()}`);
  // What's actually on screen?
  const dashState = await page.evaluate(() => ({
    title: document.title,
    bodyLen: document.body?.innerText?.length ?? 0,
    firstText: (document.body?.innerText ?? '').slice(0, 200).replace(/\s+/g, ' '),
    testids: [...document.querySelectorAll('[data-testid]')].slice(0, 40).map((e) => e.getAttribute('data-testid')),
    hasRoot: !!document.querySelector('#root')?.children?.length,
  })).catch((e) => ({ err: e.message }));
  log(`  title=${dashState.title} bodyLen=${dashState.bodyLen} hasRoot=${dashState.hasRoot}`);
  log(`  firstText: ${dashState.firstText}`);
  log(`  testids: ${(dashState.testids ?? []).join(', ')}`);

  // 2. Real navigation: dashboard section tiles + bottom-nav tabs. Test BOTH
  //    with the calibration bubble PRESENT (a real first-run user) and the
  //    nav tabs, checking responsiveness + whether the click navigates.
  const bubble = await page.locator('[data-testid="strength-calibration-bubble"]').count();
  log(`\n--- calibration bubble present? ${bubble > 0 ? 'YES (overlay may block taps)' : 'no'} ---`);
  // Does the bubble overlay intercept pointer events on the section tiles?
  if (bubble > 0) {
    const blocked = await page.evaluate(() => {
      const tile = document.querySelector('[data-testid="section-openings"]');
      if (!tile) return 'no-tile';
      const r = tile.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      const onTile = tile.contains(top);
      return onTile ? 'tile-is-hittable' : `BLOCKED by <${top?.tagName}> testid=${top?.getAttribute?.('data-testid') ?? top?.closest?.('[data-testid]')?.getAttribute('data-testid') ?? '?'}`;
    }).catch((e) => `probe-err ${e.message}`);
    log(`  section-openings hit-test (bubble up): ${blocked}`);
  }

  const targets = [
    'section-openings', 'section-coach', 'section-tactics', 'section-weaknesses',
    'nav-openings-tab', 'nav-coach-home-tab', 'nav-tactics-tab', 'nav-weaknesses-tab',
  ];
  for (const id of targets) {
    const sel = `[data-testid="${id}"]`;
    try {
      const loc = page.locator(sel).first();
      if (!(await loc.count())) { log(`  (skip ${id} — not found)`); continue; }
      const before = page.url();
      const clickErr = await loc.click({ timeout: 6000 }).then(() => null).catch((e) => e.message.split('\n')[0]);
      await page.waitForTimeout(3500);
      const r = await responsive(page);
      log(`  ${id}: ${before.replace(BASE,'')} → ${page.url().replace(BASE,'')} | responsive=${r}${clickErr ? ` | CLICK-FAIL: ${clickErr}` : ''}`);
      if (!r) { log(`  *** FROZE after clicking ${id} ***`); break; }
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(2500);
    } catch (e) { log(`  ${id} error: ${e.message}`); }
  }

  log(`\n========== CAPTURED ==========`);
  log(`PAGE ERRORS (${pageErrors.length}):`);
  pageErrors.slice(0, 20).forEach((e) => log(`  • ${e}`));
  log(`\nCONSOLE error/warn (${consoleMsgs.length}):`);
  consoleMsgs.slice(0, 30).forEach((e) => log(`  • ${e}`));
  log(`\nFAILED REQUESTS (${failedReqs.length}):`);
  failedReqs.slice(0, 25).forEach((e) => log(`  • ${e}`));
  log(`\n========== END ==========\n`);
  await browser.close();
}
main().catch((e) => { console.error('fatal:', e); process.exit(1); });
