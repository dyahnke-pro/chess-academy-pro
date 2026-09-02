// COACH CAPABILITY BATTERY (David 2026-09-02: "throw every single question you can
// think of back at coach ... minimum 20 questions per function").
//
// This is the LIVE verification vehicle for the full coach capability map. Each
// FAMILY is one user-facing capability; each row is a DIFFERENT phrasing that
// stresses routing (canonical + typo + British + abbreviation + oblique + a
// cross-lane confusable — the phrasings that hid every bug this session). We
// throw them at prod coach, one per fresh load, and grade the reply: it must be
// a real grounded answer of the RIGHT TYPE (want), and must NOT be a deflection
// or a wrong-lane steal (notWant). Muted per G1.
//
// Usage: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   [AUDIT_FAMILY=theory] [AUDIT_LIMIT=8] node scripts/audit-coach-battery-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import fs from 'node:fs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `battery-${Date.now().toString(36)}`;
const ONLY = (process.env.AUDIT_FAMILY || '').trim();
const LIMIT = Number(process.env.AUDIT_LIMIT || 8); // live questions per family
const ROOK_FEN = '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1';

// Shared deflection / wrong-answer markers that no real answer should contain.
const DEFLECT = /i can'?t verify that precisely|i can'?t verify which|hit a snag|something went wrong|pick what you want to do|tap an opening|walk through the opening from move 1/i;

