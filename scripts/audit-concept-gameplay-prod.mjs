#!/usr/bin/env node
/**
 * audit-concept-gameplay-prod — the LEARN half of the standing audit pair
 * (CLAUDE.md "TWO AUDITS EVERY RUN"). It proves the coach SPEAKS a computed
 * concept during LIVE GAMEPLAY.
 *
 * 🔒 THE SURFACE IS A REAL GAME, NOT A WALKTHROUGH (David 2026-09-17: "Replace
 * teach me x opening. I want to hear only the computer. That is the surface
 * you are scoped to. That's a miss on your end my friend.").
 *
 * Until today this audit asked "Teach me the Scandinavian Defense, Lasker
 * Variation" and read the walkthrough back. That was the wrong surface and it
 * made the audit vacuous for its own purpose: a walkthrough's beats are BAKED
 * AT GENERATION TIME by `openingGenerator`, so the run could go green without
 * touching a single line of the live computed path — `coachDecider`,
 * `factSelector`, `standingRefrains`, `positionFacts`, `playCommentary`, the
 * phase transitions. The computer that decides what is said was never invoked.
 *
 * So the audit now PLAYS. It asks the coach for a game of a named line, takes
 * the student's seat, and pushes real moves on the real board; every spoken
 * line it reads back was computed live, on the position in front of it.
 *
 * Three instruments per G1, MUTED (never a byte of TTS):
 *   1. Playwright drives /coach/teach on LIVE prod and plays a game.
 *   2. The app's own audit events land on a loopback listener sidecar; the
 *      prod audit-stream is pulled before + after (opt-in, off by default —
 *      empty is expected and informational, CLAUDE.md §G2).
 *   3. The narration events on that listener carry the SPOKEN text — the
 *      proof is what the coach SAID, not that a function ran.
 *
 * WHY THIS LINE. The student takes Black in the Scandinavian Lasker, so the
 * coach opens and the student steers: 1.e4 d5 2.exd5 Qxd5 3.Nc3 Qa5 4.d4 Nf6
 * 5.Nf3 Bg4 — and …Bg4 pins Nf3 to the queen on d1 (e2 is empty, the e-pawn
 * having gone on move two). That pin is COMPUTED by the live detector on the
 * student's own move, so if the coach follows the book the invariant has to be
 * spoken. When the coach steps off the line the audit reverts to its own
 * student player and keeps playing — the game is the point, not the theory.
 *
 * Contracts asserted (experience, not text-presence):
 *   A. the ask starts a real GAME on this surface — a coach move is committed,
 *      and no walkthrough mounts (a lecture is a FAIL here, not a pass)
 *   B. the listener captured narration events (instrument 3 alive)
 *   C. a SPOKEN line carries an engine INVARIANT sentence (TACTIC_INVARIANT
 *      vocabulary) — the concept was voiced mid-GAME
 *   D. every spoken board line is gate-clean (no we/our/us; no raw enum leak
 *      such as "mate_threat")
 *   E. off-canonical ask (G7): a misspelled play request still starts a game
 *   F. vacuity guard: >=3 spoken lines; instruments stayed muted; 0 page errors
 *
 * Run (from the sandbox, against LIVE prod):
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-concept-gameplay-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { pickStudentMove } from './audit-lib/student-player.mjs';
import { Chess } from 'chess.js';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
// A PLAY request, never a teach request: `stageHint === 'play-real'` is what
// hands the board to the student and starts the live coach. Without "against
// me" the line's own side is the STUDENT's (`studentSideForPlay`), so the
// student takes Black here and the coach opens as White.
const ASK = process.env.AUDIT_CONCEPT_ASK ?? 'Play the Scandinavian Defense, Lasker Variation with me';
/** The chip a student taps when the ask lands on a subline picker. */
const CHIP_PICK = new RegExp(process.env.AUDIT_CONCEPT_CHIP ?? 'Lasker', 'i');
const ASK_TYPO = process.env.AUDIT_CONCEPT_ASK_TYPO ?? 'lets play the scandinavian lasker variaton';
/** The student's own moves while the coach stays on the book line. Past the
 *  last one — or the moment the coach steps off — the audit's student player
 *  takes over, which is where the middlegame concepts live. */
