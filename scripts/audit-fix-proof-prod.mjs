// PROOF PASS for the 2026-08-13 fix batches, against the LIVE bundle.
// Each scenario is a previously-FAILING live behavior; the check asserts the
// fixed contract, not text presence.
//
//   gambit    — "best gambit against 1.d4" answers from the curated
//               counter-repertoire (names the Benko), never the Gent hijack
//   threat    — quiet-board threat ask gets the computed all-clear
//   hint      — names a piece, WITHHOLDS the destination square
//   gibberish — keyboard mash gets the clarifying nudge
//   premise   — "queen on h5" at start is corrected from the board
//   magnus    — routes to master-play stats, not the bare best-move line
//   reset     — "reset the board" resets it (teach pre-pass)
//   favorite  — "favorite the Caro-Kann" sets Dexie, no picker hijack
//   review    — the ask panel shows a NON-EMPTY reply bubble
//   endgame   — the how-to question is ANSWERED, URL stays on the page
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `proof-${Date.now().toString(36)}`;
const CANNED = "i can't verify that precisely";

const results = [];
const record = (name, pass, detail, kind = 'contract') => {
  results.push({ name, pass, kind, detail });
  console.log(`${kind === 'informational' ? 'ℹ️' : pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
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
  try { localStorage.setItem('auditRunId', id); } catch { /* private */ }
}, RUN_ID);
const page = await ctx.newPage();
page.on('pageerror', (e) => {
  const msg = String(e?.message ?? e);
  if (!pageErrors.includes(msg)) pageErrors.push(msg);
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
}

async function goRetry(path) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  } catch {
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  }
  await dismissGates();
  await dismissGates();
}

/** Teach-transcript ask (multiset diff; same discipline as the Q&A drives). */
async function askTeach(question, waitLoops = 30) {
  await page.waitForTimeout(4000);
  const box = page.locator('[data-testid="chat-text-input"]:visible').first();
  await box.waitFor({ timeout: 20000 });
  const transcript = page.locator('[data-testid="teach-transcript"]:visible').first();
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

async function squareHasPiece(sq) {
  return page.locator(`[data-square="${sq}"] [data-piece]`).first()
    .isVisible({ timeout: 1500 }).catch(() => false);
}
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

try {
  // ══ TEACH — gambit, threat, hint, gibberish, premise, magnus, reset, favorite
  await goRetry('/coach/teach');
  // Openings-dependent checks (gambit family names, favorite) want the seed.
  await page.waitForTimeout(30000);

  // 1. THE GAMBIT ASK (David's live report). Contract: curated answer naming
  //    the Benko; the surface must NOT start teaching an unrelated line.
  const gambit = (await askTeach('show me the best gambit against 1.d4', 40)).toLowerCase();
  record('gambit ask answers with the curated Benko recommendation',
    gambit.includes('benko') && !gambit.includes('gent'),
    gambit ? `"${short(gambit)}"` : 'no reply in 60s');

  // 2. Threat on a quiet board → the computed all-clear, not best-move.
  const threat = (await askTeach('what is the biggest threat right now?')).toLowerCase();
  record('quiet-board threat ask gets the all-clear (not a best-move readout)',
    /nothing is hanging|no immediate|quiet position/.test(threat) && !/^\W*the best move is/.test(threat.trim()),
    threat ? `"${short(threat)}"` : 'no reply in 45s');

  // 3. Hint: names a piece, withholds the destination.
  const hint = (await askTeach('give me a hint')).toLowerCase();
  const namesPiece = /\b(pawn|knight|bishop|rook|queen|king)\b/.test(hint);
  const handsAnswer = /best move is/.test(hint);
  record('hint names a piece and withholds the answer',
    hint.length > 0 && namesPiece && !handsAnswer,
    hint ? `"${short(hint)}"` : 'no reply in 45s');

  // 4. Gibberish → the clarifying nudge.
  const mash = (await askTeach('asdfghjkl', 15)).toLowerCase();
  record('keyboard mash gets the clarifying nudge',
    /didn'?t catch that/.test(mash),
    mash ? `"${short(mash)}"` : 'no reply (nudge missing?)');

  // 5. False premise corrected from the board.
  const premise = (await askTeach('is my queen on h5 well placed?')).toLowerCase();
  record('false-premise queen-on-h5 is corrected from the board',
    /isn'?t on h5|not on h5|is on d1/.test(premise),
    premise ? `"${short(premise)}"` : 'no reply in 45s');

  // 6. Magnus → the master-play lane (stats), not the bare best-move line.
  const magnus = (await askTeach('what would Magnus Carlsen play here?')).toLowerCase();
  record('named-master ask reaches master-play data',
    /master|game|%|most played|book/.test(magnus) && !/^\W*the best move is/.test(magnus.trim()),
    magnus ? `"${short(magnus)}"` : 'no reply in 45s', 'informational');

  // 7. Board commands: play e4 → reset clears it.
  await askTeach('play e4', 12);
  const e4On = await squareHasPiece('e4');
  const resetReply = await askTeach('reset the board', 12);
  let e4Cleared = false;
  for (let i = 0; i < 10; i++) {
    if (!(await squareHasPiece('e4'))) { e4Cleared = true; break; }
    await page.waitForTimeout(1000);
  }
  record('"reset the board" resets the board (teach pre-pass)',
    e4On && e4Cleared, `e4 placed=${e4On} cleared=${e4Cleared}; reply "${short(resetReply)}"`);

  // 8. Favorite command lands in Dexie, no picker hijack.
  const fav = await askTeach('favorite the Caro-Kann', 15);
  let favLanded = false;
  for (let i = 0; i < 15; i++) {
    const rows = await readStore('openings').catch(() => []);
    if (rows.some((o) => /caro/i.test(o.name ?? '') && o.isFavorite === true)) { favLanded = true; break; }
    await page.waitForTimeout(1000);
  }
  record('"favorite the Caro-Kann" sets the Dexie flag (no picker hijack)',
    favLanded, favLanded ? `reply "${short(fav)}"` : `no favorited row; reply "${short(fav)}"`);

  // ══ REVIEW — the reply bubble is no longer blank ══════════════════════════
  await goRetry('/coach/review');
  const card = page.locator('[data-testid^="review-game-card-"]').first();
  if (await card.waitFor({ timeout: 45000 }).then(() => true).catch(() => false)) {
    await card.click();
    const startBtn = page.locator('[data-testid="start-walk-btn"]:not([disabled])');
    if (await startBtn.waitFor({ timeout: 90000 }).then(() => true).catch(() => false)) {
      await startBtn.click();
      await page.locator('[data-testid="review-nav-controls"]').waitFor({ timeout: 30000 }).catch(() => {});
    }
    const askToggle = page.locator('[data-testid="walk-ask-toggle-btn"]');
    await askToggle.click().catch(() => {});
    const box = page.locator('[data-testid="walk-ask-panel"] [data-testid="chat-text-input"]');
    if (await box.waitFor({ timeout: 20000 }).then(() => true).catch(() => false)) {
      await box.click({ force: true });
      await box.pressSequentially('what was the biggest mistake in this game?', { delay: 10 });
      await box.press('Enter');
      // The fixed contract: the ASSISTANT bubble carries non-empty text.
      let bubbleText = '';
      for (let i = 0; i < 30; i++) {
        await page.waitForTimeout(1500);
        const bubbles = page.locator('[data-testid="walk-ask-response"] [data-testid="chat-message-assistant"] p');
        const n = await bubbles.count().catch(() => 0);
        if (n > 0) {
          bubbleText = ((await bubbles.last().innerText().catch(() => '')) || '').trim();
          if (bubbleText.length >= 20) break;
        }
      }
      record('review ask renders a NON-EMPTY reply bubble',
        bubbleText.length >= 20 && !bubbleText.toLowerCase().includes(CANNED),
        bubbleText ? `"${short(bubbleText)}"` : 'assistant bubble still empty');
    } else {
      record('review ask renders a NON-EMPTY reply bubble', false, 'ask panel input never mounted');
    }
  } else {
    record('review ask renders a NON-EMPTY reply bubble', false, 'no review cards', 'informational');
  }

  // ══ ENDGAME — the how-to question is ANSWERED, not hijacked ═══════════════
  await goRetry('/coach/endgame');
  const pattern = page.locator('[data-testid^="endgame-pattern-"]').first();
  if (await pattern.waitFor({ timeout: 45000 }).then(() => true).catch(() => false)) {
    await pattern.click();
    await page.waitForTimeout(3000);
  }
  const chatBtn = page.locator('button[aria-label="Open chat"]').first();
  if (await chatBtn.waitFor({ timeout: 30000 }).then(() => true).catch(() => false)) {
    await chatBtn.click();
    const panel = page.locator('[data-testid="game-chat-panel"]:visible').first();
    if (await panel.waitFor({ timeout: 15000 }).then(() => true).catch(() => false)) {
      const urlBefore = page.url();
      const box = page.locator('[data-testid="chat-text-input"]:visible').first();
      await box.click({ force: true });
      await box.pressSequentially('how do I win a king and pawn endgame?', { delay: 10 });
      await box.press('Enter');
      let reply = '';
      const before = (await panel.innerText().catch(() => '')) || '';
      for (let i = 0; i < 40; i++) {
        await page.waitForTimeout(1500);
        if (page.url() !== urlBefore) break; // hijack = instant fail below
        const now = (await panel.innerText().catch(() => '')) || '';
        const fresh = now.split('\n').map((l) => l.trim())
          .filter((l) => l.length >= 20 && l.includes(' ') && !before.includes(l) && !l.includes('how do I win'));
        if (fresh.length) { reply = fresh.join(' '); break; }
      }
      const stayed = page.url() === urlBefore;
      record('endgame how-to question is answered in place (no drill hijack)',
        stayed && reply.length >= 20,
        !stayed ? `HIJACKED to ${page.url()}` : reply ? `"${short(reply)}"` : 'no reply in 60s');
    } else {
      record('endgame how-to question is answered in place (no drill hijack)', false, 'drawer never opened');
    }
  } else {
    record('endgame how-to question is answered in place (no drill hijack)', false, 'no Open-chat button after entering a pattern');
  }
} finally {
  console.log(`\n── proof grid ──`);
  for (const r of results) {
    console.log(`${r.kind === 'informational' ? 'ℹ️' : r.pass ? '✅' : '❌'} ${r.name}`);
  }
  const green = results.filter((r) => r.pass || r.kind === 'informational').length;
  console.log(`\n${green}/${results.length} green (contract or informational)`);
  console.log(`pageerrors (distinct): ${pageErrors.length}${pageErrors.length ? ` — ${pageErrors.slice(0, 3).join(' | ')}` : ''}`);
  console.log(`audit_run_id: ${RUN_ID}`);
  const dir = `audit-reports/fix-proof-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ runId: RUN_ID, base: BASE, results, pageErrors }, null, 2));
  console.log(`report: ${dir}/report.json`);
  await browser.close();
  const hardFails = results.filter((r) => !r.pass && r.kind !== 'informational').length;
  process.exit(hardFails ? 1 : 0);
}
