#!/usr/bin/env node
/**
 * audit-missions-01 — LEARN MISSIONS, PLAYED (WO-MISSIONS-01, David 2026-10-21).
 *
 * Plays three real Learn games on an emulated iPhone with David's data drop
 * loaded, and reads back what the coach SAID while the opening mission
 * ("Develop & Castle") was unresolved:
 *
 *   game 1 — CLEAN PASS: develop every minor once, castle.
 *   game 2 — MISS + RETRY: move a knight twice → the rewind; "Try again";
 *            then develop cleanly to a (retry) pass.
 *   game 3 — MISS TWICE: the same decision missed twice → the move is shown,
 *            the coach plays on, the mission ends `miss-shown`.
 *
 * Contracts (three instruments: Playwright drives, the narration listener
 * hears, the app's own audit rows decide):
 *   M1 the opening's spoken lines are ONLY the announce, the miss phrase and
 *      the pass line — nothing else until the mission resolves;
 *   M2 a miss pauses BEFORE the coach replies (the rewind is up, the board has
 *      not moved for the coach);
 *   M3 "Try again" undoes the student's move only;
 *   M4 a pass fires the reward and the pass line, once;
 *   M5 every game writes ONE mission row with the right outcome;
 *   M6 seats alternate White, Black, White — read from the record;
 *   M7 during the mission the coach never newly attacks a student piece other
 *      than a pawn, unless `mission-dial-forced` says every reply did.
 *   M8 after it resolves the middlegame card takes over (WO-MISSIONS-02): only
 *      mission lines are spoken; its own rewinds are played on here (its
 *      audit is audit-missions-02).
 *
 * MUTED (G1) and every billable request is aborted and counted. Emulated iPhone
 * on Chromium — real WebKit stays David's device check.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-missions-01.mjs
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-missions-01.mjs
 */
import { chromium, devices } from 'playwright';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { clickMove, awaitCoachReply, readPlacement, samePlacement, placementOf, sleep } from './audit-lib/board-drive.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `missions01-${Date.now()}`;
const OUT_DIR = 'audit-reports/missions-01';
const ANNOUNCE = "Today's mission: develop each knight and bishop by moving it only once, then castle.";
const MISS = 'One move per piece — bring out a new one.';
const PASS = 'Mission complete — every piece out and your king is safe!';
// WO-MISSIONS-02: the middlegame card takes the game over the ply after the
// opening resolves, and speaks only its own lines.
const MG_LINES = new Set([
  'Middlegame mission: tactically win an extra piece, then maintain the advantage to the end.',
  "There's a win on the board — find it.",
  "You're ahead — keep every piece safe.",
  'Mission complete — you won an extra piece and maintained the advantage!',
]);
const MAX_STUDENT_MOVES = 16;
const POST_RESOLUTION_MOVES = 3;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── the student's play: develop every minor once, then castle ──────────────
const HOME = { w: { n: ['b1', 'g1'], b: ['c1', 'f1'] }, b: { n: ['b8', 'g8'], b: ['c8', 'f8'] } };
const PREFERRED = {
  w: { n: ['c3', 'f3', 'd2', 'e2'], b: ['c4', 'b5', 'd3', 'e2', 'f4', 'g5', 'e3', 'd2', 'b2', 'g2'], pawn: ['e4', 'd4', 'e3', 'd3', 'c3', 'g3', 'b3', 'a3', 'h3'] },
  b: { n: ['c6', 'f6', 'd7', 'e7'], b: ['c5', 'b4', 'd6', 'e7', 'f5', 'g4', 'e6', 'd7', 'b7', 'g7'], pawn: ['e5', 'd5', 'e6', 'd6', 'c6', 'g6', 'b6', 'a6', 'h6'] },
};
const enemy = (c) => (c === 'w' ? 'b' : 'w');

/** The next clean move for the mission: a home minor out (safe squares
 *  first), castling once ready, a pawn to open lines — never a developed
 *  minor a second time. */
