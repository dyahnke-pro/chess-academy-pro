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
import { QUESTION_MATRIX } from './audit-lib/coach-question-matrix.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID ?? `allq-${Date.now().toString(36)}`;

// ── per-capability contracts ────────────────────────────────────────────────
// accept = what the LANE's answer (or its own empty-state) looks like.
// Universal REJECTS run first: stock fall-through / greeting / picker hijack.
const REJECT = /i can'?t verify that precisely|what are we working on today|did you mean one of these|hit a snag/i;
const ACCEPT = {
  'position-assessment': /winning|better|equal|even|edge|ahead|balanced/i,
  'best-move': /best move is|i'?d play/i,
  'why-best-move': /if .{1,30}(then|,)|engine plays|attacks|threat|controls/i,
  plan: /plan|idea|aim|target|push|develop|pressure/i,
  'tactics-live': /fork|pin|skewer|hanging|threat|mate|nothing is hanging|no immediate tactic/i,
  'master-play': /master|most (common|popular)|book|game/i,
  'player-games': /game|line|don'?t have|can'?t|which player|no player/i,
  'endgame-tablebase': /endgame|tablebase|king|pawn|not .{0,20}endgame|too many pieces/i,
  'move-rating': /good|fine|solid|book|inaccuracy|mistake|blunder|best|reasonable|top move|gave up nothing|engine'?s (top|best)|no move|haven'?t (played|made)/i,
  weakness: /weak|work on|struggl|haven'?t played enough|play a few more/i,
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
  accuracy: /accura|\d+\s?%|haven'?t|not enough/i,
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
  concept: /fork(?:er)?.{0,120}(two|attack|hit|strike|same time|both|together|more than one)/i,
  'opening-existence': /no — there'?s no opening called|is a real opening|closest real names/i,
  'teaching-method': /teach|watch|learn|practice|lesson|walk/i,
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
  ['board', ['position-assessment', 'best-move', 'why-best-move', 'plan', 'tactics-live', 'master-play', 'move-rating', 'endgame-tablebase', 'player-games']],
  ['profile', ['weakness', 'progress', 'trend', 'stats', 'strengths', 'opening-profile', 'opening-accuracy', 'opening-record', 'opponent-record', 'review-due', 'mistakes', 'tactics-profile', 'phase-profile', 'repertoire-gap', 'accuracy', 'consistency', 'converting', 'color', 'records', 'record-vs-target', 'puzzle-stats', 'transfer-gap', 'skill-radar', 'time-trouble', 'last-game']],
  ['knowledge', ['concept', 'opening-existence', 'teaching-method', 'settings-query', 'app-help']],
  ['settings', ['set-voice', 'set-verbosity', 'set-hints', 'set-premium-voice', 'set-theme']],
  ['actions', ['board-control', 'favorite-opening', 'manage-repertoire', 'training-aid', 'opening-traps', 'explain-position', 'continue-middlegame', 'drill-stage', 'play-against', 'teach-opening', 'review-game', 'navigate']],
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
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => { pageErrors.push(String(e).slice(0, 160)); });

async function gotoTeach() {
  for (let i = 0; i < 3; i++) {
    try {
      await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(12000);
      return;
    } catch { await page.waitForTimeout(5000); }
  }
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
    await box.click({ force: true });
    await box.pressSequentially(q, { delay: 8 });
    const typed = await box.inputValue().catch(() => '');
    if (typed.includes(q.slice(0, 12))) break;
    await page.waitForTimeout(4000);
  }
  await box.press('Enter');
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
await gotoTeach();
// Give move-rating / position lanes a real last move: play 1.e4 on the free board.
try {
  await page.locator('[data-square="e2"]').first().click({ timeout: 5000, force: true });
  await page.waitForTimeout(500);
  await page.locator('[data-square="e4"]').first().click({ timeout: 5000, force: true });
  await page.waitForTimeout(6000);
  console.log('   (played 1.e4 on the free board)');
} catch { console.log('   (no free-board move — lanes still answer, some via empty-state)'); }

for (const [section, ids] of SECTIONS) {
  console.log(`\n── section: ${section} ──`);
  if (section !== 'board') { await gotoTeach(); }
  for (const id of ids) {
    const entry = byId.get(id);
    if (!entry) { record(id, false, 'not in matrix'); continue; }
    const q = pickPhrasing(entry);
    if (!q) { record(id, false, 'matrix entry has no phrasing'); continue; }
    CURRENT_ASK = q;
    // A fresh surface for the session-starting asks — run 2 proved the
    // previous ask's Italian lesson-gen completing DURING "play the
    // Caro-Kann against me" polluted both the surface state and the reply
    // the reader attributed to it.
    if (id === 'play-against' || id === 'teach-opening') { await gotoTeach(); }
    const urlBefore = page.url();
    const budget = id === 'teach-opening' ? 80 : id === 'continue-middlegame' ? 50 : 30;
    const { reply, sent } = await ask(q, budget);
    if (!sent) { record(id, false, 'chat input never mounted'); continue; }
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
    const pass = acc ? acc.test(reply) : reply.length > 20;
    record(id, pass, `"${reply.slice(0, 130)}"`, pass ? '' : 'reply is off-contract for this lane');
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
writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, pageErrors }, null, 2));
console.log(`report: ${dir}/report.json`);
await browser.close();
process.exitCode = passed === results.length ? 0 : 1;
