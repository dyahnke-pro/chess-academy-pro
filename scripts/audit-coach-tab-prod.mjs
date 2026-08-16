#!/usr/bin/env node
/**
 * THE COACH TAB AUDIT — three contracts David named (2026-08-16):
 *
 *   A. "Tactics working and narrated."     A tactic that exists on the board is
 *      DETECTED, and the coach SAYS SO OUT LOUD. Detection without narration is
 *      the failure mode this contract exists to catch — the tactics context can
 *      be built perfectly and the student never hears a word of it.
 *
 *   B. "Forward and back buttons present and working."  Present is half of it.
 *      A nav button that renders and does nothing is worse than an absent one,
 *      so every control is CLICKED and the board placement must actually move.
 *
 *   C. "Coach play can answer all questions that learn can speak and answer."
 *      The same question battery is put to BOTH surfaces and the answers are
 *      compared. Parity is judged on what comes back, not on which modules each
 *      page imports — Play's chat imports 18 services to Learn's 78, but reaches
 *      the same grounded assemblers through `dispatchCoachTurn → coachService →
 *      coachApi`, so an import diff reads as a catastrophe that is not there.
 *      Only the answers settle it.
 *
 * THREE INSTRUMENTS (G1), all of them, every run: Playwright drives, the prod
 * audit-stream captures what the app did internally, and the narration listener
 * proves the voice actually fired. A green Playwright pass alone is not this
 * audit — silence where the coach should speak is exactly what the listener is
 * here to catch, and nothing else can see it.
 *
 * MUTED (G1). `muteTtsForAudit` keeps the `coach-narration-spoken` events —
 * same text, same listener, no synthesis — so contract A is measured off the
 * app's own events and costs nothing. Do NOT swap this for the /api/tts request
 * intercept: this audit reads the SPOKEN TEXT out of the event payload, and the
 * intercept would only tell us a request was made.
 *
 * DRIVEN BY PLAYING, NOT BY TYPING (David 2026-08-16: "Do not type in 'teach me'
 * just start playing an opening"). The Learn lane reaches its position by
 * clicking pieces, the way he does.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-coach-tab-prod.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { clickMove, awaitCoachReply, readPlacement, samePlacement, placementOf, sleep } from './audit-lib/board-drive.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-tab-${stamp}`;

const results = [];
const pass = (name, detail) => { results.push({ name, ok: true, detail }); console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`); };
const fail = (name, detail) => { results.push({ name, ok: false, detail }); console.log(`  ✗ ${name} — ${detail}`); };
/** Not exercised ≠ passed. A contract we could not reach is reported as unproven,
 *  never quietly omitted — that omission is how an audit reports coverage it
 *  does not have. */
const unproven = (name, detail) => { results.push({ name, ok: null, detail }); console.log(`  · ${name} — ${detail}  ← NOT EXERCISED`); };

/** OUR moves only — the coach picks its own replies, so scripting both colours
 *  is wrong: after the coach answers, the next entry in a both-colours list is
 *  a move for a side we do not control and is usually already illegal, which
 *  breaks the drive after one ply and reads as "the board rejected the move".
 *  These four are the Fried-Liver shape (Bc4 and Ng5 both bearing on f7), each
 *  re-validated against the LIVE position before it is clicked, and skipped
 *  rather than forced if the coach's choice has made it illegal (G3). */
const STUDENT_MOVES = ['e4', 'Nf3', 'Bc4', 'Ng5', 'Nxf7'];

/** The question classes Learn is expected to answer. Kept small and
 *  behavioural: each row is a capability, asked plainly. Parity is per-row. */
const PARITY_QUESTIONS = [
  { id: 'best-move', q: "what's my best move?" },
  { id: 'why-best', q: 'why is that the best move?' },
  { id: 'tactics', q: 'is there a tactic here?' },
  { id: 'threats', q: 'what is my opponent threatening?' },
  { id: 'plan', q: "what's my plan in this position?" },
  { id: 'assessment', q: "who's better here?" },
  { id: 'opening', q: 'what opening is this?' },
];

/** The stock non-answer. If a surface returns THIS, the lane is not wired —
 *  that is the whole point of the matrix (David 2026-07-09: "If it comes back
 *  with the stock answer we track it down and plug it in"). */
