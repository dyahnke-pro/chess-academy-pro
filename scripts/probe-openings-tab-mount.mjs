// Diagnosis probe (2026-09-20, #58): what does a FRESH context see on /openings,
// second by second? The Gotham audit reads "tab-toggle: 0" after 35 s + 90 s on
// a clean run, while `seedDatabase()` resolves after the CRITICAL seed only.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const PROD = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)); });
const t0 = Date.now();
const mode = process.argv[2] ?? 'direct';
if (mode === 'via-home') {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(35_000);
}
await page.goto(`${PROD}/openings`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch((e) => console.log('goto:', e.message.slice(0, 80)));
for (let i = 0; i < 36; i++) {
  const s = await page.evaluate(() => ({
    url: location.pathname,
    tab: document.querySelectorAll('[data-testid="tab-toggle"]').length,
    testids: [...document.querySelectorAll('[data-testid]')].slice(0, 8).map((e) => e.getAttribute('data-testid')),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 140),
  })).catch((e) => ({ url: '?', tab: -1, testids: [], text: 'evaluate failed: ' + e.message.slice(0, 60) }));
  console.log(`+${Math.round((Date.now() - t0) / 1000)}s url=${s.url} tab=${s.tab} testids=${JSON.stringify(s.testids)} text="${s.text}"`);
  if (s.tab > 0) break;
  await page.waitForTimeout(5000);
}
// Now the Pro tab, the way the audit does it: dismiss page-help, click tab-pro, poll for the grid.
const help = page.locator('[data-testid="page-help-modal"]');
console.log('page-help-modal present:', await help.count());
if (await help.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await help.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); }
const proTab = page.locator('[data-testid="tab-pro"]');
console.log('tab-pro count:', await proTab.count(), 'visible:', await proTab.first().isVisible().catch(() => false));
await proTab.first().click({ timeout: 5000 }).catch((e) => console.log('click failed:', e.message.slice(0, 120)));
for (let i = 0; i < 8; i++) {
  const s = await page.evaluate(() => ({
    pro: document.querySelectorAll('[data-testid="pro-repertoires-tab"]').length,
    cards: document.querySelectorAll('[data-testid^="pro-player-card-"]').length,
    active: [...document.querySelectorAll('[data-testid^="tab-"]')].map((e) => e.getAttribute('data-testid') + (e.getAttribute('aria-selected') === 'true' || /border-|bg-/.test(e.className) ? '' : '')).slice(0, 8),
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(120, 300),
  })).catch(() => null);
  console.log(`pro+${i * 3}s`, JSON.stringify(s).slice(0, 320));
  if (s && s.pro > 0) break;
  await page.waitForTimeout(3000);
}
console.log('errors:', errors.length, errors.slice(0, 6));
await browser.close();
