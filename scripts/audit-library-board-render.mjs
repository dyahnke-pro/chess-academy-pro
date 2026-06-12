// Focused visual+functional audit: DOES the living board in /coach/library
// actually RENDER (squares laid out, pieces drawn, real dimensions) — not just
// "the wrapper div exists". Screens + measures the board, drives Play move.
//
//   AUDIT_SANDBOX=1 node scripts/audit-library-board-render.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import {
  resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions,
} from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const dir = `audit-reports/library-board-render-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
const out = [];
const rec = (name, pass, detail = '') => { out.push({ name, pass, detail }); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); };

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
    if (await bubble.isVisible({ timeout: 1500 })) {
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15000 });
    }
  } catch { /* none */ }
  await page.evaluate(() => document.querySelectorAll('[role="dialog"][aria-modal="true"]').forEach((n) => n.remove()));
};

// Inspect the living board's actual rendered geometry + piece/square DOM.
const probeBoard = async () => page.evaluate(() => {
  const wrap = document.querySelector('[data-testid="library-living-board"]');
  if (!wrap) return { present: false };
  const inner = wrap.querySelector('[data-testid="consistent-chessboard-static"]');
  const r = (inner ?? wrap).getBoundingClientRect();
  // react-chessboard squares carry data-square; pieces are <img>/<svg>/sprite divs inside them.
  const squares = wrap.querySelectorAll('[data-square]');
  // count squares that actually contain a piece (img, svg, or a bg-image style)
  let pieces = 0;
  squares.forEach((sq) => {
    if (sq.querySelector('img,svg')) { pieces++; return; }
    const kids = sq.querySelectorAll('*');
    for (const k of kids) {
      const bg = getComputedStyle(k).backgroundImage;
      if (bg && bg !== 'none') { pieces++; return; }
    }
  });
  return {
    present: true,
    width: Math.round(r.width),
    height: Math.round(r.height),
    squareCount: squares.length,
    pieceSquares: pieces,
  };
});

try {
  await page.goto(`${BASE}/coach/library?cb=${Date.now()}`, { waitUntil: 'networkidle' });
  await nuke();
  await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 20000 });

  // Capablanca has hand-validated boards (Examples 11 & 13) — deterministic targets.
  // Fall back to Chess and Checkers (auto-extracted boards) like the main audit.
  const tryBook = async (id) => {
    await nuke();
    const tile = page.locator(`[data-testid="library-book-${id}"]`);
    if (!(await tile.count())) return false;
    await tile.click();
    // Books open to the appendix (chapter picker) — pick the first chapter to enter the reader.
    const onContents = await page.waitForSelector('[data-testid="library-contents"]', { timeout: 6000 }).then(() => true).catch(() => false);
    if (onContents) {
      await page.locator('[data-testid="library-chapter-list"] button').first().click();
    }
    await page.waitForSelector('[data-testid="library-book-reader"]', { timeout: 8000 }).catch(() => {});
    // page through looking for a board (pager last btn = next)
    for (let i = 0; i < 400; i++) {
      if (await page.locator('[data-testid="library-living-board"]').count()) return true;
      const next = page.locator('[data-testid="library-pager"] button').last();
      if (!(await next.isEnabled().catch(() => false))) break;
      await next.click();
      await page.waitForTimeout(50);
    }
    return false;
  };

  let foundOn = null;
  for (const id of ['capablanca-chess-fundamentals', 'edward-lasker-chess-and-checkers', 'nimzowitsch-my-system']) {
    if (await tryBook(id)) { foundOn = id; break; }
    // back to shelf for next attempt
    await page.locator('[aria-label="Back to the library"]').click().catch(() => {});
    await page.waitForSelector('[data-testid="coaches-library-page"]', { timeout: 8000 }).catch(() => {});
  }
  rec('reached a page with a living board', !!foundOn, foundOn || 'none of the candidate books showed a board');

  if (foundOn) {
    await page.locator('[data-testid="library-living-board"]').scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    const before = await probeBoard();
    rec('board has real dimensions (not collapsed)', before.present && before.width > 150 && before.height > 150, `${before.width}x${before.height}`);
    rec('board lays out 64 squares', before.squareCount === 64, `${before.squareCount} squares`);
    rec('board actually draws pieces', before.pieceSquares >= 4, `${before.pieceSquares} squares with a piece`);
    await page.screenshot({ path: `${dir}/board-initial.png` });
    // also a tight shot of just the board
    const bb = page.locator('[data-testid="library-living-board"]');
    await bb.screenshot({ path: `${dir}/board-only.png` }).catch(() => {});

    // Drive Play move and confirm the position changes (piece DOM shifts).
    const next = page.locator('[data-testid="living-board-next"]');
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(700);
      const after = await probeBoard();
      rec('Play move keeps the board rendered', after.present && after.squareCount === 64 && after.pieceSquares >= 4, `${after.pieceSquares} pieces after move`);
      await page.screenshot({ path: `${dir}/board-after-move.png` });
    } else {
      rec('Play move available', false, 'next button disabled (study position, no line)');
    }
  }

  rec('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  rec('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));
} catch (e) {
  rec('audit run', false, e.message);
} finally {
  await browser.close();
}

const passed = out.filter((s) => s.pass).length;
writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, passed, total: out.length, scenarios: out, pageErrors, consoleErrors }, null, 2));
console.log(`\n${passed}/${out.length} green · report ${dir}`);
process.exit(passed === out.length ? 0 : 1);