function cleanMove(chess, me) {
  const legal = chess.moves({ verbose: true });
  const safe = (m) => {
    const p = new Chess(chess.fen());
    p.move(m.san);
    return !p.isAttacked(m.to, enemy(me));
  };
  const castle = legal.find((m) => m.isKingsideCastle()) ?? legal.find((m) => m.isQueensideCastle());
  const minorsOut = ['n', 'b'].flatMap((t) => HOME[me][t]).filter((sq) => {
    const pc = chess.get(sq);
    return !(pc && pc.color === me && (pc.type === 'n' || pc.type === 'b'));
  }).length;
  if (castle && minorsOut >= 2) return castle;
  for (const t of ['n', 'b']) {
    const out = legal.filter((m) => m.piece === t && HOME[me][t].includes(m.from) && !m.captured);
    out.sort((a, b) => (PREFERRED[me][t].indexOf(a.to) + 100 * (PREFERRED[me][t].indexOf(a.to) < 0)) - (PREFERRED[me][t].indexOf(b.to) + 100 * (PREFERRED[me][t].indexOf(b.to) < 0)));
    const pick = out.find(safe) ?? out[0];
    if (pick) return pick;
  }
  if (castle) return castle;
  const pawns = legal.filter((m) => m.piece === 'p' && !m.captured);
  pawns.sort((a, b) => (PREFERRED[me].pawn.indexOf(a.san) + 100 * (PREFERRED[me].pawn.indexOf(a.san) < 0)) - (PREFERRED[me].pawn.indexOf(b.san) + 100 * (PREFERRED[me].pawn.indexOf(b.san) < 0)));
  return pawns.find(safe) ?? pawns[0] ?? legal.find((m) => m.piece !== 'k' && m.piece !== 'r' && !(['n', 'b'].includes(m.piece))) ?? legal[0];
}

/** A guaranteed miss: a developed knight's second move, unforced (not a
 *  capture, its square not attacked, not in check). Avoids `exclude`. */
function missMove(chess, me, exclude = []) {
  if (chess.inCheck()) return null;
  const legal = chess.moves({ verbose: true });
  return legal.find((m) => (m.piece === 'n' || m.piece === 'b') && !HOME[me][m.piece].includes(m.from)
    && !m.captured && !chess.isAttacked(m.from, enemy(me)) && !exclude.includes(m.to)) ?? null;
}

/** Student non-pawn pieces the coach's move NEWLY attacks. */
function newlyAttacked(fenBefore, san, student) {
  const att = (b) => b.board().flat().filter((c) => c && c.color === student && c.type !== 'p' && b.isAttacked(c.square, enemy(student))).map((c) => c.square);
  const b = new Chess(fenBefore);
  const before = new Set(att(b));
  b.move(san);
  return att(b).filter((s) => !before.has(s));
}

async function bannerState(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="mission-banner"]');
    return el ? { mission: el.getAttribute('data-mission'), phase: el.getAttribute('data-phase'), outcome: el.getAttribute('data-outcome'), progress: document.querySelector('[data-testid="mission-progress"]')?.textContent ?? '' } : null;
  }).catch(() => null);
}

async function missionRows(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('missionResults', 'readonly');
        const all = tx.objectStore('missionResults').getAll();
        all.onsuccess = () => resolve(all.result);
        all.onerror = () => resolve([]);
      } catch { resolve([]); }
    };
    req.onerror = () => resolve([]);
  }));
}

async function clearMissionRows(page) {
  await page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('missionResults', 'readwrite');
        tx.objectStore('missionResults').clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch { resolve(false); }
    };
    req.onerror = () => resolve(false);
  }));
}

async function dismissModals(page) {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-close"]']) {
    const el = page.locator(sel);
    if (await el.count().then((n) => n > 0).catch(() => false)) await el.first().click({ timeout: 5_000 }).catch(() => {});
  }
}

/** Has the opening card resolved? It hands the game to the middlegame card. */
const openingResolved = (b) => !!b && (b.mission !== 'develop-and-castle' || b.phase === 'resolved');

/** The opening card's outcome, from the app's own mission rows (WO-02: the
 *  banner has moved on to the middlegame card by then). */
