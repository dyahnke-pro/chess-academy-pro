#!/usr/bin/env node
/**
 * audit-learn-ios-engine — a Learn game on an EMULATED iPHONE ENGINE, measured.
 *
 * The owner's iPhone (build faec59b, 2026-10-20) runs the asm.js Stockfish —
 * and on it 20 of 21 Learn moves went ungraded (no read of the position the
 * student moved from), with 12 forced worker respawns and ~22 s to the first
 * coach word on 4 moves. Desktop Chromium cannot show this on its own: it runs
 * the WASM build, and even its asm.js is compiled to wasm by V8's asm.js
 * validator (~100k nps), which iPhone's JavaScriptCore does not do. So:
 *
 *   • an iPhone user agent → `resolveWorkerUrl` routes to the asm build, the
 *     production iOS path (no test-only override);
 *   • `--js-flags=--no-validate-asm` → V8 runs asm.js as plain JavaScript,
 *     ~20-45k nps, the JSC-like speed (IOS_ASM_SLOW=0 turns it off);
 *   • CDP CPU throttling on the page (THROTTLE, default 4) — it reaches the
 *     main thread only; dedicated workers are NOT throttled by CDP (measured).
 *
 * Plays MOVES (default 15) student moves at a human pace (2-4 s after the
 * reply lands) and reports, per move, off the app's own rows:
 *   graded   — `learn-move-read`: the read the move was judged from
 *   respawns — `stockfish-analysis-stalled` rows (forced worker teardowns)
 *   errors   — `coach-opponent-stockfish-error`
 *   first word — the first `coach-narration-spoken` after the move
 *
 *   AUDIT_SMOKE_URL=http://127.0.0.1:5191 node scripts/audit-learn-ios-engine.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { readPlacement, samePlacement, placementOf, clickMove, sleep, appEndedGame } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const MOVES = Number(process.env.MOVES ?? 15);
const THROTTLE = Number(process.env.THROTTLE ?? 4);
const SLOW_ASM = process.env.IOS_ASM_SLOW !== '0';
const SEED = Number(process.env.SEED ?? 7);
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1';

// A small seeded RNG, so a run can be repeated move for move.
let rng = SEED;
const rand = () => { rng = (rng * 1103515245 + 12345) % 2147483648; return rng / 2147483648; };

// A plain developing plan as White; when its next move is not legal, a seeded
// pick among the legal moves (non-king first) — a human, not an engine.
const PLAN = ['e4', 'Nf3', 'Bc4', 'O-O', 'd3', 'c3', 'Re1', 'h3', 'Nbd2', 'Nf1', 'Ng3', 'a4', 'Bb3', 'Be3', 'Qe2', 'Rad1', 'd4'];
function pickMove(chess) {
  for (const san of PLAN) {
    if (chess.history().includes(san)) continue;
    const legal = chess.moves().find((m) => m.replace(/[+#]/g, '') === san);
    if (legal) return legal;
  }
  const all = chess.moves({ verbose: true });
  const quiet = all.filter((m) => m.piece !== 'k');
  const pool = quiet.length ? quiet : all;
  return pool[Math.floor(rand() * pool.length)].san;
}

const listener = await startAuditListener();
const browser = await chromium.launch({
  headless: true,
  executablePath: await resolveChromiumExecutable(),
  args: [...sandboxLaunchArgs(), ...(SLOW_ASM ? ['--js-flags=--no-validate-asm'] : [])],
});
const ctx = await browser.newContext({
  ...sandboxContextOptions(),
  userAgent: IPHONE_UA,
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 3,
});
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
}, { url: listener.url, secret: listener.secret });
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(`ios-engine-${Math.random().toString(36).slice(2, 8)}`));
// THE HANG INSTRUMENTS: main-thread long tasks, and every UCI line to and from
// the engine worker (search `info` lines thinned to one per depth), so a turn
// that never ends can be read as a frozen page OR a silent worker — the two
// look identical from the board.
await ctx.addInitScript(() => {
  window.__longTasks = [];
  window.__sfTrace = [];
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__longTasks.push({ at: Math.round(performance.timeOrigin + e.startTime), ms: Math.round(e.duration) });
      if (window.__longTasks.length > 4000) window.__longTasks.splice(0, 2000);
    }).observe({ entryTypes: ['longtask'] });
  } catch { /* no long-task timing */ }
  const push = (dir, data) => {
    const s = String(data);
    if (dir === '<' && /^info depth/.test(s) && !/ multipv 1 /.test(s) && / multipv /.test(s)) return;
    window.__sfTrace.push(`${Date.now()} ${dir} ${s.slice(0, 90)}`);
    if (window.__sfTrace.length > 600) window.__sfTrace.splice(0, 200);
  };
  const Native = window.Worker;
  window.Worker = function TracedWorker(url, opts) {
    const w = new Native(url, opts);
    if (/stockfish/.test(String(url))) {
      const post = w.postMessage.bind(w);
      w.postMessage = (m, ...rest) => { push('>', m); return post(m, ...rest); };
      w.addEventListener('message', (e) => push('<', e.data));
    }
    return w;
  };
  window.Worker.prototype = Native.prototype;
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
const cdp = await ctx.newCDPSession(page);
if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

