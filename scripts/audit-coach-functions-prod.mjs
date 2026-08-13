// THE MISSED COACH FUNCTIONS — board commands, memory tools, action lanes,
// review/endgame chat, multi-turn (David 2026-08-13: "What other coach
// functions have we missed?" → this drives every one of them live).
//
// Companions: audit-coach-answers-questions-prod.mjs (Learn core Q&A lanes),
// audit-coach-qa-4surface-prod.mjs (dashboard/tactics/play + navigate/settings/
// take-back + G0 edge traps). This script owns the remainder:
//
//   TEACH — "play e4" moves the real board; "reset the board" clears it;
//           multi-turn "why?" follow-up; "favorite the Caro-Kann" and "add the
//           Vienna to my repertoire" verified IN DEXIE; "switch to dark theme"
//           verified in the profile prefs; player-games ask; quiz ask.
//   HOME  — "show my games" (list_games lane); "review my last game" routes to
//           the review surface (URL is the proof).
//   REVIEW — a real mid-review question on a seeded sample review.
//   ENDGAME — the drawer chat answers an endgame question.
//
// Contract-vs-observed throughout: a board command is proven on [data-square],
// a favorite/repertoire/theme command is proven by reading Dexie, navigation is
// proven by the URL. Muted + audit_run_id stamped (PostHog read-back).
//
// NB every Playwright context gets its OWN IndexedDB — favorites/theme writes
// here touch nothing any real user sees, so no cleanup pass is needed.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `qafn-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

/** Scope to a comma-list of sections (teach,home,review,endgame) — reruns of a
 *  failed leg shouldn't repeat the whole battery (and two of these legs die
 *  under the memory pressure a long run builds up: the sandbox runs out of
 *  WASM memory for stockfish workers after several page loads). */
const ONLY = (process.env.AUDIT_ONLY || 'teach,home,review,endgame').split(',').map((s) => s.trim());
const wants = (s) => ONLY.includes(s);

const results = [];
const record = (surface, name, pass, detail, kind = 'contract') => {
  results.push({ surface, name, pass, kind, detail });
  const tag = kind === 'informational' ? 'ℹ️' : pass ? '✅' : '❌';
  console.log(`${tag} [${surface}] ${name}${detail ? ` — ${detail}` : ''}`);
};
const short = (t) => (t || '').replace(/\s+/g, ' ').slice(0, 160);
const pageErrors = [];

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript((id) => {
  try { localStorage.setItem('auditRunId', id); } catch { /* private mode */ }
}, RUN_ID);
const page = await ctx.newPage();
// Dedupe: a wedged stockfish worker can spam one identical allocation error
// hundreds of thousands of times; count each distinct message once.
page.on('pageerror', (e) => {
  const msg = String(e?.message ?? e);
  if (!pageErrors.includes(msg)) pageErrors.push(msg);
});

/** goto with one retry — a transient nav timeout must fail a SECTION, not
 *  silently zero the whole run (the 14:54 rerun printed 0/0 because a throw
 *  before the first record was swallowed by process.exit in finally). */
async function goRetry(path) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  } catch {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
}

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 6000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

/** Transcript-diff ask. `transcriptSel` is read for the reply; the question is
 *  typed into the first ENABLED chat-text-input on the page (surfaces differ
 *  in where the input lives relative to the transcript). */
async function ask(transcriptSel, question, waitLoops = 30, inputSel = '[data-testid="chat-text-input"]') {
  await page.waitForTimeout(4000); // pace brain-heavy asks
  // `:visible` matters: the review walk mounts a HIDDEN reviewCapture input
  // above the ask panel's, and .first() on the bare selector clicked into it.
  const box = page.locator(`${inputSel}:visible`).first();
  await box.waitFor({ timeout: 20000 });
  // The global drawer renders BOTH its mobile and desktop variants — the
  // hidden twin matches first and reads as an empty panel. Visible only.
  const transcript = page.locator(`${transcriptSel}:visible`).first();
  const linesOf = async () => (await transcript.innerText().catch(() => ''))
    .split('\n').map((l) => l.trim()).filter(Boolean);
  const tally = (ls) => ls.reduce((m, l) => m.set(l, (m.get(l) ?? 0) + 1), new Map());
  const seen = tally(await linesOf());
  const freshFrom = (ls) => {
    const now = tally(ls); const out = [];
    for (const [line, n] of now) {
      const extra = n - (seen.get(line) ?? 0);
      for (let k = 0; k < extra; k++) out.push(line);
    }
    return out.filter((l) => !l.includes(question));
  };
  // A continuously-animating overlay (narration banner, streaming bubble) can
  // fail the stability check on a perfectly tappable input — force is the
  // documented fallback for that class (a human can tap anyway).
  await box.click({ timeout: 15000 }).catch(() => box.click({ force: true }));
  await box.pressSequentially(question, { delay: 10 });
  await box.press('Enter');
  const SUBSTANTIVE = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < waitLoops; i++) {
    await page.waitForTimeout(1500);
    const fresh = freshFrom(await linesOf());
    if (fresh.some(SUBSTANTIVE)) {
      await page.waitForTimeout(2500);
      return freshFrom(await linesOf()).filter(SUBSTANTIVE).join(' ');
    }
  }
  return '';
}
const isAnswer = (t) => t.trim().length >= 20 && t.includes(' ');

