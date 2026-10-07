// THE ALL-QUESTIONS COACH AUDIT — every capability in the committed question
// matrix, asked live on prod, each reply graded CONTRACT-vs-OBSERVED.
//
// David 2026-08-13: "Can you do one more complete ALL function test plz. Ask
// every question the coach should be able to answer." The inventory is
// scripts/audit-lib/coach-question-matrix.mjs (the same 55 capabilities the
// questionMatrix.audit.test.ts routing gate covers) — this script drives the
// LIVE app through each one and reads the actual reply.
//
// GRADING: a real data answer passes; the LANE'S OWN honest empty-state
// passes (a cold context has thin profile data — "you haven't played enough
// games" from the right lane proves routing + lane); the STOCK fall-through,
// the greeting, a disambiguation hijack, or silence FAILS. Action entries
// grade by post-state (URL, stage, confirmation), not text presence.
//
// Muted (G1 — never spend TTS to audit) + audit_run_id stamped for PostHog
// read-back. Sections reload /coach/teach so a stage one ask starts can't
// swallow the next section's questions.
//
// AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-coach-all-questions-prod.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { enableAuditCapture } from './audit-lib/enable-audit-capture.mjs';
import { QUESTION_MATRIX, allPhrasings, STRUCTURAL_PROBES, EXPECTED_INTENTS } from './audit-lib/coach-question-matrix.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { seedProfileGames } from './audit-lib/seed-profile-games.mjs';
import { seedWeaknessProfile } from './audit-lib/seed-weakness-profile.mjs';

// EXHAUSTIVE by default (coach audit 2026-09-11): iterate EVERY phrasing per
// lane, not one seeded draw — a single seeded run is a SAMPLE in depth, which
// is how phrasing-specific failures (app-help "tab", the endgame plan wording)
// slipped a "comprehensive" run. Set AUDIT_SAMPLE=1 for the old fast one-draw.
const EXHAUSTIVE = process.env.AUDIT_SAMPLE !== '1';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `allq-${Date.now().toString(36)}`;

