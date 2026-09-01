// Coach surface PARITY audit (David 2026-09-01) — "all coach surfaces have
// access to the same information; coach answers the same questions regardless."
// Drives the LIVE app across surfaces, seeds real analyzed-game data, and hits
// the coach HARD from many angles: the same question types phrased many ways,
// mixing pieces and squares. SILENT — muteTtsForAudit, so it never burns TTS.
// CAVEAT: the BARE teach page (no lesson) streams answers into bubbles that
// race this capture for last-game asks; teach WITH a lesson active (normal
// usage) answers all of them (see audit-coach-weakness-selfassessment-prod).
// Board-independent questions (weakness / last-game error / notation) must be
// answered on EVERY chat surface; board-dependent ones (sac soundness / move
// quality) on surfaces that carry a board. Reference: §G1 + REAL-GAME AUDIT.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `parity-${Date.now().toString(36)}`;
// Deflection OR a wrong-surface hijack (teach page treating a question as an
// opening to walk through) both count as a parity FAILURE.
const DEFLECT = /can't verify|not enough|import your games|analyze a few|haven't analyzed|i'?m not sure what you mean|didn'?t (?:catch|understand)|couldn'?t find|no game loaded|let'?s walk through|^teaching —|name the opening/i;

const now = new Date().toISOString();
const ann = (moveNumber, color, classification, evaluation) => ({ moveNumber, color, san: 'Nf3', evaluation, bestMove: 'e4', bestMoveEval: evaluation, classification, comment: null });
const GAMES = [
  { id: 'par-1', pgn: '1.e4 e5 2.Nf3 Nc6 0-1', white: 'You', black: 'Stockfish Bot', result: '0-1', date: '2026-08-30', event: 'Coach', eco: 'C50', whiteElo: 900, blackElo: 1000, source: 'coach', isMasterGame: false, openingId: null, coachAnalysis: null, annotations: [ann(8,'white','good',120), ann(14,'white','blunder',260), ann(22,'white','blunder',-260)] },
  { id: 'par-2', pgn: '1.d4 d5 2.c4 e6 0-1', white: 'You', black: 'Stockfish Bot', result: '0-1', date: '2026-08-29', event: 'Coach', eco: 'D30', whiteElo: 900, blackElo: 980, source: 'coach', isMasterGame: false, openingId: null, coachAnalysis: null, annotations: [ann(12,'white','mistake',-60), ann(20,'white','blunder',-280)] },
  { id: 'par-3', pgn: '1.e4 c5 2.Nf3 d6 1-0', white: 'You', black: 'Stockfish Bot', result: '1-0', date: '2026-08-28', event: 'Coach', eco: 'B50', whiteElo: 900, blackElo: 920, source: 'coach', isMasterGame: false, openingId: null, coachAnalysis: null, annotations: [ann(10,'white','inaccuracy',40)] },
].map((g) => ({ ...g, createdAt: now }));
const PUZZLES = [{ id: 'par-mp-1', sourceGameId: 'par-1', classification: 'blunder', cpLoss: 300, playerMoveSan: 'Nd5', bestMoveSan: 'Bxf7+', moveNumber: 22, gamePhase: 'middlegame', playerColor: 'white', fen: '8/8/8/8/8/8/8/8 w - - 0 1', createdAt: now, srsDueDate: now.split('T')[0], status: 'unsolved' }];

// Question battery. `board:false` = must be answered on every chat surface.
// Multiple phrasings per intent, mixing SAN, plain-English piece+square words.
const BATTERY = [
  { group: 'weakness', board: false, want: /weak|mistake|blunder|middlegame|opening|endgame|winning|slip|convert|centipawn|drill|game/i, qs: [
    'what am I weak at', 'assess me', "what's my biggest weakness" ] },
  { group: 'last-game', board: false, want: /error|mistake|blunder|move \d+|clean|analyz|Nd5|last game|before last/i, qs: [
    'what did I do wrong in my last game', 'what was my critical error in my last game', 'what did I do wrong in my last 3 games' ] },
  { group: 'notation', board: false, want: /bishop|knight|takes|captures|to f3|means|move/i, qs: [
    'what does Bxe7 mean' ] },
  // Board-dependent, teach/play only — proves the question REACHES the grounded
  // move lane (not the opening-teach hijack). The answer is position-specific
  // (a legal-move verdict or an eval), so we accept either.
  { group: 'sac-sound', board: true, want: /sound|drop|pawn|better|best|eval|worse|loses|wins|even|holds|works|blunder|legal move|isn'?t (?:a )?legal|not (?:a )?legal/i, qs: [
    'is Bxh7 sound' ] },
];

async function seed(page) {
  return page.evaluate(({ games, puzzles }) => new Promise((resolve, reject) => {
    const open = indexedDB.open('ChessAcademyDB');
    open.onerror = () => reject(new Error('idb open failed'));
    open.onsuccess = () => {
      const dbh = open.result;
      const want = ['games', 'mistakePuzzles'].filter((s) => dbh.objectStoreNames.contains(s));
      if (!want.includes('games')) { dbh.close(); return resolve({ ok: false }); }
      const tx = dbh.transaction(want, 'readwrite');
      for (const g of games) tx.objectStore('games').put(g);
      if (want.includes('mistakePuzzles')) for (const p of puzzles) tx.objectStore('mistakePuzzles').put(p);
      tx.oncomplete = () => { dbh.close(); resolve({ ok: true }); };
      tx.onerror = () => { dbh.close(); reject(new Error('idb tx failed')); };
    };
  }), { games: GAMES, puzzles: PUZZLES });
}

