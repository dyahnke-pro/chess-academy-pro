// TRACK 1 — COACH CHAT GROUNDING **ACCURACY** (not just wiring).
//
// The standing-net plan (docs/plans/2026-09-10-coach-audit-standing-net.md).
// audit-coach-all-questions-prod.mjs already proves the coach GROUNDED (hit the
// assembler, not the stock fallback) — a WIRING check. Its per-lane ACCEPT
// regex passes a reply that is merely SHAPED like an answer: `best-move` passes
// "the best move is Nf3" whether Nf3 is best or a blunder; `position-assessment`
// passes on the word "winning" whether the eval is +5 or -5. A fluent-but-WRONG
// answer sails through. This audit closes that: it puts a KNOWN, oracle-rich
// position on the board via /coach/analyse, asks the board questions, and grades
// each CLAIM against an INDEPENDENT Stockfish/chess.js oracle computed here —
// never against the reply's shape.
//
// Verdicts per lane: works / BROKEN / cant-verify. A BROKEN row is a real
// finding for the coach broken-map. NO fixes — this only maps.
//
// The oracle is /usr/games/stockfish (apt) run in-script — genuinely
// independent of the app's own WASM engine. A NEGATIVE-CONTROL pass feeds each
// grader a deliberately-wrong reply and asserts it goes RED, so "works" means
// the grader can discriminate (coach-tab-graders.mjs doctrine).
//
// AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-coach-track1-accuracy-prod.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { falseBoardClaims } from './audit-lib/board-claims.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `t1acc-${Date.now().toString(36)}`;
const SF = process.env.STOCKFISH_BIN ?? '/usr/games/stockfish';

// ── the independent Stockfish oracle (in-script, not the app's engine) ───────
function sfEval(fen, depth = 16) {
  const input = `uci\nisready\nposition fen ${fen}\ngo depth ${depth}\n`;
  const out = spawnSync(SF, [], { input, encoding: 'utf8', timeout: 20000 }).stdout ?? '';
  let cp = null, mate = null, pvFirst = null;
  for (const line of out.split('\n')) {
    const mScore = /score (cp|mate) (-?\d+)/.exec(line);
    if (mScore && / pv /.test(line)) {
      if (mScore[1] === 'cp') { cp = Number(mScore[2]); mate = null; }
      else { mate = Number(mScore[2]); cp = null; }
      const mPv = / pv ([a-h][1-8][a-h][1-8][qrbn]?)/.exec(line);
      if (mPv) pvFirst = mPv[1];
    }
    const mBest = /^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/.exec(line);
    if (mBest) pvFirst = mBest[1];
  }
  return { cp, mate, bestUci: pvFirst }; // cp/mate from side-to-move POV
}

// magnitude in centipawns from stm POV; mate = ±100000
const asCp = (o) => (o.mate != null ? (o.mate > 0 ? 100000 : -100000) : (o.cp ?? 0));

// ── the curated oracle-rich positions ────────────────────────────────────────
// Each is legal (validated at runtime); the oracle is computed live, so these
// only need to BE the intended kind of position, not carry a hardcoded eval.
const POSITIONS = [
  { id: 'equal-quiet', fen: 'r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4',
    note: 'Ruy Lopez, roughly equal, nothing hanging' },
  { id: 'winning-stm', fen: 'r3k3/ppp2ppp/8/8/8/8/PPP2PPP/R3K1R1 w Qq - 0 1',
    note: 'White (to move) up a full rook (2R vs 1R)' },
  { id: 'losing-stm', fen: 'r3k3/ppp2ppp/8/8/8/8/PPP2PPP/R3K1R1 b Qq - 0 1',
    note: 'Black (to move) down a full rook — "am I winning?" honesty test' },
  { id: 'free-queen', fen: 'q6k/8/8/8/8/8/8/R6K w - - 0 1',
    note: 'White to move: Rxa8 wins the black queen for free (real tactic)' },
  { id: 'forced-mate', fen: '4k3/8/8/8/8/8/8/4KQ2 w - - 0 1',
    note: 'KQ vs K — forced mate for White' },
];

// the questions asked at every position (one per grounded lane under test)
const LANES = [
  { lane: 'position-assessment', q: 'Am I winning, losing, or roughly equal here? One word.' },
  { lane: 'best-move', q: 'What is the single best move here? Name the move.' },
  { lane: 'tactics-live', q: 'Is anything hanging or is there a tactic in this exact position?' },
];

// ── graders (each returns {verdict, reason}) — verdict: works|BROKEN|cant ─────
const SIGN_WIN = /\b(winning|better|ahead|advantage|edge|up (?:a|the|by)|clearly better|dominating)\b/i;
const SIGN_LOSE = /\b(losing|worse|behind|lost|down (?:a|the|by)|struggling|in trouble|busted)\b/i;
const SIGN_EQ = /\b(equal|even|balanced|roughly level|about even|level|drawish)\b/i;

