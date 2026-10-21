#!/usr/bin/env node
/**
 * audit-campaign-gate1 — WO-CAMPAIGN-MASTER INTEGRATION GATE 1, PLAYED.
 *
 * Ten full Level 1 Campaign games (`/coach/campaign`) on an emulated iPhone
 * with David's data drop loaded and a clean mission record — the seats
 * alternate from the record, five White and five Black. The student is
 * Stockfish at depth 10, its THIRD-best every fourth turn. On a rewind it
 * takes "Try again" and plays its next choice. The new K+Q card briefs on its
 * first game (the harness reads the try board and plays the mate by two taps),
 * then its scenario replaces the board and the student mates from there.
 * Then ONE Grabber game through the audit door (`?boss=grabber`; the boss is
 * locked until Levels 1–4 are learned).
 *
 * Three instruments: Playwright drives, the narration listener hears, the
 * app's own audit rows and Dexie record decide.
 *
 * Per game it reports: the three outcomes, the spoken mission lines, plant
 * arrival, scenario use and dial steps — to audit-reports/campaign-master/gate1/.
 *
 * Contracts:
 *   C1 every spoken line in a Campaign game is a mission line;
 *   C2 one row per mission that ran;
 *   C3 a K+Q card that went live loaded its scenario (row.scenario);
 *   C4 a finished game shows the recap;
 *   C5 seats alternate;
 *   B1 the Grabber's intro is the fixed text and nothing else is said;
 *   B2 it re-ranked with its own weights at least once (`mission-scored`);
 *   B3 a finished boss game wrote its attempt and the recap names its targets;
 *   no page errors; muted, every billable request aborted and counted.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-campaign-gate1.mjs
 *   AUDIT_GAMES=2 AUDIT_BOSS=0 …   (a quick look)
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
import { clickMove, samePlacement, placementOf, sleep } from './audit-lib/board-drive.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `gate1-${Date.now()}`;
const OUT_DIR = 'audit-reports/campaign-master/gate1';
const GAMES = Number(process.env.AUDIT_GAMES ?? 10);
const BOSS = process.env.AUDIT_BOSS !== '0';
const MAX_STUDENT_MOVES = 90;
const GAME_BUDGET_MS = 18 * 60_000;

const GRABBER_INTRO = "The Grabber takes everything you leave lying around, and it's studied your games: it will go after your weak spots. Develop, castle, and take what it leaves loose.";
const LINES = new Set([
  "Today's mission: develop each knight and bishop by moving it only once, then castle.",
  'One move per piece — bring out a new one.',
  'Mission complete — every piece out and your king is safe!',
  'Middlegame mission: win material, then stay ahead.',
  "There's a win on the board — find it.",
  "You're ahead — keep every piece safe.",
  'Mission complete — you won material and kept it!',
  'Endgame mission: checkmate with king and queen.',
  'Leave their king a square.',
  'Keep your queen safe — it does the work.',
  'Checkmate — mission complete!',
]);

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

// ── the student: Stockfish d10, three lines ─────────────────────────────────
class StudentEngine {
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
  lines(fen, depth = 10) {
    return new Promise((resolve) => {
      const byRank = new Map();
      const done = () => { this.listeners = this.listeners.filter((l) => l !== on); resolve([...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])); };
      const timer = setTimeout(done, 30_000);
      const on = (line) => {
        const m = line.match(/ multipv (\d+) .* pv (\S+)/);
        if (line.startsWith('info') && m) byRank.set(Number(m[1]), m[2]);
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
/** The MAIN board only — a briefing renders a second board on the page. */
const readMain = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    if (sq.closest('[data-testid="mission-briefing"]')) return;
    const p = sq.querySelector('[data-piece]');
    const name = sq.getAttribute('data-square');
    if (p && name) out[name] = p.getAttribute('data-piece');
  });
  return out;
}).catch(() => ({}));

const readBriefingBoard = (page) => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('[data-testid="mission-briefing"] [data-square]').forEach((sq) => {
    const p = sq.querySelector('[data-piece]');
    if (p) out[sq.getAttribute('data-square')] = p.getAttribute('data-piece');
  });
  return out;
}).catch(() => ({}));

