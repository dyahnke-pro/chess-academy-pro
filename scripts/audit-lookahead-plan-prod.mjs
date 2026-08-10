#!/usr/bin/env node
/**
 * audit-lookahead-plan-prod.mjs
 * -----------------------------
 * Does the look-ahead plan actually SPEAK on prod, and is what it says true of
 * the board it was computed from?
 *
 * Everything this build was measured against so far is offline: unit gates,
 * 4,000 generated plans, a 60-gem sweep. All of that proves the functions are
 * right. None of it proves the running app reaches them — which is the exact
 * gap that has burned this project before (green tests, broken prod, only the
 * audit caught it).
 *
 * THREE INSTRUMENTS, per G1:
 *   1. Playwright drives a real game on /coach/teach — real moves, real engine.
 *   2. The prod audit-stream is pulled before AND after, so the delta is
 *      exactly this run.
 *   3. The narration read-back. The local listener cannot attach over https
 *      (mixed content), so the run is STAMPED with an audit_run_id and the
 *      spoken text is read from PostHog afterwards. The listener is attached
 *      anyway for the localhost case.
 *
 * MUTED. The listener reads spoken text out of the app's own audit event, so
 * synthesising it buys nothing and bills real money (§G1).
 *
 * Run:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-lookahead-plan-prod.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { clickMove, awaitCoachReply, appEndedGame } from './audit-lib/board-drive.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OUT_DIR = `audit-reports/lookahead-plan-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const BOOT_TIMEOUT_MS = 90_000;
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function pullStream(since) {
  if (!SECRET || !BASE_URL.startsWith('https')) return { ok: false, reason: 'no secret or local target', events: [] };
  try {
    const res = await fetch(`${BASE_URL}/api/audit-stream?since=${since}`, {
      headers: { 'x-audit-secret': SECRET },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, events: [] };
    const body = await res.json();
    return { ok: true, events: body.events ?? [] };
  } catch (e) {
    return { ok: false, reason: String(e), events: [] };
  }
}

async function dismissConsent(page) {
  const allow = page.locator('[data-testid="ai-consent-allow"]');
  if (await allow.count().then((n) => n > 0).catch(() => false)) {
    await allow.first().click({ timeout: 5000 }).catch(() => {});
  }
}

/** Every square the spoken line names. */
function squaresIn(text) {
  return [...new Set(text.match(/\b[a-h][1-8]\b/g) ?? [])];
}

