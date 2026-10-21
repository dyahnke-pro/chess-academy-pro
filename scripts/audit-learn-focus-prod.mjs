#!/usr/bin/env node
/**
 * audit-learn-focus-prod — WO-LEARN-FOCUS-01, PLAYED on David's record.
 *
 * Learn free play (`/coach/teach`) teaches ONE focus per game, picked from the
 * user's record. This drives real games on an emulated iPhone with David's
 * data drop loaded, muted, three instruments together: Playwright plays, the
 * narration listener hears every spoken line, and the app's own audit rows and
 * Dexie record decide.
 *
 * Three phases, each a few games, because David's record leaves every focus
 * red and the ladder gates tactics and the kings behind loose pieces:
 *   record  — his record as it is (expect loose pieces);
 *   tactics — loose pieces and the kings seeded GREEN (20 unprompted holds
 *             per tag, the newest on the record), so tactics is the only
 *             focus open;
 *   kings   — loose pieces and tactics seeded green, so the kings are.
 * Each phase removes the last phase's seed first. Seeds are marked
 * `audit-focus-seed-*` and live only in the audit browser.
 *
 * The student is Stockfish (depth 8, three lines): its best move, but the
 * second-best every fourth turn and the third-best every fourth turn after
 * that, so it misses what a club player misses. On a focus pause it takes
 * "Try again" and "Play on" in turn; after Try again it plays its best move.
 * At the move cap it taps End, which saves the game and ends the focus.
 *
 * Contracts (per game unless said):
 *   F0 the focus banner names the picked focus;
 *   F1 the pre-game line is the first thing said;
 *   F2 every spoken line is a focus line (announce / ask / clue / credit /
 *      shown / deciding / end) — a tapped button's answer (the seat, End) is
 *      reported apart;
 *   F3 the Learn door spoke nothing — every lane held as focus-voice or
 *      off-focus (the counts are reported);
 *   F4 the average spoken lines per game sits in 8–15 (an average, never a cap);
 *   F5 every focus chance was decided on the record (the turn rows);
 *   F6 the focus came from the record (the chosen row matches the phase);
 *   F7 no coach move steered into the focus gave material away (engine-checked);
 *   F8 a miss left standing (Play on) was punished;
 *   F9 one learnFocusResults row per game, and the card shows the end line;
 *   F10 every prompted chance is on the game's promptedPlies;
 *   no page errors; muted, every billable request aborted and counted.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-learn-focus-prod.mjs
 *   AUDIT_PHASES=record AUDIT_GAMES=1 AUDIT_MOVES=20 …   (a quick look)
 *   A full run is ~80 min: run one phase per process (AUDIT_PHASES=record,
 *   then tactics, then kings); each writes report-<phase>.json and
 *   transcript-<phase>.md.
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
const OUT_DIR = 'audit-reports/learn-focus-01';
const PHASES = (process.env.AUDIT_PHASES ?? 'record,tactics,kings').split(',').map((s) => s.trim()).filter(Boolean);
const GAMES = Number(process.env.AUDIT_GAMES ?? 3);
const MAX_STUDENT_MOVES = Number(process.env.AUDIT_MOVES ?? 40);
/** One report per phase set, so phases run as separate processes do not
 *  overwrite each other (a full run is ~80 min; run a phase per process). */
const RUN_TAG = PHASES.join('-');
const GAME_BUDGET_MS = 14 * 60_000;
const GIFT_CP = 200;

const TAGS = {
  loose: ['hung-material', 'missed-opponents-threat', 'missed-tactic'],
  tactics: ['missed-their-fork', 'missed-their-pin', 'missed-their-skewer', 'missed-their-discovery', 'missed-tactic', 'calculation-depth'],
  kings: ['king-stuck-center', 'weakened-king-safety', 'missed-their-mate', 'missed-tactic', 'overvalued-attack'],
};
const PHASE = {
  record: { seed: [], expect: 'loose-pieces' },
  tactics: { seed: [...TAGS.loose, ...TAGS.kings], expect: 'tactics' },
  kings: { seed: [...TAGS.loose, ...TAGS.tactics], expect: 'kings' },
};

// The focus's fixed phrasing (src/coach/focus/focusLines.ts, focusCard.ts),
// normalised. A spoken line is a focus line when it matches one of these.
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const ASKS = new Set([
  'Count their defenders — is anything of theirs loose?', 'Is anything of theirs loose?', 'Is everything of yours safe?',
  'Check your pieces — is anything loose?', 'Checks and captures first — is there a shot?', 'Is there a forcing move here?',
  'What does their last move threaten?', 'What is their last move aiming at?', 'How safe is your king right now?',
  'Look at their king — what do your checks do?',
].map(norm));
const FOCUS_STARTS = ['hold on', 'there it is', 'good ', 'yes ', 'the arrow shows', 'castling was the move', 'that one decides the game',
  'one skill is being watched today', 'today ', 'today s hidden focus', 'their ', 'loose pieces today', 'tactics today', 'the kings today'].map(norm);