const chess = new Chess();
async function syncBoard() {
  for (let i = 0; i < 2; i += 1) {
    const now = await readPlacement(page);
    if (samePlacement(now, placementOf(chess.fen()))) return;
    const hit = chess.moves({ verbose: true }).find((mv) => {
      const p = new Chess(chess.fen()); p.move(mv.san); return samePlacement(placementOf(p.fen()), now);
    });
    if (!hit) return;
    chess.move(hit.san);
  }
}

/** The engine's own state, its last UCI lines and the turn's longest main-thread
 *  tasks — read when a reply is 30 s late. A page that does not answer at all
 *  is a frozen main thread, which is itself the finding. */
async function engineState(from) {
  const t = Date.now();
  const state = await Promise.race([
    // (Not the engine object: importing its module here can load a second
    // instance under another URL — the trace is the worker's own record.)
    page.evaluate((since) => ({
      trace: (window.__sfTrace ?? []).slice(-60),
      longTasks: (window.__longTasks ?? []).filter((x) => x.at >= since).sort((a, b) => b.ms - a.ms).slice(0, 10),
    }), from),
    sleep(15_000).then(() => 'PAGE DID NOT ANSWER IN 15s (main thread frozen)'),
  ]);
  return { tookMs: Date.now() - t, state };
}

/** Self time per function (ms), top 25, from a CDP CPU profile — the main
 *  thread's hot spots for the profiled turn. */
let profileSummary = null;
function summariseProfile(profile) {
  const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas ?? [];
  for (let k = 0; k < (profile.samples ?? []).length; k += 1) {
    const n = byId.get(profile.samples[k]);
    if (!n) continue;
    const f = n.callFrame;
    const key = `${f.functionName || '(anon)'} ${String(f.url).replace(/^.*\/src\//, 'src/').replace(/\?.*$/, '')}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) ?? 0) + (dt[k] ?? 0) / 1000);
  }
  // INCLUSIVE time per app function (src/ only): which of the coach's own
  // computers the self time above was spent under.
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const incl = new Map();
  for (let k = 0; k < (profile.samples ?? []).length; k += 1) {
    const seen = new Set();
    for (let id = profile.samples[k]; id !== undefined; id = parent.get(id)) {
      const f = byId.get(id)?.callFrame;
      if (!f || !/\/src\//.test(f.url)) continue;
      const key = `${f.functionName || '(anon)'} ${String(f.url).replace(/^.*\/src\//, 'src/').replace(/\?.*$/, '')}:${f.lineNumber + 1}`;
      if (seen.has(key)) continue;
      seen.add(key);
      incl.set(key, (incl.get(key) ?? 0) + (dt[k] ?? 0) / 1000);
    }
  }
  const selfTop = [...self].filter(([k]) => !/^\((idle|program|garbage collector)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, ms]) => `self ${Math.round(ms)}ms ${k}`);
  const inclTop = [...incl].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, ms]) => `incl ${Math.round(ms)}ms ${k}`);
  return [...selfTop, ...inclTop];
}

