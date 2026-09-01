// CONTRACT AUDIT — Batch A weakness captures (David 2026-09-01): the coach must
// NAME the new board-verified weaknesses when asked. Seeds a real corpus of
// missed-opponent-threat + structure-damage slips (>= the lifecycle floor:
// 4 games / 6 slips) and asserts "what am I weakest at?" / "break down my
// weaknesses" speak them + the prophylaxis / pawn-structure teaching. Muted (G1).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `batcha-${Date.now().toString(36)}`;

// A1 — White to move, black pawn d6 threatens ...dxe5 winning the undefended Ne5.
const MISSED_THREAT_FEN = 'rnbqkb1r/ppp2ppp/3p4/4N3/8/8/PPPP1PPP/RNBQKB1R w KQkq - 0 1';
// A3 — dxc5 doubles White's c-pawns (c2 + c5) with no compensation.
const STRUCT_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 1';

const results = [];
const record = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); };

function buildSeed() {
  const mk = (over) => ({
    id: `ba-${Math.random().toString(36).slice(2)}`,
    fen: MISSED_THREAT_FEN, playerMove: 'a2a3', playerMoveSan: 'a3', bestMove: 'e5f3', bestMoveSan: 'Nf3',
    moves: '', cpLoss: 320, classification: 'blunder', gamePhase: 'middlegame', moveNumber: 18,
    sourceGameId: 'g0', sourceMode: 'analysis', playerColor: 'white', promptText: '',
    narration: { intro: '', explanation: '', encouragement: '' }, createdAt: '2026-02-01T00:00:00.000Z',
    opponentName: 'Rival', gameDate: '2026-02-01', openingName: null, evalBefore: 0,
    srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: '2026-02-01', srsLastReview: null,
    status: 'unsolved', attempts: 0, successes: 0, tacticType: null, positionalMotif: null,
    ...over,
  });
  const rows = [];
  // 7 missed-threat slips across 5 distinct games (meets floor: >=4 games, >=6 slips).
  for (let i = 0; i < 7; i++) rows.push(mk({ sourceGameId: `mt-g${i % 5}`, cpLoss: 250 + i * 20 }));
  // 4 structure-damage slips across 3 games.
  for (let i = 0; i < 4; i++) rows.push(mk({ sourceGameId: `sd-g${i % 3}`, fen: STRUCT_FEN, playerMoveSan: 'dxc5', playerMove: 'd4c5', cpLoss: 180 }));
  return rows;
}

// The mistakePuzzles are DERIVED from analyzed games, so a realistic state also
// has analyzed games in `games` (else the upload-reminder guard, correctly,
// preempts the weakness lanes). Seed one analyzed player game per sourceGameId:
// black='Stockfish Bot' → resolves to a white player game with no username;
// annotations + fullyAnalyzed + analysisDepth make analyzedGameCount > 0.
function buildGamesSeed(mistakeRows) {
  const ids = [...new Set(mistakeRows.map((r) => r.sourceGameId))];
  return ids.map((id, i) => ({
    id, source: 'import', isMasterGame: false, result: '1-0',
    white: 'AuditPlayer', black: 'Stockfish Bot', whiteElo: 1500, blackElo: 1500,
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', date: '2026-02-01', playedAt: `2026-02-0${(i % 8) + 1}T00:00:00.000Z`,
    annotations: [{ ply: 1, san: 'e4', evalAfter: 20, bestMove: 'e4', bestMoveSan: 'e4', bestMoveEval: 20, classification: 'book' }],
    fullyAnalyzed: true, analysisDepth: 20, openingId: null, coachAnalysis: null,
  }));
}

async function seed(page, mistakeRows, gameRows) {
  return page.evaluate(({ mistakeRows, gameRows }) => new Promise((resolve) => {
    let req; try { req = indexedDB.open('ChessAcademyDB'); } catch { return resolve({ ok: false, reason: 'open-threw' }); }
    req.onerror = () => resolve({ ok: false, reason: 'open-error' });
    req.onsuccess = () => {
      const db = req.result;
      const need = ['mistakePuzzles', 'games'].filter((s) => !db.objectStoreNames.contains(s));
      if (need.length) { db.close(); return resolve({ ok: false, reason: `no-store:${need.join(',')}` }); }
      const tx = db.transaction(['mistakePuzzles', 'games'], 'readwrite');
      for (const r of mistakeRows) tx.objectStore('mistakePuzzles').put(r);
      for (const g of gameRows) tx.objectStore('games').put(g);
      tx.oncomplete = () => { db.close(); resolve({ ok: true, wrote: mistakeRows.length, games: gameRows.length }); };
      tx.onerror = () => { db.close(); resolve({ ok: false, reason: 'tx-error' }); };
    };
  }), { mistakeRows, gameRows });
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 8000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}

async function ask(question) {
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const linesOf = async () => (await transcript.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => { const now = tally(ls); const out = []; for (const [line, n] of now) { const extra = n - (seen.get(line) ?? 0); for (let k = 0; k < extra; k++) out.push(line); } return out.filter((l) => !l.includes(question)); };
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  const SUB = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(1500); if (freshFrom(await linesOf()).some(SUB)) { await page.waitForTimeout(2000); return freshFrom(await linesOf()).filter(SUB).join(' '); } }
  return '';
}

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  const mistakeRows = buildSeed();
  const s = await seed(page, mistakeRows, buildGamesSeed(mistakeRows));
  record('seed: wrote Batch A weakness corpus', s.ok, s.ok ? `${s.wrote} slips / ${s.games} analyzed games` : `failed (${s.reason})`);
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  // ── "what am I weakest at?" → the top row is the missed-threat cluster ──────
  {
    const a = (await ask('what am I weakest at?')).toLowerCase();
    const names = /missed opponent threat|threat|prophyla/.test(a);
    record('CONTRACT weakest: names the missed-opponent-threat weakness', a.length >= 20 && names && !/need more|not enough|import/.test(a), a ? `"${a.slice(0, 150)}"` : 'no reply');
  }

  // ── "break down my weaknesses" → teaches prophylaxis / structure (concept) ──
  {
    const a = (await ask('break down my weaknesses')).toLowerCase();
    const namesReal = /threat|prophyla|pawn|structure|opponent/.test(a) && !/need more|not enough|import a few/.test(a);
    record('CONTRACT briefing: names a real Batch A weakness + its idea', a.length >= 20 && namesReal, a ? `"${a.slice(0, 180)}"` : 'no reply');
  }

  // ── "drill it" scopes to the missed-threat motif (chip wiring) ─────────────
  {
    const a = (await ask('drill my missed threats')).toLowerCase();
    const drilled = a.length >= 20 && !/need more|not enough|import|can'?t/.test(a);
    record('CONTRACT drill: a scoped drill request is honored (not deflected)', drilled, a ? `"${a.slice(0, 120)}"` : 'no reply');
  }
} catch (err) {
  record('audit ran without throwing', false, String(err).slice(0, 250));
} finally {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n── ${pass}/${results.length} contracts green ──`);
  if (pass < results.length) console.log('FAILED:', results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
