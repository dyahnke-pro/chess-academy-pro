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
// David 2026-09-10: "reaudit asking new questions but testing the same surface
// functions." VARIANT 0 = primary phrasing; 1/2 = the `v:[alt1,alt2]` alternates
// per cell — SAME function, DIFFERENT words. Each consecutive pass runs a new
// variant so a green streak proves the FUNCTION works, not that we memorised a
// string.
const VARIANT = Math.max(0, Math.min(2, Number(process.env.MATRIX_VARIANT || 0)));
const phrasing = (cell) => (VARIANT > 0 && cell.v && cell.v[VARIANT - 1]) ? cell.v[VARIANT - 1] : cell.ask ?? cell.cmd;
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

// Read the ACTUAL newest assistant bubble (data-testid=chat-message-assistant),
// not a body innerText line-diff. The old diff dropped short lines + required
// punctuation, which manufactured false [EMPTY] fails (David 2026-09-10: "you
// have clearly learned nothing" — the audit method itself was unreliable). The
// bubble is authoritative: messages render newest-first, so .first() is newest.
async function ask(p, q, { settleMs = 1500, maxPolls = 26 } = {}) {
  const box = p.locator('[data-testid="chat-text-input"]');
  const bubble = p.locator('[data-testid="chat-message-assistant"]');
  const beforeN = await bubble.count();
  await box.click();
  await box.pressSequentially(q, { delay: 6 });
  await box.press('Enter');
  let text = '';
  for (let i = 0; i < maxPolls; i += 1) {
    await sleep(settleMs);
    const n = await bubble.count();
    if (n > beforeN) {
      try { text = (await bubble.first().innerText()).trim(); } catch { text = ''; }
      // strip a leading avatar glyph line ("C\n\n…") the bubble renders
      text = text.replace(/^[A-Z]\s*\n+/, '').trim();
      // settle: keep polling a couple rounds so a streaming answer finishes.
      if (text.length > 3 && (/[.!?→]/.test(text) || /did you mean|walk through|import|paused/i.test(text)) && i > 1) break;
    }
  }
  return text;
}

// Seed a REAL middlegame by PLAYING the moves (play_move actuates reliably —
// proven; "set up the board after <moves>" does NOT and misroutes to a wrong
// walkthrough). Verifies the board actually reached the Italian before any read
// runs — a silent seed no-op must never contaminate the board questions.
const MID_TARGET = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
async function seedMid(p) {
  for (const mv of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5']) {
    await ask(p, `play the move ${mv} for me`, { maxPolls: 10 });
    await sleep(500);
  }
  // assert the seed landed (Italian: bishops + knights out). Return whether real.
  for (let i = 0; i < 6; i += 1) {
    const pl = await readPlacement(p);
    if (pl.c4 === 'wB' && pl.c5 === 'bB' && pl.f3 === 'wN' && pl.c6 === 'bN' && pl.e4 === 'wP' && pl.e5 === 'bP') return true;
    await sleep(1000);
  }
  return false;
}