const t0Run = Date.now();
await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' });
await sleep(4000);
const allow = page.locator('[data-testid="ai-consent-allow"]');
if (await allow.count()) await allow.first().click().catch(() => {});
await page.locator('[data-testid="chat-text-input"]').first().waitFor({ state: 'visible', timeout: 60_000 });
const justPlay = page.getByRole('button', { name: /just play/i });
if (await justPlay.count().catch(() => 0)) { await justPlay.first().click().catch(() => {}); await sleep(1500); }

const turns = [];
for (let i = 0; i < MOVES; i += 1) {
  if (chess.isGameOver() || await appEndedGame(page)) break;
  // Human pace: think 2-4 s on the position the coach's reply left.
  await sleep(2000 + Math.floor(rand() * 2000));
  // The board may be REPLAYING a line the coach is teaching (a refutation, a
  // reason played out) and show an earlier position; a click then lands on the
  // replay. Wait until it shows the live game again (the hand driver's rule).
  for (const t = Date.now(); Date.now() - t < 90_000; await sleep(500)) {
    await syncBoard();
    if (samePlacement(await readPlacement(page), placementOf(chess.fen()))) break;
  }
  const san = pickMove(chess);
  const m = chess.move(san);
  // PROFILE_MOVE=n samples the main thread across that student turn, so its
  // long tasks are attributed to functions, not guessed.
  const profiling = Number(process.env.PROFILE_MOVE ?? 0) === i + 1;
  if (profiling) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
  const movedAt = Date.now();
  // A main thread busy with the last turn's teaching takes the click late, not
  // never: 45 s before calling the move refused.
  const ok = await clickMove(page, m, chess.fen(), { timeout: 45_000 }).catch(() => false);
  if (!ok) {
    // WHY: what is on screen, and whether the app registered the move at all.
    const dir = 'audit-reports/learn-ios-engine-refused';
    mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: `${dir}/move-${i + 1}.png` }).catch(() => {});
    const seen = listener.getCapturedEvents().filter((e) => (e.timestamp ?? 0) >= movedAt - 1000).map((e) => `${e.kind}: ${(e.summary ?? '').slice(0, 90)}`);
    const text = await page.locator('body').innerText().catch(() => '');
    const placement = await readPlacement(page).catch(() => ({}));
    chess.undo();
    turns.push({ san, error: 'board did not take the move', refused: { eventsSince: seen.slice(0, 60), screenText: text.slice(0, 1500), boardMatchesLive: samePlacement(placement, placementOf(chess.fen())) } });
    break;
  }
  // Wait for the coach's reply on the board (the board is the truth).
  const plies = chess.history().length;
  let replyMs = null;
  let dumped = null;
  for (const t = Date.now(); Date.now() - t < 90_000; await sleep(400)) {
    await syncBoard();
    if (chess.history().length > plies) { replyMs = Date.now() - movedAt; break; }
    if (chess.isGameOver()) break;
    if (!dumped && Date.now() - movedAt > 30_000) dumped = await engineState(movedAt);
  }
  if (profiling) {
    await sleep(8000); // the turn's late wave
    const { profile } = await cdp.send('Profiler.stop');
    profileSummary = summariseProfile(profile);
  }
  turns.push({ san, movedAt, replyMs, reply: chess.history()[plies] ?? null, ...(dumped ? { hang: dumped } : {}) });
  if (replyMs === null) break;
}
await sleep(6000); // the last turn's rows post

const events = listener.getCapturedEvents();
const parse = (e) => { try { return JSON.parse(String(e.details ?? '{}')); } catch { return {}; } };
const reads = events.filter((e) => e.kind === 'learn-move-read').map((e) => ({ at: e.timestamp, ...parse(e) }));
const stalls = events.filter((e) => e.kind === 'stockfish-analysis-stalled').map((e) => ({ at: e.timestamp - t0Run, summary: (e.summary ?? '').slice(0, 140) }));
const respawns = stalls.filter((s) => /resetting worker|forced worker respawn/.test(s.summary));
const oppErrors = events.filter((e) => e.kind === 'coach-opponent-stockfish-error').map((e) => (e.summary ?? '').slice(0, 140));
const variant = events.filter((e) => e.kind === 'stockfish-variant-resolved').map((e) => e.summary);
const spoken = events
  .filter((e) => e.kind === 'coach-narration-spoken' && /speakCloud|speakWebSpeech/.test(e.source ?? ''))
  .map((e) => { const d = parse(e); return { at: Number(d.startedAt) || e.timestamp, text: (e.narrationText ?? '').slice(0, 70) }; });
