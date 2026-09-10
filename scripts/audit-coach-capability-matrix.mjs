/**
 * audit-coach-capability-matrix — the FULL coach capability matrix, driven live.
 * David 2026-09-10: "build a matrix audit that hits all of those things" — every
 * QUESTION type the coach answers AND every ACTION it can perform.
 *
 * Two matrices:
 *   QUESTIONS — one representative ask per intent/topic/aspect. PASS = the coach
 *     answered from a real lane (non-empty, NOT the stock grounded-fallback
 *     deflect, no pageerror). This catches a dead/deflecting intent, not prose
 *     quality.
 *   ACTIONS — tell the coach to DO the thing, then verify the APP/BOARD STATE
 *     actually changed (board placement / URL / a mounted lesson-quiz panel).
 *     This is the P4 "actuate for real, never fake-done" contract: a coach that
 *     SAYS "done" while the board is unchanged FAILS.
 *
 * Emits a per-cell PASS/FAIL grid + a JSON report. Live prod by default.
 * Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-coach-capability-matrix.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { readPlacement, placementOf, samePlacement, sleep } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
// Run sections separately so each fits a single timeout: MATRIX_SECTION =
// 'actions' | 'questions' | 'all' (default). The full matrix exceeds 10min.
const SECTION = (process.env.MATRIX_SECTION || 'all').toLowerCase();
const RUN_Q = SECTION === 'all' || SECTION === 'questions';
const RUN_A = SECTION === 'all' || SECTION === 'actions';
const STOCK_DEFLECT = "I can't verify that precisely from grounded data right now";
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// A quiet middlegame so board-read questions have real features to name.
const MID_FEN = 'r1bq1rk1/pp2ppbp/2np1np1/2p5/2P1P3/2NP1NP1/PP3PBP/R1BQ1RK1 w - - 0 9';

const lines = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean);

async function dismiss(p) {
  for (const [g, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) { try { const G = p.locator(g); await G.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* */ } }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* */ }
}

async function newTeachPage(browser) {
  const ctx = await browser.newContext(sandboxContextOptions());
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 100)));
  p.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (/same key|unique "key"|Maximum update depth|Each child in a list/.test(t)) errs.push('react: ' + t.slice(0, 90)); } });
  await p.addInitScript(() => { try { Object.defineProperty(document, 'visibilityState', { get: () => 'visible' }); } catch { /* */ } });
  await p.addInitScript(muteTtsForAudit);
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(p); await dismiss(p);
  await p.locator('[data-testid="chat-text-input"]').waitFor({ timeout: 20000 });
  return { ctx, p, errs };
}

async function ask(p, q, { settleMs = 1500, maxPolls = 26 } = {}) {
  const box = p.locator('[data-testid="chat-text-input"]');
  const before = new Set(lines(await p.locator('body').innerText()));
  await box.click();
  await box.pressSequentially(q, { delay: 6 });
  await box.press('Enter');
  let added = [];
  for (let i = 0; i < maxPolls; i += 1) {
    await sleep(settleMs);
    const now = lines(await p.locator('body').innerText());
    added = now.filter((l) => !before.has(l) && l.toLowerCase() !== q.toLowerCase() && l.length > 6);
    if (added.some((l) => /[.!?]/.test(l) || /did you mean|walk through|move 1|import/i.test(l)) && i > 1) break;
  }
  return added.join(' ').trim();
}