// ── QUESTION MATRIX — representative ask per intent. { id, ask, mid?:true } ──
const QUESTIONS = [
  // live board reads (need a real position → mid)
  { id: 'assessment', ask: 'who is winning here?', v: ['how does this position stand?', 'evaluate this position for me'], mid: true },
  { id: 'whose-turn', ask: 'whose turn is it?', v: ['who moves now?', 'is it my move?'], mid: true },
  { id: 'material', ask: 'who has more material?', v: ["what's the material count?", 'am I up or down material?'], mid: true },
  { id: 'center', ask: 'who controls the center?', v: ["how's the center looking?", 'who owns the middle of the board?'], mid: true },
  { id: 'development', ask: 'who is better developed?', v: ['am I ahead in development?', "how's my development?"], mid: true },
  { id: 'structure', ask: 'do I have any weak pawns?', v: ["how are my pawns?", 'any pawn weaknesses in my camp?'], mid: true },
  { id: 'structure-name', ask: 'what pawn structure is this?', v: ['describe the pawn structure', 'what kind of pawn skeleton do we have?'], mid: true },
  { id: 'king-safety', ask: 'is my king safe?', v: ['how safe is my king?', 'any danger to my king?'], mid: true },
  { id: 'space', ask: 'do I have a space advantage?', v: ['who has more space?', 'am I cramped or do I have room?'], mid: true },
  { id: 'bishop-pair', ask: 'do I have the bishop pair?', v: ['who has the two bishops?', 'is the bishop pair mine?'], mid: true },
  { id: 'best-piece', ask: 'what is my best placed piece?', v: ['which of my pieces is strongest?', "what's my best piece right now?"], mid: true },
  { id: 'worst-piece', ask: 'what is my worst placed piece?', v: ['which piece of mine is badly placed?', "what's my worst piece?"], mid: true },
  { id: 'open-files', ask: 'are there any open files?', v: ['which files are open?', 'any open lines for the rooks?'], mid: true },
  { id: 'pawn-breaks', ask: 'what pawn breaks do I have?', v: ['what pawn break should I aim for?', 'how do I break the position open?'], mid: true },
  { id: 'key-squares', ask: 'what are the key squares here?', v: ['which squares matter most here?', 'what are the important squares?'], mid: true },
  { id: 'maneuver', ask: 'where should my knight go?', v: ['how do I improve my knight?', "what's the best square for my knight?"], mid: true },
  { id: 'my-plan', ask: 'what is my plan here?', v: ['what should I be doing here?', 'give me a plan for this position'], mid: true },
  { id: 'opponent-plan', ask: 'what is their plan?', v: ['what is my opponent trying to do?', 'what are they setting up?'], mid: true },
  { id: 'hanging', ask: 'is anything hanging?', v: ['are any pieces undefended?', 'is anything loose on the board?'], mid: true },
  { id: 'threats', ask: 'are there any threats?', v: ['what is being threatened?', 'any immediate threats I should see?'], mid: true },
  { id: 'tactics-avail', ask: 'can I win material here?', v: ['is there a tactic here?', 'any combinations available?'], mid: true },
  { id: 'piece-purpose', ask: 'what does my bishop on g2 do?', v: ["what's the role of my g2 bishop?", 'why is my bishop on g2?'], mid: true },
  { id: 'square-control', ask: 'who controls d5?', v: ["who's fighting for d5?", 'is d5 mine or theirs?'], mid: true },
  { id: 'last-move', ask: 'what was the last move?', v: ['what did they just play?', 'what move was just made?'], mid: true },
  // moves
  { id: 'best-move', ask: 'what is the best move?', v: ['what should I play here?', "what's the strongest move?"], mid: true },
  { id: 'why-best', ask: 'why is that the best move?', v: ['why is that move good?', 'what makes that the best move?'], mid: true },
  { id: 'candidate', ask: 'is Nd5 a good move here?', v: ['should I play Nd5?', 'what about Nd5 here?'], mid: true },
  { id: 'master-play', ask: 'what do masters play in the Italian?', v: ['how do the pros handle the Italian?', 'what main line do masters choose in the Italian?'] },
  { id: 'hint', ask: 'give me a hint', v: ['can I get a hint?', 'nudge me in the right direction'], mid: true },
  // concepts / teaching
  { id: 'concept', ask: "what's a fork?", v: ['explain what a fork is', 'how does a fork work?'] },
  { id: 'fundamentals', ask: 'teach me the fundamentals', v: ['what are the basics I should know?', 'teach me the core principles'] },
  { id: 'theory', ask: 'how do I play against an isolated queen pawn?', v: ["how do I handle an isolated queen's pawn?", "what's the plan versus an IQP?"] },
  { id: 'teaching-method', ask: 'how do you teach the Caro-Kann?', v: ["walk me through how you'd teach the Caro-Kann", 'how would you coach the Caro-Kann?'] },
  { id: 'famous-game', ask: 'show me a famous game', v: ['show me a classic game', 'can you show a famous master game?'] },
  // openings
  { id: 'opening-profile', ask: 'how do I play the Sicilian?', v: ['teach me the Sicilian', "what's the idea behind the Sicilian?"] },
  { id: 'opening-traps', ask: 'what are the traps in the Italian?', v: ['any traps I should know in the Italian?', 'show me Italian Game traps'] },
  { id: 'name-opening', ask: 'what opening is 1.e4 c6?', v: ['what opening starts with 1.e4 c6?', 'which opening is e4 c6?'] },
  { id: 'counter-rep', ask: 'what should I play against the London?', v: ['how do I meet the London System?', "what's a good answer to the London?"] },
  // self / stats (no imported games on a fresh context — expect honest "import" not a deflect)
  { id: 'stats', ask: "what's my rating?", v: ['how strong am I?', 'what rating am I?'] },
  { id: 'progress', ask: 'am I improving?', v: ['am I getting better?', "how's my progress?"] },
  { id: 'strengths', ask: 'what am I good at?', v: ['what are my strengths?', 'where do I play well?'] },
  { id: 'mistakes', ask: 'what mistakes do I make?', v: ['what are my common errors?', 'what do I keep getting wrong?'] },
  { id: 'weakness-brief', ask: 'what should I work on?', v: ['what should I improve?', 'where should I focus my training?'] },
  // tactics / endgame / app
  { id: 'tactics-profile', ask: 'how are my tactics?', v: ["how's my tactical ability?", 'am I good at tactics?'] },
  { id: 'endgame', ask: 'how do I win a king and pawn endgame?', v: ['teach me king and pawn endgames', 'how do I convert a king and pawn ending?'] },
  { id: 'time-trouble', ask: 'do I get into time trouble?', v: ['do I manage my clock well?', 'am I prone to time pressure?'] },
  { id: 'app-help', ask: 'what does the tactics tab do?', v: ['explain the tactics section', "what's on the tactics page?"] },
  { id: 'settings', ask: 'how do I change the board theme?', v: ['how do I change how the board looks?', 'where do I set the board colors?'] },
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
    id: 'play_move', cmd: 'play the move e4 for me', v: ['make the move e4', 'go ahead and play e4'],
    verify: async (p) => { const before = await readPlacement(p); return placementChanged(p, before); },
    check: async (p) => { const pl = await readPlacement(p); return pl.e4 === 'wP' && !pl.e2; },
  },
  {
    id: 'take_back_move', cmd: 'take that move back', v: ['undo that move', 'take back the last move'],
    setup: async (p) => { await ask(p, 'play the move e4 for me'); await verifyPlacement(p, placementOf('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')); },
    check: async (p) => samePlacement(await readPlacement(p), placementOf(START)),
  },
  // NB: set_board_position is a BRAIN-only actuator for hypothetical demos
  // (setBoardPosition.ts) — there is no user-facing "set up the board after
  // <moves>" NL command, and that phrasing correctly routes to opening-teach.
  // The user-facing "put this line on the board" capability is start_walkthrough
  // (below), which is the cell that verifies board actuation from a named line.
  {
    id: 'reset_board', cmd: 'reset the board', v: ['clear the board', 'start the board over'],
    setup: async (p) => { await ask(p, 'play the move d4 for me'); await sleep(2000); },
    check: async (p) => samePlacement(await readPlacement(p), placementOf(START)),
  },
  {
    id: 'navigate_weaknesses', cmd: 'take me to my weaknesses', v: ['go to my weaknesses', 'open my weaknesses'],
    check: async (p) => { await sleep(2500); return /weakness/i.test(p.url()); },
  },
  {
    id: 'navigate_tactics', cmd: 'go to the tactics trainer', v: ['take me to tactics', 'open the puzzles'],
    check: async (p) => { await sleep(2500); return /tactic|puzzle|train/i.test(p.url()); },
  },
  {
    id: 'start_walkthrough', cmd: 'start a lesson on the Italian Game', v: ['teach me the Italian Game', 'walk me through the Italian Game'],
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
    id: 'quiz_user', cmd: 'quiz me on the Italian Game', v: ['test me on the Italian Game', 'give me a quiz on the Italian Game'],
    check: async (p) => {
      for (let i = 0; i < 10; i += 1) { await sleep(1500); const body = (await p.locator('body').innerText()).toLowerCase(); if (/quiz|which move|what would you play|your turn|find the/.test(body)) return true; }
      return false;
    },
  },
  {
    // David 2026-09-10: "set up a middlegame — it SHOULD be able to do that."
    // Drops a real middlegame puzzle position on the board (mirrors endgame).
    id: 'setup_middlegame', cmd: 'set up a middlegame', v: ['set up a middlegame position', 'practice a middlegame'],
    check: async (p) => { for (let i = 0; i < 8; i += 1) { await sleep(1500); if (!samePlacement(await readPlacement(p), placementOf(START))) return true; } return false; },
  },
  {
    // "practice a king and pawn endgame" drops a real endgame drill on the board.
    id: 'practice_endgame', cmd: 'practice a king and pawn endgame', v: ['let me try a rook endgame', 'drill pawn endings'],
    check: async (p) => { for (let i = 0; i < 8; i += 1) { await sleep(1500); const pl = await readPlacement(p); if (Object.keys(pl).length > 0 && Object.keys(pl).length < 28 && !samePlacement(pl, placementOf(START))) return true; } return false; },
  },
];

