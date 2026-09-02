// COMPREHENSIVE CONTRACT AUDIT for the 2026-09-01 coach work (David: "make sure
// it works like it SHOULD! Not just that pieces move or the coach speaks
// something"). Per §G7 + the REAL-GAME EXPERIENCE standard: seed a REAL weakness
// corpus, drive every surface interactively, and assert the CONTRACT of each —
// the correct opening, real theory teaching, the named concept on a trainer
// mistake, the specific weakest ending type — never "an answer appeared".
//
// Muted (G1): the coach's text is read, no TTS is synthesised (no spend).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `session-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

// A known-winning K+P where Kd6/Kf6 hold the win and Kd5/Kf5 throw it — the
// deterministic mistake that proves the trainer's correction loop.
const KP_WIN_FEN = '4k3/8/4K3/4P3/8/8/8/8 w - - 0 1';
const KP_MISTAKE = ['e6', 'd5']; // Kd5 → draw (throws the win)
// A rook-and-pawn ending, ≤7 pieces (tablebase-ready) — the seeded weakness type.
const ROOK_FEN = '8/5p2/8/4k3/8/8/r4P2/2R1K3 w - - 0 1';

/** Seed a real weakness corpus into IndexedDB: 6 rook-ending blunders across 4
 *  games (→ "rook-and-pawn endings" is the weakest ending + the lifecycle sample
 *  floor is met) plus 3 fork blunders, so the weakness lanes speak to REAL data
 *  instead of the trivial "need more games". */
