import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();
const log = (...a) => console.log('[probe]', ...a);

const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); log(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ' :: ' + extra : ''}`); };

try {
  // Boot once at root so the dataLoader seeds db.openings + persists it to
  // IndexedDB, THEN deep-link the Caro detail page (cold-boot seed race —
  // without the warm boot, getOpeningById misses and the page shows
  // "Opening not found").
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(12000);
  await page.goto(`${URL}/openings/caro-kann`, { waitUntil: 'domcontentloaded' });

  const card = page.locator('[data-testid="punish-gems-card"]');
  let cardVisible = false;
  for (let i = 0; i < 20 && !cardVisible; i++) {
    await page.waitForTimeout(1000);
    cardVisible = await card.isVisible().catch(() => false);
  }
  check('punish-gems card renders on the Caro detail page', cardVisible);

  if (cardVisible) {
    const gemTiles = page.locator('[data-testid^="punish-gem-"]');
    const n = await gemTiles.count();
    check('at least one gem tile', n > 0, `${n} tiles`);

    // The 4 WLPP buttons exist on the first gem.
    for (const mode of ['watch', 'learn', 'practice', 'play']) {
      const btn = page.locator(`[data-testid^="gem-${mode}-"]`).first();
      check(`gem ${mode} button present`, await btn.isVisible().catch(() => false));
    }

    // Watch mounts the player (board appears, detail page unmounts).
    await page.locator('[data-testid^="gem-watch-"]').first().click();
    await page.waitForTimeout(2500);
    const cardGone = !(await card.isVisible().catch(() => false));
    const squares = await page.locator('[data-square]').count();
    check('Watch mounts the playable line (detail card unmounts, board present)', cardGone && squares >= 64, `${squares} squares`);
  }
} catch (e) {
  check('probe ran without throwing', false, String(e).slice(0, 200));
} finally {
  await browser.close();
}

const passed = results.filter((r) => r.ok).length;
log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
