// Post-deploy audit for the 2026-07-07 batch: the new Counter-Weapons tab on
// /openings + the removal of the opening-course shelves from /academy. Drives the
// LIVE prod UI (AUDIT_SANDBOX=1 for the resigned cert) and asserts real DOM state.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const results = [];
const rec = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' :: ' + detail : ''}`); };

async function dismiss(page) {
  // AI-consent modal (blocks everything until answered)
  try {
    if (await page.locator('[data-testid="ai-consent-modal"]').count()) {
      await page.locator('[data-testid="ai-consent-allow"]').click({ timeout: 4000 }).catch(() => {});
      await page.locator('[data-testid="ai-consent-modal"]').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
    }
  } catch { /* noop */ }
  // strength calibration bubble
  try {
    if (await page.locator('[data-testid="strength-calibration-bubble"]').count()) {
      await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => {});
      await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  } catch { /* noop */ }
  // page-help modal
  try {
    if (await page.locator('[data-testid="page-help-modal"]').count()) {
      await page.locator('[data-testid="page-help-close"]').click({ timeout: 4000 }).catch(() => {});
      await page.keyboard.press('Escape').catch(() => {});
    }
  } catch { /* noop */ }
}

const isLocal = /localhost|127\.0\.0\.1/.test(URL);
const proxyServer = isLocal ? null : (process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  headless: true,
  args: sandboxLaunchArgs(),
  ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
});
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
try {
  // ── /openings: Counter-Weapons tab ─────────────────────────────────────────
  await page.goto(`${URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2000);
  await dismiss(page);
  await page.locator('[data-testid="tab-toggle"]').waitFor({ timeout: 60000 });
  await dismiss(page);
  const counterTab = page.locator('[data-testid="tab-counter"]');
  rec('Counter tab button present on /openings', await counterTab.count() > 0);
  await counterTab.click({ timeout: 8000, force: true });
  // anti-openings seed in the DEFERRED backfill; CounterWeaponsTab re-polls. Wait
  // for the cards to land (cold localhost/prod seed can take ~60s).
  const card0 = page.locator('[data-testid^="opening-card-anti-"]').first();
  await card0.waitFor({ timeout: 90000 }).catch(() => {});
  // deferred seed streams in — poll until the full set lands (or 60s / stable)
  let cardCount = 0, stable = 0;
  for (let i = 0; i < 30; i++) {
    const n = await page.locator('[data-testid^="opening-card-anti-"]').count();
    if (n >= 20) { cardCount = n; break; }
    if (n === cardCount) { stable++; if (stable >= 4) break; } else { stable = 0; }
    cardCount = n;
    await page.waitForTimeout(2000);
  }
  rec('Counter tab renders anti-opening cards', cardCount >= 5, `${cardCount} anti-opening cards`);
  // open one to confirm it routes to a real /openings/:id detail
  const firstCard = page.locator('[data-testid^="opening-card-anti-"]').first();
  if (await firstCard.count()) {
    await firstCard.click({ timeout: 8000, force: true }).catch(() => {});
    await page.waitForTimeout(2500);
    rec('Counter card routes to an opening detail', /\/openings\//.test(page.url()), page.url().replace(URL, ''));
  }

  // ── /academy: course shelves removed, audiobook kept ────────────────────────
  await page.goto(`${URL}/academy`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('[data-testid="academy"]').waitFor({ timeout: 30000 });
  await dismiss(page);
  await page.waitForTimeout(1500);
  const coursesGone = (await page.locator('[data-testid="academy-courses"]').count()) === 0;
  rec('Academy course shelves removed', coursesGone);
  const bookPresent = (await page.locator('[data-testid="academy-book"]').count()) > 0;
  rec('Academy audiobook still present', bookPresent);
  const libraryLink = (await page.locator('[data-testid="academy-library-link"]').count()) > 0;
  rec('Coaches Library reachable from Academy', libraryLink);
} catch (e) {
  rec('audit run', false, String(e).slice(0, 200));
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