function fenOfPlacement(placement, toMove) {
  const rows = [];
  for (let r = 8; r >= 1; r -= 1) {
    let row = '';
    let empty = 0;
    for (const f of 'abcdefgh') {
      const p = placement[`${f}${r}`];
      if (!p) { empty += 1; continue; }
      if (empty) { row += String(empty); empty = 0; }
      row += p[0] === 'w' ? p[1].toUpperCase() : p[1].toLowerCase();
    }
    if (empty) row += String(empty);
    rows.push(row);
  }
  return `${rows.join('/')} ${toMove} - - 0 1`;
}

async function bannerState(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="mission-banner"]');
    return el ? { mission: el.getAttribute('data-mission'), phase: el.getAttribute('data-phase'), outcome: el.getAttribute('data-outcome'), rewind: !!document.querySelector('[data-testid="mission-rewind"]') } : null;
  }).catch(() => null);
}

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

const clearStores = (page, stores) => page.evaluate((names) => new Promise((resolve) => {
  const req = indexedDB.open('ChessAcademyDB');
  req.onsuccess = () => {
    try {
      const tx = req.result.transaction(names, 'readwrite');
      for (const n of names) tx.objectStore(n).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch { resolve(false); }
  };
  req.onerror = () => resolve(false);
}), stores);

async function dismissModals(page) {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-close"]']) {
    const el = page.locator(sel);
    if (await el.count().then((n) => n > 0).catch(() => false)) await el.first().click({ timeout: 5_000 }).catch(() => {});
  }
}

/** A briefing on screen: read the idea, watch the demo, and play the try —
 *  the mate the try board holds, found by chess.js, by two taps. */
async function handleBriefing(page, me, tape) {
  const root = page.locator('[data-testid="mission-briefing"]');
  if (!(await root.count().then((n) => n > 0).catch(() => false))) return false;
  const entry = { step: await root.getAttribute('data-step').catch(() => null), answered: null };
  if (entry.step === 'idea') await page.locator('[data-testid="mission-briefing-next"]').click({ timeout: 5_000 }).catch(() => {});
  const tryBtn = page.locator('[data-testid="mission-briefing-try"]');
  for (let i = 0; i < 40 && await tryBtn.count().then((n) => n > 0).catch(() => false); i += 1) {
    if (await tryBtn.isEnabled().catch(() => false)) { await tryBtn.click({ timeout: 5_000 }).catch(() => {}); break; }
    await sleep(500);
  }
  const board = new Chess(fenOfPlacement(await readBriefingBoard(page), me));
  const mate = board.moves({ verbose: true }).find((m) => { const b = new Chess(board.fen()); b.move(m.san); return b.isCheckmate(); });
  if (mate) {
    await page.locator(`[data-testid="mission-briefing"] [data-square="${mate.from}"]`).click({ timeout: 5_000 }).catch(() => {});
    await page.locator(`[data-testid="mission-briefing"] [data-square="${mate.to}"]`).click({ timeout: 5_000 }).catch(() => {});
  }
  await sleep(600);
  entry.answered = await page.locator('[data-testid="mission-briefing-right"]').count() > 0 ? 'right'
    : await page.locator('[data-testid="mission-briefing-shown"]').count() > 0 ? 'shown' : 'unanswered';
  await page.locator('[data-testid="mission-briefing-done"]').click({ timeout: 5_000 }).catch(() => {});
  await sleep(800);
  tape.briefings.push(entry);
  return true;
}

/** The coach's reply, or a scenario that replaced the board. */
async function awaitBoard(page, chess, me, tape, ms = 45_000) {
  const mine = placementOf(chess.fen());
  const until = Date.now() + ms;
  let last = null;
  while (Date.now() < until) {
    await sleep(400);
    if (await handleBriefing(page, me, tape)) { last = null; continue; }
    const now = await readMain(page);
    if (Object.keys(now).length === 0 || samePlacement(now, mine)) { last = null; continue; }
    const san = chess.moves({ verbose: true }).find((m) => { const p = new Chess(chess.fen()); p.move(m.san); return samePlacement(placementOf(p.fen()), now); })?.san ?? null;
    const key = san ?? JSON.stringify(now);
    if (key === last) return san ? { kind: 'reply', san } : { kind: 'replaced', fen: fenOfPlacement(now, me) };
    last = key;
  }
  return null;
}

const spokenLines = (events) => events
  .filter((e) => e.kind === 'coach-narration-spoken' && /voiceService\.speak(Cloud|WebSpeech)/.test(String(e.source ?? '')))
  .map((e) => String(e.narrationText ?? '').trim())
  .filter(Boolean);