const STOCK = /I can only speak to what I can verify|I can't verify|I don't have enough|not sure what you|Hit a snag|Connection error/i;

/** BREVITY IS NOT A FAILURE. An earlier version of this required 60+
 *  characters, which graded "The best move is d4. Black is winning (about 4.9
 *  points)." and "Queen on d8 pins pawn on d2 against queen on d1." as thin —
 *  two precise, grounded, board-true answers marked as non-answers because
 *  they were short. The app's own voice rules say the opposite ("No length
 *  floor. Two words beats two sentences when two words is what the position
 *  needs"), so an audit with a length floor is enforcing the reverse of the
 *  standard. What actually distinguishes an answer from a non-answer is the
 *  stock refusal, plus enough text to be a sentence at all. */
const isGrounded = (r) => !!r.ok && !STOCK.test(r.text) && r.text.trim().length >= 15;

async function dismissModals(page) {
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-modal-close"]', '[data-testid="page-help-modal"] button']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await sleep(400); }
  }
}

/** Ask the coach a question on whichever surface is mounted, and return the
 *  reply text. Types via pressSequentially — the React textarea needs real key
 *  events or the send button stays disabled and the message never submits
 *  (CLAUDE.md, the coach-audit reference pattern). */
async function ask(page, question) {
  const box = page.locator('[data-testid="chat-text-input"] textarea, [data-testid="chat-text-input"]').first();
  if (!(await box.isVisible().catch(() => false))) return { ok: false, text: '', why: 'no chat input visible' };
  // The input is disabled while a turn is in flight; waiting for it to re-enable
  // BEFORE typing is what stops false "send failed" reds.
  for (let i = 0; i < 60 && await box.isDisabled().catch(() => false); i++) await sleep(1000);

  // DO NOT USE DOM ORDER. Three different false reds came from assuming one:
  //   · Learn's greeting ("Back at the board…") lands after a count baseline,
  //     satisfies "count went up", and gets graded as the answer;
  //   · Play injects the coach's own move announcement ("Pawn to e4.") into the
  //     same transcript, so the newest bubble is often a move, not a reply;
  //   · and the two surfaces render in OPPOSITE directions — Learn maps
  //     `[...messages].reverse()` (newest FIRST in the DOM, with the streaming
  //     bubble above even that), Play reads oldest-first. "The assistant
  //     message after my question" is therefore correct on one surface and
  //     backwards on the other.
  // What holds on both: the answer is an assistant bubble whose text was not
  // there before we asked. Compare by CONTENT, not position.
  const all = page.locator('[data-testid="chat-message-user"], [data-testid="chat-message-assistant"]');
  const roles = async () => all.evaluateAll((els) => els.map((e) => ({
    role: e.getAttribute('data-testid')?.endsWith('user') ? 'user' : 'assistant',
    text: (e.textContent ?? '').replace(/^\s*C\s+/, '').trim(),
  })));
  const seedList = await roles().catch(() => []);
  const seen = new Set(seedList.filter((m) => m.role === 'assistant').map((m) => m.text));

  await box.click({ force: true }).catch(() => {});
  await box.fill('').catch(() => {});
  await box.pressSequentially(question, { delay: 12 });
  await page.keyboard.press('Enter');

  // ENTER DOES NOT ALWAYS SEND. `ChatInput.handleKeyDown` opens the AI-consent
  // modal INSTEAD of sending when consent has not been granted yet, so the
  // first question of a fresh context types fine, submits nothing, and the
  // audit reports "send failed" against a surface that is working exactly as
  // designed. Clear the gate and press the real button.
  // Search the WHOLE transcript, not its tail: on a newest-first surface the
  // message we just sent is at the HEAD, so a tail-only scan never finds it
  // and reports a send that plainly worked as "send failed".
  const findMine = async () => {
    const list = await roles().catch(() => []);
    return list.findIndex((m) => m.role === 'user' && m.text.includes(question.slice(0, 18)));
  };
  let myIndex = -1;
  const submitBy = Date.now() + 30_000;
  let nudged = false;
  while (Date.now() < submitBy && myIndex < 0) {
    await sleep(700);
    myIndex = await findMine();
    if (myIndex >= 0 || nudged) continue;
    const consent = page.locator('[data-testid="ai-consent-allow"]').first();
    if (await consent.isVisible().catch(() => false)) { await consent.click({ force: true }).catch(() => {}); await sleep(600); }
    const send = page.locator('[data-testid="chat-send-btn"]').first();
    if (await send.isEnabled().catch(() => false)) { await send.click({ force: true }).catch(() => {}); nudged = true; }
  }
  if (myIndex < 0) return { ok: false, text: '', why: 'the question never appeared in the transcript (send failed, even after clearing consent and clicking send)' };

  // Then wait for an assistant bubble whose text is NEW, and let it settle.
  // Prefer the longest new one: a move announcement ("Pawn to e4.") can arrive
  // alongside the answer, and the answer is the substantive of the two.
  const deadline = Date.now() + 90_000;
  let text = '', stable = 0;
  while (Date.now() < deadline) {
    await sleep(1500);
    const list = await roles().catch(() => []);
    const fresh = list.filter((m) => m.role === 'assistant' && m.text && !seen.has(m.text));
    if (!fresh.length) continue;
    const now = fresh.reduce((a, b) => (b.text.length > a.text.length ? b : a)).text;
    if (now === text) { if (++stable >= 2) break; } else { stable = 0; text = now; }
  }
  return { ok: !!text, text, why: text ? '' : 'no new assistant reply within 90s' };
}

