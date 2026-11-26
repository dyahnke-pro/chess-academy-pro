/**
 * audit-weaknesses-memory — how much JS heap does /weaknesses hold on open?
 *
 * 🔒 THE JETSAM (2026-11-26). An App Store user with a big imported library
 * had iOS kill the web view every time /weaknesses was open (4 kills in a day,
 * `webview_killed` route=/weaknesses), while every other tab ran for an hour.
 * A freeze probe measures TIME; a kill is MEMORY, so this probe seeds a large
 * analysed library with realistic per-move payloads (engine lines on flagged
 * plies, candidate reads, a coach transcript on some games), opens the page the
 * way a user does (home → tap Weaknesses), and samples the JS heap every 50 ms
 * through CDP until the insights land and the background fill settles. The one
 * number is PEAK heap above the home-screen baseline.
 *
 * NEGATIVE CONTROL first: allocating ~80 MB on the page must register as
 * ≥ 60 MB above baseline, or the sampler is blind and the run fails.
 *
 * Run (local preview of a build):
 *   AUDIT_SMOKE_URL=http://localhost:4173 node scripts/audit-weaknesses-memory.mjs
 * Env: AUDIT_GAMES (default 1000), AUDIT_HEAP_BUDGET_MB (fail above, default 150).
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:4173';
const GAMES = Number(process.env.AUDIT_GAMES ?? 1000);
const BUDGET_MB = Number(process.env.AUDIT_HEAP_BUDGET_MB ?? 150);
const SETTLE_MS = Number(process.env.AUDIT_SETTLE_MS ?? 30000);
// AUDIT_HELD=1: the last session was killed, so the crash-loop breaker holds
// the report — measures what the page loads on MOUNT with nothing derived
// (PostHog 2026-11-26: the web view died ~3 s into a held /weaknesses).
const HELD = process.env.AUDIT_HELD === '1';
// Share of games imported but not yet analysed (a big chess.com import).
const UNANALYSED = Number(process.env.AUDIT_UNANALYSED ?? 0);
const OUT_DIR = `audit-reports/weaknesses-memory-${new Date().toISOString().replace(/[:.]/g, '-')}`;

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const uci = (m) => m.from + m.to + (m.promotion ?? '');

/** A legal random game shaped like a real analysed record. */
function buildGame(i) {
  if (rnd() < UNANALYSED) return buildImported(i);
  const c = new Chess();
  const annotations = [];
  let ev = 20;
  for (let p = 0; p < 90 && !c.isGameOver(); p++) {
    const moves = c.moves({ verbose: true });
    const mv = moves[Math.floor(rnd() * moves.length)];
    const color = c.turn() === 'w' ? 'white' : 'black';
    const line = () => Array.from({ length: 12 }, () => uci(moves[Math.floor(rnd() * moves.length)]));
    c.move(mv.san);
    const r = rnd();
    const cls = r < 0.05 ? 'blunder' : r < 0.1 ? 'mistake' : r < 0.16 ? 'inaccuracy' : 'good';
    const swing = cls === 'blunder' ? 300 : cls === 'mistake' ? 150 : cls === 'inaccuracy' ? 60 : 5;
    ev = color === 'white' ? ev - swing : ev + swing;
    const a = {
      moveNumber: Math.floor(p / 2) + 1, color, san: mv.san, evaluation: ev,
      bestMove: uci(moves[0]), bestMoveEval: ev + swing, classification: cls, comment: null,
    };
    if (cls !== 'good') {
      a.costCp = swing;
      a.pv = { afterPlayed: line(), afterBest: line(), depth: 18, earlierPlayed: line(), earlierBest: line() };
      a.weighed = { depth: 16, reads: Array.from({ length: 6 }, () => ({ moves: line(), evaluation: ev, mate: null, earlier: line() })) };
    }
    annotations.push(a);
  }
  const g = {
    id: `audit-mem-${i}`, pgn: c.pgn(), white: '__ME__', black: `Opponent ${i}`,
    result: i % 3 === 0 ? '0-1' : i % 3 === 1 ? '1-0' : '1/2-1/2',
    date: `2026-${String(1 + (i % 11)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
    event: 'Audit', eco: ['C50', 'B01', 'D02', 'A07', 'B12'][i % 5],
    whiteElo: 1500, blackElo: 1400 + (i % 300), source: 'lichess', annotations, fullyAnalyzed: true,
    analysisDepth: 16, isMasterGame: false, openingId: null, coachAnalysis: null,
    openingKeyRev: '2026-09-22-one-opening-key',
  };
  if (i % 4 === 0) {
    g.coachTranscript = { seat: 'white', entries: Array.from({ length: 60 }, (_, k) => ({ t: k, kind: 'coach-narration-spoken', source: 'audit', summary: `line ${k} `.repeat(12), fen: c.fen() })) };
  }
  return g;
}

/** An imported chess.com game, not analysed yet: clock comments, no annotations. */
function buildImported(i) {
  const c = new Chess();
  for (let p = 0; p < 90 && !c.isGameOver(); p++) {
    const moves = c.moves();
    c.move(moves[Math.floor(rnd() * moves.length)]);
  }
  const hist = c.history();
  let pgn = '[Event "Live Chess"]\n[Site "Chess.com"]\n[TimeControl "600"]\n\n';
  hist.forEach((san, k) => { pgn += `${k % 2 === 0 ? `${k / 2 + 1}. ` : `${Math.floor(k / 2) + 1}... `}${san} {[%clk 0:0${k % 10}:${String(k % 60).padStart(2, '0')}.${k % 10}]} `; });
  return {
    id: `audit-mem-${i}`, pgn, white: '__ME__', black: `Opponent ${i}`,
    result: i % 2 ? '1-0' : '0-1', date: `2025-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
    event: 'Live Chess', eco: 'B12', whiteElo: 1200, blackElo: 1250, source: 'chesscom', annotations: null,
    fullyAnalyzed: false, isMasterGame: false, openingId: null, coachAnalysis: null,
    openingKeyRev: '2026-09-22-one-opening-key',
    clockRemainingMs: hist.map((_, k) => 600000 - k * 1000),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true, executablePath: await resolveChromiumExecutable(false),
    args: [...sandboxLaunchArgs(), '--js-flags=--expose-gc'],
  });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  const rows = [];
  const row = (name, ok, detail) => { rows.push({ name, ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${name} → ${detail}`); };
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  const heapMb = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    return (metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0) / 1048576;
  };
  const gc = async () => { await cdp.send('HeapProfiler.collectGarbage').catch(() => {}); };
  /** Sample the heap every 50 ms until `untilFn` resolves; return the peak. */
  const samplePeak = async (untilFn) => {
    let peak = 0; let stop = false;
    const loop = (async () => { while (!stop) { peak = Math.max(peak, await heapMb()); await new Promise((r) => setTimeout(r, 50)); } })();
    try { await untilFn(); } finally { stop = true; await loop; }
    return peak;
  };

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(async () => (await indexedDB.databases()).some((d) => d.name === 'ChessAcademyDB'), null, { timeout: 60000 });
  await page.waitForTimeout(4000);

  // NEGATIVE CONTROL — the sampler must see an allocation it is shown.
  await gc();
  const ctlBase = await heapMb();
  const ctlPeak = await samplePeak(async () => {
    await page.evaluate(() => { window.__ctl = Array.from({ length: 80 }, () => new Array(131072).fill(1.5)); });
    await page.waitForTimeout(300);
    await page.evaluate(() => { window.__ctl = null; });
  });
  row('sampler sees an ~80 MB allocation', ctlPeak - ctlBase >= 60, `+${(ctlPeak - ctlBase).toFixed(0)} MB`);
  if (ctlPeak - ctlBase < 60) throw new Error('heap sampler is blind — refusing a vacuous run');

  // Seed in chunks (one structured clone of 1000 games would itself spike).
  // The generated library is cached on disk: building it is most of a run.
  const cachePath = `audit-reports/.fixtures/wk-mem-games-${GAMES}-${UNANALYSED}.json`;
  let all = await readFile(cachePath, 'utf8').then((t) => JSON.parse(t), () => null);
  if (!all) {
    all = Array.from({ length: GAMES }, (_, i) => buildGame(i));
    await mkdir('audit-reports/.fixtures', { recursive: true });
    await writeFile(cachePath, JSON.stringify(all));
  }
  let seeded = null;
  for (let start = 0; start < GAMES; start += 100) {
    const chunk = all.slice(start, start + 100);
    seeded = await page.evaluate(async (gs) => {
      const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const name = await new Promise((res) => {
        const r = db.transaction('profiles').objectStore('profiles').getAll();
        r.onsuccess = () => { const p = r.result[0]; res(p?.preferences?.chessComUsername ?? p?.preferences?.lichessUsername ?? p?.name ?? null); };
        r.onerror = () => res(null);
      });
      if (!name) { db.close(); return { ok: false, reason: 'no profile' }; }
      await new Promise((res, rej) => {
        const tx = db.transaction('games', 'readwrite');
        const st = tx.objectStore('games');
        for (const g of gs) st.put({ ...g, white: name });
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      const count = await new Promise((res) => { const r = db.transaction('games').objectStore('games').count(); r.onsuccess = () => res(r.result); });
      db.close();
      return { ok: true, count };
    }, chunk);
  }
  const bytes = JSON.stringify(all[0]).length;
  row(`seeded ${GAMES} analysed games (~${(bytes / 1024).toFixed(0)} KB each as JSON)`, !!seeded?.ok && seeded.count >= GAMES, JSON.stringify(seeded));

  // The app's own clean exit: stops this page's heartbeat (a Playwright
  // reload fires no pagehide, so every run would otherwise read as a kill).
  await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
  await page.waitForTimeout(500);
  if (HELD) {
    // HELD: a session that died in front of the student, read by the next
    // boot. Otherwise a CLEAN record — a Playwright reload fires no pagehide,
    // so without it every run would read as a kill and measure the held page.
    await page.evaluate(async (held) => {
      const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      await new Promise((res, rej) => {
        const tx = db.transaction('meta', 'readwrite');
        tx.objectStore('meta').put({ key: 'session-watch', value: JSON.stringify({ startedAt: Date.now() - 3000, lastBeat: Date.now(), route: '/weaknesses', clean: false, poolWorkers: 0, analysing: false }) });
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      db.close();
    }, HELD);
  }
  // Boot on home the way a user arrives, then tap Weaknesses.
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(Number(process.env.AUDIT_BOOT_SETTLE_MS ?? 25000));
  await gc();
  const base = await heapMb();
  console.log(`  · home-screen baseline heap ${base.toFixed(0)} MB`);
  const t0 = Date.now();
  let loaded = false;
  const peak = await samplePeak(async () => {
    await page.locator('a[href="/weaknesses"]:visible').first().click({ timeout: 30000, noWaitAfter: true });
    await page.waitForURL(/\/weaknesses/, { timeout: 60000 });
    loaded = await page.waitForFunction(
      (held) => !!document.body && !!document.querySelector('[data-testid="tab-tactics"]')
        && (held ? !!document.querySelector('[data-testid="insights-held-after-kill"]') : !document.body.innerText.includes('Analysing your games')),
      HELD, { timeout: 300000 },
    ).then(() => true, () => false);
    await page.waitForTimeout(SETTLE_MS);
  });
  const loadMs = Date.now() - t0;
  const shown = await page.evaluate(() => ({
    header: document.querySelector('[data-testid="insights-analysed-count"]')?.textContent ?? null,
    held: !!document.querySelector('[data-testid="insights-held-after-kill"]'),
    url: location.pathname,
  }));
  // Not vacuous: the page must actually have read the seeded library (or be
  // held, on the held run) — a page that read nothing holds nothing.
  row('the page read the seeded library', HELD ? shown.held : new RegExp(`of ${GAMES}\\b`).test(shown.header ?? ''), JSON.stringify(shown));
  row(HELD ? 'page mounts held (report waits for a tap)' : 'insights finish loading', loaded, `${loadMs} ms incl. ${SETTLE_MS} ms settle`);
  const over = peak - base;
  row(`peak heap on open stays under ${BUDGET_MB} MB above home`, over < BUDGET_MB, `peak ${peak.toFixed(0)} MB, +${over.toFixed(0)} MB over baseline ${base.toFixed(0)} MB`);
  await gc();
  const after = await heapMb();
  console.log(`  · retained after settle + GC: ${after.toFixed(0)} MB (+${(after - base).toFixed(0)} MB)`);
  row('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ') || 'none');

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ held: HELD, unanalysed: UNANALYSED, games: GAMES, base, peak, over, after, loadMs, rows, pageErrors }, null, 2));
  console.log(`\nreport → ${OUT_DIR}/report.json`);
  await browser.close();
  process.exit(rows.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