// ── per-capability contracts ────────────────────────────────────────────────
// accept = what the LANE's answer (or its own empty-state) looks like.
// Universal REJECTS run first: stock fall-through / greeting / picker hijack.
const REJECT = /i can'?t verify that precisely|what are we working on today|did you mean one of these|hit a snag/i;
// COLD-DATA UPLOAD GATE — the CORRECT reply for any personal-game / profile lane
// when no games are imported ("I can't read your strengths yet … Import your
// Lichess or Chess.com games"). It was reading as a false ❌ on strengths/records
// because their ACCEPT regexes predate this wording (coach audit 2026-09-11).
const UPLOAD_GATE = /can'?t read|import your|none of your real games|no games (are )?in here|haven'?t (played|imported|analy)|play (a few|or import)|not enough games/i;
// Lanes whose answer is personal-game data → cold-profile upload gate is on-contract.
const PROFILE_LANES = new Set([
  'weakness', 'progress', 'trend', 'stats', 'strengths', 'opening-profile',
  'opening-accuracy', 'opening-record', 'opponent-record', 'mistakes',
  'tactics-profile', 'phase-profile', 'repertoire-gap', 'accuracy', 'consistency',
  'converting', 'color', 'records', 'record-vs-target', 'puzzle-stats',
  'transfer-gap', 'skill-radar', 'time-trouble', 'last-game', 'review-due',
]);
const ACCEPT = {
  'position-assessment': /winning|better|equal|even|edge|ahead|balanced/i,
  // Names the move. "I'd play" used to pass here and is a voice-rule break
  // (no first person) — the contract must never reward one (answers swarm P0).
  'best-move': /best move is|the move is|strongest|\b(?:[KQRBN]x?[a-h][1-8]|[a-h]x[a-h][1-8]|[a-h][1-8]|O-O(?:-O)?)\b/,
  'why-best-move': /if .{1,30}(then|,)|engine plays|attacks|threat|controls/i,
  plan: /plan|idea|aim|target|push|develop|pressure/i,
  'tactics-live': /fork|pin|skewer|hanging|threat|mate|nothing is hanging|no immediate tactic|king.{0,40}(safe|exposed|castled)|pawn shield/i,
  'master-play': /master|most (common|popular)|book|game/i,
  'player-games': /game|line|don'?t have|can'?t|which player|no player/i,
  // The board this section drives is the START position, where there IS no
  // tablebase and no ending. Two answers are honest there and the lane accepts
  // both: the phase read ("not an endgame yet — 32 pieces are still on the
  // board"), and a correct VERDICT for a draw/win phrasing ("roughly balanced —
  // this could well be a draw"), which is what "is this a draw?" actually asks.
  // Demanding endgame vocabulary on a 32-man board would be demanding the coach
  // say something untrue about the position (2026-09-16).
  'endgame-tablebase': /endgame|tablebase|king|pawn|not (?:in )?an endgame|pieces are still on the board|too many pieces|balanced|draw|drawn|winning|losing|convert/i,
  'move-rating': /good|fine|solid|book|inaccuracy|mistake|blunder|best|reasonable|top move|gave up nothing|engine'?s (top|best)|no move|haven'?t (played|made)/i,
  // PLAN §E (2026-09-22). The retrospective verdict names the MOVE and its PLY
  // ("Your Nf3 on move 2 …") or, when the named move is not on the tape, names
  // what IS ("I can't find … the last moves on the board were …"). Both are the
  // lane; the stock line is not.
  'retrospective-move': /on move \d+|engine'?s top move|engine preferred|my skill-level move|can'?t find .* in this game|no game on the board|don'?t have an engine read/i,
  // The method answer is the ROUTINE — their idea, the forcing scan, candidates —
  // and must never be a bare best move.
  method: /routine for this position|first, their idea|forcing moves|candidates|checks and captures|their threat first|list the checks/i,
  // The piece-scoped plan names THAT piece and its square.
  'piece-plan': /your (pawn|knight|bishop|rook|queen) on [a-h][1-8]|don'?t have a (pawn|knight|bishop|rook|queen)/i,
  // A hint names the piece and withholds the square, or gives the CONCRETE
  // reason it cannot (never "I can't verify that precisely").
  hint: /here'?s your hint|look at your|where does it want to go|no position on the board|engine read on this position/i,
  weakness: /weak|work on|struggl|mistake|haven'?t (played|analyzed) enough|play a few more|analyze a few/i,
  progress: /improv|pattern|haven'?t played enough|play a few more/i,
  trend: /trend|rating|improving|declining|steady|not enough|haven'?t played/i,
  stats: /rating|\d{3,4}|haven'?t played|no games/i,
  strengths: /strong|best|good at|not enough|haven'?t played/i,
  'opening-profile': /opening|best|score|haven'?t|not enough|no games/i,
  'opening-accuracy': /accura|haven'?t|no games|not enough/i,
  'opening-traps': /trap|gem|lesson plan|verified/i,
  'opening-record': /record|score|logged|haven'?t|no games|don'?t have any of your games/i,
  'opponent-record': /record|haven'?t|no games|logged|never (played|faced)|don'?t have any/i,
  'review-due': /due|review|flashcard|card|nothing|none|caught up/i,
  mistakes: /mistake|drill|puzzle|none|haven'?t|no recorded/i,
  'tactics-profile': /tactic|theme|fork|pin|puzzle|haven'?t|not enough/i,
  'phase-profile': /opening|middlegame|endgame|phase|haven'?t|not enough/i,
  'repertoire-gap': /gap|repertoire|unprepared|haven'?t|play or import/i,
  // A percentage used to pass on its own; the numbers-leak rule bans it.
  accuracy: /accura|haven'?t|not enough/i,
  consistency: /consisten|steadi|streak|form|haven'?t|not enough/i,
  converting: /convert|winning position|haven'?t|not enough/i,
  color: /white|black|colou?r|haven'?t|not enough/i,
  records: /win|best|record|haven'?t|no games/i,
  'record-vs-target': /score|record|logged|haven'?t|no games|don'?t have any/i,
  'puzzle-stats': /puzzle|rating|solved|haven'?t|none yet/i,
  'transfer-gap': /transfer|games?|puzzle|haven'?t|not enough/i,
  'skill-radar': /radar|skill|tactic|strateg|endgame|haven'?t|not enough/i,
  'time-trouble': /time|fast|clock|haven'?t|untimed|not enough/i,
  'last-game': /won|lost|drew|draw|last game|no games|games on file|haven'?t played|don'?t have any of your games/i,
  concept: /fork(?:er)?|discovered|zwischenzug|in-between|pin|skewer|outpost|passed pawn|zugzwang|battery|en prise|lined up|front piece|unmask/i,
  'opening-existence': /no — there'?s no opening called|is a real opening|closest real names/i,
  // A teaching-method ask ("how would you teach the Sicilian") is answered
  // EITHER by describing the method (watch/learn/practice) OR by giving the
  // teaching itself (the plan/idea/structure) — both are on-contract.
  'teaching-method': /teach|watch|learn|practice|lesson|walk|open file|rook|pawn|develop|control|structure|plan|idea|break (it )?down|start with|first/i,
  'settings-query': /voice|narration|on|off|enabled|disabled/i,
  'app-help': /tactic|puzzle|drill|train/i,
  // actions graded by reply/state below; these are their reply shapes.
  'set-voice': /voice|narration|on\b|enabled|already/i,
  'set-verbosity': /brief|narration|verbosity|set|done/i,
  'set-hints': /hint|on\b|enabled|already/i,
  'set-premium-voice': /premium|voice|on\b|enabled|already/i,
  'set-theme': /theme|dark|switched|done|already/i,
  'play-against': /play|your move|board|game on|walk/i,
  'teach-opening': /putting together|lesson|walk|branches into|pick one|variation/i,
  'explain-position': /pawn|knight|bishop|center|centre|develop|white|black/i,
  'continue-middlegame': /middlegame|plan|position|pick one/i,
  'drill-stage': /drill|line|lesson|putting together/i,
  'favorite-opening': /favou?rite|starred|saved|added|couldn'?t find/i,
  'manage-repertoire': /repertoire|added|saved|favou?rites? now/i,
  'board-control': /took|take|back|board|reset|nothing to/i,
  'training-aid': /fork|puzzle|drill|tactic/i,
};
// Entries proven by POST-STATE (URL move) instead of / in addition to text.
const URL_PROOF = {
  // navigate's expected route depends on which phrasing the run drew —
  // "open settings" landing on /settings was graded RED against a
  // hardcoded /tactics (run allq-mss55zxn). Derive it from the ask.
  navigate: (asked) =>
    /settings/i.test(asked) ? /\/settings/
      : /opening/i.test(asked) ? /\/openings/
        : /weakness/i.test(asked) ? /\/weaknesses/
          : /dashboard|home/i.test(asked) ? /\/$/
            : /\/tactics/,
  'review-game': () => /\/coach\/(review|game)/,
};
// Section layout: reload between sections so a stage started by one ask
// can't swallow the next section's turns.
const SECTIONS = [
  // retrospective-move, method, piece-plan and hint were in the matrix and
  // never asked on prod (answers swarm P0, 2026-10-07).
  ['board', ['position-assessment', 'explain-position', 'best-move', 'why-best-move', 'plan', 'tactics-live', 'master-play', 'move-rating', 'retrospective-move', 'method', 'piece-plan', 'hint', 'endgame-tablebase', 'player-games']],
  ['profile', ['weakness', 'progress', 'trend', 'stats', 'strengths', 'opening-profile', 'opening-accuracy', 'opening-record', 'opponent-record', 'review-due', 'mistakes', 'tactics-profile', 'phase-profile', 'repertoire-gap', 'accuracy', 'consistency', 'converting', 'color', 'records', 'record-vs-target', 'puzzle-stats', 'transfer-gap', 'skill-radar', 'time-trouble', 'last-game']],
  ['knowledge', ['concept', 'opening-existence', 'teaching-method', 'settings-query', 'app-help']],
  ['settings', ['set-voice', 'set-verbosity', 'set-hints', 'set-premium-voice', 'set-theme']],
  ['actions', ['board-control', 'favorite-opening', 'manage-repertoire', 'training-aid', 'opening-traps', 'continue-middlegame', 'drill-stage', 'play-against', 'teach-opening', 'review-game', 'navigate']],
];

