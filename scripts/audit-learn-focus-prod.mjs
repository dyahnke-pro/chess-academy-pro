#!/usr/bin/env node
/**
 * audit-learn-focus-prod — WO-FOCUS-TACTICS-01, PLAYED on David's record.
 *
 * Learn free play (`/coach/teach`) is ONE always-on focus — tactics, both
 * seats — at a RUNG the record sets (0 Beginner · 1 Intermediate · 2 Strong
 * intermediate · 3 Advanced), with the castling watch beside it. This drives
 * real games on an emulated iPhone with David's data drop loaded, muted, three
 * instruments together: Playwright plays, the narration listener hears every
 * spoken line, and the app's own audit rows and Dexie record decide.
 *
 * Phases, each a few games:
 *   record — his record as it is (the rung comes from his record: his focus
 *            games at a rung, else the hold on his side);
 *   rung2  — a seeded focus game at rung 2 is the newest (the record says
 *            "Strong intermediate"): no pause, the coach punishes;
 *   rung3  — the same at rung 3 (Advanced): the 3–4 move plant.
 * Seeds are learnFocusResults rows marked `audit-focus-seed-*`, removed before
 * the next phase; they live only in the audit browser.
 *
 * The student plays at David's level, not the engine's: Stockfish Skill 5
 * (AUDIT_SKILL) after a human pause (AUDIT_THINK_MS), plays past every Nth
 * loose piece (AUDIT_MISS_EVERY), plays a sound check whenever the engine lists
 * one (so tempo runs happen; AUDIT_PRESS=0 turns it off), and the first game of
 * a phase never castles (so the castling watch is posed). On a pause it answers
 * in turn: Try again /
 * Play on; Show me / Play on; Go back and castle / Play on. After the game it
 * taps the recap's first Play it out and plays the engine's moves.
 *
 * Contracts (per game unless said):
 *   F0 the banner names the focus and the rung;
 *   F1 the pre-game line is the first thing said;
 *   F2 every spoken line is a focus, castling or tempo-run line (announce /
 *      ask / clue / credit / shown / deciding / end / rung-up / castle-stop /
 *      castle-reminder / tempo-had / tempo-let-off) — a tapped button's
 *      answer is reported apart;
 *   F3 the Learn door spoke nothing — every lane held (counts reported);
 *   F4 every spoken find answers a question said out loud;
 *   F5 every focus chance was decided on the record, on this game's rung;
 *   F6 the rung came from the record — the setup row's rung is the one the
 *      rung rows in the store read (or, with none, the seed from the hold),
 *      the open motif levels in order, the target ply in moves 6–12;
 *   F7 no coach move steered into the focus gave material away (engine-checked);
 *   F8 a miss left standing was punished — Play on at rungs 0–1, every miss
 *      at rungs 2–3;
 *   F9 one learnFocusResults row (rung, atRung, presented), and the card
 *      shows the end line, the rung progress and the missed chances;
 *   F10 every prompted chance is on the game's promptedPlies;
 *   F11 the rewards are the focus's own;
 *   F12 only open motif levels were asked;
 *   F13 the focus is presented every game, harder by the record: the result
 *      row says presented (or the game ended before the target), the plants
 *      keep their rules (none before the target ply, 8 plies apart, at most
 *      the rung's chances, extras from move 15, the ask at the rung — one
 *      easier from move 20, a flip only as an extra), a planted find counted
 *      half; the arrival rate per rung is reported;
 *   F14 the castling watch blames the king only on the read: a LOOK-AHEAD
 *      STOP (`urgent`) cost ≥ 100 cp against castling and rewinds that one
 *      move; a BACKSTOP STOP (`what-if`) cost ≥ 100 cp and the castled board
 *      held at least that much; the rewind is offered at most three of your
 *      moves back and the line names the count; losing only at ≤ −300, one
 *      STOP line per STOP row, the reminder at most once and in the first
 *      twelve moves, every STOP filed as a king-stuck-center miss;
 *   F15 the tier is the rung: a pause only at rungs 0–1; Show me only at rung
 *      0 after a second miss; the answer never shown without the tap;
 *   F16 the recap's Play it out starts from the board before the miss and the
 *      card comes back;
 *   F17 the tempo run: the result row carries the game's longest run, the
 *      card shows it when it is two or more, "new best" exactly when it beats
 *      every game before, and a tempo line is said only when a run ended;
 *   no page errors; muted, every billable request aborted and counted.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-learn-focus-prod.mjs
 *   AUDIT_PHASES=record AUDIT_GAMES=1 AUDIT_MOVES=20 …   (a quick look)
 *   A full run is long: run one phase per process (AUDIT_PHASES=record, then
 *   rung2, then rung3); each writes report-<phase>.json and transcript-<phase>.md.
 */
import { chromium, devices } from 'playwright';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { clickMove, samePlacement, placementOf, readPlacement, sleep } from './audit-lib/board-drive.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `learn-focus-${Date.now()}`;
const OUT_DIR = 'audit-reports/focus-tactics-01';
const PHASES = (process.env.AUDIT_PHASES ?? 'record,rung2,rung3').split(',').map((s) => s.trim()).filter(Boolean);
const GAMES = Number(process.env.AUDIT_GAMES ?? 3);
const MAX_STUDENT_MOVES = Number(process.env.AUDIT_MOVES ?? 40);
/** One report per phase set, so phases run as separate processes do not
 *  overwrite each other (a full run is ~80 min; run a phase per process). */
const RUN_TAG = PHASES.join('-');
const GAME_BUDGET_MS = 14 * 60_000;
const GIFT_CP = 200;
/** Still this far ahead (cp, the coach's view) after a move that passed up a
 *  mate: nothing was given away. */
const DECIDED_CP = 500;
const SKILL = Number(process.env.AUDIT_SKILL ?? 5);
/** Every Nth time the board poses a loose piece (theirs or the student's own),
 *  the student plays a natural move that ignores it. A weakened engine still
 *  never hangs a piece (the final-build game 1 found 14 of 14 and spoke 4
 *  lines), so a red skill's teaching loop needs a student who misses it. The
 *  rate is a stated assumption, printed with the run, never hidden. */
const MISS_EVERY = Number(process.env.AUDIT_MISS_EVERY ?? 2);
const THINK_MS = Number(process.env.AUDIT_THINK_MS ?? 2500);
/** The student plays a sound check when the engine lists one (the tempo run). */
const PRESS = process.env.AUDIT_PRESS !== '0';

// The rung ladder (src/coach/focus/focusRung.ts), read again here so the
// audit checks the app against its own statement of the rule.
const RUNG_TITLE = ['Beginner', 'Intermediate', 'Strong intermediate', 'Advanced'];
const RUNG_CHANCES = [3, 2, 1, 1];
const SEED_RUNG = { red: 0, grey: 0, short: 1, green: 2 };
const WINDOW = 5;
const UP_FINDS = 3;
const BAR = 0.75;
const MIN_BACK = 5;
/** rungFrom: the trailing run of games at the last game's rung, stepped. */
function rungFromRows(rows, seed) {
  const games = rows.filter((r) => typeof r.rung === 'number' && r.atRung).map((r) => ({ rung: r.rung, found: r.atRung.found, missed: r.atRung.missed, at: r.at })).sort((x, y) => x.at - y.at);
  if (games.length === 0) return { rung: seed, from: 'seed' };
  const last = games[games.length - 1].rung;
  let i = games.length - 1;
  while (i > 0 && games[i - 1].rung === last) i -= 1;
  const run = games.slice(i);
  const win = run.slice(-WINDOW);
  const finds = win.reduce((a, g) => a + g.found, 0);
  const chances = win.reduce((a, g) => a + g.found + g.missed, 0);
  const rate = chances > 0 ? finds / chances : 0;
  if (last < 3 && finds >= UP_FINDS && rate >= BAR) return { rung: last + 1, from: 'games' };
  if (last > 0 && run.length >= MIN_BACK && chances > 0 && rate < BAR) return { rung: last - 1, from: 'games' };
  return { rung: last, from: 'games' };
}
const PHASE = {
  record: { seedRung: null },
  rung2: { seedRung: 2 },
  rung3: { seedRung: 3 },
};
/** Moves 6–12 (focusSetup TARGET_FIRST_PLY / TARGET_LAST_PLY). */
const TARGET = [11, 24];
const SECOND_CHANCE_PLY = 29;
const EASIER_FROM_PLY = 40;