/** Contract B, applied to whatever surface is mounted. A control must exist,
 *  be clickable, and MOVE THE BOARD. */
async function checkNav(page, label, ids) {
  const present = {};
  for (const id of ids) present[id] = await page.locator(`[data-testid="${id}"]`).first().isVisible().catch(() => false);
  const missing = ids.filter((i) => !present[i]);
  if (missing.length === ids.length) {
    // SAY WHY, not just that. "Not rendered" sends the next session hunting
    // through render conditions; the surrounding state usually names the cause
    // outright (a blocking card, a finished game, a surface that never left
    // setup). The whole control block on Play is gated behind
    // `gameState.status === 'playing'`, so what ELSE is on screen is the clue.
    const ctx = await page.evaluate(() => {
      const seen = Array.from(document.querySelectorAll('[data-testid]'))
        .map((e) => e.getAttribute('data-testid'))
        .filter((t) => t && /blunder|gameover|game-over|postgame|review|overlay|modal|setup|paywall|consent|resign|takeback|move-nav/.test(t));
      return { markers: Array.from(new Set(seen)).slice(0, 12), body: (document.body.innerText || '').slice(0, 160).replace(/\s+/g, ' ') };
    }).catch(() => ({ markers: [], body: '' }));
    fail(`${label}: forward/back controls present`,
      `none of ${ids.join(', ')} rendered · on-screen markers: [${ctx.markers.join(', ') || 'none'}] · page says: "${ctx.body}"`);
    return;
  }
  if (missing.length) fail(`${label}: forward/back controls present`, `missing ${missing.join(', ')}`);
  else pass(`${label}: forward/back controls present`, ids.join(' + '));

  const back = ids.find((i) => /prev|back/.test(i) && present[i]);
  const fwd = ids.find((i) => /next|forward|skip/.test(i) && present[i]);
  if (!back || !fwd) { unproven(`${label}: forward/back actually move the board`, 'a direction is missing, nothing to click'); return; }

  const start = await readPlacement(page);
  await page.locator(`[data-testid="${back}"]`).first().click({ force: true }).catch(() => {});
  await sleep(1200);
  const afterBack = await readPlacement(page);
  if (samePlacement(start, afterBack)) { fail(`${label}: back moves the board`, `${back} clicked, placement unchanged — the button renders but does nothing`); }
  else pass(`${label}: back moves the board`, `${back} rewound the position`);

  await page.locator(`[data-testid="${fwd}"]`).first().click({ force: true }).catch(() => {});
  await sleep(1200);
  const afterFwd = await readPlacement(page);
  if (samePlacement(afterBack, afterFwd)) fail(`${label}: forward moves the board`, `${fwd} clicked, placement unchanged`);
  else pass(`${label}: forward moves the board`, `${fwd} advanced the position`);
}

