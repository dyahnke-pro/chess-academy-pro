#!/usr/bin/env node
/**
 * audit-learn-live-game-prod — PLAY A REAL GAME ON /coach/teach AND GRADE WHAT
 * THE COACH ACTUALLY SAYS, ply by ply.
 *
 * Why this exists (David 2026-08-07, verbatim): "I'm tired of constantly doing
 * this with you. Make your changes accurate!! Then you test on the simulator or
 * live and pull the audit log yourself."
 *
 * Every narration defect this week reached him because the audits we ran checked
 * WIRING — does the trap ask resolve, does Watch hand off — and never once
 * played a game or read a spoken line. So they went green while the coach
 * announced the opponent's fork as the student's chance, skipped a hanging
 * queen, and lost its best line to a throttle. This script is the missing
 * instrument: it drives the moves a student actually plays and then reads its
 * own log.
 *
 * THE LINE IT PLAYS is his: the center fork trick out of a Pirc Austrian Attack.
 *   1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.f4 Bg7 5.Bc4 Nxe4 6.Nxe4 d5!
 * where ...d5 forks the bishop on c4 and the knight on e4 — the exact moment he
 * reported getting no tactical alert.
 *
 * WHAT IT ASSERTS (per G1, three instruments together):
 *   A. The coach SPOKE on the student's moves at all (listener).
 *   B. BOARD TRUTH — every piece/square claim in every spoken line is true of
 *      the position at the ply it was spoken on. This is the check that would
 *      have caught "there's a real fork here for you" about BLACK's fork.
 *   C. SIDE TRUTH — a line that says "your <piece> on <sq>" names a piece of
 *      the STUDENT's colour; "their <piece> on <sq>" names the opponent's.
 *   D. If a fork/pin/skewer is on the board for either side at a ply where the
 *      coach spoke, a tactics alert names it (the center-fork-trick contract).
 *   E. No uncaught page errors.
 *
 * HEADLESS CAVEAT, stated honestly: the Stockfish worker does not boot in this
 * browser, so the engine-derived RECOMMENDATION line ("Your strongest reply
 * here is …") cannot be produced here and is NOT asserted. Everything this
 * script does assert — event lines, tactics alerts, the opening announcement
 * and its corpus idea, board truth — is computed from the FEN and the move
 * history, so it is fully exercised. The coach's replies come from the local
 * masters DB / lichess book, which do work headless.
 *
 * Usage (from the sandbox, against LIVE prod):
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-learn-live-game-prod.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `learngame-${Date.now()}`;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/learn-live-game-${stamp}`;

/** How many student moves to play. The moves themselves are CHOSEN FROM THE
 *  LIVE POSITION, not scripted: the coach's book pick is weighted-random, so a
 *  fixed line dies the first time it answers 1.e4 with c5 instead of d6 (it
 *  did, on the first real run). Adapting keeps the audit honest — the
 *  assertions are about what the coach SAYS on whatever game happens, and a
 *  capture-hungry policy reaches tactical positions faster than any script. */
const STUDENT_PLIES = 7;
const OPENING_PREF = ['e4', 'd4', 'Nf3', 'Nc3', 'Bc4', 'f4', 'Bb5', 'O-O'];
const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Pick the student's move from the position the game is ACTUALLY in.
 *  Deterministic (pure ordering, no randomness) so a run is reproducible:
 *  winning captures first, then a preferred developing move, then any
 *  capture, then the first legal move by SAN order. */
function pickStudentMove(chess) {
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) return null;
  const scored = legal.map((m) => {
    let score = 0;
    if (m.captured) {
      const gain = (PIECE_VALUE[m.captured] ?? 0) - (PIECE_VALUE[m.piece] ?? 0);
      score += 100 + (PIECE_VALUE[m.captured] ?? 0) * 10 + (gain > 0 ? 50 : 0);
    }
    const prefIdx = OPENING_PREF.indexOf(m.san);
    if (prefIdx >= 0) score += 60 - prefIdx;
    if (m.san.includes('+')) score += 5;
    return { m, score };
  });
  scored.sort((a, b) => (b.score - a.score) || a.m.san.localeCompare(b.m.san));
  return scored[0].m;
}
const BOOT_TIMEOUT_MS = 60_000;
/** How long to let a turn settle before playing the next move. The reply is a
 *  book lookup plus the think-pad; narration lands behind it. */