// ── THE FULL CAPABILITY MAP. `want`/`notWant` grade the reply's TYPE. ──
const FAMILIES = [
  { family: 'Theory & concepts', key: 'theory', rows: [
    { q: 'how do I play against an isolated queen pawn?', want: /isolat|iqp|blockad|d5|pawn|piece|square/, notWant: /prepared recommendation against|no games against/ },
    { q: 'how should I handle the bishop pair?', want: /bishop|pair|two bishops|diagonal|trade|open/ },
    { q: 'what do I do about doubled pawns?', want: /doubled|pawn|file|weak|structure|target/ },
    { q: 'explain the minority attack', want: /minorit|pawn|queenside|b5|weak|structure/ },
    { q: 'what is a good bishop vs a bad bishop?', want: /bishop|pawn|blocked|colour|color|diagonal|active/ },
    { q: 'why are outposts strong?', want: /outpost|knight|square|support|pawn|cannot/ },
    { q: 'how do I use a space advantage?', want: /space|cramp|room|piece|restrict|expand/ },
    { q: 'what is the principle of two weaknesses?', want: /two weakness|second|front|stretch|defen/ },
    { q: 'how do I attack a pawn chain?', want: /chain|base|pawn|break|attack|undermine/ },
    { q: 'what is prophylaxis?', want: /prophyla|prevent|opponent|plan|stop|before/ },
    { q: 'why control the centre?', want: /cent|control|square|piece|space|mobil/ },
    { q: 'how do I make a good pawn break?', want: /break|pawn|open|lever|tension|timing/ },
    { q: 'what does it mean to overprotect a square?', want: /overprotect|defend|square|piece|support|nimzo/ },
    { q: 'how do I play with hanging pawns?', want: /hanging|pawn|c5|d5|break|dynamic|weak/ },
    { q: 'what is a weak colour complex?', want: /colour|color|complex|square|dark|light|weak/ },
  ] },
  { family: 'Endgame technique', key: 'endgame', rows: [
    { q: 'how do I hold a Philidor rook ending?', want: /rook|third rank|defen|draw|hold|king|pawn/, notWant: /not in an endgame yet|training it is/ },
    { q: 'teach me the Lucena position', want: /lucena|bridge|rook|pawn|promot|win/, notWant: /not in an endgame yet|training it is/ },
    { q: 'how do I win king and pawn versus king?', want: /opposition|key square|king|pawn|promot|zugzwang/, notWant: /not in an endgame yet|training it is/ },
    { q: 'explain the opposition', want: /opposition|king|square|direct|distant|face/, notWant: /not in an endgame yet/ },
    { q: 'what is the rule of the square?', want: /square|pawn|catch|promot|king|race/ },
    { q: 'how do rooks behind passed pawns work?', want: /rook|behind|passed|pawn|tarrasch|push/ },
    { q: 'how do I convert an extra pawn?', want: /pawn|convert|trade|king|passed|activ/ },
    { q: 'what is a wrong rook pawn draw?', want: /rook pawn|wrong|bishop|corner|draw|h-pawn|a-pawn/ },
    { q: 'how do I draw with opposite coloured bishops?', want: /opposite|bishop|colour|color|draw|fortress|blockad/ },
    { q: 'what is triangulation?', want: /triangul|tempo|zugzwang|waiting|king/ },
  ] },
  { family: 'Best move / candidates', key: 'bestmove', rows: [
    { q: 'what is the best move here?', fen: ROOK_FEN, want: /rook|rc8|move|king|pawn|best/ },
    { q: 'what are my candidate moves?', fen: ROOK_FEN, want: /rook|king|candidate|move|option/ },
    { q: 'is Rc2 a good move?', fen: ROOK_FEN, want: /rc2|rook|passive|active|better|worse|instead/ },
    { q: 'why is that the best move?', fen: ROOK_FEN, want: /because|rook|king|pawn|activ|threat|control/ },
    { q: "what's the strongest continuation?", fen: ROOK_FEN, want: /rook|king|pawn|continu|strong|move/ },
    { q: 'rate my move Rc2', fen: ROOK_FEN, want: /rc2|inaccura|mistake|blunder|fine|best|loses|passive/ },
  ] },
  { family: 'Position assessment', key: 'assess', rows: [
    { q: 'who is better in this position?', fen: ROOK_FEN, want: /white|black|equal|better|winning|edge|balanc|point/ },
    { q: "what's the evaluation?", fen: ROOK_FEN, want: /white|black|equal|advantage|pawn|winning|even|edge|point/ },
    { q: 'is this position winning?', fen: ROOK_FEN, want: /win|draw|hold|white|black|equal|advantage|edge|point/ },
    { q: 'how bad is my position?', fen: ROOK_FEN, want: /white|black|equal|worse|better|hold|defend|advantage|edge|point/ },
    { q: 'assess this position for me', fen: ROOK_FEN, want: /white|black|king|rook|pawn|advantage|activ/ },
  ] },
  { family: 'Plans', key: 'plan', rows: [
    { q: 'what is my plan here?', fen: ROOK_FEN, want: /rook|king|pawn|activ|push|plan|target/ },
    { q: 'what should I be aiming for?', fen: ROOK_FEN, want: /rook|king|pawn|activ|promot|target|plan/ },
    { q: 'what is the plan against a weak square?', want: /weak|square|outpost|occupy|knight|control|piece|hole/, notWant: /prepared recommendation against|no games against/ },
    { q: 'how do I make progress here?', fen: ROOK_FEN, want: /rook|king|pawn|push|activ|progress|improv|plan|e4|d4|develop/ },
  ] },
  { family: 'Opponent-move why', key: 'oppwhy', rows: [
    { q: 'why did my opponent play that?', fen: ROOK_FEN, want: /rook|king|pawn|threat|defend|activ|because|prevent/ },
    { q: 'what is the idea behind their last move?', fen: ROOK_FEN, want: /rook|king|pawn|threat|idea|defend|activ|plan/ },
    { q: 'what is my opponent threatening?', fen: ROOK_FEN, want: /rook|king|pawn|threat|check|nothing|no immediate/ },
  ] },
  { family: 'Name the opening', key: 'nameopening', rows: [
    { q: 'what opening is 1.e4 e5 2.Nf3 Nc6 3.Bb5?', want: /ruy|lopez|spanish/ },
    { q: 'name this opening: 1.d4 d5 2.c4', want: /queen|gambit/ },
    { q: 'what do you call 1.e4 c5?', want: /sicilian/ },
    { q: 'which opening is 1.e4 e6?', want: /french/ },
  ] },
  { family: 'Tactics', key: 'tactics', rows: [
    { q: 'is there a tactic in this position?', fen: ROOK_FEN, want: /tactic|rook|fork|pin|skewer|check|nothing|no immediate|threat/ },
    { q: 'what is a fork?', want: /fork|two|attack|knight|piece|same time/ },
    { q: 'explain a pin', want: /pin|piece|behind|king|move|absolute|relative/ },
    { q: 'how do skewers work?', want: /skewer|line|piece|behind|move|value/ },
    { q: 'what is a discovered attack?', want: /discover|move|behind|piece|reveal|attack/ },
    { q: 'what is a deflection?', want: /deflect|defend|away|remove|overload|piece/ },
  ] },
  { family: 'Opening traps', key: 'traps', rows: [
    { q: 'what are the traps in the Italian?', want: /italian|trap|legal|fried liver|f7|knight|careful/ },
    { q: 'show me a trap in the Sicilian', want: /sicilian|trap|careful|knight|queen|pawn|line/ },
    { q: 'is there a trap in the Scandinavian?', want: /scandinav|trap|queen|knight|careful|line/ },
  ] },
  { family: 'Counter-repertoire', key: 'counterrep', rows: [
    { q: 'what should I play against the London?', want: /london|d4|bf4|c5|nf6|against|counter|setup/ },
    { q: 'how do I meet the Kings Gambit?', want: /king.?s gambit|f4|accept|declin|d5|against/ },
    { q: 'what do I do against the Caro-Kann?', want: /caro|advance|exchange|c6|d5|against/ },
  ] },
  { family: 'Weakness profile', key: 'weakness', rows: [
    { q: 'what are my biggest weaknesses?', want: /weak|mistake|tactic|endgame|blunder|drill|work on|pattern|upload|import/ },
    { q: 'give me a weakness briefing', want: /weak|mistake|tactic|endgame|drill|work on|pattern|upload|import/ },
    { q: 'what am I worst at?', want: /weak|mistake|tactic|endgame|blunder|drill|pattern|upload|import/ },
    { q: 'where am I leaking rating?', want: /weak|mistake|tactic|endgame|blunder|drill|pattern|upload|import/ },
    { q: 'what endgame am I weakest at?', want: /endgame|rook|pawn|convert|weak|drill|upload|import/ },
    { q: 'what are my strengths?', want: /strength|good|strong|tactic|endgame|opening|solid|upload|import/ },
    { q: 'am I improving on my weaknesses?', want: /improv|weak|better|trend|drill|still|progress|upload|import/ },
  ] },
  { family: 'Mistakes & review', key: 'mistakes', rows: [
    { q: 'what mistakes do I make most?', want: /mistake|blunder|tactic|endgame|hang|drop|pattern|upload|import/ },
    { q: 'what did I do wrong in my last game?', want: /last game|mistake|move|blunder|lost|upload|import|no games/ },
    { q: 'where do most of my errors happen?', want: /middlegame|endgame|opening|phase|time|mistake|upload|import/ },
    { q: 'do I blunder in time trouble?', want: /time|clock|trouble|blunder|fast|upload|import|no games/ },
    { q: 'which phase do I play worst?', want: /opening|middlegame|endgame|phase|worst|upload|import/ },
  ] },
  { family: 'Progress & stats', key: 'progress', rows: [
    { q: 'am I getting better?', want: /improv|trend|better|rating|progress|upload|import|no games/ },
    { q: 'what is my rating trend?', want: /rating|trend|up|down|improv|progress|upload|import/ },
    { q: 'how consistent am I?', want: /consist|swing|variance|steady|rating|upload|import|no games/ },
    { q: 'what is my puzzle accuracy?', want: /puzzle|accuracy|solved|percent|rating|upload|import|no puzzle/ },
    { q: 'what is my record with white?', want: /white|record|win|loss|draw|score|upload|import|no games/ },
  ] },
  { family: 'Drill / training request', key: 'drill', rows: [
    { q: 'train my missed threats', want: /drill|train|pattern|weak|threat|tap to start|puzzle/, notWant: /no immediate threat|nothing of theirs is hanging/ },
    { q: 'drill my structure weaknesses', want: /drill|train|pattern|weak|structure|tap to start|puzzle/, notWant: /no immediate threat|nothing of theirs is hanging/ },
    { q: 'give me a tactics workout', want: /drill|train|tactic|puzzle|pattern|tap to start/ },
    { q: 'let me practice endgames', want: /endgame|drill|train|practice|puzzle|pattern|tap to start/ },
    { q: 'set up a drill on my worst opening', want: /drill|train|opening|weak|practice|tap to start|upload|import/ },
  ] },
  { family: 'App help / capabilities', key: 'apphelp', rows: [
    { q: 'what can you help me with?', want: /teach|play|review|drill|opening|endgame|tactic|weak|help/ },
    { q: 'how do I use this app?', want: /teach|play|review|drill|opening|endgame|tactic|upload|help/ },
    { q: 'how do you teach?', want: /teach|watch|learn|practice|play|move|idea|method|show/ },
    { q: 'what features do you have?', want: /teach|play|review|drill|opening|endgame|tactic|weak/ },
  ] },
  { family: 'Upload reminder (no games)', key: 'upload', freshDb: true, rows: [
    { q: 'what are my weaknesses?', want: /upload|import|connect|chess\.com|lichess|analy|games|no games/ },
    { q: 'what mistakes do I make?', want: /upload|import|connect|chess\.com|lichess|analy|games|no games/ },
    { q: 'am I improving?', want: /upload|import|connect|chess\.com|lichess|analy|games|no games/ },
  ] },
  { family: 'Self-heal / banter', key: 'banter', rows: [
    { q: 'thanks so much coach', want: /.+/, notWant: /the best move is|the eval is|rook to|on move \d/ },
    { q: 'you are awesome', want: /.+/, notWant: /the best move is|the eval is|rook to|on move \d/ },
    { q: 'good night', want: /.+/, notWant: /the best move is|the eval is|rook to|on move \d/ },
  ] },
];

