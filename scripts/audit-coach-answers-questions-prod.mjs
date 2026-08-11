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
  // 🔒 `[data-testid^="line-picker-"]` IS NOT THE TILES. It also matches the
  // Play/Face mode toggles and the "Never mind" escape, so `.first()` clicked
  // a TOGGLE — which correctly does nothing — and left the picker wide open.
  // Every question after that was swallowed, and this audit reported 0/5 while
  // capturing the picker's own prompt text. `data-fullname` is on the
  // variation tiles and nothing else, which is what makes it the right handle.
  // (Same bug, same fix, as `audit-line-picker-popularity-prod`. Swept here
  // because it was fixed there and not carried across.)
  const tile = page.locator('[data-testid^="line-picker-"][data-fullname]').first();
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
  // PACE THE BRAIN-HEAVY ASKS. Firing questions back to back saturates the
  // provider, so a later one exceeds the timeout and reads as a hang that a
  // real user would never see. An un-paced run cannot legitimately go green:
  // it manufactures the failure it then reports.
  await page.waitForTimeout(4000);
  await resolvePicker(); // a picker left open swallows the question entirely
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]');
  const linesOf = async () => (await transcript.innerText().catch(() => ''))
    .split('\n').map((l) => l.trim()).filter(Boolean);
  // A MULTISET, NOT A SET. "What is the best move here?" and "Which pawn
  // should I push?" get the SAME answer on the same board — correctly — so a
  // membership test filtered the third reply out as already-seen and reported
  // "no reply in 45s" for a coach that had answered in two seconds. Counting
  // occurrences finds a repeat; membership cannot.
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => {
    const now = tally(ls);
    const out = [];
    for (const [line, n] of now) {
      const extra = n - (seen.get(line) ?? 0);
      for (let k = 0; k < extra; k++) out.push(line);
    }
    return out.filter((l) => !l.includes(question));
  };
  await box.click();
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');

  // 🔒 READ THE DIFF, NOT A TAIL SLICE. The first version took
  // `text.slice(previousLength)` — which only finds new content if the
  // transcript APPENDS. This one renders newest-FIRST, so the slice returned
  // the OLDEST text every time and the audit graded the greeting and the
  // picker prompt as the coach's answer to a question it never saw. Comparing
  // the set of lines finds what arrived wherever it landed.
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const fresh = freshFrom(await linesOf());
    if (fresh.length > 0) {
      await page.waitForTimeout(2500); // let the reply finish streaming
      return freshFrom(await linesOf()).join(' ');
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

  // ── 2b. THE SAME QUESTION, ASKED THE WAY HE ACTUALLY ASKS IT ────────────
  //
  // He typed "What is the plan for white and black?" on prod 2026-08-11 and the
  // plan lane never saw it — the intent only knew the first person, so a
  // question about BOTH sides fell through to the general path, which has no
  // plan to hand over. The lane was fine. The routing was the defect, and no
  // check here would have caught it because every question in this file was
  // phrased the one way the regex already matched.
  const bothPlanAsk = (await ask('What is the plan for white and black?')).toLowerCase();
  record(
    'a plan question about BOTH sides reaches the plan lane',
    isAnswer(bothPlanAsk)
      && /\bplan\b|\bwant to\b|\bidea\b|\bthen\b|\bfollowed by\b|\bnext\b/.test(bothPlanAsk)
      && !bothPlanAsk.includes(CANNED),
    bothPlanAsk ? `"${bothPlanAsk.replace(/\s+/g, ' ').slice(0, 150)}"` : 'no reply in 45s',
  );
  // AND IT MUST NOT OPEN ON A PRONOUN WITH NOTHING IN FRONT OF IT. This is the
  // shape he actually heard — "No pawn can ever defend it, so White's pieces
  // get tied down…" — after the fidelity gate stripped the opening sentence and
  // served the remainder that had been written to lean on it.
  record(
    'the answer does not open on a dangling reference',
    isAnswer(bothPlanAsk) && !/^\s*(?:no\s+\w+\s+can\s+ever\s+\w+\s+it\b|it\s|its\s|they\s|them\s|those\s|these\s|that\s+\w+\s+is\b)/.test(bothPlanAsk),
    `opens: "${bothPlanAsk.replace(/\s+/g, ' ').slice(0, 80)}"`,
  );

  // ── 2c. "WHY PLAY <MOVE>?" — HIS THIRD QUESTION ─────────────────────────
  //
  // "Why play night c3?" got "The best move is Nc3. It develops the knight to
  // c3" — his own move restated, then a tautology. Two misses in one: the verb
  // form ("why PLAY x", not "why IS x best") and the spelling everybody types
  // for a spoken knight.
  const whyAsk = (await ask('Why play night c3?')).toLowerCase();
  record(
    'a "why play <move>" question is answered, not restated',
    isAnswer(whyAsk)
      && !whyAsk.includes(CANNED)
      // The tautology: "it develops the knight to c3" says the move's own
      // name back. A real answer names what the move is FOR.
      && !/^\W*the best move is \S+\.\s*it (?:develops|moves|plays) the \w+ to [a-h][1-8]\.?\s*$/.test(whyAsk.trim()),
    whyAsk ? `"${whyAsk.replace(/\s+/g, ' ').slice(0, 150)}"` : 'no reply in 45s',
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