async function studentSeat(page) {
  return page.locator('[data-testid="color-white-btn"]').getAttribute('class').then((c) => (/ring-2/.test(c ?? '') ? 'w' : 'b')).catch(() => 'w');
}

/** Play the game on the page to its end (or the cap); the mirror follows the
 *  board, scenario jumps included. */
async function playOut(page, engine, me, tape, startedAt) {
  let chess = new Chess();
  if (me === 'b') {
    const opener = await awaitBoard(page, chess, me, tape, 120_000);
    if (opener?.kind === 'reply') { chess.move(opener.san); tape.moves.push({ by: 'coach', san: opener.san }); } else tape.notes.push('coach never opened as White');
  }
  let turn = 0;
  while (turn < MAX_STUDENT_MOVES && !chess.isGameOver() && Date.now() - startedAt < GAME_BUDGET_MS) {
    await handleBriefing(page, me, tape);
    // A scenario may have replaced the board after the coach's move.
    const dom = await readMain(page);
    if (Object.keys(dom).length > 0 && !samePlacement(dom, placementOf(chess.fen()))) {
      chess = new Chess(fenOfPlacement(dom, me));
      tape.scenarioFens.push(chess.fen());
      tape.moves.push({ by: 'board', san: `(scenario ${chess.fen()})` });
    }
    const fenBefore = chess.fen();
    const ranked = await engine.lines(fenBefore);
    const tried = new Set();
    let pickRank = turn % 4 === 3 && ranked.length >= 3 ? 2 : 0;
    let landed = null;
    let replacedNow = false;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const uci = ranked.filter((u) => !tried.has(u))[attempt === 0 ? pickRank : 0] ?? ranked.find((u) => !tried.has(u));
      const mv = uci ? toMove(fenBefore, uci) : null;
      if (!mv) { tape.notes.push(`no student move at ${fenBefore}`); break; }
      tried.add(uci);
      const probe = new Chess(fenBefore);
      probe.move(mv.san);
      if (!(await clickMove(page, mv, probe.fen()).catch(() => false))) {
        // The move that ends a phase can start a scenario: the board jumps to
        // the next card's position right after it lands. That is a landed move.
        await sleep(1_500);
        await handleBriefing(page, me, tape);
        const dom = await readMain(page);
        if (Object.keys(dom).length > 0 && !samePlacement(dom, placementOf(fenBefore)) && !samePlacement(dom, placementOf(probe.fen()))) {
          tape.moves.push({ by: 'student', san: mv.san, rank: ranked.indexOf(uci) + 1 });
          chess = new Chess(fenOfPlacement(dom, me));
          tape.scenarioFens.push(chess.fen());
          tape.moves.push({ by: 'board', san: `(scenario ${chess.fen()})` });
          landed = mv;
          replacedNow = true;
          break;
        }
        tape.notes.push(`move ${mv.san} did not land`);
        break;
      }
      chess.move(mv.san);
      tape.moves.push({ by: 'student', san: mv.san, rank: ranked.indexOf(uci) + 1 });
      await page.waitForTimeout(900);
      const b = await bannerState(page);
      if (b?.rewind) {
        tape.rewinds.push({ mission: b.mission, after: mv.san, ply: chess.history().length - 1 });
        await page.locator('[data-testid="mission-try-again"]').click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(1_200);
        chess.undo();
        tape.moves.push({ by: 'student', san: `(try again: ${mv.san} taken back)` });
        pickRank = 0;
        continue;
      }
      landed = mv;
      break;
    }
    if (!landed) break;
    turn += 1;
    if (chess.isGameOver()) break;
    // A scenario just replaced the board: the student moves next, no reply.
    if (replacedNow) continue;
    const next = (await awaitBoard(page, chess, me, tape)) ?? (await awaitBoard(page, chess, me, tape, 20_000));
    if (!next) {
      tape.notes.push(`no coach reply after ${landed.san}`);
      await page.screenshot({ path: `${OUT_DIR}/${tape.name}-stall.png` }).catch(() => {});
      break;
    }
    if (next.kind === 'reply') { chess.move(next.san); tape.moves.push({ by: 'coach', san: next.san }); } else {
      chess = new Chess(next.fen);
      tape.scenarioFens.push(next.fen);
      tape.moves.push({ by: 'board', san: `(scenario ${next.fen})` });
    }
  }
  tape.gameOver = chess.isGameOver();
  tape.final = chess.fen();
  tape.plies = tape.moves.filter((m) => m.by !== 'board' && !String(m.san).startsWith('(')).length;
}

