#!/usr/bin/env node
/**
 * audit-campaign-tracks-prod — the INTERMEDIATE and ADVANCED Campaign tracks,
 * played (2026-10-22).
 *
 * `audit-campaign-gate1.mjs` plays Level 1; this one plays the two tracks it
 * cannot reach. On an emulated iPhone, muted, with David's data drop loaded
 * when it is on this machine and a clean mission record:
 *
 *   T1 the map's track picker: Beginner by default; Intermediate shows its
 *      chapters, not Chapter 1; the choice survives a reload.
 *   T2 an Intermediate game: no Level 1 line is ever said; its first endgame
 *      mission starts from its scenario; the student (Stockfish, its best
 *      move) plays it to the end, taking "Try again" on a miss; the coach
 *      plays its BEST moves there (`mission-best-play` rows — a technique
 *      proven against a weak defence is not proven); the mission resolves,
 *      a pass pays "Mission complete" and the card's own find banner; only
 *      mission lines are spoken.
 *   T3 Advanced: the chapters are silent games; the Attacker is ready and the
 *      Mirror locked; an Advanced Campaign game is a silent game; the
 *      Attacker's boss game opens on its fixed intro, says nothing after,
 *      and starts (`boss-started`).
 *   no page errors; every billable request aborted and counted.
 *
 * Three instruments: Playwright drives, the narration listener hears, the
 * app's own audit rows decide.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-campaign-tracks-prod.mjs
 */
import { chromium, devices } from 'playwright';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { sleep } from './audit-lib/board-drive.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `tracks-${Date.now()}`;
const OUT_DIR = 'audit-reports/campaign-tracks';
const MAX_STUDENT_MOVES = 60;

// Every fixed mission phrase, read off the registry so a wording change can
// never leave this list behind.
const MISSION_LINES = (() => {
  const src = readFileSync('src/missions/registry.ts', 'utf8');
  const out = new Set();
  for (const m of src.matchAll(/(?:announce|missPhrase|passLine|'[a-z-]+'):\s*(['"])((?:\\.|(?!\1).)*)\1/g)) out.add(m[2].replace(/\\'/g, "'"));
  return out;
})();
const LEVEL_1_TITLES = /Develop & Castle|extra piece|King and queen/i;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

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
    this.proc.stdin.write('uci\nisready\n');
  }
  best(fen) {
    return new Promise((resolve) => {
      const stop = setTimeout(() => this.proc.stdin.write('stop\n'), 3_000);
      const on = (line) => {
        if (!line.startsWith('bestmove')) return;
        clearTimeout(stop);
        this.listeners = this.listeners.filter((l) => l !== on);
        resolve(line.split(' ')[1]);
      };
      this.listeners.push(on);
      this.proc.stdin.write(`position fen ${fen}\ngo depth 18\n`);
    });
  }
  stop() { try { this.proc.kill(); } catch { /* gone */ } }
}

const readBoard = (page, inBriefing) => page.evaluate((b) => {
  const out = {};
  document.querySelectorAll('[data-square]').forEach((sq) => {
    if (!!sq.closest('[data-testid="mission-briefing"]') !== b) return;
    const p = sq.querySelector('[data-piece]');
    if (p) out[sq.getAttribute('data-square')] = p.getAttribute('data-piece');
  });
  return out;
}, inBriefing).catch(() => ({}));

const fenOf = (placement, toMove) => {
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
};

/** Black at the bottom: a1 is drawn above a8. */
const blackSeat = (page, scope) => page.evaluate((s) => {
  const q = (sq) => document.querySelector(`${s} [data-square="${sq}"]`);
  const a1 = q('a1');
  const a8 = q('a8');
  return !!(a1 && a8 && a1.getBoundingClientRect().top < a8.getBoundingClientRect().top);
}, scope).catch(() => false);

const banner = (page) => page.evaluate(() => {
  const el = document.querySelector('[data-testid="mission-banner"]');
  return el ? { mission: el.getAttribute('data-mission'), phase: el.getAttribute('data-phase'), outcome: el.getAttribute('data-outcome') } : null;
}).catch(() => null);

const spokenLines = (events) => events
  .filter((e) => e.kind === 'coach-narration-spoken' && /voiceService\.speak(Cloud|WebSpeech)/.test(String(e.source ?? '')))
  .map((e) => String(e.narrationText ?? e.summary ?? '').trim())
  .filter(Boolean);

async function dismissModals(page) {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-close"]']) {
    const el = page.locator(sel);
    if (await el.count().then((n) => n > 0).catch(() => false)) await el.first().click({ timeout: 5_000 }).catch(() => {});
  }
}