// EVERY RUN ASKS DIFFERENT QUESTIONS (David 2026-08-13: "make sure the new
// sweep is asking different questions and playing different games and
// functions"). Each capability carries 2-3 alternate phrasing sets in the
// matrix (naming different openings/functions); the pick is seeded by the
// RUN ID so any run can be reproduced exactly from its report.
const seedHash = [...RUN_ID].reduce((h, c) => (Math.imul(h ^ c.charCodeAt(0), 16777619)) >>> 0, 2166136261);
let rngState = seedHash || 1;
const rng = () => { rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0; return rngState / 4294967296; };
const pickPhrasing = (entry) => {
  const pool = [...(entry.qs ?? []), ...(entry.qs2 ?? []), ...(entry.qs3 ?? [])];
  return pool.length ? pool[Math.floor(rng() * pool.length)] : null;
};

const byId = new Map(QUESTION_MATRIX.map((e) => [e.id, e]));
const results = [];
/** Lane ids whose answer was the cold-data upload gate rather than real data. */
const emptyStateAnswers = [];
let CURRENT_ASK = '';
const record = (id, pass, detail, note = '') => {
  results.push({ id, pass, detail, note, asked: CURRENT_ASK });
  console.log(`${pass ? '✅' : '❌'} [${id}] ${detail}${note ? ` (${note})` : ''}`);
};

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch {} }, RUN_ID);
// THE ONE-CHAT SHADOW (P0a, 2026-10-04): every typed turn is also READ by the
// parser and logged as a 'chat-turn' row. Capture the app's audit events
// locally (fulfilled here — nothing reaches prod or Redis) so the contract
// below can hold the rows.
await ctx.addInitScript(enableAuditCapture);
const page = await ctx.newPage();
const appEvents = [];
await page.route('**/api/audit-stream**', async (route) => {
  const req = route.request();
  if (req.method() === 'POST') {
    try {
      const parsed = JSON.parse(req.postData() || '');
      for (const e of (Array.isArray(parsed) ? parsed : parsed.events || [parsed])) appEvents.push(e);
    } catch { /* not JSON — ignore */ }
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
});
let sentAsks = 0;
const pageErrors = [];
page.on('pageerror', (e) => { pageErrors.push(String(e).slice(0, 160)); });

// A DEAD BROWSER MUST END THE RUN WITH ITS REPORT, NOT AN UNCAUGHT EXCEPTION.
// Run allq-mu3wo6pc died in the `actions` section — "Target page, context or
// browser has been closed" — and because `gotoTeach` was unguarded (only `ask`
// was), the throw escaped, killed the process before `writeFileSync`, and threw
// away 449 real results. It also logged the same failure 16 times on the way
// down, which reads like sixteen product bugs. An audit that cannot finish must
// still say what it learned.
let browserDead = false;
const isClosedError = (e) => /Target page, context or browser has been closed|Target closed|browser has been closed/i.test(String(e));

async function gotoTeach() {
  if (browserDead) return false;
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(12000);
      return true;
    } catch (e) {
      if (isClosedError(e)) { browserDead = true; return false; }
      try { await page.waitForTimeout(5000); } catch { browserDead = true; return false; }
    }
  }
  return false;
}