const STUDENT_LINE = ['d5', 'Qxd5', 'Qa5', 'Nf6', 'Bg4', 'Nc6', 'O-O-O', 'e6'];
/** Plies the STUDENT pushes. Long enough to leave book and reach real play. */
const MAX_STUDENT_PLIES = Number(process.env.AUDIT_CONCEPT_PLIES ?? 14);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/concept-gameplay-${stamp}`;
const BOOT_TIMEOUT_MS = 45_000;
/** Cold generation on prod (DeepSeek) + the muted, voice-gated playback. */
const LESSON_BUDGET_MS = Number(process.env.AUDIT_CONCEPT_BUDGET_MS ?? 210_000);

/** The engine's invariants (conceptEngine TACTIC_INVARIANT), matched on
 *  SUBSTANCE: the concept NAMED plus the invariant's distinctive cue. The
 *  computed beat is handed to the phrasing pass, which may reword it (G0: the
 *  model phrases, it never decides) — on prod "a pin freezes the piece in
 *  front: it can't move without exposing…" was spoken as "That's a pin: the
 *  piece in front is frozen — it cannot move without exposing…", and an
 *  exact-sentence regex called that a miss (2026-09-15). Each cue is a phrase
 *  the reword keeps; `auditConceptGameplayCues.test.ts` pins every cue to the
 *  engine's own invariant text so this list cannot drift from the source. */
export const CONCEPT_CUES = [
  { type: 'fork', name: /\bfork/i, cue: /two targets/i },
  { type: 'pin', name: /\bpin\b|\bpinned\b/i, cue: /piece in front/i },
  { type: 'skewer', name: /\bskewer/i, cue: /valuable piece/i },
  { type: 'discovery', name: /\bdiscover/i, cue: /second attacker|unveil/i },
  { type: 'double_check', name: /double check/i, cue: /two pieces/i },
  { type: 'back_rank', name: /back[- ]rank/i, cue: /own pawns/i },
  { type: 'removal_of_guard', name: /remov\w* the (?:guard|defender)|defender/i, cue: /defending|defender/i },
  { type: 'trapped_piece', name: /trapped/i, cue: /no safe square/i },
  { type: 'overload', name: /overload/i, cue: /two defensive jobs|two jobs/i },
  { type: 'battery', name: /battery/i, cue: /same line/i },
];
const carriesConcept = (line) => CONCEPT_CUES.some((c) => c.name.test(line) && c.cue.test(line));
const RAW_ENUM_LEAK = /\b(mate_threat|removal_of_guard|trapped_piece|back_rank|double_check|discovered_attack|tactical_sequence)\b/;
// A walkthrough mounting is now a FAILURE signal: the ask was a request to
// PLAY, and a lecture instead of a game means the play intent lost.
const WALKTHROUGH_TESTIDS = ['walkthrough-choose-mode', 'walkthrough-stage-menu', 'walkthrough-leaf-panel', 'walkthrough-fork-panel', 'walkthrough-step-back', 'walkthrough-trap-bar', 'walkthrough-gem-bar'];

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function pullStream(sinceMs) {
  if (!SECRET) return { ok: false, reason: 'AUDIT_STREAM_SECRET not set', events: [] };
  try {
    const res = await fetch(`${BASE_URL}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': SECRET } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, events: [] };
    const json = await res.json();
    return { ok: true, events: json.events ?? json.entries ?? [] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err), events: [] };
  }
}