// The fixed phrasing (src/coach/focus/focusLines.ts, focusCard.ts,
// castlingWatch.ts), normalised. A spoken line is one of these or it leaked.
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const ASKS = new Set([
  'Count their defenders — is anything of theirs loose?', 'Is anything of theirs loose?', 'Is everything of yours safe?',
  'Check your pieces — is anything loose?', 'Checks and captures first — is there a shot?', 'Is there a forcing move here?',
  'What does their last move threaten?', 'What is their last move aiming at?', 'How safe is your king right now?',
  'Look at their king — what do your checks do?',
].map(norm));
function lineKind(text, pregame) {
  const n = norm(text);
  if (pregame && n === norm(pregame)) return 'announce';
  if (ASKS.has(n)) return 'ask';
  if (n.startsWith('tactics today') && n.endsWith('review has the rest')) return 'end';
  if (/^tactics (beginner|intermediate|strong intermediate|advanced)$/.test(n)) return 'rung-up';
  if (n.startsWith('stop you re not castled')) return 'castle-stop';
  if (n.startsWith('you could have castled there')) return 'castle-reminder';
  if (n === 'you had them on the run and you let them off the hook') return 'tempo-let-off';
  if (n === 'you had them on the run') return 'tempo-had';
  if (n.startsWith('hold on')) return 'clue';
  if (/^(there it is|good|yes) /.test(n)) return 'credit';
  if (n.startsWith('that one decides the game')) return 'deciding';
  if (n.startsWith('the arrow shows') || /was the shot|was free the arrow takes it|starts mate in/.test(n)) return 'shown';
  if (/^move \d+ .* your move (find|stop) it$/.test(n)) return 'replay';
  return null;
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── the student and the gift-checker: Stockfish, three lines ────────────────
class Engine {
  constructor() {
    this.proc = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
    this.buf = '';
    this.listeners = [];
    this.proc.stdout.on('data', (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        for (const l of [...this.listeners]) l(line);
      }
    });
    this.send('uci\nsetoption name MultiPV value 3\nisready');
  }
  send(cmd) { this.proc.stdin.write(`${cmd}\n`); }
  /** Ranked lines: [{ uci, cp }] from the side to move, best first. */
  lines(fen, depth = 8) {
    return new Promise((resolve) => {
      const byRank = new Map();
      const done = () => { this.listeners = this.listeners.filter((l) => l !== on); resolve([...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])); };
      const timer = setTimeout(done, 30_000);
      const on = (line) => {
        const m = line.match(/ multipv (\d+) .*score (cp|mate) (-?\d+).* pv (\S+)/);
        if (line.startsWith('info') && m) byRank.set(Number(m[1]), { uci: m[4], cp: m[2] === 'mate' ? (Number(m[3]) > 0 ? 10_000 : -10_000) : Number(m[3]) });
        if (line.startsWith('bestmove')) { clearTimeout(timer); done(); }
      };
      this.listeners.push(on);
      this.send(`position fen ${fen}\ngo depth ${depth}`);
    });
  }
  stop() { try { this.send('quit'); this.proc.kill(); } catch { /* gone */ } }
}

/** The student: Stockfish weakened on purpose (Skill Level), one move. */
class StudentEngine {
  constructor(skill) {
    this.proc = spawn(process.execPath, ['node_modules/stockfish/bin/stockfish.js'], { stdio: ['pipe', 'pipe', 'ignore'] });
    this.buf = '';
    this.listeners = [];
    this.proc.stdout.on('data', (d) => {
      this.buf += d.toString();
      let i;
      while ((i = this.buf.indexOf('\n')) >= 0) {
        const line = this.buf.slice(0, i).trim();
        this.buf = this.buf.slice(i + 1);
        for (const l of [...this.listeners]) l(line);
      }
    });
    this.proc.stdin.write(`uci\nsetoption name Skill Level value ${skill}\nisready\n`);
  }
  move(fen, depth = 8) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.listeners = []; resolve(null); }, 30_000);
      const on = (line) => {
        if (!line.startsWith('bestmove')) return;
        clearTimeout(timer);
        this.listeners = this.listeners.filter((l) => l !== on);
        resolve(line.split(' ')[1] ?? null);
      };
      this.listeners.push(on);
      this.proc.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);
    });
  }
  stop() { try { this.proc.stdin.write('quit\n'); this.proc.kill(); } catch { /* gone */ } }
}

const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
/** Squares of the side's pieces (no pawns, no king) that can be won: attacked
 *  and undefended, or attacked by something cheaper. */
function looseSquares(chess, side) {
  const out = [];
  const foe = side === 'w' ? 'b' : 'w';
  for (const row of chess.board()) for (const cell of row) {
    if (!cell || cell.color !== side || cell.type === 'p' || cell.type === 'k') continue;
    const atk = chess.attackers(cell.square, foe);
    if (atk.length === 0) continue;
    const cheapest = Math.min(...atk.map((sq) => VALUE[chess.get(sq).type]));
    if (chess.attackers(cell.square, side).length === 0 || cheapest < VALUE[cell.type]) out.push(cell.square);
  }
  return out;
}
/** A natural move that leaves the loose piece alone (and takes nothing loose):
 *  the engine's lines first, then any quiet legal move. */
function ignoringMove(chess, lines, loose) {
  const ok = (m) => !loose.includes(m.from) && !loose.includes(m.to) && !m.san.includes('+') && !m.captured;
  for (const l of lines) { const m = toMove(chess.fen(), l.uci); if (m && ok({ ...m, captured: new Chess(chess.fen()).move(m.san).captured })) return l.uci; }
  const quiet = chess.moves({ verbose: true }).find((m) => ok(m));
  return quiet ? `${quiet.from}${quiet.to}${quiet.promotion ?? ''}` : null;
}

function toMove(fen, uci) {
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return m ? { from: m.from, to: m.to, san: m.san, promotion: m.promotion } : null;
  } catch { return null; }
}

// ── page helpers ────────────────────────────────────────────────────────────
const readStore = (page, store) => page.evaluate((name) => new Promise((resolve) => {
  const req = indexedDB.open('ChessAcademyDB');
  req.onsuccess = () => {
    try {
      const all = req.result.transaction(name, 'readonly').objectStore(name).getAll();
      all.onsuccess = () => resolve(all.result);
      all.onerror = () => resolve([]);
    } catch { resolve([]); }
  };
  req.onerror = () => resolve([]);
}), store);

/** Replace the last phase's seed with this one: a focus game at `rung` as the
 *  newest row, so the rung the record reads is that rung. `rung` null removes
 *  the seed only. */
const seedRung = (page, rung, phase) => page.evaluate(({ rung: r, phase: label }) => new Promise((resolve) => {
  const req = indexedDB.open('ChessAcademyDB');
  req.onsuccess = () => {
    try {
      const tx = req.result.transaction('learnFocusResults', 'readwrite');
      const store = tx.objectStore('learnFocusResults');
      const all = store.getAll();
      let wrote = 0;
      all.onsuccess = () => {
        for (const row of all.result) if (String(row.id).startsWith('audit-focus-seed-')) store.delete(row.id);
        if (r !== null) {
          const empty = { posed: 0, found: 0, missed: 0, steered: 0 };
          store.put({ id: `audit-focus-seed-${label}`, gameId: `audit-focus-seed-${label}`, focus: 'tactics', rung: r, atRung: { found: 0, missed: 0 }, tally: { defend: empty, exploit: empty }, presented: null, at: Date.now() });
          wrote += 1;
        }
      };
      tx.oncomplete = () => resolve(wrote);
      tx.onerror = () => resolve(-1);
    } catch { resolve(-1); }
  };
  req.onerror = () => resolve(-1);
}), { rung, phase });

async function dismissModals(page) {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-close"]']) {
    const el = page.locator(sel);
    if (await el.count().then((n) => n > 0).catch(() => false)) await el.first().click({ timeout: 5_000 }).catch(() => {});
  }
}