async function ask(q, budgetLoops = 30) {
  await page.waitForTimeout(3000);
  const box = page.locator('[data-testid="chat-text-input"]:visible').first();
  try { await box.waitFor({ timeout: 30000 }); } catch { return { reply: '', sent: false }; }
  const t = page.locator('[data-testid="teach-transcript"]:visible').first();
  // Count LINES, not content: two lanes can serve IDENTICAL empty-state text
  // (stats + records both say "You haven't imported or played any games
  // yet…"), so a content-dedupe filter hid the second lane's real answer and
  // reported "no reply" (run allq-mss0y9qr — the app's own PostHog tape
  // showed every one of those turns answered). New lines past the baseline
  // count are the reply, whatever they say.
  const lines = async () => ((await t.innerText().catch(() => '')) || '')
    .split('\n').map((l) => l.trim()).filter((l) => l.length >= 12 && l.includes(' '));
  const baseArr = await lines();
  // The input EXISTS before it's USABLE — right after a section reload the
  // kickoff turn holds it disabled, and typing into it is a silent no-op
  // (the six first-of-section "no reply" false fails, run allq-mss49itt).
  // Wait for enabled, type, and confirm the text actually landed before
  // pressing Enter — re-typing once if the first attempt was swallowed.
  await page.locator('[data-testid="chat-text-input"]:visible:not([disabled])').first()
    .waitFor({ timeout: 90000 }).catch(() => {});
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await box.click({ force: true }).catch(() => {});
    // GUARD: a stage-starting phrasing can leave the input busy/disabled, so
    // pressSequentially can time out. Don't let that throw uncaught and KILL
    // the whole run (it crashed the exhaustive sweep in the actions section) —
    // catch it and let the "did the text land?" check below decide.
    await box.pressSequentially(q, { delay: 8 }).catch(() => {});
    const typed = await box.inputValue().catch(() => '');
    if (typed.includes(q.slice(0, 12))) break;
    await page.waitForTimeout(4000);
  }
  const typedFinal = await box.inputValue().catch(() => '');
  if (!typedFinal.includes(q.slice(0, 8))) return { reply: '', sent: false };
  await box.press('Enter').catch(() => {});
  const baseSet = new Set(baseArr);
  for (let i = 0; i < budgetLoops; i++) {
    await page.waitForTimeout(1500);
    const now = await lines();
    const n = now.length - baseArr.length;
    let fresh = [];
    if (n > 0) {
      // The transcript renders newest-at-top; take whichever end changed so
      // this stays correct if that ever flips.
      const tailIsOld = now.slice(n).join('|') === baseArr.join('|');
      fresh = (tailIsOld ? now.slice(0, n) : now.slice(baseArr.length)).filter((l) => !l.includes(q));
    }
    if (!fresh.length) {
      // Count didn't grow (a transient mount line in the baseline vanished
      // when the reply landed — the first-of-section misses, runs
      // allq-mss49itt/mss6tkuy). Fall back to a set-diff: any line the
      // baseline never contained is new, whatever the count says.
      fresh = now.filter((l) => !baseSet.has(l) && !l.includes(q));
    }
    if (fresh.length) { await page.waitForTimeout(2000); return { reply: fresh.join(' '), sent: true }; }
  }
  return { reply: '', sent: true };
}

