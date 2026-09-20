#!/usr/bin/env node
/**
 * audit-engine-worker-census-prod — the INSTRUMENT for outline item #21 (the
 * Stockfish pthread storm). Measured 2026-09-19 on a clean bundle: the review
 * REOPEN census went 5 → 41 → 76 worker targets under ONE live multi-thread
 * engine, with PostHog showing zero stalls, zero respawns and zero demotions in
 * the window — so the pthreads accumulate inside a single engine, and nothing
 * the app writes says why. With a deploy landing mid-run the same climb reached
 * 124 and `WebAssembly.Memory(): could not allocate memory` (761k page errors).
 *
 * WHAT THIS MEASURES, and why reading could not: a pthread Worker is spawned by
 * the Emscripten runtime INSIDE the engine worker, in response to something the
 * engine was told to do. So the tool keeps two clocks side by side —
 *   1. every worker TARGET the browser creates or destroys (CDP
 *      `Target.setDiscoverTargets`, which sees NESTED workers Playwright's
 *      page.on('worker') does not), with its URL and a timestamp;
 *   2. every UCI command the app's main thread posts to an engine worker
 *      (`Worker.prototype.postMessage`, hooked before the app boots, tagged with
 *      the worker's URL), with a timestamp;
 * — and for every engine-worker spawn prints the commands sent in the 1.5 s
 * before it. The spawner is named by the clock, not guessed.
 *
 * Contracts (experience-shaped, negative-controlled):
 *   A. an engine worker appeared at all (vacuity — a blank app fails here)
 *   B. after init settles, the census holds at the engine's thread count
 *      (≤ CENSUS_STEADY) for ≥ 10 s before the walk starts
 *   C. the REOPEN census never exceeds CENSUS_CEILING — the #21 storm
 *   D. total engine-worker creations across the run stay under CREATE_CEILING
 *   E. zero page errors mentioning WebAssembly / memory
 *   F. the run stayed MUTED (zero /api/tts requests)
 *   G. the previous document's engine workers are all gone 3 s into the reopen
 *      (engineLifecycle's pagehide teardown — the #21 root cause, fixed 2026-09-20)
 * On any red, the report carries the per-spawn preceding-command histogram —
 * that histogram IS the finding.
 *
 * Three instruments per G1: Playwright drives; the app's own audit events land
 * on the loopback listener sidecar (the prod stream is opt-in/off — CLAUDE.md
 * §G2 — and an audit-marked page never writes remotely); TTS is muted.
 *
 * Run (prod):  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *              AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-engine-worker-census-prod.mjs
 * Pin a game:  AUDIT_GAME_ID=06wNUWaA AUDIT_STUDENT=black … (same as the review audit)
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { SEEDS, pickRealGame, fetchGameById } from './audit-lib/source-real-game.mjs';

const BASE = (process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/engine-worker-census-${stamp}`;
/** Threads(4) + the TT-clear helpers + the main engine worker + the 5 pool workers. */
const CENSUS_STEADY = Number(process.env.CENSUS_STEADY ?? 12);
/** The review audit's HEAP row trips at 40; the storm reached 76 and 124. */
const CENSUS_CEILING = Number(process.env.CENSUS_CEILING ?? 40);
const CREATE_CEILING = Number(process.env.CREATE_CEILING ?? 60);
const WALK_BUDGET_MS = Number(process.env.WALK_BUDGET_MS ?? 240_000);

const log = (s) => console.log(s);
const results = [];
const add = (id, pass, detail) => { results.push({ id, pass, detail }); log(`  ${pass ? '✅' : '❌'} ${id} — ${detail}`); };
const until = async (fn, ms, step = 500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };
const has = async (page, sel) => (await page.locator(sel).count().catch(() => 0)) > 0;

