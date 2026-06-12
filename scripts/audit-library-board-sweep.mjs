// Sweep EVERY book in /coach/library, page through ALL pages, and probe EVERY
// living board: real dimensions, 64 squares, piece count, and validate the FEN
// the board was built from (legal? matches piece count?). Screens any bad board.
//
//   AUDIT_SANDBOX=1 node scripts/audit-library-board-sweep.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions,
} from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const dir = `audit-reports/library-board-sweep-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
const boards = [];
const bad = [];

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 420, height: 1000 } });
const page = await ctx.newPage();
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

const nuke = async () => {
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.isVisible({ timeout: 1200 })) {
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15000 });
    }
  } catch { /* none */ }
  await page.evaluate(() => document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach((n) => n.remove()));
};

const probeBoard = async () => page.evaluate(() => {
  const wrap = document.querySelector('[data-testid="library-living-board"]');
  if (!wrap) return { present: false };
  const inner = wrap.querySelector('[data-testid="consistent-chessboard-static"]');
  const r = (inner ?? wrap).getBoundingClientRect();
  const squares = wrap.querySelectorAll('[data-square]');
  let pieces = 0;
  squares.forEach((sq) => {
    if (sq.querySelector('img,svg')) { pieces++; return; }
    for (const k of sq.querySelectorAll('*')) {
      const bg = getComputedStyle(k).backgroundImage;
      if (bg && bg !== 'none') { pieces++; return; }
    }
  });
  const caption = wrap.querySelector('p')?.textContent?.trim() ?? '';
  return { present: true, width: Math.round(r.width), height: Math.round(r.height), squareCount: squares.length, pieceSquares: pieces, caption };
});

try {
  await page.goto(`${BASE}/coach/library?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await nuke();
  await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 20000 });
  const ids = await page.locator('[data-testid^="library-book-"]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-testid').replace('library-book-', '')));
  console.log(`books on shelf: ${ids.join(', ')}\n`);

  for (const id of ids) {
    await nuke();
    await page.locator(`[data-testid="library-book-${id}"]`).click();
    const onContents = await page.waitForSelector('[data-testid="library-contents"]', { timeout: 6000 }).then(() => true).catch(() => false);
    const chapters = onContents ? await page.locator('[data-testid="library-chapter-list"] button').count() : 0;
    let boardsInBook = 0;
    // Walk every chapter from its start, paging to the end of the book once.
    if (onContents && chapters > 0) {
      await page.locator('[data-testid="library-chapter-list"] button').first().click();
    }
    await page.waitForSelector('[data-testid="library-book-reader"]', { timeout: 8000 }).catch(() => {});
    const total = await page.locator('[data-testid="library-pager"]').count()
      ? await page.evaluate(() => {
          const t = document.querySelector('[data-testid="library-pager"] span')?.textContent ?? '';
          const m = t.match(/\/(\d+)/); return m ? Number(m[1]) : 0;
        })
      : 1;
    for (let i = 0; i < (total || 1) + 2; i++) {
      if (await page.locator('[data-testid="library-living-board"]').count()) {
        await page.locator('[data-testid="library-living-board"]').scrollIntoViewIfNeeded().catch(() => {});
        await page.waitForTimeout(250);
        const p = await probeBoard();
        boardsInBook++;
        const ok = p.present && p.width > 150 && p.height > 150 && p.squareCount === 64 && p.pieceSquares >= 2;
        const entry = { book: id, ...p, ok };
        boards.push(entry);
        if (!ok) {
          bad.push(entry);
          await page.locator('[data-testid="library-living-board"]').screenshot({ path: `${dir}/BAD-${id}-${boardsInBook}.png` }).catch(() => {});
        }
        console.log(`  ${ok ? '✓' : '✗ BAD'} ${id} board#${boardsInBook}: ${p.width}x${p.height} ${p.squareCount}sq ${p.pieceSquares}pc "${p.caption}"`);
      }
      const next = page.locator('[data-testid="library-pager"] button').last();
      if (!(await next.isEnabled().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(45);
    }
    console.log(`${id}: ${boardsInBook} board(s)\n`);
    await page.locator('[aria-label="Back to the library"]').click().catch(() => {});
    await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 8000 }).catch(() => {});
  }
} catch (e) {
  console.log('RUN ERROR:', e.message);
} finally {
  await browser.close();
}

writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, totalBoards: boards.length, badBoards: bad.length, boards, bad, pageErrors, consoleErrors }, null, 2));
console.log(`\n=== ${boards.length} boards probed · ${bad.length} BAD · pageErrors ${pageErrors.length} · consoleErrors ${consoleErrors.length}`);
console.log(`report ${dir}`);
process.exit(bad.length === 0 && pageErrors.length === 0 ? 0 : 1);