// ── QUESTION MATRIX — representative ask per intent. { id, ask, mid?:true } ──
const QUESTIONS = [
  // live board reads (need a real position → mid)
  { id: 'assessment', ask: 'who is winning here?', mid: true },
  { id: 'whose-turn', ask: 'whose turn is it?', mid: true },
  { id: 'material', ask: 'who has more material?', mid: true },
  { id: 'center', ask: 'who controls the center?', mid: true },
  { id: 'development', ask: 'who is better developed?', mid: true },
  { id: 'structure', ask: 'do I have any weak pawns?', mid: true },
  { id: 'structure-name', ask: 'what pawn structure is this?', mid: true },
  { id: 'king-safety', ask: 'is my king safe?', mid: true },
  { id: 'space', ask: 'do I have a space advantage?', mid: true },
  { id: 'bishop-pair', ask: 'do I have the bishop pair?', mid: true },
  { id: 'best-piece', ask: 'what is my best placed piece?', mid: true },
  { id: 'worst-piece', ask: 'what is my worst placed piece?', mid: true },
  { id: 'open-files', ask: 'are there any open files?', mid: true },
  { id: 'pawn-breaks', ask: 'what pawn breaks do I have?', mid: true },
  { id: 'key-squares', ask: 'what are the key squares here?', mid: true },
  { id: 'maneuver', ask: 'where should my knight go?', mid: true },
  { id: 'my-plan', ask: 'what is my plan here?', mid: true },
  { id: 'opponent-plan', ask: 'what is their plan?', mid: true },
  { id: 'hanging', ask: 'is anything hanging?', mid: true },
  { id: 'threats', ask: 'are there any threats?', mid: true },
  { id: 'tactics-avail', ask: 'can I win material here?', mid: true },
  { id: 'piece-purpose', ask: 'what does my bishop on g2 do?', mid: true },
  { id: 'square-control', ask: 'who controls d5?', mid: true },
  { id: 'last-move', ask: 'what was the last move?', mid: true },
  // moves
  { id: 'best-move', ask: 'what is the best move?', mid: true },
  { id: 'why-best', ask: 'why is that the best move?', mid: true },
  { id: 'candidate', ask: 'is Nd5 a good move here?', mid: true },
  { id: 'master-play', ask: 'what do masters play in the Italian?' },
  { id: 'hint', ask: 'give me a hint' , mid: true },
  // concepts / teaching
  { id: 'concept', ask: "what's a fork?" },
  { id: 'fundamentals', ask: 'teach me the fundamentals' },
  { id: 'theory', ask: 'how do I play against an isolated queen pawn?' },
  { id: 'teaching-method', ask: 'how do you teach the Caro-Kann?' },
  { id: 'famous-game', ask: 'show me a famous game' },
  // openings
  { id: 'opening-profile', ask: 'how do I play the Sicilian?' },
  { id: 'opening-traps', ask: 'what are the traps in the Italian?' },
  { id: 'name-opening', ask: 'what opening is 1.e4 c6?' },
  { id: 'counter-rep', ask: 'what should I play against the London?' },
  // self / stats (no imported games on a fresh context — expect honest "import" not a deflect)
  { id: 'stats', ask: "what's my rating?" },
  { id: 'progress', ask: 'am I improving?' },
  { id: 'strengths', ask: 'what am I good at?' },
  { id: 'mistakes', ask: 'what mistakes do I make?' },
  { id: 'weakness-brief', ask: 'what should I work on?' },
  // tactics / endgame / app
  { id: 'tactics-profile', ask: 'how are my tactics?' },
  { id: 'endgame', ask: 'how do I win a king and pawn endgame?' },
  { id: 'time-trouble', ask: 'do I get into time trouble?' },
  { id: 'app-help', ask: 'what does the tactics tab do?' },
  { id: 'settings', ask: 'how do I change the board theme?' },
];

// ── ACTION MATRIX — command, then verify real state change. ──
async function verifyPlacement(p, want) {
  for (let i = 0; i < 8; i += 1) { await sleep(1200); if (samePlacement(await readPlacement(p), want)) return true; }
  return false;
}
async function placementChanged(p, from) {
  for (let i = 0; i < 8; i += 1) { await sleep(1200); if (!samePlacement(await readPlacement(p), from)) return true; }
  return false;
}

