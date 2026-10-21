#!/usr/bin/env node
/**
 * audit-missions-02 — THE CAMPAIGN, BOTH PHASES, PLAYED (WO-MISSIONS-02,
 * David 2026-10-21).
 *
 * Ten Campaign games (`/coach/campaign`) on an emulated iPhone with David's
 * data drop loaded — the seats alternate from the record, so five as White and
 * five as Black. The student is Stockfish at depth 10 playing its best move,
 * and its THIRD-best every fourth turn, so it sometimes walks past a chance.
 * On a mission rewind it takes "Try again" and plays its next choice.
 *
 * What it reads (three instruments: Playwright drives, the narration listener
 * hears, the app's own audit rows and Dexie record decide):
 *   P1 PLANT ARRIVAL — of the games whose middlegame card went live, how many
 *      had the free piece planted (`plantFound` on the row, `mission-plant`
 *      event). The card ships at ≥ 80%; below, the reasons are reported.
 *   P2 the middlegame card starts the ply after the opening resolves and
 *      announces once;
 *   P3 the middlegame spoke ONLY its own lines (announce / a miss phrase /
 *      the pass line) — the silence gate;
 *   P4 a missed free piece pauses BEFORE the coach replies;
 *   P5 one row per mission that ran: two per game when both phases ran;
 *   P6 seats alternate, five White and five Black;
 *   no page errors; muted, every billable request aborted and counted.
 *
 * Tapes, the spoken transcript of each game's middlegame and the no-plant
 * reasons go to audit-reports/missions-02/.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-missions-02.mjs
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-missions-02.mjs
 *   AUDIT_GAMES=4 … (fewer games, for a quick look)
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
import { clickMove, readPlacement, samePlacement, placementOf, sleep } from './audit-lib/board-drive.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `missions02-${Date.now()}`;
const OUT_DIR = 'audit-reports/missions-02';
const GAMES = Number(process.env.AUDIT_GAMES ?? 10);
const MAX_STUDENT_MOVES = 46;
const GAME_BUDGET_MS = 14 * 60_000;
const ARRIVAL_BAR = 0.8;

const LINES = {
  openingAnnounce: "Today's mission: develop each knight and bishop by moving it only once, then castle.",
  openingMiss: 'One move per piece — bring out a new one.',
  openingPass: 'Mission complete — every piece out and your king is safe!',
  mgAnnounce: 'Middlegame mission: win material, then stay ahead.',
  mgMissed: "There's a win on the board — find it.",
  mgGaveBack: "You're ahead — keep every piece safe.",
  mgPass: 'Mission complete — you won material and kept it!',
};
const MG_LINES = new Set([LINES.mgAnnounce, LINES.mgMissed, LINES.mgGaveBack, LINES.mgPass]);
const ALL_LINES = new Set(Object.values(LINES));

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
  /** The engine's first moves at depth 10, best first. */
  lines(fen, depth = 10) {
    return new Promise((resolve) => {
      const byRank = new Map();
      const timer = setTimeout(() => { this.listeners = this.listeners.filter((l) => l !== on); resolve([...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1])); }, 30_000);
      const on = (line) => {
        const m = line.match(/ multipv (\d+) .* pv (\S+)/);
        if (line.startsWith('info') && m) byRank.set(Number(m[1]), m[2]);
        if (line.startsWith('bestmove')) {
          clearTimeout(timer);
          this.listeners = this.listeners.filter((l) => l !== on);
          resolve([...byRank.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]));
        }
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
async function bannerState(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-testid="mission-banner"]');
    return el ? {
      mission: el.getAttribute('data-mission'),
      phase: el.getAttribute('data-phase'),
      outcome: el.getAttribute('data-outcome'),
      progress: document.querySelector('[data-testid="mission-progress"]')?.textContent ?? '',
      rewind: !!document.querySelector('[data-testid="mission-rewind"]'),
    } : null;
  }).catch(() => null);
}