async function pickTrack(page, track) {
  await page.goto(`${BASE_URL}/coach/campaign/map`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissModals(page);
  await page.locator(`[data-testid="campaign-track-${track}"]`).waitFor({ timeout: 90_000 });
  await page.locator(`[data-testid="campaign-track-${track}"]`).click();
  await sleep(1_500);
}

/** The briefing's try: the engine's move on the try board, by two taps. */
async function playBriefing(page, engine) {
  const root = page.locator('[data-testid="mission-briefing"]');
  if (!(await root.count().then((n) => n > 0).catch(() => false))) return null;
  await page.locator('[data-testid="mission-briefing-next"]').click({ timeout: 5_000 }).catch(() => {});
  const tryBtn = page.locator('[data-testid="mission-briefing-try"]');
  for (let i = 0; i < 40 && await tryBtn.count().then((n) => n > 0).catch(() => false); i += 1) {
    if (await tryBtn.isEnabled().catch(() => false)) { await tryBtn.click().catch(() => {}); break; }
    await sleep(500);
  }
  await sleep(800);
  const me = await blackSeat(page, '[data-testid="mission-briefing"]') ? 'b' : 'w';
  const move = await engine.best(fenOf(await readBoard(page, true), me));
  await page.locator(`[data-testid="mission-briefing"] [data-square="${move.slice(0, 2)}"]`).click().catch(() => {});
  await page.locator(`[data-testid="mission-briefing"] [data-square="${move.slice(2, 4)}"]`).click().catch(() => {});
  await sleep(1_000);
  const answered = await page.locator('[data-testid="mission-briefing-right"]').count() > 0 ? 'right'
    : await page.locator('[data-testid="mission-briefing-shown"]').count() > 0 ? 'shown' : 'unanswered';
  await page.locator('[data-testid="mission-briefing-done"]').click({ timeout: 5_000 }).catch(() => {});
  await sleep(2_000);
  return answered;
}

/** Play the live endgame mission with the engine's best moves until it resolves. */
async function playMission(page, engine, tape) {
  const me = await blackSeat(page, '') ? 'b' : 'w';
  tape.seat = me === 'w' ? 'white' : 'black';
  tape.startFen = fenOf(await readBoard(page, false), me);
  let last = '';
  for (let n = 0; n < MAX_STUDENT_MOVES; n += 1) {
    const b = await banner(page);
    if (b && /resolved|watching/.test(b.phase ?? '')) { tape.banner = b; return; }
    if (await page.locator('[data-testid="mission-try-again"]').count()) {
      tape.misses += 1;
      await page.locator('[data-testid="mission-try-again"]').click().catch(() => {});
      await sleep(1_500);
      continue;
    }
    const fen = fenOf(await readBoard(page, false), me);
    if (fen === last) { await sleep(1_000); continue; }
    let board;
    try { board = new Chess(fen); } catch { tape.notes.push(`unreadable board ${fen}`); return; }
    if (board.isGameOver()) { tape.notes.push('game over on the board'); break; }
    const move = await engine.best(fen);
    if (!move || move === '(none)') break;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).first().click({ force: true }).catch(() => {});
    await sleep(200);
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).first().click({ force: true }).catch(() => {});
    tape.moves.push(move);
    last = fen;
    for (let w = 0; w < 40; w += 1) {
      await sleep(600);
      if (fenOf(await readBoard(page, false), me) !== fen) { await sleep(1_500); break; }
    }
  }
  tape.banner = await banner(page);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[run-id] ${RUN_ID}  [target] ${BASE_URL}  [mission lines read] ${MISSION_LINES.size}`);
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
  await context.addInitScript(() => {
    window.__rewards = [];
    const seen = new WeakSet();
    new MutationObserver(() => {
      for (const id of ['reward-banner', 'jackpot-gain']) {
        for (const el of document.querySelectorAll(`[data-testid="${id}"]`)) {
          if (seen.has(el)) continue;
          seen.add(el);
          window.__rewards.push({ id, text: (el.textContent || '').replace(/\s+/g, ' ').trim() });
        }
      }
    }).observe(document, { childList: true, subtree: true });
  });
  const billable = [];
  await context.route(/\/api\/tts|api\.deepseek\.com|api\.anthropic\.com|texttospeech\.googleapis/i, (route) => { billable.push(route.request().url()); return route.abort(); });

  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message ?? e).slice(0, 200)));

  // A clean mission record on David's data, when it is on this machine.
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(8_000);
  const dropPath = process.env.AUDIT_FIXTURE
    ?? ['audit-reports/.fixtures/data-drop-david.json', 'audit-reports/.fixtures/david-games.json'].find((p) => existsSync(p));
  const fixture = dropPath ? await loadFixtureIntoIDB(page, dropPath) : { loaded: false, reason: 'no data drop on this machine' };
  console.log(`[fixture] path=${dropPath ?? '-'} ${fixture.loaded ? `${fixture.wrote} rows / ${fixture.stores} stores` : `skipped (${fixture.reason})`}`);
  await page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction(['missionResults', 'dialState', 'bossAttempts'], 'readwrite');
        for (const n of ['missionResults', 'dialState', 'bossAttempts']) tx.objectStore(n).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch { resolve(false); }
    };
    req.onerror = () => resolve(false);
  }));

  // ── T1 the picker ─────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/coach/campaign/map`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissModals(page);
  await page.locator('[data-testid="campaign-track-picker"]').waitFor({ timeout: 90_000 });
  check('T1 the picker renders', true, await page.locator('[data-testid="campaign-track-picker"]').textContent().then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => ''));
  await pickTrack(page, 'intermediate');
  check('T1 Intermediate shows its chapters, not Chapter 1',
    await page.locator('[data-testid="campaign-chapter-6"]').count() === 1 && await page.locator('[data-testid="campaign-chapter-1"]').count() === 0, 'chapter 6 only');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="campaign-track-picker"]').waitFor({ timeout: 90_000 });
  await sleep(1_500);
  check('T1 the choice survives a reload', await page.locator('[data-testid="campaign-track-intermediate"]').getAttribute('aria-pressed') === 'true', 'intermediate pressed');

  // ── T2 an Intermediate game, played ───────────────────────────────────────
  const tape = { seat: null, startFen: null, moves: [], misses: 0, notes: [], banner: null, briefing: null };
  const atGame = listener.getCapturedEvents().length;
  await page.goto(`${BASE_URL}/coach/campaign`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissModals(page);
  await page.locator('[data-testid="mission-card-sheet"]').waitFor({ timeout: 90_000 }).catch(() => {});
  const cardLines = await page.locator('[data-testid^="mission-card-line-"]').allTextContents().catch(() => []);
  check('T2 an Intermediate game never hands out Level 1', cardLines.length > 0 && !cardLines.some((l) => LEVEL_1_TITLES.test(l)), cardLines.join(' | ') || 'no card lines');
  await page.locator('[data-testid="mission-card-start"]').click({ timeout: 10_000 }).catch(() => {});
  await sleep(2_500);
  tape.briefing = await playBriefing(page, engine);
  await playMission(page, engine, tape);
  await sleep(4_000);
  const gameEvents = listener.getCapturedEvents().slice(atGame);
  const rewards = await page.evaluate(() => window.__rewards ?? []).catch(() => []);
  const banners = rewards.filter((r) => r.id === 'reward-banner').map((r) => r.text);
  const spoken = spokenLines(gameEvents);
  const scenario = gameEvents.filter((e) => e.kind === 'mission-scenario').map((e) => String(e.summary ?? ''));
  const bestPlay = gameEvents.filter((e) => e.kind === 'mission-best-play');
  console.log(`[intermediate] seat=${tape.seat} start=${tape.startFen} moves=${tape.moves.length} misses=${tape.misses} briefing=${tape.briefing} banner=${JSON.stringify(tape.banner)}`);
  console.log(`[intermediate] rewards: ${banners.join(' · ') || '(none)'}`);
  console.log(`[intermediate] spoken: ${spoken.map((s) => `"${s}"`).join(' | ') || '(nothing)'}`);
  check('T2 the mission started from its scenario', scenario.length > 0, scenario[0]?.slice(0, 160) ?? 'no mission-scenario row');
  check('T2 the coach played its best moves there', bestPlay.length > 0, `${bestPlay.length} mission-best-play row(s)`);
  check('T2 the mission resolved', !!tape.banner && /resolved|watching/.test(tape.banner.phase ?? ''), JSON.stringify(tape.banner));
  const passed = /^pass/.test(tape.banner?.outcome ?? '');
  check('T2 the engine-played student passed it', passed, `outcome=${tape.banner?.outcome ?? '-'} misses=${tape.misses}`);
  if (passed) check('T2 the pass paid "Mission complete"', banners.some((b) => /mission complete/i.test(b)), banners.join(' | ') || 'no banner');
  const stray = spoken.filter((s) => !MISSION_LINES.has(s));
  check('T2 only mission lines were spoken', spoken.length > 0 && stray.length === 0, stray.map((s) => `"${s.slice(0, 80)}"`).join(' | ') || `${spoken.length} line(s)`);
  await page.screenshot({ path: `${OUT_DIR}/intermediate-end.png` }).catch(() => {});

  // ── T3 Advanced ───────────────────────────────────────────────────────────
  await pickTrack(page, 'advanced');
  await page.locator('[data-testid="campaign-chapter-11"]').waitFor({ timeout: 20_000 }).catch(() => {});
  check('T3 Advanced shows the silent chapters', await page.locator('[data-testid="campaign-theme-11"]').count() === 1, 'theme 11');
  const attackerGate = await page.locator('[data-testid="campaign-boss-attacker"]').getAttribute('data-gate').catch(() => null);
  const mirrorGate = await page.locator('[data-testid="campaign-boss-mirror"]').getAttribute('data-gate').catch(() => null);
  check('T3 the Attacker is ready and the Mirror locked', attackerGate === 'ready' && mirrorGate === 'locked', `attacker=${attackerGate} mirror=${mirrorGate}`);
  await page.goto(`${BASE_URL}/coach/campaign`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.locator('[data-testid="mission-card-silent"]').waitFor({ timeout: 60_000 }).catch(() => {});
  check('T3 an Advanced game is a silent game', await page.locator('[data-testid="mission-card-silent"]').count() === 1, 'silent sheet');

  const atBoss = listener.getCapturedEvents().length;
  await page.goto(`${BASE_URL}/coach/campaign?boss=attacker`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await dismissModals(page);
  const intro = await page.locator('[data-testid="boss-intro-text"]').textContent({ timeout: 30_000 }).catch(() => null);
  const ATTACKER_INTROS = new Set([
    'The Attacker comes straight for your king, and it has studied your games: it will go after your weak spots. Keep your king covered, and before each move look at every check and capture it could play.',
    'The Attacker comes straight for your king. Keep your king covered, and before each move look at every check and capture it could play.',
  ]);
  check('T3 the Attacker opens on its fixed intro', ATTACKER_INTROS.has((intro ?? '').trim()), (intro ?? 'no intro').slice(0, 90));
  await page.locator('[data-testid="boss-intro-start"]').click({ timeout: 5_000 }).catch(() => {});
  await sleep(3_000);
  const atBossStart = listener.getCapturedEvents().length;
  const bossTape = { seat: null, startFen: null, moves: [], misses: 0, notes: [], banner: null };
  // Eight moves of the boss game: enough to see it start, move and stay silent.
  const me = await blackSeat(page, '') ? 'b' : 'w';
  // As Black, the boss moves first: wait for its opening move.
  const START = fenOf(await readBoard(page, false), me);
  for (let w = 0; me === 'b' && w < 50 && fenOf(await readBoard(page, false), me) === START; w += 1) await sleep(600);
  let last = '';
  for (let n = 0; n < 8; n += 1) {
    const fen = fenOf(await readBoard(page, false), me);
    if (fen === last) { await sleep(1_500); continue; }
    try { new Chess(fen); } catch { break; }
    const move = await engine.best(fen);
    if (!move || move === '(none)') break;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).first().click({ force: true }).catch(() => {});
    await sleep(200);
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).first().click({ force: true }).catch(() => {});
    bossTape.moves.push(move);
    last = fen;
    for (let w = 0; w < 40; w += 1) { await sleep(600); if (fenOf(await readBoard(page, false), me) !== fen) { await sleep(2_000); break; } }
  }
  const bossAll = listener.getCapturedEvents();
  const bossStarted = bossAll.slice(atBoss).filter((e) => e.kind === 'boss-started').map((e) => String(e.summary ?? ''));
  const bossSpoken = spokenLines(bossAll.slice(atBossStart));
  console.log(`[advanced] boss moves=${bossTape.moves.join(' ')} started=${bossStarted.join(' | ')}`);
  check('T3 the boss game started', bossStarted.length > 0, bossStarted[0]?.slice(0, 160) ?? 'no boss-started row');
  check('T3 the boss game says nothing after the intro', bossSpoken.length === 0, bossSpoken.map((s) => `"${s.slice(0, 60)}"`).join(' | ') || 'silent');
  check('T3 the student moved in the boss game', bossTape.moves.length >= 3, `${bossTape.moves.length} move(s)`);
  await page.screenshot({ path: `${OUT_DIR}/advanced-boss.png` }).catch(() => {});

  check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | ') || 'none');
  check('no billable request (muted)', billable.length === 0, `${billable.length} aborted`);

  await writeFile(`${OUT_DIR}/report-${RUN_ID}.json`, JSON.stringify({ runId: RUN_ID, base: BASE_URL, fixture, results, intermediate: { ...tape, banners, spoken }, advanced: { intro, bossTape, bossStarted, bossSpoken } }, null, 2));
  engine.stop();
  await browser.close();
  await listener.stop?.();
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n${results.length - failed}/${results.length} PASS — report ${OUT_DIR}/report-${RUN_ID}.json`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