console.log(`[all-questions] ${QUESTION_MATRIX.length} capabilities, run ${RUN_ID}, target ${BASE}`);
// FAIL FAST WHEN THE APP IS NOT THERE. Pointed at a dead target this used to
// grind through all 56 lanes waiting out per-ask budgets, so a real outage
// HUNG the run instead of reporting one — which is how an audit stops being an
// instrument (negative control, 2026-09-16).
if (!(await gotoTeach())) {
  console.log(`\n❌ could not load ${BASE}/coach/teach after 3 attempts — the app is unreachable.`);
  console.log('   Nothing was measured. This is an outage or a harness/proxy problem, not a lane result.');
  try { await browser.close(); } catch { /* already gone */ }
  process.exit(1);
}
// …and the page LOADING is not the surface MOUNTING. Pointed at a target that
// serves a blank shell, every lane would still be attempted at ~30 loops each.
// The chat input is the surface: no input, nothing to audit.
if (!(await page.locator('[data-testid="chat-text-input"]').first().waitFor({ timeout: 60000 }).then(() => true).catch(() => false))) {
  console.log(`\n❌ ${BASE}/coach/teach loaded but the chat surface never mounted (no chat-text-input in 60s).`);
  console.log('   Nothing was measured. Check the deploy before reading anything into the lanes.');
  try { await browser.close(); } catch { /* already gone */ }
  process.exit(1);
}
// Give move-rating / position lanes a real last move: play 1.e4 on the free board.
try {
  await page.locator('[data-square="e2"]').first().click({ timeout: 5000, force: true });
  await page.waitForTimeout(500);
  await page.locator('[data-square="e4"]').first().click({ timeout: 5000, force: true });
  await page.waitForTimeout(6000);
  console.log('   (played 1.e4 on the free board)');
} catch { console.log('   (no free-board move — lanes still answer, some via empty-state)'); }

// DID THIS DEVICE HAVE ANYTHING TO SAY? Tracked so the coverage grid can tell a
// lane answered FROM DATA apart from one that honestly answered "import some
// games first". Both are on-contract on a cold device; only the first tells you
// what a real user reads.
let profileSeeded = false;

