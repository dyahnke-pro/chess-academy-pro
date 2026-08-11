// THE COACH ANSWERS THE QUESTION IT WAS ASKED.
//
// David, 2026-08-11, after a real game on his phone: "I did notice the coach
// could not answer my questions when asked." PostHog said exactly why:
//
//   "Which pawn should I push?"  →  "The best move is O-O. White is clearly
//                                    better (about 1.4 points)."
//   "What is my plan?"           →  "The best move is e5. It stakes out the
//                                    centre with the pawn to e5."
//
// Castling is not a pawn, and one move is not a plan. Two separate defects:
// the best-move lane answers from the engine and never sees the WORDS, and the
// plan lane was guarded by `grounding.enginePlan`, a field only GameChatPanel
// ever produced — so on Learn it was classified correctly, arrived at a branch
// it could not enter, and fell through to the generic readout.
//
// 🔒 WHY THIS SCRIPT EXISTS AT ALL. Both fixes shipped green: unit tests
// passed, the wiring gate passed, and the two prod audits passed — because NOT
// ONE OF THEM EVER TYPES A QUESTION. They drive moves and check routing. That
// is the same "green audit, dead lane" trap that hid the plan lane in the first
// place, and it does not get to hide the fix as well. This asks real questions
// on the live build and reads the real answers.
//
// The bar is deliberately not "an answer appeared". The canned fallback IS an
// answer, and it is exactly 150 characters of "I can't verify that precisely
// from grounded data right now." Over 30 days it was 78% of home-chat's replies
// and 67% of review's. So each check below asserts the answer is RESPONSIVE to
// what was asked, and separately that it is not the canned line.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `answers-${Date.now().toString(36)}`;
/** The stock "I can't verify that precisely…" reply, to the character. */
const CANNED = "i can't verify that precisely";

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
// Muted: this audit needs to know WHAT the coach said, not to hear it (G1).
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => {
  try { localStorage.setItem('auditRunId', id); } catch { /* private mode */ }
}, RUN_ID);
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
    } catch { /* not shown on this run */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

/** A line picker is not an answer.
 *
 *  🔒 THE FIRST VERSION OF THIS SCRIPT REPORTED 4/5 GREEN ON NOTHING. It read
 *  `body.innerText`, and a family request ("Play the Italian with me") opens the
 *  variation PICKER — so what it captured and graded was
 *  "…splits into several different games. pick the one you want to play…".
 *  That text happens to contain the words the checks looked for, so a surface
 *  that had answered NO questions passed four of them.
 *
 *  Which is the exact trap this script exists to catch, sprung on its author
 *  inside an hour. A picker has to be RESOLVED before a question means
 *  anything, and the answer has to be read from the transcript rather than
 *  from the whole page. */
async function resolvePicker() {
  const tile = page.locator('[data-testid^="line-picker-"]').first();
  try {
    await tile.waitFor({ timeout: 4000 });
    await tile.click();
    await page.waitForTimeout(3500);
    return true;
  } catch { return false; }
}

/** Type a question the way a person does and return ONLY what the transcript
 *  gained.
 *
 *  `pressSequentially`, not `fill` — the React textarea needs real key events
 *  or the send button stays disabled and the message never submits, which would
 *  read as "the coach said nothing" when nothing was ever asked. */
async function ask(question) {
  await resolvePicker(); // a picker left open swallows the question entirely
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const before = (await transcript.innerText().catch(() => '')).length;
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  // Cold grounding can take a real search; wait for the TRANSCRIPT to grow
  // rather than for a fixed interval or for any part of the page to change.
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const now = await transcript.innerText().catch(() => '');
    if (now.length > before + question.length + 40) {
      await page.waitForTimeout(2500); // let the reply finish streaming
      const settled = await transcript.innerText().catch(() => '');
      // Drop the echo of the question itself, so a check can never pass on the
      // student's own words.
      return settled.slice(before).replace(question, ' ');
    }
  }
  return '';
}

/** Did we actually get a coach answer, rather than a UI surface? */
function isAnswer(text) {
  if (!text.trim()) return false;
  return !/pick the one you want to play|splits into several different games/i.test(text);
}

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates();
  await dismissGates();

  // Get a real game going, so the questions land on a position with something
  // to say rather than the start position. A family request opens the variation
  // picker, so take a road before asking anything — an open picker eats the
  // question and its prompt text is what the first version of this script
  // graded as an answer.
  await ask('Play the Italian with me as white');
  await resolvePicker();
  await page.waitForTimeout(4000);

  // ── 1. THE PIECE-RESTRICTED ASK ─────────────────────────────────────────
  // His exact question. The engine's move may well not be a pawn move — that
  // is fine and often correct — but the answer has to SAY so rather than name
  // a knight and appear to have answered.
  const pawnAsk = (await ask('Which pawn should I push?')).toLowerCase();
  const namesPawnOrSaysNot = /no pawn move is the answer/.test(pawnAsk)
    || /\bpawn\b/.test(pawnAsk);
  record(
    'a question about a PAWN is answered about pawns',
    isAnswer(pawnAsk) && namesPawnOrSaysNot,
    pawnAsk ? `"${pawnAsk.replace(/\s+/g, ' ').slice(0, 150)}"` : 'no reply in 45s',
  );
  record(
    'the pawn question is not answered with the canned fallback',
    isAnswer(pawnAsk) && !pawnAsk.includes(CANNED),
    pawnAsk.includes(CANNED) ? 'served "I can\'t verify that precisely"' : 'grounded',
  );

  // ── 2. THE PLAN ASK ─────────────────────────────────────────────────────
  // The lane that was structurally unreachable outside GameChatPanel. A plan
  // is a sequence with an idea; "The best move is e5." on its own is the
  // failure this check exists for.
  const planAsk = (await ask('What is my plan?')).toLowerCase();
  const readsLikeAPlan = /\bplan\b|\bwant to\b|\bidea\b|\bthen\b|\bfollowed by\b|\bnext\b/.test(planAsk);
  const bareBestMove = /^\W*the best move is \S+\.?\s*$/.test(planAsk.trim());
  record(
    'a question about a PLAN gets more than one move',
    isAnswer(planAsk) && readsLikeAPlan && !bareBestMove,
    planAsk ? `"${planAsk.replace(/\s+/g, ' ').slice(0, 150)}"` : 'no reply in 45s',
  );
  record(
    'the plan question is not answered with the canned fallback',
    isAnswer(planAsk) && !planAsk.includes(CANNED),
    planAsk.includes(CANNED) ? 'served "I can\'t verify that precisely"' : 'grounded',
  );

  // ── 3. THE PLAIN BEST-MOVE ASK ──────────────────────────────────────────
  // The control. This one always worked on Learn, and if it broke while the
  // other two were being fixed, that is the regression to catch.
  const bestAsk = (await ask('What is the best move here?')).toLowerCase();
  record(
    'the plain best-move question still answers',
    isAnswer(bestAsk) && !bestAsk.includes(CANNED),
    bestAsk ? `"${bestAsk.replace(/\s+/g, ' ').slice(0, 120)}"` : 'no reply in 45s',
  );
} catch (err) {
  record('the run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();

const passed = results.filter((r) => r.pass).length;
console.log(`\n[posthog] read what the coach actually said on this run:`);
console.log(`  SELECT timestamp, properties.summary FROM events`);
console.log(`  WHERE event IN ('coach_question_asked','coach_answer')`);
console.log(`    AND properties.audit_run_id='${RUN_ID}' ORDER BY timestamp`);
console.log(`\n${passed}/${results.length} checks green`);
process.exit(passed === results.length ? 0 : 1);