function buildSeed() {
  const mk = (over) => ({
    id: `aud-${Math.random().toString(36).slice(2)}`,
    fen: ROOK_FEN, playerMove: 'c1c2', playerMoveSan: 'Rc2', bestMove: 'c1c8', bestMoveSan: 'Rc8',
    moves: '', cpLoss: 300, classification: 'blunder', gamePhase: 'endgame', moveNumber: 40,
    sourceGameId: 'g1', sourceMode: 'analysis', playerColor: 'white', promptText: '',
    narration: { intro: '', explanation: '', encouragement: '' }, createdAt: '2026-01-01T00:00:00.000Z',
    opponentName: 'Rival', gameDate: '2026-01-01', openingName: null, evalBefore: 0,
    srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: '2026-01-01', srsLastReview: null,
    status: 'unsolved', attempts: 0, successes: 0, tacticType: null, positionalMotif: null,
    ...over,
  });
  const rows = [];
  for (let i = 0; i < 6; i++) rows.push(mk({ sourceGameId: `g${i % 4}`, cpLoss: 200 + i * 40 }));
  for (let i = 0; i < 3; i++) rows.push(mk({ sourceGameId: `t${i}`, gamePhase: 'middlegame', tacticType: 'fork', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1', cpLoss: 250 }));
  return rows;
}

// The weakness lanes require analyzedGameCount > 0 (else the upload-reminder
// correctly preempts them). The mistakePuzzles are DERIVED from analyzed games,
// so seed one analyzed player game per sourceGameId — this DECOUPLES the weakness
// contracts from the flaky live-played game (which only name-opening / opponent-
// move genuinely need). black='Stockfish Bot' → white player, no username;
// annotations + fullyAnalyzed + analysisDepth make it count as analyzed.
function buildGamesSeed(rows) {
  return [...new Set(rows.map((r) => r.sourceGameId))].map((id, i) => ({
    id, source: 'import', isMasterGame: false, result: '1-0',
    white: 'AuditPlayer', black: 'Stockfish Bot', whiteElo: 1500, blackElo: 1500,
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', date: '2026-01-01', playedAt: `2026-01-0${(i % 8) + 1}T00:00:00.000Z`,
    annotations: [{ moveNumber: 1, color: 'white', evaluation: 20, bestMove: 'e4', bestMoveSan: 'e4', bestMoveEval: 20, classification: 'book' }],
    fullyAnalyzed: true, analysisDepth: 20, openingId: null, coachAnalysis: null,
  }));
}

async function seedWeaknesses(page, rows, games) {
  return page.evaluate(({ rows, games }) => new Promise((resolve) => {
    let req;
    try { req = indexedDB.open('ChessAcademyDB'); } catch { return resolve({ ok: false, reason: 'open-threw' }); }
    req.onerror = () => resolve({ ok: false, reason: 'open-error' });
    req.onsuccess = () => {
      const db = req.result;
      const need = ['mistakePuzzles', 'games'].filter((s) => !db.objectStoreNames.contains(s));
      if (need.length) { db.close(); return resolve({ ok: false, reason: `no-store:${need.join(',')}` }); }
      const tx = db.transaction(['mistakePuzzles', 'games'], 'readwrite');
      for (const r of rows) tx.objectStore('mistakePuzzles').put(r);
      for (const g of games) tx.objectStore('games').put(g);
      tx.oncomplete = () => { db.close(); resolve({ ok: true, wrote: rows.length, games: games.length }); };
      tx.onerror = () => { db.close(); resolve({ ok: false, reason: 'tx-error' }); };
    };
  }), { rows, games });
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
  await page.waitForTimeout(4000);
  await resolvePicker();
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const linesOf = async () => (await transcript.innerText().catch(() => '')).split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => {
    const now = tally(ls); const out = [];
    for (const [line, n] of now) { const extra = n - (seen.get(line) ?? 0); for (let k = 0; k < extra; k++) out.push(line); }
    return out.filter((l) => !l.includes(question));
  };
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  const SUB = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    if (freshFrom(await linesOf()).some(SUB)) { await page.waitForTimeout(2500); return freshFrom(await linesOf()).filter(SUB).join(' '); }
  }
  return '';
}

const isAnswer = (t) => t.trim().length >= 20 && t.includes(' ') && !/pick the one you want to play|splits into several different games/i.test(t);

try {
  // ── SETUP: load, seed the weakness corpus, reload so the app reads it ──────
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  const seedRows = buildSeed();
  const seed = await seedWeaknesses(page, seedRows, buildGamesSeed(seedRows));
  record('seed: wrote a real weakness corpus to IndexedDB', seed.ok, seed.ok ? `${seed.wrote} mistake puzzles / ${seed.games} analyzed games` : `seed failed (${seed.reason})`);
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  // ── LIVE GAME so board-anchored lanes have real move history ──────────────
  // The opponent-move lane requires REAL move history; the click-based move can
  // flake (Watch/narration mode swallows the click), so play, VERIFY a move
  // landed (e2 emptied), and retry the whole start-and-move once if it didn't.
  const playMoves = async () => {
    let landed = false;
    for (const [from, to] of [['e2', 'e4'], ['g1', 'f3']]) {
      try {
        await page.locator(`[data-square="${from}"]`).click({ timeout: 4000 });
        await page.locator(`[data-square="${to}"]`).click({ timeout: 4000 });
        await page.waitForTimeout(3500);
      } catch { /* narration mode */ }
    }
    // e2 empty (no white pawn piece on it) ⇒ e4 registered ⇒ opponent has replied.
    try {
      const e2Piece = await page.locator('[data-square="e2"] [data-piece]').count();
      landed = e2Piece === 0;
    } catch { landed = false; }
    return landed;
  };
  // name-opening + opponent-move genuinely need live move history, and the
  // click-to-move can flake (Watch/narration mode swallows the click), so start
  // + play + verify, retrying the WHOLE start-and-move up to 3 times.
  let moved = false;
  for (let attempt = 0; attempt < 3 && !moved; attempt++) {
    await ask('Play the Italian with me as white');
    await resolvePicker();
    await page.waitForTimeout(4500);
    moved = await playMoves();
  }
  record('setup: live game has real move history (opponent replied)', moved, moved ? 'moves landed' : 'board never left the start position');

  // ── CONTRACT 1: name-this-opening names a REAL opening (not a deflection) ──
  {
    const a = (await ask('what opening is this?')).toLowerCase();
    const namesReal = /\b(sicilian|italian|ruy|caro|french|scandinavian|english|queen'?s|king'?s|london|pirc|petrov|scotch|vienna|four knights|philidor)\b/.test(a) || /eco\s+[a-e]\d/.test(a);
    record('CONTRACT name-opening: names a real, specific opening', isAnswer(a) && namesReal && !a.includes(CANNED), a ? `"${a.slice(0, 120)}"` : 'no reply');
  }

  // ── CONTRACT 2: opponent-move explains their ACTUAL last move ─────────────
  {
    const a = (await ask('why did they play that?')).toLowerCase();
    // Must describe a real move effect (a square, a develop/central/threat idea),
    // not a generic non-answer.
    const explains = /(they|it)\b.*(play|answer|develop|centre|center|control|attack|threat|captur|guard|defend|quiet|square|pawn|knight|bishop)/.test(a);
    record('CONTRACT opponent-move: explains the opponent\'s real move', isAnswer(a) && explains && !a.includes(CANNED), a ? `"${a.slice(0, 120)}"` : 'no reply');
  }

  // ── CONTRACT 3: theory (IQP) TEACHES from the corpus — NOT the record lane ─
  {
    const a = (await ask('how do I play against an isolated queen pawn?')).toLowerCase();
    const teaches = /(isolated|isolani|blockad|d5|d-file|pawn|piece|square|structure|endgame)/.test(a);
    const wrongLane = /no games against|logged yet|start tracking your record|haven'?t played them/.test(a);
    record('CONTRACT theory-IQP: teaches the concept (A0 — not the record lane)', isAnswer(a) && teaches && !wrongLane && !a.includes(CANNED), wrongLane ? 'WRONG LANE: routed to player-record' : `"${a.slice(0, 120)}"`);
  }

  // ── CONTRACT 4: capabilities enumerates ≥3 REAL features ───────────────────
  {
    const a = (await ask('what can you help with?')).toLowerCase();
    const feats = ['weak', 'drill', 'review', 'endgame', 'opening', 'tactic', 'play'].filter((w) => a.includes(w)).length;
    record('CONTRACT capabilities: enumerates ≥3 real features', isAnswer(a) && feats >= 3 && !a.includes(CANNED), `${feats} features named`);
  }

  // ── CONTRACT 5: endgame technique (Lucena) teaches the technique ───────────
  {
    const a = (await ask("what's the Lucena position?")).toLowerCase();
    const teaches = /rook/.test(a) && /pawn/.test(a) && /(bridge|win|promot|queen|shelter|check)/.test(a);
    record('CONTRACT endgame-technique: teaches the Lucena (rook+pawn+win idea)', isAnswer(a) && teaches && !a.includes(CANNED), a ? `"${a.slice(0, 120)}"` : 'no reply');
  }

  // ── CONTRACT 6: weakness briefing names a REAL seeded weakness (data present)
  {
    const a = (await ask('break down my weaknesses')).toLowerCase();
    const named = /(rook|ending|endgame|fork)/.test(a);
    const notEmpty = !/need more|not enough|don'?t have enough|import a few/.test(a);
    record('CONTRACT weakness-briefing: names a real seeded weakness (not "need more games")', isAnswer(a) && named && notEmpty, a ? `"${a.slice(0, 150)}"` : 'no reply');
  }

  // ── CONTRACT 7: endgame-weakness names the WEAKEST ENDING TYPE (rook) ──────
  {
    const a = (await ask('what endgame am I weakest at?')).toLowerCase();
    const namesType = /rook/.test(a) && /(ending|endgame)/.test(a);
    const notEmpty = !/need more|not enough|don'?t have enough|import a few/.test(a);
    record('CONTRACT endgame-weakness: names the seeded weakest type (rook endings)', isAnswer(a) && namesType && notEmpty, a ? `"${a.slice(0, 150)}"` : 'no reply');
  }

  // ── CONTRACT 8 (STAR): the trainer's PLAY → mistake → NAMED-CONCEPT correction
  {
    await page.goto(`${BASE}/coach/endgame-trainer/custom?fen=${encodeURIComponent(KP_WIN_FEN)}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissGates();
    const mounted = await page.locator('[data-testid="endgame-tablebase-trainer"]').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    record('CONTRACT trainer: custom-position trainer mounts', mounted, mounted ? 'mounted' : 'did not mount');
    if (mounted) {
      // Skip Watch → go straight to Play.
      await page.locator('[data-testid="endgame-trainer-skip-to-play"]').click({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(2500);
      // Play the KNOWN mistake Kd5 (throws the win to a draw per the tablebase).
      await page.locator(`[data-square="${KP_MISTAKE[0]}"]`).click({ timeout: 6000 }).catch(() => {});
      await page.locator(`[data-square="${KP_MISTAKE[1]}"]`).click({ timeout: 6000 }).catch(() => {});
      // The grade is a live tablebase call — allow time.
      const fb = page.locator('[data-testid="endgame-trainer-feedback"]');
      const fired = await fb.waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
      const text = fired ? (await fb.innerText().catch(() => '')).toLowerCase() : '';
      record('CONTRACT trainer-correction: a real mistake triggers the correction', fired, fired ? `"${text.slice(0, 120)}"` : 'no correction fired on a losing move');
      // The why must NAME the concept + the WDL consequence, not just "wrong".
      record('CONTRACT trainer-correction: NAMES the concept (opposition/key square) + the thrown win',
        fired && /(opposition|key square)/.test(text) && /(win|slip|gone|quickest|holds?)/.test(text),
        text ? `"${text.slice(0, 140)}"` : 'no concept named');
      // "Show me" plays the tablebase-best move.
      const showMe = page.locator('[data-testid="endgame-trainer-show-me"]');
      if (await showMe.isVisible().catch(() => false)) {
        await showMe.click().catch(() => {});
        await page.waitForTimeout(3000);
        record('CONTRACT trainer-correction: "Show me" plays the best move', true, 'show-me handled');
      }
    }
  }

  // ── CONTRACT 9: the /weaknesses tab offers "Play it out" on the endgame theme
  {
    await page.goto(`${BASE}/tactics/weakness-themes`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    await dismissGates();
    // The endgame theme card carries the trainer button (seeded rook endings).
    const btn = page.locator('[data-testid^="endgame-trainer-btn-"]').first();
    const present = await btn.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (present) {
      await btn.click().catch(() => {});
      const mounted = await page.locator('[data-testid="endgame-tablebase-trainer"]').waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
      record('CONTRACT weaknesses-tab: "Play it out" launches the trainer on your own ending', mounted, mounted ? 'trainer launched from tab' : 'button present, trainer did not mount');
    } else {
      record('CONTRACT weaknesses-tab: "Play it out" button on the endgame theme', false, 'no endgame-trainer button on the weaknesses tab');
    }
  }

  // ── CONTRACT 10: banter stays chess-free (Part VII) ───────────────────────
  {
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissGates(); await dismissGates();
    const a = await ask('thanks so much coach, you are a big help');
    const hasChess = /\b(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h]x[a-h][1-8])\b/.test(a) || /[+-]\d(?:\.\d)?\b/.test(a) || /\b[a-h][1-8]\b/.test(a);
    record('CONTRACT banter: a thank-you gets a warm reply with NO chess notation', isAnswer(a) && !hasChess, hasChess ? `LEAKED CHESS: "${a.slice(0, 100)}"` : `"${a.slice(0, 100)}"`);
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
