/**
 * PATTERN SCHOOL prod probe — /tactics/patterns (David 2026-07-22).
 * Verifies on the LIVE bundle: the hub tile routes, every registry card
 * renders, a card expands to the identify/recognize/prevent trio, the real
 * example board mounts from the seeded puzzle corpus, and the drill button
 * lands on the adaptive trainer.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *      AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *      node scripts/audit-pattern-school-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const add = (name, ok, note) => { results.push({ name, ok, note }); console.log(`  ${ok ? '✅ PASS' : '❌ FAIL'}  ${name.padEnd(28)} ${note}`); };

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${BASE}/tactics/patterns`, { waitUntil: 'domcontentloaded', timeout: 60000 });

// Fresh-context overlays (strength bubble, AI consent, page help) mount at
// their own pace and each intercepts pointer events — loop until the page
// has been overlay-free twice in a row.
let quiet = 0;
for (let i = 0; i < 30 && quiet < 2; i++) {
  let acted = false;
  const band = page.locator('[data-testid="skill-band-intermediate"]');
  if (await band.count().catch(() => 0)) {
    await band.click({ timeout: 3000 }).catch(() => {});
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    acted = true;
  }
  const consent = page.locator('[data-testid="ai-consent-allow"]');
  if (await consent.count().catch(() => 0)) {
    await consent.click({ timeout: 3000 }).catch(() => {});
    await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    acted = true;
  }
  const help = page.locator('[data-testid="page-help-modal"] button').first();
  if (await help.count().catch(() => 0)) { await help.click({ timeout: 3000 }).catch(() => {}); acted = true; }
  quiet = acted ? 0 : quiet + 1;
  await page.waitForTimeout(1000);
}

await page.locator('[data-testid="pattern-school-page"]').waitFor({ timeout: 20000 });
add('page-mounts', true, 'pattern-school-page visible');

const cards = await page.locator('[data-testid^="pattern-card-"]').count();
add('all-cards-render', cards >= 11, `${cards} pattern cards`);

await page.locator('[data-testid="pattern-toggle-fork"]').click();
const trio = await page.locator('text=Identify.').count() > 0
  && await page.locator('text=Recognize.').count() > 0
  && await page.locator('text=Prevent.').count() > 0;
add('trio-teaches', trio, 'identify/recognize/prevent visible');

// The example board needs the puzzle seed — allow the deferred seed time.
let boardOk = false;
for (let i = 0; i < 24; i++) {
  if (await page.locator('[data-testid="pattern-example-board-fork"]').count()) { boardOk = true; break; }
  // 'none' state (seed not landed yet on cold context) → keep waiting
  await page.waitForTimeout(5000);
}
add('example-board', boardOk, boardOk ? 'real corpus position rendered' : 'no example board in 120s (cold-seed window or none-state)');

await page.locator('[data-testid="pattern-drill-fork"]').click();
await page.waitForURL('**/tactics/adaptive', { timeout: 15000 }).then(() => add('drill-routes', true, 'landed on /tactics/adaptive')).catch(() => add('drill-routes', false, `url=${page.url()}`));

// The hub tile.
await page.goto(`${BASE}/tactics`, { waitUntil: 'domcontentloaded' });
const tile = page.locator('text=Pattern Recognition').first();
await tile.waitFor({ timeout: 15000 }).then(() => add('hub-tile', true, 'tile present on /tactics')).catch(() => add('hub-tile', false, 'tile missing'));

add('no-page-errors', errors.length === 0, errors.length ? errors[0].slice(0, 120) : 'none');

await browser.close();
const pass = results.filter((r) => r.ok).length;
console.log(`\n===== PATTERN SCHOOL PROBE: ${pass === results.length ? '✅ MEETS' : '❌ FAIL'} (${pass}/${results.length}) =====`);
process.exit(pass === results.length ? 0 : 1);