for (const [section, ids] of SECTIONS) {
  console.log(`\n── section: ${section} ──`);
  if (section !== 'board') { await gotoTeach(); }
  // SEED BEFORE THE PROFILE LANES. A fresh prod device has no games, so every
  // one of them answers with the upload gate and the audit counts it a pass —
  // 25 lanes testing the empty state (CLAUDE.md's fixture rule). Prefer David's
  // real fixture when the container has it; fall back to a small synthetic
  // history so the lanes are exercised either way.
  if (section === 'profile' && !profileSeeded) {
    const fx = await loadFixtureIntoIDB(page).catch(() => ({ loaded: false, reason: 'loader threw' }));
    if (fx.loaded) {
      console.log(`   [seed] real fixture: ${fx.wrote} rows / ${fx.stores} stores`);
      profileSeeded = true;
    } else {
      const g = await seedProfileGames(page).catch((e) => ({ ok: false, reason: String(e).slice(0, 60) }));
      const w = await seedWeaknessProfile(page).catch((e) => ({ ok: false, reason: String(e).slice(0, 60) }));
      console.log(`   [seed] fixture absent (${fx.reason}) → synthetic: games=${g.ok ? g.wrote : `FAILED ${g.reason}`} mistakes=${w.ok ? w.wrote : `FAILED ${w.reason}`}`);
      profileSeeded = !!(g.ok || w.ok);
    }
    // The surface caches its Dexie read on mount — reload so the lanes see it.
    await gotoTeach();
  }
  for (const id of ids) {
    const entry = byId.get(id);
    if (!entry) { record(id, false, 'not in matrix'); continue; }
    const phrasings = EXHAUSTIVE ? allPhrasings(entry) : [pickPhrasing(entry)].filter(Boolean);
    if (!phrasings.length) { record(id, false, 'matrix entry has no phrasing'); continue; }
   for (const q of phrasings) {
    CURRENT_ASK = q;
    // A fresh surface for the session-starting asks — run 2 proved the
    // previous ask's Italian lesson-gen completing DURING "play the
    // Caro-Kann against me" polluted both the surface state and the reply
    // the reader attributed to it. Exhaustive mode also reloads between
    // phrasings of a stage-starting lane so one phrasing's lesson doesn't
    // bleed into the next.
    if (id === 'play-against' || id === 'teach-opening') { await gotoTeach(); }
    const urlBefore = page.url();
    const budget = id === 'teach-opening' ? 80 : id === 'continue-middlegame' ? 50 : 30;
    if (browserDead) break;
    let asked;
    try { asked = await ask(q, budget); }
    catch (e) {
      if (isClosedError(e)) { browserDead = true; break; }
      asked = { reply: '', sent: false, err: String(e).slice(0, 80) };
    }
    const { reply, sent } = asked;
    if (!sent) { record(id, false, `chat input never usable${asked.err ? ` (${asked.err})` : ''}`); continue; }
    sentAsks += 1;
    const urlAfter = page.url();
    if (URL_PROOF[id]) {
      // Post-state contract: the ask must MOVE the app.
      const proofRe = URL_PROOF[id](q);
      let moved = proofRe.test(urlAfter);
      if (!moved) { await page.waitForTimeout(8000); moved = proofRe.test(page.url()); }
      record(id, moved, moved ? `routed to ${page.url()}` : `url stayed ${urlAfter}; reply "${reply.slice(0, 90)}"`);
      await gotoTeach();
      continue;
    }
    if (!reply) { record(id, false, 'no reply rendered'); continue; }
    if (REJECT.test(reply)) { record(id, false, `stock/greeting/hijack: "${reply.slice(0, 110)}"`); continue; }
    const acc = ACCEPT[id];
    // No contract is a failure of the AUDIT, never a pass: "any reply over 20
    // characters" graded the stock line green.
    if (!acc) { record(id, false, 'no ACCEPT contract for this lane — write one'); continue; }
    let pass = acc.test(reply);
    // A profile/personal-game lane answered with the cold-data upload gate is
    // on-contract (correct behaviour with no games imported).
    // A profile lane answered with the upload gate is ON-CONTRACT but it is not
    // the same result as one answered from data — record which, so "25 green"
    // can never again mean "25 empty states".
    const gated = PROFILE_LANES.has(id) && UPLOAD_GATE.test(reply);
    if (!pass && gated) pass = true;
    if (gated) emptyStateAnswers.push(id);
    record(id, pass, `"${reply.slice(0, 130)}"`, pass ? '' : 'reply is off-contract for this lane');
   }
  }
}

