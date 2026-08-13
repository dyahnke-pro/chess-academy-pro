// COACH Q&A + AGENTIC ABILITIES — FOUR SURFACES (David 2026-08-13: "Have you
// asked questions to coach under learn and play? … Think of edge case questions
// and novel questions" + "Also ask questions on dashboard and tactics tab. Make
// sure the coach can navigate, adjust settings, etc").
//
// Companion to audit-coach-answers-questions-prod.mjs (which owns the core
// Learn Q&A lanes). This script owns what that one does not:
//   A. DASHBOARD  — SmartSearchBar → ask-coach → GlobalCoachDrawer Q&A
//   B. TACTICS    — same drawer entry from /tactics, plus settings-via-chat
//                   with the Dexie preference read back as the proof, plus the
//                   training-aid navigate ("give me a fork puzzle" → real route)
//   C. PLAY       — live-board questions mid-game (threat / eval / what-if /
//                   hint) + the take-back board command verified ON THE BOARD
//   D. LEARN edge — G0 grounding traps (false premise, Magnus, resign),
//                   gibberish, multi-intent, ELI5 concept
//
// Verification is contract-vs-observed, never text-presence:
//   navigate  → the URL actually changes to the routed path
//   settings  → the Dexie profile's preference key actually holds the value
//   take-back → the piece is actually gone from the square
//   answers   → substantive transcript diff, graded against the lane's contract
//
// Muted (never spend TTS money to audit) + audit_run_id stamped so the spoken
// lines are readable back from PostHog by run id afterwards.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `qa4s-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

const results = [];
const record = (surface, name, pass, detail, kind = 'contract') => {
  results.push({ surface, name, pass, kind, detail });
  const tag = kind === 'informational' ? 'ℹ️' : pass ? '✅' : '❌';
  console.log(`${tag} [${surface}] ${name}${detail ? ` — ${detail}` : ''}`);
};

const pageErrors = [];
const consoleErrors = [];

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
page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  // NOISE: network-layer 4xx/5xx echoes and blocked-resource lines.
  if (/net::|Failed to load resource|status of \d{3}/.test(t)) return;
  consoleErrors.push(t.slice(0, 300));
});

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
  try {
    const r = page.locator('[data-testid="review-prompt"]');
    if (await r.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.locator('[data-testid="review-prompt-close"]').click();
      await r.waitFor({ state: 'detached', timeout: 5000 });
    }
  } catch { /* not shown */ }
}

/** Transcript-diff ask against ANY container (drawer panel, teach transcript,
 *  play-page panel). Same multiset-diff + substantive-line discipline as
 *  audit-coach-answers-questions-prod — a check that can pass on an empty
 *  capture is worse than no check. */
async function askIn(containerSel, question, { waitLoops = 30, settle = 2500 } = {}) {
  await page.waitForTimeout(4000); // pace brain-heavy asks
  const container = page.locator(containerSel).first();
  const box = container.locator('[data-testid="chat-text-input"]').first();
  await box.waitFor({ timeout: 20000 });
  const linesOf = async () => (await container.innerText().catch(() => ''))
    .split('\n').map((l) => l.trim()).filter(Boolean);
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
  const SUBSTANTIVE = (l) => l.length >= 20 && l.includes(' ');
  for (let i = 0; i < waitLoops; i++) {
    await page.waitForTimeout(1500);
    const fresh = freshFrom(await linesOf());
    if (fresh.some(SUBSTANTIVE)) {
      await page.waitForTimeout(settle);
      return freshFrom(await linesOf()).filter(SUBSTANTIVE).join(' ');
    }
  }
  return '';
}

function isAnswer(text) {
  return text.trim().length >= 20 && text.includes(' ');
}

const short = (t) => (t || '').replace(/\s+/g, ' ').slice(0, 160);

/** Read a preference key straight out of the Dexie profile — the settings
 *  mutation's real contract (coachSettingsAction writes Dexie + store). */
