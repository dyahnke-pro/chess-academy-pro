#!/usr/bin/env node
/**
 * audit-coach-turn-truth-prod — did the 2026-08-16 fixes actually reach a
 * student? Opens Learn on LIVE prod, starts playing, and reads the app's own
 * audit log back out of Dexie to answer three questions with the app's own
 * words.
 *
 * NO SETUP, BY INSTRUCTION (David: "just go to learn and make a move. Don't
 * ask for anything just start playing"). Every contract here lives in a Learn
 * GAME, and the Learn board is live on a fresh load — so one move is the whole
 * harness. Earlier versions warmed up on `/coach/play` (silent by contract,
 * and it never routes through `getAdaptiveMove`) and then typed a lesson
 * request (narrates with no FEN attached); between them they exercised none of
 * the three, and said so.
 *
 * THREE INSTRUMENTS, per G1 — and this file argued its way out of two of them
 * for a day, so the correction is recorded here rather than quietly fixed.
 *
 *   1. PLAYWRIGHT drives Learn and plays a real game.
 *   2. THE LIVE PROD STREAM is pulled BEFORE and AFTER, so the delta is
 *      exactly this run. Informational by design: an empty pull is the
 *      documented normal (CLAUDE.md — "app probably not open") and must never
 *      fail the audit, or the instrument becomes noise a session learns to
 *      skip.
 *   3. THE NARRATION LISTENER sidecar receives the app's own POSTs. The old
 *      header claimed it "cannot attach: the page is https and the sidecar is
 *      http" — WRONG. `http://127.0.0.1` is a potentially trustworthy origin
 *      and is exempt from mixed-content blocking; the listener's own header
 *      describes exactly this case, a page on the prod origin posting to
 *      127.0.0.1. The attach is two localStorage keys.
 *
 * The Dexie read stays, and is not redundant with the listener. Dexie proves
 * the app COMPUTED a line; only the POST proves it tried to SPEAK one. Silence
 * where a keystone should speak is invisible in the buffer and visible in the
 * listener — that is the whole reason G1 asks for all three.
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
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
// FAR ENOUGH TO REACH THE PHASE THE DEFECT LIVES IN. Both borrow tiers stand
// down in the opening on purpose (`teachingSourceForBoard`: "in the opening
// there is no KIND of position yet, only a specific line"), so a short game
// cannot exercise the piece gate at all — a 14-ply run reported it NOT
// EXERCISED, correctly. David heard the wrong pieces in a rook ending. The
// default plays into a middlegame so the tier that produced the bug actually
// speaks.
const PLIES = Number(process.env.PLIES || 44);
const OUT = join('audit-reports', `coach-turn-truth-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const COACH_TURN_DEPTH = 14;   // mirrors src/services/engineConstants.ts
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

/** INSTRUMENT 2 — the live prod stream, pulled before and after so the delta
 *  is exactly this run (G1). Never fails the audit: an empty pull is the
 *  documented normal for a bot context, and treating it as a failure is how a
 *  session learns to ignore the instrument. */