async function dismissGates(page) {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-beginner"]'],
  ]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 6000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 12000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 3000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 4000 }); } catch { /* none */ }
}

async function ask(page, question) {
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  // WAIT for the input to re-enable (disabled while the previous turn is busy)
  // so the send isn't silently dropped — the "(no reply)" cause.
  for (let w = 0; w < 25 && await box.isDisabled().catch(() => false); w++) await page.waitForTimeout(1500);
  // Reliable capture: count coach message bubbles (shared ChatMessage testid,
  // uniform across every surface) before, then read the NEW one's text.
  const bubbles = page.locator('[data-testid="chat-message-assistant"]');
  const beforeN = await bubbles.count().catch(() => 0);
  await box.click();
  await box.fill('');
  await box.pressSequentially(question, { delay: 8 });
  await box.press('Enter');
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(1500);
    const n = await bubbles.count().catch(() => 0);
    if (n > beforeN) {
      const txt = (await bubbles.nth(n - 1).innerText().catch(() => '')).trim();
      if (txt.length >= 20) { await page.waitForTimeout(1200); return (await bubbles.nth(n - 1).innerText().catch(() => txt)).trim(); }
    }
  }
  return '';
}

const ALL_SURFACES = [
  // No lesson loaded on teach — the auto-playing Watch narration adds coach
  // bubbles that race the capture; board-independent questions don't need one.
  { name: 'teach', url: '/coach/teach', warm: async (page) => { await page.waitForTimeout(1500); } },
  { name: 'chat', url: '/coach/chat', warm: async (page) => { await page.waitForTimeout(1500); } },
  { name: 'play', url: '/coach/play', warm: async (page) => { await page.waitForTimeout(2500); } },
];
// AUDIT_SURFACE=teach|chat|play runs one surface (keeps each run inside the
// prod timeout); unset runs all three.
const only = process.env.AUDIT_SURFACE;
const SURFACES = only ? ALL_SURFACES.filter((s) => s.name === only) : ALL_SURFACES;

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

const rows = [];
try {
  // Seed once (IndexedDB persists across in-context navigations).
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(page);
  const s = await seed(page);
  console.log(`[seed] ${s.ok ? 'games + puzzle written' : 'FAILED'}`);

  for (const surface of SURFACES) {
    console.log(`\n════════ SURFACE: ${surface.name} (${surface.url}) ════════`);
    try {
      await page.goto(`${BASE}${surface.url}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await dismissGates(page);
      await page.waitForTimeout(2500);
      // Confirm the chat input exists on this surface.
      try { await page.locator('[data-testid="chat-text-input"]').waitFor({ timeout: 12000 }); }
      catch { console.log(`  ⚠ no chat input on ${surface.name} — skipping`); continue; }
      await surface.warm(page);

      for (const grp of BATTERY) {
        // Board-dependent groups only on surfaces that carry a live board.
        const boarded = surface.name === 'teach' || surface.name === 'play';
        if (grp.board && !boarded) continue;
        for (const q of grp.qs) {
          const reply = await ask(page, q);
          const deflected = DEFLECT.test(reply);
          const onTopic = grp.want.test(reply) && reply.length >= 20;
          const pass = !deflected && onTopic;
          rows.push({ surface: surface.name, group: grp.group, q, reply, pass, deflected });
          const tag = pass ? '✔' : deflected ? '❌ DEFLECT' : '⚠ off-topic';
          console.log(`  [${grp.group}] "${q}"\n     → ${(reply || '(no reply)').slice(0, 150)}\n     ${tag}`);
        }
      }
    } catch (e) { console.log(`  surface error: ${e.message}`); }
  }
} catch (e) {
  console.error('audit error:', e.message);
} finally {
  const pass = rows.filter((r) => r.pass).length;
  const byGroup = {};
  for (const r of rows) { (byGroup[r.group] ??= { p: 0, n: 0 }); byGroup[r.group].n++; if (r.pass) byGroup[r.group].p++; }
  console.log('\n════════ PARITY SUMMARY ════════');
  for (const [g, v] of Object.entries(byGroup)) console.log(`  ${g}: ${v.p}/${v.n}`);
  const fails = rows.filter((r) => !r.pass);
  if (fails.length) { console.log('\n  FAILURES:'); for (const f of fails) console.log(`   [${f.surface}/${f.group}] "${f.q}" ${f.deflected ? 'DEFLECTED' : 'off-topic'} → ${f.reply.slice(0,120)}`); }
  console.log(`\n=== PARITY: ${pass}/${rows.length} answered across ${SURFACES.length} surfaces ===`);
  await browser.close();
  process.exit(rows.length > 0 && pass === rows.length ? 0 : 1);
}
