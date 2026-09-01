// R6 self-assessment audit (David 2026-09-01) — "what am I weak at" must answer
// from the student's OWN weaknesses-tab meta-data, not deflect to "import your
// games." Seeds analyzed games (opponent = 'Stockfish Bot', so getPlayerGames
// resolves the player color with NO username needed) directly into the app's
// Dexie, then drives the live coach on /coach/teach and asserts the reply is a
// real assessment (names a phase / blunder / thrown game / average), not the
// canned import-games deflection.
// 3-instrument-ready (Playwright + audit-stream mute); reference: §G1 + the
// REAL-GAME EXPERIENCE AUDIT standard. Clone of audit-coach-beginner-questions.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `r6weak-${Date.now().toString(36)}`;
const DEFLECTION = /import your games|analyze a few|not enough|haven't analyzed|connect your (?:chess\.com|lichess)/i;
const REAL_SIGNAL = /\bgame|blunder|mistake|inaccurac|centipawn|slip|winning|middlegame|opening|endgame|average|convert/i;

// A MoveAnnotation the tab reads (evaluation = centipawns, White POV).
const ann = (moveNumber, color, classification, evaluation) => ({
  moveNumber, color, san: 'Nf3', evaluation, bestMove: 'e4', bestMoveEval: evaluation, classification, comment: null,
});

// Three analyzed games: blunders in the middlegame + a thrown-won game (White
// was +260 then lost). Player is White; opponent is the AI so no username is
// needed for getPlayerColorWithUsername to resolve the side.
const now = new Date().toISOString();
const GAMES = [
  {
    id: 'r6-seed-1', pgn: '1.e4 e5 2.Nf3 Nc6 0-1', white: 'You', black: 'Stockfish Bot',
    result: '0-1', date: '2026-08-30', event: 'Coach Game', eco: 'C50', whiteElo: 900, blackElo: 1000,
    source: 'coach', isMasterGame: false, openingId: null, coachAnalysis: null,
    annotations: [ann(8, 'white', 'good', 120), ann(14, 'white', 'blunder', 260), ann(20, 'white', 'blunder', -140), ann(24, 'white', 'mistake', -320)],
  },
  {
    id: 'r6-seed-2', pgn: '1.d4 d5 2.c4 e6 0-1', white: 'You', black: 'Stockfish Bot',
    result: '0-1', date: '2026-08-29', event: 'Coach Game', eco: 'D30', whiteElo: 900, blackElo: 980,
    source: 'coach', isMasterGame: false, openingId: null, coachAnalysis: null,
    annotations: [ann(12, 'white', 'mistake', -60), ann(22, 'white', 'blunder', -280)],
  },
  {
    id: 'r6-seed-3', pgn: '1.e4 c5 2.Nf3 d6 1-0', white: 'You', black: 'Stockfish Bot',
    result: '1-0', date: '2026-08-28', event: 'Coach Game', eco: 'B50', whiteElo: 900, blackElo: 920,
    source: 'coach', isMasterGame: false, openingId: null, coachAnalysis: null,
    annotations: [ann(10, 'white', 'inaccuracy', 40), ann(18, 'white', 'good', 210)],
  },
].map((g) => ({ ...g, createdAt: now }));

// One extracted mistake puzzle on the MOST-RECENT game (r6-seed-1, dated
// 2026-08-30) so getLastGameErrors reports a real critical error (Nd5, move 22).
const PUZZLES = [{
  id: 'r6-mp-1', sourceGameId: 'r6-seed-1', classification: 'blunder', cpLoss: 320,
  playerMoveSan: 'Nd5', bestMoveSan: 'Bxf7+', moveNumber: 22, gamePhase: 'middlegame',
  playerColor: 'white', fen: '8/8/8/8/8/8/8/8 w - - 0 1', createdAt: now,
}];

