#!/usr/bin/env node
/**
 * audit-coach-move-dictation-prod — DOES THE COACH PLAY THE MOVE IT IS TOLD TO?
 *
 * David 2026-07-12: "Coach can't play d4 when I told it to. It needs to play
 * every move I tell it to." The channel was built for that (coachMoveCommand.ts
 * + playDictatedMove + pendingCoachMoveRef) and carries NINE unit tests on the
 * PARSER — and, as of 2026-09-17, zero end-to-end proof. No audit anywhere
 * asserts `coach_move_command`. The parser is proven; the wire from chat →
 * board has never been driven live.
 *
 * 🔒 THE BOARD IS THE ASSERTION, NOT THE ACK. The coach answering "d4 — done.
 * Your move." while the board sits unchanged is precisely the failure this
 * probe exists to catch, and it is the failure an ack-only check cannot see.
 * Every mode below is confirmed by READING THE PIECE OFF THE SQUARE.
 *
 * Modes covered (coachMoveCommand's three, plus the consumption event):
 *   A. side-swap-open  — "play d4" at move 0: the coach TAKES White and plays it
 *   B. armed-pending   — mid-game "play Nf3": armed, then played as the NEXT reply
 *   C. corrected-last  — "no, take that back and play Nc3" AFTER the coach has
 *                        moved: the played move comes OFF the board and the
 *                        dictated one goes on. Both halves are asserted — a
 *                        takeback that leaves the old piece standing is the
 *                        silent half-failure an ack-only check cannot see.
 *   D. back-then-type  — the student hits Takeback themselves, THEN types the
 *                        move. This path routes through liveFenRef's re-sync,
 *                        not through the correction branch, so it is proven
 *                        separately rather than assumed from C.
 *
 * Muted (G1): this reads text and board state, never audio.
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OUT = `audit-reports/coach-move-dictation-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const rows = [];
const rec = (id, pass, detail) => { rows.push({ id, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${id} — ${detail}`); };
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const readBoard = (page) => page.evaluate(() => {
  const o = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    const p = sq.querySelector('[data-piece]');
    if (p) o[sq.getAttribute('data-square')] = p.getAttribute('data-piece');
  });
  return o;
}).catch(() => ({}));

/** Wait until `square` holds `piece` (e.g. 'wP'), or time out. */
async function waitForPiece(page, square, piece, ms = 45_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const b = await readBoard(page);
    if (b[square] === piece) return true;
    await sleep(1000);
  }
  return false;
}

/** Wait until the board differs from `before` (i.e. someone moved), return the new board. */
async function waitForBoardChange(page, before, ms = 60_000) {
  const key = (b) => Object.entries(b).sort().map(([k, v]) => `${k}${v}`).join(',');
  const was = key(before);
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const now = await readBoard(page);
    if (Object.keys(now).length > 0 && key(now) !== was) return now;
    await sleep(1000);
  }
  return null;
}

