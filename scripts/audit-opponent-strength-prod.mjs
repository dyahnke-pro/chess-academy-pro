#!/usr/bin/env node
/**
 * ONE STRENGTH PER GAME + THE HUMAN MOVE, ON EVERY SURFACE THAT PLAYS A GAME
 * (David 2026-10-22: "Same rating throughout the game. Algo up or down per
 * game only. And certainly make more human. Check to make sure this is an app
 * wide fix. Even the play in opening tab").
 *
 * Plays real moves on Learn (/coach/teach free play), Play (/coach/play, two
 * games) and the Openings Play tab (/openings/<id>, Play rung, seed-unlocked),
 * and reads every `coach-opponent-strength` row the app emits (the loopback
 * listener). Contracts:
 *   S1 every surface's opponent moved and emitted its strength row;
 *   S2 ONE STRENGTH PER GAME — every row of one gameId carries one studentElo;
 *   S3 a second Play game is a new gameId (it may carry a new number);
 *   S4 THE HUMAN MOVE — past the book, the engine-side moves came from the
 *      human model (`source: human`), on every surface that reached one.
 * Runs on David's record (`AUDIT_FIXTURE`, the data drop) when present.
 * MUTED (G1). Report: audit-reports/opponent-strength-<iso>/report.json.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-opponent-strength-prod.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { readPlacement, placementOf, samePlacement, sleep } from './audit-lib/board-drive.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OPENING = process.env.AUDIT_OPENING ?? 'vienna-game';
const MOVES = Number(process.env.AUDIT_MOVES ?? 14);
const ONLY = (process.env.AUDIT_ONLY ?? 'learn,play,openings').split(',');
const OUT_DIR = `audit-reports/opponent-strength-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const results = [];
const pass = (n, d = '') => { results.push({ n, ok: true, d }); console.log(`  ✓ ${n}${d ? ` — ${d}` : ''}`); };
const fail = (n, d = '') => { results.push({ n, ok: false, d }); console.log(`  ✗ ${n}${d ? ` — ${d}` : ''}`); };
const ENGINE_SIDE = new Set(['human', 'stockfish-best', 'stockfish-fallback', 'stockfish-variety', 'stockfish']);

async function clickSq(page, sq) {
  await page.locator(`[data-square="${sq}"]`).first().click({ timeout: 8000, force: true });
}

async function consent(page) {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-modal-close"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await sleep(400); }
  }
}

/** Answer a Learn pause (a focus or mission miss) by playing on. */
async function playOn(page) {
  for (const sel of ['[data-testid="focus-play-on"]', '[data-testid="mission-play-on"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await sleep(600); return true; }
  }
  return false;
}

/** Play `n` student moves against the board; the student's moves are spread
 *  over the legal list (not always the first) so the game leaves the book. */
async function playGame(page, tag, n, seat = 'w') {
  const chess = new Chess();
  let landed = 0;
  // If the coach moves first, wait for its reply.
  if (seat === 'b') {
    const r = await awaitReply(page, chess);
    if (r) chess.move(r);
  }
  for (let i = 0; i < n && !chess.isGameOver(); i++) {
    const moves = chess.moves({ verbose: true });
    const mv = i < 2 ? (moves.find((m) => ['e4', 'Nf3', 'Nc6', 'e5'].includes(m.san)) ?? moves[0]) : moves[(i * 7) % moves.length];
    try { await clickSq(page, mv.from); await sleep(200); await clickSq(page, mv.to); } catch { break; }
    await sleep(900);
    await playOn(page);
    const after = new Chess(chess.fen()); after.move(mv.san);
    const shown = await readPlacement(page);
    const landedExact = samePlacement(shown, placementOf(after.fen()));
    const landedPast = !landedExact && after.moves().some((r) => { const q = new Chess(after.fen()); q.move(r); return samePlacement(placementOf(q.fen()), shown); });
    if (!landedExact && !landedPast) { console.log(`  · [${tag}] ${mv.san} did not land`); continue; }
    chess.move(mv.san); landed += 1;
    const reply = await awaitReply(page, chess);
    if (!reply) { console.log(`  · [${tag}] no reply after ${mv.san}`); break; }
    chess.move(reply);
  }
  console.log(`  · [${tag}] ${chess.history().join(' ')}`);
  return landed;
}

async function awaitReply(page, chess, timeoutMs = 45_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await playOn(page);
    const shown = await readPlacement(page);
    for (const m of chess.moves({ verbose: true })) {
      const p = new Chess(chess.fen()); p.move(m.san);
      if (samePlacement(placementOf(p.fen()), shown)) return m.san;
    }
    await sleep(500);
  }
  return null;
}