/** Click our side's moves onto whatever board is mounted, letting the coach
 *  answer freely in between and re-syncing the mirror from the SCREEN after
 *  each reply. Returns how many of our moves actually landed. */
async function drivePlay(page) {
  const chess = new Chess();
  let landed = 0;
  for (const san of STUDENT_MOVES) {
    const mv = chess.moves({ verbose: true }).find((m) => m.san === san);
    if (!mv) continue;                      // the coach made it illegal — skip, never force (G3)
    const probe = new Chess(chess.fen()); probe.move(san);
    if (!(await clickMove(page, mv, probe.fen(), { timeout: 15_000 }))) continue;
    chess.move(san);
    landed += 1;

    // WAIT FOR THE REPLY, don't sleep past it. A fixed pause is a race the
    // coach usually wins on a cold prod page: the next click then lands while
    // it is still the opponent's turn, is rejected, and the drive stops after
    // one ply — which reads as "the board would not accept the move". This
    // helper polls the SCREEN until the position changes, up to the real
    // cold-start budget, and returns the reply it identified.
    const reply = await awaitCoachReply(page, chess, { firstMove: landed === 1 });
    if (reply) { chess.move(reply); continue; }

    // No reply: on a surface where the coach does not answer every move, it is
    // still our turn — resync from the board so the next move is legal from
    // whatever is actually shown, rather than from an assumed position.
    const shown = await readPlacement(page);
    if (!samePlacement(shown, placementOf(chess.fen()))) {
      const guess = chess.moves({ verbose: true }).find((m) => {
        const p = new Chess(chess.fen()); p.move(m.san);
        return samePlacement(placementOf(p.fen()), shown);
      });
      if (guess) chess.move(guess.san);
    }
  }
  return landed;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[coach-tab] base     = ${BASE_URL}`);
  console.log(`[coach-tab] listener = ${listener.url}`);
  console.log(`[coach-tab] outDir   = ${OUT_DIR}\n`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(([url, secret]) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, [listener.url, listener.secret]);

  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));

  // ─────────────────────────────────────────────────────────────────────────
  // LEARN — reached by PLAYING the opening, not by asking for it.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('── Learn (/coach/teach) ──');
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  await dismissModals(page);
  const boardUp = await page.locator('[data-square]').first().waitFor({ state: 'attached', timeout: 30_000 }).then(() => true).catch(() => false);
  if (!boardUp) { fail('Learn: board mounts', 'no [data-square] within 30s'); }
  else pass('Learn: board mounts');

  const playedTo = boardUp ? await drivePlay(page) : 0;
  if (boardUp) {
    if (playedTo >= 3) pass('Learn: reached the position by playing, not typing', `${playedTo} student move(s) clicked onto the board`);
    else fail('Learn: reached the position by playing, not typing', `only ${playedTo} move(s) landed`);
  }

  const spokenOf = (evs) => evs
    .filter((e) => (e.kind ?? '') === 'coach-narration-spoken')
    .map((e) => e.summary ?? e.text ?? (typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail ?? '')))
    .filter(Boolean);

  // ── Contract B on Learn. Free-play move navigation and the walkthrough's own
  //    transport are DIFFERENT controls with different lifetimes: the
  //    walkthrough pair only exists while a lesson is narrating, so lumping all
  //    four into one check reports "no nav anywhere" during free play and hides
  //    which of the two is actually missing. Check the free-play board on its
  //    own terms — takeback is not navigation, it destroys the move.
  const learnNavIds = ['teach-nav-prev', 'teach-nav-next', 'teach-nav-first', 'teach-nav-last'];
  const learnNavSeen = [];
  for (const id of learnNavIds) if (await page.locator(`[data-testid="${id}"]`).first().isVisible().catch(() => false)) learnNavSeen.push(id);
  const takebackSeen = await page.locator('[data-testid="teach-takeback"]').first().isVisible().catch(() => false);
  if (learnNavSeen.length) pass('Learn free-play: forward/back controls present', learnNavSeen.join(' + '));
  else fail('Learn free-play: forward/back controls present',
    `no move navigation on the Learn board — only ${takebackSeen ? 'Takeback (destroys the move, cannot step forward again)' : 'nothing'}. Play has first/prev/next/last.`);

  // ── Contract C, Learn half — the baseline the Play side is compared to.
  //    RUN THIS BEFORE SAMPLING TACTICS: `CoachTeachPage.buildLiveTactics`
  //    fires on the ASK (`tacticsForAsk`), not on every move, so sampling the
  //    stream straight after playing finds nothing and blames the app for a
  //    context it never had reason to build yet.
  const learnAnswers = {};
  for (const row of PARITY_QUESTIONS) {
    const r = await ask(page, row.q);
    const grounded = isGrounded(r);
    learnAnswers[row.id] = { grounded, text: r.text.slice(0, 400), why: r.why };
    console.log(`   learn · ${row.id}: ${grounded ? 'grounded' : (r.ok ? `STOCK/thin ("${r.text.slice(0, 70)}")` : `no reply (${r.why})`)}`);
  }

  // ── Contract A — a tactic on the board is detected AND spoken.
  const learnEvents = listener.getCapturedEvents();
  const learnSpoken = spokenOf(learnEvents);
  const tacticsCtx = learnEvents.filter((e) => /tactics ctx:/i.test(e.summary ?? ''));
  if (!learnEvents.length) fail('Learn: the listener heard the app at all', '0 events POSTed — the instrument is blind, nothing below is trustworthy');
  else pass('Learn: the listener heard the app at all', `${learnEvents.length} event(s), ${learnSpoken.length} spoken`);

  if (tacticsCtx.length) {
    const live = tacticsCtx.filter((e) => /immediate=[1-9]|hanging=[1-9]|threats=[1-9]|opps=[1-9]/.test(e.summary ?? ''));
    pass('Learn: tactics context is built', `${tacticsCtx.length} build(s), ${live.length} with non-zero content · e.g. ${(tacticsCtx[0].summary ?? '').slice(0, 90)}`);
    if (!live.length) fail('Learn: the tactics context has real content', `all ${tacticsCtx.length} build(s) came back empty on a board with a live fork`);
    else pass('Learn: the tactics context has real content', (live[0].summary ?? '').slice(0, 90));
  } else fail('Learn: tactics context is built', 'no "tactics ctx:" audit fired, even on a direct tactics question');

  const TACTIC_WORDS = /\bfork|pin\b|skewer|discovered|hanging|double attack|sacrifice|threat|attack(s|ing)? the|wins? (a|the) (pawn|piece|knight|bishop|rook|queen)/i;
  const tacticSpoken = learnSpoken.filter((t) => TACTIC_WORDS.test(t));
  const tacticAnswered = TACTIC_WORDS.test(learnAnswers.tactics?.text ?? '') || TACTIC_WORDS.test(learnAnswers.threats?.text ?? '');
  if (tacticSpoken.length) pass('Learn: the tactic is NARRATED, not just detected', `${tacticSpoken.length}/${learnSpoken.length} spoken line(s) name tactical content · e.g. "${tacticSpoken[0].slice(0, 100)}"`);
  else if (tacticAnswered) fail('Learn: the tactic is NARRATED, not just detected', `the WRITTEN answer names the tactic but ${learnSpoken.length} spoken line(s) do not — the student reads it, never hears it`);
  else if (!learnSpoken.length) unproven('Learn: the tactic is NARRATED, not just detected', 'the coach spoke 0 lines — nothing to test the wording against');
  else fail('Learn: the tactic is NARRATED, not just detected', `${learnSpoken.length} spoken line(s), none mention a tactic on a board with a live fork`);

  // ─────────────────────────────────────────────────────────────────────────
  // PLAY — same battery, same board shape.
  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n── Play (/coach/play) ──');
  const beforePlay = listener.getCapturedEvents().length;
  await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  await dismissModals(page);
  const playBoard = await page.locator('[data-square]').first().waitFor({ state: 'attached', timeout: 30_000 }).then(() => true).catch(() => false);
  if (playBoard) pass('Play: board mounts'); else fail('Play: board mounts', 'no [data-square] within 30s');

  const playPlies = playBoard ? await drivePlay(page) : 0;
  if (playBoard) {
    if (playPlies >= 3) pass('Play: a real game is under way', `${playPlies} student move(s)`);
    else fail('Play: a real game is under way', `only ${playPlies} move(s) landed`);
  }

  // ── Contract B on Play.
  await checkNav(page, 'Play', ['nav-prev', 'nav-next']);
  for (const id of ['nav-first', 'nav-last']) {
    const seen = await page.locator(`[data-testid="${id}"]`).first().isVisible().catch(() => false);
    if (seen) pass(`Play: ${id} present`); else fail(`Play: ${id} present`, 'not rendered');
  }
  // Leave the board at the live position — a review-mode board rejects moves,
  // and the parity questions below must be asked about the CURRENT position.
  await page.locator('[data-testid="nav-last"]').first().click({ force: true }).catch(() => {});
  await sleep(1000);

  // ── Contract A on Play. Play is SILENT BY CONTRACT mid-game (CLAUDE.md: "PLAY
  //    STAYS SILENT UNTIL THE STUDENT ASKS"), so unprompted tactical narration
  //    here is CORRECT to be absent. What must work is the ON-DEMAND answer,
  //    which the parity battery below tests. We only record what it did say.
  const playSpoken = spokenOf(listener.getCapturedEvents().slice(beforePlay));
  pass('Play: mid-game silence recorded (silent by contract)', `${playSpoken.length} unprompted spoken line(s) — 0 is the contract, non-zero is a finding to read`);

  // ── Contract C, Play half.
  const playAnswers = {};
  for (const row of PARITY_QUESTIONS) {
    const r = await ask(page, row.q);
    const grounded = isGrounded(r);
    playAnswers[row.id] = { grounded, text: r.text.slice(0, 400), why: r.why };
    console.log(`   play  · ${row.id}: ${grounded ? 'grounded' : (r.ok ? 'STOCK/thin' : `no reply (${r.why})`)}`);
  }

  // ── The parity verdict, per capability. Only a question LEARN answers can
  //    hold Play to account: if Learn could not answer it either, the row
  //    proves nothing about parity and is reported as such rather than
  //    counted as a Play failure.
  const gaps = [];
  let compared = 0;
  for (const row of PARITY_QUESTIONS) {
    const l = learnAnswers[row.id], p = playAnswers[row.id];
    if (!l?.grounded) { unproven(`parity · ${row.id}`, 'Learn did not answer it either — no baseline to compare against'); continue; }
    compared += 1;
    if (p?.grounded) pass(`parity · ${row.id}`, 'both surfaces answer');
    else { gaps.push(row.id); fail(`parity · ${row.id}`, `Learn answers, Play does not (${p?.why || 'stock/thin reply'})`); }
  }
  if (compared === 0) unproven('parity: Play answers everything Learn can', 'Learn answered nothing — the comparison never ran');
  else if (!gaps.length) pass('parity: Play answers everything Learn can', `${compared} capability(ies) compared, 0 gaps`);
  else fail('parity: Play answers everything Learn can', `${gaps.length}/${compared} gap(s): ${gaps.join(', ')}`);

  // ── Instrument health + page errors.
  const NOISE = /favicon|api\/tts|audit-stream|ResizeObserver/i;
  const realErrors = pageErrors.filter((e) => !NOISE.test(e));
  if (realErrors.length) fail('no page errors', realErrors.slice(0, 3).join(' | '));
  else pass('no page errors');

  const kinds = listener.countByKind();
  console.log(`\n[coach-tab] listener kinds: ${JSON.stringify(kinds)}`);

  const okCount = results.filter((r) => r.ok === true).length;
  const failCount = results.filter((r) => r.ok === false).length;
  const unprovenCount = results.filter((r) => r.ok === null).length;
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({
    baseUrl: BASE_URL, results, learnAnswers, playAnswers, kinds, pageErrors,
  }, null, 2));
  console.log(`\n[coach-tab] ${okCount} passed · ${failCount} failed · ${unprovenCount} not exercised · ${OUT_DIR}`);
  if (failCount) console.log(`[coach-tab] FAILED: ${results.filter((r) => r.ok === false).map((r) => r.name).join('; ')}`);

  await listener.stop();
  await browser.close();
  process.exit(failCount ? 1 : 0);
}

main().catch(async (e) => { console.error('[coach-tab] threw:', e); process.exit(1); });