async function seedStores(page, games, puzzles) {
  return page.evaluate(({ games, puzzles }) => new Promise((resolve, reject) => {
    const open = indexedDB.open('ChessAcademyDB');
    open.onerror = () => reject(new Error('open failed'));
    open.onsuccess = () => {
      const dbh = open.result;
      const want = ['games', 'mistakePuzzles'].filter((s) => dbh.objectStoreNames.contains(s));
      if (!want.includes('games')) { dbh.close(); return resolve({ ok: false, reason: 'no games store' }); }
      const tx = dbh.transaction(want, 'readwrite');
      for (const g of games) tx.objectStore('games').put(g);
      if (want.includes('mistakePuzzles')) for (const p of puzzles) tx.objectStore('mistakePuzzles').put(p);
      tx.oncomplete = () => { dbh.close(); resolve({ ok: true, games: games.length, puzzles: want.includes('mistakePuzzles') ? puzzles.length : 0 }); };
      tx.onerror = () => { dbh.close(); reject(new Error('tx failed: ' + (tx.error && tx.error.message))); };
    };
  }), { games, puzzles });
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-beginner"]'],
  ]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

async function resolvePicker() {
  const tile = page.locator('[data-testid^="line-picker-"][data-fullname]').first();
  try { await tile.waitFor({ timeout: 4000 }); await tile.click(); await page.waitForTimeout(3500); return true; } catch { return false; }
}

async function ask(question) {
  await page.waitForTimeout(3500);
  await resolvePicker();
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const linesOf = async () => (await transcript.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => {
    const nowMap = tally(ls); const out = [];
    for (const [line, n] of nowMap) { const extra = n - (seen.get(line) ?? 0); for (let k = 0; k < extra; k++) out.push(line); }
    return out.filter((l) => !l.includes(question));
  };
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  const SUBSTANTIVE = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const fresh = freshFrom(await linesOf());
    if (fresh.some(SUBSTANTIVE)) { await page.waitForTimeout(2500); return freshFrom(await linesOf()).filter(SUBSTANTIVE).join(' '); }
  }
  return '';
}

const QUESTIONS = ['What am I weak at?', 'Assess me', 'What should I work on?'];
const rows = [];
try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  const seed = await seedStores(page, GAMES, PUZZLES);
  console.log(`[seed] ${seed.ok ? `${seed.games} games + ${seed.puzzles} mistake puzzles written` : `FAILED (${seed.reason})`}`);
  if (!seed.ok) throw new Error('seed failed — cannot audit R6');
  await ask('Play the Italian with me as white');
  await resolvePicker();
  await page.waitForTimeout(3000);
  // Aggregate self-assessment: real answer, not deflection, names a signal.
  for (const q of QUESTIONS) {
    const reply = await ask(q);
    const deflected = DEFLECTION.test(reply);
    const real = REAL_SIGNAL.test(reply) && reply.length >= 20;
    const pass = !deflected && real;
    rows.push({ q, reply, deflected, real, pass });
    console.log(`\nQ: ${q}\n  A: ${reply || '(no reply)'}\n  ${pass ? '✔ real assessment' : deflected ? '❌ DEFLECTED (import-games)' : '⚠ non-deflection but no weakness signal'}`);
  }
  // Last-game ERROR: must name the seeded critical move (Nd5 / move 22), not deflect.
  for (const q of ['What did I do wrong in my last game?', 'What was my critical error?']) {
    const reply = await ask(q);
    const deflected = DEFLECTION.test(reply);
    const namesError = /\bNd5\b|move\s+22|critical\s+error|blunder/i.test(reply);
    const pass = !deflected && namesError;
    rows.push({ q, reply, deflected, real: namesError, pass });
    console.log(`\nQ: ${q}\n  A: ${reply || '(no reply)'}\n  ${pass ? '✔ names the last-game error' : deflected ? '❌ DEFLECTED' : '⚠ no critical-error detail'}`);
  }
} catch (e) {
  console.error('audit error:', e.message);
} finally {
  const passed = rows.filter((r) => r.pass).length;
  console.log(`\n=== R6 self-assessment: ${rows.length} asked | ${passed} real | ${rows.filter((r) => r.deflected).length} deflected ===`);
  await browser.close();
  process.exit(rows.length > 0 && passed === rows.length ? 0 : 1);
}