function lineKind(text, pickLine) {
  const n = norm(text);
  if (pickLine && n === norm(pickLine)) return 'announce';
  if (ASKS.has(n)) return 'ask';
  if (n.endsWith('review has the rest')) return 'end';
  if (n.startsWith('hold on')) return 'clue';
  if (/^(there it is|good|yes) /.test(n)) return 'credit';
  if (n.startsWith('that one decides the game')) return 'deciding';
  if (n.startsWith('the arrow shows') || n.startsWith('castling was the move') || /was the shot|was free the arrow takes it|starts mate in/.test(n)) return 'shown';
  if (FOCUS_STARTS.some((s) => n.startsWith(s))) return 'focus?';
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

/** Replace the last phase's seed with this one: 20 unprompted holds per tag,
 *  recorded now, so they are the newest 20 the hold rate reads (green). */
const seedGreen = (page, tags, phase) => page.evaluate(({ tags: tagList, phase: label }) => new Promise((resolve) => {
  const req = indexedDB.open('ChessAcademyDB');
  req.onsuccess = () => {
    try {
      const tx = req.result.transaction('capabilityEvidence', 'readwrite');
      const store = tx.objectStore('capabilityEvidence');
      const all = store.getAll();
      let wrote = 0;
      all.onsuccess = () => {
        for (const r of all.result) if (String(r.id).startsWith('audit-focus-seed-')) store.delete(r.id);
        const now = Date.now();
        for (const tag of tagList) {
          for (let i = 0; i < 20; i += 1) {
            const id = `audit-focus-seed-${label}-${tag}-${i}`;
            store.put({
              id, tag, outcome: 'held', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', playedSan: 'e4',
              posedImportance: 90, recordedAt: now - (20 - i) * 1000, origin: 'play', prompted: false, sourceGameId: id,
            });
            wrote += 1;
          }
        }
      };
      tx.oncomplete = () => resolve(wrote);
      tx.onerror = () => resolve(-1);
    } catch { resolve(-1); }
  };
  req.onerror = () => resolve(-1);
}), { tags, phase });

async function dismissModals(page) {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-close"]']) {
    const el = page.locator(sel);
    if (await el.count().then((n) => n > 0).catch(() => false)) await el.first().click({ timeout: 5_000 }).catch(() => {});
  }
}

const bannerState = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-testid="focus-banner"]');
  return el ? { focus: el.getAttribute('data-focus'), announced: el.getAttribute('data-announced'), paused: el.getAttribute('data-paused'), rewind: !!document.querySelector('[data-testid="focus-rewind"]') } : null;
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

