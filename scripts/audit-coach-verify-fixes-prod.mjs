// FIX-VERIFICATION AUDIT (David 2026-09-02: "All fixes get verified with another
// audit asking DIFFERENT questions"). The varied audit FOUND three routing bugs;
// this proves each fix GENERALIZES by hitting the same fixed lane with different
// phrasings/targets — not the phrasing the bug was found on. Muted (G1).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `verify-${Date.now().toString(36)}`;
const ROOK_FEN = '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1';

const results = [];
const record = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); };

// Seed weakness data + analyzed games so the drill lane has real material.
function seedRows() {
  const mk = (o) => ({ id: `vf-${Math.random().toString(36).slice(2)}`, fen: ROOK_FEN, playerMove: 'c1c2', playerMoveSan: 'Rc2', bestMove: 'c1c8', bestMoveSan: 'Rc8', moves: '', cpLoss: 260, classification: 'blunder', gamePhase: 'endgame', moveNumber: 40, sourceGameId: 'g1', sourceMode: 'analysis', playerColor: 'white', promptText: '', narration: { intro: '', explanation: '', encouragement: '' }, createdAt: '2026-02-01T00:00:00.000Z', opponentName: 'Rival', gameDate: '2026-02-01', openingName: null, evalBefore: 0, srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: '2026-02-01', srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0, tacticType: null, positionalMotif: null, ...o });
  const rows = []; for (let i = 0; i < 7; i++) rows.push(mk({ sourceGameId: `rg${i % 5}`, cpLoss: 240 + i * 20 })); return rows;
}
function gamesFor(rows) { return [...new Set(rows.map((r) => r.sourceGameId))].map((id, i) => ({ id, source: 'import', isMasterGame: false, result: '1-0', white: 'AuditPlayer', black: 'Stockfish Bot', whiteElo: 1500, blackElo: 1500, pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', date: '2026-02-01', playedAt: `2026-02-0${(i % 8) + 1}T00:00:00.000Z`, annotations: [{ moveNumber: 1, color: 'white', evaluation: 20, bestMove: 'e4', bestMoveSan: 'e4', bestMoveEval: 20, classification: 'book' }], fullyAnalyzed: true, analysisDepth: 20, openingId: null, coachAnalysis: null })); }

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
async function seed(rows, games) {
  return page.evaluate(({ rows, games }) => new Promise((res) => { const r = indexedDB.open('ChessAcademyDB'); r.onerror = () => res('err'); r.onsuccess = () => { const db = r.result; const tx = db.transaction(['mistakePuzzles', 'games'], 'readwrite'); for (const x of rows) tx.objectStore('mistakePuzzles').put(x); for (const g of games) tx.objectStore('games').put(g); tx.oncomplete = () => { db.close(); res('ok'); }; tx.onerror = () => { db.close(); res('txerr'); }; }; }), { rows, games });
}
async function ask(q) {
  const box = page.locator('[data-testid="chat-text-input"]'); await box.waitFor({ timeout: 20000 });
  const tr = page.locator('[data-testid="teach-transcript"]');
  const lines = async () => (await tr.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await lines());
  const fresh = (ls) => { const now = tally(ls); const o = []; for (const [l, n] of now) { const e = n - (seen.get(l) ?? 0); for (let k = 0; k < e; k++) o.push(l); } return o.filter((l) => !l.includes(q)); };
  await box.click(); await box.pressSequentially(q, { delay: 8 }); await box.press('Enter');
  const SUB = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(1500); if (fresh(await lines()).some(SUB)) { await page.waitForTimeout(1800); return fresh(await lines()).filter(SUB).join(' '); } }
  return '';
}
async function fresh() { await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 }); await dismissGates(); await dismissGates(); }
const notDeflect = (a) => a.length >= 20 && !/i can'?t verify that precisely|hit a snag/.test(a);

try {
  await fresh();
  const rows = seedRows(); await seed(rows, gamesFor(rows));

  // ── FIX 1: theory-vs-structure — DIFFERENT structural targets (not "IQP") ──
  await fresh();
  const t1 = (await ask('how do I play against the bishop pair?')).toLowerCase();
  record('FIX1 theory (bishop pair): concept, not counter-rep miss', notDeflect(t1) && !/prepared recommendation against|no games against/.test(t1) && /(bishop|pair|two bishops|diagonal|trade|open|piece|square)/.test(t1), `"${t1.slice(0, 90)}"`);
  const t2 = (await ask('how should I deal with doubled pawns?')).toLowerCase();
  record('FIX1 theory (doubled pawns): concept, not counter-rep miss', notDeflect(t2) && !/prepared recommendation against|no games against/.test(t2) && /(doubled|pawn|structure|file|weak|target|open)/.test(t2), `"${t2.slice(0, 90)}"`);
  await fresh();
  const t3 = (await ask('what is the plan against a weak square?')).toLowerCase();
  record('FIX1 theory (weak square): concept, not counter-rep miss', notDeflect(t3) && !/prepared recommendation against|no games against/.test(t3) && /(weak|square|outpost|occupy|knight|control|piece|hole)/.test(t3), `"${t3.slice(0, 90)}"`);

  // ── FIX 2: endgame technique — DIFFERENT phrasings (not "rook and pawn") ──
  await fresh();
  const e1 = (await ask('how do I hold a Philidor rook ending?')).toLowerCase();
  record('FIX2 endgame (Philidor): technique, not "not an endgame yet"/training', notDeflect(e1) && !/not in an endgame yet|training it is/.test(e1) && /(rook|third rank|defen|draw|hold|king|pawn)/.test(e1), `"${e1.slice(0, 90)}"`);
  const e2 = (await ask('teach me the Lucena position')).toLowerCase();
  record('FIX2 endgame (Lucena): technique, not "not an endgame yet"/training', notDeflect(e2) && !/not in an endgame yet|training it is/.test(e2) && /(lucena|bridge|rook|pawn|promot|win|king)/.test(e2), `"${e2.slice(0, 90)}"`);
  await fresh();
  const e3 = (await ask('how do I win king and pawn versus king?')).toLowerCase();
  record('FIX2 endgame (K+P vs K): technique, not "not an endgame yet"/training', notDeflect(e3) && !/not in an endgame yet|training it is/.test(e3) && /(opposition|key square|king|pawn|promot|win|zugzwang)/.test(e3), `"${e3.slice(0, 90)}"`);

  // ── FIX 3: drill nit — DIFFERENT drill phrasings (not "drill my missed threats")
  await fresh();
  const d1 = (await ask('train my missed threats')).toLowerCase();
  record('FIX3 drill (train missed threats): a drill, not a live-threat readout', notDeflect(d1) && !/no immediate threat|nothing of theirs is hanging/.test(d1) && /(drill|train|pattern|weak|threat|position|puzzle|tap to start)/.test(d1), `"${d1.slice(0, 90)}"`);
  const d2 = (await ask('drill my structure weaknesses')).toLowerCase();
  record('FIX3 drill (structure weaknesses): a drill, not a live-threat readout', notDeflect(d2) && !/no immediate threat|nothing of theirs is hanging/.test(d2) && /(drill|train|pattern|weak|structure|position|puzzle|tap to start)/.test(d2), `"${d2.slice(0, 90)}"`);
} catch (err) {
  record('audit ran without throwing', false, String(err).slice(0, 250));
} finally {
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n── ${pass}/${results.length} fix-verification checks green ──`);
  if (pass < results.length) console.log('FAILED:', results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}