async function dismissGates(page) {
  for (const [gate, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]']]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 4000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 10_000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 2500 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}

/** Narration lines the app itself reported as SPOKEN (summary preview + the
 *  full line in details). Instrument 3. */
/** The FULL spoken sentence, for reading back. `spokenLines` below builds
 *  summary+details strings because that is what the concept MATCHER greps; the
 *  app's own event carries the whole line in `narrationText`, and a report that
 *  saves the 120-char preview is a report you cannot read the narration from
 *  (2026-09-16). */
function spokenProse(listener) {
  return listener.getCapturedEvents()
    .filter((e) => e.kind === 'coach-narration-spoken' && e.narrationText)
    .map((e) => String(e.narrationText));
}

function spokenLines(listener) {
  return listener.getCapturedEvents()
    .filter((e) => /coach-narration-spoken|voice-speak-invoked/i.test(e.kind ?? ''))
    .map((e) => `${e.summary ?? ''} ${typeof e.details === 'string' ? e.details : JSON.stringify(e.details ?? '')}`);
}

/** The board as the page renders it: square -> piece code ("wP", "bN"). */
const readPlacement = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    const p = sq.querySelector('[data-piece]');
    const name = sq.getAttribute('data-square');
    if (p && name) out[name] = p.getAttribute('data-piece');
  });
  return out;
}).catch(() => ({}));

const placementOf = (fen) => {
  const out = {};
  const rows = fen.split(' ')[0].split('/');
  for (let r = 0; r < 8; r += 1) {
    let file = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { file += Number(ch); continue; }
      out['abcdefgh'[file] + String(8 - r)] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      file += 1;
    }
  }
  return out;
};

const samePlacement = (a, b) => {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
};

/** The coach's OWN account of the move it committed — read off its
 *  `coach-turn-checkpoint` event rather than reconstructed from pixels. Learn
 *  publishes it the way Play always has (CoachTeachPage:9266). */
function committedSans(listener) {
  return listener.getCapturedEvents()
    .filter((e) => e.kind === 'coach-turn-checkpoint')
    .map((e) => /san=(\S+)/.exec(String(e.summary ?? ''))?.[1])
    .filter(Boolean);
}

/** Sync the node-side mirror to whatever the page is showing, by trying each
 *  legal move. Returns the SAN applied, or null if the board has not moved. */
async function absorbOneMove(page, chess) {
  const now = await readPlacement(page);
  for (const m of chess.moves({ verbose: true })) {
    const probe = new Chess(chess.fen());
    probe.move(m.san);
    if (samePlacement(placementOf(probe.fen()), now)) { chess.move(m.san); return m.san; }
  }
  return null;
}

/**
 * Ask the coach for a GAME, then play it. Returns what actually happened, so
 * the caller can assert on a game rather than on a mounted panel.
 */
