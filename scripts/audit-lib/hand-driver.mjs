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
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './chromium.mjs';
import { startAuditListener } from './audit-listener.mjs';
import { autoDismissCalibration } from './auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './mute-tts.mjs';
import { readPlacement, samePlacement, placementOf, clickMove, sleep } from './board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const PORT = Number(process.env.HAND_PORT ?? 7777);
const listener = await startAuditListener();
const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
}, { url: listener.url, secret: listener.secret });
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(`hand-${Math.random().toString(36).slice(2, 8)}`));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

const chess = new Chess();
let seen = 0;
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
  const cmd = fresh
    .filter((e) => /coachMoveCommand|walkthrough/i.test(`${e.source ?? ''}`))
    .map((e) => `${e.kind} ${e.source}: ${(e.summary ?? '').slice(0, 160)}`);
  const chat = (await page.locator('[data-testid="chat-message-assistant"]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  const busy = await page.locator('[data-testid="chat-text-input"]').isDisabled().catch(() => null);
  return { moves: chess.history().join(' '), turn: chess.turn(), lastChat: chat.slice(0, 400), spoken, cmd, inputBusy: busy, errors: errors.splice(0) };
}

const routes = {
  async open() {
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    const allow = page.locator('[data-testid="ai-consent-allow"]');
    if (await allow.count()) await allow.first().click().catch(() => {});
    await page.locator('[data-testid="chat-text-input"]').waitFor({ state: 'visible', timeout: 30_000 });
    return state();
  },
  async type(_q, body) {
    const input = page.locator('[data-testid="chat-text-input"]');
    await input.pressSequentially(body, { delay: 10 });
    await page.keyboard.press('Enter');
    await sleep(2500);
    return state();
  },
  async move(q) {
    await syncBoard();
    const m = chess.move(q.get('san'));
    const ok = await clickMove(page, m, chess.fen());
    if (!ok) { chess.undo(); return { error: `board did not take ${q.get('san')}`, ...(await state()) }; }
    return state();
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
    return listener.getCapturedEvents().slice(-400)
      .map((e) => `${e.kind} | ${e.source ?? ''} | ${(e.summary ?? '').slice(0, 300)}`)
      .filter((l) => !re || re.test(l)).slice(-n);
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