// ── STRUCTURAL PROBES (answers swarm P0, 2026-10-07) ─────────────────────────
// The harder shapes the routing unit gate holds (filler, terse, typos, new
// question shapes, misroute guards) were never asked on prod — the unit gate
// proves an intent FIRES, only the live app proves which lane ANSWERS. Q&A
// probes only: action probes are post-state and the unit gate owns them.
if (EXHAUSTIVE && !browserDead) {
  console.log('\n── section: structural probes ──');
  await gotoTeach();
  try {
    await page.locator('[data-square="e2"]').first().click({ timeout: 5000, force: true });
    await page.waitForTimeout(500);
    await page.locator('[data-square="e4"]').first().click({ timeout: 5000, force: true });
    await page.waitForTimeout(6000);
  } catch { /* lanes still answer */ }
  for (const p of STRUCTURAL_PROBES.filter((x) => x.cat !== 'action')) {
    if (browserDead) break;
    CURRENT_ASK = p.q;
    let asked;
    try { asked = await ask(p.q, 30); }
    catch (e) {
      if (isClosedError(e)) { browserDead = true; break; }
      asked = { reply: '', sent: false };
    }
    const id = `probe:${p.id}`;
    if (!asked.sent) { record(id, false, 'chat input never usable'); continue; }
    sentAsks += 1;
    if (!asked.reply) { record(id, false, 'no reply rendered'); continue; }
    if (REJECT.test(asked.reply)) { record(id, false, `stock/greeting/hijack: "${asked.reply.slice(0, 110)}"`); continue; }
    // Wording is the lane check's job below; a probe's own pass is "it answered".
    record(id, true, `"${asked.reply.slice(0, 130)}"`);
  }
}

// ── THE SERVED LANE (answers swarm P0, 2026-10-07) ──────────────────────────
// A reply's WORDS can satisfy a loose contract while it came from the wrong
// lane or the safe-default fall-through — that is how misroutes stayed green.
// coachService logs the lane that voiced each answer (`servedIntent` on the
// coach-brain-answered row); every Q&A ask is held to EXPECTED_INTENTS.
if (!browserDead) await page.waitForTimeout(8000).catch(() => {});
{
  const servedByAsk = new Map();
  for (const e of appEvents) {
    if (e?.kind !== 'coach-brain-answered' || typeof e.askText !== 'string') continue;
    let d = null;
    try { d = JSON.parse(e.details ?? '{}'); } catch { d = null; }
    servedByAsk.set(e.askText.trim(), d?.servedIntent ?? null);
  }
  const graded = results.filter((r) => r.asked && EXPECTED_INTENTS[r.id.replace(/^probe:/, '')] && !URL_PROOF[r.id]);
  const laneRows = [];
  for (const r of graded) {
    const want = EXPECTED_INTENTS[r.id.replace(/^probe:/, '')];
    // Exact text first; a surface that wraps the student's words (context
    // prefixes) still carries them inside its askText.
    let key = r.asked.trim();
    if (!servedByAsk.has(key)) key = [...servedByAsk.keys()].find((k) => k.includes(r.asked.trim())) ?? key;
    CURRENT_ASK = r.asked;
    if (!servedByAsk.has(key)) {
      laneRows.push({ id: `lane:${r.id}`, pass: false, detail: 'answered outside the coach door — no coach-brain-answered row' });
      continue;
    }
    const got = servedByAsk.get(key);
    const pass = got !== null && want.includes(got);
    const why = got === null ? 'no grounded lane voiced it (free text)'
      : /^safe-default/.test(got) ? `fell through to ${got}`
        : `served ${got}`;
    laneRows.push({ id: `lane:${r.id}`, pass, detail: pass ? `served ${got}` : `${why}; expected ${want.join(' | ')}` });
  }
  console.log('\n── served lane ──');
  for (const l of laneRows) record(l.id, l.pass, l.detail);
  // Non-vacuous: zero graded rows means the instrument saw nothing, not that
  // every lane was right.
  record('SERVED LANE rows were graded', laneRows.length > 0 && servedByAsk.size > 0,
    `${laneRows.length} ask(s) graded against ${servedByAsk.size} brain row(s)`);
}

if (browserDead) {
  console.log('\n⚠️  THE BROWSER DIED MID-RUN — the results below are PARTIAL.');
  console.log('    Everything after that point is unmeasured, not passing. Re-run');
  console.log('    before drawing any conclusion about the lanes it never reached.');
  console.log('    (Most likely cause in this container: memory pressure from other');
  console.log('     work running alongside a long Chromium session — run it alone.)');
}

