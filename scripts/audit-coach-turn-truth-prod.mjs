#!/usr/bin/env node
/**
 * audit-coach-turn-truth-prod — did the 2026-08-16 fixes actually reach a
 * student? Drives a real game on LIVE prod and reads the app's own audit log
 * back out of Dexie to answer three questions with the app's own words.
 *
 * WHY DEXIE AND NOT THE AUDIT STREAM. The stream only receives what the app
 * POSTS, and the app only posts when the profile carries `auditStreamSecret`
 * — which a fresh Playwright profile does not. A stream pull against a bot
 * context therefore returns 0 events and reads exactly like "nothing
 * happened", which is the most dangerous possible false green. The rolling
 * buffer in `db.meta` is written unconditionally and is, per CLAUDE.md, the
 * source of truth on-device. So the instrument reads the truth, not the
 * mirror. (The narration listener cannot attach either: the page is https and
 * the sidecar is http.)
 *
 * THE THREE CONTRACTS, each tied to what David heard:
 *
 *   1. STRENGTH — "it played way better than I was", beside a log line that
 *      read `elo=1237`. Every opponent search must now carry
 *      `UCI_LimitStrength` and print the Elo the ENGINE got, not the one that
 *      was wished for.
 *   2. PIECES — "the knight presses the pawn… bishop and rook can trap", in a
 *      rook endgame. No sentence the coach SPEAKS may name a piece type that
 *      is not on the board it was spoken about.
 *   3. ONE DEPTH — the hint lane said Kg2 at depth 12 while the grading lane
 *      logged Qc3 at depth 14, for one position. The turn is read at one
 *      depth now.
 *
 * Contract 2 is checked against the board, not against a wording: every
 * `coach-narration-spoken` entry that carries a FEN is replayed and its piece
 * nouns are compared with the pieces actually present. A gate that merely
 * logs "I dropped something" proves nothing about what survived.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   [PLIES=24] node scripts/audit-coach-turn-truth-prod.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const PLIES = Number(process.env.PLIES || 24);
const OUT = join('audit-reports', `coach-turn-truth-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const PIECE_WORDS = [['queen', 'q'], ['rook', 'r'], ['bishop', 'b'], ['knight', 'n'], ['pawn', 'p']];

/** Piece types named in prose that are nowhere on the board. The same question
 *  the runtime gate now asks, asked again from outside it. */
function absentPiecesNamed(text, fen) {
  let chess;
  try { chess = new Chess(fen); } catch { return []; }
  const present = new Set();
  for (const row of chess.board()) for (const p of row) if (p) present.add(p.type);
  const low = text.toLowerCase();
  return PIECE_WORDS
    .filter(([word, type]) => !present.has(type) && new RegExp(`\\b${word}s?\\b`).test(low))
    .map(([word]) => word);
}