const bannerState = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-testid="focus-banner"]');
  return el ? { focus: el.getAttribute('data-focus'), rung: el.getAttribute('data-rung'), title: document.querySelector('[data-testid="focus-rung"]')?.textContent ?? null, paused: el.getAttribute('data-paused'), rewind: !!document.querySelector('[data-testid="focus-rewind"]') } : null;
}).catch(() => null);

async function awaitReply(page, chess, ms = 45_000) {
  const mine = placementOf(chess.fen());
  const until = Date.now() + ms;
  let last = null;
  while (Date.now() < until) {
    await sleep(400);
    const now = await readPlacement(page);
    if (Object.keys(now).length === 0 || samePlacement(now, mine)) { last = null; continue; }
    const san = chess.moves({ verbose: true }).find((m) => { const p = new Chess(chess.fen()); p.move(m.san); return samePlacement(placementOf(p.fen()), now); })?.san ?? null;
    if (san && san === last) return san;
    last = san;
  }
  return null;
}

const spoken = (events) => events
  .filter((e) => e.kind === 'coach-narration-spoken' && /voiceService\.speak(Cloud|WebSpeech)/.test(String(e.source ?? '')))
  .map((e) => ({ text: String(e.narrationText ?? '').trim(), at: e.receivedAt ?? e.timestamp ?? 0 }))
  .filter((l) => l.text);

const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