async function playGame(context, listener, engine, index) {
  const tape = { name: `g${index + 1}`, game: index + 1, moves: [], rewinds: [], notes: [], briefings: [], scenarioFens: [] };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const startEvents = listener.getCapturedEvents().length;
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}/coach/campaign`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6_000);
  await dismissModals(page);
  const startBtn = page.locator('[data-testid="mission-card-start"]');
  tape.sheet = await startBtn.first().waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
  tape.sheetLines = await page.locator('[data-testid^="mission-card-line-"]').allTextContents().catch(() => []);
  if (tape.sheet) await startBtn.first().click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(2_500);
  const me = await studentSeat(page);
  tape.seat = me === 'w' ? 'white' : 'black';
  await playOut(page, engine, me, tape, startedAt);
  await page.waitForTimeout(3_500);
  tape.recap = await page.locator('[data-testid="mission-recap"]').count().then((n) => n > 0).catch(() => false);
  tape.recapRows = await page.locator('[data-testid^="mission-recap-"][data-outcome]').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-testid')}=${e.getAttribute('data-outcome')}`)).catch(() => []);
  const events = listener.getCapturedEvents().slice(startEvents);
  tape.spoken = spokenLines(events);
  tape.plants = events.filter((e) => e.kind === 'mission-plant').map((e) => e.summary);
  tape.scenarioEvents = events.filter((e) => e.kind === 'mission-scenario').map((e) => e.summary);
  tape.dialSteps = events.filter((e) => e.kind === 'mission-dial-step').map((e) => e.summary);
  tape.missionEvents = events.filter((e) => /^(mission|boss)-/.test(String(e.kind))).map((e) => `${e.kind} | ${String(e.summary ?? '').slice(0, 200)}`);
  tape.rows = (await readStore(page, 'missionResults')).filter((r) => r.at >= startedAt).sort((a, b) => a.at - b.at);
  tape.pageErrors = pageErrors;
  await page.screenshot({ path: `${OUT_DIR}/${tape.name}-end.png` }).catch(() => {});
  await page.close();
  return tape;
}

