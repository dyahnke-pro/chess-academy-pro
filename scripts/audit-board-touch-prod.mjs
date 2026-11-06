#!/usr/bin/env node
/**
 * audit-board-touch-prod — an opening's Learn board takes a FINGER on a phone
 * (David's iPhone, 2026-11-05: Bird's Opening → Learn, the pawn would not go
 * to f4). Every other openings audit plays its moves through the
 * `__playMove` test hook, which skips the touch layer entirely — so the board
 * that never took a finger on iOS passed all of them.
 *
 * Phone viewport, real touch events (CDP), MUTED. Contracts:
 *   T1  the Learn board takes the touch from the page (touch-action: none)
 *   T2  a finger DRAG of the dictated move is graded correct (no "Not quite")
 *   T3  the opponent's reply auto-plays and Learn moves on to the next move
 *   T4  the next student move is LIT on the board (both squares), so
 *       "Play the highlighted move" is true when there is no written note
 *   T5  a finger TAP-TAP of that move is graded correct too
 *   T6  zero page errors
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-board-touch-prod.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OPENING = process.env.AUDIT_OPENING ?? 'birds-opening';
const OUT = `audit-reports/board-touch-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });
const rows = [];
const row = (id, pass, detail) => { rows.push({ id, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${id} — ${detail}`); };

const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(`board-touch-${Math.random().toString(36).slice(2, 8)}`));
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

try {
  await page.goto(`${BASE}/openings/${OPENING}`, { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="first-run-skip"]']) {
    const l = page.locator(sel);
    if (await l.count()) await l.first().click().catch(() => {});
  }
  // The deferred seed writes the opening row; unlock its ladder by a read-able
  // write, then reload so the page reads it (CLAUDE.md G1 write-stall rule).
  let seeded = null;
  for (let i = 0; i < 40 && !(seeded?.ok && seeded.updated); i++) { seeded = await seedUnlockedOpenings(page, [OPENING]); if (!(seeded.ok && seeded.updated)) await sleep(2000); }
  if (!(seeded?.ok && seeded.updated)) throw new Error(`could not seed the opening row: ${JSON.stringify(seeded)}`);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await sleep(5000);

  // Reach Learn the way David did: through the end of Watch ("Now Learn it →"),
  // else the page's own Learn button. DOM clicks — the controls can sit under
  // the bottom nav at phone height, where a coordinate tap hits the nav.
  if (await page.locator('[data-testid="lesson-player"]').count()) {
    for (let i = 0; i < 40 && !(await page.locator('[data-testid="lesson-continue-next"]').count()); i++) {
      await page.locator('[data-testid="lesson-next"]').first().evaluate((el) => el.click());
      await sleep(400);
    }
    await page.locator('[data-testid="lesson-continue-next"]').first().evaluate((el) => el.click());
  } else {
    await page.locator('[data-testid="learn-btn"]').first().evaluate((el) => el.click());
  }
  await page.locator('[data-testid="line-player-memory"]').waitFor({ timeout: 20000 });
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/1-learn.png` });

  const board = page.locator('[data-testid="line-player-memory"] [data-testid="consistent-chessboard-static"]').first();
  const touchAction = await board.evaluate((el) => getComputedStyle(el).touchAction);
  row('T1', touchAction === 'none', `Learn board touch-action = ${touchAction}`);

  const fenOf = async () => page.evaluate(() => {
    const out = {};
    for (const p of document.querySelectorAll('[data-testid="line-player-memory"] [data-piece]')) {
      const sq = p.closest('[data-square]')?.getAttribute('data-square');
      if (sq) out[sq] = p.getAttribute('data-piece');
    }
    return out;
  });
  const center = async (sq) => {
    const b = await page.locator(`[data-testid="line-player-memory"] [data-square="${sq}"]`).first().boundingBox();
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: 1 })) });
  const drag = async (from, to) => {
    const a = await center(from); const b = await center(to);
    await touch('touchStart', [a]);
    for (let i = 1; i <= 12; i++) { await touch('touchMove', [{ x: a.x + ((b.x - a.x) * i) / 12, y: a.y + ((b.y - a.y) * i) / 12 }]); await sleep(16); }
    await touch('touchEnd', []);
  };
  const tap = async (sq) => { const a = await center(sq); await touch('touchStart', [a]); await sleep(60); await touch('touchEnd', []); };
  const graded = async () => {
    for (let i = 0; i < 20; i++) {
      if (await page.locator('[data-testid="wrong-hint"]').count()) return 'wrong';
      if (await page.locator('[data-testid="correct-flash"]').count()) return 'correct';
      await sleep(50);
    }
    return 'none';
  };
  // A side-to-move-white FEN from the rendered pieces, to read which lit square
  // the lit piece can legally reach (a lesson's own highlights light more).
  const fenFrom = (placement) => {
    const ranks = [];
    for (let r = 8; r >= 1; r--) {
      let line = ''; let empty = 0;
      for (const f of 'abcdefgh') {
        const pc = placement[`${f}${r}`];
        if (!pc) { empty++; continue; }
        if (empty) { line += empty; empty = 0; }
        line += pc[0] === 'w' ? pc[1].toUpperCase() : pc[1].toLowerCase();
      }
      ranks.push(line + (empty || ''));
    }
    return `${ranks.join('/')} w - - 0 1`;
  };
  const litMove = (placement, litSquares) => {
    const c = new Chess(fenFrom(placement));
    for (const from of litSquares.filter((sq) => placement[sq]?.startsWith('w'))) {
      const to = c.moves({ square: from, verbose: true }).map((m) => m.to).find((t) => litSquares.includes(t));
      if (to) return { from, to };
    }
    return null;
  };
  // Which move Learn is waiting for: the one whose squares Learn lights, read
  // off the line it plays (the board diff tells us what landed).
  const lit = async () => page.evaluate(() => [...document.querySelectorAll('[data-testid="line-player-memory"] [data-square]')]
    .filter((sq) => {
      // Lit = a painted background that is not the cyan last-move / selection
      // (the base glow is a box-shadow only).
      const st = sq.querySelector(':scope > div')?.getAttribute('style') ?? '';
      const bg = /background:\s*([^;]+)/.exec(st)?.[1] ?? '';
      return bg !== '' && !/0, 229, 255/.test(bg);
    })
    .map((sq) => sq.getAttribute('data-square')));

  // Move 1: the dictated move is lit — drag it with a finger.
  const lit1 = await lit();
  const before1 = await fenOf();
  const m1 = litMove(before1, lit1);
  if (!m1) throw new Error(`move 1 not lit (lit=${lit1.join(',')})`);
  const { from: from1, to: to1 } = m1;
  await drag(from1, to1);
  const v1 = await graded();
  row('T2', v1 === 'correct', `finger drag ${from1}→${to1}: ${v1}`);

  // The opponent replies, Learn moves on.
  await sleep(4000);
  const after1 = await fenOf();
  // Move 1 changes two squares; the opponent's reply changes at least two more.
  const changed = [...new Set([...Object.keys(before1), ...Object.keys(after1)])].filter((sq) => before1[sq] !== after1[sq]);
  const replied = after1[to1] !== undefined && changed.some((sq) => sq !== from1 && sq !== to1);
  row('T3', replied, `squares changed after move 1 + reply: ${changed.sort().join(',')}`);

  const lit2 = await lit();
  const m2 = litMove(after1, lit2);
  const from2 = m2?.from;
  const to2 = m2?.to;
  await page.screenshot({ path: `${OUT}/2-next-move.png` });
  row('T4', Boolean(from2 && to2), `next move lit: ${lit2.join(',') || '(nothing)'}`);

  if (from2 && to2) {
    await tap(from2); await sleep(300); await tap(to2);
    const v2 = await graded();
    row('T5', v2 === 'correct', `finger tap-tap ${from2}→${to2}: ${v2}`);
  } else {
    row('T5', false, 'no lit move to tap');
  }
} catch (e) {
  row('RUN', false, String(e).slice(0, 300));
  await page.screenshot({ path: `${OUT}/error.png` }).catch(() => {});
} finally {
  row('T6', pageErrors.length === 0, `page errors: ${pageErrors.length}${pageErrors.length ? ` — ${pageErrors[0].slice(0, 200)}` : ''}`);
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, opening: OPENING, rows }, null, 2));
  await browser.close();
  const failed = rows.filter((r) => !r.pass).length;
  console.log(`\n${rows.length - failed}/${rows.length} passed — report ${OUT}/report.json`);
  process.exit(failed ? 1 : 0);
}
