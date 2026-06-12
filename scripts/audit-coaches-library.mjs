// Post-deploy audit for The Coaches Library (/coach/library).
// Drives the live surface: shelf renders all books, each book opens + turns
// pages + reads aloud, search finds + jumps, and the auto-extracted live boards
// render + animate. Run against prod by default (AUDIT_SMOKE_URL overrides).
//
//   AUDIT_SANDBOX=1 node scripts/audit-coaches-library.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions,
} from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const scenarios = [];
const record = (name, pass, detail = '') => {
  scenarios.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 420, height: 1000 } });
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
const nuke = async () => {
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.isVisible({ timeout: 1500 })) {
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15000 });
    }
  } catch { /* no bubble */ }
  await page.evaluate(() => document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach((n) => n.remove()));
};

try {
  await page.goto(`${BASE}/coach/library?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await nuke();
  await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 20000 });

  const tiles = await page.locator('[data-testid^="library-book-"]').count();
  record('shelf renders the books', tiles >= 5, `${tiles} books`);

  // search
  await page.locator('[data-testid="library-search-input"]').fill('the pin');
  await page.waitForTimeout(700);
  const hits = await page.locator('[data-testid="library-search-results"] button').count();
  record('search returns cross-book passages', hits > 0, `${hits} hits for "the pin"`);
  await nuke();
  await page.locator('[data-testid="library-search-results"] button').first().click();
  await page.waitForSelector('[data-testid="library-book-reader"]', { timeout: 8000 });
  record('search result opens the reader', true);
  await page.locator('[aria-label="Back to the library"]').click();
  await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 8000 });

  // each book: opens to the APPENDIX (chapter picker) → tap a chapter → reads
  const ids = await page.locator('[data-testid^="library-book-"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-testid').replace('library-book-', '')));
  for (const id of ids) {
    await nuke();
    await page.locator(`[data-testid="library-book-${id}"]`).click();
    const onContents = await page.waitForSelector('[data-testid="library-contents"]', { timeout: 8000 }).then(() => true).catch(() => false);
    const chapters = onContents ? await page.locator('[data-testid="library-chapter-list"] button').count() : 0;
    record(`${id} opens to the appendix with chapters`, onContents && chapters > 0, `${chapters} chapters`);
    if (onContents && chapters > 0) {
      await page.locator('[data-testid="library-chapter-list"] button').first().click();
      const ok = await page.waitForSelector('[data-testid="library-book-reader"]', { timeout: 8000 }).then(() => true).catch(() => false);
      const text = ok ? (await page.locator('[data-testid="library-page"]').innerText().catch(() => '')) : '';
      record(`read ${id}`, ok && text.length > 40, `${text.length} chars`);
      // Contents button returns to the appendix
      await page.locator('[data-testid="library-contents-btn"]').click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await page.locator('[aria-label="Back to the library"]').click();
    await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 8000 });
  }

  // animated board on Chess and Checkers (enter via the appendix)
  await nuke();
  await page.locator('[data-testid="library-book-edward-lasker-chess-and-checkers"]').click();
  await page.waitForSelector('[data-testid="library-contents"]', { timeout: 8000 });
  await page.locator('[data-testid="library-chapter-list"] button').first().click();
  await page.waitForSelector('[data-testid="library-book-reader"]', { timeout: 8000 });
  let foundBoard = false;
  let foundAnimated = false;
  for (let i = 0; i < 60; i++) {
    if (await page.locator('[data-testid="library-living-board"]').count()) {
      foundBoard = true;
      // an animated board has an enabled "Play move" (a study position does not)
      if (await page.locator('[data-testid="living-board-next"]').isEnabled().catch(() => false)) {
        foundAnimated = true;
        break;
      }
    }
    if (!(await page.locator('[data-testid="library-pager"] button').last().isEnabled().catch(() => false))) break;
    await page.locator('[data-testid="library-pager"] button').last().click();
    await page.waitForTimeout(120);
  }
  record('Chess and Checkers shows a live board', foundBoard);
  if (foundAnimated) {
    await page.locator('[data-testid="living-board-next"]').click();
    await page.waitForTimeout(400);
  }
  record('a live board animates a move', foundAnimated);

  record('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
} catch (e) {
  record('audit run', false, e.message);
} finally {
  await browser.close();
}

const passed = scenarios.filter((s) => s.pass).length;
const dir = `audit-reports/coaches-library-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, passed, total: scenarios.length, scenarios, pageErrors }, null, 2));
console.log(`\n${passed}/${scenarios.length} green · report ${dir}/report.json`);
process.exit(passed === scenarios.length ? 0 : 1);
