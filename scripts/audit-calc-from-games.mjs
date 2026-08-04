// Classification-matrix audit for calculation-from-games: seed MANY game-derived
// mistake puzzles of different pattern types, then verify each routes to EXACTLY
// the right calculation skill(s) via the live "+N from your games" tile counts.
// Proves the whole chain on the running app: seed → calculationSkillMatch →
// gameCalculationPuzzleService → useGameCalculationPuzzles → picker count.
// Runs against localhost dev by default (browser egress to prod is blocked in
// this container; the code is identical to what's deployed on main).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const APP = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';

const base = (over) => ({
  id: over.id, fen: over.fen, playerMove: 'g1f1', playerMoveSan: 'Kf1',
  bestMove: over.moves.split(' ')[0], bestMoveSan: 'x', moves: over.moves, cpLoss: 200,
  classification: 'mistake', gamePhase: over.gamePhase || 'middlegame', moveNumber: 20,
  sourceGameId: 'audit', sourceMode: 'coach', playerColor: 'white', promptText: '?',
  narration: { intro: '', moveNarrations: [], outro: '', conceptHint: '' },
  createdAt: new Date().toISOString(), opponentName: 'AuditBot', gameDate: '2026-01-01',
  openingName: null, evalBefore: 0.2, srsInterval: 0, srsEaseFactor: 0, srsRepetitions: 0,
  srsDueDate: new Date().toISOString(), srsLastReview: null, status: 'unsolved',
  attempts: 0, successes: 0, tacticType: over.tacticType ?? null,
});

// Diverse seed set — each exercises a distinct calculation pattern.
const SEEDS = [
  base({ id: 'mp-a-mate', fen: '5r1k/6pp/7N/8/8/1Q6/6PP/6K1 w - - 0 1', moves: 'b3g8 f8g8 h6f7' }),          // mateIn2 + sacrifice (Qg8+ Rxg8 Nf7#)
  base({ id: 'mp-b-quiet', fen: '6k1/5ppp/8/8/8/8/1R3PPP/6K1 w - - 0 1', moves: 'b2b7' }),                    // quietMove (Rb7)
  base({ id: 'mp-c-promo', fen: '8/P5k1/8/8/8/8/6K1/8 w - - 0 1', moves: 'a7a8q' }),                          // promotion + advancedPawn
  base({ id: 'mp-d-long', fen: '6k1/8/8/8/8/8/R7/6K1 w - - 0 1', moves: 'a2a3 g8f8 a3a4 f8g8 a4a5' }),        // long + quietMove
  base({ id: 'mp-e-defl', fen: '6k1/5ppp/8/8/8/8/1R3PPP/6K1 w - - 0 1', moves: 'b2b7', tacticType: 'deflection' }), // quietMove + deflection
  base({ id: 'mp-f-eg', fen: '8/6k1/1P6/8/8/8/6K1/8 w - - 0 1', moves: 'b6b7', gamePhase: 'endgame' }),        // advancedPawn + endgame
  base({ id: 'mp-g-none', fen: '6k1/5ppp/8/8/4r3/8/4R1PP/6K1 w - - 0 1', moves: 'e2e4' }),                     // matches NOTHING (Rxe4)
];

// Expected "+N from your games" per skill given the seeds above.
const EXPECT = {
  'find-the-mate': 1,     // A
  'quiet-move': 4,        // B, D, E, and F (b6-b7 is itself a quiet, non-forcing push)
  'forcing-sequence': 1,  // D
  'defensive-calc': 0,    // none (intentionally not matched from game data)
  'race-calculation': 2,  // C, F
  'tactical-pattern': 2,  // A (sacrifice), E (deflection)
  'adaptive-mixed': 1,    // F (endgame)
};

const results = [];
const rec = (n, s, d) => { results.push({ s }); console.log(`  [${s}] ${n}${d ? ': ' + d : ''}`); };

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
await page.addInitScript(autoDismissCalibration);
  await page.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs

try {
  console.log(`=== calc-from-games classification matrix → ${APP} ===\n`);
  await page.goto(`${APP}/`, { waitUntil: 'domcontentloaded', timeout: 25_000 });
  await page.waitForTimeout(4000);

  const seedRes = await page.evaluate(async (seeds) => {
    const db = await new Promise((res, rej) => { const q = indexedDB.open('ChessAcademyDB'); q.onsuccess = () => res(q.result); q.onerror = () => rej('open'); });
    await new Promise((res, rej) => { const tx = db.transaction(['mistakePuzzles'], 'readwrite'); const s = tx.objectStore('mistakePuzzles'); for (const p of seeds) s.put(p); tx.oncomplete = res; tx.onerror = () => rej('put'); });
    const count = await new Promise((res) => { const tx = db.transaction(['mistakePuzzles'], 'readonly'); const c = tx.objectStore('mistakePuzzles').count(); c.onsuccess = () => res(c.result); c.onerror = () => res(-1); });
    return { count };
  }, SEEDS).catch((e) => ({ error: String(e) }));
  rec(`seeded ${SEEDS.length} diverse mistake puzzles`, seedRes.error ? 'FAIL' : 'PASS', seedRes.error || `${seedRes.count} rows in mistakePuzzles`);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.goto(`${APP}/tactics/calculation`, { waitUntil: 'networkidle', timeout: 25_000 });
  await page.waitForSelector('[data-testid="calculation-skill-quiet-move"]', { timeout: 15_000 });
  await page.waitForTimeout(3000); // let the async count load

  // Read each skill's "+N from your games" count (0 if the element is absent).
  const readCount = async (skillId) => {
    const el = page.locator(`[data-testid="calc-game-count-${skillId}"]`);
    if (await el.count() === 0) return 0;
    const t = (await el.textContent()) || '';
    const m = t.match(/\+(\d+)/);
    return m ? Number(m[1]) : 0;
  };

  console.log('\n  --- per-skill "+N from your games" (actual vs expected) ---');
  for (const [skill, want] of Object.entries(EXPECT)) {
    const got = await readCount(skill);
    rec(`${skill}: ${got} (expected ${want})`, got === want ? 'PASS' : 'FAIL');
  }
} catch (e) {
  rec('run completed without throwing', 'FAIL', String(e));
} finally {
  await browser.close().catch(() => {});
  const pass = results.filter((r) => r.s === 'PASS').length;
  const fail = results.filter((r) => r.s === 'FAIL').length;
  console.log(`\n=== ${pass} PASS · ${fail} FAIL ===`);
  process.exit(fail > 0 ? 1 : 0);
}
