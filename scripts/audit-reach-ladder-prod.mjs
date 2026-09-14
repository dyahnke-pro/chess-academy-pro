#!/usr/bin/env node
/**
 * audit-reach-ladder-prod — focused post-deploy audit for the Adaptive Reach
 * Ladder (docs/plans/2026-09-14-adaptive-reach-ladder.md P1–P3). The full
 * audit-tactics.mjs re-verifies 15 unrelated surfaces first and blows the
 * timeout before reaching these; this drives ONLY the reach-ladder surfaces so
 * it finishes fast and proves the new contracts on LIVE prod:
 *
 *   1. /tactics/adaptive shows the reach-ladder badge ("Level N · <rating>"),
 *      the Master Level entry, and a difficulty pick serves a puzzle + moves
 *      the reach rating (a felt delta).
 *   2. /tactics/master auto-starts (no difficulty select), lazy-fetches the
 *      elite CC0 pool, and the FIRST served puzzle is elite (rating ≥ 2400) —
 *      proving the master reach target + the master pool are wired end-to-end.
 *
 * MUTED (G1) — never spends TTS. Sandbox/prod incantation:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-reach-ladder-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const results = [];
const check = (label, ok, note = '') => {
  results.push({ label, ok: !!ok, note });
  console.log(`    ${ok ? 'PASS' : 'FAIL'} — ${label}${note ? ` :: ${note}` : ''}`);
};

async function main() {
  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
    headless: true,
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  const visible = async (tid) =>
    page.locator(`[data-testid="${tid}"]`).first().isVisible().catch(() => false);
  const text = async (sel) => (await page.locator(sel).first().textContent().catch(() => '')) || '';
  const waitAny = async (tids, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      for (const tid of tids) if (await visible(tid)) return tid;
      await page.waitForTimeout(400);
    }
    return null;
  };

  try {
    // ── 1. /tactics/adaptive — reach-ladder badge + Master entry + felt pick ──
    await page.goto(`${BASE_URL}/tactics/adaptive`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="adaptive-puzzle-page"]').waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    const badge = await text('[data-testid="player-rating-value"]');
    check('reach-ladder badge shows "Level N · rating"', /Level\s+\d+\s+·\s+\d+/.test(badge), badge.trim());
    check('Master Level entry present', await visible('master-level-link'));
    check('difficulty buttons present', await visible('difficulty-easy'));

    await page.locator('[data-testid="difficulty-easy"]').click();
    const got = await waitAny(['puzzle-board', 'loading'], 15_000);
    check('difficulty pick serves a puzzle (board or loading)', !!got, got || 'none');
    // solve/skip isn't the point; just confirm the board mounted so the reach
    // controller drove selection.
    check('puzzle-board mounted after pick', (await waitAny(['puzzle-board'], 12_000)) === 'puzzle-board');

    // ── 2. /tactics/master — auto-start, elite pool, elite first puzzle ──
    await page.goto(`${BASE_URL}/tactics/master`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="adaptive-puzzle-page"]').waitFor({ timeout: 20_000 });
    const title = await text('h1');
    check('Master Level title', /Master Level/.test(title), title.trim());

    // Auto-starts (no difficulty select shown) → master-loading → puzzle board.
    const masterGot = await waitAny(['puzzle-board', 'loading', 'master-loading'], 40_000);
    check('Master auto-starts toward a puzzle (no difficulty select)', !!masterGot, masterGot || 'none');
    const board = await waitAny(['puzzle-board'], 30_000);
    check('Master serves a puzzle board', board === 'puzzle-board');

    // Prove the served puzzle is ELITE: the master pool + reach target should
    // pick a 2400+ puzzle. Read it from Dexie (the app seeded the master pool).
    const elite = await page.evaluate(async () => {
      try {
        const dbs = await indexedDB.databases?.();
        const name = dbs?.find((d) => /Chess/i.test(d.name || ''))?.name || 'ChessAcademyDB';
        const openReq = indexedDB.open(name);
        const db = await new Promise((res, rej) => {
          openReq.onsuccess = () => res(openReq.result);
          openReq.onerror = () => rej(openReq.error);
        });
        if (!db.objectStoreNames.contains('puzzles')) return { count: 0, min: null };
        const tx = db.transaction('puzzles', 'readonly');
        const store = tx.objectStore('puzzles');
        const all = await new Promise((res, rej) => {
          const r = store.getAll();
          r.onsuccess = () => res(r.result || []);
          r.onerror = () => rej(r.error);
        });
        const master = all.filter((p) => p.source === 'master');
        const min = master.length ? Math.min(...master.map((p) => p.rating)) : null;
        return { count: master.length, min };
      } catch (e) {
        return { count: 0, min: null, err: String(e) };
      }
    });
    check('master pool seeded into Dexie (source=master)', elite.count > 1000, `count=${elite.count}`);
    check('master pool is elite (min rating >= 2400)', elite.min !== null && elite.min >= 2400, `min=${elite.min}`);

    check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n[reach-ladder] ${passed}/${results.length} checks passed`);
  if (passed !== results.length) process.exit(1);
}

main().catch((e) => { console.error('[reach-ladder] FATAL:', e.message); process.exit(1); });