const results = [];
const rec = (family, q, pass, detail) => { results.push({ family, q, pass, detail }); console.log(`${pass ? '✅' : '❌'} [${family}] ${q} — "${detail.slice(0, 80)}"`); };

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
// Seed 7 analyzed games + mistakes so weakness/mistake/progress lanes have real
// material (mirrors the fix-verify seed). freshDb rows want the EMPTY state, so
// the upload family runs before any seed.
function seedRows() {
  const mk = (o) => ({ id: `bt-${Math.random().toString(36).slice(2)}`, fen: ROOK_FEN, playerMove: 'c1c2', playerMoveSan: 'Rc2', bestMove: 'c1c8', bestMoveSan: 'Rc8', moves: '', cpLoss: 260, classification: 'blunder', gamePhase: 'endgame', moveNumber: 40, sourceGameId: 'g1', sourceMode: 'analysis', playerColor: 'white', promptText: '', narration: { intro: '', explanation: '', encouragement: '' }, createdAt: '2026-02-01T00:00:00.000Z', opponentName: 'Rival', gameDate: '2026-02-01', openingName: null, evalBefore: 0, srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: '2026-02-01', srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0, tacticType: null, positionalMotif: null, ...o });
  const rows = []; for (let i = 0; i < 7; i++) rows.push(mk({ sourceGameId: `rg${i % 5}`, cpLoss: 240 + i * 20, gamePhase: i % 2 ? 'middlegame' : 'endgame' })); return rows;
}
function gamesFor(rows) { return [...new Set(rows.map((r) => r.sourceGameId))].map((id, i) => ({ id, source: 'import', isMasterGame: false, result: '1-0', white: 'AuditPlayer', black: 'Stockfish Bot', whiteElo: 1500, blackElo: 1500, pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', date: '2026-02-01', playedAt: `2026-02-0${(i % 8) + 1}T00:00:00.000Z`, annotations: [{ moveNumber: 1, color: 'white', evaluation: 20, bestMove: 'e4', bestMoveSan: 'e4', bestMoveEval: 20, classification: 'book' }], fullyAnalyzed: true, analysisDepth: 20, openingId: null, coachAnalysis: null })); }
async function seed() {
  const rows = seedRows(); const games = gamesFor(rows);
  return page.evaluate(({ rows, games }) => new Promise((res) => { const r = indexedDB.open('ChessAcademyDB'); r.onerror = () => res('err'); r.onsuccess = () => { const db = r.result; const tx = db.transaction(['mistakePuzzles', 'games'], 'readwrite'); for (const x of rows) tx.objectStore('mistakePuzzles').put(x); for (const g of games) tx.objectStore('games').put(g); tx.oncomplete = () => { db.close(); res('ok'); }; tx.onerror = () => { db.close(); res('txerr'); }; }; }), { rows, games });
}
async function wipe() {
  return page.evaluate(() => new Promise((res) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => { const db = r.result; const names = ['mistakePuzzles', 'games']; const tx = db.transaction(names, 'readwrite'); for (const n of names) tx.objectStore(n).clear(); tx.oncomplete = () => { db.close(); res('ok'); }; tx.onerror = () => { db.close(); res('err'); }; }; r.onerror = () => res('err'); }));
}

const GREETING = /pick what you want to do|walk through the opening from move 1|good to see you|want me to teach you an opening|tap an opening|let'?s walk through the .*(gambit|opening|defen|attack|game)|ready when you are/;
async function loadFresh(fen) {
  const url = fen ? `${BASE}/coach/teach?fen=${encodeURIComponent(fen)}` : `${BASE}/coach/teach`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates(); await page.waitForTimeout(1200);
}
async function askOnce(q) {
  const box = page.locator('[data-testid="chat-text-input"]'); await box.waitFor({ timeout: 20000 });
  const tr = page.locator('[data-testid="teach-transcript"]');
  const lines = async () => (await tr.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await lines());
  const fresh = (ls) => { const now = tally(ls); const o = []; for (const [l, n] of now) { const e = n - (seen.get(l) ?? 0); for (let k = 0; k < e; k++) o.push(l); } return o.filter((l) => !l.includes(q)); };
  await box.click(); await box.pressSequentially(q, { delay: 6 }); await box.press('Enter');
  const SUB = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 26; i++) { await page.waitForTimeout(1400); if (fresh(await lines()).some(SUB)) { await page.waitForTimeout(1500); return fresh(await lines()).filter(SUB).join(' '); } }
  return '';
}
async function ask(q, fen) {
  let last = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await loadFresh(fen);
      last = (await askOnce(q)).toLowerCase();
      if (last && !GREETING.test(last)) return last;
    } catch (e) { last = ''; /* load/input flake — reload and retry */ }
  }
  return last;
}