async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const report = { base: BASE, at: new Date().toISOString(), questions: [], actions: [] };

  // QUESTIONS — batches of 8 on a fresh page (reload between to avoid pollution).
  if (RUN_Q) {
  console.log(`\n═══ QUESTION MATRIX (variant ${VARIANT}) ═══`);
  const BATCH = 8;
  for (let start = 0; start < QUESTIONS.length; start += BATCH) {
    const batch = QUESTIONS.slice(start, start + BATCH);
    const { ctx, p, errs } = await newTeachPage(browser);
    let seededMid = false;
    for (const q of batch) {
      try {
        if (q.mid && !seededMid) { await ask(p, `set up the board after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.Nbd2 a6 7.Bb3 Ba7 8.h3 O-O 9.O-O`); await sleep(2500); seededMid = true; }
        const qText = phrasing(q);
        const a = await ask(p, qText);
        const deflect = a.includes(STOCK_DEFLECT);
        const empty = a.length < 8;
        const pass = !empty && !deflect;
        report.questions.push({ id: q.id, ask: qText, pass, deflect, empty, answer: a.slice(0, 160) });
        console.log(`${pass ? '✓' : '✗'} ${q.id.padEnd(16)} ${deflect ? '[STOCK DEFLECT]' : empty ? '[EMPTY]' : ''} ${a.slice(0, 90)}`);
      } catch (e) { report.questions.push({ id: q.id, ask: q.ask, pass: false, error: String(e).slice(0, 100) }); console.log(`✗ ${q.id.padEnd(16)} ERROR ${String(e).slice(0, 80)}`); }
    }
    if (errs.length) { console.log('  ⚠ page errors this batch:', errs.join(' | ')); report.questions.push({ id: `__batch_errs_${start}`, pass: false, errs }); }
    await ctx.close();
  }
  }

  // ACTIONS — fresh page each (state isolation matters).
  if (RUN_A) {
  console.log(`\n═══ ACTION MATRIX (variant ${VARIANT} — actuate for real, never fake-done) ═══`);
  for (const act of ACTIONS) {
    const { ctx, p, errs } = await newTeachPage(browser);
    const cmdText = phrasing(act);
    try {
      if (act.setup) await act.setup(p);
      await ask(p, cmdText, { maxPolls: 12 });
      const ok = act.check ? await act.check(p) : (act.verify ? await act.verify(p) : false);
      report.actions.push({ id: act.id, cmd: cmdText, pass: ok, errs });
      console.log(`${ok ? '✓' : '✗ FAKE-DONE?'} ${act.id.padEnd(20)} "${cmdText}"${errs.length ? ' ⚠' + errs.join(';') : ''}`);
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
