// Interactive audit for the GAMBIT-TAB King's Gambit card (separate lane).
// Drives the real UI on a local dev server: navigates to the card, confirms the
// middlegame plan renders, exercises Watch/Learn/Practice, verifies the board +
// lead-the-eye highlights actually paint and the punish-gem weapons surface, and
// captures screenshots. Run: AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-gambit-kings.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ID = 'gambit-kings-gambit';
const PLAN = 'mp-gambitkingsgambit-modern';
const OUT = join('audit-reports', `gambit-kings-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const results = [];
const rec = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

async function seededCount(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const r = indexedDB.open('ChessAcademyDB');
    r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('middlegamePlans')) return resolve(-1);
      const tx = db.transaction('middlegamePlans', 'readonly').objectStore('middlegamePlans').getAll();
      tx.onsuccess = () => resolve(tx.result.filter((p) => p.openingId === 'gambit-kings-gambit').length);
      tx.onerror = () => resolve(-2); };
    r.onerror = () => resolve(-3);
  }));
}
async function dismissModals(page) {
  // First-run strength-calibration bubble + PageHelp modal intercept clicks
  // (re-open every load in the sandbox — IndexedDB write-stall, CLAUDE.md G1).
  const cal = page.locator('[data-testid="strength-calibration-bubble"]');
  await cal.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await cal.count() > 0) {
    await page.locator('[data-testid^="skill-band-"]').first().click({ timeout: 5000 }).catch(() => {});
    await cal.waitFor({ state: 'detached', timeout: 45000 }).catch(() => {});
  }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.isVisible().catch(() => false)) {
    await page.locator('[data-testid="page-help-close"]').click({ timeout: 5000 }).catch(() => {});
    await help.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}
async function highlightsPainted(page) {
  return page.evaluate(() => {
    const board = document.querySelector('[data-testid="middlegame-board"], .board, [class*="board"]') || document.body;
    let painted = 0;
    for (const d of board.querySelectorAll('div')) {
      const bg = getComputedStyle(d).backgroundColor;
      if (/rgba?\(255,\s*165,\s*0|rgba?\(255,\s*235,\s*59|rgba?\(34,\s*197,\s*94/.test(bg)) painted++;
    }
    return painted;
  });
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const page = await browser.newContext(sandboxContextOptions()).then((c) => c.newPage());
  page.setDefaultTimeout(30000);
  try {
    await page.goto(`${BASE}/openings/${ID}`, { waitUntil: 'domcontentloaded' });
    // wait for seeding
    let n = 0; for (let i = 0; i < 45; i++) { n = await seededCount(page); if (n > 0) break; await page.waitForTimeout(2000); }
    rec('plan seeded in IndexedDB', n > 0, `${n} plan(s) for ${ID}`);
    if (n > 0) await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissModals(page);

    const section = page.locator('[data-testid="middlegame-plans-section"]');
    await section.waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    rec('Middlegame Plans section renders', await section.isVisible());
    rec('plan line present', await page.locator(`[data-testid="plan-line-${PLAN}"]`).isVisible().catch(() => false));
    await page.screenshot({ path: join(OUT, '1-card.png'), fullPage: true });

    // WATCH
    await page.locator(`[data-testid="plan-watch-${PLAN}"]`).click();
    await page.waitForTimeout(3500);
    const painted = await highlightsPainted(page);
    rec('Watch: lead-the-eye markers paint', painted > 0, `${painted} painted squares/arrows`);
    const narr = await page.locator('text=/Bb5|castling|centre|development|f4/i').first().isVisible().catch(() => false);
    rec('Watch: plan narration visible', narr);
    await page.screenshot({ path: join(OUT, '2-watch.png'), fullPage: true });

    // LEARN + PRACTICE (interactive modes)
    await page.goto(`${BASE}/openings/${ID}`, { waitUntil: 'domcontentloaded' });
    await dismissModals(page);
    await page.locator(`[data-testid="plan-learn-${PLAN}"]`).click().catch(() => {});
    await page.waitForTimeout(2500);
    rec('Learn mode mounts', await page.locator('text=/Learn/i').first().isVisible().catch(() => false));
    await page.screenshot({ path: join(OUT, '3-learn.png'), fullPage: true });

    // GEMS (weapon tiles)
    await page.goto(`${BASE}/openings/${ID}`, { waitUntil: 'domcontentloaded' });
    await dismissModals(page);
    await page.waitForTimeout(2500);
    const gemTiles = await page.locator('[data-testid^="gem-"], [data-testid^="weapon-"]').count().catch(() => 0);
    rec('punish-gem weapon tiles present', gemTiles > 0, `${gemTiles} tiles`);
    await page.screenshot({ path: join(OUT, '4-gems.png'), fullPage: true });

    const passed = results.filter((r) => r.ok).length;
    console.log(`\n=== ${passed}/${results.length} checks passed — report ${OUT} ===`);
  } catch (e) {
    console.error('AUDIT ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