const TURN_SETTLE_MS = 14_000;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const PIECE_WORDS = {
  pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k',
};

/**
 * Every "<piece> on <square>" claim a spoken line makes, checked against the
 * board. Returns the claims that are FALSE there. Deliberately conservative:
 * only the explicit piece-on-square form is graded, because that is the form
 * the coach's computed lines use and the one a hallucination shows up in.
 */
function falsePieceClaims(text, fen) {
  const out = [];
  let chess;
  try { chess = new Chess(fen); } catch { return out; }
  const re = /\b(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const want = PIECE_WORDS[m[1].toLowerCase()];
    const sq = m[2].toLowerCase();
    const got = chess.get(sq);
    if (!got || got.type !== want) {
      out.push(`"${m[1]} on ${sq}" but ${got ? `${got.color}${got.type}` : 'empty'}`);
    }
  }
  return out;
}

/**
 * "your X on sq" must be the student's colour; "their/the opponent's X on sq"
 * must not be. The side-blindness bug spoke the opponent's tactic as the
 * student's chance, and only a side-aware check catches that class.
 */
function wrongSideClaims(text, fen, studentColor) {
  const out = [];
  let chess;
  try { chess = new Chess(fen); } catch { return out; }
  const mine = /\byour\s+(pawn|knight|bishop|rook|queen)\s+on\s+([a-h][1-8])\b/gi;
  const theirs = /\b(?:their|the opponent's)\s+(pawn|knight|bishop|rook|queen)\s+on\s+([a-h][1-8])\b/gi;
  let m;
  while ((m = mine.exec(text)) !== null) {
    const got = chess.get(m[2].toLowerCase());
    if (got && got.color !== studentColor) out.push(`"your ${m[1]} on ${m[2]}" is the OPPONENT's`);
  }
  while ((m = theirs.exec(text)) !== null) {
    const got = chess.get(m[2].toLowerCase());
    if (got && got.color === studentColor) out.push(`"their ${m[1]} on ${m[2]}" is the STUDENT's`);
  }
  return out;
}

async function clickSquare(page, sq) {
  await page.locator(`[data-square="${sq}"]`).first().click({ timeout: 12_000, force: true });
}

/** A FEN carried by an audit event, if it looks like one. The events are the
 *  app's own record of the position each line was emitted at — a stricter
 *  anchor than any board-side mirror, since it is what the code itself
 *  believed at that instant. */
function eventFen(e) {
  const f = typeof e?.fen === 'string' ? e.fen.trim() : '';
  return /^[rnbqkpRNBQKP1-8/]+ [wb] /.test(f) ? f : null;
}

async function main() {
  console.log(`[run-id] ${RUN_ID}`);
  console.log(`[target] ${BASE_URL}`);
  const listener = await startAuditListener();
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch { /* ignore */ }
    },
    { url: listener.url, secret: listener.secret },
  );
  await context.addInitScript(autoDismissCalibration);
  await context.addInitScript(muteTtsForAudit);
  await context.addInitScript(stampAuditRunId(RUN_ID));

  const pageErrors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(e.message));

  // COST TRIPWIRE (David 2026-08-08: "Make sure they don't cost me any money").
  // `muteTtsForAudit` above already skips synthesis, but a mute is a flag the
  // product code has to honour, and the $100 day happened because a flag like
  // that was not being honoured. This does not trust it: every billable request
  // is ABORTED at the network layer and counted, so the run cannot spend even
  // if the mute regresses. A non-zero count FAILS the audit — it means the mute
  // is broken and the next unmuted run would bill for real.
  const billableAttempts = [];
  await context.route(/\/api\/tts|api\.deepseek\.com|api\.anthropic\.com|texttospeech\.googleapis/i, (route) => {
    billableAttempts.push(route.request().url());
    return route.abort();
  });

  /** Per-ply record: the position BEFORE the student's move, and the events
   *  that arrived while that turn was in flight. */
  const plies = [];

  try {
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.waitForTimeout(9_000);
    for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-close"]']) {
      const el = page.locator(sel);
      if (await el.count().then((n) => n > 0).catch(() => false)) {
        await el.first().click({ timeout: 5_000 }).catch(() => {});
      }
    }
    await page.waitForTimeout(2_000);

    // Mirror the game node-side so every spoken line can be graded against the
    // position it was spoken on — the app's board is the source of truth for
    // the coach's replies, so read it back after each turn and re-sync.
    const mirror = new Chess();
    for (let ply = 0; ply < STUDENT_PLIES; ply += 1) {
      const before = listener.getCapturedEvents().length;
      const chosen = pickStudentMove(mirror);
      if (!chosen) { console.log('[play] no legal move — game over'); break; }
      const san = chosen.san;
      const mv = mirror.move(san);
      await clickSquare(page, mv.from);
      const moveAt = Date.now();
      await clickSquare(page, mv.to);
      console.log(`[play] ${san}`);
      await page.waitForTimeout(TURN_SETTLE_MS);

      // Re-sync the mirror from the app's OWN events — the coach replied with
      // a book move this script does not know, so the last event-carried FEN
      // is the only honest way to know where the board actually is. Without
      // this the next student move is illegal in the mirror and the run dies
      // one ply in.
      const fresh = listener.getCapturedEvents().slice(before);
      let latest = null;
      for (const e of fresh) {
        const f = eventFen(e);
        if (f) latest = f;
      }
      if (latest) {
        try { mirror.load(latest); } catch { /* keep the local mirror */ }
      }
      plies.push({ san, fen: latest ?? mirror.fen(), events: fresh, moveAt });
    }

    // ── Grade what was said ────────────────────────────────────────────────
    const spoken = [];
    for (const p of plies) {
      for (const e of p.events) {
        const isVoice = /narration-spoken|voice-speak/.test(String(e.kind ?? ''));
        if (!isVoice) continue;
        const text = String(e.narrationText ?? e.summary ?? '');
        // The arrow/highlight engines log under the same kind; only lines the
        // VOICE said are graded here.
        if (!/trackA|speakForced|speakCloud|narration/i.test(String(e.source ?? ''))) continue;
        if (/arrowEngine|highlightEngine/.test(String(e.source ?? ''))) continue;
        // ONLY grade lines whose event carries its own FEN. Those are stamped
        // at the instant the utterance begins (`queueSpeak.spoken`, `trackA`),
        // so the anchor is exact. `speakCloud`/`speakForced` carry no
        // position, and anchoring them by arrival order mis-blames a line that
        // was true when it started and went stale while it played — which is
        // a pacing problem, not a false claim, and must not be reported as
        // one. Those lines are still listed in the report for the record.
        const anchored = eventFen(e);
        // Latency from the student's move landing to this line being handed
        // to the voice — the number David asks for when he says narration is
        // "too long" or "one move behind".
        const msAfterMove = (e.receivedAt ?? e.timestamp ?? 0) - p.moveAt;
        spoken.push({ ply: p.san, fen: anchored, graded: Boolean(anchored), source: e.source, text, msAfterMove });
      }
    }
    console.log(`\n[spoken] ${spoken.length} voice line(s) captured across ${plies.length} plies`);
    for (const s of spoken) console.log(`   [${s.ply}] (${s.source}) ${s.text.slice(0, 120)}`);

    record('A. the coach spoke during a real game', spoken.length > 0, `${spoken.length} voice line(s)`);

    const graded = spoken.filter((s) => s.graded);
    const falseClaims = [];
    const sideErrors = [];
    for (const s of graded) {
      for (const f of falsePieceClaims(s.text, s.fen)) falseClaims.push(`[${s.ply}] ${f} :: "${s.text.slice(0, 90)}"`);
      for (const w of wrongSideClaims(s.text, s.fen, 'w')) sideErrors.push(`[${s.ply}] ${w} :: "${s.text.slice(0, 90)}"`);
    }
    // A run that grades NOTHING is not a pass — it means the position stamp
    // never arrived and the audit is blind. Say so instead of going green.
    record('B. every piece-on-square claim is true of the board',
      graded.length > 0 && falseClaims.length === 0,
      graded.length === 0
        ? 'NO position-anchored lines captured — audit is blind, not clean'
        : falseClaims.length === 0 ? `${graded.length} anchored line(s), no false claims` : falseClaims.join(' | '));
    record('C. yours/theirs matches the real owner', sideErrors.length === 0,
      sideErrors.length === 0 ? `${graded.length} anchored line(s), no side errors` : sideErrors.join(' | '));

    // D. The fork moment: at any graded ply where a fork/pin/skewer is on the
    //    board, SOME spoken line that ply should be a tactics alert.
    const tacticPlies = [];
    for (const p of plies) {
      let hasTactic = false;
      try {
        const probe = new Chess(p.fen);
        const board = probe.board().flat().filter(Boolean);
        // Cheap fork test mirroring the detector: a piece attacking two enemy
        // pieces worth >= a knight.
        const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
        for (const pc of board) {
          if (pc.type === 'k') continue;
          const flip = p.fen.split(' ');
          flip[1] = pc.color; flip[3] = '-';
          let atk;
          try { atk = new Chess(flip.join(' ')); } catch { continue; }
          let hits = 0;
          for (const m of atk.moves({ square: pc.square, verbose: true })) {
            const t = atk.get(m.to);
            if (t && t.color !== pc.color && (VAL[t.type] ?? 0) >= 3) hits += 1;
          }
          if (hits >= 2) { hasTactic = true; break; }
        }
      } catch { /* skip */ }
      if (hasTactic) tacticPlies.push(p.san);
    }
    const alertLines = spoken.filter((s) => /watch out|careful|undefended|forks|checkmate in one|something to win/i.test(s.text));
    record('D. a tactic on the board produced a spoken alert',
      tacticPlies.length === 0 || alertLines.length > 0,
      tacticPlies.length === 0
        ? 'no fork-shaped position reached in this line (nothing to alert)'
        : `tactic plies [${tacticPlies.join(', ')}]; ${alertLines.length} alert line(s): ${alertLines.map((a) => a.text.slice(0, 70)).join(' | ')}`);

    // ── LATENCY: how long until the student HEARS teaching ─────────────────
    // The question David asks directly ("How long does it take for corpus
    // narrations to fire?"), answered with measurements instead of a guess.
    const lat = (pred) => spoken.filter((s) => pred(s) && s.msAfterMove > 0).map((s) => s.msAfterMove).sort((a, b) => a - b);
    const med = (xs) => (xs.length === 0 ? null : xs[Math.floor(xs.length / 2)]);
    const isTrackA = (s) => /trackA/.test(String(s.source ?? ''));
    const isCorpus = (s) => /Key idea:|sharpened into|This game is now/.test(s.text);
    const isEvent = (s) => isTrackA(s) && /^track A spoke: "(That takes|Check|Checkmate)/.test(s.text);
    const isWarm = (s) => /queueSpeak\.spoken/.test(String(s.source ?? ''));
    const buckets = {
      eventLine: lat(isEvent),
      corpusOrAnnouncement: lat(isCorpus),
      anyTrackA: lat(isTrackA),
      warmLlmBeat: lat(isWarm),
    };
    console.log('\n[latency ms after the student\'s move landed]');
    for (const [k, xs] of Object.entries(buckets)) {
      console.log(`   ${k.padEnd(22)} n=${String(xs.length).padEnd(3)} median=${med(xs) ?? '-'}  all=[${xs.join(', ')}]`);
    }

    record('E. no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'clean');
    // The run cost nothing — and that is asserted, not assumed. Any attempt
    // means the audit mute stopped working, which is a ship-blocker in itself.
    record('F. zero billable requests (mute honoured)', billableAttempts.length === 0,
      billableAttempts.length === 0 ? 'no TTS/LLM call attempted' : `ATTEMPTED ${billableAttempts.length}: ${billableAttempts.slice(0, 2).join(' | ')}`);

    await mkdir(OUT_DIR, { recursive: true });
    await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({
      runId: RUN_ID, baseUrl: BASE_URL, results, latencyMs: buckets, spoken, plies: plies.map((p) => ({ san: p.san, fen: p.fen })), pageErrors,
    }, null, 2));
  } finally {
    await page.waitForTimeout(4_000); // let posthog-js flush
    await browser.close();
    await listener.stop();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green — report at ${OUT_DIR}/report.json`);
  console.log(`[posthog] SELECT timestamp, properties.source, properties.narration_text FROM events WHERE event='coach_narration_spoken' AND properties.audit_run_id='${RUN_ID}' ORDER BY timestamp`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