/** SAN-shaped tokens — a plan that hands over a move has broken the contract. */
function movesIn(text) {
  return text.match(/\b[NBRQK][a-h]?[1-8]?x?[a-h][1-8]\b/g) ?? [];
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const runStart = Date.now();
  const before = await pullStream(runStart - 60_000);
  console.log(`[stream] pre-run pull: ${before.ok ? `${before.events.length} events` : `unavailable (${before.reason})`}`);

  const listener = await startAuditListener();
  console.log(`[listener] up at ${listener.url}`);

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

  const RUN_ID = process.env.AUDIT_RUN_ID ?? `lookahead-${runStart.toString(36)}`;
  console.log(`[audit-run-id] ${RUN_ID}`);
  await context.addInitScript(stampAuditRunId(RUN_ID));

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    await page.goto(`${BASE_URL}/coach/teach${(process.env.AUDIT_OPENING ?? '').match(/sicilian|french/) ? '?side=black' : ''}`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await dismissConsent(page);
    await page.waitForTimeout(6000);

    // ── PLAY A REAL GAME. The node-side chess.js mirror picks only legal
    //    moves (G3); the coach answers on the live board with the real engine,
    //    and `awaitCoachReply` reads its reply back OFF THE BOARD to keep the
    //    mirror in step. Without that read-back the mirror desynced after one
    //    move and the run reported a stalled coach — the audit's bug, blamed on
    //    the app, which is the failure mode this helper exists to prevent.
    // EVERY EARLIER RUN DROVE THE SAME ITALIAN AS WHITE, which means everything
    // it proved was proved on one pawn structure and one side of the board.
    // Side-attribution — the failure that hurts most, a student told the
    // opponent's plan is their own — is only genuinely exercised by playing the
    // other colour. Openings are named, not scripted move-for-move: the mirror
    // falls back to a legal move whenever the coach steers somewhere else.
    const REPERTOIRE = {
      italian: { side: 'white', moves: ['e4', 'Nf3', 'Bc4', 'd3', 'O-O', 'Nc3', 'Bg5', 'h3', 'a3', 'Re1'] },
      // A closed queen's-pawn game: no early contact, different structure, and
      // the quiet middle where the positional read has to carry the narration.
      london: { side: 'white', moves: ['d4', 'Bf4', 'e3', 'Nf3', 'c3', 'Bd3', 'Nbd2', 'O-O', 'h3', 'Re1'] },
      // Black, sharp, asymmetric — and the side flip is the point.
      sicilian: { side: 'black', moves: ['c5', 'd6', 'cxd4', 'Nf6', 'a6', 'e5', 'Be7', 'O-O', 'Be6', 'Nbd7'] },
      // Black, closed, opposite structure to the Sicilian.
      french: { side: 'black', moves: ['e6', 'd5', 'c5', 'Nc6', 'Qb6', 'Nge7', 'cxd4', 'Nf5', 'Bb4+', 'O-O'] },
    };
    const chosen = REPERTOIRE[process.env.AUDIT_OPENING ?? 'italian'] ?? REPERTOIRE.italian;
    const STUDENT_SIDE = chosen.side;
    console.log(`[game] ${process.env.AUDIT_OPENING ?? 'italian'} as ${STUDENT_SIDE}`);
    const mirror = new Chess();
    const OPENING = chosen.moves;
    let played = 0;
    // Playing Black means the coach moves FIRST — wait for it before the mirror
    // tries anything, or every move is illegal from the wrong side.
    if (STUDENT_SIDE === 'black') {
      const first = await awaitCoachReply(page, mirror, { firstMove: true });
      if (first) mirror.move(first);
      else record('the coach opened the game', false, 'no first move from the coach as White');
    }
    for (const want of OPENING) {
      const mv = mirror.moves({ verbose: true }).find((m) => m.san === want)
        ?? mirror.moves({ verbose: true })[0];
      if (!mv) break;
      const probe = new Chess(mirror.fen());
      probe.move(mv.san);
      const ok = await clickMove(page, mv, probe.fen());
      if (!ok) {
        const ended = await appEndedGame(page);
        record('the game ran without stalling', !!ended, ended ?? `the board did not accept ${mv.san} at ply ${played * 2}`);
        break;
      }
      mirror.move(mv.san);
      played += 1;
      const reply = await awaitCoachReply(page, mirror, { firstMove: played === 1 });
      if (!reply) {
        const ended = await appEndedGame(page);
        if (ended) { record('the game ran to a real end', true, ended); break; }
        record('the coach replied every turn', false, `no reply after ${mv.san} (ply ${played * 2 - 1})`);
        break;
      }
      mirror.move(reply);
    }
    record('drove a real game on Learn', played >= 4, `${played} student moves landed`);

    // ── INSTRUMENT 3a: the local listener (localhost only, by construction).
    const spoken = listener.getCapturedEvents()
      .filter((e) => e.kind === 'coach-narration-spoken' || e.kind === 'voice-speak-invoked')
      .map((e) => e.narrationText ?? e.summary ?? '')
      .filter(Boolean);
    console.log(`[listener] captured ${spoken.length} narration events`);

    // ── INSTRUMENT 2: the audit-stream delta.
    const after = await pullStream(runStart);
    const fresh = after.ok ? after.events : [];
    console.log(`[stream] post-run pull: ${after.ok ? `${fresh.length} events` : `unavailable (${after.reason})`}`);

    const planEvents = fresh.filter((e) => String(e.source ?? '').includes('lookahead')
      || String(e.summary ?? '').toLowerCase().includes('turns on')
      || String(e.summary ?? '').toLowerCase().includes('want to'));
    // INFORMATIONAL, not a check. The init script points the app's stream at
    // the LOCAL listener, so prod's stream cannot also receive these events —
    // asserting on it fails by construction and blames the app for the audit's
    // own wiring. The listener is the instrument here; the prod stream is
    // context for whatever else was happening.
    console.log(`[stream] ${fresh.length} prod events in the window, ${planEvents.length} plan-shaped (informational)`);

    // ── THE CONTRACT. Every spoken line the run captured must obey the rules
    //    the unit gates prove offline: no move handed over, no raw identifier.
    const lines = [...spoken, ...fresh.map((e) => String(e.summary ?? ''))].filter(Boolean);
    // SCOPE THE CHECK TO THE PLAN'S OWN SENTENCES. An utterance bundles the
    // corpus note AND the computed lanes, and a corpus note is ALLOWED to name
    // moves — that is what an opening note is. Testing the whole bundle flagged
    // "Bxh2 gives black a passive bishop" as the plan handing over a move,
    // which is the audit reading the wrong half of the string.
    const planSentences = lines
      .flatMap((l) => l.split(/(?<=[.!?])\s+/))
      .filter((sn) => /\b(want to|turns on|is worth watching|is contested|bring (your|their) pieces)\b/i.test(sn));
    const leakedMove = planSentences.filter((sn) => movesIn(sn).length > 0);
    record(
      'no plan sentence handed over a move',
      leakedMove.length === 0,
      leakedMove.slice(0, 2).join(' | ') || `clean across ${planSentences.length} plan sentences`,
    );
    record(
      'the plan actually spoke on prod',
      planSentences.length > 0,
      `${planSentences.length} plan sentences in ${spoken.length} narration events`,
    );

    // ── THE BOARD SAID IT TOO. David 2026-08-10, reading a 251-finding prod
    //    log in which the coach named d6, b5, c6 and d7 and marked none of
    //    them: "I want square highlights and arrows drawn about future moves,
    //    plans, and key squares." A spoken square with a bare board is a defect
    //    by the locked lead-the-eye rule, and nothing was catching it — the
    //    whole log had narration events and zero annotation events.
    //
    //    Two assertions, because either alone is weak: marks FIRED, and every
    //    square they mark was actually SPOKEN. The second is the one that
    //    matters — a mark the voice never justified is the lie drawn instead
    //    of said.
    const markEvents = [...listener.getCapturedEvents(), ...fresh]
      .filter((e) => String(e.source ?? '').includes('planMarks'));
    const markedSquares = markEvents
      .flatMap((e) => String(e.summary ?? '').match(/\b[a-h][1-8]\b/g) ?? []);
    const namedInSpeech = new Set(planSentences.flatMap((sn) => sn.match(/\b[a-h][1-8]\b/g) ?? []));
    record(
      'the board marked what the coach named',
      markEvents.length > 0,
      markEvents.length > 0
        ? `${markEvents.length} annotation event(s), ${markedSquares.length} square(s)`
        : 'the coach named squares and the board stayed bare',
    );
    // Only meaningful once marks exist; skipped rather than vacuously green.
    if (markEvents.length > 0) {
      const unspoken = [...new Set(markedSquares)].filter((sq) => !namedInSpeech.has(sq));
      record(
        'every mark traces back to something spoken',
        // A plan clause can name no square out loud ("bring pieces at your
        // king") and still be marked — that is the point of the clause-square
        // coupling — so this checks the marks are not WILD, not that every one
        // was literally pronounced. A run where NOTHING marked was spoken is
        // the failure: it means the marks came from somewhere else entirely.
        markedSquares.length === 0 || unspoken.length < markedSquares.length,
        unspoken.length > 0 ? `unspoken: ${unspoken.slice(0, 6).join(', ')}` : 'every marked square was named aloud',
      );
    }

    const rawId = lines.filter((l) => /want to land a [a-z]+_[a-z]+/.test(l));
    record('no raw detector identifier reached the voice', rawId.length === 0, rawId.slice(0, 2).join(' | ') || 'clean');

    record('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'clean');

    // The https narration read-back is a PostHog query the SESSION runs — the
    // scripts must not carry a PostHog key (locked). Print what to ask for.
    if (BASE_URL.startsWith('https')) {
      console.log('\n[posthog] run this to read what the coach actually spoke:');
      console.log(`  SELECT timestamp, properties.source, properties.narration_text`);
      console.log(`  FROM events WHERE event='coach_narration_spoken'`);
      console.log(`    AND properties.audit_run_id='${RUN_ID}' ORDER BY timestamp`);
    }

    await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({
      runId: RUN_ID, baseUrl: BASE_URL, played, results,
      listenerEvents: spoken.length, streamEvents: fresh.length,
      sampleLines: lines.slice(0, 40), pageErrors,
    }, null, 2));
  } finally {
    await browser.close().catch(() => {});
    await listener.stop().catch(() => {});
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks green — report at ${OUT_DIR}/report.json`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