for (let i = 0; i < turns.length; i += 1) {
  const t = turns[i];
  if (!t.movedAt) continue;
  const next = turns[i + 1]?.movedAt ?? Infinity;
  const first = spoken.filter((s) => s.at >= t.movedAt && s.at < next).sort((a, b) => a.at - b.at)[0];
  t.firstWordMs = first ? first.at - t.movedAt : null;
  t.firstWord = first?.text ?? null;
  const read = reads.find((r) => r.san === t.san && r.at >= t.movedAt - 2000 && r.at < next);
  t.read = read?.read ?? 'no row';
  t.readDepth = read?.depth ?? null;
}
const ledger = await page.evaluate(() => (window.__engineLedger ? window.__engineLedger() : null)).catch(() => null);
const longTasks = await page.evaluate(() => window.__longTasks ?? []).catch(() => []);
for (let i = 0; i < turns.length; i += 1) {
  const t = turns[i];
  if (!t.movedAt) continue;
  const next = turns[i + 1]?.movedAt ?? Infinity;
  const mine = longTasks.filter((x) => x.at >= t.movedAt && x.at < next);
  t.longTaskMs = mine.reduce((n, x) => n + x.ms, 0);
  t.longestTaskMs = mine.reduce((n, x) => Math.max(n, x.ms), 0);
}
const graded = turns.filter((t) => t.read === 'probe' || t.read === 'eval-bar').length;
const words = turns.map((t) => t.firstWordMs).filter((x) => typeof x === 'number').sort((a, b) => a - b);
const median = words.length ? words[Math.floor(words.length / 2)] : null;
const summary = {
  base: BASE, throttle: THROTTLE, slowAsm: SLOW_ASM, variant,
  moves: turns.length, graded, gradedShare: turns.length ? Math.round((graded / turns.length) * 100) : 0,
  respawns: respawns.length, stalls: stalls.length, opponentEngineErrors: oppErrors.length,
  firstWordMedianMs: median, firstWordMaxMs: words.at(-1) ?? null,
  firstWordOver4s: words.filter((w) => w > 4000).length,
  noFirstWord: turns.filter((t) => t.movedAt && t.firstWordMs === null).length,
  pageErrors: errors.length,
};
console.log(JSON.stringify(summary, null, 1));
for (const t of turns) console.log(`${t.san.padEnd(7)} read=${String(t.read).padEnd(8)} d=${String(t.readDepth ?? '-').padEnd(3)} reply=${String(t.replyMs ?? '-').padStart(6)}ms firstWord=${String(t.firstWordMs ?? '-').padStart(6)}ms longTasks=${t.longTaskMs ?? '-'}ms(max ${t.longestTaskMs ?? '-'}) ${t.reply ?? ''} | ${t.firstWord ?? ''}`);
for (const t of turns) if (t.hang) console.log(`HANG after ${t.san}: ${JSON.stringify(t.hang, null, 1)}`);
for (const t of turns) if (t.refused) console.log(`REFUSED ${t.san}: ${JSON.stringify(t.refused, null, 1)}`);
if (profileSummary) console.log(`PROFILE (move ${process.env.PROFILE_MOVE}, self time):\n${profileSummary.join('\n')}`);
for (const s of stalls) console.log(`stall @${s.at}ms: ${s.summary}`);
for (const e of oppErrors) console.log(`opponent: ${e}`);
const dir = `audit-reports/learn-ios-engine-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ summary, turns, stalls, oppErrors, ledger, errors }, null, 1));
console.log(`report: ${dir}/report.json`);
await browser.close();
await listener.stop?.();
process.exit(0);
