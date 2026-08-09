#!/usr/bin/env node
// A FULL game in Learn with Coach — does the MIDDLEGAME teaching work?
//
// David 2026-08-09: "Run a full game. We need to make sure middle game
// teachings work. Improving pieces, trading off opponents best piece."
//
// The previous Learn audit drove the board from a list of preferred moves and
// stopped at ply 8 — still in the opening — so it could not have answered this
// even in principle. The beats in question only fire in a real middlegame:
//   • IMPROVING MOVE      — nothing forcing, so name the piece with a better
//                           square (and withhold the square).
//   • THEIR BEST PIECE    — their strongest piece can be traded off right now.
//   • ALIGNMENT           — the seeding observation that precedes a tactic.
// This plays a whole game with a real (small) player and reports which beats
// actually fired, per phase.
//
// PROVEN, NOT INFERRED. Every computed fact opens with its own uppercase tag,
// and `CoachTeachPage.turnFacts` now lists those tags in its audit details, so
// the beats are read from the app's own events rather than guessed at from the
// model's paraphrase. Reading the prose would only prove the model said
// something adjacent.
//
// MUTED (`muteTtsForAudit`) — same narration events, same full text, zero TTS
// spend. Instruments per §G1: Playwright drives, the prod audit-stream is
// pulled before/after, and the run is stamped with an audit_run_id so the full
// spoken text is queryable from PostHog (the local listener cannot attach over
// https).
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { pickStudentMove } from './audit-lib/student-player.mjs';
import BAKE from '../src/data/walkthrough-narrations.json' with { type: 'json' };

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `learn-full-${Math.random().toString(36).slice(2, 10)}`;
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const MAX_PLIES = Number(process.env.AUDIT_MAX_PLIES ?? 40);
const OUT = `audit-reports/learn-full-game-${new Date().toISOString().replace(/[:.]/g, '-')}`;

/** The opening the coach is asked to play, so the game starts from real theory
 *  and then leaves it — which is exactly where the middlegame beats live. */
const ASK = process.env.AUDIT_ASK ?? 'play the Vienna Gambit against me';

/** FOLLOW THE LINE YOU ASKED FOR.
 *
 *  The first run of this audit asked for the Latvian and then played Nc6 on
 *  move one, because the student player only knows material and development —
 *  so the game left theory before it entered it, and the opening teaching had
 *  nothing to attach to. A student who asks for the Latvian plays the Latvian.
 *
 *  While the game is still a prefix of the named opening's baked spine the
 *  student plays the spine's next move; the moment the coach steps off it the
 *  audit reverts to its own player, which is where the middlegame lives. */
const FOLLOW = (() => {
  const wanted = (process.env.AUDIT_FOLLOW ?? ASK).toLowerCase();
  const entries = Object.values(BAKE.narrations ?? {});
  const hit = entries
    .filter((e) => wanted.includes(e.openingName.toLowerCase()))
    .sort((a, b) => b.openingName.length - a.openingName.length)[0];
  return hit ? { name: hit.openingName, spine: hit.spine } : null;
})();

/** The spine's next move, or null once the game has left the line. */
const spineMove = (history) => {
  if (!FOLLOW || history.length >= FOLLOW.spine.length) return null;
  for (let i = 0; i < history.length; i += 1) {
    if (FOLLOW.spine[i] !== history[i]) return null;
  }
  return FOLLOW.spine[history.length];
};

const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

const readPlacement = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    const p = sq.querySelector('[data-piece]');
    const name = sq.getAttribute('data-square');
    if (p && name) out[name] = p.getAttribute('data-piece');
  });
  return out;
}).catch(() => ({}));

const samePlacement = (a, b) => {
  const ka = Object.keys(a); const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => a[k] === b[k]);
};

const placementOf = (fen) => {
  const out = {};
  const rows = fen.split(' ')[0].split('/');
  for (let r = 0; r < 8; r += 1) {
    let file = 0;
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) { file += Number(ch); continue; }
      const square = 'abcdefgh'[file] + String(8 - r);
      out[square] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
      file += 1;
    }
  }
  return out;
};

// The claim names a piece in WORDS ("bishop on d3"); chess.js answers in
// letters ("b"). Comparing the two through one letter-map keyed by letters
// made every claim mismatch — the first run of this script reported 39 false
// claims, of which the overwhelming majority were "bishop on d3 — actually a
// b". A checker that flags true statements is worse than no checker: it buries
// the real ones, and this run had real ones in it.
const TYPE_OF = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
const NAME_OF = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const CLAIM_RE = /\b(pawn|knight|bishop|rook|queen|king)\s+on\s+([a-h][1-8])\b/gi;