async function playGame(context, listener, engine, student, phase, index) {
  const name = `${phase}-g${index + 1}`;
  const tape = { name, phase, moves: [], pauses: [], notes: [], taps: [], noCastle: index === 0 };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const startEvents = listener.getCapturedEvents().length;
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6_000);
  await dismissModals(page);
  // The rung rows the setup read (the same store, before this game writes).
  tape.rowsBefore = (await readStore(page, 'learnFocusResults')).filter((r) => r.at < startedAt);
  for (let i = 0; i < 40 && !(await bannerState(page))?.focus; i += 1) await sleep(500);
  tape.banner = await bannerState(page);
  // Alternate seats inside a phase: White first.
  const me = index % 2 === 0 ? 'w' : 'b';
  tape.seat = me === 'w' ? 'white' : 'black';
  let chess = new Chess();
  if (me === 'b') {
    await sleep(2_500);   // let the pre-game line land first
    tape.taps.push({ what: 'seat', at: Date.now() });
    await page.locator('[data-testid="color-black-btn"]').click({ timeout: 5_000 }).catch(() => tape.notes.push('black seat tap failed'));
    const opener = await awaitReply(page, chess, 120_000);
    if (opener) { chess.move(opener); tape.moves.push({ by: 'coach', san: opener }); } else tape.notes.push('coach never opened as White');
  }
  let turn = 0;
  let pauseNo = 0;
  let forceBest = false;
  /** "Go back and castle" was tapped: the next move castles. */
  let castleNext = false;
  /** The move to play again on a retry, for a second miss (Show me). */
  let replayMiss = null;
  let looseSeen = 0;
  tape.misses = [];
  /** Every board seen (undone ones too), for the recap replay's board. */
  const seen = [chess.fen()];
  while (turn < MAX_STUDENT_MOVES && !chess.isGameOver() && Date.now() - startedAt < GAME_BUDGET_MS) {
    const fenBefore = chess.fen();
    await sleep(THINK_MS);
    const retry = forceBest;
    forceBest = false;
    // The board poses a loose piece (yours, or theirs to take): every Nth time
    // the student plays past it, as a player with this skill in red does.
    const me2 = chess.turn();
    const loose = [...looseSquares(chess, me2), ...looseSquares(chess, me2 === 'w' ? 'b' : 'w')];
    let uci = null;
    if (!retry && loose.length > 0) {
      looseSeen += 1;
      if (MISS_EVERY > 0 && looseSeen % MISS_EVERY === 0) {
        uci = ignoringMove(chess, await engine.lines(fenBefore), loose);
        if (uci) tape.misses.push({ ply: chess.history().length, loose, uci });
      }
    }
    if (retry && replayMiss) { uci = replayMiss; replayMiss = null; }
    const castlingBack = castleNext;
    if (castleNext) {
      castleNext = false;
      const legal = chess.moves({ verbose: true });
      const castle = legal.find((m) => m.isKingsideCastle()) ?? legal.find((m) => m.isQueensideCastle());
      if (castle) uci = `${castle.from}${castle.to}`;
      else tape.notes.push('castle rewind: no castling move on the board it went back to');
    }
    const planned = uci !== null;
    uci = uci ?? (retry ? (await engine.lines(fenBefore))[0]?.uci : await student.move(fenBefore));
    // PRESS (the tempo run): when the engine lists a check within 60 cp of its
    // best, play it — so runs happen and the run's line, coin and card are
    // exercised on the live surface (a wire that does not fire is not a wire).
    if (PRESS && !planned && !retry) {
      const ls = await engine.lines(fenBefore);
      const best = ls[0]?.cp ?? 0;
      const check = ls.find((l) => { try { return new Chess(fenBefore).move({ from: l.uci.slice(0, 2), to: l.uci.slice(2, 4), promotion: l.uci[4] }).san.includes('+') && best - l.cp <= 60; } catch { return false; } });
      if (check) uci = check.uci;
    }
    // The phase's first game never castles, so the castling watch is posed.
    if (tape.noCastle && !castlingBack && uci && /^e[18][gc][18]$/.test(uci) && new Chess(fenBefore).get(uci.slice(0, 2))?.type === 'k') {
      uci = (await engine.lines(fenBefore)).map((l) => l.uci).find((u) => !(/^e[18][gc][18]$/.test(u) && new Chess(fenBefore).get(u.slice(0, 2))?.type === 'k')) ?? null;
    }
    const mv = uci ? toMove(fenBefore, uci) : null;
    if (!mv) { tape.notes.push(`no student move at ${fenBefore}`); break; }
    const probe = new Chess(fenBefore);
    probe.move(mv.san);
    let earlyReply = null;
    if (!(await clickMove(page, mv, probe.fen()).catch(() => false))) {
      // A fast coach reply can replace the board before the click check reads
      // it: the move landed if the board is it, or it plus one coach move.
      await sleep(1_500);
      const now = await readPlacement(page);
      if (!samePlacement(now, placementOf(probe.fen()))) {
        earlyReply = probe.moves({ verbose: true }).find((r) => { const p = new Chess(probe.fen()); p.move(r.san); return samePlacement(placementOf(p.fen()), now); })?.san ?? null;
        if (!earlyReply) { tape.notes.push(`move ${mv.san} did not land`); break; }
      }
    }
    chess.move(mv.san);
    seen.push(chess.fen());
    tape.moves.push({ by: 'student', san: mv.san, ...(retry ? { retry: true } : {}) });
    // A castling probe holds the move for one engine read: give it time.
    await page.waitForTimeout(900);
    let b = await bannerState(page);
    if (!earlyReply && !b?.rewind) { await page.waitForTimeout(1_600); b = await bannerState(page); }
    if (!earlyReply && b?.rewind) {
      const tryIt = pauseNo % 2 === 0;
      const kind = b.paused || 'miss';
      const button = kind === 'show-me' ? (tryIt ? 'focus-show-me' : 'focus-play-on') : (tryIt ? 'focus-try-again' : 'focus-play-on');
      const chose = kind === 'show-me' ? (tryIt ? 'show-me' : 'play-on') : kind === 'castle' ? (tryIt ? 'castle-back' : 'play-on') : (tryIt ? 'try-again' : 'play-on');
      tape.pauses.push({ at: Date.now(), after: mv.san, ply: chess.history().length, kind, deciding: kind === 'deciding', chose, rung: b.rung, fenAfter: chess.fen() });
      pauseNo += 1;
      await page.locator(`[data-testid="${button}"]`).click({ timeout: 5_000 }).catch(() => tape.notes.push(`${button} missing`));
      await page.waitForTimeout(1_500);
      if (chose === 'try-again') {
        chess.undo();
        tape.moves.push({ by: 'student', san: `(try again: ${mv.san} taken back)` });
        forceBest = true;
        // Every other try again plays the miss again: a second miss, which
        // offers Show me at rung 0 and plays on at rung 1.
        if (kind === 'miss' && pauseNo % 4 === 1) replayMiss = uci;
        continue;
      }
      if (chose === 'castle-back') {
        // The board went back to where castling was ready: rewind the mirror to it.
        const now = await readPlacement(page);
        let undone = 0;
        while (undone < 30 && !samePlacement(placementOf(chess.fen()), now) && chess.history().length > 0) { chess.undo(); undone += 1; }
        tape.moves.push({ by: 'student', san: `(go back and castle: ${undone} plies taken back)` });
        if (!samePlacement(placementOf(chess.fen()), now)) { tape.notes.push('castle rewind: board not found in the game'); break; }
        castleNext = true;
        continue;
      }
    }
    turn += 1;
    if (turn % 10 === 0) console.log(`  [${name}] ${turn} moves, ${tape.pauses.length} pause(s)`);
    if (chess.isGameOver()) break;
    const reply = earlyReply ?? (await awaitReply(page, chess)) ?? (await awaitReply(page, chess, 20_000));
    if (!reply) {
      tape.notes.push(`no coach reply after ${mv.san}`);
      await page.screenshot({ path: `${OUT_DIR}/${name}-stall.png` }).catch(() => {});
      break;
    }
    chess.move(reply);
    seen.push(chess.fen());
    tape.moves.push({ by: 'coach', san: reply });
  }
  tape.gameOver = chess.isGameOver();
  tape.plies = chess.history().length;
  tape.final = chess.fen();
  if (!tape.gameOver) {
    tape.taps.push({ what: 'end', at: Date.now() });
    // A DOM click when Playwright's is refused (an overlapping badge, an
    // animating row) — a harness timing artifact, never a product answer.
    const tapped = await page.locator('[data-testid="teach-resign"]').click({ timeout: 5_000 }).then(() => true).catch(() => false)
      || await page.evaluate(() => { const b = document.querySelector('[data-testid="teach-resign"]'); if (!b || b.hasAttribute('disabled')) return false; b.click(); return true; }).catch(() => false);
    if (!tapped) tape.notes.push('End tap failed (disabled or missing)');
  }
  // The end line, then a rung-up line, are spoken in turn: let both land.
  await page.waitForTimeout(12_000);
  tape.recapFocus = await page.locator('[data-testid="teach-recap-focus"]').textContent({ timeout: 4_000 }).catch(() => null);
  tape.recapRung = await page.locator('[data-testid="teach-recap-rung"]').textContent({ timeout: 1_000 }).catch(() => null);
  tape.recapTempo = await page.locator('[data-testid="teach-recap-tempo"]').evaluate((el) => ({ text: el.textContent, newBest: el.getAttribute('data-new-best') === 'true' }), null, { timeout: 1_000 }).catch(() => null);
  tape.recapMissed = await page.locator('[data-testid="teach-recap-missed"]').allTextContents().catch(() => []);
  // THE RECAP'S PLAY IT OUT: tap the first, find its board in the game, play
  // the engine's moves, and see the card come back.
  tape.replay = null;
  const playOut = page.locator('[data-testid="teach-recap-play-out"]').first();
  if (await playOut.count().then((n) => n > 0).catch(() => false)) {
    tape.taps.push({ what: 'play-out', at: Date.now() });
    await playOut.click({ timeout: 5_000 }).catch(() => tape.notes.push('Play it out tap failed'));
    const started = await page.locator('[data-testid="teach-drill-next-btn"]').waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
    await page.waitForTimeout(1_500);
    const board = await readPlacement(page);
    const fen = seen.find((f) => samePlacement(placementOf(f), board)) ?? null;
    tape.replay = { started, fromGame: !!fen, moves: [], cardBack: false, found: false };
    if (fen) {
      const r = new Chess(fen);
      for (let i = 0; i < 3 && !r.isGameOver(); i += 1) {
        if (!(await page.locator('[data-testid="teach-drill-next-btn"]').count().catch(() => 0))) break;
        const best = (await engine.lines(r.fen(), 12))[0]?.uci;
        const m = best ? toMove(r.fen(), best) : null;
        if (!m) break;
        const after = new Chess(r.fen()); after.move(m.san);
        // The drill's board takes a move once its intro has been said: click
        // again while it has not landed (a real user simply waits).
        // …and once the drill has SPOKEN about the move, it judged it: stop
        // (clicking again repeats the move, and its line, every time).
        const said = () => spoken(listener.getCapturedEvents().slice(startEvents)).length;
        const before = said();
        // A move in the drill the student opened is their own action: its
        // answer is a reply to a tap, never a leak.
        tape.taps.push({ what: 'replay-move', at: Date.now() });
        let landed = await clickMove(page, m, after.fen()).catch(() => false);
        for (let k = 0; !landed && k < 4; k += 1) {
          await page.waitForTimeout(2_000);
          if (samePlacement(await readPlacement(page), placementOf(after.fen()))) { landed = true; break; }
          if (said() > before) break;
          landed = await clickMove(page, m, after.fen()).catch(() => false);
        }
        // A move off the drill's key is taken back while the engine judges it
        // and played again when it is as good (`processDrillMove`): give that
        // read its time before calling it — and tell a refusal from a miss.
        for (let k = 0; !landed && k < 12; k += 1) {
          await page.waitForTimeout(500);
          const now = await readPlacement(page);
          const drillOn = await page.locator('[data-testid="teach-drill-next-btn"]').count().catch(() => 0);
          landed = samePlacement(now, placementOf(after.fen())) || !drillOn;
        }
        if (!landed) { tape.notes.push(`replay move ${m.san} refused by the drill (or did not land)`); break; }
        r.move(m.san);
        tape.replay.moves.push(m.san);
        await page.waitForTimeout(2_500);
        const nowBoard = await readPlacement(page);
        const reply = r.moves({ verbose: true }).find((x) => { const p2 = new Chess(r.fen()); p2.move(x.san); return samePlacement(placementOf(p2.fen()), nowBoard); });
        if (reply) r.move(reply.san);
      }
    }
    tape.replay.cardBack = await page.locator('[data-testid="teach-recap-focus"]').waitFor({ timeout: 15_000 }).then(() => true).catch(() => false);
    tape.replay.found = (await page.locator('[data-testid="teach-recap-played"]').count().catch(() => 0)) > 0;
  }
  const events = listener.getCapturedEvents().slice(startEvents);
  tape.chosen = events.filter((e) => e.kind === 'learn-focus-chosen').map((e) => parse(e.details)).filter(Boolean);
  tape.turns = events.filter((e) => e.kind === 'learn-focus-turn').map((e) => { const r = parse(e.details); return r ? { ...r, at: e.receivedAt ?? e.timestamp ?? 0 } : null; }).filter(Boolean);
  tape.gradeRewards = events.filter((e) => e.kind === 'learn-reward').map((e) => parse(e.details)).filter(Boolean);
  tape.steers = events.filter((e) => e.kind === 'focus-steer').map((e) => ({ fen: e.fen, ...(parse(e.details) ?? {}) }));
  tape.punishes = events.filter((e) => e.kind === 'focus-punish').map((e) => ({ fen: e.fen, ...(parse(e.details) ?? {}) }));
  tape.plants = events.filter((e) => e.kind === 'focus-plant').map((e) => ({ fen: e.fen, ...(parse(e.details) ?? {}) }));
  tape.castle = events.filter((e) => e.kind === 'castle-watch').map((e) => parse(e.details)).filter(Boolean);
  tape.doorRows = events.filter((e) => e.kind === 'learn-turn-decision').flatMap((e) => parse(e.details)?.rows ?? []);
  tape.heldFreePlay = events.filter((e) => e.source === 'learnVoice.held').map((e) => String(e.summary ?? '').slice(0, 160));
  const pickLine = tape.chosen[0]?.line ?? null;
  tape.kingRows = (await readStore(page, 'capabilityEvidence')).filter((r) => r.tag === 'king-stuck-center' && (r.recordedAt ?? 0) >= startedAt).length;
  const tapped = (at) => tape.taps.some((t) => at >= t.at && at <= t.at + 6_000);
  tape.spoken = spoken(events).map((l) => ({ ...l, kind: lineKind(l.text, pickLine) ?? (tapped(l.at) ? 'asked' : null) }));
  const results = (await readStore(page, 'learnFocusResults')).filter((r) => r.at >= startedAt);
  tape.resultRows = results;
  const gameId = results[0]?.gameId ?? null;
  tape.gameRow = gameId ? ((await readStore(page, 'games')).find((g) => g.id === gameId) ?? null) : null;
  if (tape.gameRow) tape.gameRow = { id: tape.gameRow.id, promptedPlies: tape.gameRow.promptedPlies ?? [], steeredPlies: tape.gameRow.steeredPlies ?? [], result: tape.gameRow.result };
  tape.pageErrors = pageErrors;
  await page.screenshot({ path: `${OUT_DIR}/${name}-end.png` }).catch(() => {});
  await page.close();
  return tape;
}