function gradeAssessment(reply, oracle) {
  const cp = asCp(oracle);
  const expect = cp >= 150 ? 'win' : cp <= -150 ? 'lose' : 'eq';
  const saysWin = SIGN_WIN.test(reply), saysLose = SIGN_LOSE.test(reply), saysEq = SIGN_EQ.test(reply);
  if (expect === 'win') {
    if (saysLose && !saysWin) return { verdict: 'BROKEN', reason: `eval is +${(cp / 100).toFixed(1)} (winning) but coach says LOSING` };
    if (saysWin) return { verdict: 'works', reason: `winning, coach agrees` };
    if (saysEq) return { verdict: 'BROKEN', reason: `eval +${(cp / 100).toFixed(1)} but coach says equal` };
  } else if (expect === 'lose') {
    if (saysWin && !saysLose) return { verdict: 'BROKEN', reason: `eval is ${(cp / 100).toFixed(1)} (losing) but coach says WINNING` };
    if (saysLose) return { verdict: 'works', reason: `losing, coach agrees` };
    if (saysEq) return { verdict: 'BROKEN', reason: `eval ${(cp / 100).toFixed(1)} but coach says equal` };
  } else {
    if (saysEq) return { verdict: 'works', reason: `equal, coach agrees` };
    if (saysWin || saysLose) return { verdict: 'BROKEN', reason: `eval ~0 (equal) but coach claims an advantage` };
  }
  return { verdict: 'cant', reason: `no clear verdict word in reply` };
}