async function askAndPlay(page, listener, ask, label) {
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await dismissGates(page);
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 25_000 });
  // pressSequentially, not fill — the React textarea needs real key events.
  await input.pressSequentially(ask, { delay: 12 });
  await page.keyboard.press('Enter');
  const started = Date.now();
  // Lines are cumulative across the run — a concept voiced by an EARLIER ask
  // must not satisfy this one (2026-09-15: the first game's pin ended the
  // second run on its first tick).
  const spokenStart = spokenLines(listener).length;

  // ── the game has to START ─────────────────────────────────────────────────
  //
  // A subline picker is the CORRECT reply to a family ask, and to a typo — the
  // wide-berth rule (when in doubt, ASK). A student answers it by tapping the
  // chip that names the line they asked for, so the driver does too; leaving it
  // unanswered is the harness failing, not the coach.
  let walkthrough = null;
  let boardUp = false;
  while (Date.now() - started < LESSON_BUDGET_MS) {
    for (const t of WALKTHROUGH_TESTIDS) {
      if (!walkthrough && (await page.locator(`[data-testid="${t}"]`).count()) > 0) walkthrough = t;
    }
    if (walkthrough) break;
    const chips = page.locator('[data-testid^="message-choice-chip-"], [data-testid^="coach-choice-chip-"], [data-testid^="teach-picker-openings"] button');
    if ((await chips.count()) > 0) {
      const labels = await chips.allInnerTexts();
      const want = labels.findIndex((l) => CHIP_PICK.test(l));
      if (want >= 0) {
        await chips.nth(want).click({ force: true }).catch(() => {});
        console.log(`[picker] ${label}: tapped "${labels[want].replace(/\s+/g, ' ').slice(0, 60)}" of ${labels.length} chips`);
        await page.waitForTimeout(2500);
        continue;
      }
    }
    // The coach opens because the student took Black. Its first committed move
    // IS the signal that a game started — not a panel, not a sentence.
    if (committedSans(listener).length > 0) { boardUp = true; break; }
    if (!boardUp && (await page.locator('[data-square="e4"]').count()) > 0) {
      const placed = await readPlacement(page);
      if (placed.e4 === 'wP' || placed.d4 === 'wP' || placed.c4 === 'wP' || placed.f4 === 'wP') { boardUp = true; break; }
    }
    await page.waitForTimeout(3000);
  }
  const startedIn = Math.round((Date.now() - started) / 1000);
  if (walkthrough || !boardUp) {
    await page.screenshot({ path: `${OUT_DIR}/${label}-no-game.png`, fullPage: true }).catch(() => {});
    const body = await page.locator('body').innerText().catch(() => '');
    await writeFile(`${OUT_DIR}/${label}-body.txt`, body).catch(() => {});
    console.log(`[diag] ${label}: ${walkthrough ? `a WALKTHROUGH mounted (${walkthrough}) — the play intent lost` : 'no coach move in budget'}\n${body.slice(-900)}`);
    return { started: false, walkthrough, plies: 0, secs: startedIn, moves: [] };
  }

  // ── play it ───────────────────────────────────────────────────────────────
  const chess = new Chess();
  await absorbOneMove(page, chess);
  console.log(`[open] ${label}: coach played ${chess.history().at(-1) ?? '(nothing read yet)'}`);
  const moves = [];
  let onBook = true;
  for (let ply = 0; ply < MAX_STUDENT_PLIES && !chess.isGameOver(); ply += 1) {
    let legal = null;
    if (onBook && ply < STUDENT_LINE.length) {
      const m = chess.moves({ verbose: true }).find((v) => v.san === STUDENT_LINE[ply]);
      if (m) legal = { from: m.from, to: m.to, san: m.san };
      else { onBook = false; console.log(`[book] ${label}: left the line at ply ${ply} (wanted ${STUDENT_LINE[ply]})`); }
    }
    legal ??= pickStudentMove(chess.fen(), chess.history().length);
    if (!legal) break;
    await page.locator(`[data-square="${legal.from}"]`).first().click({ timeout: 8000, force: true }).catch(() => {});
    await page.waitForTimeout(250);
    await page.locator(`[data-square="${legal.to}"]`).first().click({ timeout: 8000, force: true }).catch(() => {});
    chess.move(legal.san);
    moves.push(legal.san);
    if (chess.isGameOver()) break;

    // Wait for the student's move to RENDER, then for the NEXT change — that
    // one is the coach's. Waiting for "something changed" catches the student's
    // own move and desyncs the mirror.
    const mine = placementOf(chess.fen());
    const settle = Date.now() + 20_000;
    while (Date.now() < settle && !samePlacement(await readPlacement(page), mine)) await page.waitForTimeout(1000);
    const replyBy = Date.now() + 90_000;
    let reply = null;
    while (Date.now() < replyBy && !reply) {
      await page.waitForTimeout(2500);
      reply = await absorbOneMove(page, chess);
    }
    if (!reply) { console.log(`[stall] ${label}: no coach reply after ${moves.at(-1)} — stopping at ply ${chess.history().length}`); break; }
    moves.push(reply);
    // Stop once the concept has been voiced — the game has done its job.
    if (spokenLines(listener).slice(spokenStart).some(carriesConcept)) break;
  }
  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`[game] ${label}: ${chess.history().length} plies in ${secs}s — ${chess.history().join(' ')}`);
  await writeFile(`${OUT_DIR}/${label}-game.json`, JSON.stringify({ ask, moves: chess.history(), pgn: chess.pgn() }, null, 1)).catch(() => {});
  return { started: true, walkthrough: null, plies: chess.history().length, secs, moves: chess.history() };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const runStart = Date.now();
  const before = await pullStream(runStart - 60_000);
  console.log(`[stream] pre-run pull: ${before.ok ? `${before.events.length} events` : `unavailable (${before.reason})`}`);
  const listener = await startAuditListener();
  console.log(`[listener] up at ${listener.url}`);
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });
  await context.addInitScript(autoDismissCalibration);
  await context.addInitScript(muteTtsForAudit); // G1: never a byte of TTS
  const RUN_ID = process.env.AUDIT_RUN_ID ?? `concept-gameplay-${Math.random().toString(36).slice(2, 10)}`;
  await context.addInitScript(stampAuditRunId(RUN_ID));
  console.log(`[audit-run-id] ${RUN_ID}`);
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  let ttsRequests = 0;
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsRequests += 1; });

  try {
    // ── A/B/C/D: the canonical ask ─────────────────────────────────────────
    const a = await askAndPlay(page, listener, ASK, 'canonical');
    record(
      'A. the ask STARTS A GAME on this surface (never a walkthrough / refusal / picker)',
      a.started && a.plies > 0,
      `ask="${ASK}" started=${a.started} plies=${a.plies}${a.walkthrough ? ` WALKTHROUGH=${a.walkthrough}` : ''} after ${a.secs}s`,
    );
    const lines = spokenLines(listener);
    record('B. narration listener captured spoken lines (instrument 3 alive)', lines.length > 0, `${lines.length} spoken`);
    const hit = lines.find(carriesConcept);
    record('C. a SPOKEN line carries a computed concept INVARIANT (the concept was voiced mid-GAME)', !!hit, hit ? hit.replace(/\s+/g, ' ').slice(0, 180) : `none of ${lines.length} lines`);
    // Board NARRATION only (a line that names a square or a piece) — the
    // coach's opening greeting ("What are we working on today?") is not a
    // piece-perspective claim and is outside the you/they rule.
    const boardLines = lines.filter((l) => /\b[a-h][1-8]\b|\b(knight|bishop|rook|queen|king|pawn)\b/i.test(l));
    const dirty = boardLines.filter((l) => /\b(we|our|us)\b/i.test(l) || RAW_ENUM_LEAK.test(l));
    record('D. every spoken board line is gate-clean (you/they; no raw enum leak)', dirty.length === 0, `${boardLines.length} board lines${dirty.length ? ' — ' + dirty.slice(0, 2).map((l) => l.slice(0, 100)).join(' | ') : ''}`);
    await writeFile(`${OUT_DIR}/spoken-canonical.json`, JSON.stringify(lines, null, 1)).catch(() => {});

    // ── E: off-canonical ask (G7 — interactive, messy human input) ──────────
    const e = await askAndPlay(page, listener, ASK_TYPO, 'typo');
    record('E. a misspelled play ask still starts a GAME (G7 off-canonical input)', e.started && e.plies > 0, `ask="${ASK_TYPO}" started=${e.started} plies=${e.plies}${e.walkthrough ? ` WALKTHROUGH=${e.walkthrough}` : ''} after ${e.secs}s`);

    // ── F: vacuity + instrument hygiene ────────────────────────────────────
    const all = spokenLines(listener);
    record('F1. vacuity guard: ≥3 spoken lines across the run', all.length >= 3, `${all.length}`);
    record('F2. the run stayed MUTED (zero /api/tts requests)', ttsRequests === 0, `${ttsRequests} tts requests`);
    record('F3. no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close().catch(() => {});
    await listener.stop();
  }

  const after = await pullStream(runStart);
  console.log(`[stream] post-run pull: ${after.ok ? `${after.events.length} events this run (opt-in stream — empty is expected)` : `unavailable (${after.reason})`}`);
  // SAVE WHAT WAS SPOKEN. When check C fails the only useful question is "then
  // what DID the coach say on that ply?", and the report answered it with a
  // count (2026-09-16) — so diagnosing a red row meant re-running a 6-minute
  // prod audit to see the lines it already had in memory. David's standing
  // order is to READ the narration; the report has to carry it.
  const report = { generatedAt: new Date().toISOString(), baseUrl: BASE_URL, ask: ASK, surface: 'live game on /coach/teach', results, spokenLines: spokenLines(listener), spokenProse: spokenProse(listener), listenerEvents: listener.getCapturedEvents().length, listenerByKind: listener.countByKind(), streamEventsThisRun: after.events.length, pageErrors };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => { console.error('audit crashed:', err); process.exit(1); });