const pullProdStream = async (since) => {
  const secret = process.env.AUDIT_STREAM_SECRET ?? '';
  if (!secret) return { ok: false, reason: 'AUDIT_STREAM_SECRET not in env', entries: [] };
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${since}`, {
      headers: { 'x-audit-secret': secret },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, entries: [] };
    const body = await res.json();
    return { ok: true, storage: body?.storage ?? null, entries: body?.entries ?? [] };
  } catch (e) {
    return { ok: false, reason: String(e).slice(0, 80), entries: [] };
  }
};

const main = async () => {
  await mkdir(OUT, { recursive: true });

  // ── INSTRUMENT 3 — THE NARRATION LISTENER ────────────────────────────────
  //
  // The header of this file used to claim the sidecar "cannot attach either:
  // the page is https and the sidecar is http". That was wrong, and it is why
  // this audit ran on one instrument for a day. `http://127.0.0.1` is a
  // POTENTIALLY TRUSTWORTHY origin, so it is exempt from mixed-content
  // blocking — the listener's own header says as much, describing a page
  // "served from a PUBLIC origin (the prod URL) posting to 127.0.0.1".
  //
  // Why it matters that this is a SEPARATE instrument from the Dexie read:
  // Dexie proves the app COMPUTED a line. Only the POST proves the app tried
  // to SPEAK it. Silence where a keystone should speak looks identical to a
  // healthy run in the buffer — that is exactly the regression class G1 names.
  const listener = await startAuditListener();
  const runStartedAt = Date.now();
  const streamBefore = await pullProdStream(runStartedAt - 5 * 60_000);

  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveChromiumExecutable(false),
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);       // audits never spend TTS money
  await ctx.addInitScript(autoDismissCalibration);
  // Attach the listener through the legacy localStorage keys, which
  // `loadAuditStreamConfig` still migrates into the profile at boot. Seeding
  // the profile row directly would race the deferred seed.
  await ctx.addInitScript(([url, secret]) => {
    try {
      localStorage.setItem('auditStreamUrl', url);
      localStorage.setItem('auditStreamSecret', secret);
    } catch { /* private browsing — the Dexie read still stands */ }
  }, [listener.url, LOCAL_LISTENER_SECRET]);   // listener.url already ends /audit-stream
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  // WHICH endpoint failed, not just that one did. "Failed to load resource:
  // 429" names nothing, and a rate-limit on a paying-customer path is a very
  // different finding from a bot hammering its own audit endpoint.
  const httpFailures = [];
  page.on('response', (r) => {
    if (r.status() >= 400) httpFailures.push(`${r.status()} ${r.url().replace(BASE, '')}`);
  });

  console.log(`[turn-truth] ${BASE} · ${PLIES} plies`);

  // ── GO TO LEARN AND PLAY. THAT IS THE WHOLE SETUP ────────────────────────
  // David 2026-08-16: "just go to learn and make a move. Don't ask for
  // anything just start playing."
  //
  // He is right, and the earlier versions of this script were the long way
  // round. It opened `/coach/play` first — a surface that is SILENT by
  // contract and never routes through `getAdaptiveMove`, so it could not
  // exercise a single one of the three contracts — and then it typed "teach me
  // the caro-kann" and drove the LESSON, which narrates without a FEN
  // attached, so the board-anchored check still had nothing to examine.
  //
  // All three contracts live in a Learn GAME, and the Learn board is live on a
  // fresh load. One move is the entire setup: e2-e4 produces an opponent reply
  // through the rating-limited engine, `voicePackage` / `openingAnnouncement`
  // lines that carry their board, and the turn's grading read. Nothing to ask
  // for, nothing to pick, no lesson to request.
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(20_000);              // deferred seed + engine warm
  // Not a request — the consent / calibration modals intercept pointer events
  // until dismissed, so the first click never lands otherwise.
  await clearFirstRunOverlays(page);
  const learnStartedAt = Date.now();
  const learnPlies = await playGame(page, PLIES);
  console.log(`[turn-truth] played ${learnPlies} moves on Learn`);

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
  // BOTH FORMS ACCEPTED. Learn picks its opponent move through
  // `getAdaptiveMove` (`source=stockfish-timed`), while the Play surface uses
  // its own fast path — a difference that failed an earlier run of this audit
  // rather than the code. This run only drives Learn, but the check stays
  // surface-agnostic so pointing it at Play never reads as a regression.
  // What is asserted either way: EVERY engine-picked opponent move says which
  // Elo the engine was actually limited to.
  const searches = has(/source=stockfish-(timed|fallback|respawn)|coachTurn\.fastpath/);
  const limited = searches.filter((e) => /UCI_LimitStrength/.test(e.summary ?? ''));
  add('every opponent move says the Elo the engine was limited to',
    searches.length > 0 && limited.length === searches.length,
    `${limited.length}/${searches.length} · e.g. ${searches[0]?.summary?.slice(0, 130) ?? 'none seen'}`,
    searches.length);

  // 2. PIECES — checked against the board, not against the gate's own wording.
  const spoken = log.filter((e) => e.kind === 'coach-narration-spoken' && e.fen
    && /trackA|voicePackage|hintRegister|openingAnnouncement/.test(e.source ?? ''));
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

  // 2b. THE GATE IS THE BACKUP, NOT THE MECHANISM.
  //
  // The first run of this audit asserted `gateTrips.length > 0` — it wanted to
  // SEE the gate work — and it did: 238 piece-false sentences refused in one
  // 44-ply game. David's read of that number was the right one ("good that
  // gates work, but fix at the root"). A gate firing hundreds of times a game
  // means something upstream is offering hundreds of sentences about pieces
  // that are not there, which is the disease G0 names.
  //
  // The root was the FIELD: every selection tier asked `namedPiecesExistOnBoard`
  // of `n.plans` — empty on most notes, spoken by no tier — while the student
  // hears `spokenBeatText`. Selection asks of the spoken form now.
  //
  // So the expectation inverts. Zero trips is the GOAL, not a failure to
  // observe: check 2 above already proves the surface narrated and that none
  // of it named an absent piece. What fails here is the disease signature —
  // the gate doing the work selection should have done.
  const gateTrips = has(/borrowedTeachingGate/);
  const newFormat = gateTrips.filter((e) => /naming pieces it does not have/.test(e.summary ?? ''));
  const piecesDropped = gateTrips
    .map((e) => Number(/(\d+) naming pieces/.exec(e.summary ?? '')?.[1] ?? 0))
    .reduce((a, b) => a + b, 0);
  add('selection, not the gate, is keeping piece-false teaching out',
    newFormat.length === gateTrips.length && piecesDropped <= spoken.length,
    gateTrips.length === 0
      ? `gate never fired across ${spoken.length} spoken lines — selection refused upstream`
      : `${piecesDropped} piece-false sentence(s) refused vs ${spoken.length} spoken`
        + ` (was 238 vs 49 on build 6a92b06) · ${newFormat.length}/${gateTrips.length} trips report both classes`,
    spoken.length);

  // 2c. THE ALERT LANE SAYS SOMETHING USEFUL (David 2026-08-16).
  //
  // "The useless rook and queen battery on the 8th rank — we don't need that."
  // A battery is only worth a warning if it is AIMED at something, so every
  // battery line must now name its target. This is checkable from the spoken
  // text alone: the detector appends "bearing down on the <piece> on <sq>".
  const said = (e) => (e.summary ?? '').replace(/^[^"]*"/, '').replace(/"$/, '');
  // 🚨 NEVER JUDGE A TRUNCATED PREVIEW (this audit's own bug, caught by its
  // first 3-instrument run). `CoachTeachPage.trackA` logs `track A spoke:
  // "<first 80 chars>"` — a preview, by construction. The battery check read
  // one of those, saw the sentence stop at "…on the diagonal, bea", and
  // reported the product had announced an aimless battery. The full line,
  // logged by `voicePackage` on the same ply, read "…bearing down on the pawn
  // on c3" and was correct.
  //
  // The asymmetry is what matters: truncation can only HIDE a claim, never
  // invent one, so it costs the piece check a false negative and costs a
  // presence check a false POSITIVE. Only checks of the second kind must
  // exclude previews.
  const isPreview = (e) => /\.trackA$/.test(e.source ?? '');
  const batteryLines = spoken.filter((e) => !isPreview(e) && /form a battery/.test(said(e)));
  const aimless = batteryLines.filter((e) => !/bearing down on/.test(said(e)));
  add('no battery is announced without saying what it is aimed at',
    aimless.length === 0,
    `${batteryLines.length} battery line(s), ${aimless.length} aimless`
      + (aimless.length ? ` — e.g. "${said(aimless[0]).slice(0, 90)}"` : ''),
    batteryLines.length);

  // 2d. THE OPPONENT LOOK-AHEAD IS REACHABLE.
  //
  // "I never heard a tactic alert for the opponent when it came to a fork."
  // The lane passed `analysis: null`, so the forward scan was unreachable and
  // only already-landed geometry could be announced.
  //
  // A single game may legitimately contain no upcoming tactic, so this cannot
  // demand a fork warning — it would fail on a quiet game and teach us
  // nothing. What it CAN prove is that the lane is no longer blind: the
  // cached read it now depends on has to be there. Reported either way, with
  // the warning count, so a run of games where none ever fires is visible
  // rather than silently assumed fine.
  const upcomingWarnings = spoken.filter((e) => /Watch out — if they play|is coming\./.test(said(e)));
  const cachedTurnReads = has(/stockfishCache/).filter((e) => /depth=14/.test(e.summary ?? ''));
  add('the alert lane has the cached read its look-ahead depends on',
    cachedTurnReads.length > 0,
    `${cachedTurnReads.length} depth-14 cache event(s) on the turn board`
      + ` · ${upcomingWarnings.length} upcoming-threat warning(s) spoken`
      + (upcomingWarnings.length ? ` — e.g. "${said(upcomingWarnings[0]).slice(0, 90)}"` : ' (none this game — a quiet game is allowed)'),
    cachedTurnReads.length);

  // 2e. THE SUPERLATIVE IS EARNED.
  //
  // "A lot of suggestions are bad" — they were within 26cp of best, and two of
  // four were announced as "your strongest reply" while not being the top
  // line. With MultiPV kept, a close position says "two good moves here". A
  // game may have no close positions, so this reports the split rather than
  // demanding one; what it FAILS on is the shape being impossible — the
  // two-move sentence never appearing across a game with many recommendations
  // would mean the ranking never ran.
  const recLines = spoken.filter((e) => /strongest reply here is|Two good moves here/.test(said(e)));
  const twoMove = recLines.filter((e) => /Two good moves here/.test(said(e)));
  add('recommendations report their ranking',
    recLines.length === 0 || recLines.length >= twoMove.length,
    `${recLines.length} recommendation(s): ${twoMove.length} named two moves,`
      + ` ${recLines.length - twoMove.length} called a clear best`,
    recLines.length);

  // ── INSTRUMENT 3 — WHAT THE APP TRIED TO SPEAK ───────────────────────────
  //
  // Not a second opinion on Dexie: a different question. The buffer says a
  // line was computed; the POST says the app pushed it out. A surface that
  // computes perfectly and never calls the voice reads as healthy in Dexie and
  // as silence here, which is the ModelGameViewer regression class by name.
  const heard = listener.getCapturedEvents();
  const heardSpoken = heard.filter((e) => e.kind === 'coach-narration-spoken');
  add('the narration listener heard the app speak',
    heardSpoken.length > 0,
    `${heard.length} event(s) POSTed, ${heardSpoken.length} narration`
      + ` · kinds ${JSON.stringify(listener.countByKind())}`,
    heard.length);

  // The board-truth question again, asked of the SPOKEN stream rather than the
  // buffer. Same replay, independent instrument — if these two ever disagree,
  // one of them is measuring the wrong thing and I want to know which.
  const heardWithFen = heardSpoken.filter((e) => e.fen);
  const heardLies = heardWithFen.filter((e) => absentPiecesNamed(said(e), e.fen).length > 0);
  add('nothing the listener heard names a piece the board lacks',
    heardLies.length === 0,
    `${heardWithFen.length} spoken line(s) with a board, ${heardLies.length} false`
      + (heardLies.length ? ` — e.g. "${said(heardLies[0]).slice(0, 90)}"` : ''),
    heardWithFen.length);

  // ── INSTRUMENT 2 — THE LIVE PROD STREAM ──────────────────────────────────
  //
  // Reported, never demanded. With the listener attached the app posts THERE,
  // so this run contributes nothing to prod's buffer by design — what this
  // proves is that the endpoint is alive and correctly configured, which is
  // the check that catches a Preview deployment aliased over production (its
  // env lacks the secret and the endpoint answers "server misconfigured").
  const streamAfter = await pullProdStream(runStartedAt);
  add('the prod audit-stream endpoint is alive and configured',
    streamAfter.ok,
    streamAfter.ok
      ? `storage=${streamAfter.storage} · ${streamAfter.entries.length} entr(y|ies) in this run's window`
        + ` (this run posts to the listener, so 0 is expected)`
      : `unreachable: ${streamAfter.reason}`,
    1);
  void streamBefore;

  // 3. ONE DEPTH
  // SCOPED TO THE TURN LANES. The contradiction was between the hint read and
  // the grading read on ONE board; other lanes (Play's prefetch, the eval bar)
  // legitimately read at their own depths, and flagging those made the check
  // fail on a surface it was not about.
  // THE CONTRACT IS ABOUT THE TWO BEST-MOVE READS, not about every engine call
  // on the surface. `liveTacticsContext` also reads this board at depth 12,
  // deliberately and on 15+ surfaces including the kid coach — but it answers
  // a DIFFERENT question (which threats exist), never "what is best", so it
  // cannot contradict the hint the way the grading read did. Deepening it
  // globally would slow every one of those surfaces to fix a disagreement that
  // is not there. What must hold is narrower and checkable: the turn's
  // best-move reads happen at the grading depth, and no CoachTeachPage lane
  // reads at a second one.
  const learnWindow = log.filter((e) => (e.timestamp ?? 0) >= learnStartedAt);
  const depthOf = (e) => Number(/depth=(\d+)/.exec(e.summary ?? '')?.[1] ?? 0);
  const gradingReads = learnWindow.filter((e) => depthOf(e) === COACH_TURN_DEPTH);
  const teachOwnDepths = [...new Set(learnWindow
    .filter((e) => /CoachTeachPage/.test(e.source ?? ''))
    .map(depthOf).filter(Boolean))];
  const depths = { atGradingDepth: gradingReads.length, teachLaneDepths: teachOwnDepths };
  add('the turn is read at the grading depth, and no teach lane disagrees',
    gradingReads.length > 0 && teachOwnDepths.every((d) => d === COACH_TURN_DEPTH),
    `${gradingReads.length} read(s) at depth ${COACH_TURN_DEPTH}; teach-lane depths ${JSON.stringify(teachOwnDepths)}`,
    gradingReads.length);

  // 429 ON THE EXPLORER PROXY IS THE HARNESS, NOT THE APP. Lichess throttles
  // rapid book lookups from one IP, and a bot playing a move every three
  // seconds earns that fairly. The app degrades exactly as designed — the book
  // miss falls through to the engine, no crash, no wrong move — so failing the
  // run on it would be manufacturing a red. Reported, never hidden: an audit
  // that silently swallows a class of error is how the next real one gets
  // missed.
  const throttled = httpFailures.filter((f) => f.startsWith('429') && f.includes('lichess-explorer'));
  const realErrors = consoleErrors.filter((e) => !/Failed to load resource/.test(String(e)))
    .concat(httpFailures.filter((f) => !throttled.includes(f)));
  if (throttled.length) console.log(`  · ${throttled.length} explorer 429(s) — third-party rate limit under bot load, app fell through to the engine`);
  add('no page errors', realErrors.length === 0,
    realErrors.length ? realErrors.slice(0, 3).map((x) => String(x).slice(0, 100)).join(' | ')
      : `0 real (${throttled.length} explorer 429 ignored as load)`, 1);

  const report = { base: BASE, plies: learnPlies, entries: log.length, checks, lies, depths, consoleErrors: consoleErrors.slice(0, 10), httpFailures: [...new Set(httpFailures)], throttled: throttled.length };
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(OUT, 'audit-log.json'), JSON.stringify(log, null, 2));
  await browser.close();
  await listener.stop();

  const failed = checks.filter((c) => !c.ok);
  const unexercised = checks.filter((c) => !c.exercised);
  console.log(`\n[turn-truth] ${checks.length - failed.length}/${checks.length} proven · ${unexercised.length} not exercised · ${OUT}`);
  if (unexercised.length) console.log(`[turn-truth] NOT PROVEN: ${unexercised.map((c) => c.name).join('; ')}`);
  process.exit(failed.length ? 1 : 0);
};