function openingOutcome(events) {
  for (const e of [...events].reverse()) {
    if (e.kind !== 'mission-checked') continue;
    try { const d = JSON.parse(e.details ?? '{}'); if (d.mission === 'develop-and-castle' && d.outcome) return d.outcome; } catch { /* skip */ }
  }
  return null;
}

const spokenLines = (events) => events
  .filter((e) => e.kind === 'coach-narration-spoken' && /voiceService\.speak(Cloud|WebSpeech)/.test(String(e.source ?? '')))
  .map((e) => ({ at: e.timestamp ?? e.at ?? null, text: String(e.narrationText ?? '').trim() }))
  .filter((l) => l.text);

async function playGame(context, listener, plan, index) {
  const tape = { game: index + 1, plan, moves: [], spoken: [], missionEvents: [], banner: [], notes: [] };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const startEvents = listener.getCapturedEvents().length;
  await page.goto(`${BASE_URL}/coach/campaign`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6_000);
  await dismissModals(page);
  // WO-CAMPAIGN-MASTER: a Campaign game waits on its missions sheet until Start.
  const startBtn = page.locator('[data-testid="mission-card-start"]');
  if (await startBtn.first().waitFor({ timeout: 20_000 }).then(() => true).catch(() => false)) {
    await startBtn.first().click({ timeout: 5_000 }).catch(() => {});
  }
  await page.locator('[data-testid="mission-banner"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_500);
  const studentWhite = await page.locator('[data-testid="color-white-btn"]').getAttribute('class').then((c) => /ring-2/.test(c ?? '')).catch(() => true);
  const me = studentWhite ? 'w' : 'b';
  tape.seat = studentWhite ? 'white' : 'black';
  const chess = new Chess();
  if (!studentWhite) {
    // The coach opens: read its first move off the board.
    const opener = await awaitCoachReply(page, chess, { firstMove: true });
    if (opener) { chess.move(opener); tape.moves.push({ by: 'coach', san: opener }); }
    else tape.notes.push('coach never opened as White');
  }
  let missesPlayed = 0;
  let missSquares = [];
  let missionDone = false;
  let coachAttacks = [];
  // CAMPAIGN: the mission owns the whole game, so after it resolves the coach
  // must stay silent — a few more moves prove it.
  let afterResolution = 0;
  for (let n = 0; n < MAX_STUDENT_MOVES + POST_RESOLUTION_MOVES && afterResolution <= POST_RESOLUTION_MOVES; n += 1) {
    if (missionDone) afterResolution += 1;
    // After the opening, the middlegame card may rewind a move this script does
    // not care about (its own audit is missions-02): play on.
    if (missionDone && await page.locator('[data-testid="mission-play-on"]').count().catch(() => 0)) {
      await page.locator('[data-testid="mission-play-on"]').click({ timeout: 5_000 }).catch(() => {});
      tape.notes.push('middlegame rewind — played on');
      await page.waitForTimeout(1_500);
    }
    if (afterResolution > POST_RESOLUTION_MOVES) break;
    const fenBefore = chess.fen();
    let mv = null;
    let intendedMiss = false;
    const wantMiss = !missionDone && ((plan === 'miss-retry' && missesPlayed === 0) || (plan === 'miss-twice' && missesPlayed < 2));
    if (wantMiss && n >= 2) {
      mv = missMove(chess, me, missSquares);
      intendedMiss = !!mv;
    }
    if (!mv) mv = cleanMove(chess, me);
    if (!mv) break;
    const probe = new Chess(fenBefore);
    probe.move(mv.san);
    const landed = await clickMove(page, mv, probe.fen()).catch(() => false);
    if (!landed) { tape.notes.push(`move ${mv.san} did not land`); break; }
    chess.move(mv.san);
    tape.moves.push({ by: 'student', san: mv.san, intendedMiss, at: Date.now() });
    if (intendedMiss) {
      missesPlayed += 1;
      missSquares.push(mv.to);
      await page.waitForTimeout(2_500);
      const rewindUp = await page.locator('[data-testid="mission-rewind"]').count().catch(() => 0);
      const banner = await bannerState(page);
      tape.banner.push({ after: mv.san, ...banner });
      const coachMoved = !samePlacement(await readPlacement(page), placementOf(chess.fen()));
      if (rewindUp > 0) {
        check(`G${index + 1} M2 a miss pauses before the coach replies (${mv.san})`, !coachMoved && banner?.phase === 'paused', `rewind up, coach moved=${coachMoved}`);
        await page.screenshot({ path: `${OUT_DIR}/g${index + 1}-miss-${missesPlayed}.png` }).catch(() => {});
        await page.locator('[data-testid="mission-try-again"]').click({ timeout: 5_000 });
        await page.waitForTimeout(1_500);
        chess.undo();
        tape.moves.push({ by: 'student', san: `(try again: ${mv.san} taken back)` });
        const back = samePlacement(await readPlacement(page), placementOf(fenBefore));
        check(`G${index + 1} M3 "Try again" undoes the student move only`, back, back ? 'board back on the decision' : 'board did not return');
        continue;
      }
      // Second miss at the decision: shown and played on — and the middlegame card takes over.
      const shownOutcome = openingOutcome(listener.getCapturedEvents().slice(startEvents));
      check(`G${index + 1} the second miss shows the move and plays on`, openingResolved(banner) && shownOutcome === 'miss-shown', `${JSON.stringify(banner)} outcome=${shownOutcome}`);
      await page.screenshot({ path: `${OUT_DIR}/g${index + 1}-miss-shown.png` }).catch(() => {});
      missionDone = true;
      tape.resolvedAtEvent = listener.getCapturedEvents().length;
    }
    // The mission may have resolved ON this move: the coach's reply to it is
    // then played under no dials and must not be charged to the mission.
    if (!missionDone) {
      await page.waitForTimeout(600);
      const now = await bannerState(page);
      if (openingResolved(now)) {
        missionDone = true;
        tape.resolvedAtEvent = listener.getCapturedEvents().length;
        // The celebration is on screen now — photograph it before it fades.
        if (/pass/.test(openingOutcome(listener.getCapturedEvents().slice(startEvents)) ?? '')) await page.screenshot({ path: `${OUT_DIR}/g${index + 1}-pass.png` }).catch(() => {});
      }
    }
    const before = chess.fen();
    // A slow reply (the engine busy under the dial's read) gets a second wait
    // before the game is called stalled.
    const reply = (await awaitCoachReply(page, chess)) ?? (await awaitCoachReply(page, chess));
    if (!reply) {
      tape.notes.push(`no coach reply after ${mv.san}`);
      console.log(`[stall] no coach reply after ${mv.san}`);
      await page.screenshot({ path: `${OUT_DIR}/g${index + 1}-stall.png` }).catch(() => {});
      tape.stallBoard = await readPlacement(page);
      tape.stallThinking = await page.locator('text=Thinking…').count().catch(() => -1);
      break;
    }
    const hits = newlyAttacked(before, reply, me);
    if (!missionDone && hits.length > 0) coachAttacks.push({ reply, hits });
    chess.move(reply);
    tape.moves.push({ by: 'coach', san: reply, at: Date.now(), ...(hits.length ? { attacks: hits } : {}) });
    const banner = await bannerState(page);
    tape.banner.push({ after: reply, ...banner });
    if (openingResolved(banner) && !missionDone) { missionDone = true; tape.resolvedAtEvent = listener.getCapturedEvents().length; }
  }
  tape.movesAfterResolution = Math.max(0, afterResolution - 1);
  await page.waitForTimeout(4_000);
  const finalBanner = await bannerState(page);
  const events = listener.getCapturedEvents().slice(startEvents);
  tape.spoken = spokenLines(events);
  // What was said once the mission had resolved (its own resolution line
  // excepted — it can land just after the banner flips).
  tape.spokenAfterResolution = tape.resolvedAtEvent === undefined ? []
    : spokenLines(listener.getCapturedEvents().slice(tape.resolvedAtEvent)).filter((l) => l.text !== PASS && l.text !== MISS && !MG_LINES.has(l.text));
  tape.missionEvents = events.filter((e) => /^mission-/.test(String(e.kind))).map((e) => ({ kind: e.kind, summary: e.summary }));
  tape.finalBanner = finalBanner;
  tape.openingOutcome = openingOutcome(events);
  tape.events = events.map((e) => ({ t: e.timestamp ?? e.at ?? null, kind: e.kind, source: e.source, summary: String(e.summary ?? '').slice(0, 160) }));
  tape.pageErrors = pageErrors;
  const forced = events.filter((e) => e.kind === 'mission-dial-forced');
  const swaps = events.filter((e) => e.kind === 'mission-dial-swap');
  tape.dial = { swaps: swaps.map((e) => e.summary), forced: forced.map((e) => e.summary), coachAttacks };
  // Decision rows arrive batched (`learn-turn-decision`, details.rows).
  const rows = events.filter((e) => e.kind === 'learn-turn-decision').flatMap((e) => { try { return JSON.parse(e.details ?? '{}').rows ?? []; } catch { return []; } });
  tape.heldAsMission = rows.filter((r) => Object.values(r.heldWhy ?? {}).includes('mission')).length;
  tape.spokeDuringMission = rows.filter((r) => (r.spoke ?? []).length > 0 && Object.values(r.heldWhy ?? {}).includes('mission')).length;
  await page.close();
  return tape;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[run-id] ${RUN_ID}  [target] ${BASE_URL}`);
  const listener = await startAuditListener();
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  // An iPhone, emulated: viewport, touch, pixel ratio, mobile UA (Chromium engine).
  const { defaultBrowserType: _engine, ...iphone } = devices['iPhone 15'];
  const context = await browser.newContext({ ...iphone, ...sandboxContextOptions() });
  await context.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });
  await context.addInitScript(autoDismissCalibration);
  await context.addInitScript(muteTtsForAudit);
  await context.addInitScript(stampAuditRunId(RUN_ID));
  const billable = [];
  await context.route(/\/api\/tts|api\.deepseek\.com|api\.anthropic\.com|texttospeech\.googleapis/i, (route) => { billable.push(route.request().url()); return route.abort(); });

  // David's data drop, then a clean mission record so game 1 sits White.
  const seed = await context.newPage();
  await seed.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await seed.waitForTimeout(8_000);
  // The newest data drop when it is on this machine, else the older export.
  const dropPath = process.env.AUDIT_FIXTURE
    ?? ['audit-reports/.fixtures/data-drop-david.json', 'audit-reports/.fixtures/david-games.json'].find((p) => existsSync(p));
  const fixture = dropPath ? await loadFixtureIntoIDB(seed, dropPath) : { loaded: false, reason: 'no data drop on this machine' };
  console.log(`[fixture] path=${dropPath ?? '-'}`);
  console.log(`[fixture] ${fixture.loaded ? `${fixture.wrote} rows / ${fixture.stores} stores` : `skipped (${fixture.reason})`}`);
  await clearMissionRows(seed);
  await seed.close();

  const tapes = [];
  for (const [i, plan] of ['clean', 'miss-retry', 'miss-twice'].entries()) {
    console.log(`\n── game ${i + 1}: ${plan} ──`);
    const tape = await playGame(context, listener, plan, i);
    tapes.push(tape);
    await writeFile(`${OUT_DIR}/tape-g${i + 1}-${plan}.json`, JSON.stringify(tape, null, 2));
    console.log(`[tape] seat=${tape.seat} moves=${tape.moves.map((m) => m.san).join(' ')}`);
    console.log(`[spoken] ${tape.spoken.map((l) => `"${l.text}"`).join(' | ') || '(nothing)'}`);
  }

  // ── contracts ──
  const allowed = new Set([ANNOUNCE, MISS, PASS, ...MG_LINES]);
  for (const t of tapes) {
    const g = `G${t.game}`;
    // M1: everything spoken while the mission was live must be a mission line.
    // The tape stops at resolution + one reply, so the whole tape is the window.
    const stray = t.spoken.filter((l) => !allowed.has(l.text));
    check(`${g} M1 the game spoke only mission lines`, stray.length === 0, stray.length ? `stray: ${stray.map((l) => `"${l.text.slice(0, 80)}"`).join(' | ')}` : `${t.spoken.length} line(s): ${t.spoken.map((l) => (l.text === ANNOUNCE ? 'announce' : l.text === MISS ? 'miss' : l.text === PASS ? 'pass' : 'middlegame')).join(', ')}`);
    check(`${g} the announce was spoken once`, t.spoken.filter((l) => l.text === ANNOUNCE).length === 1);
    const outcome = t.openingOutcome;
    if (t.plan === 'clean') check(`${g} M4 clean pass: pass-first-try + the pass line`, outcome === 'pass-first-try' && t.spoken.filter((l) => l.text === PASS).length === 1, `outcome=${outcome}`);
    if (t.plan === 'miss-retry') check(`${g} M4 retry pass: pass-retry + the pass line`, outcome === 'pass-retry' && t.spoken.filter((l) => l.text === PASS).length === 1, `outcome=${outcome}`);
    if (t.plan === 'miss-twice') check(`${g} miss twice: miss-shown, the miss phrase twice`, outcome === 'miss-shown' && t.spoken.filter((l) => l.text === MISS).length === 2, `outcome=${outcome}`);
    check(`${g} M8 after the opening resolves, only the middlegame card speaks`, t.movesAfterResolution >= 1 && t.spokenAfterResolution.length === 0,
      `${t.movesAfterResolution} move(s) after; ${t.spokenAfterResolution.length ? `said: ${t.spokenAfterResolution.map((l) => `"${l.text.slice(0, 70)}"`).join(' | ')}` : 'nothing said'}`);
    check(`${g} M7 the coach never kicked a student piece unforced`, t.dial.coachAttacks.length <= t.dial.forced.length, `attacks=${JSON.stringify(t.dial.coachAttacks)} forced=${t.dial.forced.length} swaps=${t.dial.swaps.length}`);
    check(`${g} the door held its lanes as \`mission\``, t.heldAsMission > 0, `${t.heldAsMission} decision row(s)`);
    check(`${g} no page errors`, t.pageErrors.length === 0, t.pageErrors.slice(0, 3).join(' | '));
  }
  // THE CLASSIC DOOR IS UNTOUCHED: /coach/teach runs no mission.
  const classicStart = listener.getCapturedEvents().length;
  const classic = await context.newPage();
  await classic.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await classic.waitForTimeout(10_000);
  await dismissModals(classic);
  await classic.waitForTimeout(3_000);
  const classicBanner = await classic.locator('[data-testid="mission-banner"]').count().catch(() => 0);
  const classicMission = listener.getCapturedEvents().slice(classicStart).filter((e) => /^mission-/.test(String(e.kind))).length;
  const classicTitle = await classic.locator('h2', { hasText: 'Learn with Coach' }).count().catch(() => 0);
  await classic.close();
  check('M9 the classic Learn door (/coach/teach) runs no mission', classicBanner === 0 && classicMission === 0, `banner=${classicBanner} mission events=${classicMission} title=${classicTitle}`);

  const rowsPage = await context.newPage();
  await rowsPage.goto(`${BASE_URL}/coach/campaign`, { waitUntil: 'domcontentloaded' });
  await rowsPage.waitForTimeout(3_000);
  const rows = (await missionRows(rowsPage)).sort((a, b) => a.at - b.at);
  await rowsPage.close();
  const openingRows = rows.filter((r) => r.missionId === 'develop-and-castle');
  check('M5 one opening row per game', openingRows.length === 3, openingRows.map((r) => `${r.color}:${r.outcome}`).join(', '));
  check('M5 rows carry the outcomes played', openingRows.map((r) => r.outcome).join(',') === 'pass-first-try,pass-retry,miss-shown', openingRows.map((r) => r.outcome).join(','));
  check('M6 seats alternate White, Black, White', tapes.map((t) => t.seat).join(',') === 'white,black,white', tapes.map((t) => t.seat).join(','));
  check('no billable request (muted)', billable.length === 0, `${billable.length} aborted`);

  const failed = results.filter((r) => !r.pass);
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ runId: RUN_ID, baseUrl: BASE_URL, results, rows, at: new Date().toISOString() }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks green — report at ${OUT_DIR}/report.json`);
  await browser.close();
  await listener.stop?.();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
