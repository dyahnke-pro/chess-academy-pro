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
import { spawn } from 'node:child_process';
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
// spawn (NOT spawnSync): stdin stays open during the search, so the Debian
// build actually emits its `info … score … pv …` lines. spawnSync EOFs stdin
// mid-search and the build then prints only `bestmove` with no score (the bug
// the negative controls caught before any green was trusted).
function sfEval(fen, depth = 16) {
  return new Promise((resolve) => {
    const p = spawn(SF, []);
    let cp = null, mate = null, bestUci = null, buf = '';
    const done = () => { try { p.kill(); } catch { /* already gone */ } resolve({ cp, mate, bestUci }); };
    const guard = setTimeout(done, 12000);
    p.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 1);
        const s = /score (cp|mate) (-?\d+)/.exec(line);
        if (s && / pv /.test(line)) {
          if (s[1] === 'cp') { cp = Number(s[2]); mate = null; } else { mate = Number(s[2]); cp = null; }
          const m = / pv ([a-h][1-8][a-h][1-8][qrbn]?)/.exec(line);
          if (m) bestUci = m[1];
        }
        const b = /^bestmove ([a-h][1-8][a-h][1-8][qrbn]?)/.exec(line);
        if (b) { bestUci = b[1]; clearTimeout(guard); done(); return; }
      }
    });
    p.stdin.write(`uci\nisready\nposition fen ${fen}\ngo depth ${depth}\n`);
  }); // cp/mate from side-to-move POV
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
  { id: 'free-queen', fen: '3k4/8/8/3q4/8/8/3R4/3K4 w - - 0 1',
    note: 'White to move: Rxd5 wins the black queen for free (real tactic, no check)' },
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
// The coach almost always states a NUMBER ("5.5 points against you", "0.4 in
// your favour", "win for you, mate in 29"). Grade on the number+sign vs the
// oracle, with verdict words as the fallback — far more robust than word-only,
// and negation-guarded so "not yet an advantage" doesn't read as winning.
const POS = /\b(in your favou?r|for you|winning|better|ahead|advantage|in hand|decisive|dominating|up (?:a|the|by))\b/i;
const NEG = /\b(against you|behind|losing|worse|lost|down (?:a|the|by)|in trouble|busted|struggling)\b/i;
const EQW = /\b(equal|even|balanced|roughly level|about even|dead level|drawish|nothing in it)\b/i;
const NEGATED_POS = /\bnot (?:yet )?(?:an? )?(?:advantage|winning|better|ahead|decisive)\b/i;