async function missionRows(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => {
      try {
        const all = req.result.transaction('missionResults', 'readonly').objectStore('missionResults').getAll();
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

/** The coach's reply: the board leaves the student's placement and holds a
 *  legal successor for two reads in a row. Null when nothing comes. */
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

const spokenLines = (events) => events
  .filter((e) => e.kind === 'coach-narration-spoken' && /voiceService\.speak(Cloud|WebSpeech)/.test(String(e.source ?? '')))
  .map((e) => ({ at: e.timestamp ?? e.at ?? null, text: String(e.narrationText ?? '').trim() }))
  .filter((l) => l.text);

async function playGame(context, listener, engine, index) {
  const tape = { game: index + 1, moves: [], rewinds: [], notes: [] };
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  const startEvents = listener.getCapturedEvents().length;
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}/coach/campaign`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(6_000);
  await dismissModals(page);
  await page.locator('[data-testid="mission-banner"]').first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2_500);
  const studentWhite = await page.locator('[data-testid="color-white-btn"]').getAttribute('class').then((c) => /ring-2/.test(c ?? '')).catch(() => true);
  const me = studentWhite ? 'w' : 'b';
  tape.seat = studentWhite ? 'white' : 'black';
  const chess = new Chess();
  if (!studentWhite) {
    const opener = await awaitReply(page, chess, 120_000);
    if (opener) { chess.move(opener); tape.moves.push({ by: 'coach', san: opener }); }
    else tape.notes.push('coach never opened as White');
  }
  let turn = 0;
  let mgLiveAtEvent = null;
  let mgLiveAtPly = null;
  let mgResolved = false;
  let afterMg = 0;
  while (turn < MAX_STUDENT_MOVES && !chess.isGameOver() && Date.now() - startedAt < GAME_BUDGET_MS) {
    const fenBefore = chess.fen();
    const ranked = await engine.lines(fenBefore);
    const tried = new Set();
    let pickRank = turn % 4 === 3 && ranked.length >= 3 ? 2 : 0;
    let landedMove = null;
    // One decision: a move; a rewind takes it back and the next choice goes.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const uci = ranked.filter((u) => !tried.has(u))[attempt === 0 ? pickRank : 0] ?? ranked.find((u) => !tried.has(u));
      const mv = uci ? toMove(fenBefore, uci) : null;
      if (!mv) { tape.notes.push(`no student move at ${fenBefore}`); break; }
      tried.add(uci);
      const probe = new Chess(fenBefore);
      probe.move(mv.san);
      const landed = await clickMove(page, mv, probe.fen());
      if (!landed) { tape.notes.push(`move ${mv.san} did not land`); break; }
      chess.move(mv.san);
      tape.moves.push({ by: 'student', san: mv.san, rank: ranked.indexOf(uci) + 1, at: Date.now() });
      await page.waitForTimeout(900);
      const b = await bannerState(page);
      if (b?.rewind) {
        const coachMoved = !samePlacement(await readPlacement(page), placementOf(chess.fen()));
        tape.rewinds.push({ mission: b.mission, after: mv.san, ply: chess.history().length - 1, coachMovedBeforeRewind: coachMoved, attempt });
        await page.screenshot({ path: `${OUT_DIR}/g${index + 1}-rewind-${tape.rewinds.length}.png` }).catch(() => {});
        await page.locator('[data-testid="mission-try-again"]').click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(1_200);
        chess.undo();
        tape.moves.push({ by: 'student', san: `(try again: ${mv.san} taken back)` });
        pickRank = 0;
        continue;
      }
      landedMove = mv;
      break;
    }
    if (!landedMove) break;
    turn += 1;
    const banner = await bannerState(page);
    if (banner?.mission === 'free-piece-stay-ahead' && mgLiveAtEvent === null) {
      mgLiveAtEvent = listener.getCapturedEvents().length;
      mgLiveAtPly = chess.history().length;
      tape.mgStartedAfterPly = mgLiveAtPly - 1;
    }
    if (banner?.mission === 'free-piece-stay-ahead' && banner.phase === 'resolved' && !mgResolved) {
      mgResolved = true;
      tape.mgOutcome = banner.outcome;
      if (/pass/.test(banner.outcome ?? '')) await page.screenshot({ path: `${OUT_DIR}/g${index + 1}-mg-pass.png` }).catch(() => {});
    }
    if (mgResolved) { afterMg += 1; if (afterMg > 2) break; }
    if (chess.isGameOver()) break;
    const reply = (await awaitReply(page, chess)) ?? (await awaitReply(page, chess, 20_000));
    if (!reply) {
      tape.notes.push(`no coach reply after ${landedMove.san}`);
      await page.screenshot({ path: `${OUT_DIR}/g${index + 1}-stall.png` }).catch(() => {});
      break;
    }
    chess.move(reply);
    tape.moves.push({ by: 'coach', san: reply, at: Date.now() });
    const after = await bannerState(page);
    if (after?.mission === 'free-piece-stay-ahead' && mgLiveAtEvent === null) {
      mgLiveAtEvent = listener.getCapturedEvents().length;
      mgLiveAtPly = chess.history().length - 1;
      tape.mgStartedAfterPly = mgLiveAtPly - 1;
    }
    if (after?.mission === 'free-piece-stay-ahead' && after.phase === 'resolved' && !mgResolved) {
      mgResolved = true;
      tape.mgOutcome = after.outcome;
    }
  }
  tape.gameOver = chess.isGameOver();
  tape.plies = chess.history().length;
  await page.waitForTimeout(3_500);
  const events = listener.getCapturedEvents().slice(startEvents);
  tape.spoken = spokenLines(events).map((l) => l.text);
  tape.spokenMiddlegame = mgLiveAtEvent === null ? [] : spokenLines(listener.getCapturedEvents().slice(mgLiveAtEvent)).map((l) => l.text);
  tape.plants = events.filter((e) => e.kind === 'mission-plant').map((e) => e.summary);
  tape.plantNone = events.filter((e) => e.kind === 'mission-plant-none').map((e) => { try { return JSON.parse(e.details ?? '{}').reasons ?? {}; } catch { return {}; } });
  tape.missionEvents = events.filter((e) => /^mission-/.test(String(e.kind))).map((e) => ({ kind: e.kind, summary: e.summary }));
  tape.rows = (await missionRows(page)).filter((r) => r.at >= startedAt).sort((a, b) => a.at - b.at);
  tape.pageErrors = pageErrors;
  tape.pgn = chess.pgn();
  await page.close();
  return tape;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[run-id] ${RUN_ID}  [target] ${BASE_URL}  [games] ${GAMES}`);
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
  await clearMissionRows(seed);
  await seed.close();

  const tapes = [];
  for (let i = 0; i < GAMES; i += 1) {
    console.log(`\n── game ${i + 1} ──`);
    const tape = await playGame(context, listener, engine, i);
    tapes.push(tape);
    await writeFile(`${OUT_DIR}/tape-g${i + 1}.json`, JSON.stringify(tape, null, 2));
    console.log(`[game ${i + 1}] seat=${tape.seat} plies=${tape.plies} over=${tape.gameOver} mg=${tape.mgStartedAfterPly ?? '-'} plant=${tape.plants.length ? 'yes' : 'no'} rows=${tape.rows.map((r) => `${r.missionId}:${r.outcome}${r.plantFound !== undefined ? `/plant=${r.plantFound}` : ''}`).join(', ')}`);
    console.log(`[spoken] ${tape.spoken.map((t) => `"${t}"`).join(' | ') || '(nothing)'}`);
    if (tape.notes.length) console.log(`[notes] ${tape.notes.join(' | ')}`);
  }
  engine.stop();

  // ── contracts ──
  const mgGames = tapes.filter((t) => t.rows.some((r) => r.missionId === 'free-piece-stay-ahead') || t.mgStartedAfterPly !== undefined);
  const planted = mgGames.filter((t) => t.plants.length > 0 || t.rows.some((r) => r.missionId === 'free-piece-stay-ahead' && r.plantFound));
  const rate = mgGames.length ? planted.length / mgGames.length : 0;
  const reasons = {};
  for (const t of tapes) for (const r of t.plantNone) for (const [k, n] of Object.entries(r)) reasons[k] = (reasons[k] ?? 0) + n;
  check(`P1 plant arrival rate ≥ ${ARRIVAL_BAR * 100}%`, mgGames.length > 0 && rate >= ARRIVAL_BAR, `${planted.length}/${mgGames.length} = ${Math.round(rate * 100)}%; no-plant reasons ${JSON.stringify(reasons)}`);
  for (const t of tapes) {
    const g = `G${t.game}`;
    const announces = t.spoken.filter((s) => s === LINES.mgAnnounce).length;
    if (t.mgStartedAfterPly !== undefined) {
      check(`${g} P2 the middlegame card announced once`, announces === 1, `${announces}`);
      const stray = t.spokenMiddlegame.filter((s) => !MG_LINES.has(s));
      check(`${g} P3 the middlegame spoke only its own lines`, stray.length === 0, stray.length ? stray.map((s) => `"${s.slice(0, 70)}"`).join(' | ') : `${t.spokenMiddlegame.length} line(s)`);
    }
    const strayAll = t.spoken.filter((s) => !ALL_LINES.has(s));
    check(`${g} the whole game spoke only mission lines`, strayAll.length === 0, strayAll.map((s) => `"${s.slice(0, 70)}"`).join(' | '));
    for (const r of t.rewinds) check(`${g} P4 a ${r.mission} miss paused before the coach replied (${r.after})`, !r.coachMovedBeforeRewind);
    const kinds = t.rows.map((r) => r.missionId);
    const dupes = kinds.filter((k, i) => kinds.indexOf(k) !== i);
    check(`${g} P5 one row per mission that ran`, dupes.length === 0 && kinds.includes('develop-and-castle') && (t.mgStartedAfterPly === undefined || kinds.includes('free-piece-stay-ahead')),
      t.rows.map((r) => `${r.missionId}:${r.outcome}`).join(', ') || 'no rows');
    const mgRow = t.rows.find((r) => r.missionId === 'free-piece-stay-ahead');
    if (mgRow) check(`${g} the middlegame row says whether a piece was planted`, typeof mgRow.plantFound === 'boolean', String(mgRow.plantFound));
    check(`${g} no page errors`, t.pageErrors.length === 0, t.pageErrors.slice(0, 3).join(' | '));
  }
  const seats = tapes.map((t) => t.seat);
  check('P6 seats alternate (five White, five Black over ten)', seats.every((s, i) => s === (i % 2 === 0 ? 'white' : 'black')), seats.join(','));
  check('no billable request (muted)', billable.length === 0, `${billable.length} aborted`);

  const transcript = tapes.map((t) => [
    `## Game ${t.game} — ${t.seat}, ${t.plies} plies${t.gameOver ? ' (game over)' : ''}`,
    `rows: ${t.rows.map((r) => `${r.missionId} ${r.outcome}${r.plantFound !== undefined ? ` plantFound=${r.plantFound}` : ''}`).join('; ') || '—'}`,
    `plant: ${t.plants[0] ?? (t.plantNone.length ? `none ${JSON.stringify(t.plantNone[0])}` : '—')}`,
    `rewinds: ${t.rewinds.map((r) => `${r.mission} after ${r.after}`).join('; ') || '—'}`,
    `middlegame said: ${t.spokenMiddlegame.map((s) => `"${s}"`).join(' / ') || '(nothing)'}`,
    `pgn: ${t.pgn}`,
  ].join('\n')).join('\n\n');
  await writeFile(`${OUT_DIR}/transcript.md`, `# Missions-02 audit — ${RUN_ID} on ${BASE_URL}\n\nPlant arrival: ${planted.length}/${mgGames.length} (${Math.round(rate * 100)}%). No-plant reasons: ${JSON.stringify(reasons)}\n\n${transcript}\n`);
  const failed = results.filter((r) => !r.pass);
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ runId: RUN_ID, baseUrl: BASE_URL, arrival: { planted: planted.length, of: mgGames.length, rate, reasons }, results, at: new Date().toISOString() }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks green — report at ${OUT_DIR}/report.json, transcript at ${OUT_DIR}/transcript.md`);
  await browser.close();
  await listener.stop?.();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