/** Piece-on-square claims in `text` that are not true of `fen`. */
function falseBoardClaims(text, fen) {
  const bad = [];
  let chess;
  try { chess = new Chess(fen); } catch { return bad; }
  CLAIM_RE.lastIndex = 0;
  let m;
  while ((m = CLAIM_RE.exec(text)) !== null) {
    const claimed = TYPE_OF[m[1].toLowerCase()];
    const square = m[2].toLowerCase();
    const at = chess.get(square);
    if (!at) bad.push(`${m[1]} on ${square} — square is empty`);
    else if (at.type !== claimed) bad.push(`${m[1]} on ${square} — actually a ${NAME_OF[at.type]}`);
  }
  return bad;
}

async function pullStream(since) {
  if (!SECRET) return [];
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
    if (!res.ok) return [];
    const body = await res.json();
    return body.events ?? body.entries ?? [];
  } catch { return []; }
}

/** Which phase a position is in — the same three buckets the app narrates. */
function phaseOf(fen) {
  const chess = new Chess(fen);
  const pieces = chess.board().flat().filter(Boolean);
  const heavy = pieces.filter((p) => p.type === 'q' || p.type === 'r').length;
  const minors = pieces.filter((p) => p.type === 'n' || p.type === 'b').length;
  if (pieces.length <= 12 || (heavy <= 2 && minors <= 2)) return 'endgame';
  const moved = 32 - pieces.length;
  return moved >= 2 || minors < 8 ? 'middlegame' : 'opening';
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const before = Date.now() - 60_000;
  const preEvents = await pullStream(before);
  console.log(`[stream] pre-run: ${preEvents.length} events`);
  console.log(`[audit-run-id] ${RUN_ID}`);

  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(`localStorage.setItem('auditRunId', ${JSON.stringify(RUN_ID)});`);

  const page = await ctx.newPage();
  const pageErrors = [];
  const spoken = [];
  const beats = [];        // { beat, fen } from the app's own turnFacts details
  const bakedPlies = [];   // which plies of the named opening the bake taught
  const rawPayloads = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('request', (req) => {
    if (!req.url().includes('/api/audit')) return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      rawPayloads.push(body);
      for (const e of (body.events ?? body.entries ?? [body])) {
        const kind = String(e.kind ?? '');
        if (e.source === 'CoachTeachPage.turnFacts' && e.details) {
          try {
            for (const b of (JSON.parse(e.details).beats ?? [])) beats.push({ beat: b, fen: e.fen });
          } catch { /* details not ours */ }
        }
        // The bake announces WHICH ply of the opening it taught, so "the whole
        // opening got taught" is read off the app's own event instead of being
        // pattern-matched back out of the model's phrasing.
        if (e.source === 'CoachTeachPage.bakedOpeningTeaching') {
          const n = /move (\d+)/.exec(String(e.summary ?? ''));
          if (n) bakedPlies.push(Number(n[1]));
        }
        if (kind.includes('narration') || kind.includes('voice')) {
          spoken.push({ kind, source: e.source, text: e.narrationText ?? e.summary, fen: e.fen });
        }
      }
    } catch { /* not our payload */ }
  });

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const OVERLAYS = [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
    ['[data-testid="page-help-modal"]', '[data-testid="page-help-close"]'],
  ];
  const deadline = Date.now() + 45_000;
  for (;;) {
    let acted = false;
    for (const [gate, btn] of OVERLAYS) {
      const g = page.locator(gate);
      if (await g.isVisible().catch(() => false)) {
        await page.locator(btn).first().click({ timeout: 6000 }).catch(() => {});
        await g.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => {});
        acted = true;
      }
    }
    if (!acted) {
      await sleep(1500);
      const left = await Promise.all(OVERLAYS.map(([g]) => page.locator(g).isVisible().catch(() => false)));
      if (!left.some(Boolean)) break;
    }
    if (Date.now() > deadline) break;
  }

  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 45_000 });
  await input.click();
  await input.pressSequentially(ASK, { delay: 20 });
  await page.keyboard.press('Enter');
  console.log(`[ask] "${ASK}"`);

  await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: 90_000 });
  await sleep(6000);

  const chess = new Chess();
  const transcript = [];
  let ply = 0;

  // The coach has White and opens on its own; read that off the board first or
  // the mirror is a move behind for the whole game.
  {
    const openDeadline = Date.now() + 90_000;
    while (Date.now() < openDeadline && chess.history().length === 0) {
      const now = await readPlacement(page);
      for (const m of chess.moves({ verbose: true })) {
        const probe = new Chess(chess.fen());
        probe.move(m.san);
        if (samePlacement(placementOf(probe.fen()), now)) { chess.move(m.san); break; }
      }
      if (chess.history().length === 0) await sleep(3000);
    }
    console.log(`[open] coach played ${chess.history().at(-1) ?? 'NOTHING — it never opened'}`);
  }

  while (ply < MAX_PLIES && !chess.isGameOver()) {
    const onSpine = spineMove(chess.history());
    let legal = null;
    if (onSpine) {
      const m = chess.moves({ verbose: true }).find((v) => v.san === onSpine);
      if (m) legal = { from: m.from, to: m.to, san: m.san };
    }
    legal ??= pickStudentMove(chess.fen(), chess.history().length);
    if (!legal) { transcript.push({ note: 'no legal student move — game over' }); break; }

    const spokenBefore = spoken.length;
    const beatsBefore = beats.length;
    await page.locator(`[data-square="${legal.from}"]`).first().click({ timeout: 8000, force: true });
    await page.waitForTimeout(200);
    await page.locator(`[data-square="${legal.to}"]`).first().click({ timeout: 8000, force: true });
    chess.move(legal.san);
    ply += 1;
    if (chess.isGameOver()) { transcript.push({ ply, studentMove: legal.san, note: 'game over on the student move' }); break; }

    // Wait for the student's move to RENDER, then for the next change — that
    // one is the coach's. Waiting only for "something changed" catches the
    // student's own move and desyncs the mirror (2026-08-09).
    const mine = placementOf(chess.fen());
    const settle = Date.now() + 20_000;
    while (Date.now() < settle) {
      if (samePlacement(await readPlacement(page), mine)) break;
      await sleep(1000);
    }
    const replyBy = Date.now() + (ply === 1 ? 120_000 : 45_000);
    while (Date.now() < replyBy) {
      await sleep(2500);
      if (!samePlacement(await readPlacement(page), mine)) break;
    }
    await sleep(2500); // let this turn's narration events post before slicing

    const placement = await readPlacement(page);
    let replySan = null;
    if (Object.keys(placement).length > 0) {
      for (const m of chess.moves({ verbose: true })) {
        const probe = new Chess(chess.fen());
        probe.move(m.san);
        if (samePlacement(placementOf(probe.fen()), placement)) { replySan = m.san; break; }
      }
      if (replySan) chess.move(replySan);
    }
    if (!replySan) { transcript.push({ ply, studentMove: legal.san, note: 'coach never replied — stopping' }); break; }

    const said = spoken.slice(spokenBefore).map((s) => ({
      ...s,
      falseClaims: s.text ? falseBoardClaims(s.text, s.fen ?? chess.fen()) : [],
    }));
    const turnBeats = beats.slice(beatsBefore).map((b) => b.beat);
    const phase = phaseOf(chess.fen());
    transcript.push({ ply, phase, studentMove: legal.san, coachReply: replySan, fen: chess.fen(), beats: turnBeats, said });
    const spokenLine = said.find((s) => s.source === 'CoachTeachPage.voicePackage' || s.source === 'CoachTeachPage.trackA');
    console.log(`[${ply}|${phase}] you ${legal.san} / coach ${replySan}${turnBeats.length ? `   beats: ${turnBeats.join(', ')}` : ''}`);
    if (spokenLine?.text) console.log(`     🔊 ${String(spokenLine.text).slice(0, 150)}`);
    for (const s of said) for (const f of s.falseClaims) console.log(`     ❌ FALSE: ${f}`);
  }

  await page.screenshot({ path: `${OUT}/final.png`, fullPage: true }).catch(() => {});
  await browser.close();

  await sleep(3000);
  const postEvents = await pullStream(before);

  const allBeats = transcript.flatMap((t) => t.beats ?? []);
  const histogram = allBeats.reduce((acc, b) => { acc[b] = (acc[b] ?? 0) + 1; return acc; }, {});
  const phases = [...new Set(transcript.map((t) => t.phase).filter(Boolean))];
  const allFalse = transcript.flatMap((t) => (t.said ?? []).flatMap((s) => s.falseClaims ?? []));
  const totalSpoken = transcript.reduce((n, t) => n + (t.said?.length ?? 0), 0);
  const silentPlies = transcript.filter((t) => t.ply && !(t.said ?? []).length).length;

  const report = {
    runId: RUN_ID, base: BASE, ask: ASK,
    pliesPlayed: ply, gameOver: chess.isGameOver(), result: chess.isCheckmate() ? 'checkmate' : chess.isDraw() ? 'draw' : 'unfinished',
    phasesReached: phases, beatHistogram: histogram,
    followed: FOLLOW?.name ?? null,
    openingPliesInBake: FOLLOW?.spine.length ?? 0,
    // How far the game actually stayed on the line — the coach picks its own
    // replies, so the reachable teaching stops wherever it steps off.
    spineReached: (() => {
      if (!FOLLOW) return 0;
      const h = chess.history();
      let n = 0;
      while (n < h.length && n < FOLLOW.spine.length && h[n] === FOLLOW.spine[n]) n += 1;
      return n;
    })(),
    openingPliesTaught: [...new Set(bakedPlies)].sort((a, b) => a - b),
    linesSpoken: totalSpoken, silentPlies, falseClaims: allFalse, pageErrors,
    streamDelta: postEvents.length - preEvents.length,
    pgn: chess.pgn(), transcript,
  };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));

  console.log('\n──────── SUMMARY ────────');
  console.log(`plies played        ${ply} (${report.result})`);
  console.log(`phases reached      ${phases.join(', ') || 'none'}`);
  console.log(`lines spoken        ${totalSpoken}   silent plies: ${silentPlies}`);
  console.log('beats fired:');
  for (const [b, n] of Object.entries(histogram).sort((a, b2) => b2[1] - a[1])) console.log(`   ${String(n).padStart(3)}  ${b}`);
  // The two David named. Absence is the finding, so it is stated outright
  // rather than left to be noticed in a histogram.
  for (const want of ['IMPROVING MOVE', 'THEIR BEST PIECE']) {
    console.log(`${histogram[want] ? '✅' : '❌'} ${want}: ${histogram[want] ?? 0}`);
  }
  if (FOLLOW) {
    const taught = report.openingPliesTaught;
    console.log(`opening line        ${report.spineReached}/${FOLLOW.spine.length} plies of ${FOLLOW.name} played`);
    // Two plies happen per turn and the coach says one thing per turn, so a
    // fully-taught opening reads as half its plies. Say that, rather than
    // leave a "7 of 14" to be read as half the teaching going missing.
    const turns = transcript.filter((t) => t.ply && report.spineReached >= t.ply * 2 - 1).length;
    console.log(`opening taught      ${taught.length} plies over ${turns} turn(s) on the line — one per turn by design`);
    if (taught.length) console.log(`                    moves ${taught.join(', ')}`);
  }
  console.log(`FALSE board claims  ${allFalse.length}`);
  console.log(`page errors         ${pageErrors.length}`);
  console.log(`report              ${OUT}/report.json`);
  console.log(`PostHog: SELECT timestamp, properties.source, properties.narration_text FROM events`);
  console.log(`  WHERE event='coach_narration_spoken' AND properties.audit_run_id='${RUN_ID}' ORDER BY timestamp`);

  // The two David named are REPORTED unconditionally, but they cannot be the
  // pass condition: the ladder speaks one thing per turn and both sit below
  // the tactical rungs, so a sharp game legitimately never reaches them. What
  // is a defect is a middlegame the coach had nothing at all to say about.
  const middlegameBeats = transcript
    .filter((t) => t.phase === 'middlegame')
    .reduce((n, t) => n + (t.beats?.length ?? 0), 0);
  const mutedMiddlegame = transcript.filter((t) => t.phase === 'middlegame').length >= 8
    && middlegameBeats === 0;
  if (mutedMiddlegame) console.log('❌ a real middlegame went by with no computed beat at all');
  // A game that stayed on a baked line and got no opening teaching is the
  // failure this run exists to catch — silence there is what David heard.
  const untaughtOpening = Boolean(FOLLOW) && report.spineReached >= 4 && report.openingPliesTaught.length === 0;
  if (untaughtOpening) console.log(`❌ played ${report.spineReached} plies of a BAKED opening and taught none of them`);
  process.exit(allFalse.length > 0 || pageErrors.length > 0 || mutedMiddlegame || untaughtOpening ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