function gradeAssessment(reply, _fen, oracle) { // (reply, fen, oracle) — fen unused, kept for uniform dispatch
  const cp = asCp(oracle);
  const expectSign = cp >= 120 ? 1 : cp <= -120 ? -1 : 0;
  const magM = /(-?\d+(?:\.\d+)?)\s*(?:points?|pawns?|of a point)/i.exec(reply);
  const coachMag = magM ? Math.abs(Number(magM[1])) : null;
  const posHit = POS.test(reply) && !NEGATED_POS.test(reply);
  const negHit = NEG.test(reply);
  let coachSign = negHit && !posHit ? -1 : posHit && !negHit ? 1 : EQW.test(reply) ? 0 : null;
  if (coachSign === null && /win for you|mate in/i.test(reply)) coachSign = 1;
  if (coachSign === null && coachMag !== null) coachSign = 0; // a number with no side word ~ small/equal
  if (coachSign === null) return { verdict: 'cant', reason: 'no verdict word or eval number in reply' };
  // OPPOSITE sign = the headline fluent-but-wrong bug
  if (expectSign !== 0 && coachSign !== 0 && coachSign === -expectSign)
    return { verdict: 'BROKEN', reason: `oracle ${(cp / 100).toFixed(1)} but coach states the OTHER side (${coachSign > 0 ? 'winning' : 'losing'})` };
  if (coachMag !== null && Math.abs(cp) > 60 && Math.abs(coachMag - Math.abs(cp) / 100) > 1.5)
    return { verdict: 'BROKEN', reason: `coach magnitude ${coachMag} vs oracle ${(Math.abs(cp) / 100).toFixed(1)} (off by >1.5)` };
  if (expectSign === 0) {
    if (coachMag !== null && coachMag >= 1.2) return { verdict: 'BROKEN', reason: `oracle ~0 (equal) but coach claims a ${coachMag}-pawn edge` };
    return { verdict: 'works', reason: `equal-ish, coach agrees (${coachMag ?? '~0'})` };
  }
  return { verdict: 'works', reason: `sign+size match (oracle ${(cp / 100).toFixed(1)}, coach ${coachSign > 0 ? '+' : '-'}${coachMag ?? '?'})` };
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

async function gradeBestMove(reply, fen, oracle) {
  const ucis = extractUciMoves(reply, fen);
  if (!ucis.length) return { verdict: 'cant', reason: 'no legal SAN found in reply' };
  if (oracle.bestUci && ucis.includes(oracle.bestUci)) return { verdict: 'works', reason: `named engine best ${oracle.bestUci}` };
  // acceptable-alternative check: eval the coach's move, compare cp-loss vs best
  const cand = ucis[0];
  try {
    const c = new Chess(fen); c.move({ from: cand.slice(0, 2), to: cand.slice(2, 4), promotion: cand[4] });
    const after = await sfEval(c.fen(), 14);
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
    // Denial FIRST — "nothing is hanging" contains "hanging", which the affirm
    // pattern would otherwise match (the negative-control catch).
    if (TACTIC_NONE.test(reply)) return { verdict: 'BROKEN', reason: `a real tactic exists (best ${oracle.bestUci}, +${(cp / 100).toFixed(1)}) but coach says nothing is there` };
    if (TACTIC_AFFIRM.test(reply)) return { verdict: 'works', reason: `tactic present, coach flags it` };
    return { verdict: 'cant', reason: `tactic present; reply neither flags nor denies clearly` };
  }
  // quiet position — coach must NOT invent a specific tactic
  if (TACTIC_NONE.test(reply)) return { verdict: 'works', reason: `quiet, coach correctly says nothing there` };
  if (/\b(forks?|pins?|skewers?)\b/i.test(reply) && !TACTIC_NONE.test(reply)) return { verdict: 'BROKEN', reason: `quiet position but coach names a fork/pin/skewer that isn't there` };
  return { verdict: 'cant', reason: `quiet; reply neither denies nor clearly invents` };
}

const GRADERS = { 'position-assessment': gradeAssessment, 'best-move': gradeBestMove, 'tactics-live': gradeTactics };

// ── NEGATIVE CONTROL — prove the graders discriminate before trusting a green ─
async function negativeControls() {
  const fails = [];
  const tacticFen = '3k4/8/8/3q4/8/8/3R4/3K4 w - - 0 1'; // Rxd5 wins the queen
  const tacticOracle = await sfEval(tacticFen, 16);
  const check = (name, got) => { if (got.verdict !== 'BROKEN') fails.push(`${name} did NOT go red (got ${got.verdict}: ${got.reason})`); };
  check('assessment', gradeAssessment('You are clearly winning here.', null, { cp: -500 }));
  check('bestmove', await gradeBestMove('The best move is Ke1.', tacticFen, tacticOracle));
  check('tactics', gradeTactics('Nothing is hanging, quiet position.', tacticFen, tacticOracle));
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
    p.oracle = await sfEval(p.fen, 18);
    console.log(`  oracle[${p.id}] best=${p.oracle.bestUci} cp=${p.oracle.cp} mate=${p.oracle.mate}  (${p.note})`);
  }
  const ncFails = await negativeControls();
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

  const expl = page.locator('[data-testid="coach-explanation"]').first();
  for (const p of POSITIONS) {
    if (p.skip) continue;
    console.log(`\n── ${p.id} (${p.fen}) ──`);

    for (const { lane, q } of LANES) {
      // FRESH LOAD PER QUESTION — the analyse follow-up stream reliably renders
      // only the FIRST follow-up after a load; re-loading the FEN makes every
      // lane question a first-follow-up (fixes the systematic "no reply" on the
      // 2nd/3rd question of the earlier runs).
      const fenBox = page.locator('[data-testid="fen-input"]').first();
      await fenBox.click({ force: true }).catch(() => {});
      await fenBox.fill(p.fen).catch(() => {});
      await page.locator('[data-testid="load-fen-btn"]').first().click({ force: true }).catch(() => {});
      await expl.waitFor({ timeout: 45000 }).catch(() => {});
      // STABILIZE — the initial analyse streams into coach-explanation; snapshot
      // the baseline only once it stops growing, so the follow-up's growth is
      // cleanly attributable (the middlegame "no reply" race of the prior run).
      let prevLen = -1, stableFor = 0;
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1500);
        const len = ((await expl.innerText().catch(() => '')) || '').length;
        if (len === prevLen && len > 0) { stableFor += 1; if (stableFor >= 2) break; } else stableFor = 0;
        prevLen = len;
      }
      const before = (await expl.innerText().catch(() => '')) || '';
      // Wait for the input to be ENABLED — it's `disabled` while the prior
      // stream is loading, and typing into a disabled box is a silent no-op
      // (the "no reply" false BROKENs of the first accuracy run).
      const enabled = page.locator('[data-testid="chat-text-input"]:visible:not([disabled])').first();
      await enabled.waitFor({ timeout: 60000 }).catch(() => {});
      const box = page.locator('[data-testid="chat-text-input"]:visible').first();
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await box.click({ force: true }).catch(() => {});
        await box.fill('').catch(() => {});
        await box.pressSequentially(q, { delay: 8 }).catch(() => {});
        const typed = await box.inputValue().catch(() => '');
        if (typed.includes(q.slice(0, 12))) break;
        await page.waitForTimeout(3000);
      }
      await box.press('Enter').catch(() => {});
      // wait for coach-explanation to grow (follow-up appends with "\n\n")
      let reply = '';
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(1500);
        const now = (await expl.innerText().catch(() => '')) || '';
        if (now.length > before.length + 8) { reply = now.slice(before.length).trim(); if (reply.length > 20) { await page.waitForTimeout(2500); reply = ((await expl.innerText().catch(() => '')) || '').slice(before.length).trim(); break; } }
      }
      const grade = reply ? await GRADERS[lane](reply, p.fen, p.oracle) : { verdict: 'BROKEN', reason: 'no reply rendered' };
      const boardBad = falseBoardClaims(reply, p.fen);
      rec(p.id, lane, q, reply || '(no reply)', { best: p.oracle.bestUci, cp: p.oracle.cp, mate: p.oracle.mate }, grade, reply ? boardBad : []);
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
