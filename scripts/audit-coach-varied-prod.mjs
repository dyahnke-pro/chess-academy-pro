// VARIED-QUESTIONS / VARIED-POSITIONS AUDIT (David 2026-09-02: "make sure the app
// works when asked different questions against different positions" — distinct
// from the seeded contract replay). Plays a real position, then drives a spread
// of question TYPES (opening id, best move, hanging, theory, endgame, off-canonical
// spelling, weakness, drill, banter) and asserts each is GROUNDED + ON-TOPIC, not
// a deflection or the wrong lane. Muted (G1).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `varied-${Date.now().toString(36)}`;
const ROOK_FEN = '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1';

const results = [];
const record = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); };

function weaknessSeed() {
  const mk = (o) => ({ id: `v-${Math.random().toString(36).slice(2)}`, fen: ROOK_FEN, playerMove: 'c1c2', playerMoveSan: 'Rc2', bestMove: 'c1c8', bestMoveSan: 'Rc8', moves: '', cpLoss: 260, classification: 'blunder', gamePhase: 'endgame', moveNumber: 40, sourceGameId: 'g1', sourceMode: 'analysis', playerColor: 'white', promptText: '', narration: { intro: '', explanation: '', encouragement: '' }, createdAt: '2026-02-01T00:00:00.000Z', opponentName: 'Rival', gameDate: '2026-02-01', openingName: null, evalBefore: 0, srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: '2026-02-01', srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0, tacticType: null, positionalMotif: null, ...o });
  const rows = []; for (let i = 0; i < 7; i++) rows.push(mk({ sourceGameId: `rg${i % 5}`, cpLoss: 240 + i * 20 })); return rows;
}
function gamesSeed(rows) { return [...new Set(rows.map((r) => r.sourceGameId))].map((id, i) => ({ id, source: 'import', isMasterGame: false, result: '1-0', white: 'AuditPlayer', black: 'Stockfish Bot', whiteElo: 1500, blackElo: 1500, pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', date: '2026-02-01', playedAt: `2026-02-0${(i % 8) + 1}T00:00:00.000Z`, annotations: [{ moveNumber: 1, color: 'white', evaluation: 20, bestMove: 'e4', bestMoveSan: 'e4', bestMoveEval: 20, classification: 'book' }], fullyAnalyzed: true, analysisDepth: 20, openingId: null, coachAnalysis: null })); }

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [g, b] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) {
    try { const G = page.locator(g); await G.waitFor({ timeout: 8000 }); await page.locator(b).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}
async function seed(page, rows, games) {
  return page.evaluate(({ rows, games }) => new Promise((resolve) => {
    const r = indexedDB.open('ChessAcademyDB'); r.onerror = () => resolve('err');
    r.onsuccess = () => { const db = r.result; const tx = db.transaction(['mistakePuzzles', 'games'], 'readwrite'); for (const x of rows) tx.objectStore('mistakePuzzles').put(x); for (const g of games) tx.objectStore('games').put(g); tx.oncomplete = () => { db.close(); resolve('ok'); }; tx.onerror = () => { db.close(); resolve('txerr'); }; };
  }), { rows, games });
}
async function resolvePicker() { const t = page.locator('[data-testid^="line-picker-"][data-fullname]').first(); try { await t.waitFor({ timeout: 4000 }); await t.click(); await page.waitForTimeout(3000); return true; } catch { return false; } }
async function ask(question) {
  const box = page.locator('[data-testid="chat-text-input"]'); await box.waitFor({ timeout: 20000 });
  const tr = page.locator('[data-testid="teach-transcript"]');
  const lines = async () => (await tr.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await lines());
  const fresh = (ls) => { const now = tally(ls); const o = []; for (const [l, n] of now) { const e = n - (seen.get(l) ?? 0); for (let k = 0; k < e; k++) o.push(l); } return o.filter((l) => !l.includes(question)); };
  await box.click(); await box.pressSequentially(question, { delay: 8 }); await box.press('Enter');
  const SUB = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(1500); if (fresh(await lines()).some(SUB)) { await page.waitForTimeout(2000); return fresh(await lines()).filter(SUB).join(' '); } }
  return '';
}
const notDeflect = (a) => a.length >= 20 && !/i can'?t verify that precisely|hit a snag|something went wrong/.test(a);

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  const rows = weaknessSeed();
  await seed(page, rows, gamesSeed(rows));
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  // ── Build a REAL position: start a game + play a few moves ────────────────
  await ask('Play the Italian with me as white'); await resolvePicker(); await page.waitForTimeout(3500);
  let moved = false;
  for (const [f, t] of [['e2', 'e4'], ['g1', 'f3'], ['f1', 'c4']]) {
    try { await page.locator(`[data-square="${f}"]`).click({ timeout: 4000 }); await page.locator(`[data-square="${t}"]`).click({ timeout: 4000 }); await page.waitForTimeout(3000); } catch { /* narration mode */ }
  }
  try { moved = (await page.locator('[data-square="e2"] [data-piece]').count()) === 0; } catch { moved = false; }
  record('setup: a real played position on the board', moved, moved ? 'moves landed' : 'board at start');

  // ── VARIED QUESTIONS across positions / types ──────────────────────────────
  const q1 = (await ask('what opening are we playing?')).toLowerCase();
  record('POS1 opening-id: names a real opening', notDeflect(q1) && (/\b(italian|king'?s|knight|four knights|giuoco|petrov|scotch)\b/.test(q1) || /eco\s+[a-e]\d/.test(q1)), `"${q1.slice(0, 90)}"`);

  const q2 = (await ask("what's a good plan for me here?")).toLowerCase();
  record('POS1 plan/best-move: a concrete grounded idea', notDeflect(q2) && /(develop|castle|centre|center|knight|bishop|pawn|control|d4|e5|square|king)/.test(q2), `"${q2.slice(0, 90)}"`);

  const q3 = (await ask('is anything hanging right now?')).toLowerCase();
  record('POS1 hanging: a grounded threat/safety read', notDeflect(q3) && /(hang|threat|nothing|safe|undefended|attack|loose|nothing forcing)/.test(q3), `"${q3.slice(0, 90)}"`);

  // Theory (board-agnostic; tests A0 + the D re-route)
  const q4 = (await ask('how should I handle an isolated queen pawn against me?')).toLowerCase();
  record('THEORY iqp: teaches the concept (not a record miss)', notDeflect(q4) && /(isolat|isolani|blockad|d5|pawn|piece|square|structure|endgame)/.test(q4) && !/no games against|logged yet/.test(q4), `"${q4.slice(0, 90)}"`);

  // Endgame technique (named lesson)
  const q5 = (await ask('how do I win a rook and pawn endgame?')).toLowerCase();
  record('ENDGAME technique: rook+pawn winning idea', notDeflect(q5) && /rook/.test(q5) && /(pawn|king|activ|cut|bridge|promot|lucena|opposition)/.test(q5), `"${q5.slice(0, 90)}"`);

  // Off-canonical spelling
  const q6 = (await ask('teach me the Caro Cann')).toLowerCase();
  record('OFF-CANONICAL: resolves a misspelled opening', notDeflect(q6) && /caro/.test(q6), `"${q6.slice(0, 90)}"`);

  // Weakness (seeded)
  const q7 = (await ask('what am I weakest at?')).toLowerCase();
  record('WEAKNESS: names a real seeded weakness', notDeflect(q7) && /(rook|ending|endgame|threat|slip)/.test(q7) && !/need more|not enough|import a few/.test(q7), `"${q7.slice(0, 90)}"`);

  // Drill nit
  const q8 = (await ask('drill my missed threats')).toLowerCase();
  record('DRILL nit: a drill request is NOT a live-threat readout', notDeflect(q8) && !/no immediate threat|nothing of theirs is hanging/.test(q8), `"${q8.slice(0, 90)}"`);

  // Banter
  const q9 = await ask('thanks so much, this is really helping');
  const hasChess = /\b(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])\b/.test(q9) || /[+-]\d(?:\.\d)?\b/.test(q9) || /\b[a-h][1-8]\b/.test(q9);
  record('BANTER: warm reply, no chess notation', notDeflect(q9) && !hasChess, `"${q9.slice(0, 90)}"`);
} catch (err) {
  record('audit ran without throwing', false, String(err).slice(0, 250));
} finally {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n── ${pass}/${results.length} varied checks green ──`);
  if (pass < results.length) console.log('FAILED:', results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
