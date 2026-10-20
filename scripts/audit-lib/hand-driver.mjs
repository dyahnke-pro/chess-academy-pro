#!/usr/bin/env node
/**
 * hand-driver — a live, MUTED browser Claude steers one command at a time
 * (David 2026-09-24: "I want you walking the test. Not a bot"). Nothing here
 * plays a script: each HTTP call does ONE thing and returns what is on screen.
 *
 *   node scripts/audit-lib/hand-driver.mjs            (port 7777)
 *   curl -s localhost:7777/open                       load /coach/teach
 *   curl -s --data 'play c6' localhost:7777/type      type + Enter
 *   curl -s localhost:7777/move?san=Nge2              play a move on the board
 *   curl -s localhost:7777/state                      fen, last chat, new spoken lines
 */
import http from 'node:http';
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './chromium.mjs';
import { startAuditListener } from './audit-listener.mjs';
import { autoDismissCalibration } from './auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './mute-tts.mjs';
import { readPlacement, samePlacement, placementOf, clickMove, sleep } from './board-drive.mjs';
import { loadFixtureIntoIDB } from './fixture-loader.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const PORT = Number(process.env.HAND_PORT ?? 7777);
const listener = await startAuditListener();
const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
// HAND_VIEWPORT=390x844 walks at phone size, so a screenshot is what the
// student sees (David 2026-10-19: "what the app looks, sounds, and feels like").
const vp = /^(\d+)x(\d+)$/.exec(process.env.HAND_VIEWPORT ?? '');
const ctx = await browser.newContext({ ...sandboxContextOptions(), ...(vp ? { viewport: { width: Number(vp[1]), height: Number(vp[2]) }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
}, { url: listener.url, secret: listener.secret });
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(`hand-${Math.random().toString(36).slice(2, 8)}`));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('crash', () => { errors.push('PAGE CRASHED'); console.log('PAGE CRASHED'); });
page.on('close', () => console.log('PAGE CLOSED'));
// The page's console, so a walk can read a debug line without a new audit
// event (`/console?grep=…`).
const consoleLines = [];
page.on('console', (m) => { consoleLines.push(m.text()); if (consoleLines.length > 2000) consoleLines.shift(); });

const chess = new Chess();
/** Per-turn measurements (`/turn`, `/trends`). */
const trends = [];
const asks = [];
let seen = 0;
/** The CDP session `/profile` samples the page through, and when it began. */
let profiler = null;
let profileStart = 0;
const NOISE = /^(track A spoke|computed |coach move |opening (identified|refined)|injected |voice=|silent|throttled)/i;

/** Board truth: follow whatever the app's board now shows by finding the one
 *  legal move from our mirror that produces it. */
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

async function state() {
  await syncBoard();
  const evs = listener.getCapturedEvents();
  const fresh = evs.slice(seen); seen = evs.length;
  const spoken = fresh
    .filter((e) => e.kind === 'coach-narration-spoken')
    .map((e) => (e.narrationText ?? e.summary ?? '').trim())
    .filter((t) => t && !NOISE.test(t));
  // A line that reached the VOICE without its own narration event (a verdict
  // spoken straight through speakForced) shows only as a 40-char `voice=`
  // stub. Keep it, marked "…", so a walk log never undercounts what was
  // heard (hand walk 2026-09-27: "dxe5: nice — that was the only…" missing).
  for (const e of fresh) {
    const m = /voice=\S+ personality=\S+ text="(.*)"$/.exec(e.narrationText ?? e.summary ?? '');
    if (!m) continue;
    const stub = m[1].replace(/\s+/g, ' ').trim();
    const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (stub && !spoken.some((t) => norm(t).includes(norm(stub).slice(0, 30)))) spoken.push(`${stub}… [voice]`);
  }
  // BOARD TAGS (plan 1.6): each spoken fact with the board it was graded on.
  const boards = [];
  for (const e of fresh) {
    if (e.kind !== 'coach-narration-spoken' || !e.details) continue;
    try { for (const f of JSON.parse(e.details).facts ?? []) if (f?.text && f?.fen) boards.push({ text: f.text, fen: f.fen }); } catch { /* not a tagged event */ }
  }
  const cmd = fresh
    .filter((e) => /coachMoveCommand|walkthrough/i.test(`${e.source ?? ''}`))
    .map((e) => `${e.kind} ${e.source}: ${(e.summary ?? '').slice(0, 160)}`);
  const chat = (await page.locator('[data-testid="chat-message-assistant"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  const busy = await page.locator('[data-testid="chat-text-input"]').isDisabled().catch(() => null);
  // THE ARROWS ON THE BOARD RIGHT NOW (David 2026-09-30: "make sure arrows
  // are firing to illustrate the ideas that are being spoken"). react-chessboard
  // draws each arrow as an SVG path in a 2048-wide viewBox; the first point is
  // just off the start square's centre and the last just short of the target's,
  // so rounding each to the nearest square centre recovers from→to. The board
  // orientation comes from the a-file label position.
  const arrows = await page.evaluate(() => {
    const svgs = [...document.querySelectorAll('svg[viewBox^="0 0 2048"]')];
    const out = [];
    const flipped = !!document.querySelector('[data-testid="board-orientation-black"]')
      || (() => { const sq = document.querySelector('[data-square="a1"]'); const sq8 = document.querySelector('[data-square="a8"]'); return !!(sq && sq8 && sq.getBoundingClientRect().top < sq8.getBoundingClientRect().top); })();
    const toSq = (x, y) => {
      let c = Math.min(7, Math.max(0, Math.floor(x / 256)));
      let r = Math.min(7, Math.max(0, Math.floor(y / 256)));
      if (flipped) { c = 7 - c; r = 7 - r; }
      return `${'abcdefgh'[c]}${8 - r}`;
    };
    for (const svg of svgs) {
      for (const p of svg.querySelectorAll('path')) {
        if (p.closest('defs,marker')) continue;
        const nums = (p.getAttribute('d') ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
        if (nums.length < 4) continue;
        const color = p.getAttribute('stroke') ?? '';
        out.push(`${toSq(nums[0], nums[1])}-${toSq(nums[nums.length - 2], nums[nums.length - 1])}${color ? `:${color}` : ''}`);
      }
    }
    return out;
  }).catch(() => []);
  return { moves: chess.history().join(' '), turn: chess.turn(), lastChat: chat.slice(0, 400), spoken, boards, arrows, cmd, inputBusy: busy, errors: errors.splice(0) };
}

const routes = {
  async open() {
    // A fresh page is a fresh game: the mirror starts over with it (a stale
    // mirror reported the previous game's moves over a new board).
    chess.reset();
    trends.length = 0;
    asks.length = 0;
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    const allow = page.locator('[data-testid="ai-consent-allow"]');
    if (await allow.count()) await allow.first().click().catch(() => {});
    await page.locator('[data-testid="chat-text-input"]').waitFor({ state: 'visible', timeout: 30_000 });
    return state();
  },
  async type(q, body) {
    // A screen can mount more than one chat box (Play keeps a hidden one);
    // type into the one a person can see. `?id=` names another box (the
    // tactics boards' question box).
    const input = page.locator(`[data-testid="${q.get('id') ?? 'chat-text-input'}"]:visible`).first();
    await input.pressSequentially(body, { delay: 10 });
    await page.keyboard.press('Enter');
    await sleep(2500);
    return state();
  },
  async move(q) {
    // The board may be REPLAYING a line (a slip answer, a refutation) and
    // show an earlier position for tens of seconds; a click then lands on the
    // replay. Wait until it shows the live game again.
    for (let t = Date.now(); Date.now() - t < 90_000; await sleep(500)) {
      await syncBoard();
      if (samePlacement(await readPlacement(page), placementOf(chess.fen()))) break;
    }
    const m = chess.move(q.get('san'));
    const ok = await clickMove(page, m, chess.fen());
    if (!ok) { chess.undo(); return { error: `board did not take ${q.get('san')}`, ...(await state()) }; }
    return state();
  },
  /** ONE STUDENT TURN, MEASURED (David 2026-10-19: audit trends, not points).
   *  Plays `?san=`, waits for the coach's reply and for the voice to settle,
   *  and records: ms to the reply, the board's size, the words spoken this
   *  turn, and the lines themselves. `/trends` returns every turn so far. */
  async turn(q) {
    const t0 = Date.now();
    const plies = chess.history().length;
    const played = await routes.move(q);
    if (played.error) return played;
    const lines = [...played.spoken];
    // WHEN EACH MARK WENT UP against when each line was heard (David
    // 2026-10-19: marks "need to light up AS THEY ARE MENTIONED").
    const timeline = [];
    const mark = (s) => { const k = s.arrows.join(' '); if (s.spoken.length || timeline.at(-1)?.arrows !== k) timeline.push({ ms: Date.now() - t0, arrows: k, heard: s.spoken.map((l) => l.slice(0, 60)) }); };
    let replyMs = null;
    for (let t = Date.now(); Date.now() - t < 120_000; await sleep(400)) {
      const s = await state();
      lines.push(...s.spoken); mark(s);
      if (chess.history().length >= plies + 2) { replyMs = Date.now() - t0; break; }
    }
    // The voice settles: every heard line has run out and nothing new came for
    // 2.5s after (at most 90s more). A line is heard when it STARTS, and the
    // muted voice holds it for its spoken length (voiceService: words/150 a
    // minute, 0.4–12s), so a flat 4s window stopped listening in the middle of
    // a long line and missed the one queued behind it (OS-1 replay 2026-10-19).
    const lineMs = (l) => Math.min(12_000, Math.max(400, Math.round((l.split(/\s+/).filter(Boolean).length / 150) * 60_000)));
    let until = Date.now() + 4000;
    for (const l of lines) until = Math.max(until, Date.now() + lineMs(l) + 2500);
    for (const t = Date.now(); Date.now() - t < 90_000 && Date.now() < until; await sleep(300)) {
      const s = await state();
      mark(s);
      if (s.spoken.length) { lines.push(...s.spoken); for (const l of s.spoken) until = Math.max(until, Date.now() + lineMs(l) + 2500); }
    }
    const boardPx = await page.evaluate(() => {
      const a = document.querySelector('[data-square="a1"]')?.getBoundingClientRect();
      return a ? Math.round(a.width * 8) : null;
    }).catch(() => null);
    const words = lines.reduce((n, l) => n + l.split(/\s+/).filter(Boolean).length, 0);
    // WHEN EACH LINE STARTED, read off the voice's own stamp (`startedAt`, set
    // before the event's awaits) — the poll above sees a line only once its
    // event is written, which on a busy turn is a second late (8.Bxf7+ replay).
    const onAir = listener.getCapturedEvents()
      .filter((e) => e.kind === 'coach-narration-spoken' && /speakCloud|speakWebSpeech/.test(e.source ?? ''))
      .map((e) => { let d = {}; try { d = JSON.parse(String(e.details ?? '{}')); } catch { d = {}; } return { at: Number(d.startedAt), text: (e.narrationText ?? '').slice(0, 60) }; })
      .filter((x) => Number.isFinite(x.at) && x.at >= t0)
      .map((x) => ({ ms: x.at - t0, text: x.text }));
    const row = { move: q.get('san'), reply: chess.history()[plies + 1] ?? null, replyMs, boardPx, words, lines, timeline, onAir };
    trends.push(row);
    return { ...row, moves: chess.history().join(' ') };
  },
  /** A QUESTION, MEASURED: Enter to the reply bubble's text (body = the
   *  question). The latency a student feels, recorded with the answer. */
  async ask(_q, body) {
    const bubbles = page.locator('[data-testid="chat-message-assistant"]');
    const before = await bubbles.count();
    const input = page.locator('[data-testid="chat-text-input"]:visible').first();
    for (let t = Date.now(); Date.now() - t < 60_000 && await input.isDisabled().catch(() => false);) await sleep(300);
    await input.pressSequentially(body, { delay: 10 });
    await page.keyboard.press('Enter');
    const t0 = Date.now();
    let text = '';
    for (; Date.now() - t0 < 60_000; await sleep(250)) {
      if ((await bubbles.count()) <= before) continue;
      text = (await bubbles.first().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      if (text.replace(/^C\s*/, '').length > 10) break;
    }
    const row = { ask: body, answerMs: Date.now() - t0, answer: text };
    asks.push(row);
    return row;
  },
  /** Every measured turn so far, plus the game's averages. */
  async trends() {
    const avg = (k) => { const v = trends.map((r) => r[k]).filter((x) => typeof x === 'number'); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    return { turns: trends.map(({ lines, ...r }) => ({ ...r, lines: lines.length })), avgReplyMs: avg('replyMs'), avgWords: avg('words'), boardPx: [...new Set(trends.map((r) => r.boardPx))], asks: asks.map((a) => ({ ask: a.ask, answerMs: a.answerMs })) };
  },
  /** Re-sync the mirror after a takeback: the move list as the board shows it. */
  async setline(q) {
    chess.reset();
    for (const m of (q.get('moves') ?? '').split(/\s+/).filter(Boolean)) chess.move(m);
    return state();
  },
  /** Set the student's rating the way the app reads it (the profile rung of
   *  getPlayerRatingEstimate), then reload so boot calibration picks it up.
   *  `/rating?elo=2340` — a walk at a different level. */
  async rating(q) {
    const elo = Number(q.get('elo'));
    const wrote = await page.evaluate((e) => new Promise((res) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const tx = req.result.transaction('profiles', 'readwrite');
        const st = tx.objectStore('profiles');
        const all = st.getAll();
        all.onsuccess = () => {
          for (const p of all.result) { p.currentRating = e; p.ratingBaseline = e; st.put(p); }
          tx.oncomplete = () => res(all.result.length);
        };
      };
      req.onerror = () => res(-1);
    }), elo);
    const out = await routes.open();
    return { wrote, ...out };
  },
  /** The last N captured app events (kind + source + summary) — to see what
   *  a turn COMPUTED and DROPPED, not only what it spoke. `/events?n=40&grep=pkg` */
  async events(q) {
    const n = Number(q.get('n') ?? 40);
    const re = q.get('grep') ? new RegExp(q.get('grep'), 'i') : null;
    // Filter FIRST, then trim: a grep for a rare row must not lose it to the
    // last-400 window (oct3e walk, the recorded engine lines).
    const all = listener.getCapturedEvents()
      .map((e) => `${q.get('t') ? `${e.receivedAt ?? e.timestamp} | ` : ''}${e.kind} | ${e.source ?? ''} | ${(e.narrationText ?? e.summary ?? '').slice(0, 1200)}${q.get('details') && e.details ? ` | ${e.details}` : ''}`);
    return (re ? all.filter((l) => re.test(l)) : all.slice(-400)).slice(-n);
  },
  /** Every `learn-reason-source` row this session: the board, the move, the
   *  spoken mistake line and the engine lines it was read from — so a walk can
   *  check a reason against its own source (2026-10-01). `/sources` */
  async sources() {
    return listener.getCapturedEvents()
      .filter((e) => e.kind === 'learn-reason-source')
      .map((e) => { let d = {}; try { d = JSON.parse(String(e.details ?? '{}')); } catch { d = {}; } return { fen: e.fen ?? null, ...d }; });
  },
  /** The page's console lines — `/console?n=40&grep=pf-debug`. */
  async console(q) {
    const n = Number(q.get('n') ?? 40);
    const re = q.get('grep') ? new RegExp(q.get('grep'), 'i') : null;
    return consoleLines.filter((l) => !re || re.test(l)).slice(-n);
  },
  /** Load a real data drop into this browser (`/fixture?path=…`, default the
   *  standard fixture), so a walk plays with a real record. */
  async fixture(q) {
    return loadFixtureIntoIDB(page, q.get('path') ?? undefined);
  },
  /** Any surface, not only Learn — `/goto?path=/tactics`. Returns the page's
   *  visible text and its testids, so a walk reads what a person would. */
  async goto(q) {
    await page.goto(`${BASE}${q.get('path') ?? '/'}`, { waitUntil: 'domcontentloaded' });
    await sleep(Number(q.get('ms') ?? 3000));
    const allow = page.locator('[data-testid="ai-consent-allow"]');
    if (await allow.count()) await allow.first().click().catch(() => {});
    return routes.page(q);
  },
  /** Tap by testid (`/click?id=section-my-mistakes`) or by visible text
   *  (`/click?text=Hint`), then read the page back. */
  async click(q) {
    const loc = q.get('id') ? page.locator(`[data-testid="${q.get('id')}"]`) : page.getByText(q.get('text') ?? '', { exact: false });
    const n = await loc.count();
    if (!n) return { error: `nothing to click for ${q.get('id') ?? q.get('text')}`, ...(await routes.page(q)) };
    await loc.first().click({ force: true }).catch((e) => errors.push(String(e)));
    await sleep(Number(q.get('ms') ?? 1500));
    return routes.page(q);
  },
  /** What held the page's main thread — `/profile?action=start`, then
   *  `/profile?action=stop`. Returns, per 250 ms window (wall clock), the app
   *  frames that ran most, so a stall is named rather than guessed (OS-18
   *  replay 2026-10-20: a verdict sat 3 s between the speech chain and the
   *  voice with nothing logged). Saves the raw .cpuprofile beside the report. */
  async profile(q) {
    if (q.get('action') === 'start') {
      profiler = profiler ?? await page.context().newCDPSession(page);
      await profiler.send('Profiler.enable');
      await profiler.send('Profiler.setSamplingInterval', { interval: Number(q.get('us') ?? 1000) });
      await profiler.send('Profiler.start');
      profileStart = Date.now();
      return { started: profileStart };
    }
    const { profile } = await profiler.send('Profiler.stop');
    const out = q.get('out') ?? '/tmp/hand-profile.cpuprofile';
    writeFileSync(out, JSON.stringify(profile));
    const parent = new Map();
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
    const appFrames = (id) => {
      const chain = [];
      for (let cur = id; cur !== undefined; cur = parent.get(cur)) {
        const f = byId.get(cur).callFrame;
        if (/\/src\//.test(f.url)) chain.push(`${f.functionName || '(anon)'}@${f.url.replace(/^.*\/src\//, '').replace(/\?.*$/, '')}:${f.lineNumber + 1}`);
        if (chain.length >= Number(q.get('depth') ?? 4)) break;
      }
      return chain.join(' < ');
    };
    const windows = new Map();
    let at = 0;
    profile.samples.forEach((id, k) => {
      at += profile.timeDeltas[k] ?? 0;
      const leaf = byId.get(id).callFrame.functionName;
      if (leaf === '(idle)' || leaf === '(program)' || leaf === '(garbage collector)') return;
      const w = Math.floor(at / 1000 / 250) * 250;
      const key = appFrames(id) || `(${leaf || 'native'})`;
      const m = windows.get(w) ?? new Map();
      m.set(key, (m.get(key) ?? 0) + (profile.timeDeltas[k + 1] ?? 0) / 1000);
      windows.set(w, m);
    });
    return {
      startedAt: profileStart,
      out,
      windows: [...windows.entries()].sort((a, b) => a[0] - b[0]).map(([w, m]) => ({
        at: profileStart + w,
        busyMs: Math.round([...m.values()].reduce((s, v) => s + v, 0)),
        top: [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${Math.round(v)}ms ${k}`),
      })),
    };
  },
  /** Run a snippet in the page (diagnosis only) — body = an async arrow's body. */
  async js(_q, body) {
    return page.evaluate(`(async () => { ${body} })()`).catch((e) => ({ error: String(e) }));
  },
  /** Type into a field by testid like a person — `/fill?id=username-input`, body = text. */
  async fill(q, body) {
    const loc = page.locator(`[data-testid="${q.get('id')}"]`).first();
    await loc.click({ force: true }).catch(() => {});
    await loc.pressSequentially(body, { delay: 15 });
    await sleep(500);
    return routes.page(q);
  },
  /** What a person sees: url, visible text, the testids on screen, new
   *  spoken lines and page errors. */
  async page(q) {
    const text = (await page.locator('main, body').first().innerText().catch(() => '')).replace(/\n{2,}/g, '\n').slice(0, Number(q?.get?.('chars') ?? 1500));
    const ids = await page.$$eval('[data-testid]', (els) => els.filter((e) => e.getClientRects().length).map((e) => e.getAttribute('data-testid'))).catch(() => []);
    const evs = listener.getCapturedEvents();
    const fresh = evs.slice(seen); seen = evs.length;
    const spoken = fresh.filter((e) => e.kind === 'coach-narration-spoken').map((e) => (e.narrationText ?? e.summary ?? '').trim()).filter(Boolean);
    return { url: page.url(), text, ids: [...new Set(ids)].slice(0, 80), spoken, placement: await readPlacement(page).catch(() => null), errors: errors.splice(0) };
  },
  /** Drag/click a move on the board by squares — `/sq?from=e2&to=e4` — for
   *  surfaces whose position the mirror does not track (puzzles). */
  async sq(q) {
    for (const s of [q.get('from'), q.get('to')]) {
      await page.locator(`[data-square="${s}"]`).first().click({ force: true }).catch((e) => errors.push(String(e)));
      await sleep(250);
    }
    await sleep(Number(q.get('ms') ?? 1500));
    return routes.page(q);
  },
  // Take the Nth tile of the open "Which line?" picker (0 = main line).
  async pick(q) {
    const row = page.getByText('Which line?', { exact: false }).first().locator('xpath=..');
    await row.locator('button').nth(Number(q.get('n') ?? 0)).click({ force: true, timeout: 10000 });
    await sleep(1500);
    return state();
  },
  async wait(q) { await sleep(Number(q.get('ms') ?? 5000)); return state(); },
  state,
  async shot(q) {
    const path = q.get('path') ?? '/tmp/hand-shot.png';
    await page.screenshot({ path, fullPage: false });
    return { path, placement: await readPlacement(page) };
  },
  async quit() { setTimeout(async () => { await browser.close(); await listener.close?.(); process.exit(0); }, 100); return { bye: true }; },
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  let body = '';
  for await (const c of req) body += c;
  try {
    const fn = routes[url.pathname.slice(1)];
    const out = fn ? await fn(url.searchParams, body) : { error: 'unknown' };
    res.end(`${JSON.stringify(out, null, 1)}\n`);
  } catch (e) { res.end(`${JSON.stringify({ error: String(e) })}\n`); }
}).listen(PORT, () => console.log(`hand-driver on :${PORT}`));