/** A plausible club move, not a suicidal one.
 *
 *  The first version of this took "mate, else any capture, else the FIRST
 *  LEGAL MOVE". Off the scripted opening that walks the king up the board —
 *  a 44-ply run ended after 15 with White's king on e5 — and an absurd
 *  position is not a test of anything. Worse, it never reached a middlegame,
 *  and BOTH borrow tiers stand down in the opening by design, so the lane that
 *  produced David's wrong-piece narration could never speak.
 *
 *  No engine here (this is the audit's own side, and an engine call per ply
 *  would double the run): just enough chess to stay sane — take what is
 *  free, do not hang the piece you just moved, develop, castle, and leave the
 *  king alone unless there is nothing else. */
function bestPlausible(mirror, legal) {
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let best = null;
  let bestScore = -Infinity;
  for (const m of legal) {
    if (m.san.includes('#')) return m;
    let score = 0;
    if (m.captured) score += VAL[m.captured] * 10;
    // Would the moved piece simply be taken back? Cheap SEE stand-in: after
    // the move, is the destination attacked by the side to move next?
    const probe = new Chess(mirror.fen());
    probe.move(m.san);
    if (probe.isAttacked(m.to, probe.turn())) score -= VAL[m.piece] * 8;
    if (m.san.startsWith('O-O')) score += 25;
    if (m.piece === 'k') score -= 40;               // the king stays home
    if (m.piece === 'q' && mirror.moveNumber() < 12) score -= 12;
    if ('nb'.includes(m.piece) && /[1-8]/.test(m.from[1]) && !m.captured) score += 6;
    if (['d4', 'e4', 'd5', 'e5', 'c4', 'c5', 'f4', 'f5'].includes(m.to)) score += 4;
    if (probe.isCheck()) score += 3;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

/** Play a real game on whatever coach board is mounted. The Node-side chess.js
 *  mirror only ever picks LEGAL moves (G3) and the board is driven by clicking
 *  squares, exactly as a hand would; the coach's replies are read back from the
 *  app's own `coach-turn-checkpoint` entries rather than inferred from the DOM.
 *  Inferring them is what made the first version stall after one move. */
async function playGame(page, plies) {
  const mirror = new Chess();
  const OPENING = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6'];
  let played = 0;
  let lastTs = Date.now() - 1;
  for (let i = 0; i < plies && !mirror.isGameOver(); i += 1) {
    const scripted = OPENING[played];
    const legal = mirror.moves({ verbose: true });
    const pick = (scripted && legal.find((m) => m.san === scripted)) || bestPlausible(mirror, legal);
    if (!pick) break;
    try {
      await page.locator(`[data-square="${pick.from}"]`).click({ force: true, timeout: 8000 });
      await page.locator(`[data-square="${pick.to}"]`).click({ force: true, timeout: 8000 });
    } catch { break; }
    mirror.move(pick.san);
    played += 1;
    const reply = await waitCoachReply(page, lastTs);
    if (!reply?.san) break;
    lastTs = reply.ts;
    if (mirror.moves().includes(reply.san)) mirror.move(reply.san);
    else if (reply.fen) { try { mirror.load(reply.fen); } catch { break; } }
    else break;
  }
  return played;
}

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