// pull SANs out of the reply, convert to UCI from the fen
function extractUciMoves(reply, fen) {
  const sanRe = /\b(O-O-O|O-O|[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?)\b/g;
  const found = new Set();
  let m;
  while ((m = sanRe.exec(reply)) !== null) {
    const san = m[1];
    if (/^[a-h][1-8]$/.test(san)) continue; // a bare square, not a move
    try { const c = new Chess(fen); const mv = c.move(san, { strict: false }); if (mv) found.add(mv.from + mv.to + (mv.promotion ?? '')); } catch { /* not legal here */ }
  }
  return [...found];
}

function gradeBestMove(reply, fen, oracle) {
  const ucis = extractUciMoves(reply, fen);
  if (!ucis.length) return { verdict: 'cant', reason: 'no legal SAN found in reply' };
  if (oracle.bestUci && ucis.includes(oracle.bestUci)) return { verdict: 'works', reason: `named engine best ${oracle.bestUci}` };
  // acceptable-alternative check: eval the coach's move, compare cp-loss vs best
  const cand = ucis[0];
  try {
    const c = new Chess(fen); c.move({ from: cand.slice(0, 2), to: cand.slice(2, 4), promotion: cand[4] });
    const after = sfEval(c.fen(), 14);
    const candCpForMover = -asCp(after); // after opponent's turn, negate to mover POV
    const bestCp = asCp(oracle);
    const loss = bestCp - candCpForMover;
    if (loss <= 80) return { verdict: 'works', reason: `${cand} within ${Math.round(loss)}cp of best ${oracle.bestUci}` };
    if (loss >= 150) return { verdict: 'BROKEN', reason: `coach's "best" ${cand} loses ${Math.round(loss)}cp vs engine best ${oracle.bestUci}` };
    return { verdict: 'cant', reason: `${cand} is ${Math.round(loss)}cp from best — marginal` };
  } catch { return { verdict: 'cant', reason: `could not evaluate ${cand}` }; }
}

const TACTIC_AFFIRM = /\b(forks?|pins?|skewers?|discover|hanging|wins? (?:a|the) (?:pawn|piece|knight|bishop|rook|queen)|take (?:the|it)|capture|free (?:piece|queen|rook)|drops? (?:a|the))\b/i;
const TACTIC_NONE = /\b(nothing (?:is )?hanging|no (?:immediate )?tactic|no hanging|nothing tactical|quiet|no fork|nothing to (?:take|grab)|no immediate)\b/i;

function gradeTactics(reply, fen, oracle) {
  // is there really a tactic? big swing from a capture / a mate.
  const cp = asCp(oracle);
  const tacticPresent = oracle.mate != null || cp >= 250;
  if (tacticPresent) {
    if (TACTIC_AFFIRM.test(reply)) return { verdict: 'works', reason: `tactic present, coach flags it` };
    if (TACTIC_NONE.test(reply)) return { verdict: 'BROKEN', reason: `a real tactic exists (best ${oracle.bestUci}, +${(cp / 100).toFixed(1)}) but coach says nothing is there` };
    return { verdict: 'cant', reason: `tactic present; reply neither flags nor denies clearly` };
  }
  // quiet position — coach must NOT invent a specific tactic
  if (TACTIC_NONE.test(reply)) return { verdict: 'works', reason: `quiet, coach correctly says nothing there` };
  if (/\b(forks?|pins?|skewers?)\b/i.test(reply) && !TACTIC_NONE.test(reply)) return { verdict: 'BROKEN', reason: `quiet position but coach names a fork/pin/skewer that isn't there` };
  return { verdict: 'cant', reason: `quiet; reply neither denies nor clearly invents` };
}

const GRADERS = { 'position-assessment': gradeAssessment, 'best-move': gradeBestMove, 'tactics-live': gradeTactics };

// ── NEGATIVE CONTROL — prove the graders discriminate before trusting a green ─
function negativeControls() {
  const fails = [];
  const check = (name, got) => { if (got.verdict !== 'BROKEN') fails.push(`${name} did NOT go red (got ${got.verdict}: ${got.reason})`); };
  check('assessment', gradeAssessment('You are clearly winning here.', { cp: -500 }));
  check('bestmove', gradeBestMove('The best move is a2a3.', 'q6k/8/8/8/8/8/8/R6K w - - 0 1', sfEval('q6k/8/8/8/8/8/8/R6K w - - 0 1')));
  check('tactics', gradeTactics('Nothing is hanging, quiet position.', 'q6k/8/8/8/8/8/8/R6K w - - 0 1', sfEval('q6k/8/8/8/8/8/8/R6K w - - 0 1')));
  return fails;
}

// ── the browser drive ────────────────────────────────────────────────────────
const results = [];
const rec = (position, lane, question, reply, oracle, grade, boardBad) => {
  const verdict = boardBad.length ? 'BROKEN' : grade.verdict;
  const reason = boardBad.length ? `false board claim: ${boardBad.join('; ')}` : grade.reason;
  results.push({ position, lane, question, reply: reply.slice(0, 300), oracle, verdict, reason });
  const icon = verdict === 'works' ? '✅' : verdict === 'BROKEN' ? '❌' : '➖';
  console.log(`${icon} [${position}/${lane}] ${verdict} — ${reason}`);
  if (verdict !== 'works') console.log(`     reply: "${reply.slice(0, 160)}"`);
};

async function main() {
  console.log(`[track1-accuracy] oracle=${SF} target=${BASE} run=${RUN_ID}`);
  // validate FENs + precompute oracle
  for (const p of POSITIONS) {
    try { new Chess(p.fen); } catch { console.log(`  ⚠ invalid FEN skipped: ${p.id}`); p.skip = true; continue; }
    p.oracle = sfEval(p.fen, 18);
    console.log(`  oracle[${p.id}] best=${p.oracle.bestUci} cp=${p.oracle.cp} mate=${p.oracle.mate}  (${p.note})`);
  }
  const ncFails = negativeControls();
  if (ncFails.length) { console.log('\n🚨 NEGATIVE CONTROLS FAILED — graders do not discriminate, aborting:'); ncFails.forEach((f) => console.log('   ' + f)); process.exit(2); }
  console.log('  negative controls: all graders go red on wrong input ✅\n');

  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch {} }, RUN_ID);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

  await page.goto(`${BASE}/coach/analyse`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(10000);
  await page.locator('[data-testid="coach-analyse-page"]').first().waitFor({ timeout: 30000 }).catch(() => {});

  for (const p of POSITIONS) {
    if (p.skip) continue;
    console.log(`\n── ${p.id} (${p.fen}) ──`);
    // load the FEN
    const fenBox = page.locator('[data-testid="fen-input"]').first();
    await fenBox.click({ force: true }).catch(() => {});
    await fenBox.fill(p.fen).catch(() => {});
    await page.locator('[data-testid="load-fen-btn"]').first().click({ force: true }).catch(() => {});
    // wait for the initial analyse explanation to render
    const expl = page.locator('[data-testid="coach-explanation"]').first();
    await expl.waitFor({ timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(6000);

    for (const { lane, q } of LANES) {
      const before = (await expl.innerText().catch(() => '')) || '';
      const box = page.locator('[data-testid="chat-text-input"]:visible').first();
      await box.click({ force: true }).catch(() => {});
      await box.pressSequentially(q, { delay: 8 }).catch(() => {});
      await box.press('Enter').catch(() => {});
      // wait for coach-explanation to grow (follow-up appends with "\n\n")
      let reply = '';
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1500);
        const now = (await expl.innerText().catch(() => '')) || '';
        if (now.length > before.length + 8) { reply = now.slice(before.length).trim(); if (reply.length > 20) { await page.waitForTimeout(2000); reply = ((await expl.innerText().catch(() => '')) || '').slice(before.length).trim(); break; } }
      }
      const grade = GRADERS[lane](reply, p.fen, p.oracle);
      const boardBad = falseBoardClaims(reply, p.fen);
      rec(p.id, lane, q, reply || '(no reply)', { best: p.oracle.bestUci, cp: p.oracle.cp, mate: p.oracle.mate }, reply ? grade : { verdict: 'BROKEN', reason: 'no reply rendered' }, reply ? boardBad : []);
    }
  }

  // report
  const works = results.filter((r) => r.verdict === 'works').length;
  const broken = results.filter((r) => r.verdict === 'BROKEN').length;
  const cant = results.filter((r) => r.verdict === 'cant').length;
  console.log(`\n── Track 1 accuracy grid ──`);
  console.log(`works ${works} · BROKEN ${broken} · cant-verify ${cant} · pageerrors ${pageErrors.length}`);
  const dir = `audit-reports/coach-track1-accuracy-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, pageErrors }, null, 2));
  console.log(`report: ${dir}/report.json`);
  await browser.close();
  process.exitCode = broken > 0 ? 1 : 0;
}
main();