try {
  await loadFresh();
  let seeded = false;
  for (const fam of FAMILIES) {
    if (ONLY && fam.key !== ONLY) continue;
    if (fam.freshDb) { await wipe(); seeded = false; }
    else if (!seeded) { await seed(); seeded = true; }
    const rows = fam.rows.slice(0, LIMIT);
    for (const row of rows) {
      let a = '';
      try { a = await ask(row.q, row.fen); } catch (e) { a = `THREW: ${String(e).slice(0, 60)}`; }
      const notOk = row.notWant ? row.notWant.test(a) : false;
      const wantOk = row.want ? row.want.test(a) : a.length >= 15;
      const deflected = DEFLECT.test(a) && !fam.freshDb; // upload family legitimately mentions picker-free CTA
      const pass = a.length >= 8 && wantOk && !notOk && !deflected;
      rec(fam.family, row.q, pass, a || '(empty)');
    }
    if (fam.freshDb) { await seed(); seeded = true; } // restore for later families
  }
} catch (err) {
  rec('HARNESS', 'ran without throwing', false, String(err).slice(0, 200));
} finally {
  const pass = results.filter((r) => r.pass).length;
  const byFam = {};
  for (const r of results) { (byFam[r.family] ??= { p: 0, n: 0 }); byFam[r.family].n++; if (r.pass) byFam[r.family].p++; }
  console.log(`\n══ BATTERY: ${pass}/${results.length} green ══`);
  for (const [f, s] of Object.entries(byFam)) console.log(`  ${s.p === s.n ? '✅' : '⚠️ '} ${f}: ${s.p}/${s.n}`);
  const fails = results.filter((r) => !r.pass);
  if (fails.length) { console.log('\nFAILURES:'); for (const f of fails) console.log(`  ❌ [${f.family}] "${f.q}" → "${f.detail.slice(0, 100)}"`); }
  try { fs.writeFileSync('/tmp/battery-report.json', JSON.stringify({ runId: RUN_ID, pass, total: results.length, byFam, results }, null, 2)); } catch { /* ignore */ }
  await browser.close();
  process.exit(fails.length ? 1 : 0);
}
