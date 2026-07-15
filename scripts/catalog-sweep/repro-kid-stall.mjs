// Repro probe for the kid-mode re-mount stall (prod audit: goto /kid →
// /kid/puzzles → goto /kid leaves kid-mode-page invisible for 45s+; mount
// times degrade per hop). Measures each mount + samples long tasks.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from '../audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0, 200)));

async function mount(label, url, testid, timeout = 60000) {
  const t0 = Date.now();
  await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  try {
    await page.locator(`[data-testid="${testid}"]`).waitFor({ timeout });
    console.log(`${label}: ${Date.now() - t0}ms`);
    return true;
  } catch {
    console.log(`${label}: TIMEOUT >${timeout}ms  (url now ${page.url()})`);
    return false;
  }
}

// dismiss first-run bubble
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
try {
  await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 15000 });
  await page.locator('[data-testid="skill-band-intermediate"]').click();
  await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 20000 });
  console.log('calibration dismissed');
} catch { console.log('no calibration bubble'); }

// the audit's exact 4-hop sequence
await mount('hop1 /kid', '/kid', 'kid-mode-page');
await mount('hop2 /kid/journey nav-back /kid', '/kid', 'kid-mode-page');
await page.goto(`${BASE}/kid/journey`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await mount('hop3 /kid after journey', '/kid', 'kid-mode-page');
await page.goto(`${BASE}/kid/fairy-tale`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await mount('hop4 /kid after fairy-tale', '/kid', 'kid-mode-page');
await page.goto(`${BASE}/kid/puzzles`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const ok = await mount('hop5 /kid after PUZZLES (the failing hop)', '/kid', 'kid-mode-page', 50000);
if (!ok) {
  // sample what's on the page + long tasks
  const html = await page.evaluate(() => document.body?.innerHTML?.slice(0, 400) ?? 'no body');
  console.log('body snippet:', html);
}
// second lap to check degradation
await page.goto(`${BASE}/kid/puzzles`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await mount('hop6 /kid after puzzles again', '/kid', 'kid-mode-page', 50000);
await browser.close();
console.log('PROBE DONE');
