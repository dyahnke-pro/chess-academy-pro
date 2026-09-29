/**
 * audit-weaknesses-freeze-prod — does /weaknesses freeze on a BIG library?
 *
 * The 2026-09-29 freeze only exists at scale: the Tactics tab ran the tactic
 * classifier over every mistake of every analysed game, synchronously, on
 * every open (250 s on a desktop for 900 games). A cold device with a handful
 * of games can never show it, so this probe SEEDS a large analysed library
 * straight into IndexedDB, throttles the CPU to phone speed, opens the page and
 * measures the one number a freeze is: the longest gap between animation
 * frames while the page loads, the tabs are tapped, and the background fill
 * runs.
 *
 * NEGATIVE CONTROL first: a deliberate 600 ms busy loop must register as a
 * ≥500 ms block, or the frame-gap instrument is blind and the run fails rather
 * than reporting a vacuous green.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *      AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *      node scripts/audit-weaknesses-freeze-prod.mjs
 * Env: AUDIT_GAMES (default 900), AUDIT_CPU_THROTTLE (default 4).
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const GAMES = Number(process.env.AUDIT_GAMES ?? 900);
const THROTTLE = Number(process.env.AUDIT_CPU_THROTTLE ?? 4);
const FREEZE_MS = 1000; // a tap that waits a second is a freeze
const OUT_DIR = `audit-reports/weaknesses-freeze-${new Date().toISOString().replace(/[:.]/g, '-')}`;

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/** A legal random game with a realistic density of flagged moves. */
function buildGame(i) {
  const c = new Chess();
  const annotations = [];
  let ev = 20;
  for (let p = 0; p < 80 && !c.isGameOver(); p++) {
    const moves = c.moves({ verbose: true });
    const mv = moves[Math.floor(rnd() * moves.length)];
    const alt = moves[Math.floor(rnd() * moves.length)];
    const color = c.turn() === 'w' ? 'white' : 'black';
    c.move(mv.san);
    const r = rnd();
    const cls = r < 0.04 ? 'blunder' : r < 0.08 ? 'mistake' : 'good';
    const swing = cls === 'blunder' ? 300 : cls === 'mistake' ? 150 : 5;
    ev = color === 'white' ? ev - swing : ev + swing;
    annotations.push({
      moveNumber: Math.floor(p / 2) + 1, color, san: mv.san, evaluation: ev,
      bestMove: alt.from + alt.to, bestMoveEval: ev, classification: cls, comment: null,
    });
  }
  return {
    id: `audit-freeze-${i}`, pgn: c.pgn(), white: '__ME__', black: `Opponent ${i}`,
    result: i % 3 === 0 ? '0-1' : '1-0', date: '2026-09-01', event: 'Audit', eco: 'C50',
    whiteElo: 1500, blackElo: 1500, source: 'lichess', annotations, fullyAnalyzed: true,
    analysisDepth: 16, isMasterGame: false, openingId: null,
    // A real device has this stamped at boot already; without it the probe
    // measures the one-time opening-key re-mint instead of the page.
    openingKeyRev: '2026-09-22-one-opening-key',
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true, executablePath: await resolveChromiumExecutable(false), args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  // Frame-gap tracker, installed before any app code runs.
  await ctx.addInitScript(() => {
    const w = window;
    w.__gap = { worst: 0, last: performance.now() };
    const tick = () => {
      const now = performance.now();
      w.__gap.worst = Math.max(w.__gap.worst, now - w.__gap.last);
      w.__gap.last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  const rows = [];
  const row = (name, ok, detail) => { rows.push({ name, ok, detail }); console.log(`  ${ok ? '✓' : '✗'} ${name} → ${detail}`); };
  const resetGap = () => page.evaluate(() => { window.__gap.worst = 0; window.__gap.last = performance.now(); });
  const readGap = () => page.evaluate(() => Math.round(window.__gap.worst));

  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(async () => {
    const dbs = await indexedDB.databases();
    return dbs.some((d) => d.name === 'ChessAcademyDB');
  }, null, { timeout: 60000 });
  await page.waitForTimeout(4000);

  // NEGATIVE CONTROL — the instrument must see a block it is shown.
  await resetGap();
  await page.evaluate(() => { const t = performance.now(); while (performance.now() - t < 600) { /* busy */ } });
  await page.waitForTimeout(200);
  const control = await readGap();
  row('instrument sees a 600 ms block', control >= 500, `${control} ms`);
  if (control < 500) throw new Error('frame-gap instrument is blind — refusing a vacuous run');

  // Seed the library under the device's own profile name.
  const games = Array.from({ length: GAMES }, (_, i) => buildGame(i));
  const seeded = await page.evaluate(async (gs) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const name = await new Promise((res) => {
      const r = db.transaction('profiles').objectStore('profiles').getAll();
      r.onsuccess = () => { const p = r.result[0]; res(p?.preferences?.chessComUsername ?? p?.preferences?.lichessUsername ?? p?.name ?? null); };
      r.onerror = () => res(null);
    });
    if (!name) return { ok: false, reason: 'no profile' };
    await new Promise((res, rej) => {
      const tx = db.transaction('games', 'readwrite');
      const st = tx.objectStore('games');
      for (const g of gs) st.put({ ...g, white: name });
      tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
    });
    const count = await new Promise((res) => { const r = db.transaction('games').objectStore('games').count(); r.onsuccess = () => res(r.result); });
    db.close();
    return { ok: true, name, count };
  }, games);
  row(`seeded ${GAMES} analysed games`, seeded.ok && seeded.count >= GAMES, JSON.stringify(seeded));

  // Phone-speed CPU for everything that follows.
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

  const PROFILE = process.env.AUDIT_PROFILE === '1';
  if (PROFILE && process.env.AUDIT_PROFILE_PHASE !== 'taps') { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
  // Boot first, the way a user arrives: the app opens on the home screen and
  // they TAP Weaknesses. A full reload onto /weaknesses would charge boot work
  // (the lesson index, the one-time backfills) to this page.
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  await resetGap();
  await page.waitForTimeout(Number(process.env.AUDIT_BOOT_SETTLE_MS ?? 45000));
  const bootGap = await readGap();
  console.log(`  · boot (informational, not this page): longest block ${bootGap} ms`);
  await resetGap();
  const t0 = Date.now();
  await page.locator('a[href="/weaknesses"]:visible').first().click({ timeout: 30000, noWaitAfter: true });
  await page.waitForURL(/\/weaknesses/, { timeout: 60000 });
  await page.locator('[data-testid="tab-tactics"]').waitFor({ timeout: 120000 });
  // Wait for the data to land (the Overview spinner clears).
  // The page shows "Analysing your games..." until every insight has loaded.
  const loaded = await page.waitForFunction(
    () => !!document.body && !document.body.innerText.includes('Analysing your games'), null, { timeout: 300000 },
  ).then(() => true, () => false);
  row('insights finish loading', loaded, loaded ? 'loaded' : 'still loading after 300 s');
  const loadMs = Date.now() - t0;
  const loadGap = await readGap();
  const dumpProfile = async () => {
    const { profile } = await cdp.send('Profiler.stop');
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    const self = new Map();
    const dt = profile.timeDeltas; 
    profile.samples.forEach((id, i) => {
      const n = byId.get(id); const f = n.callFrame;
      const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
      self.set(key, (self.get(key) ?? 0) + (dt[i] ?? 0) / 1000);
    });
    const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
    console.log('PROFILE top self-time (ms):'); for (const [k, v] of top) console.log(`   ${v.toFixed(0).padStart(6)}  ${k}`);
    // Inclusive time by the nearest APP frame (skip vendor chunks), so chess.js
    // internals are charged to the app function that called them.
    const parent = new Map();
    for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
    const app = new Map();
    profile.samples.forEach((id, i) => {
      let cur = id; const seen = new Set();
      while (cur !== undefined) {
        const f = byId.get(cur).callFrame;
        if (f.url && !/vendor/.test(f.url) && f.url.includes('/assets/')) {
          const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`;
          if (!seen.has(key)) { app.set(key, (app.get(key) ?? 0) + (dt[i] ?? 0) / 1000); seen.add(key); }
        }
        cur = parent.get(cur);
      }
    });
    console.log('PROFILE inclusive by app frame (ms):');
    for (const [k, v] of [...app.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30)) console.log(`   ${v.toFixed(0).padStart(6)}  ${k}`);
  };
  if (PROFILE && process.env.AUDIT_PROFILE_PHASE !== 'taps') await dumpProfile();
  if (PROFILE && process.env.AUDIT_PROFILE_PHASE === 'taps') { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
  row('page loads without a freeze', loadGap < FREEZE_MS, `longest block ${loadGap} ms, loaded in ${loadMs} ms (cpu ×${THROTTLE})`);

  // Tap the tabs while the background fill runs — each tap must land promptly.
  // Every tab, Patterns and Thinking Errors included: Patterns ran the tactic
  // classifier over every find three times (206 s / 900 games) and an earlier
  // version of this probe never tapped it, so it could not see that freeze.
  for (const id of ['tactics', 'mistakes', 'openings', 'patterns', 'misconceptions', 'overview', 'tactics']) {
    await resetGap();
    const t = Date.now();
    await page.locator(`[data-testid="tab-${id}"]`).click({ timeout: 10000, noWaitAfter: true });
    const tapMs = Date.now() - t;
    await page.waitForTimeout(id === 'patterns' ? 8000 : 1500);
    const gap = await readGap();
    row(`tap "${id}" during background fill`, gap < FREEZE_MS && tapMs < 5000, `tap ${tapMs} ms, longest block ${gap} ms`);
    if (id === 'patterns') {
      const shown = await page.locator('[data-testid="patterns-tab"]').isVisible().catch(() => false);
      const note = await page.locator('[data-testid="patterns-classifying"]').textContent().catch(() => null);
      row('Patterns tab renders and says finds are still being scanned', shown && !!note, note ?? (shown ? 'rendered, no pending note' : 'not rendered'));
    }
  }
  if (PROFILE && process.env.AUDIT_PROFILE_PHASE === 'taps') await dumpProfile();
  const pending = await page.locator('[data-testid="tactics-classifying"]').textContent().catch(() => null);
  row('Tactics tab says the counts are still filling', !!pending, pending ?? 'no pending note');

  row('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ') || 'none');
  await page.screenshot({ path: `${OUT_DIR}/tactics.png` });
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ base: BASE_URL, games: GAMES, throttle: THROTTLE, rows }, null, 2));
  await browser.close();
  const failed = rows.filter((r) => !r.ok).length;
  console.log(`\n${rows.length - failed}/${rows.length} green · report ${OUT_DIR}/report.json`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
