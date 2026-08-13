// Drive EVERY tactics type on live prod, by hand (David 2026-08-13: "all
// tactics types, play several of each make sure they advance, you can navigate
// back and forth with arrows, make sure they are adaptive, and accurate").
//
// Method: mirror the app's own puzzle store. Pull (id, fen, moves) from the
// page's Dexie, replay in node chess.js, index by board position. For each
// theme card: click it like a user, read the rendered board, look up the
// puzzle it IS, and play the true solution square-by-square. Accuracy is
// proven by the app ACCEPTING the known-correct line; adaptivity by the
// Target rating moving; advance by the next puzzle arriving unprompted;
// arrows by nav-prev/nav-next actually changing the board.
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OUT = `audit-reports/tactics-drive-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const PUZZLES_PER_THEME = 3;
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const THEMES = (process.env.THEMES?.split('|') ?? [
  'forks', 'pins & skewers', 'discovered attacks', 'back rank mates',
  'sacrifices', 'deflection & decoy', 'removing the guard', 'zugzwang',
  'endgame technique', 'mating nets',
]);

const canon = (ch) => {
  const rows = [];
  const b = ch.board();
  for (let r = 0; r < 8; r += 1) {
    for (let f = 0; f < 8; f += 1) {
      const p = b[r][f];
      if (p) rows.push(`${p.square}:${p.color}${p.type.toUpperCase()}`);
    }
  }
  return rows.sort().join(',');
};

async function readBoard(page) {
  return await page.evaluate(() => {
    const wrap = document.querySelector('[data-testid="board-wrapper"]') ?? document;
    const out = [];
    for (const sq of wrap.querySelectorAll('[data-square]')) {
      const piece = sq.querySelector('[data-piece]');
      if (piece) out.push(`${sq.getAttribute('data-square')}:${piece.getAttribute('data-piece')}`);
    }
    return out.sort().join(',');
  });
}

async function waitBoard(page, expected, ms) {
  const dl = Date.now() + ms;
  while (Date.now() < dl) {
    if (await readBoard(page) === expected) return true;
    await sleep(350);
  }
  return false;
}

async function clickSquare(page, sq) {
  await page.locator(`[data-testid="board-wrapper"] [data-square="${sq}"]`).first().click({ force: true, timeout: 5000 });
}

async function playUci(page, uci) {
  await clickSquare(page, uci.slice(0, 2));
  await sleep(250);
  await clickSquare(page, uci.slice(2, 4));
  if (uci.length === 5) {
    await sleep(400);
    const promo = page.locator(`[data-piece$="${uci[4].toUpperCase()}"]`).last();
    await promo.click({ force: true, timeout: 3000 }).catch(() => {});
  }
}

async function targetRating(page) {
  const t = await page.locator('[data-testid="tactic-drill-page"]').innerText().catch(() => '');
  const m = t.match(/Target:\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

  console.log('■ boot /tactics, wait for the puzzle seed');
  await page.goto(`${BASE}/tactics`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  for (const c of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-close"]']) {
    await page.locator(c).first().click({ timeout: 6000, force: true }).catch(() => {});
  }
  await page.locator('[data-testid="tactics-page"]').waitFor({ state: 'visible', timeout: 90_000 });

  // Wait for the deferred puzzle seed, then pull the whole store once.
  let raw = [];
  for (let i = 0; i < 24; i += 1) {
    raw = await page.evaluate(async () => new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('puzzles')) { resolve([]); return; }
        const tx = db.transaction('puzzles', 'readonly');
        tx.objectStore('puzzles').getAll().onsuccess = (e) =>
          resolve(e.target.result.map((p) => ({ id: p.id, fen: p.fen, moves: p.moves, rating: p.rating })));
      };
      req.onerror = () => resolve([]);
    }));
    if (raw.length > 1000) break;
    await sleep(5000);
  }
  console.log(`  puzzles in Dexie: ${raw.length}`);
  if (raw.length === 0) throw new Error('puzzle store never seeded');

  // Index: position AFTER the setup move → the solver's line.
  const index = new Map();
  let bad = 0;
  for (const p of raw) {
    try {
      const moves = typeof p.moves === 'string' ? p.moves.trim().split(/\s+/) : p.moves;
      const ch = new Chess(p.fen);
      const m0 = moves[0];
      ch.move({ from: m0.slice(0, 2), to: m0.slice(2, 4), promotion: m0[4] });
      index.set(canon(ch), { id: p.id, fen: p.fen, seq: moves.slice(1) });
    } catch { bad += 1; }
  }
  console.log(`  indexed ${index.size} start positions (${bad} unreplayable)`);

  const results = [];
  let didArrowTest = false;
  let didFailTest = false;

  for (const theme of THEMES) {
    const res = { theme, solved: 0, attempted: 0, advanced: 0, assisted: 0, arrowNav: null, adaptive: null, failPath: null, notes: [] };
    results.push(res);
    try {
      console.log(`\n■ ${theme}`);
      // Back to the hub (in-app if possible, else reboot).
      if (!await page.locator('[data-testid="tactics-page"]').isVisible().catch(() => false)) {
        const back = page.locator('[data-testid="back-btn"]');
        if (await back.isVisible().catch(() => false)) { await back.click({ force: true }); await sleep(1200); }
        if (!await page.locator('[data-testid="tactics-page"]').isVisible().catch(() => false)) {
          await page.goto(`${BASE}/tactics`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
          await page.locator('[data-testid="tactics-page"]').waitFor({ state: 'visible', timeout: 60_000 });
        }
      }
      await page.locator(`[data-testid="section-${theme}"]`).click({ force: true, timeout: 8000 });
      await page.locator('[data-testid="tactic-drill-page"]').waitFor({ state: 'visible', timeout: 30_000 });
      await page.locator('[data-testid="puzzle-board"]').waitFor({ state: 'visible', timeout: 45_000 });
      await sleep(1500);

      const t0 = await targetRating(page);
      let prevPlacement = '';

      for (let n = 0; n < PUZZLES_PER_THEME; n += 1) {
        res.attempted += 1;
        // Identify the rendered puzzle.
        await sleep(800);
        let placement = await readBoard(page);
        // Setup move may still be animating on a fresh puzzle — settle.
        for (let w = 0; w < 20 && !index.has(placement); w += 1) { await sleep(700); placement = await readBoard(page); }
        const hit = index.get(placement);
        if (!hit) {
          res.notes.push(`puzzle ${n + 1}: position not in index — using Show Solution`);
          res.assisted += 1;
          await page.locator('[data-testid="show-solution-button"]').click({ force: true, timeout: 8000 }).catch(() => {});
          await sleep(6000);
          continue;
        }

        // Deliberate WRONG move once, to prove the fail path + penalty.
        if (!didFailTest && n === 1) {
          didFailTest = true;
          const ch = new Chess(hit.fen);
          const m0raw = raw.find((p) => p.id === hit.id).moves;
          const m0 = (typeof m0raw === 'string' ? m0raw.trim().split(/\s+/) : m0raw)[0];
          ch.move({ from: m0.slice(0, 2), to: m0.slice(2, 4), promotion: m0[4] });
          const legal = ch.moves({ verbose: true }).find((m) => `${m.from}${m.to}` !== hit.seq[0].slice(0, 4));
          if (legal) {
            const before = await targetRating(page);
            await playUci(page, `${legal.from}${legal.to}`);
            await sleep(3500);
            const after = await targetRating(page);
            const boardNow = await readBoard(page);
            res.failPath = { wrongMove: `${legal.from}${legal.to}`, ratingBefore: before, ratingAfter: after, reacted: boardNow !== placement || after !== before };
            console.log(`  wrong-move probe: rating ${before}→${after}`);
            // Whatever state we're in (retry allowed or failed-and-advancing),
            // reveal to move on cleanly.
            await page.locator('[data-testid="show-solution-button"]').click({ force: true, timeout: 5000 }).catch(() => {});
            await sleep(6000);
            continue;
          }
        }

        // Play the true line.
        const ch = new Chess(hit.fen);
        const mv = raw.find((p) => p.id === hit.id).moves;
        const all = typeof mv === 'string' ? mv.trim().split(/\s+/) : mv;
        ch.move({ from: all[0].slice(0, 2), to: all[0].slice(2, 4), promotion: all[0][4] });
        let ok = true;
        for (let i = 0; i < hit.seq.length; i += 1) {
          const uci = hit.seq[i];
          if (i % 2 === 0) {
            await playUci(page, uci);
            ch.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
            const reply = hit.seq[i + 1];
            if (reply) {
              ch.move({ from: reply.slice(0, 2), to: reply.slice(2, 4), promotion: reply[4] });
              if (!await waitBoard(page, canon(ch), 12_000)) { ok = false; break; }
            }
          }
        }
        if (ok) {
          const correct = await page.locator('[data-testid="puzzle-correct"]').waitFor({ state: 'visible', timeout: 10_000 }).then(() => true).catch(() => false);
          if (correct) {
            res.solved += 1;
            console.log(`  puzzle ${n + 1} (${hit.id}) solved ✓`);
          } else res.notes.push(`puzzle ${n + 1}: line played but no correct badge`);
          prevPlacement = await readBoard(page);
          // AUTO-ADVANCE: the next puzzle must arrive on its own.
          const dl = Date.now() + 15_000;
          let advanced = false;
          while (Date.now() < dl) {
            const now = await readBoard(page);
            if (now !== prevPlacement && now.length > 0) { advanced = true; break; }
            await sleep(600);
          }
          if (advanced) res.advanced += 1;
          else res.notes.push(`puzzle ${n + 1}: no auto-advance in 15s`);
        } else {
          res.notes.push(`puzzle ${n + 1} (${hit.id}): board never reached expected reply position`);
          await page.locator('[data-testid="show-solution-button"]').click({ force: true, timeout: 5000 }).catch(() => {});
          res.assisted += 1;
          await sleep(6000);
        }
      }

      // ARROW NAV — once, on the first theme that got here with 2+ puzzles seen.
      if (!didArrowTest && res.attempted >= 2) {
        didArrowTest = true;
        const here = await readBoard(page);
        const prevBtn = page.locator('[data-testid="nav-prev"]');
        if (await prevBtn.isEnabled().catch(() => false)) {
          await prevBtn.click({ force: true });
          await sleep(1500);
          const back = await readBoard(page);
          await page.locator('[data-testid="nav-next"]').click({ force: true }).catch(() => {});
          await sleep(1500);
          const fwd = await readBoard(page);
          res.arrowNav = { prevChangedBoard: back !== here, nextReturned: fwd !== back };
          console.log(`  arrow nav: prev changed=${back !== here} next changed=${fwd !== back}`);
        } else res.arrowNav = { prevChangedBoard: false, nextReturned: false, note: 'nav-prev never enabled' };
      }

      const t1 = await targetRating(page);
      res.adaptive = { start: t0, end: t1, moved: t0 !== null && t1 !== null && t1 !== t0 };
      console.log(`  target rating ${t0} → ${t1}; solved ${res.solved}/${res.attempted}, auto-advanced ${res.advanced}`);
    } catch (e) {
      res.notes.push(`THEME ERROR: ${String(e).slice(0, 160)}`);
      console.log(`  ✗ ${String(e).slice(0, 160)}`);
    }
  }

  writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, results, pageErrors }, null, 2));
  await browser.close();

  console.log('\n──────── TACTICS DRIVE ────────');
  let fails = 0;
  for (const r of results) {
    const okSolve = r.solved >= 1;
    const okAdv = r.advanced >= 1;
    if (!okSolve || !okAdv) fails += 1;
    console.log(`${okSolve && okAdv ? '✓' : '✗'} ${r.theme.padEnd(20)} solved ${r.solved}/${r.attempted} advanced ${r.advanced} assisted ${r.assisted} rating ${r.adaptive?.start}→${r.adaptive?.end}${r.notes.length ? ` | ${r.notes.join(' ; ')}` : ''}`);
  }
  const arrow = results.find((r) => r.arrowNav);
  const fail = results.find((r) => r.failPath);
  console.log(`arrow nav: ${arrow ? JSON.stringify(arrow.arrowNav) : 'NOT TESTED'}`);
  console.log(`fail path: ${fail ? JSON.stringify(fail.failPath) : 'NOT TESTED'}`);
  console.log(`page errors: ${pageErrors.length}`);
  console.log(`report: ${OUT}/report.json`);
  process.exit(fails === 0 && pageErrors.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('ERROR', e); process.exit(1); });