if (emptyStateAnswers.length) {
  const uniq = [...new Set(emptyStateAnswers)];
  console.log(`\n⚠️  ${emptyStateAnswers.length} answer(s) across ${uniq.length} lane(s) were the EMPTY STATE, not data:`);
  console.log(`    ${uniq.join(', ')}`);
  console.log('    On-contract for a device with no games — but those lanes did NOT');
  console.log('    exercise the sentence a real user reads. Seeding is above; if it');
  console.log('    reported FAILED, fix that before reading anything into these rows.');
}

// ── THE CHAT-TURN CONTRACT (ONE-CHAT shadow, algo-audit rule) ──────────────
// Emitting is half the build; this is the other half. The reader runs in
// SHADOW, so agreement is REPORTED (it is the number the switch is taken on),
// not gated. What IS gated: the rows exist for the turns asked, each names its
// fast-path lane and how it was read, and nothing was served from the reading
// while the flag is off.
CURRENT_ASK = '(chat-turn contract)';
if (!browserDead) await page.waitForTimeout(8000).catch(() => {});
const chatTurnRows = appEvents
  .filter((e) => e?.kind === 'chat-turn')
  .map((e) => { try { return JSON.parse(e.details ?? '{}'); } catch { return null; } })
  .filter(Boolean);
record('CHAT TURN rows emitted for the asked turns',
  sentAsks > 0 && chatTurnRows.length >= Math.floor(sentAsks * 0.8),
  `${chatTurnRows.length} row(s) for ${sentAsks} sent ask(s)`);
record('CHAT TURN every row names its lane and read',
  chatTurnRows.length > 0 && chatTurnRows.every((r) => typeof r.fastPathLane === 'string' && typeof r.parseSource === 'string' && (r.askSource === 'typed' || r.askSource === 'spoken')),
  `${chatTurnRows.filter((r) => typeof r.fastPathLane !== 'string').length} row(s) missing a lane`);
record('CHAT TURN shadow serves nothing (flag off)',
  chatTurnRows.every((r) => r.servedParsed === false),
  `${chatTurnRows.filter((r) => r.servedParsed).length} row(s) served from the reading`);
{
  const compared = chatTurnRows.filter((r) => r.agreed !== null);
  const agreed = compared.filter((r) => r.agreed === true).length;
  const read = chatTurnRows.filter((r) => r.parsedKind !== null).length;
  const valid = chatTurnRows.filter((r) => r.valid === true).length;
  const lat = chatTurnRows.map((r) => r.latencyMs).filter((n) => typeof n === 'number').sort((a, b) => a - b);
  const p90 = lat.length ? lat[Math.min(lat.length - 1, Math.floor(lat.length * 0.9))] : null;
  console.log(`\n── chat-turn shadow ──`);
  console.log(`   read ${read}/${chatTurnRows.length}, valid ${valid}, agreement ${compared.length ? `${agreed}/${compared.length} (${Math.round((100 * agreed) / compared.length)}%)` : 'n/a'}, p90 ${p90 ?? 'n/a'}ms`);
  for (const r of compared.filter((x) => x.agreed === false)) {
    console.log(`   DISAGREE fast=${r.fastPathLane} parsed=${r.parsedKind} served=${r.servedIntent ?? '-'} "${r.askPreview}"`);
  }
}

const passed = results.filter((r) => r.pass).length;
console.log(`\n── coverage grid ──`);
for (const r of results) console.log(`${r.pass ? '✅' : '❌'} ${r.id}`);
console.log(`\n${passed}/${results.length} capabilities answered on-contract`);
console.log(`pageerrors: ${pageErrors.length}`);
for (const e of pageErrors.slice(0, 5)) console.log(`  PAGEERROR: ${e}`);
console.log(`audit_run_id: ${RUN_ID}`);
const dir = `audit-reports/coach-all-questions-${new Date().toISOString().replace(/[:.]/g, '-')}`;
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, partial: browserDead, emptyStateAnswers: [...new Set(emptyStateAnswers)], results, pageErrors }, null, 2));
console.log(`report: ${dir}/report.json`);
try { await browser.close(); } catch { /* already gone */ }
// A partial run is never a pass, however many of its checks were green.
process.exitCode = (!browserDead && passed === results.length) ? 0 : 1;