const main = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveChromiumExecutable(false),
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);       // audits never spend TTS money
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });

  console.log(`[turn-truth] ${BASE} · ${PLIES} plies`);
  await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(20_000);              // deferred seed + engine warm

  // ── PLAY A REAL GAME. Node-side chess.js mirror picks only legal moves (G3);
  // the board is driven by clicking squares, exactly as a hand would. The
  // coach's replies are read back from the app's OWN `coach-turn-checkpoint`
  // entries — the mechanism `audit-coach-full-games` proved out. Inferring the
  // reply from the DOM is what made the first run of this script stall after
  // one move: the mirror never learned it was White's turn again.
  await clearFirstRunOverlays(page);
  const mirror = new Chess();
  const OPENING = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'];
  let played = 0;
  let lastTs = 0;
  for (let i = 0; i < PLIES && !mirror.isGameOver(); i += 1) {
    const scripted = OPENING[played];
    const legal = mirror.moves({ verbose: true });
    const pick = (scripted && legal.find((m) => m.san === scripted))
      || legal.find((m) => m.san.includes('#'))
      || legal.find((m) => m.captured)
      || legal[0];
    if (!pick) break;
    try {
      await page.locator(`[data-square="${pick.from}"]`).click({ force: true, timeout: 8000 });
      await page.locator(`[data-square="${pick.to}"]`).click({ force: true, timeout: 8000 });
    } catch { break; }
    mirror.move(pick.san);
    played += 1;
    const reply = await waitCoachReply(page, lastTs);
    if (!reply?.san) { console.log('[turn-truth] no coach reply — stopping'); break; }
    lastTs = reply.ts;
    if (mirror.moves().includes(reply.san)) mirror.move(reply.san);
    else if (reply.fen) { try { mirror.load(reply.fen); } catch { break; } }
    else break;
  }
  console.log(`[turn-truth] played ${played} student moves`);

  // ── AND NOW THE SURFACE THE NARRATION LIVES ON ───────────────────────────
  // Play is SILENT by contract (CLAUDE.md: it never volunteers a note
  // mid-game), so the piece contract and the turn-depth contract cannot be
  // exercised there at all — the first run "passed" both on zero samples.
  // David heard the wrong pieces on LEARN. So the run continues there: ask for
  // a lesson, let it narrate, and check every spoken line against its board.
  console.log('[turn-truth] → /coach/teach for the narration contracts');
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(8_000);
  await clearFirstRunOverlays(page);
  try {
    const box = page.locator('textarea, [data-testid="coach-chat-input"]').first();
    await box.waitFor({ state: 'visible', timeout: 20_000 });
    // pressSequentially, not fill: the React textarea needs real key events or
    // the send button never enables (CLAUDE.md, the coach-chat audit pattern).
    await box.pressSequentially('teach me the caro-kann', { delay: 25 });
    await page.keyboard.press('Enter');
    // THE PICKER IS NOT THE LESSON. A broad family name ("caro-kann") opens a
    // VARIATION PICKER and waits; the first run of this phase sat on it for 90
    // seconds and logged "line picker shown — 7 variations", so no ply was ever
    // narrated and the piece contract examined zero lines. Click a variation —
    // exactly the failure CLAUDE.md's interactive-audit rule names.
    await page.waitForTimeout(12_000);
    const picker = page.locator('[data-testid="line-picker"]');
    if (await picker.isVisible().catch(() => false)) {
      const option = page.locator('[data-testid^="line-picker-"]')
        .filter({ hasNotText: /dismiss/i }).first();
      await option.click({ force: true, timeout: 8000 }).catch(() => {});
      console.log('[turn-truth] variation picked from the line picker');
      await page.waitForTimeout(4_000);
    }
    console.log('[turn-truth] letting the lesson narrate (110s)');
    await page.waitForTimeout(110_000);
    // Nudge the walkthrough along so more than the first beat is spoken.
    for (let i = 0; i < 6; i += 1) {
      const skip = page.locator('[data-testid="walkthrough-skip"], [data-testid="walkthrough-next"]').first();
      if (await skip.isVisible().catch(() => false)) {
        await skip.click({ force: true, timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(6_000);
      } else break;
    }
  } catch (e) {
    console.log(`[turn-truth] learn phase could not start: ${String(e).slice(0, 90)}`);
  }

  // ── READ THE APP'S OWN LOG ───────────────────────────────────────────────
  const log = await dumpAudit(page);
  console.log(`[turn-truth] ${log.length} audit entries read from Dexie`);

  const has = (re) => log.filter((e) => re.test(`${e.summary ?? ''} ${e.source ?? ''}`));
  const checks = [];
  // 🔒 A CHECK THAT PASSES ON AN EMPTY SET IS WORSE THAN NO CHECK. The first
  // prod run of this script reported 5/5 green with TWO of the five having
  // examined zero samples — no spoken line had a FEN, no turn-lane read had
  // happened — which is the precise false green this whole session has been
  // about. `samples` is mandatory: nothing was exercised, nothing is proven.
  const add = (name, ok, detail, samples) => {
    const exercised = samples === undefined || samples > 0;
    const state = !exercised ? 'NOT EXERCISED' : (ok ? 'ok' : 'FAILED');
    checks.push({ name, ok: ok && exercised, exercised, samples, detail });
    console.log(`  ${!exercised ? '·' : (ok ? '✓' : '✗')} ${name} — ${detail}${!exercised ? '  ← NOT EXERCISED, nothing proven' : ''}`);
    void state;
  };

  add('the app logged anything at all (guards the guard)', log.length > 0, `${log.length} entries`, log.length);

  // 1. STRENGTH
  // EVIDENCE DIFFERS BY SURFACE, and the first run of this audit failed on
  // that rather than on the code. `/coach/play` does not route through
  // `getAdaptiveMove` at all — it has its own fast path — so looking only for
  // `source=stockfish-timed` there finds nothing and reads like a regression.
  // Both forms are accepted; what is asserted is that EVERY engine-picked
  // opponent move says which Elo the engine was limited to.
  const searches = has(/source=stockfish-(timed|fallback|respawn)|coachTurn\.fastpath/);
  const limited = searches.filter((e) => /UCI_LimitStrength/.test(e.summary ?? ''));
  add('every opponent move says the Elo the engine was limited to',
    searches.length > 0 && limited.length === searches.length,
    `${limited.length}/${searches.length} · e.g. ${searches[0]?.summary?.slice(0, 130) ?? 'none seen'}`,
    searches.length);

  // 2. PIECES — checked against the board, not against the gate's own wording.
  const spoken = log.filter((e) => e.kind === 'coach-narration-spoken' && e.fen
    && /trackA|voicePackage|hintRegister/.test(e.source ?? ''));
  const lies = [];
  for (const e of spoken) {
    const said = (e.summary ?? '').replace(/^[^"]*"/, '').replace(/"$/, '');
    const absent = absentPiecesNamed(said, e.fen);
    if (absent.length) lies.push({ fen: e.fen, absent, said: said.slice(0, 160) });
  }
  add('no spoken line names a piece the board does not have',
    lies.length === 0,
    `${spoken.length} spoken lines checked, ${lies.length} naming an absent piece`,
    spoken.length);

  // 2b. THE GATE ITSELF, LIVE. The board-anchored check above needs a spoken
  // line that carries a FEN, and those come only from Learn's IN-GAME lanes
  // (trackA / voicePackage / hintRegister) — the flow David was in. This
  // harness cannot reach the in-game playout yet, so that check reports NOT
  // EXERCISED rather than green. What CAN be proven from any narrating
  // surface is that the piece gate is running in the shipped build at all:
  // its summary now names both classes, and the old build could not emit that
  // wording. Weaker evidence, honestly labelled.
  const gateTrips = has(/borrowedTeachingGate/);
  const newFormat = gateTrips.filter((e) => /naming pieces it does not have/.test(e.summary ?? ''));
  const piecesDropped = gateTrips
    .map((e) => Number(/(\d+) naming pieces/.exec(e.summary ?? '')?.[1] ?? 0))
    .reduce((a, b) => a + b, 0);
  add('the piece gate is running in the shipped build',
    gateTrips.length > 0 && newFormat.length === gateTrips.length,
    `${newFormat.length}/${gateTrips.length} trips report both classes · ${piecesDropped} piece-false sentence(s) refused`,
    gateTrips.length);

  // 3. ONE DEPTH
  // SCOPED TO THE TURN LANES. The contradiction was between the hint read and
  // the grading read on ONE board; other lanes (Play's prefetch, the eval bar)
  // legitimately read at their own depths, and flagging those made the check
  // fail on a surface it was not about.
  const depths = {};
  for (const e of log) {
    if (!/CoachTeachPage|discussion|analyzeWithBudget/.test(e.source ?? '')) continue;
    const m = /depth=(\d+)/.exec(e.summary ?? '');
    if (m) depths[m[1]] = (depths[m[1]] ?? 0) + 1;
  }
  const turnDepths = Object.keys(depths);
  add('the turn lanes read at ONE depth',
    turnDepths.length <= 1,
    turnDepths.length ? `depths seen: ${JSON.stringify(depths)}` : 'no turn-lane reads captured',
    turnDepths.length);

  add('no page errors', consoleErrors.length === 0, `${consoleErrors.length}`, 1);

  const report = { base: BASE, plies: played, entries: log.length, checks, lies, depths, consoleErrors: consoleErrors.slice(0, 10) };
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(OUT, 'audit-log.json'), JSON.stringify(log, null, 2));
  await browser.close();

  const failed = checks.filter((c) => !c.ok);
  const unexercised = checks.filter((c) => !c.exercised);
  console.log(`\n[turn-truth] ${checks.length - failed.length}/${checks.length} proven · ${unexercised.length} not exercised · ${OUT}`);
  if (unexercised.length) console.log(`[turn-truth] NOT PROVEN: ${unexercised.map((c) => c.name).join('; ')}`);
  process.exit(failed.length ? 1 : 0);
};

/** The app's own rolling audit buffer, read live out of Dexie. */
async function dumpAudit(page) {
  return page.evaluate(async () => {
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    try {
      const db = await open();
      const row = await new Promise((res) => {
        const tx = db.transaction('meta', 'readonly').objectStore('meta').get('app-audit-log.v1');
        tx.onsuccess = () => res(tx.result); tx.onerror = () => res(null);
      });
      return row?.value ? JSON.parse(row.value) : [];
    } catch { return []; }
  }).catch(() => []);
}

/** Wait for a NEW coach move-committed checkpoint after `sinceTs`. The
 *  blocking blunder card pauses the coach until answered, so it is answered
 *  here the way a student would — own it and play on. */
async function waitCoachReply(page, sinceTs, timeoutMs = 45_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await page.locator('[data-testid="blunder-interception"]').isVisible().catch(() => false)) {
      await page.locator('[data-testid="blunder-continue"]').click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(400);
    }
    const hits = (await dumpAudit(page)).filter((e) =>
      e.kind === 'coach-turn-checkpoint'
      && typeof e.summary === 'string' && e.summary.startsWith('move-committed san=')
      && (e.timestamp ?? 0) > sinceTs);
    if (hits.length) {
      const latest = hits.reduce((a, b) => ((a.timestamp ?? 0) > (b.timestamp ?? 0) ? a : b));
      return { san: /san=(\S+)/.exec(latest.summary)?.[1] ?? null, fen: latest.fen ?? null, ts: latest.timestamp ?? Date.now() };
    }
    await page.waitForTimeout(500);
  }
  return null;
}

/** Consent + calibration + page-help all intercept pointer events until gone. */
async function clearFirstRunOverlays(page) {
  for (const [modal, button] of [
    ['ai-consent-modal', 'ai-consent-allow'],
    ['strength-calibration-bubble', 'skill-band-intermediate'],
  ]) {
    if (await page.locator(`[data-testid="${modal}"]`).isVisible().catch(() => false)) {
      await page.locator(`[data-testid="${button}"]`).first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1200);
    }
  }
  await page.locator('[data-testid="page-help-close"], [data-testid="page-help-modal"] button')
    .first().click({ timeout: 2500 }).catch(() => {});
}

main().catch(async (e) => { console.error('[turn-truth] FAILED', e); process.exit(1); });