function strengthRows(events, since) {
  return events
    .filter((e) => (e.kind ?? '') === 'coach-opponent-strength' && (e.timestamp ?? 0) >= since)
    .map((e) => { try { return JSON.parse(e.details ?? ''); } catch { return null; } })
    .filter(Boolean);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[opp-strength] base = ${BASE_URL}`);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: true, executablePath: await resolveChromiumExecutable(false) });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(([url, secret]) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, [listener.url, listener.secret]);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  const fixture = await loadFixtureIntoIDB(page).catch((e) => ({ loaded: false, reason: String(e) }));
  console.log(`[fixture] ${fixture.loaded ? `${fixture.wrote} rows / ${fixture.stores} stores` : `skipped (${fixture.reason})`}`);

  const bySurface = {};
  // A board that never mounts means the app is not there: stop, do not wait
  // on every surface (a blank app must fail fast, not hang).
  let appDown = false;
  const run = async (surface, url, setup, seat = 'w') => {
    if (appDown) { fail(`${surface}: skipped — an earlier board never mounted`); return []; }
    const since = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await sleep(5000);
    await consent(page);
    if (setup) await setup();
    const up = await page.locator('[data-square]').first().waitFor({ state: 'attached', timeout: 30_000 }).then(() => true).catch(() => false);
    if (!up) { fail(`${surface}: board mounts`); appDown = true; return []; }
    const landed = await playGame(page, surface, MOVES, seat);
    await sleep(2500);
    const rows = strengthRows(listener.getCapturedEvents(), since);
    bySurface[surface] = (bySurface[surface] ?? []).concat(rows);
    console.log(`  · [${surface}] ${landed} student moves, ${rows.length} opponent rows: ${rows.map((r) => r.source).join(', ')}`);
    return rows;
  };

  if (ONLY.includes('learn')) await run('learn', `${BASE_URL}/coach/teach`);
  let playA = []; let playB = [];
  if (ONLY.includes('play')) {
    playA = await run('play', `${BASE_URL}/coach/play`);
    playB = await run('play-2', `${BASE_URL}/coach/play`);
  }
  if (ONLY.includes('openings') && !appDown) {
    await page.goto(`${BASE_URL}/openings/${OPENING}?line=main`, { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 30; i++) {
      const r = await seedUnlockedOpenings(page, [OPENING]).catch(() => null);
      if (r?.updated) break;
      await sleep(3000);
    }
    await run('openings', `${BASE_URL}/openings/${OPENING}?line=main`, async () => {
      const play = page.locator('[data-testid="play-btn"]').first();
      await play.waitFor({ timeout: 60_000 }).catch(() => {});
      await play.click({ force: true }).catch(() => {});
      await sleep(3000);
    });
  }

  // S1 — every surface's opponent emitted.
  for (const s of Object.keys(bySurface)) {
    if (bySurface[s].length > 0) pass(`S1 ${s}: the opponent moved and emitted its strength`, `${bySurface[s].length} rows`);
    else fail(`S1 ${s}: the opponent moved and emitted its strength`, 'no coach-opponent-strength rows');
  }
  // S2 — one strength per game.
  const all = Object.values(bySurface).flat();
  const byGame = new Map();
  for (const r of all) {
    if (!r.gameId) continue;
    const set = byGame.get(r.gameId) ?? new Set(); set.add(r.studentElo); byGame.set(r.gameId, set);
  }
  const moved = [...byGame.entries()].filter(([, s]) => s.size > 1);
  const noId = all.filter((r) => !r.gameId);
  if (byGame.size > 0 && moved.length === 0 && noId.length === 0) pass('S2 ONE STRENGTH PER GAME', [...byGame.entries()].map(([g, s]) => `${g.slice(0, 24)}=${[...s][0]}`).join(', '));
  else fail('S2 ONE STRENGTH PER GAME', `${moved.length} game(s) moved mid-game${moved[0] ? ` (${moved[0][0]}: ${[...moved[0][1]].join(' → ')})` : ''}, ${noId.length} row(s) without a gameId, ${byGame.size} game(s)`);
  // S3 — a second Play game is its own game.
  if (ONLY.includes('play')) {
    const ga = new Set(playA.map((r) => r.gameId)); const gb = new Set(playB.map((r) => r.gameId));
    const overlap = [...ga].filter((g) => gb.has(g));
    if (ga.size && gb.size && overlap.length === 0) pass('S3 a second Play game is a new game', `${playA[0]?.studentElo} → ${playB[0]?.studentElo}`);
    else fail('S3 a second Play game is a new game', `game ids ${[...ga].join(',')} / ${[...gb].join(',')}`);
  }
  // S4 — the human move past the book, per surface.
  for (const [s, rows] of Object.entries(bySurface)) {
    const engineSide = rows.filter((r) => ENGINE_SIDE.has(r.source));
    const human = engineSide.filter((r) => r.source === 'human');
    if (engineSide.length === 0) { console.log(`  · S4 ${s}: no engine-side moves reached (all book/teaching)`); continue; }
    if (human.length / engineSide.length >= 0.8) pass(`S4 ${s}: the human model chose past the book`, `${human.length}/${engineSide.length}`);
    else fail(`S4 ${s}: the human model chose past the book`, `${human.length}/${engineSide.length} — sources ${engineSide.map((r) => r.source).join(',')}`);
  }
  if (pageErrors.length) fail('no page errors', pageErrors.slice(0, 3).join(' | ')); else pass('no page errors');

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ results, bySurface, pageErrors }, null, 2));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[opp-strength] ${results.length - failed}/${results.length} green — ${OUT_DIR}/report.json`);
  await browser.close(); await listener.close?.();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error('[opp-strength] threw:', e); process.exit(1); });