/** A steered coach move that gives material away: the engine's best from the
 *  coach's side against what the played move leaves, both at depth 12. */
async function giftsIn(engine, steers) {
  const out = [];
  for (const s of steers) {
    // A refused steer was never played: the coach kept its own move.
    if (!s.fen || !s.played || s.refused) continue;
    const best = (await engine.lines(s.fen, 12))[0];
    const after = toMove(s.fen, s.played);
    if (!best || !after) continue;
    const b = new Chess(s.fen);
    b.move(after.san);
    const reply = (await engine.lines(b.fen(), 12))[0];
    if (!reply) continue;
    const drop = best.cp - (-reply.cp);
    // A mate scores a flat ±10 000, so passing up a mate while staying
    // decisively ahead read as a 90-pawn "gift" (prod tactics g3, 2026-10-22:
    // …Qa4 from a won position, the coach mating four moves later). Passing
    // up a mate gives no material away; walking into one does.
    const passedMate = Math.abs(best.cp) >= 10_000 && Math.abs(reply.cp) < 10_000 && -reply.cp >= DECIDED_CP;
    out.push({ fen: s.fen, played: after.san, drop, passedMate, gift: drop >= GIFT_CP && !passedMate });
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[run-id] ${RUN_ID}  [target] ${BASE_URL}  [phases] ${PHASES.join(',')}  [games/phase] ${GAMES}  [moves] ${MAX_STUDENT_MOVES}  [student skill] ${SKILL}  [misses every ${MISS_EVERY} loose piece(s)]  [think] ${THINK_MS}ms`);
  const listener = await startAuditListener();
  const engine = new Engine();
  const student = new StudentEngine(SKILL);
  const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
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

  const seed = await context.newPage();
  await seed.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await seed.waitForTimeout(8_000);
  const dropPath = process.env.AUDIT_FIXTURE ?? ['audit-reports/.fixtures/data-drop-david.json'].find((p) => existsSync(p));
  const fixture = dropPath ? await loadFixtureIntoIDB(seed, dropPath) : { loaded: false, reason: 'no data drop on this machine — run scripts/read-data-drop.mjs --latest' };
  console.log(`[fixture] path=${dropPath ?? '-'} ${fixture.loaded ? `${fixture.wrote} rows / ${fixture.stores} stores` : `skipped (${fixture.reason})`}`);
  check('the audit ran on David\'s record', fixture.loaded === true, fixture.loaded ? `${fixture.wrote} rows` : fixture.reason);

  const tapes = [];
  for (const phase of PHASES) {
    const spec = PHASE[phase];
    if (!spec) { console.log(`unknown phase ${phase}`); continue; }
    const wrote = await seedRung(seed, spec.seedRung, phase);
    console.log(`\n══ phase ${phase} — ${spec.seedRung === null ? 'his record as it is' : `seeded ${wrote} focus game at rung ${spec.seedRung}`} ══`);
    for (let i = 0; i < GAMES; i += 1) {
      console.log(`── ${phase} game ${i + 1} ──`);
      const tape = await playGame(context, listener, engine, student, phase, i).catch((e) => ({
        name: `${phase}-g${i + 1}`, phase, seat: null, moves: [], pauses: [], notes: [`crashed: ${String(e).slice(0, 200)}`], taps: [],
        chosen: [], turns: [], steers: [], punishes: [], plants: [], castle: [], kingRows: 0, replay: null, rowsBefore: [], doorRows: [], heldFreePlay: [], spoken: [], resultRows: [], gameRow: null, pageErrors: [String(e).slice(0, 200)], plies: 0,
      }));
      tape.gifts = await giftsIn(engine, tape.steers ?? []);
      tapes.push(tape);
      await writeFile(`${OUT_DIR}/tape-${tape.name}.json`, JSON.stringify(tape, null, 2));
      const pick = tape.chosen[0];
      console.log(`[${tape.name}] seat=${tape.seat} plies=${tape.plies} focus=${pick?.focus ?? '-'} rung=${pick?.rung ?? '-'} (${pick?.reason ?? '-'}, target ply ${pick?.targetPly ?? '-'}) chances=${tape.turns.length} pauses=${tape.pauses.length} steers=${tape.steers.length} punishes=${tape.punishes.length} plants=${(tape.plants ?? []).filter((x) => x.planted).length} castle rows=${(tape.castle ?? []).length}`);
      for (const l of tape.spoken) console.log(`   ${l.kind ?? 'LEAK'} | "${l.text}"`);
      if (tape.notes.length) console.log(`[notes] ${tape.notes.join(' | ')}`);
    }
  }
  await seed.close();
  engine.stop();
  student.stop();

  // ── contracts ──
  const boardPly = (fen) => { const [, side, , , , full] = fen.split(' '); return (Math.max(1, Number(full) || 1) - 1) * 2 + (side === 'b' ? 1 : 0) + 2; };
  for (const t of tapes) {
    const g = t.name;
    const pick = t.chosen[0] ?? null;
    const rung = pick?.rung ?? null;
    check(`${g} F0 the banner names the focus and the rung`, !!pick && t.banner?.focus === pick.focus && t.banner?.rung === String(rung) && t.banner?.title === RUNG_TITLE[rung],
      `banner=${t.banner?.focus ?? '-'} rung ${t.banner?.rung ?? '-'} "${t.banner?.title ?? '-'}"; setup ${pick?.focus ?? '-'} rung ${rung ?? '-'}`);
    const first = t.spoken[0];
    check(`${g} F1 the pre-game line is said first`, !!first && first.kind === 'announce', first ? `"${first.text}"` : 'nothing spoken');
    const leaks = t.spoken.filter((l) => l.kind === null);
    check(`${g} F2 every spoken line is a focus or castling line`, leaks.length === 0,
      leaks.map((l) => `"${l.text.slice(0, 80)}"`).join(' | ') || `${t.spoken.length} line(s): ${Object.entries(t.spoken.reduce((m, l) => ({ ...m, [l.kind]: (m[l.kind] ?? 0) + 1 }), {})).map(([k, n]) => `${k} ${n}`).join(', ')}`);
    const doorSpoke = t.doorRows.filter((r) => (r.spoke ?? []).length > 0);
    const heldWhy = {};
    for (const r of t.doorRows) for (const l of r.held ?? []) { const w = r.heldWhy?.[l] ?? '?'; heldWhy[w] = (heldWhy[w] ?? 0) + 1; }
    check(`${g} F3 the Learn door spoke nothing in a focus game`, doorSpoke.length === 0,
      `${t.doorRows.length} turn row(s); held ${JSON.stringify(heldWhy)}${doorSpoke.length ? `; SPOKE ${doorSpoke.map((r) => (r.spoke ?? []).join('+')).join(', ')}` : ''}; free-play lines dropped by the voice door: ${t.heldFreePlay.length}`);
    const credits = t.turns.filter((r) => r.spoke === 'credit');
    const unasked = credits.filter((r) => !r.prompted);
    check(`${g} F4 every spoken find answers a question said out loud`, unasked.length === 0,
      `${credits.length} credit(s) spoken, ${unasked.length} on a find nobody asked about${unasked.length ? `: ${unasked.map((r) => `ply ${r.ply} ${r.kind}`).join(', ')}` : ''}; ${t.turns.filter((r) => r.outcome === 'found' && r.spoke === 'none').length} silent find(s)`);
    const badRows = t.turns.filter((r) => r.focus !== 'tactics' || r.rung !== rung || !['found', 'missed'].includes(r.outcome) || !['defend', 'exploit'].includes(r.seat) || typeof r.kind !== 'string' || typeof r.difficulty !== 'number' || typeof r.held !== 'boolean');
    check(`${g} F5 every focus chance was decided on the record`, badRows.length === 0,
      `${t.turns.length} row(s): ${t.turns.map((r) => `${r.seat}/${r.kind} d${r.difficulty} ${r.outcome}${r.spoke !== 'none' ? ` (${r.spoke})` : ''}${r.prompted ? ' P' : ''}${r.steered ? ' S' : ''}${r.planted ? ' PL' : ''}${r.retry ? ' R' : ''}${r.held ? ' H' : ''}`).join(', ') || '—'}`);
    const LEVELS = ['beginner', 'intermediate', 'advanced'];
    const levelsOk = !!pick && Array.isArray(pick.levels) && pick.levels.length > 0 && pick.levels.every((l, i) => l === LEVELS[i]);
    const seedRung = SEED_RUNG[pick?.seatStates?.exploit] ?? 0;
    const want = rungFromRows(t.rowsBefore ?? [], seedRung);
    const targetOk = !!pick && pick.targetPly >= TARGET[0] && pick.targetPly <= TARGET[1];
    check(`${g} F6 the rung came from the record`, !!pick && pick.focus === 'tactics' && levelsOk && targetOk && rung === want.rung && pick.reason === want.from && Array.isArray(pick.window),
      pick ? `rung ${rung} (${pick.reason}; the store reads ${want.rung} from ${want.from}); window ${pick.window.length} game(s); seats ${JSON.stringify(pick.seatStates)}; levels ${JSON.stringify(pick.levels)}; target ply ${pick.targetPly}` : 'no learn-focus-chosen row');
    const gifts = (t.gifts ?? []).filter((x) => x.gift);
    const refusedSteers = (t.steers ?? []).filter((x) => x.refused);
    check(`${g} F7 no steered coach move gave material away`, gifts.length === 0,
      `${(t.gifts ?? []).length} steer(s) checked${gifts.length ? `; GIFTS ${gifts.map((x) => `${x.played} −${x.drop}`).join(', ')}` : ''}; ${refusedSteers.length} refused on the deeper read${refusedSteers.length ? ` (${refusedSteers.map((x) => `${x.refused} ${x.deepCost}cp`).join(', ')})` : ''}`);
    // F8: a miss that stands is punished — Play on at rungs 0–1, every miss at 2–3.
    const standing = rung !== null && rung >= 2
      ? t.turns.filter((r) => r.outcome === 'missed' && !r.retry).map((r) => r.ply)
      : t.pauses.filter((p) => (p.chose === 'play-on' || p.chose === 'show-me') && p.kind !== 'deciding' && p.kind !== 'castle').map((p) => p.ply);
    // A punish is read on the board after the miss (the coach to move): the
    // miss is that board's last ply, 1-based — the runner's and the record's
    // count (`boardPly` is the ply the user's NEXT move will have).
    const punishedAt = new Set(t.punishes.map((x) => (x.fen ? boardPly(x.fen) - 2 : -1)));
    if (standing.length > 0) {
      const ok = standing.filter((ply) => punishedAt.has(ply));
      check(`${g} F8 a miss left standing was punished`, ok.length === standing.length, `${ok.length}/${standing.length} standing miss(es) punished (plies ${standing.join(',')})`);
    }
    const result = t.resultRows[0] ?? null;
    check(`${g} F9 one learnFocusResults row, at the rung`, t.resultRows.length === 1 && result.focus === 'tactics' && result.rung === rung && !!result.atRung && 'presented' in result,
      t.resultRows.map((r) => `${r.focus} rung ${r.rung} atRung ${r.atRung?.found}/${(r.atRung?.found ?? 0) + (r.atRung?.missed ?? 0)} yours ${r.tally?.exploit?.found}/${r.tally?.exploit?.posed} theirs ${r.tally?.defend?.found}/${r.tally?.defend?.posed} presented ${JSON.stringify(r.presented)}`).join('; ') || 'no row');
    // ONE DECISION per (rewind epoch, ply): "Go back and castle" replays plies
    // (the look-ahead's rewind replays the SAME ply), so each tap starts a new
    // epoch — by time, the rows and the taps on one clock. A chance stood when
    // its LAST row at its decision is a miss — a retry (or a retry's judgement
    // of the other chances the move missed) can turn it around.
    const castleTaps = t.pauses.filter((p) => p.chose === 'castle-back').map((p) => p.at ?? 0);
    const decided = t.turns.map((r) => ({ ...r, decision: `${castleTaps.filter((at) => at < r.at).length}:${r.ply}` }));
    // Two loose pieces of one kind at one move are two rows of one key: count
    // the first-move misses, less those a retry found.
    const groups = new Map();
    for (const r of decided) {
      const k = `${r.decision}:${r.seat}:${r.kind}:${r.tag}`;
      const gr = groups.get(k) ?? { missed: 0, foundOnRetry: 0 };
      if (!r.retry && r.outcome === 'missed') gr.missed += 1;
      if (r.retry && r.outcome === 'found') gr.foundOnRetry += 1;
      groups.set(k, gr);
    }
    const missedOnRecord = [...groups.values()].reduce((n, gr) => n + Math.max(0, gr.missed - gr.foundOnRetry), 0);
    const rungUp = /^Tactics: [A-Za-z ]+!/.test(t.recapRung ?? '');
    const progressOk = rungUp ? t.spoken.some((l) => l.kind === 'rung-up') : rung === 3 ? !t.recapRung : /^\d of 3 finds to /.test(t.recapRung ?? '');
    check(`${g} F9 the card shows the end line, the rung progress and the missed chances`,
      /^Tactics today: .*Review has the rest\./.test(t.recapFocus ?? '') && progressOk && (missedOnRecord === 0 || (t.recapMissed ?? []).length === missedOnRecord),
      `"${t.recapFocus ?? 'no card'}" · progress "${t.recapRung ?? '—'}"${rungUp ? ` (a rung-up: ${t.spoken.some((l) => l.kind === 'rung-up') ? 'said' : 'NOT SAID'})` : ''} · ${(t.recapMissed ?? []).length} missed on the card (${missedOnRecord} stood on the record)`);
    const promptedRows = t.turns.filter((r) => r.prompted);
    const missing = t.gameRow ? promptedRows.filter((r) => !(t.gameRow.promptedPlies ?? []).includes(r.ply)) : promptedRows;
    if (promptedRows.length > 0) check(`${g} F10 every prompted chance is on promptedPlies`, !!t.gameRow && missing.length === 0, t.gameRow ? `${promptedRows.length} prompted row(s); promptedPlies ${JSON.stringify(t.gameRow.promptedPlies)}` : 'no game row');
    const foundAt = [...new Set(decided.filter((r) => r.outcome === 'found').map((r) => r.decision))];
    const owedAt = (d) => (decided.some((r) => r.decision === d && r.retry && r.outcome === 'found' && r.reward) || !decided.some((r) => r.decision === d && r.outcome === 'missed' && !r.retry) ? 1 : 0);
    const payRight = foundAt.map((d) => decided.filter((r) => r.decision === d && r.outcome === 'found' && r.reward).length === owedAt(d));
    const missPaid = t.turns.filter((r) => r.outcome !== 'found' && r.reward);
    const retryWrong = t.turns.filter((r) => r.retry && r.outcome === 'found' && r.reward !== 'missionRetry');
    const offFocus = (t.gradeRewards ?? []).filter((r) => r.earned);
    check(`${g} F11 the rewards are the focus's own`, payRight.every(Boolean) && missPaid.length === 0 && retryWrong.length === 0 && offFocus.length === 0,
      `${foundAt.length} find move(s), paid right ${payRight.filter(Boolean).length} (${[...new Set(t.turns.map((r) => r.reward).filter(Boolean))].join(',') || 'none'}); misses paid ${missPaid.length}; retry finds not the smaller celebration ${retryWrong.length}; off-focus rewards ${offFocus.length}`);
    const locked = t.turns.filter((r) => r.level && !(pick?.levels ?? []).includes(r.level));
    check(`${g} F12 only open motif levels were asked`, locked.length === 0,
      `${t.turns.length} chance(s): ${[...new Set(t.turns.map((r) => `${r.tag ?? '?'}${r.level ? `@${r.level}` : ''}`))].join(', ') || '—'}${locked.length ? `; LOCKED ASKED ${locked.map((r) => r.tag).join(', ')}` : ''}`);
    // F13 — presented every game, harder by the record.
    const plants = (t.plants ?? []).filter((x) => x.planted && x.fen).map((x) => ({ ...x, ply: boardPly(x.fen) }));
    const presented = result?.presented ?? null;
    const lastPly = t.plies ?? 0;
    const target = pick?.targetPly ?? TARGET[0];
    // Rung 3 falls back for the game five moves past the target (TOP_RUNG_GRACE_PLIES).
    const wantD = (ply) => (rung === 3 && ply >= target + 10 ? 2 : ply >= EASIER_FROM_PLY && rung > 0 ? rung - 1 : rung);
    const excused = !presented && lastPly < target + 8 ? `the game ended at ply ${lastPly}, before the target (${target}) had room` : null;
    const tooEasy = presented && presented.difficulty < wantD(presented.ply);
    const early = plants.filter((x) => x.ply < target);
    const close = plants.filter((x, i) => i > 0 && x.ply - plants[i - 1].ply < 8);
    const tooMany = rung !== null && plants.length > RUNG_CHANCES[rung];
    const earlyExtra = plants.filter((x) => x.extra && x.ply < SECOND_CHANCE_PLY);
    const flipWrong = plants.filter((x) => x.seat === 'defend' && !x.extra);
    const plantedRows = t.turns.filter((r) => r.planted);
    const fullWeight = plantedRows.filter((r) => r.outcome === 'found' && !r.steered);
    const wrongAsk = (t.plants ?? []).filter((x) => x.fen && ((typeof x.difficulty === 'number' && x.difficulty !== wantD(boardPly(x.fen))) || x.rung !== rung));
    t.presented = { presented: !!presented, excused: !!excused, rung };
    check(`${g} F13 the focus is presented every game, harder by the record`, !!result && (!!presented || !!excused) && !tooEasy && early.length === 0 && close.length === 0 && !tooMany && earlyExtra.length === 0 && flipWrong.length === 0 && fullWeight.length === 0 && wrongAsk.length === 0,
      `rung ${rung}, target ply ${target}; ${presented ? `presented at ply ${presented.ply}, difficulty ${presented.difficulty}` : `NOT presented${excused ? ` — ${excused}` : ' — the guarantee failed'}`}; ${plants.length} plant(s): ${plants.map((x) => `${x.planted}@${x.ply} ${x.seat ?? '?'} d${x.difficulty ?? '?'}${x.extra ? ' extra' : ''} ${x.tag ?? '?'}${x.ask ? ` (asked ${x.ask})` : ''}`).join(', ') || '—'}; ${(t.plants ?? []).filter((x) => !x.planted).length} ask(s) found no slip (${[...new Set((t.plants ?? []).filter((x) => !x.planted).flatMap((x) => Object.keys(x.scan ?? {})))].join(',') || '—'})${tooEasy ? '; PRESENTED BELOW THE RUNG' : ''}${early.length ? `; BEFORE THE TARGET ${early.map((x) => x.ply)}` : ''}${close.length ? `; TOO CLOSE ${close.map((x) => x.ply)}` : ''}${tooMany ? '; MORE THAN THE RUNG\'S CHANCES' : ''}${earlyExtra.length ? `; EXTRA BEFORE MOVE 15 ${earlyExtra.map((x) => x.ply)}` : ''}${flipWrong.length ? `; A FLIP AS THE GUARANTEE ${flipWrong.map((x) => x.ply)}` : ''}${fullWeight.length ? `; FULL-WEIGHT FIND ${fullWeight.map((r) => r.ply)}` : ''}${wrongAsk.length ? `; ASKED THE WRONG RUNG ${wrongAsk.map((x) => `${boardPly(x.fen)}:d${x.difficulty}`)}` : ''}`);
    // F14 — the castling watch blames the king only on the read.
    const castle = t.castle ?? [];
    const stops = castle.filter((c) => c.verdict === 'stop');
    const stopOk = (c) => {
      const base = c.drop >= 100 && c.losing === (c.realCp <= -300) && c.side && typeof c.bestCp === 'number' && typeof c.attack === 'boolean'
        && (c.rewindPly === null ? c.rewindMoves === null : c.rewindMoves >= 1 && c.rewindMoves <= 3);
      if (c.why === 'urgent') return base && c.rewindPly === c.ply && c.rewindMoves === 1 && c.whatIfCp === null;
      if (c.why === 'what-if') return base && typeof c.whatIfCp === 'number' && c.gain >= c.drop;
      return false;
    };
    const badStops = stops.filter((c) => !stopOk(c));
    const stopTexts = t.spoken.filter((l) => l.kind === 'castle-stop');
    const askOk = (c, line) => (c.rewindMoves === null ? !/want to/i.test(line.text)
      : c.rewindMoves === 1 ? /Want to take that move back and castle\?$/.test(line.text)
        : new RegExp(`Want to go back ${['', 'one', 'two', 'three'][c.rewindMoves]} moves and castle\\?$`).test(line.text));
    const askBad = stops.filter((c, k) => stopTexts[k] && !askOk(c, stopTexts[k]));
    const reminders = castle.filter((c) => c.verdict === 'reminder');
    const reminderLines = t.spoken.filter((l) => l.kind === 'castle-reminder').length;
    const lateReminder = reminders.filter((c) => c.ply > 24);
    const quietBad = castle.filter((c) => c.verdict === 'quiet' && c.drop >= 100 && c.gain >= c.drop);
    const backs = t.pauses.filter((p) => p.kind === 'castle');
    const rewindOk = backs.every(() => stops.some((c) => c.rewindPly !== null));
    check(`${g} F14 the castling watch blames the king only on the read`, badStops.length === 0 && askBad.length === 0 && quietBad.length === 0 && stopTexts.length === stops.length && reminders.length <= 1 && reminderLines === reminders.length && lateReminder.length === 0 && t.kingRows >= stops.length && rewindOk,
      `${castle.length} row(s): ${castle.map((c) => `ply ${c.ply} ${c.verdict}${c.why ? `/${c.why}` : ''}${c.drop !== null ? ` cost ${c.drop}${c.gain !== null ? ` held ${c.gain}` : ''}` : ''}${c.verdict === 'stop' ? ` ${c.losing ? 'losing' : 'cost'}/${c.attack ? 'attack' : 'quiet'} rewind ${c.rewindPly ?? '—'}${c.rewindMoves ? ` (${c.rewindMoves} move${c.rewindMoves > 1 ? 's' : ''})` : ''}` : ''}`).join('; ') || '— (not posed this game)'}; ${stopTexts.length} STOP line(s), ${reminderLines} reminder(s), ${t.kingRows} king-stuck-center row(s); ${backs.length} castle pause(s): ${backs.map((p) => p.chose).join(',') || '—'}${t.noCastle ? '; this game never castled' : ''}${badStops.length ? `; BAD STOP ${badStops.map((c) => c.ply)}` : ''}${askBad.length ? `; THE ASK DOES NOT NAME THE COUNT ${askBad.map((c) => c.ply)}` : ''}${quietBad.length ? `; A QUIET ROW THAT SHOULD HAVE STOPPED ${quietBad.map((c) => c.ply)}` : ''}`);
    // F15 — the tier is the rung.
    const missPauses = t.pauses.filter((p) => p.kind === 'miss' || p.kind === 'show-me');
    const showMe = t.pauses.filter((p) => p.kind === 'show-me');
    const shownUnasked = t.spoken.filter((l) => l.kind === 'shown').length > showMe.filter((p) => p.chose === 'show-me').length;
    const tierOk = rung === null ? false
      : rung >= 2 ? missPauses.length === 0 && t.turns.every((r) => !r.held)
        : rung === 1 ? showMe.length === 0
          : true;
    check(`${g} F15 the tier is the rung`, tierOk && !shownUnasked,
      `rung ${rung}: ${missPauses.length} miss pause(s), ${showMe.length} Show me offer(s) (${showMe.filter((p) => p.chose === 'show-me').length} tapped), ${t.spoken.filter((l) => l.kind === 'shown').length} answer(s) shown${shownUnasked ? '; AN ANSWER SHOWN WITHOUT THE TAP' : ''}`);
    // F16 — the recap's Play it out.
    if ((t.recapMissed ?? []).length > 0) {
      const r = t.replay;
      check(`${g} F16 the recap's Play it out starts from the board before the miss, and the card comes back`, !!r && r.started && r.fromGame && r.cardBack,
        r ? `started ${r.started}, a board from this game ${r.fromGame}, played ${r.moves.join(' ') || '—'}, card back ${r.cardBack}, marked found ${r.found}` : 'no Play it out tapped');
    }
    // F17 — the tempo run (David 2026-10-22: "you HAD them on the run!").
    const runRow = t.resultRows[0]?.tempoRun;
    const bestBefore = (t.rowsBefore ?? []).reduce((m, r) => Math.max(m, r.tempoRun ?? 0), 0);
    const runLines = t.spoken.filter((l) => l.kind === 'tempo-had' || l.kind === 'tempo-let-off');
    const wantNewBest = typeof runRow === 'number' && runRow >= 2 && runRow > bestBefore;
    const cardOk = typeof runRow === 'number' && (runRow >= 2
      ? !!t.recapTempo && (t.recapTempo.text ?? '').startsWith(`Longest tempo run: ${runRow}`) && t.recapTempo.newBest === wantNewBest
      : !t.recapTempo);
    check(`${g} F17 the tempo run is on the record and the card, said only when a run ended`, cardOk && (runLines.length === 0 || runRow >= 2),
      `longest ${runRow ?? '—'} (best before ${bestBefore}); card ${t.recapTempo ? `"${t.recapTempo.text}"${t.recapTempo.newBest ? ' NEW BEST' : ''}` : '—'}; ${runLines.length} tempo line(s): ${runLines.map((l) => l.kind).join(', ') || '—'}`);
    check(`${g} no page errors`, (t.pageErrors ?? []).length === 0, (t.pageErrors ?? []).slice(0, 3).join(' | '));
  }
  for (const r of [0, 1, 2, 3]) {
    const at = tapes.filter((t) => t.presented?.rung === r);
    if (at.length === 0) continue;
    const owed = at.filter((t) => !t.presented.excused);
    const shown = owed.filter((t) => t.presented.presented);
    console.log(`  arrival at rung ${r}: presented in ${shown.length} of ${owed.length} game(s) that owed it (${at.length - owed.length} ended first)`);
  }
  const gameLines = tapes.map((t) => t.spoken.filter((l) => l.kind !== 'asked').length);
  const avg = gameLines.length ? gameLines.reduce((a, b) => a + b, 0) / gameLines.length : 0;
  console.log(`  lines per game (reported, no target — they track misses): average ${avg.toFixed(1)} over ${gameLines.length} game(s): ${gameLines.join(', ')}`);
  check('no billable request (muted)', billable.length === 0, `${billable.length} aborted`);

  // ── the transcript: the LINES, not the count ──
  const perFocus = {};
  for (const t of tapes) {
    const f = t.chosen[0] ? `rung ${t.chosen[0].rung} (${RUNG_TITLE[t.chosen[0].rung]})` : 'none';
    const p = (perFocus[f] ??= { games: 0, defend: { posed: 0, found: 0 }, exploit: { posed: 0, found: 0 }, steered: 0, lines: 0 });
    p.games += 1;
    p.lines += t.spoken.filter((l) => l.kind !== 'asked').length;
    for (const r of t.turns) { p[r.seat].posed += 1; if (r.outcome === 'found') p[r.seat].found += 1; if (r.steered) p.steered += 1; }
  }
  const transcript = tapes.map((t) => {
    const pick = t.chosen[0];
    const heldWhy = {};
    for (const r of t.doorRows) for (const l of r.held ?? []) { const w = r.heldWhy?.[l] ?? '?'; heldWhy[w] = (heldWhy[w] ?? 0) + 1; }
    return [
      `## ${t.name} — ${t.seat}, ${t.plies} plies${t.gameOver ? ' (game over)' : ' (ended at the move cap)'}`,
      `focus: ${pick ? `${pick.focus} at rung ${pick.rung} (${pick.reason}; seats ${JSON.stringify(pick.seatStates)}; target ply ${pick.targetPly})` : '—'}`,
      'spoken:',
      ...t.spoken.map((l) => `- [${l.kind ?? 'LEAK'}] ${l.text}`),
      `chances: ${t.turns.map((r) => `ply ${r.ply} ${r.seat}/${r.kind} d${r.difficulty} ${r.outcome}${r.spoke !== 'none' ? ` (${r.spoke})` : ''}${r.prompted ? ' prompted' : ''}${r.steered ? ' steered' : ''}${r.planted ? ' planted' : ''}${r.retry ? ' retry' : ''}`).join('; ') || '—'}`,
      `pauses: ${t.pauses.map((p) => `${p.after} → ${p.kind}: ${p.chose}`).join('; ') || '—'}`,
      `castling watch: ${(t.castle ?? []).map((c) => `ply ${c.ply} ${c.verdict}${c.drop !== null ? ` (cost ${c.drop}, castled holds ${c.gain})` : ''}`).join('; ') || '—'}`,
      `recap: progress "${t.recapRung ?? '—'}"; missed ${(t.recapMissed ?? []).join(' | ') || '—'}; play it out ${t.replay ? JSON.stringify(t.replay) : '—'}`,
      `student played past a loose piece: ${(t.misses ?? []).map((x) => `ply ${x.ply} ${x.uci} (loose ${x.loose.join(',')})`).join('; ') || '—'}`,
      `steers: ${(t.gifts ?? []).map((x) => `${x.played} (${x.passedMate ? 'passed up a mate, still winning' : `${x.drop >= 0 ? '−' : '+'}${Math.abs(x.drop)}cp`})`).join(', ') || '—'} · punishes: ${t.punishes.map((x) => x.played).join(', ') || '—'}`,
      `door held: ${JSON.stringify(heldWhy)} · free-play lines dropped: ${t.heldFreePlay.length}`,
      `result row: ${t.resultRows.map((r) => JSON.stringify({ focus: r.focus, rung: r.rung, atRung: r.atRung, presented: r.presented, tally: r.tally })).join(' ') || '—'}`,
      `card: ${t.recapFocus ?? '—'}`,
      `moves: ${t.moves.map((m) => m.san).join(' ')}`,
      `notes: ${t.notes.join(' | ') || '—'}`,
    ].join('\n');
  }).join('\n\n');
  const summary = Object.entries(perFocus).map(([f, p]) => `- ${f}: ${p.games} game(s), ${(p.lines / p.games).toFixed(1)} lines/game, defend ${p.defend.found}/${p.defend.posed} found, exploit ${p.exploit.found}/${p.exploit.posed} found, ${p.steered} steered`).join('\n');
  await writeFile(`${OUT_DIR}/transcript-${RUN_TAG}.md`, `# Learn focus (tactics, by rung) — ${RUN_ID} on ${BASE_URL}\n\n## Per focus\n\n${summary}\n\n${transcript}\n`);
  const failed = results.filter((r) => !r.pass);
  await writeFile(`${OUT_DIR}/report-${RUN_TAG}.json`, JSON.stringify({ runId: RUN_ID, baseUrl: BASE_URL, perFocus, results, at: new Date().toISOString() }, null, 2));
  console.log(`\n${summary}\n\n${results.length - failed.length}/${results.length} checks green — report at ${OUT_DIR}/report-${RUN_TAG}.json, transcript at ${OUT_DIR}/transcript-${RUN_TAG}.md`);
  await browser.close();
  await listener.stop?.();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