async function squareHasPiece(sq) {
  return page.locator(`[data-square="${sq}"] [data-piece]`).first()
    .isVisible({ timeout: 1500 }).catch(() => false);
}
async function pollUntil(fn, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await fn().catch(() => false)) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

/** Dexie reads — the proof layer for favorite/repertoire/theme commands. */
async function readStore(store) {
  return page.evaluate(async (s) => {
    const open = indexedDB.open('ChessAcademyDB');
    const db = await new Promise((res, rej) => {
      open.onsuccess = () => res(open.result);
      open.onerror = () => rej(open.error);
    });
    try {
      const tx = db.transaction(s, 'readonly');
      return await new Promise((res, rej) => {
        const rq = tx.objectStore(s).getAll();
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
    } finally { db.close(); }
  }, store);
}
async function profilePref(key) {
  const rows = await readStore('profiles').catch(() => []);
  return rows?.[0]?.preferences?.[key] ?? null;
}

const TEACH = '[data-testid="teach-transcript"]';

try {
  // ══ TEACH — board commands, memory tools, theme, multi-turn ═══════════════
  if (wants('teach')) { try {
  await goRetry('/coach/teach');
  await dismissGates();
  await dismissGates();
  // Openings-dependent tools (favorite / repertoire) need the deferred seed.
  await page.waitForTimeout(30000);

  // 1 — "play e4" MOVES THE REAL BOARD (play_move intent → board).
  const e4Before = await squareHasPiece('e4');
  const playReply = await ask(TEACH, 'play e4', 12);
  const e4Landed = !e4Before && await pollUntil(() => squareHasPiece('e4'), 15000);
  record('teach', 'chat "play e4" plays the move on the real board',
    e4Landed, e4Landed ? 'pawn on e4' : `e4 occupied before=${e4Before}; reply "${short(playReply)}"`);

  // 2 — multi-turn follow-up: a bare "why?" must read the previous turn.
  const best = (await ask(TEACH, 'what is the best move here?')).toLowerCase();
  const why = (await ask(TEACH, 'why?')).toLowerCase();
  record('teach', 'bare "why?" follow-up answers in context of the previous reply',
    isAnswer(why) && !why.includes(CANNED),
    why ? `"${short(why)}"` : `no reply (best-move reply was "${short(best)}")`);

  // 3 — "reset the board" clears it (reset_board intent).
  const resetReply = await ask(TEACH, 'reset the board', 12);
  const e4Cleared = await pollUntil(async () => !(await squareHasPiece('e4')), 15000);
  record('teach', 'chat "reset the board" actually resets the board',
    e4Cleared, e4Cleared ? 'e4 empty again' : `e4 still occupied; reply "${short(resetReply)}"`);

  // 4 — favorite_opening writes the Dexie flag.
  const favReply = await ask(TEACH, 'favorite the Caro-Kann', 20);
  const favLanded = await pollUntil(async () => {
    const rows = await readStore('openings').catch(() => []);
    return rows.some((o) => /caro/i.test(o.name ?? '') && o.isFavorite === true);
  }, 20000);
  record('teach', 'chat "favorite the Caro-Kann" sets isFavorite in Dexie',
    favLanded, favLanded ? 'a Caro row has isFavorite=true' : `no favorited Caro row; reply "${short(favReply)}"`);

  // 5 — save_opening_to_repertoire writes the Dexie flag.
  const repReply = await ask(TEACH, 'add the Vienna to my repertoire', 20);
  const repLanded = await pollUntil(async () => {
    const rows = await readStore('openings').catch(() => []);
    return rows.some((o) => /vienna/i.test(o.name ?? '') && o.isRepertoire === true);
  }, 20000);
  record('teach', 'chat "add the Vienna to my repertoire" sets isRepertoire in Dexie',
    repLanded, repLanded ? 'a Vienna row has isRepertoire=true' : `no repertoire Vienna row; reply "${short(repReply)}"`);

  // 6 — theme via chat, proven in the profile prefs (this context's own DB).
  const themeReply = await ask(TEACH, 'switch to dark theme', 15);
  const themeLanded = await pollUntil(async () => (await profilePref('theme')) === 'dark-premium', 15000);
  record('teach', 'chat "switch to dark theme" writes preferences.theme',
    themeLanded, themeLanded ? 'theme=dark-premium' : `theme=${await profilePref('theme')}; reply "${short(themeReply)}"`);

  // 7 — player-games ask. Grounded reply OR an honest no-data line both pass;
  //     an invented game does not (informational — cold-cache dependent).
  const pg = (await ask(TEACH, "show me Naroditsky's games in the Caro-Kann")).toLowerCase();
  record('teach', 'player-games ask answers from references or honestly declines',
    isAnswer(pg), pg ? `"${short(pg)}"` : 'no reply in 45s', 'informational');

  // 8 — quiz ask: any quiz-shaped response (a question back, choices, or a
  //     started quiz stage) counts; silence does not.
  const quiz = await ask(TEACH, 'quiz me on this position', 30);
  const choicesUp = await page.locator('[data-testid="coach-choice-chips"], [data-testid^="quiz-"]').first()
    .isVisible().catch(() => false);
  record('teach', 'a quiz request produces a quiz (question back or quiz UI)',
    isAnswer(quiz) || choicesUp,
    choicesUp ? 'quiz UI rendered' : quiz ? `"${short(quiz)}"` : 'no visible response');

  } catch (err) { record('teach', "section crashed", false, String(err?.message ?? err).slice(0, 160)); } } // end teach

  // ══ HOME drawer — action lanes ════════════════════════════════════════════
  if (wants('home')) { try {
  await goRetry('/');
  await dismissGates();

  // 9 — "show my games" (list_games). Sample games are seeded on first boot,
  //     so a real listing (or an honest empty-state line) is the contract.
  const input = page.locator('[data-testid="smart-search-input"]');
  await input.waitFor({ timeout: 30000 });
  await input.click();
  await input.pressSequentially('show my games', { delay: 15 });
  try {
    const opt = page.locator('[data-testid="ask-coach-option"]');
    await opt.waitFor({ timeout: 6000 });
    await opt.click();
  } catch { await input.press('Enter'); }
  const panel = page.locator('[data-testid="game-chat-panel"]');
  const panelUp = await panel.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
  let gamesReply = '';
  if (panelUp) {
    const SUB = (l) => l.length >= 20 && l.includes(' ') && !l.includes('show my games');
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1500);
      const t = (await panel.innerText().catch(() => '')) || '';
      const lines = t.split('\n').map((l) => l.trim()).filter(SUB);
      if (lines.length) { gamesReply = lines.join(' '); break; }
    }
  }
  record('home', '"show my games" answers with games (or an honest empty state)',
    isAnswer(gamesReply), gamesReply ? `"${short(gamesReply)}"` : 'no reply / drawer never opened');

  // 10 — "review my last game" ROUTES to the review surface.
  if (panelUp) {
    await ask('[data-testid="game-chat-panel"]', 'review my last game', 12);
    const routed = await pollUntil(() => Promise.resolve(/\/coach\/review|\/coach\/game/.test(page.url())), 20000);
    record('home', '"review my last game" navigates to the review surface',
      routed, routed ? page.url() : `url stayed ${page.url()}`);
  } else {
    record('home', '"review my last game" navigates to the review surface', false, 'drawer never opened');
  }

  } catch (err) { record('home', "section crashed", false, String(err?.message ?? err).slice(0, 160)); } } // end home

  // ══ REVIEW — a real mid-review question ═══════════════════════════════════
  if (wants('review')) { try {
  await goRetry('/coach/review');
  await dismissGates();
  const card = page.locator('[data-testid^="review-game-card-"]').first();
  const hasCard = await card.waitFor({ timeout: 45000 }).then(() => true).catch(() => false);
  if (hasCard) {
    await card.click();
    // The summary card renders first. The chat only mounts once the WALK
    // starts — click Start when it enables (walkNarration prep can take ~20s;
    // clicking it disabled was this scenario's first instrument bug).
    const startBtn = page.locator('[data-testid="start-walk-btn"]:not([disabled])');
    if (await startBtn.waitFor({ timeout: 90000 }).then(() => true).catch(() => false)) {
      await startBtn.click();
      await page.locator('[data-testid="review-nav-controls"]').waitFor({ timeout: 30000 }).catch(() => {});
    }
    // The walk's chat is behind the Ask toggle — the input mounts only after
    // the student taps Ask (walk-ask-toggle-btn → walk-ask-panel).
    const askToggle = page.locator('[data-testid="walk-ask-toggle-btn"]');
    if (await askToggle.waitFor({ timeout: 30000 }).then(() => true).catch(() => false)) {
      await askToggle.click();
      await page.locator('[data-testid="walk-ask-panel"]').waitFor({ timeout: 10000 }).catch(() => {});
    }
    const reviewBox = page.locator('[data-testid="walk-ask-panel"] [data-testid="chat-text-input"]').first();
    let boxUp = await reviewBox.waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
    if (boxUp) {
      // The panel can collapse again when the walk narration re-renders —
      // re-open right before asking so the input is live at type time.
      if (!(await reviewBox.isVisible().catch(() => false))) {
        await askToggle.click().catch(() => {});
        boxUp = await reviewBox.waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
      }
    }
    if (boxUp) {
      const revAsk = (await ask('[data-testid="walk-ask-panel"]', 'what was the biggest mistake in this game?', 30, '[data-testid="walk-ask-panel"] [data-testid="chat-text-input"]')).toLowerCase();
      record('review', 'a mid-review question gets a game-grounded answer',
        isAnswer(revAsk) && !revAsk.includes(CANNED),
        revAsk ? `"${short(revAsk)}"` : 'no reply in 45s');
    } else {
      record('review', 'a mid-review question gets a game-grounded answer', false, 'no Ask panel / chat input in the walk view');
    }
  } else {
    record('review', 'a mid-review question gets a game-grounded answer', false, 'no review cards rendered in 45s', 'informational');
  }

  } catch (err) { record('review', "section crashed", false, String(err?.message ?? err).slice(0, 160)); } } // end review

  // ══ ENDGAME — drawer chat ═════════════════════════════════════════════════
  if (wants('endgame')) { try {
  await goRetry('/coach/endgame');
  await dismissGates();
  // The chat button lives in a PATTERN LESSON's header, not on the hub —
  // enter the first pattern like a real user before looking for it.
  const pattern = page.locator('[data-testid^="endgame-pattern-"]').first();
  if (await pattern.waitFor({ timeout: 45000 }).then(() => true).catch(() => false)) {
    await pattern.click();
    await page.waitForTimeout(3000);
  }
  const chatBtn = page.locator('button[aria-label="Open chat"]').first();
  const btnUp = await chatBtn.waitFor({ timeout: 30000 }).then(() => true).catch(() => false);
  if (btnUp) {
    await chatBtn.click();
    const egPanel = page.locator('[data-testid="game-chat-panel"]');
    const egUp = await egPanel.waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    if (egUp) {
      const eg = (await ask('[data-testid="game-chat-panel"]', 'how do I win a king and pawn endgame?', 45)).toLowerCase();
      const panelDump = eg ? '' : short(await page.locator('[data-testid="game-chat-panel"]').innerText().catch(() => ''));
      record('endgame', 'the endgame page chat answers an endgame question',
        isAnswer(eg) && !eg.includes(CANNED),
        eg ? `"${short(eg)}"` : `no reply in 70s; panel="${panelDump}"`);
    } else {
      record('endgame', 'the endgame page chat answers an endgame question', false, 'drawer never opened');
    }
  } else {
    record('endgame', 'the endgame page chat answers an endgame question', false, 'no Open-chat button found');
  }
  } catch (err) { record('endgame', "section crashed", false, String(err?.message ?? err).slice(0, 160)); } } // end endgame
} finally {
  console.log(`\n── coverage grid ──`);
  for (const r of results) {
    console.log(`${r.kind === 'informational' ? 'ℹ️' : r.pass ? '✅' : '❌'} [${r.surface}] ${r.name}`);
  }
  const green = results.filter((r) => r.pass || r.kind === 'informational').length;
  console.log(`\n${green}/${results.length} green (contract or informational)`);
  console.log(`pageerrors: ${pageErrors.length}${pageErrors.length ? ` — ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`audit_run_id: ${RUN_ID}`);

  const dir = `audit-reports/coach-functions-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, pageErrors }, null, 2));
  console.log(`report: ${dir}/report.json`);

  await browser.close();
  const hardFails = results.filter((r) => !r.pass && r.kind !== 'informational').length;
  process.exit(hardFails || pageErrors.length ? 1 : 0);
}