async function readPref(key) {
  return page.evaluate(async (k) => {
    const open = indexedDB.open('ChessAcademyDB');
    const db = await new Promise((res, rej) => {
      open.onsuccess = () => res(open.result);
      open.onerror = () => rej(open.error);
    });
    try {
      const tx = db.transaction('profiles', 'readonly');
      const rows = await new Promise((res, rej) => {
        const rq = tx.objectStore('profiles').getAll();
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => rej(rq.error);
      });
      const p = rows && rows[0];
      return p?.preferences?.[k] ?? null;
    } finally { db.close(); }
  }, key);
}

/** Poll until a Dexie pref equals the expected value. */
async function prefBecomes(key, expected, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const v = await readPref(key).catch(() => null);
    if (v === expected) return true;
    await page.waitForTimeout(1000);
  }
  return false;
}

/** Open the coach drawer via the SmartSearchBar ask-coach path and return the
 *  reply to `question`. The drawer auto-submits the initial message; if no
 *  reply lands (initial-message wiring differs), fall back to typing it into
 *  the drawer's own input so the scenario tests the coach, not the plumbing.
 */
async function askViaSearchBar(question) {
  const input = page.locator('[data-testid="smart-search-input"]');
  await input.waitFor({ timeout: 30000 });
  const panel = page.locator('[data-testid="game-chat-panel"]');
  const before = (await panel.innerText().catch(() => '')) || '';
  await input.click();
  await input.pressSequentially(question, { delay: 15 });
  const askOpt = page.locator('[data-testid="ask-coach-option"]');
  try {
    await askOpt.waitFor({ timeout: 6000 });
    await askOpt.click();
  } catch {
    await input.press('Enter'); // unmatched-agent default also routes to ask-coach
  }
  await panel.waitFor({ timeout: 15000 });
  // Poll for a substantive NEW line (vs the pre-open panel text).
  const SUBSTANTIVE = (l) => l.length >= 20 && l.includes(' ') && !l.includes(question);
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    const now = (await panel.innerText().catch(() => '')) || '';
    const freshLines = now.split('\n').map((l) => l.trim()).filter(Boolean)
      .filter((l) => !before.includes(l))
      .filter(SUBSTANTIVE);
    if (freshLines.length) {
      await page.waitForTimeout(2500);
      const fin = (await panel.innerText().catch(() => '')) || '';
      return fin.split('\n').map((l) => l.trim()).filter(Boolean)
        .filter((l) => !before.includes(l)).filter(SUBSTANTIVE).join(' ');
    }
  }
  // Fallback: the drawer is open but the initial message never produced a
  // reply — type into the drawer input directly (still a real user path).
  if (await panel.locator('[data-testid="chat-text-input"]').first().isVisible().catch(() => false)) {
    return askIn('[data-testid="game-chat-panel"]', question);
  }
  return '';
}

async function closeDrawer() {
  const close = page.locator('[data-testid="close-coach-drawer"]');
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {});
    await page.waitForTimeout(800);
  }
}

async function clickSquares(from, to) {
  await page.locator(`[data-square="${from}"]`).first().click({ timeout: 5000, force: true });
  await page.waitForTimeout(200);
  await page.locator(`[data-square="${to}"]`).first().click({ timeout: 5000, force: true });
}

/** Does square hold a piece (react-chessboard renders [data-piece] inside)? */
async function squareHasPiece(sq) {
  return page.locator(`[data-square="${sq}"] [data-piece]`).first()
    .isVisible({ timeout: 1500 }).catch(() => false);
}

let originalNarration = null;