async function resolveGame() {
  const byId = process.env.AUDIT_GAME_ID;
  if (byId) {
    const g = await fetchGameById(BASE, byId).catch(() => null);
    if (g) return { ...g, studentSide: process.env.AUDIT_STUDENT || 'white', how: `AUDIT_GAME_ID=${byId} AUDIT_STUDENT=${process.env.AUDIT_STUDENT || 'white'}` };
  }
  for (let i = 0; i < SEEDS.length; i += 1) {
    const seedIdx = (Math.abs(Math.floor(Date.now())) + i) % SEEDS.length;
    const g = await pickRealGame(BASE, SEEDS[seedIdx]).catch(() => null);
    if (g) return { ...g, how: `AUDIT_GAME_ID=${g.id} AUDIT_STUDENT=${g.studentSide}` };
  }
  return null;
}

/** Hooked into the page before boot: tag engine workers and log every UCI string sent to them. */
function hookUci() {
  const w = window;
  w.__uciLog = [];
  const Orig = w.Worker;
  const isEngine = (u) => /stockfish|sf16|lila/i.test(String(u));
  w.Worker = function (url, opts) {
    const inst = new Orig(url, opts);
    const u = String(url);
    if (isEngine(u)) {
      const post = inst.postMessage.bind(inst);
      inst.postMessage = (msg, ...rest) => {
        if (typeof msg === 'string') w.__uciLog.push({ t: Date.now(), url: u.split('/').pop().split('?')[0], cmd: msg.slice(0, 80) });
        return post(msg, ...rest);
      };
    }
    return inst;
  };
  w.Worker.prototype = Orig.prototype;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const game = await resolveGame();
  if (!game) { add('A. an engine worker appeared', false, 'no real game could be sourced (explorer unreachable) — nothing to open'); return finish(); }
  const sans = (() => { const c = new Chess(); c.loadPgn(game.movetext); return c.history(); })();
  log(`[game] ${game.white} vs ${game.black} ${game.result}, student=${game.studentSide}, ${sans.length} plies (id=${game.id})`);
  log(`[game] REPRODUCE:  ${game.how} node scripts/audit-engine-worker-census-prod.mjs`);

  const listener = await startAuditListener();
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(hookUci);
  await ctx.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });

  // ── Instrument 1: the target census, event-driven, browser-wide ──────────
  const live = new Map();           // targetId → { url, t }
  const created = [];               // { t, url, phase, targetId } — url is filled in when the runtime reports it
  const destroyed = [];
  let phase = 'boot';
  const cdp = await browser.newBrowserCDPSession();
  const shortUrl = (u) => (u || '').split('/').pop().split('?')[0];
  cdp.on('Target.targetCreated', ({ targetInfo }) => {
    if (targetInfo.type !== 'worker') return;
    const url = shortUrl(targetInfo.url);
    live.set(targetInfo.targetId, { url, t: Date.now() });
    created.push({ t: Date.now(), url, phase, targetId: targetInfo.targetId });
  });
  // A worker's URL is often EMPTY at creation and arrives on the next
  // targetInfoChanged (measured 2026-09-19: the first census read {"":5}).
  // Without this the engine's pthreads are unattributable and row A fails on a
  // healthy app — the exact false-red this tool exists to prevent.
  cdp.on('Target.targetInfoChanged', ({ targetInfo }) => {
    if (targetInfo.type !== 'worker') return;
    const url = shortUrl(targetInfo.url);
    if (!url) return;
    const l = live.get(targetInfo.targetId); if (l) l.url = url;
    const c = created.find((x) => x.targetId === targetInfo.targetId); if (c && !c.url) c.url = url;
  });
  cdp.on('Target.targetDestroyed', ({ targetId }) => { if (live.delete(targetId)) destroyed.push({ t: Date.now(), phase }); });
  await cdp.send('Target.setDiscoverTargets', { discover: true });
  const census = () => { const by = {}; for (const w of live.values()) by[w.url] = (by[w.url] ?? 0) + 1; return { n: live.size, by }; };
  const samples = [];
  const sample = (label) => { const c = census(); samples.push({ t: Date.now(), phase, label, ...c }); log(`  [census] ${phase}/${label}: ${c.n} ${JSON.stringify(c.by)}`); return c; };

  const page = await ctx.newPage();
  let ttsRequests = 0; const pageErrors = [];
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsRequests += 1; });
  page.on('pageerror', (e) => { pageErrors.push(String(e.message ?? e).slice(0, 160)); });
  const uciLog = async () => page.evaluate(() => (window.__uciLog ?? []).splice(0)).catch(() => []);
  const uci = [];
  const drain = async () => { for (const e of await uciLog()) uci.push({ ...e, phase }); };

  // ── boot + seed the real game UNANALYZED (the review audit's shape) ───────
  for (let i = 0; i < 4; i++) { try { await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch { await page.waitForTimeout(3000); } }
  await page.waitForTimeout(6000);
  sample('after-boot');
  const gid = `audit-census-${Date.now()}`;
  await page.evaluate(async ({ gid, pgn, g }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, studentSide: g.studentSide, pgn, white: g.white, black: g.black, result: g.result, date: '2026.09.03', event: "Let's Play!", eco: g.eco ?? 'B22', whiteElo: 1392, blackElo: 1378, source: 'chesscom', termination: 'resignation', annotations: null, coachAnalysis: null, isMasterGame: false, openingId: null, fullyAnalyzed: false });
    const profs = await getAll('profiles');
    for (const p of profs) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = g.studentSide === 'white' ? g.white : g.black; p.preferences.lastChessComAutoImportAt = Date.now(); p.preferences.lastLichessAutoImportAt = Date.now(); await put('profiles', p); }
  }, { gid, pgn: game.movetext, g: game }).catch((e) => log(`[seed] ${String(e)}`));

  // ── first open: analysis, then the walk ──────────────────────────────────
  phase = 'first-open';
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const cardSel = `[data-testid="review-game-card-${gid}"]`;
  await until(() => has(page, cardSel), 20000);
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  const startable = async () => { const b = page.locator('[data-testid="start-walk-btn"]').first(); return (await b.count()) > 0 && (await b.getAttribute('disabled').catch(() => null)) === null; };
  const ready = await until(startable, 300000, 1500);
  await drain(); sample('analysis-settled');
  // B. steady state: hold for 10 s before starting the walk
  const steadyReads = [];
  for (let i = 0; i < 5; i++) { await page.waitForTimeout(2000); steadyReads.push(census().n); }
  await drain();
  phase = 'walk';
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  await page.locator('[data-testid="coach-game-review-walk"]').first().waitFor({ timeout: 20000 }).catch(() => undefined);
  const t0 = Date.now();
  let peakWalk = 0;
  while (Date.now() - t0 < WALK_BUDGET_MS) {
    await page.waitForTimeout(5000);
    await drain();
    const c = census(); peakWalk = Math.max(peakWalk, c.n);
    if ((Date.now() - t0) % 30000 < 5000) sample('walking');
    if (!(await has(page, '[data-testid="coach-game-review-walk"]'))) break;
  }
  sample('walk-end');
  // ── reopen: where the storm was measured ─────────────────────────────────
  // G. THE PREVIOUS DOCUMENT'S ENGINES MUST BE GONE BEFORE THE NEXT ONE BOOTS
  // (the #21 root: they were still resident, the new multi heap could not be
  // allocated). Snapshot the live target ids now; 3 s after the navigation
  // starts, none of them may still be live. engineLifecycle tears them down on
  // `pagehide`; this row is what proves that on the real browser.
  const priorIds = new Set(live.keys());
  phase = 'reopen';
  const navStart = Date.now();
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(Math.max(0, 3000 - (Date.now() - navStart)));
  const survivors = [...priorIds].filter((id) => live.has(id)).length;
  await until(() => has(page, cardSel), 20000);
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  await until(startable, 75000, 250);
  await drain(); sample('reopened');
  let peakReopen = census().n;
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  const t1 = Date.now();
  while (Date.now() - t1 < 60_000) { await page.waitForTimeout(2500); await drain(); peakReopen = Math.max(peakReopen, census().n); }
  sample('reopened-walk-60s');
  await drain();

  // ── the correlation: what did the app tell the engine just before each spawn? ──
  const engineSpawns = created.filter((c) => /stockfish|lite|sf16|lila|wasm/i.test(c.url));
  const unlabeled = created.filter((c) => !c.url).length;
  if (unlabeled) log(`  [census] ${unlabeled} worker target(s) never reported a URL — counted in the census, excluded from attribution`);
  const preceding = {};
  const perSpawn = engineSpawns.map((s) => {
    const cmds = uci.filter((u) => u.t <= s.t && s.t - u.t <= 1500).map((u) => u.cmd);
    for (const c of cmds) { const head = c.split(' ').slice(0, 3).join(' '); preceding[head] = (preceding[head] ?? 0) + 1; }
    return { t: s.t, phase: s.phase, url: s.url, preceding: cmds.slice(-4) };
  });
  const histogram = Object.entries(preceding).sort((a, b) => b[1] - a[1]);
  log('\n  [correlation] commands sent in the 1.5 s before an engine-worker spawn:');
  for (const [k, v] of histogram.slice(0, 12)) log(`    ${String(v).padStart(4)}  ${k}`);
  const byPhase = {}; for (const s of engineSpawns) byPhase[s.phase] = (byPhase[s.phase] ?? 0) + 1;
  log(`  [spawns] engine-worker creations by phase: ${JSON.stringify(byPhase)}; destroyed: ${destroyed.length}`);

  add('A. an engine worker appeared (vacuity)', engineSpawns.length > 0 && ready, `${engineSpawns.length} engine-worker creations; analysis settled=${ready}`);
  const steadyMax = Math.max(...steadyReads);
  add(`B. census holds steady after init (≤ ${CENSUS_STEADY} for 10 s)`, steadyMax <= CENSUS_STEADY, `reads=${steadyReads.join(',')}`);
  add('G. the previous document\'s engine workers are all gone 3 s into the reopen (engineLifecycle pagehide teardown)', survivors === 0, `${survivors} of ${priorIds.size} prior worker targets still live`);
  add(`C. reopen census stays under ${CENSUS_CEILING} (the #21 storm)`, peakReopen < CENSUS_CEILING, `peak=${peakReopen}; walk peak=${peakWalk}; top preceding: ${histogram.slice(0, 3).map(([k, v]) => `${k}×${v}`).join(' | ') || 'none'}`);
  add(`D. total engine-worker creations < ${CREATE_CEILING}`, engineSpawns.length < CREATE_CEILING, `${engineSpawns.length} (${JSON.stringify(byPhase)})`);
  const wasmErrs = pageErrors.filter((e) => /WebAssembly|memory/i.test(e));
  add('E. zero WebAssembly/memory page errors', wasmErrs.length === 0, wasmErrs.length ? wasmErrs[0] : `${pageErrors.length} other page errors`);
  add('F. the run stayed MUTED', ttsRequests === 0, `${ttsRequests} /api/tts requests`);

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE, game: { id: game.id, how: game.how, plies: sans.length }, results, samples, engineSpawns: perSpawn, histogram, uciCount: uci.length, listenerByKind: listener.countByKind(), pageErrors: pageErrors.slice(0, 50) }, null, 2));
  await writeFile(`${OUT_DIR}/uci-log.json`, JSON.stringify(uci, null, 1));
  await browser.close().catch(() => undefined);
  await listener.stop();
  return finish();
}

function finish() {
  const failed = results.filter((r) => !r.pass);
  log(`\n${results.length - failed.length}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { log(`fatal: ${e?.stack ?? e}`); process.exit(1); });