async function say(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  await input.click();
  await input.pressSequentially(text, { delay: 15 });
  await page.keyboard.press('Enter');
  console.log(`   › typed: "${text}"`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const listener = await startAuditListener();
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });

  const page = await ctx.newPage();
  const cmdEvents = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('request', (req) => {
    if (!req.url().includes('/audit-stream') && !req.url().includes('/api/audit') && !req.url().includes('/api/ph/')) return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      for (const e of (body.events ?? body.entries ?? [body])) {
        const s = JSON.stringify(e);
        if (s.includes('coach_move_command')) cmdEvents.push(s.slice(0, 400));
      }
    } catch { /* not ours */ }
  });

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  for (const [gate, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]']]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 5000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 10_000 }); } catch { /* absent */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2500 }); await page.keyboard.press('Escape'); } catch { /* absent */ }
  await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: 90_000 });
  await sleep(3000);

  const chess = new Chess();

  // ── A. "play d4" at move 0 — the coach should TAKE WHITE and play it ──────
  await say(page, 'play d4');
  const aOk = await waitForPiece(page, 'd4', 'wP');
  const transcript1 = await page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '');
  rec('A side-swap-open: "play d4" → a white pawn IS on d4',
    aOk, aOk ? 'board shows wP on d4 — the coach took White and played the dictated move'
             : `d4 empty after 45s; transcript tail: ${transcript1.slice(-220).replace(/\s+/g, ' ')}`);
  if (aOk) chess.move('d4');

  // ── B. mid-game dictation: arm a reply, then make a move and check it ─────
  if (aOk) {
    await say(page, 'play Nf3');
    await sleep(2500);
    const t2 = await page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '');
    const armed = /I'?ll play .*(knight|Nf3)/i.test(t2);
    rec('B1 armed-pending: the coach acknowledges it will play the dictated move',
      armed, armed ? 'ack present' : `no arming ack; tail: ${t2.slice(-220).replace(/\s+/g, ' ')}`);

    // student plays a move; the coach's reply must BE the dictated one
    const my = chess.moves({ verbose: true }).find((m) => m.san === 'd5') ?? chess.moves({ verbose: true })[0];
    await page.locator(`[data-square="${my.from}"]`).first().click({ timeout: 30_000, force: true });
    await sleep(250);
    await page.locator(`[data-square="${my.to}"]`).first().click({ timeout: 30_000, force: true });
    chess.move(my.san);
    console.log(`   › student played ${my.san}`);
    const bOk = await waitForPiece(page, 'f3', 'wN');
    rec('B2 armed-pending PLAYED: the coach\'s next reply IS the dictated Nf3',
      bOk, bOk ? 'board shows wN on f3 — dictation beat book and engine'
               : 'f3 has no white knight after 45s — the armed move was not played');
  } else {
    rec('B1 armed-pending: the coach acknowledges it will play the dictated move', false, 'SKIPPED — A failed, no game to dictate into');
    rec('B2 armed-pending PLAYED: the coach\'s next reply IS the dictated Nf3', false, 'SKIPPED — A failed');
  }

  // ── C. correction: take back what you played and play THIS instead ───────
  // 1.d4 d5 2.Nf3 is on the board. Nc3 is legal in the position BEFORE Nf3,
  // so the correction must land. Both halves matter: f3 must EMPTY.
  if (aOk) {
    await say(page, 'no, take that back and play Nc3');
    const cOn = await waitForPiece(page, 'c3', 'wN');
    const board = await readBoard(page);
    const cOff = board.f3 !== 'wN';
    rec('C corrected-last: the dictated move REPLACES the one the coach played',
      cOn && cOff,
      cOn && cOff ? 'wN on c3 and f3 is clear — the coach undid its own move and played the dictated one'
        : `c3 knight=${cOn ? 'yes' : 'no'}, f3 still occupied by ${board.f3 ?? 'nothing'}`);
    if (cOn && cOff) { chess.undo(); chess.move('Nc3'); }
  } else {
    rec('C corrected-last: the dictated move REPLACES the one the coach played', false, 'SKIPPED — A failed');
  }

  // ── D. the student takes back with the BUTTON, then types the move ────────
  // A different route into the same outcome: the undo happens outside the
  // command handler, so this proves liveFenRef re-syncs and the dictation
  // routes as play-it-now rather than arming for a turn that already passed.
  const cLanded = rows.find((r) => r.id.startsWith('C '))?.pass === true;
  if (cLanded) {
    const beforeMine = await readBoard(page);
    const mine = chess.moves({ verbose: true }).find((m) => m.san === 'Nf6') ?? chess.moves({ verbose: true })[0];
    await page.locator(`[data-square="${mine.from}"]`).first().click({ timeout: 30_000, force: true });
    await sleep(250);
    await page.locator(`[data-square="${mine.to}"]`).first().click({ timeout: 30_000, force: true });
    chess.move(mine.san);
    console.log(`   › student played ${mine.san}`);
    const afterMine = await waitForBoardChange(page, beforeMine, 30_000);
    const coachReplied = afterMine ? await waitForBoardChange(page, afterMine, 90_000) : null;
    if (!coachReplied) {
      rec('D back-then-type: Takeback then "play Bf4" puts the bishop on f4', false,
        'the coach never replied, so there was nothing to take back');
    } else {
      const tb = page.locator('[data-testid="teach-takeback"]');
      await tb.waitFor({ state: 'visible', timeout: 15_000 });
      await tb.click({ timeout: 30_000, force: true });
      await sleep(1500);
      await say(page, 'play Bf4');
      const dOk = await waitForPiece(page, 'f4', 'wB');
      rec('D back-then-type: Takeback then "play Bf4" puts the bishop on f4',
        dOk, dOk ? 'wB on f4 after an undo the command handler never saw — liveFenRef re-synced'
                 : 'f4 has no white bishop after 45s — the typed move did not route as play-it-now');
    }
  } else {
    rec('D back-then-type: Takeback then "play Bf4" puts the bishop on f4', false, 'SKIPPED — C failed');
  }

  // ── the app's own account of what it did ─────────────────────────────────
  // 🔒 NOT AN ASSERTION — `coach_move_command` goes through `captureEvent` to
  // PostHog, whose first-party proxy posts GZIPPED bodies, and `postData()`
  // hands back binary a regex matches nothing in (CLAUDE.md names this exact
  // trap). Decoding it here would duplicate `audit-review-card-prod`'s gzip
  // reader for no gain: the BOARD already proved the move was played, which is
  // the stronger claim. Reported as INFO so a zero never reads as a failure of
  // the product — the mistake this file exists to avoid.
  console.log(`ℹ️  EVT coach_move_command: ${cmdEvents.length} captured off the wire (PostHog bodies are gzipped; the board reads above are the proof). For the event itself: SELECT properties.mode, properties.san FROM events WHERE event='coach_move_command'`);
  rec('ERR no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'clean');

  writeFileSync(`${OUT}/report.json`, JSON.stringify({ base: BASE, rows, cmdEvents, pgn: chess.pgn(), pageErrors }, null, 2));
  console.log(`\n${rows.filter((r) => r.pass).length}/${rows.length} green — ${OUT}/report.json`);
  await browser.close().catch(() => {});
  await listener.stop().catch(() => {});
  process.exit(rows.every((r) => r.pass) ? 0 : 1);
}
main().catch((e) => { console.error('crashed:', e); process.exit(1); });
