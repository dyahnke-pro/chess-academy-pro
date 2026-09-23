#!/usr/bin/env node
// audit-review-prep-timing — WHERE DOES THE REVIEW'S "Preparing…" WAIT GO?
//
// Seeds one REAL amateur game (the student's own chess.com archive, never a
// fixture) UNANALYZED, opens its review exactly as a user does, times first
// open → Start enabled, and reads back the app's own `review-prep-timing` row
// (per-phase milliseconds) off the loopback sidecar. Then REOPENS the same
// game and times it again, because a reopen that re-runs the whole prep is a
// separate defect from a slow first open.
//
// Muted (G1): an audit needs to know what the coach computed, never to hear it.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=http://localhost:5173 \
//     AUDIT_CHESSCOM_USER=dyahnke node scripts/audit-review-prep-timing.mjs
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { attachVoiceListener, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const BASE = (process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const USER = process.env.AUDIT_CHESSCOM_USER ?? 'dyahnke';
const GAME_INDEX = Number(process.env.AUDIT_GAME_INDEX ?? 0);
const OUT = `audit-reports/review-prep-timing-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(OUT, { recursive: true });
const log = (m) => console.log(m);

/** The student's own recent games, newest first — real amateur play, the shape
 *  the review exists for. Fetched with curl so the sandbox proxy applies. */
function recentGames() {
  // gzip + a named client + a pause between months: chess.com answers a bare
  // crawl with "Blocked: Archive crawl was too heavy" (measured 2026-09-23).
  const get = (url) => {
    const body = execFileSync('curl', ['-s', '--compressed', '-A', 'ChessAcademyPro-audit/1.0', '--max-time', '30', url], { encoding: 'utf8' });
    execFileSync('sleep', ['1']);
    return JSON.parse(body);
  };
  const { archives } = get(`https://api.chess.com/pub/player/${USER}/games/archives`);
  const out = [];
  for (const a of [...archives].reverse()) {
    for (const g of [...(get(a).games ?? [])].reverse()) {
      if (!g.pgn || g.rules !== 'chess') continue;
      const c = new Chess();
      try { c.loadPgn(g.pgn); } catch { continue; }
      const plies = c.history().length;
      if (plies < 40 || plies > 120) continue;
      out.push({ g, plies });
      if (out.length > GAME_INDEX) return out;
    }
  }
  return out;
}

async function main() {
  const picked = recentGames()[GAME_INDEX];
  if (!picked) { log('no usable game found'); process.exit(1); }
  const { g, plies } = picked;
  const studentSide = g.white.username.toLowerCase() === USER.toLowerCase() ? 'white' : 'black';
  const gid = `chesscom-${g.url.split('/').pop()}`;
  const result = g.white.result === 'win' ? '1-0' : g.black.result === 'win' ? '0-1' : '1/2-1/2';
  log(`[game] ${g.white.username} (${g.white.rating}) vs ${g.black.username} (${g.black.rating}) ${result}, ${plies} plies, student=${studentSide}, id=${gid}`);

  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: [...sandboxLaunchArgs(), ...LISTENER_LAUNCH_ARGS] });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(autoDismissCalibration);
  const listener = await attachVoiceListener(ctx);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);
  const seed = await page.evaluate(async ({ gid, g, studentSide, result }) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(true); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, studentSide, pgn: g.pgn, white: g.white.username, black: g.black.username, result, date: '2026.09.01', event: 'Live Chess', eco: 'A00', whiteElo: g.white.rating, blackElo: g.black.rating, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    // The handle is the real one, so stop the auto-import it would trigger —
    // this probe measures ONE review, not an import of 900 games.
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = studentSide === 'white' ? g.white.username : g.black.username; p.preferences.coachNarration = 'full'; p.preferences.lastChessComAutoImportAt = Date.now(); p.preferences.lastLichessAutoImportAt = Date.now(); await put('profiles', p); }
    return { profiles: profs.length };
  }, { gid, g, studentSide, result }).catch((e) => ({ error: String(e) }));
  log(`[seed] ${JSON.stringify(seed)}`);

  const startable = async () => {
    const b = page.locator('[data-testid="start-walk-btn"]').first();
    return (await b.count()) > 0 && (await b.getAttribute('disabled', { timeout: 2000 }).catch(() => 'x')) === null;
  };
  const until = async (fn, ms, every = 1000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn().catch(() => false)) return true; await page.waitForTimeout(every); } return false; };

  const openOnce = async (label) => {
    const since = Date.now();
    await page.goto(`${BASE}/coach/review/${gid}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const ready = await until(startable, 300000, 1000);
    const ms = Date.now() - since;
    const rows = listener.getCapturedEvents().filter((e) => (e.timestamp ?? 0) >= since);
    const timing = rows.filter((e) => e.kind === 'review-prep-timing').map((e) => { try { return JSON.parse(e.details); } catch { return e.summary; } });
    const analysis = rows.filter((e) => e.kind === 'analysis-review-done').map((e) => e.summary);
    const stalls = rows.filter((e) => /stockfish-(analysis-stalled|error)/.test(e.kind)).map((e) => e.summary);
    const cacheSkip = rows.some((e) => e.kind === 'review-walk-skipped');
    log(`\n[${label}] Start enabled=${ready} after ${(ms / 1000).toFixed(1)}s  cacheHit=${cacheSkip}`);
    for (const a of analysis) log(`  analysis: ${a}`);
    for (const t of timing) log(`  prep: ${JSON.stringify(t)}`);
    for (const s of stalls) log(`  engine: ${s}`);
    return { label, ready, ms, timing, analysis, stalls, cacheSkip };
  };

  const first = await openOnce('FIRST OPEN');
  // Let the background deepen run, the way a user who reads the summary would.
  await page.waitForTimeout(Number(process.env.AUDIT_DWELL_MS ?? 45000));
  const reopen = await openOnce('REOPEN');

  const report = { game: { gid, plies, studentSide, white: g.white, black: g.black }, first, reopen, pageErrors };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  log(`\n[report] ${OUT}/report.json  pageErrors=${pageErrors.length}`);
  const ok = first.ready && first.timing.length > 0;
  log(ok ? 'PASS — prep measured' : 'FAIL — prep never measured');
  await listener.stop();
  await browser.close();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