async function playBoss(context, listener, engine) {
  const tape = { name: 'grabber', moves: [], rewinds: [], notes: [], briefings: [], scenarioFens: [] };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const startedAt = Date.now();
  const atIntro = listener.getCapturedEvents().length;
  await page.goto(`${BASE_URL}/coach/campaign?boss=grabber`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6_000);
  await dismissModals(page);
  tape.intro = await page.locator('[data-testid="boss-intro-text"]').textContent({ timeout: 20_000 }).catch(() => null);
  await page.locator('[data-testid="boss-intro-start"]').click({ timeout: 5_000 }).catch(() => {});
  await page.waitForTimeout(2_500);
  const atStart = listener.getCapturedEvents().length;
  const me = await studentSeat(page);
  tape.seat = me === 'w' ? 'white' : 'black';
  await playOut(page, engine, me, tape, startedAt);
  await page.waitForTimeout(4_000);
  const all = listener.getCapturedEvents();
  tape.introSpoken = spokenLines(all.slice(atIntro, atStart));
  tape.spokenInGame = spokenLines(all.slice(atStart));
  tape.spokenInGameSources = all.slice(atStart).filter((e) => e.kind === 'coach-narration-spoken').map((e) => `${e.source ?? '?'} | ${String(e.narrationText ?? '').slice(0, 80)}`);
  tape.askEvents = all.slice(atStart).filter((e) => /question|chat|ask|coach-turn|brain/.test(String(e.kind))).map((e) => `${e.kind} | ${String(e.summary ?? '').slice(0, 120)}`);
  tape.started = all.slice(atIntro).filter((e) => e.kind === 'boss-started').map((e) => e.summary);
  tape.scored = all.slice(atStart).filter((e) => e.kind === 'mission-scored').map((e) => e.summary);
  tape.result = all.slice(atStart).filter((e) => e.kind === 'boss-result').map((e) => e.summary);
  tape.missionEvents = all.slice(atIntro).filter((e) => /^(mission|boss)-/.test(String(e.kind))).map((e) => `${e.kind} | ${String(e.summary ?? '').slice(0, 200)}`);
  tape.attempts = (await readStore(page, 'bossAttempts')).filter((r) => r.at >= startedAt);
  tape.recapTargeted = await page.locator('[data-testid="mission-recap-targeted"]').textContent().catch(() => null);
  tape.pageErrors = pageErrors;
  await page.screenshot({ path: `${OUT_DIR}/grabber-end.png` }).catch(() => {});
  await page.close();
  return tape;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[run-id] ${RUN_ID}  [target] ${BASE_URL}  [games] ${GAMES}  [boss] ${BOSS}`);
  const listener = await startAuditListener();
  const engine = new StudentEngine();
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
  const dropPath = process.env.AUDIT_FIXTURE
    ?? ['audit-reports/.fixtures/data-drop-david.json', 'audit-reports/.fixtures/david-games.json'].find((p) => existsSync(p));
  const fixture = dropPath ? await loadFixtureIntoIDB(seed, dropPath) : { loaded: false, reason: 'no data drop on this machine' };
  console.log(`[fixture] path=${dropPath ?? '-'} ${fixture.loaded ? `${fixture.wrote} rows / ${fixture.stores} stores` : `skipped (${fixture.reason})`}`);
  await clearStores(seed, ['missionResults', 'dialState', 'bossAttempts']);
  await seed.close();

  const tapes = [];
  for (let i = 0; i < GAMES; i += 1) {
    console.log(`\n── game ${i + 1} ──`);
    const tape = await playGame(context, listener, engine, i).catch((e) => ({
      name: `g${i + 1}`, game: i + 1, seat: null, moves: [], rewinds: [], notes: [`crashed: ${String(e).slice(0, 200)}`], briefings: [], scenarioFens: [],
      spoken: [], plants: [], scenarioEvents: [], dialSteps: [], rows: [], pageErrors: [String(e).slice(0, 200)], plies: 0, gameOver: false, recap: false, recapRows: [],
    }));
    tapes.push(tape);
    await writeFile(`${OUT_DIR}/tape-g${i + 1}.json`, JSON.stringify(tape, null, 2));
    console.log(`[game ${i + 1}] seat=${tape.seat} plies=${tape.plies} over=${tape.gameOver} rows=${tape.rows.map((r) => `${r.missionId}:${r.outcome}${r.scenario ? '/scenario' : ''}${r.plantFound !== undefined ? `/plant=${r.plantFound}` : ''}`).join(', ')} briefings=${tape.briefings.map((b) => `${b.step}:${b.answered}`).join(',') || '-'} dial=${tape.dialSteps.join(' | ') || '-'}`);
    console.log(`[spoken] ${tape.spoken.map((t) => `"${t}"`).join(' | ') || '(nothing)'}`);
    if (tape.notes.length) console.log(`[notes] ${tape.notes.join(' | ')}`);
  }

  let boss = null;
  if (BOSS) {
    console.log('\n── the Grabber ──');
    boss = await playBoss(context, listener, engine).catch((e) => ({ name: 'grabber', notes: [`crashed: ${String(e).slice(0, 200)}`], pageErrors: [String(e)], spokenInGame: [], introSpoken: [], scored: [], started: [], result: [], attempts: [], moves: [] }));
    await writeFile(`${OUT_DIR}/tape-grabber.json`, JSON.stringify(boss, null, 2));
    console.log(`[grabber] seat=${boss.seat} over=${boss.gameOver} result=${boss.result.join(' | ') || '-'} scored=${boss.scored.length} targeted=${boss.recapTargeted ?? '-'}`);
  }
  engine.stop();

  // ── contracts ──
  for (const t of tapes) {
    const g = `G${t.game}`;
    const stray = t.spoken.filter((s) => !LINES.has(s));
    check(`${g} C1 only mission lines were spoken`, stray.length === 0, stray.map((s) => `"${s.slice(0, 70)}"`).join(' | ') || `${t.spoken.length} line(s)`);
    const kinds = t.rows.filter((r) => !r.watcher).map((r) => r.missionId);
    const dupes = kinds.filter((k, i) => kinds.indexOf(k) !== i);
    check(`${g} C2 one row per mission that ran`, kinds.length > 0 && dupes.length === 0, t.rows.map((r) => `${r.missionId}:${r.outcome}`).join(', ') || 'no rows');
    const kq = t.rows.find((r) => r.missionId === 'kq-mate' && !r.watcher);
    if (kq) check(`${g} C3 the K+Q card played from its scenario`, kq.scenario === true && t.scenarioFens.length > 0, `row.scenario=${kq.scenario} fens=${t.scenarioFens.length}`);
    if (t.gameOver) check(`${g} C4 the recap appeared`, t.recap, t.recapRows.join(', '));
    check(`${g} no page errors`, t.pageErrors.length === 0, t.pageErrors.slice(0, 3).join(' | '));
  }
  const seats = tapes.map((t) => t.seat);
  check('C5 seats alternate', seats.every((s, i) => s === (i % 2 === 0 ? 'white' : 'black')), seats.join(','));
  if (boss) {
    check('B1 the Grabber intro is the fixed text', boss.intro === GRABBER_INTRO, boss.intro ?? 'no intro');
    check('B1 the intro was spoken, and nothing during the game', boss.introSpoken.includes(GRABBER_INTRO) && boss.spokenInGame.length === 0, `intro=${boss.introSpoken.length} in-game=${boss.spokenInGame.map((s) => `"${s.slice(0, 60)}"`).join(' | ')}`);
    check('B2 the Grabber re-ranked with its own weights', boss.scored.some((s) => /greed/.test(s)), `${boss.scored.length} re-rank(s); ${boss.scored.slice(0, 2).join(' | ')}`);
    if (boss.gameOver) {
      check('B3 a finished boss game wrote its attempt', boss.attempts.length === 1, JSON.stringify(boss.attempts.map((a) => ({ result: a.result, targeted: a.targeted }))));
      const targeted = boss.attempts[0]?.targeted ?? [];
      if (targeted.length > 0) check('B3 the recap names what it went after', !!boss.recapTargeted, boss.recapTargeted ?? 'no recap');
    }
    check('grabber: no page errors', boss.pageErrors.length === 0, boss.pageErrors.slice(0, 3).join(' | '));
  }
  check('no billable request (muted)', billable.length === 0, `${billable.length} aborted`);

  const transcript = [...tapes, ...(boss ? [boss] : [])].map((t) => [
    `## ${t.name === 'grabber' ? 'The Grabber' : `Game ${t.game}`} — ${t.seat}, ${t.plies ?? 0} plies${t.gameOver ? ' (game over)' : ''}`,
    `outcomes: ${(t.rows ?? []).map((r) => `${r.missionId} ${r.outcome}${r.watcher ? ' (watched)' : ''}${r.scenario ? ' scenario' : ''}${r.plantFound !== undefined ? ` plantFound=${r.plantFound}` : ''}`).join('; ') || (t.result ?? []).join('; ') || '—'}`,
    `spoken: ${(t.spoken ?? [...(t.introSpoken ?? []), ...(t.spokenInGame ?? [])]).map((s) => `"${s}"`).join(' / ') || '(nothing)'}`,
    `plant: ${(t.plants ?? [])[0] ?? '—'} · scenario: ${(t.scenarioEvents ?? []).join('; ') || '—'} · dial steps: ${(t.dialSteps ?? []).join('; ') || '—'}`,
    `briefings: ${(t.briefings ?? []).map((b) => `${b.step}→${b.answered}`).join(', ') || '—'} · rewinds: ${(t.rewinds ?? []).map((r) => `${r.mission} after ${r.after}`).join('; ') || '—'}`,
    t.name === 'grabber' ? `re-ranks: ${(t.scored ?? []).length} · recap: ${t.recapTargeted ?? '—'}` : '',
    `notes: ${(t.notes ?? []).join(' | ') || '—'}`,
  ].filter(Boolean).join('\n')).join('\n\n');
  await writeFile(`${OUT_DIR}/transcript.md`, `# Campaign gate 1 — ${RUN_ID} on ${BASE_URL}\n\n${transcript}\n`);
  const failed = results.filter((r) => !r.pass);
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ runId: RUN_ID, baseUrl: BASE_URL, results, at: new Date().toISOString() }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks green — report at ${OUT_DIR}/report.json, transcript at ${OUT_DIR}/transcript.md`);
  await browser.close();
  await listener.stop?.();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