async function playGame(context, listener, engine, phase, index) {
  const name = `${phase}-g${index + 1}`;
  const tape = { name, phase, moves: [], pauses: [], notes: [], taps: [] };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const startEvents = listener.getCapturedEvents().length;
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6_000);
  await dismissModals(page);
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
  while (turn < MAX_STUDENT_MOVES && !chess.isGameOver() && Date.now() - startedAt < GAME_BUDGET_MS) {
    const fenBefore = chess.fen();
    const ranked = (await engine.lines(fenBefore)).map((l) => l.uci);
    const rank = forceBest ? 0 : turn % 8 === 3 ? 1 : turn % 8 === 7 ? 2 : 0;
    forceBest = false;
    const uci = ranked[Math.min(rank, ranked.length - 1)];
    const mv = uci ? toMove(fenBefore, uci) : null;
    if (!mv) { tape.notes.push(`no student move at ${fenBefore}`); break; }
    const probe = new Chess(fenBefore);
    probe.move(mv.san);
    if (!(await clickMove(page, mv, probe.fen()).catch(() => false))) { tape.notes.push(`move ${mv.san} did not land`); break; }
    chess.move(mv.san);
    tape.moves.push({ by: 'student', san: mv.san, rank: rank + 1 });
    await page.waitForTimeout(900);
    const b = await bannerState(page);
    if (b?.rewind) {
      const tryIt = pauseNo % 2 === 0;
      const deciding = b.paused === 'deciding';
      tape.pauses.push({ after: mv.san, ply: chess.history().length - 1, deciding, chose: tryIt ? 'try-again' : 'play-on', fenAfter: chess.fen() });
      pauseNo += 1;
      await page.locator(`[data-testid="${tryIt ? 'focus-try-again' : 'focus-play-on'}"]`).click({ timeout: 5_000 }).catch(() => tape.notes.push('rewind button missing'));
      await page.waitForTimeout(1_200);
      if (tryIt) {
        chess.undo();
        tape.moves.push({ by: 'student', san: `(try again: ${mv.san} taken back)` });
        forceBest = true;
        continue;
      }
    }
    turn += 1;
    if (turn % 10 === 0) console.log(`  [${name}] ${turn} moves, ${tape.pauses.length} pause(s)`);
    if (chess.isGameOver()) break;
    const reply = (await awaitReply(page, chess)) ?? (await awaitReply(page, chess, 20_000));
    if (!reply) {
      tape.notes.push(`no coach reply after ${mv.san}`);
      await page.screenshot({ path: `${OUT_DIR}/${name}-stall.png` }).catch(() => {});
      break;
    }
    chess.move(reply);
    tape.moves.push({ by: 'coach', san: reply });
  }
  tape.gameOver = chess.isGameOver();
  tape.plies = chess.history().length;
  tape.final = chess.fen();
  if (!tape.gameOver) {
    tape.taps.push({ what: 'end', at: Date.now() });
    await page.locator('[data-testid="teach-resign"]').click({ timeout: 5_000 }).catch(() => tape.notes.push('End tap failed'));
  }
  await page.waitForTimeout(5_000);
  tape.recapFocus = await page.locator('[data-testid="teach-recap-focus"]').textContent({ timeout: 4_000 }).catch(() => null);
  const events = listener.getCapturedEvents().slice(startEvents);
  tape.chosen = events.filter((e) => e.kind === 'learn-focus-chosen').map((e) => parse(e.details)).filter(Boolean);
  tape.turns = events.filter((e) => e.kind === 'learn-focus-turn').map((e) => parse(e.details)).filter(Boolean);
  tape.steers = events.filter((e) => e.kind === 'focus-steer').map((e) => ({ fen: e.fen, ...(parse(e.details) ?? {}) }));
  tape.punishes = events.filter((e) => e.kind === 'focus-punish').map((e) => ({ fen: e.fen, ...(parse(e.details) ?? {}) }));
  tape.doorRows = events.filter((e) => e.kind === 'learn-turn-decision').flatMap((e) => parse(e.details)?.rows ?? []);
  tape.heldFreePlay = events.filter((e) => e.source === 'learnVoice.held').map((e) => String(e.summary ?? '').slice(0, 160));
  const pickLine = tape.chosen[0]?.line ?? null;
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
    if (!s.fen || !s.played) continue;
    const best = (await engine.lines(s.fen, 12))[0];
    const after = toMove(s.fen, s.played);
    if (!best || !after) continue;
    const b = new Chess(s.fen);
    b.move(after.san);
    const reply = (await engine.lines(b.fen(), 12))[0];
    if (!reply) continue;
    const drop = best.cp - (-reply.cp);
    out.push({ fen: s.fen, played: after.san, drop, gift: drop >= GIFT_CP });
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[run-id] ${RUN_ID}  [target] ${BASE_URL}  [phases] ${PHASES.join(',')}  [games/phase] ${GAMES}  [moves] ${MAX_STUDENT_MOVES}`);
  const listener = await startAuditListener();
  const engine = new Engine();
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
    const wrote = await seedGreen(seed, spec.seed, phase);
    console.log(`\n══ phase ${phase} — seeded ${wrote} green hold(s) on ${spec.seed.length} tag(s); expect ${spec.expect} ══`);
    for (let i = 0; i < GAMES; i += 1) {
      console.log(`── ${phase} game ${i + 1} ──`);
      const tape = await playGame(context, listener, engine, phase, i).catch((e) => ({
        name: `${phase}-g${i + 1}`, phase, seat: null, moves: [], pauses: [], notes: [`crashed: ${String(e).slice(0, 200)}`], taps: [],
        chosen: [], turns: [], steers: [], punishes: [], doorRows: [], heldFreePlay: [], spoken: [], resultRows: [], gameRow: null, pageErrors: [String(e).slice(0, 200)], plies: 0,
      }));
      tape.expect = spec.expect;
      tape.gifts = await giftsIn(engine, tape.steers ?? []);
      tapes.push(tape);
      await writeFile(`${OUT_DIR}/tape-${tape.name}.json`, JSON.stringify(tape, null, 2));
      const pick = tape.chosen[0];
      console.log(`[${tape.name}] seat=${tape.seat} plies=${tape.plies} focus=${pick?.focus ?? '-'} (${pick?.state ?? '-'}, ${pick?.mode ?? '-'}, ${pick?.reason ?? '-'}) chances=${tape.turns.length} pauses=${tape.pauses.length} steers=${tape.steers.length} punishes=${tape.punishes.length}`);
      for (const l of tape.spoken) console.log(`   ${l.kind ?? 'LEAK'} | "${l.text}"`);
      if (tape.notes.length) console.log(`[notes] ${tape.notes.join(' | ')}`);
    }
  }
  await seed.close();
  engine.stop();

  // ── contracts ──
  for (const t of tapes) {
    const g = t.name;
    const pick = t.chosen[0] ?? null;
    check(`${g} F0 the banner names the picked focus`, !!pick && t.banner?.focus === pick.focus, `banner=${t.banner?.focus ?? '-'} pick=${pick?.focus ?? '-'}`);
    const first = t.spoken[0];
    check(`${g} F1 the pre-game line is said first`, !!first && first.kind === 'announce', first ? `"${first.text}"` : 'nothing spoken');
    const leaks = t.spoken.filter((l) => l.kind === null || l.kind === 'focus?');
    check(`${g} F2 every spoken line is a focus line`, leaks.length === 0,
      leaks.map((l) => `"${l.text.slice(0, 80)}"`).join(' | ') || `${t.spoken.length} line(s); ${t.spoken.filter((l) => l.kind === 'asked').length} asked (a tap)`);
    const doorSpoke = t.doorRows.filter((r) => (r.spoke ?? []).length > 0);
    const heldWhy = {};
    for (const r of t.doorRows) for (const l of r.held ?? []) { const w = r.heldWhy?.[l] ?? '?'; heldWhy[w] = (heldWhy[w] ?? 0) + 1; }
    check(`${g} F3 the Learn door spoke nothing in a focus game`, doorSpoke.length === 0,
      `${t.doorRows.length} turn row(s); held ${JSON.stringify(heldWhy)}${doorSpoke.length ? `; SPOKE ${doorSpoke.map((r) => (r.spoke ?? []).join('+')).join(', ')}` : ''}; free-play lines dropped by the voice door: ${t.heldFreePlay.length}`);
    // F5: one turn row per decided chance, each on this game's focus, each a verdict.
    const badRows = t.turns.filter((r) => r.focus !== pick?.focus || !['found', 'missed'].includes(r.outcome) || !['defend', 'exploit'].includes(r.seat) || typeof r.kind !== 'string');
    const teachRows = t.turns.filter((r) => r.spoke === 'clue');
    check(`${g} F5 every focus chance was decided on the record`, badRows.length === 0 && teachRows.length <= t.pauses.length + 1,
      `${t.turns.length} row(s): ${t.turns.map((r) => `${r.seat}/${r.kind} ${r.outcome}${r.spoke !== 'none' ? ` (${r.spoke})` : ''}${r.prompted ? ' P' : ''}${r.steered ? ' S' : ''}${r.retry ? ' R' : ''}`).join(', ') || '—'}; ${t.pauses.length} pause(s) seen`);
    check(`${g} F6 the focus came from the record`, !!pick && pick.focus === t.expect && ['red', 'grey', 'short', 'continue'].some((x) => x === pick.reason || x === pick.state),
      pick ? `${pick.focus} — ${pick.state}/${pick.mode}, reason ${pick.reason}, seats ${JSON.stringify(pick.seatStates)}, ${pick.announced ? 'named' : 'unannounced'}: "${pick.line}"` : 'no learn-focus-chosen row');
    const gifts = (t.gifts ?? []).filter((x) => x.gift);
    check(`${g} F7 no steered coach move gave material away`, gifts.length === 0,
      `${(t.gifts ?? []).length} steer(s) checked${gifts.length ? `; GIFTS ${gifts.map((x) => `${x.played} −${x.drop}`).join(', ')}` : ''}`);
    const playOns = t.pauses.filter((p) => p.chose === 'play-on' && !p.deciding);
    if (playOns.length > 0) {
      const punished = playOns.filter((p) => t.punishes.some((x) => x.fen && placementOf(x.fen) && samePlacement(placementOf(x.fen), placementOf(p.fenAfter))));
      check(`${g} F8 a miss left standing was punished`, punished.length === playOns.length, `${punished.length}/${playOns.length} play-on(s) punished`);
    }
    check(`${g} F9 one learnFocusResults row`, t.resultRows.length === 1,
      t.resultRows.map((r) => `${r.focus} ${r.mode} defend ${r.tally?.defend?.found}/${r.tally?.defend?.posed} exploit ${r.tally?.exploit?.found}/${r.tally?.exploit?.posed}`).join('; ') || 'no row');
    check(`${g} F9 the game-over card shows the end line`, /Review has the rest\./.test(t.recapFocus ?? ''), t.recapFocus ?? 'no card line');
    const promptedRows = t.turns.filter((r) => r.prompted);
    const missing = t.gameRow ? promptedRows.filter((r) => !(t.gameRow.promptedPlies ?? []).includes(r.ply)) : promptedRows;
    if (promptedRows.length > 0) check(`${g} F10 every prompted chance is on promptedPlies`, !!t.gameRow && missing.length === 0, t.gameRow ? `${promptedRows.length} prompted row(s); promptedPlies ${JSON.stringify(t.gameRow.promptedPlies)}` : 'no game row');
    check(`${g} no page errors`, (t.pageErrors ?? []).length === 0, (t.pageErrors ?? []).slice(0, 3).join(' | '));
  }
  const gameLines = tapes.map((t) => t.spoken.filter((l) => l.kind !== 'asked').length);
  const avg = gameLines.length ? gameLines.reduce((a, b) => a + b, 0) / gameLines.length : 0;
  check('F4 the average spoken lines per game is 8–15 (an average, never a cap)', avg >= 8 && avg <= 15, `average ${avg.toFixed(1)} over ${gameLines.length} game(s): ${gameLines.join(', ')}`);
  check('no billable request (muted)', billable.length === 0, `${billable.length} aborted`);

  // ── the transcript: the LINES, not the count ──
  const perFocus = {};
  for (const t of tapes) {
    const f = t.chosen[0]?.focus ?? 'none';
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
      `focus: ${pick ? `${pick.focus} (${pick.state}, ${pick.mode}, ${pick.reason}; seats ${JSON.stringify(pick.seatStates)})` : '—'}`,
      'spoken:',
      ...t.spoken.map((l) => `- [${l.kind ?? 'LEAK'}] ${l.text}`),
      `chances: ${t.turns.map((r) => `ply ${r.ply} ${r.seat}/${r.kind} ${r.outcome}${r.spoke !== 'none' ? ` (${r.spoke})` : ''}${r.prompted ? ' prompted' : ''}${r.steered ? ' steered' : ''}${r.retry ? ' retry' : ''}`).join('; ') || '—'}`,
      `pauses: ${t.pauses.map((p) => `${p.after} → ${p.chose}${p.deciding ? ' (deciding)' : ''}`).join('; ') || '—'}`,
      `steers: ${(t.gifts ?? []).map((x) => `${x.played} (${x.drop >= 0 ? '−' : '+'}${Math.abs(x.drop)}cp)`).join(', ') || '—'} · punishes: ${t.punishes.map((x) => x.played).join(', ') || '—'}`,
      `door held: ${JSON.stringify(heldWhy)} · free-play lines dropped: ${t.heldFreePlay.length}`,
      `result row: ${t.resultRows.map((r) => JSON.stringify({ focus: r.focus, mode: r.mode, revealed: r.revealed, tally: r.tally })).join(' ') || '—'}`,
      `card: ${t.recapFocus ?? '—'}`,
      `moves: ${t.moves.map((m) => m.san).join(' ')}`,
      `notes: ${t.notes.join(' | ') || '—'}`,
    ].join('\n');
  }).join('\n\n');
  const summary = Object.entries(perFocus).map(([f, p]) => `- ${f}: ${p.games} game(s), ${(p.lines / p.games).toFixed(1)} lines/game, defend ${p.defend.found}/${p.defend.posed} found, exploit ${p.exploit.found}/${p.exploit.posed} found, ${p.steered} steered`).join('\n');
  await writeFile(`${OUT_DIR}/transcript-${RUN_TAG}.md`, `# Learn focus — ${RUN_ID} on ${BASE_URL}\n\n## Per focus\n\n${summary}\n\n${transcript}\n`);
  const failed = results.filter((r) => !r.pass);
  await writeFile(`${OUT_DIR}/report-${RUN_TAG}.json`, JSON.stringify({ runId: RUN_ID, baseUrl: BASE_URL, perFocus, results, at: new Date().toISOString() }, null, 2));
  console.log(`\n${summary}\n\n${results.length - failed.length}/${results.length} checks green — report at ${OUT_DIR}/report-${RUN_TAG}.json, transcript at ${OUT_DIR}/transcript-${RUN_TAG}.md`);
  await browser.close();
  await listener.stop?.();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