const ACTIONS = [
  {
    id: 'play_move', cmd: 'play the move e4 for me',
    verify: async (p) => { const before = await readPlacement(p); return placementChanged(p, before); },
    check: async (p) => { const pl = await readPlacement(p); return pl.e4 === 'wP' && !pl.e2; },
  },
  {
    id: 'take_back_move', cmd: 'take that move back',
    setup: async (p) => { await ask(p, 'play the move e4 for me'); await verifyPlacement(p, placementOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')); },
    check: async (p) => samePlacement(await readPlacement(p), placementOf(START)),
  },
  // NB: set_board_position is a BRAIN-only actuator for hypothetical demos
  // (setBoardPosition.ts) — there is no user-facing "set up the board after
  // <moves>" NL command, and that phrasing correctly routes to opening-teach.
  // The user-facing "put this line on the board" capability is start_walkthrough
  // (below), which is the cell that verifies board actuation from a named line.
  {
    id: 'reset_board', cmd: 'reset the board',
    setup: async (p) => { await ask(p, 'play the move d4 for me'); await sleep(2000); },
    check: async (p) => samePlacement(await readPlacement(p), placementOf(START)),
  },
  {
    id: 'navigate_weaknesses', cmd: 'take me to my weaknesses',
    check: async (p) => { await sleep(2500); return /weakness/i.test(p.url()); },
  },
  {
    id: 'navigate_tactics', cmd: 'go to the tactics trainer',
    check: async (p) => { await sleep(2500); return /tactic|puzzle|train/i.test(p.url()); },
  },
  {
    id: 'start_walkthrough', cmd: 'start a lesson on the Italian Game',
    check: async (p) => {
      // The teach walkthrough mounts [walkthrough-skip]; verify it started AND
      // on the RIGHT opening (answer names "Italian"), not a fuzzy mismatch.
      for (let i = 0; i < 10; i += 1) {
        await sleep(1500);
        if (await p.locator('[data-testid="walkthrough-skip"], [data-testid="walkthrough-progress"]').count() > 0) {
          const body = (await p.locator('body').innerText()).toLowerCase();
          return /italian/.test(body);
        }
      }
      return false;
    },
  },
  {
    id: 'quiz_user', cmd: 'quiz me on the Italian Game',
    check: async (p) => {
      for (let i = 0; i < 10; i += 1) { await sleep(1500); const body = (await p.locator('body').innerText()).toLowerCase(); if (/quiz|which move|what would you play|your turn|find the/.test(body)) return true; }
      return false;
    },
  },
];

async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const report = { base: BASE, at: new Date().toISOString(), questions: [], actions: [] };

  // QUESTIONS — batches of 8 on a fresh page (reload between to avoid pollution).
  if (RUN_Q) {
  console.log('\n═══ QUESTION MATRIX ═══');
  const BATCH = 8;
  for (let start = 0; start < QUESTIONS.length; start += BATCH) {
    const batch = QUESTIONS.slice(start, start + BATCH);
    const { ctx, p, errs } = await newTeachPage(browser);
    let seededMid = false;
    for (const q of batch) {
      try {
        if (q.mid && !seededMid) { await ask(p, `set up the board after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.Nbd2 a6 7.Bb3 Ba7 8.h3 O-O 9.O-O`); await sleep(2500); seededMid = true; }
        const a = await ask(p, q.ask);
        const deflect = a.includes(STOCK_DEFLECT);
        const empty = a.length < 8;
        const pass = !empty && !deflect;
        report.questions.push({ id: q.id, ask: q.ask, pass, deflect, empty, answer: a.slice(0, 160) });
        console.log(`${pass ? '✓' : '✗'} ${q.id.padEnd(16)} ${deflect ? '[STOCK DEFLECT]' : empty ? '[EMPTY]' : ''} ${a.slice(0, 90)}`);
      } catch (e) { report.questions.push({ id: q.id, ask: q.ask, pass: false, error: String(e).slice(0, 100) }); console.log(`✗ ${q.id.padEnd(16)} ERROR ${String(e).slice(0, 80)}`); }
    }
    if (errs.length) { console.log('  ⚠ page errors this batch:', errs.join(' | ')); report.questions.push({ id: `__batch_errs_${start}`, pass: false, errs }); }
    await ctx.close();
  }
  }

  // ACTIONS — fresh page each (state isolation matters).
  if (RUN_A) {
  console.log('\n═══ ACTION MATRIX (actuate for real, never fake-done) ═══');
  for (const act of ACTIONS) {
    const { ctx, p, errs } = await newTeachPage(browser);
    try {
      if (act.setup) await act.setup(p);
      await ask(p, act.cmd, { maxPolls: 12 });
      const ok = act.check ? await act.check(p) : (act.verify ? await act.verify(p) : false);
      report.actions.push({ id: act.id, cmd: act.cmd, pass: ok, errs });
      console.log(`${ok ? '✓' : '✗ FAKE-DONE?'} ${act.id.padEnd(20)} "${act.cmd}"${errs.length ? ' ⚠' + errs.join(';') : ''}`);
    } catch (e) { report.actions.push({ id: act.id, cmd: act.cmd, pass: false, error: String(e).slice(0, 120) }); console.log(`✗ ${act.id.padEnd(20)} ERROR ${String(e).slice(0, 80)}`); }
    await ctx.close();
  }
  }

  await browser.close();

  const qPass = report.questions.filter((r) => r.pass && !r.id.startsWith('__')).length;
  const qTot = report.questions.filter((r) => !r.id.startsWith('__')).length;
  const aPass = report.actions.filter((r) => r.pass).length;
  console.log(`\n═══ RESULT: questions ${qPass}/${qTot} · actions ${aPass}/${report.actions.length} ═══`);
  const fails = [...report.questions, ...report.actions].filter((r) => !r.pass && !r.id.startsWith('__'));
  if (fails.length) console.log('FAILS:', fails.map((r) => r.id).join(', '));
  try { mkdirSync('audit-reports', { recursive: true }); const path = `audit-reports/coach-capability-matrix-${Date.now()}.json`; writeFileSync(path, JSON.stringify(report, null, 2)); console.log('report:', path); } catch { /* */ }
  process.exit(fails.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