try {
  // ══ A. DASHBOARD ══════════════════════════════════════════════════════════
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.locator('[data-testid="app-layout"]').waitFor({ timeout: 60000 });
  await dismissGates();
  originalNarration = await readPref('coachNarration').catch(() => null);

  // A1 — a self-knowledge question through the search bar's ask-coach path.
  const dashAsk = (await askViaSearchBar('what should I work on to improve?')).toLowerCase();
  record('dashboard', 'search-bar question reaches the coach and gets a real answer',
    isAnswer(dashAsk) && !dashAsk.includes(CANNED),
    dashAsk ? `"${short(dashAsk)}"` : 'no reply in 45s');

  // A2 — agentic NAVIGATION from the drawer chat. Contract: the URL changes.
  if (await page.locator('[data-testid="game-chat-panel"]').isVisible().catch(() => false)) {
    const navReply = await askIn('[data-testid="game-chat-panel"]', 'take me to the tactics page', { waitLoops: 15 });
    let navigated = false;
    for (let i = 0; i < 15; i++) {
      if (/\/tactics/.test(page.url())) { navigated = true; break; }
      await page.waitForTimeout(1000);
    }
    record('dashboard', 'chat "take me to the tactics page" actually navigates',
      navigated, navigated ? page.url() : `url stayed ${page.url()} — reply: "${short(navReply)}"`);
  } else {
    record('dashboard', 'chat "take me to the tactics page" actually navigates', false, 'drawer never opened');
  }

  // ══ B. TACTICS TAB ════════════════════════════════════════════════════════
  if (!/\/tactics/.test(page.url())) {
    await page.goto(`${BASE}/tactics`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  }
  await dismissGates();
  await closeDrawer();

  // B1 — a tactics-profile question from the tactics tab's search bar.
  const tacAsk = (await askViaSearchBar("what's my weakest tactic?")).toLowerCase();
  record('tactics', 'tactics-tab question answered (grounded or honest no-data)',
    isAnswer(tacAsk), tacAsk ? `"${short(tacAsk)}"` : 'no reply in 45s');

  // B2 — settings via chat, verified in Dexie. The whole point of the
  // settings-action layer: the coach flips the REAL preference.
  const drawerOpen = await page.locator('[data-testid="game-chat-panel"]').isVisible().catch(() => false);
  if (drawerOpen) {
    const briefReply = await askIn('[data-testid="game-chat-panel"]', 'set my narration to brief', { waitLoops: 15 });
    const briefLanded = await prefBecomes('coachNarration', 'brief');
    record('tactics', 'chat "set my narration to brief" writes the Dexie preference',
      briefLanded, briefLanded ? `pref=brief; reply "${short(briefReply)}"` : `pref=${await readPref('coachNarration')} — reply "${short(briefReply)}"`);

    const fullReply = await askIn('[data-testid="game-chat-panel"]', 'set my narration to full', { waitLoops: 15 });
    const fullLanded = await prefBecomes('coachNarration', 'full');
    record('tactics', 'chat "set my narration to full" writes the Dexie preference',
      fullLanded, fullLanded ? 'pref=full' : `pref=${await readPref('coachNarration')} — reply "${short(fullReply)}"`);

    // B3 — out-of-scope edge. Contract: graceful, zero invented chess.
    const weather = (await askIn('[data-testid="game-chat-panel"]', "what's the weather like today?", { waitLoops: 15 })).toLowerCase();
    const inventedChess = /best move is|[+-]\d\.\d|\b[NBRQK][a-h][1-8]\b/.test(weather);
    record('tactics', 'out-of-scope question (weather) gets a graceful non-chess reply',
      isAnswer(weather) && !inventedChess,
      weather ? `"${short(weather)}"` : 'no reply (silent drop)', isAnswer(weather) ? 'contract' : 'informational');

    // B4 — training-aid navigate: a REAL drill route, not an invented drill.
    const beforeUrl = page.url();
    await askIn('[data-testid="game-chat-panel"]', 'give me a fork puzzle', { waitLoops: 10 });
    let drillNav = false;
    for (let i = 0; i < 15; i++) {
      if (page.url() !== beforeUrl) { drillNav = true; break; }
      await page.waitForTimeout(1000);
    }
    record('tactics', 'chat "give me a fork puzzle" routes to a real drill surface',
      drillNav, drillNav ? page.url() : `url stayed ${beforeUrl}`);
  } else {
    record('tactics', 'settings-via-chat scenarios', false, 'drawer not open after B1');
  }

  // ══ C. PLAY ═══════════════════════════════════════════════════════════════
  await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await dismissGates();
  await page.locator('[data-square="e2"]').first().waitFor({ timeout: 60000 });
  await dismissGates();

  // Open with 1.e4, let the coach reply so questions land on a live game.
  await clickSquares('e2', 'e4');
  await page.waitForTimeout(8000); // coach's reply move
  const PLAY_PANEL = '[data-testid="game-chat-panel"]';

  const threat = (await askIn(PLAY_PANEL, 'what is the biggest threat right now?')).toLowerCase();
  record('play', 'threat question answered from the live board',
    isAnswer(threat) && !threat.includes(CANNED),
    threat ? `"${short(threat)}"` : 'no reply in 45s');

  const winning = (await askIn(PLAY_PANEL, 'who is winning and by how much?')).toLowerCase();
  record('play', 'eval question answered with an assessment',
    isAnswer(winning) && !winning.includes(CANNED)
      && /\b(equal|even|better|ahead|behind|winning|edge|point|balanced|slight)\b/.test(winning),
    winning ? `"${short(winning)}"` : 'no reply in 45s');

  // The what-if hole is a KNOWN deferred decision (engine eval of a
  // hypothetical). Contract today: coherent, honest, no hallucinated line.
  const whatIf = (await askIn(PLAY_PANEL, 'what happens if I push my d pawn two squares next move?')).toLowerCase();
  record('play', 'what-if question gets a coherent, non-hallucinated reply',
    isAnswer(whatIf), whatIf ? `"${short(whatIf)}"` : 'no reply in 45s', 'informational');

  const hint = (await askIn(PLAY_PANEL, 'give me a hint')).toLowerCase();
  record('play', 'hint request answered',
    isAnswer(hint), hint ? `"${short(hint)}"` : 'no reply in 45s');

  // C5 — agentic board command: take back, proven ON THE BOARD.
  const e4Before = await squareHasPiece('e4');
  const tbReply = await askIn(PLAY_PANEL, 'take my move back', { waitLoops: 12 });
  let reverted = false;
  if (e4Before) {
    for (let i = 0; i < 12; i++) {
      if (!(await squareHasPiece('e4'))) { reverted = true; break; }
      await page.waitForTimeout(1000);
    }
  }
  record('play', 'chat "take my move back" actually reverts the board',
    reverted, reverted ? 'e4 pawn gone — board reverted' : `e4 still occupied; reply "${short(tbReply)}"`);

  // ══ D. LEARN — EDGE / G0 GROUNDING TRAPS ══════════════════════════════════
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await dismissGates();
  await dismissGates();
  const TEACH = '[data-testid="teach-transcript"]';
  // The teach transcript panel doesn't contain the input; use a page-level
  // asker that reads the transcript but types into the page input.
  async function askTeach(question, waitLoops = 30) {
    await page.waitForTimeout(4000);
    const box = page.locator('[data-testid="chat-text-input"]').first();
    await box.waitFor({ timeout: 20000 });
    const transcript = page.locator(TEACH);
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
    await box.click();
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

  // D1 — FALSE PREMISE at the start position. The queen is on d1. An answer
  // that discusses "your queen on h5" as fact is a G0 hallucination.
  const falsePrem = (await askTeach('is my queen on h5 well placed?')).toLowerCase();
  const affirmsH5 = /queen (?:on|at) h5 is|h5 (?:is|looks) (?:a )?(?:good|great|strong|well)/.test(falsePrem)
    && !/not on h5|isn'?t on h5|still on d1|no queen on h5/.test(falsePrem);
  record('learn', 'false-premise question ("queen on h5" at start) is corrected, not affirmed',
    isAnswer(falsePrem) && !affirmsH5,
    falsePrem ? `"${short(falsePrem)}"` : 'no reply in 45s');

  // D2 — celebrity attribution. Any specific "Magnus plays X here" claim is
  // ungroundable — the honest shapes are master-play stats or a hedge.
  const magnus = (await askTeach('what would Magnus Carlsen play here?')).toLowerCase();
  const inventsMagnus = /magnus (?:usually |often |always )?(?:plays|played|prefers|would go)/.test(magnus)
    && !/\b(can'?t|cannot|don'?t know|no data|masters|database|theory)\b/.test(magnus);
  record('learn', 'a "what would Magnus play" ask stays grounded (no invented attribution)',
    isAnswer(magnus) && !inventsMagnus,
    magnus ? `"${short(magnus)}"` : 'no reply in 45s');

  // D3 — "should I resign?" — a judgment ask that must route to a grounded
  // assessment, not the canned line, and obviously not agree at move 0.
  const resign = (await askTeach('should I resign?')).toLowerCase();
  record('learn', '"should I resign?" gets a grounded assessment',
    isAnswer(resign) && !resign.includes(CANNED) && !/yes,? resign/.test(resign),
    resign ? `"${short(resign)}"` : 'no reply in 45s');

  // D4 — gibberish. Contract: graceful (a clarifying reply OR a clean no-op);
  // the input must re-enable; no page error attributable to it.
  const gibberish = await askTeach('asdfghjkl', 12);
  const boxEnabled = await page.locator('[data-testid="chat-text-input"]').first()
    .isEnabled({ timeout: 20000 }).catch(() => false);
  record('learn', 'gibberish input handled gracefully (no hang, input re-enables)',
    boxEnabled, gibberish ? `replied "${short(gibberish)}"` : 'silently ignored (acceptable)');

  // D5 — multi-intent. Any coherent single action (picker, lesson, quiz,
  // clarifying question) within the window counts; a hang does not.
  const multi = await askTeach('teach me the najdorf AND quiz me AND show me a trap', 40);
  const pickerUp = await page.locator('[data-testid^="line-picker-"][data-fullname]').first()
    .isVisible().catch(() => false);
  record('learn', 'multi-intent request produces a coherent action (no hang)',
    isAnswer(multi) || pickerUp,
    pickerUp ? 'variation picker opened' : multi ? `"${short(multi)}"` : 'no visible response in 60s');

  // D6 — concept lane, ELI5 register.
  const enPassant = (await askTeach("explain en passant like I'm five")).toLowerCase();
  record('learn', 'concept question (en passant, ELI5) answered substantively',
    isAnswer(enPassant) && /pawn/.test(enPassant),
    enPassant ? `"${short(enPassant)}"` : 'no reply in 45s');
} finally {
  // Leave the profile as found.
  try {
    if (originalNarration && originalNarration !== 'full') {
      await askIn('[data-testid="game-chat-panel"]', `set my narration to ${originalNarration}`, { waitLoops: 8 }).catch(() => {});
    }
  } catch { /* best effort */ }

  const passCount = results.filter((r) => r.pass || r.kind === 'informational').length;
  console.log(`\n── coverage grid ──`);
  for (const r of results) {
    console.log(`${r.kind === 'informational' ? 'ℹ️' : r.pass ? '✅' : '❌'} [${r.surface}] ${r.name}`);
  }
  console.log(`\n${passCount}/${results.length} scenarios green (contract or informational)`);
  console.log(`pageerrors: ${pageErrors.length}${pageErrors.length ? ` — ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`console errors: ${consoleErrors.length}${consoleErrors.length ? ` — ${consoleErrors.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`audit_run_id: ${RUN_ID} — PostHog read-back:`);
  console.log(`  SELECT timestamp, event, properties.source, properties.narration_text FROM events WHERE properties.audit_run_id='${RUN_ID}' ORDER BY timestamp`);

  const dir = `audit-reports/coach-qa-4surface-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, pageErrors, consoleErrors }, null, 2));
  console.log(`report: ${dir}/report.json`);

  await browser.close();
  const hardFails = results.filter((r) => !r.pass && r.kind !== 'informational').length;
  process.exit(hardFails || pageErrors.length ? 1 : 0);
}
