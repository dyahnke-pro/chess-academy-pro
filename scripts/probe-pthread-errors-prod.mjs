#!/usr/bin/env node
/**
 * probe-pthread-errors-prod — #21 step 1 (PLAN, handed over 2026-09-20): READ
 * THE REAL ERROR. The page-level ErrorEvent the pthread storm raises is
 * message-less, and Playwright cannot attach to NESTED workers (the engine's
 * pthread helpers are spawned inside the engine worker), so nobody has seen
 * what the runtime actually throws. This probe opens a raw CDP connection to
 * the launched Chromium, auto-attaches to EVERY target recursively (flatten
 * sessions), enables Runtime + Log on each, and records exceptions, console
 * errors and log entries keyed by the worker's URL — while Playwright drives
 * the census tool's exact reproduction: seed the pinned game, first-open, wait
 * for the background deep dive to finish, then reopen the review at once.
 *
 * Run:  AUDIT_GAME_ID=06wNUWaA AUDIT_STUDENT=black node scripts/probe-pthread-errors-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { fetchGameById, pickRealGame, SEEDS } from './audit-lib/source-real-game.mjs';

const BASE = (process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app').replace(/\/$/, '');
const PORT = Number(process.env.PROBE_CDP_PORT ?? 9333);
const OUT = `audit-reports/pthread-errors-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const log = (s) => console.log(s);
const has = async (p, sel) => (await p.locator(sel).count()) > 0;
const until = async (fn, ms, step = 500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, step)); } return false; };
const shortUrl = (u) => (u || '').split('/').pop().split('?')[0];

// ── raw CDP client: flattened sessions, recursive auto-attach ───────────────
async function rawCdp(port) {
  const v = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json());
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pending = new Map(); const handlers = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    for (const h of handlers) h(m);
  };
  const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, ...(sessionId ? { sessionId } : {}) })); });
  return { send, on: (h) => handlers.push(h), close: () => ws.close() };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const byId = process.env.AUDIT_GAME_ID;
  let game = null;
  if (byId) { game = await fetchGameById(BASE, byId).catch(() => null); if (game) game.studentSide = process.env.AUDIT_STUDENT || 'black'; }
  if (!game) { for (const seed of SEEDS) { const g = await pickRealGame(BASE, seed).catch(() => null); if (g) { game = { ...g, studentSide: seed.student ?? 'white' }; break; } } }
  if (!game) { log('no game could be sourced'); process.exit(2); }
  log(`[game] ${game.white} vs ${game.black} ${game.result} student=${game.studentSide} plies=${game.plyCount} id=${game.id}`);

  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: [...sandboxLaunchArgs(), `--remote-debugging-port=${PORT}`] });
  const cdp = await rawCdp(PORT);
  const targets = new Map(); // targetId → { url, type, sessionId }
  const errors = []; let phase = 'boot';
  const attachAll = async (sessionId) => {
    await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: true, flatten: true }, sessionId).catch(() => undefined);
  };
  cdp.on(async (m) => {
    if (m.method === 'Target.attachedToTarget') {
      const { sessionId, targetInfo, waitingForDebugger } = m.params;
      targets.set(targetInfo.targetId, { url: shortUrl(targetInfo.url) || targetInfo.type, type: targetInfo.type, sessionId, t: Date.now(), phase });
      await cdp.send('Runtime.enable', {}, sessionId).catch(() => undefined);
      await cdp.send('Log.enable', {}, sessionId).catch(() => undefined);
      await attachAll(sessionId); // nested workers of this target
      if (waitingForDebugger) await cdp.send('Runtime.runIfWaitingForDebugger', {}, sessionId).catch(() => undefined);
      return;
    }
    if (m.method === 'Target.targetInfoChanged') { const t = targets.get(m.params.targetInfo.targetId); if (t) t.url = shortUrl(m.params.targetInfo.url) || t.url; return; }
    if (m.method === 'Target.detachedFromTarget') { for (const [tid, t] of targets) if (t.sessionId === m.params.sessionId) targets.delete(tid); return; }
    const owner = [...targets.values()].find((t) => t.sessionId === m.sessionId);
    const url = owner?.url ?? (m.sessionId ? `?${m.sessionId.slice(0, 6)}` : 'browser');
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails ?? {};
      errors.push({ t: Date.now(), phase, url, kind: 'exception', text: `${d.text ?? ''} ${d.exception?.description ?? d.exception?.value ?? ''}`.trim().slice(0, 300), at: `${shortUrl(d.url)}:${d.lineNumber ?? '?'}` });
    } else if (m.method === 'Runtime.consoleAPICalled' && /error|warning/.test(m.params.type)) {
      errors.push({ t: Date.now(), phase, url, kind: `console.${m.params.type}`, text: (m.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300) });
    } else if (m.method === 'Log.entryAdded' && /error|warning/.test(m.params.entry?.level ?? '')) {
      errors.push({ t: Date.now(), phase, url, kind: `log.${m.params.entry.level}`, text: String(m.params.entry.text ?? '').slice(0, 300), at: shortUrl(m.params.entry.url) });
    } else if (m.method === 'Target.targetCrashed') {
      errors.push({ t: Date.now(), phase, url: targets.get(m.params.targetId)?.url ?? '?', kind: 'crashed', text: `${m.params.status} code=${m.params.errorCode}` });
    }
  });
  await attachAll(undefined);

  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration); await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();
  const pageErrors = []; page.on('pageerror', (e) => pageErrors.push({ t: Date.now(), phase, msg: String(e.message ?? e).slice(0, 120) }));
  const census = () => { const by = {}; for (const t of targets.values()) if (t.type === 'worker') by[t.url] = (by[t.url] ?? 0) + 1; return by; };
  const sample = (label) => log(`  [census] ${phase}/${label}: ${JSON.stringify(census())} errors=${errors.length} pageErrors=${pageErrors.length}`);

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000); sample('after-boot');
  const gid = `probe-pthread-${Date.now()}`;
  await page.evaluate(async ({ gid, pgn, g }) => {
    const open = () => new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const db = await open();
    const put = (store, val) => new Promise((res, rej) => { const t = db.transaction(store, 'readwrite'); t.objectStore(store).put(val); t.oncomplete = () => res(); t.onerror = () => rej(t.error); });
    const getAll = (store) => new Promise((res, rej) => { const t = db.transaction(store, 'readonly'); const rq = t.objectStore(store).getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
    await put('games', { id: gid, studentSide: g.studentSide, pgn, white: g.white, black: g.black, result: g.result, date: '2026.09.03', event: "Let's Play!", eco: '', source: 'chess.com', importedAt: Date.now(), timeControl: '600' });
    for (const p of await getAll('profiles')) { p.preferences = p.preferences || {}; p.preferences.chessComUsername = g.studentSide === 'white' ? g.white : g.black; await put('profiles', p); }
  }, { gid, pgn: game.movetext, g: game }).catch((e) => log(`[seed] ${String(e)}`));

  phase = 'first-open';
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const cardSel = `[data-testid="review-game-card-${gid}"]`;
  await until(() => has(page, cardSel), 20000);
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  const startable = async () => { const b = page.locator('[data-testid="start-walk-btn"]').first(); return (await b.count()) > 0 && (await b.getAttribute('disabled')) === null; };
  const ready = await until(startable, 300000, 1500); sample(`startable=${ready}`);
  // PROBE_WALK_MS: walk the first review for N ms before the dive-wait and the
  // reopen. The 2026-09-20 storm was measured by the review audit, whose reopen
  // comes after a full walk + explore + show-me; a reopen straight after the
  // dive (the default) came back clean — so the walk's engine load may be the
  // missing ingredient. 0 = skip.
  const walkMs = Number(process.env.PROBE_WALK_MS ?? 0);
  if (walkMs > 0) {
    phase = 'first-walk';
    await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
    const tw = Date.now(); while (Date.now() - tw < walkMs) { await page.waitForTimeout(15000); sample(`walk+${Math.round((Date.now() - tw) / 1000)}s`); }
  }
  phase = 'dive';
  const diveDone = await until(async () => !(await has(page, '[data-testid="review-deepening-pill"]')), 300000, 2000); sample(`dive-done=${diveDone}`);
  phase = 'reopen';
  const nav = Date.now();
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(Math.max(0, 3000 - (Date.now() - nav))); sample('reopen+3s');
  await until(() => has(page, cardSel), 20000);
  await page.locator(cardSel).first().click({ timeout: 5000 }).catch(() => undefined);
  await until(startable, 75000, 250); sample('reopened');
  phase = 'reopen-walk';
  await page.locator('[data-testid="start-walk-btn"]').first().click({ timeout: 5000 }).catch(() => undefined);
  const t1 = Date.now(); while (Date.now() - t1 < 60000) { await page.waitForTimeout(5000); sample(`walk+${Math.round((Date.now() - t1) / 1000)}s`); }

  // ── the answer: errors grouped by worker url, first distinct messages ──
  const byUrl = {}; for (const e of errors) { const k = `${e.phase} | ${e.url}`; (byUrl[k] ??= { n: 0, kinds: {}, msgs: new Map() }); byUrl[k].n += 1; byUrl[k].kinds[e.kind] = (byUrl[k].kinds[e.kind] ?? 0) + 1; const key = e.text.slice(0, 120); if (!byUrl[k].msgs.has(key)) byUrl[k].msgs.set(key, { at: e.at, n: 0 }); byUrl[k].msgs.get(key).n += 1; }
  log('\n===== ERRORS BY PHASE | WORKER =====');
  for (const [k, v] of Object.entries(byUrl).sort((a, b) => b[1].n - a[1].n)) {
    log(`${v.n.toString().padStart(7)}  ${k}  ${JSON.stringify(v.kinds)}`);
    for (const [msg, m] of [...v.msgs.entries()].slice(0, 4)) log(`           ×${m.n} ${m.at ?? ''} ${msg}`);
  }
  log(`\npage-level ErrorEvents: ${pageErrors.length}; distinct messages: ${[...new Set(pageErrors.map((e) => e.msg))].slice(0, 3).join(' | ') || '(none)'}`);
  await writeFile(`${OUT}/report.json`, JSON.stringify({ base: BASE, game: game.id, targets: [...targets.values()], errors, pageErrors }, null, 2));
  log(`report: ${OUT}/report.json`);
  cdp.close(); await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
