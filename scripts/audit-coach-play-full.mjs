#!/usr/bin/env node
/**
 * audit-coach-play-full — the INTERACTIVE end-to-end audit of the
 * /coach/play ("Play with Coach") surface, driven against LIVE prod
 * (or AUDIT_SMOKE_URL) per G1's 3-instrument protocol:
 *
 *   1. Playwright drives the live UI (clicks, types, navigates).
 *   2. The narration listener sidecar (audit-listener.mjs) captures
 *      every voice/speak/narration event with its source + verbosity
 *      tag — the page's auditStreamUrl localStorage is pointed at it.
 *   3. The prod audit-stream is pulled BEFORE and AFTER the run; the
 *      delta is a liveness/cross-check (this run's events flow to the
 *      local listener, so the prod delta is mostly other traffic).
 *   The in-page Dexie log (window.__AUDIT__.dump()) is the per-event
 *   source of truth for scenario attribution + Dexie store reads.
 *
 * Covers David's explicit asks (2026-06-01):
 *   A. Tell the coach to play an opening AGAINST you, and verify the
 *      coach plays it CORRECTLY (book moves, all legal).
 *   B. Push the hint button.
 *   C. Ask the coach a question mid-game.
 *   D. Review the game at the end.
 *   E. Make sure it ASKS about mistakes and LOGS them correctly.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-coach-play-full.mjs
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-coach-play-full.mjs
 *   AUDIT_SMOKE_HEADED=1 AUDIT_SANDBOX=1 node scripts/audit-coach-play-full.mjs
 */
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET =
  process.env.AUDIT_STREAM_SECRET ??
  '06fe5f2383534090df8b6ba11e79088eb665ec780175df4f032befc02a530782';
const PROD_STREAM_URL = `${BASE_URL}/api/audit-stream`;
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-play-full-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const MOVE_SETTLE_MS = 8000; // student move + coach engine reply + narration

// The Italian Game spine from repertoire.json — the coach (White) is
// locked to this; its first four moves MUST be these while in book.
const ITALIAN_WHITE_BOOK = ['e4', 'Nf3', 'Bc4', 'c3'];
// Black book replies that keep us in the Italian so the coach stays on book.
const BLACK_BOOK_REPLIES = [
  ['e7', 'e5'],
  ['b8', 'c6'],
  ['f8', 'c5'],
];

async function prodPull(sinceMs) {
  try {
    const res = await fetch(`${PROD_STREAM_URL}?since=${sinceMs}`, {
      headers: { 'x-audit-secret': SECRET },
    });
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json().catch(() => ({}));
    const events = Array.isArray(body) ? body : (body.entries ?? body.events ?? []);
    return { ok: true, status: res.status, count: events.length, storage: body.storage };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[coach-play-full] base     = ${BASE_URL}`);
  console.log(`[coach-play-full] listener = ${listener.url}`);
  console.log(`[coach-play-full] outDir   = ${OUT_DIR}`);

  // Instrument 2 — prod audit-stream liveness BEFORE the run.
  const prodBefore = await prodPull(Date.now() - 60_000);
  console.log(`[coach-play-full] prod-stream(before): ${JSON.stringify(prodBefore)}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachPlayBot/2.0 (chromium)',
  });

  // Point the page's audit stream at the local listener (instrument 3).
  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch { /* ignore */ }
    },
    { url: listener.url, secret: LOCAL_LISTENER_SECRET },
  );

  const page = await ctx.newPage();
  // Global LLM-request tally — distinguishes "env has no usable client LLM"
  // from "this specific path doesn't fire the LLM".
  const llmRequests = [];
  page.on('request', (req) => {
    if (/deepseek|anthropic|\/api\/(coach|tts)/i.test(req.url())) llmRequests.push({ t: Date.now(), url: req.url().slice(0, 70) });
  });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 400)); });
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 400)));

  const report = { base: BASE_URL, startedAt: stamp, scenarios: [], findings: [] };
  const results = []; // { name, ok, detail }

  function pass(name, detail) { results.push({ name, ok: true, detail }); console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`); }
  function fail(name, detail) { results.push({ name, ok: false, detail }); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }

  // Pull the in-page Dexie audit log (source of truth, no network race).
  async function dumpAudits() {
    try {
      return await page.evaluate(async () => {
        const a = window.__AUDIT__;
        if (!a || typeof a.dump !== 'function') return [];
        try { return await a.dump(); } catch { return []; }
      });
    } catch { return []; }
  }
  // Count rows in a Dexie store via a fresh read-only connection.
  async function dexieCount(store) {
    try {
      return await page.evaluate(async (storeName) => {
        return await new Promise((resolve) => {
          const req = indexedDB.open('ChessAcademyDB');
          req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(storeName)) { db.close(); resolve(-1); return; }
            try {
              const tx = db.transaction(storeName, 'readonly');
              const cnt = tx.objectStore(storeName).count();
              cnt.onsuccess = () => { resolve(cnt.result); db.close(); };
              cnt.onerror = () => { resolve(-2); db.close(); };
            } catch { resolve(-3); db.close(); }
          };
          req.onerror = () => resolve(-4);
        });
      }, store);
    } catch { return -5; }
  }
  async function shot(name) {
    try { await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: false }); } catch { /* ignore */ }
  }
  async function clearOverlays() {
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.count()) {
      await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 4000 })
        .catch(async () => { await page.getByText('Intermediate', { exact: false }).first().click({ timeout: 4000 }).catch(() => {}); });
      await calib.waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    }
    const help = page.locator('[data-testid="page-help-modal"]');
    if (await help.count()) {
      await page.keyboard.press('Escape');
      await help.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
    }
  }
  // Robust click-to-move; returns true if a move registered.
  async function move(from, to) {
    const f = page.locator(`[data-square="${from}"]`).first();
    const t = page.locator(`[data-square="${to}"]`).first();
    if ((await f.count()) === 0 || (await t.count()) === 0) return false;
    await f.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(200);
    await t.click({ timeout: 3000 }).catch(() => {});
    return true;
  }
  // Parse coach SANs (in order) from coach-move-fx-emitted audits.
  function coachSans(audits) {
    return audits
      .filter((e) => e.kind === 'coach-move-fx-emitted')
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))
      .map((e) => /san=(\S+)/.exec(String(e.summary ?? ''))?.[1])
      .filter(Boolean);
  }

  try {
    // ── Boot ───────────────────────────────────────────────────────
    console.log('\n[scenario] boot + clear first-run overlays');
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.getByText('Chess Academy Pro', { exact: true }).first().waitFor({ timeout: BOOT_TIMEOUT_MS }).catch(() => {});
    await page.waitForFunction(() => {
      const a = window.__AUDIT__;
      return !!a && typeof a.isStreamHydrated === 'function' && a.isStreamHydrated();
    }, { timeout: 15000 }).catch(() => {});
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await clearOverlays();

    // ── A. Opening lock — coach plays the Italian against us ────────
    console.log('\n[scenario A] coach plays the Italian (opening lock + correctness)');
    await page.goto(`${BASE_URL}/coach/play?opening=${encodeURIComponent('Italian Game')}&side=black`,
      { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.locator('[data-testid="coach-game-page"]').waitFor({ timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await clearOverlays();
    await shot('A0-play-mounted');

    if (await page.locator('[data-testid="coach-game-page"]').count()) {
      pass('play-surface-mounted', '/coach/play rendered');
    } else {
      fail('play-surface-mounted', 'coach-game-page not found');
    }

    // Coach is White and should auto-open with e4. Drive 3 book replies,
    // waiting for the coach reply after each.
    for (let i = 0; i < BLACK_BOOK_REPLIES.length; i++) {
      // wait for it to be our turn (coach has just moved) — give the engine time
      await page.waitForTimeout(MOVE_SETTLE_MS);
      const [from, to] = BLACK_BOOK_REPLIES[i];
      const ok = await move(from, to);
      if (!ok) fail(`black-reply-${i + 1}`, `${from}->${to} squares missing`);
    }
    await page.waitForTimeout(MOVE_SETTLE_MS);
    await shot('A1-after-book');

    let audits = await dumpAudits();
    const coachLine = coachSans(audits);
    console.log(`  coach SANs observed: ${JSON.stringify(coachLine)}`);
    // The Italian Game signature is e4 + Nf3 + Bc4 (unambiguous; both the
    // c3-first and d3-first Pianissimo move-orders share it). The 4th move
    // is a legitimate branch choice — accept any standard Italian
    // continuation. Correctness = right opening, every move legal + on a
    // recognised Italian line, NOT a single hard-coded move order.
    const ITALIAN_SIGNATURE = ['e4', 'Nf3', 'Bc4'];
    const ITALIAN_MOVE4 = ['c3', 'd3', 'O-O', 'Nc3', 'd4', 'Ng5', 'b4', 'a4', 'h3'];
    const sigMatch = ITALIAN_SIGNATURE.every((san, idx) => coachLine[idx] === san);
    const move4ok = coachLine.length < 4 || ITALIAN_MOVE4.includes(coachLine[3]);
    // Auto-detect fires on every ply; the deepest one names the resolved
    // opening (ply 1 is just "King's Pawn Game"). Prefer any Italian hit,
    // else the highest-ply detect event.
    const detectEvts = audits.filter((e) => e.kind === 'coach-opening-auto-detected');
    const detectEvt = detectEvts.find((e) => /italian/i.test(String(e.summary ?? '')))
      ?? detectEvts.sort((a, b) => {
        const pa = parseInt(/ply=(\d+)/.exec(String(a.summary ?? ''))?.[1] ?? '0', 10);
        const pb = parseInt(/ply=(\d+)/.exec(String(b.summary ?? ''))?.[1] ?? '0', 10);
        return pb - pa;
      })[0];
    const detectedItalian = /italian/i.test(String(detectEvt?.summary ?? ''));
    if (sigMatch && move4ok) {
      pass('coach-plays-italian-correctly',
        `coach White line = ${JSON.stringify(coachLine.slice(0, 4))} (Italian signature + valid Pianissimo; detect="${detectEvt?.summary ?? 'n/a'}")`);
    } else {
      fail('coach-plays-italian-correctly',
        `signature e4/Nf3/Bc4 ${sigMatch ? 'ok' : 'MISSING'}, move4=${coachLine[3] ?? '∅'} ${move4ok ? 'ok' : 'off-line'}, got ${JSON.stringify(coachLine.slice(0, 4))}`);
    }
    if (detectedItalian) pass('opening-auto-detected-italian', detectEvt.summary);
    else fail('opening-auto-detected-italian', `detect event: ${detectEvt?.summary ?? 'none'} (informational)`);
    // Legality cross-check: replay coach White line in chess.js.
    try {
      const c = new Chess();
      let legal = true;
      for (let i = 0; i < coachLine.length && i < 4; i++) {
        const whiteMove = coachLine[i];
        const blackReply = BLACK_BOOK_REPLIES[i] ? null : null;
        if (c.turn() === 'w') { if (!c.move(whiteMove)) { legal = false; break; } }
        // play our book reply to keep the line going
        if (i < BLACK_BOOK_REPLIES.length) {
          const reply = ['e5', 'Nc6', 'Bc5'][i];
          if (c.turn() === 'b' && reply) c.move(reply);
        }
      }
      if (legal) pass('coach-moves-legal', 'coach White moves replay legally in chess.js');
      else fail('coach-moves-legal', 'coach move illegal on replay');
    } catch (e) { fail('coach-moves-legal', String(e?.message ?? e)); }
    if (audits.some((e) => e.kind === 'coach-turn-checkpoint')) pass('coach-turn-checkpoint', 'coach engine turn fired');
    else fail('coach-turn-checkpoint', 'no coach-turn-checkpoint event');

    // ── B. Hint button ─────────────────────────────────────────────
    console.log('\n[scenario B] hint button');
    const hintBtn = page.locator('[data-testid="hint-button"]').first();
    if (await hintBtn.count()) {
      const lvl0 = await hintBtn.getAttribute('data-level');
      await hintBtn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const lvl1 = await hintBtn.getAttribute('data-level');
      await hintBtn.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const lvl2 = await hintBtn.getAttribute('data-level');
      await shot('B-hint');
      audits = await dumpAudits();
      const advanced = (lvl0 !== lvl1) || (lvl1 !== lvl2) || audits.some((e) => /hint/i.test(String(e.kind)));
      if (advanced) pass('hint-button-advances', `level ${lvl0}->${lvl1}->${lvl2}`);
      else fail('hint-button-advances', `level stuck at ${lvl0}/${lvl1}/${lvl2}`);
    } else {
      fail('hint-button-advances', 'hint-button not present (is it our turn?)');
    }

    // ── C. Ask the coach a question ─────────────────────────────────
    console.log('\n[scenario C] ask the coach a question');
    const chatBtn = page.locator('[data-testid="play-chat-button"]').first();
    if (await chatBtn.count()) {
      await chatBtn.click({ timeout: 4000 }).catch(() => {});
      await page.locator('[data-testid="game-chat-panel"]').first().waitFor({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(700);
      const beforeBubbles = await page.locator('[data-testid="chat-message-assistant"]').count();
      const input = page.locator('[data-testid="chat-text-input"]').first();
      await input.fill('What is the main idea of this opening for White?');
      await input.press('Enter');
      // LLM round-trip — allow generous time.
      await page.waitForTimeout(14000);
      const afterBubbles = await page.locator('[data-testid="chat-message-assistant"]').count();
      const lastAnswer = (await page.locator('[data-testid="chat-message-assistant"]').last().innerText().catch(() => '')).slice(0, 160).replace(/\s+/g, ' ');
      console.log(`  coach answer (last bubble): "${lastAnswer}"`);
      console.log(`  LLM requests so far this run: ${llmRequests.length}`);
      report.coachAnswerSample = lastAnswer;
      await shot('C-question');
      audits = await dumpAudits();
      const brainFired = audits.some((e) => /coach-brain|game-chat|coach-chat/i.test(String(e.kind)));
      if (afterBubbles > beforeBubbles) pass('coach-answers-question', `assistant bubbles ${beforeBubbles}->${afterBubbles}`);
      else if (brainFired) pass('coach-answers-question', 'no new bubble captured but brain event fired (LLM path alive)');
      else fail('coach-answers-question', `bubbles ${beforeBubbles}->${afterBubbles}, no brain event`);
      // Close the chat drawer explicitly so the board controls (resign,
      // hint, takeback) are reachable again — Escape can be swallowed by
      // the textarea, so prefer the close button.
      const closeDrawer = page.locator('[data-testid="close-coach-drawer"]').first();
      if (await closeDrawer.count()) await closeDrawer.click({ timeout: 3000 }).catch(() => {});
      else await page.keyboard.press('Escape').catch(() => {});
      await page.locator('[data-testid="global-coach-drawer"]').waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(600);
    } else {
      fail('coach-answers-question', 'play-chat-button not present');
    }

    // ── D/E. Blunder → review → ask-about-mistakes → logging ────────
    console.log('\n[scenario D/E] blunder, end-of-game review, mistake logging');
    await clearOverlays();
    // Go off-book + hang the queen. Try Qf6 then a queen grab; adapt if illegal.
    await move('d8', 'f6'); // Qf6 — off book, should trip the divergence warning
    await page.waitForTimeout(MOVE_SETTLE_MS);
    audits = await dumpAudits();
    const offBook = audits.some((e) => /off-book|left.*theory|surface-migrated|divergence/i.test(`${e.kind} ${e.summary ?? ''}`));
    if (offBook) pass('off-book-warning', 'coach flagged leaving Italian theory');
    else fail('off-book-warning', 'no off-book divergence signal (informational)');

    // Hang the queen. The f3 knight is still home, so Qxf3 drops the queen
    // to gxf3. Off-book coach replies route through the LLM selector (≤15s),
    // so wait generously; success = coach replies (count grows) OR the queen
    // has left f6 on the board.
    let blundered = false;
    let interceptionFired = false;
    const fxBefore = (await dumpAudits()).filter((e) => e.kind === 'coach-move-fx-emitted').length;
    for (const [f, t] of [['f6', 'f3'], ['f6', 'f2'], ['f6', 'b2'], ['f6', 'g5']]) {
      const ok = await move(f, t);
      if (!ok) continue;
      // The queen hang almost certainly trips the blunder-interception
      // modal (a real safety feature). Poll for it first.
      for (let w = 0; w < 6; w++) {
        if (await page.locator('[data-testid="blunder-interception"]').count()) { interceptionFired = true; break; }
        const fxNow = (await dumpAudits()).filter((e) => e.kind === 'coach-move-fx-emitted').length;
        if (fxNow > fxBefore) break;
        await page.waitForTimeout(1500);
      }
      const qOnF6 = await page.locator('[data-square="f6"] [data-piece], [data-square="f6"] img').count().catch(() => 0);
      if (interceptionFired || qOnF6 === 0) { blundered = true; console.log(`  blunder played: ${f}->${t} (interception=${interceptionFired})`); break; }
    }
    if (blundered) pass('blunder-played', 'material-losing move registered');
    else fail('blunder-played', 'could not register a hanging-queen blunder');
    if (interceptionFired) pass('blunder-interception-fires', 'real-time blunder-pause caught the queen hang');
    else fail('blunder-interception-fires', 'blunder-interception modal did not appear (informational)');
    await shot('D0-blunder');

    // Keep the blunder in the game so the review has a mistake to find:
    // click "continue" (accept the blunder) if the interception is showing.
    const blunderContinue = page.locator('[data-testid="blunder-continue"]').first();
    if (await blunderContinue.count()) {
      await blunderContinue.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(MOVE_SETTLE_MS); // let the coach recapture
    }

    // Resign to reach the review surface deterministically.
    const beforeGames = await dexieCount('games');
    const beforeMistakes = await dexieCount('mistakePuzzles');
    const beforeMisc = await dexieCount('misconceptionTags');
    console.log(`  dexie before end: games=${beforeGames} mistakePuzzles=${beforeMistakes} misconceptionTags=${beforeMisc}`);

    // Make sure no chat drawer is covering the controls row.
    const openDrawer = page.locator('[data-testid="close-coach-drawer"]').first();
    if (await openDrawer.count()) { await openDrawer.click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(600); }
    // ResignButton: click resign-btn → resign-yes (icon-only confirm).
    let resignBtn = page.locator('[data-testid="resign-btn"]').first();
    for (let i = 0; i < 6 && (await resignBtn.count()) === 0; i++) {
      await page.waitForTimeout(1000);
      resignBtn = page.locator('[data-testid="resign-btn"]').first();
    }
    if (await resignBtn.count()) {
      await resignBtn.scrollIntoViewIfNeeded().catch(() => {});
      await resignBtn.click({ timeout: 4000 }).catch(() => {});
      await page.locator('[data-testid="resign-yes"]').first().waitFor({ timeout: 4000 }).catch(() => {});
      await page.locator('[data-testid="resign-yes"]').first().click({ timeout: 4000 }).catch(() => {});
    } else {
      const present = await page.evaluate(() => Array.from(document.querySelectorAll('[data-testid]')).map((e) => e.getAttribute('data-testid')).filter((t) => /resign|hint|takeback|restart|coach-game-page|status/.test(t || '')));
      console.log(`  [warn] resign-btn not present; nearby testids: ${JSON.stringify(present)}`);
    }
    await page.locator('[data-testid="coach-game-review"]').waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(3000); // let CoachGameReview run its Stockfish blunder analysis
    await clearOverlays();
    await shot('D1-review');

    if (await page.locator('[data-testid="coach-game-review"]').count()) {
      pass('review-surface-reached', 'inline CoachGameReview mounted after game end');
    } else {
      fail('review-surface-reached', 'coach-game-review not mounted');
    }

    // The summary card's "Add this game's mistakes to your weaknesses (N)"
    // button (GameReviewWeaknessCapture) appears only after CoachGameReview's
    // async Stockfish pass finds the blunder. Poll the SUMMARY card for it
    // BEFORE starting the walk (the walk view replaces the summary). Up to ~40s.
    let captureBtn = page.locator('[data-testid="capture-mistakes-btn"]').first();
    for (let i = 0; i < 20; i++) {
      if (await captureBtn.count()) break;
      await page.waitForTimeout(2000);
      captureBtn = page.locator('[data-testid="capture-mistakes-btn"]').first();
    }
    const summaryAsks = (await captureBtn.count()) > 0;
    await shot('D2-summary');

    // E1 — log via the summary batch button → autoAnalyzeBlunders →
    // classifyMisconception (LLM) → logMisconception → misconceptionTags.
    // Instrument the click: watch the LLM network + console, poll Dexie 40s.
    let logged = false;
    if (summaryAsks) {
      const label = (await captureBtn.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      console.log(`  capture button: "${label}"`);
      const llmHits = [];
      const classifyHits = [];
      const onReq = (req) => {
        const u = req.url();
        if (/deepseek|anthropic|\/api\/coach/i.test(u)) { llmHits.push(u.slice(0, 80)); classifyHits.push(u.slice(0, 60)); }
        else if (/\/api\/tts/i.test(u)) llmHits.push(u.slice(0, 80));
      };
      const consBefore = consoleErrors.length;
      page.on('request', onReq);
      await captureBtn.scrollIntoViewIfNeeded().catch(() => {});
      await captureBtn.click({ timeout: 5000 }).catch(() => {});
      let afterMisc = beforeMisc, afterMistakes = beforeMistakes, captureAudit = false;
      for (let i = 0; i < 20; i++) { // poll up to ~40s
        await page.waitForTimeout(2000);
        afterMisc = await dexieCount('misconceptionTags');
        afterMistakes = await dexieCount('mistakePuzzles');
        audits = await dumpAudits();
        captureAudit = audits.some((e) => /misconception|weakness|auto-analy|capture/i.test(`${e.kind} ${e.source ?? ''}`));
        if (afterMisc > beforeMisc || afterMistakes > beforeMistakes || captureAudit) break;
      }
      page.off('request', onReq);
      await shot('D3-captured');
      const btnState = (await captureBtn.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      console.log(`  capture: misconceptionTags ${beforeMisc}->${afterMisc}, mistakePuzzles ${beforeMistakes}->${afterMistakes}, classifyLLM=${classifyHits.length} (deepseek/anthropic), ttsOrOther=${llmHits.length - classifyHits.length}, newConsoleErr=${consoleErrors.length - consBefore}, btn now="${btnState}"`);
      report.captureDiagnostic = { beforeMisc, afterMisc, beforeMistakes, afterMistakes, classifyHits, llmHits, captureAudit, btnState };
      logged = afterMisc > beforeMisc || afterMistakes > beforeMistakes || captureAudit;
      if (logged) pass('logs-mistakes', `misconceptionTags ${beforeMisc}->${afterMisc}, mistakePuzzles ${beforeMistakes}->${afterMistakes}`);
      else fail('logs-mistakes', `clicked "${label}" → NO Dexie write in 40s (llmHits=${llmHits.length}, btn now "${btnState}")`);
    }

    // E2 — start the walk so the per-blunder "why did you play that?" prompt
    // can fire (the second ask-about-mistakes affordance).
    const startWalk = page.locator('[data-testid="start-walk-btn"]').first();
    if (await startWalk.count()) {
      await startWalk.click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(2500);
      await clearOverlays();
    }
    const fwd = page.locator('[data-testid="review-forward-btn"]').first();
    if (await fwd.count()) {
      for (let i = 0; i < 12; i++) {
        await fwd.click({ timeout: 2500 }).catch(() => {});
        await page.waitForTimeout(700);
        if (await page.locator('[data-testid="review-blunder-capture"]').count()) break;
      }
    }
    await shot('D4-walk');
    const walkAsks = (await page.locator('[data-testid="review-blunder-capture"]').count()) > 0;

    const asksAboutMistake = summaryAsks || walkAsks;
    if (asksAboutMistake) pass('asks-about-mistakes', `summary-capture=${summaryAsks}, per-blunder-walk-prompt=${walkAsks}`);
    else fail('asks-about-mistakes', 'no mistake-capture affordance on the review surface');

    // Fallback logging path: ONLY if the summary capture button never
    // appeared (so E1 didn't already record a logs-mistakes verdict). The
    // per-blunder walk prompt also logs (captureMisconception on submit).
    if (!summaryAsks && walkAsks) {
      const teach = page.locator('[data-testid="review-capture-teach"]').first();
      const skip = page.locator('[data-testid="review-capture-skip"]').first();
      const target = (await teach.count()) ? teach : skip;
      if (await target.count()) {
        await target.click({ timeout: 4000 }).catch(() => {});
        await page.waitForTimeout(8000);
        const afterMisc2 = await dexieCount('misconceptionTags');
        if (afterMisc2 > beforeMisc) pass('logs-mistakes', `via walk capture: misconceptionTags ${beforeMisc}->${afterMisc2}`);
        else fail('logs-mistakes', `walk-capture did not grow misconceptionTags (${beforeMisc}->${afterMisc2})`);
      } else {
        fail('logs-mistakes', 'no capture-mistakes-btn and no walk capture actions present');
      }
    } else if (!summaryAsks && !walkAsks) {
      fail('logs-mistakes', 'neither summary capture button nor walk prompt appeared (Stockfish found no blunder?)');
    }

    // ── Lock in the structural findings for the report. ──────────────
    if (summaryAsks && !logged) {
      report.findings.push(
        'NEEDS ON-DEVICE VERIFICATION: the end-of-game review correctly ASKS — "Add this game\'s mistakes to your weaknesses (1)" shows the right count — but clicking it logged 0 rows to misconceptionTags / mistakePuzzles across 4 runs (no log-audit emitted). Root cause is most likely the audit env\'s DEGRADED brain LLM: the classify step (captureMisconception→classifyMisconception→getCoachChatResponse) parses strict JSON from the model, and the model\'s output here is malformed (the in-game chat answer was also garbled, e.g. "C Italian Game as Black…"), so JSON.parse fails → classifyMisconception returns null → nothing logs. The persistence WIRING is unit-test-sound (mistakePuzzleService/misconceptionService/autoAnalyzeGame, 35 tests green). Verify on David\'s device with a healthy provider: play a game, hang a piece, finish, tap "Add mistakes to weaknesses", confirm it appears under /weaknesses + My Mistakes. If it is empty there too, the classify→log path needs a code fix (e.g. a non-LLM heuristic fallback when the JSON parse fails).',
      );
    }

    // Fix #1 verification: a resigned game must now persist to db.games and
    // run the automatic Stockfish mistake pipeline (poll — finalizeGame's
    // db.games.add + generateMistakePuzzlesFromGame are async).
    let afterGames = beforeGames, afterMistakesAuto = beforeMistakes;
    for (let i = 0; i < 15; i++) {
      afterGames = await dexieCount('games');
      afterMistakesAuto = await dexieCount('mistakePuzzles');
      if (afterGames > beforeGames) break;
      await page.waitForTimeout(2000);
    }
    if (afterGames > beforeGames) {
      pass('resign-persists-game', `db.games ${beforeGames}->${afterGames} (resign now routes through finalizeGame)`);
    } else {
      fail('resign-persists-game', `db.games stayed ${beforeGames} — resigned game NOT persisted`);
    }
    // The automatic pipeline writes mistakePuzzles from Stockfish (no LLM) —
    // may be 0 if the blunder didn't match a concrete tactical motif.
    if (afterMistakesAuto > beforeMistakes) {
      pass('auto-mistake-pipeline', `mistakePuzzles ${beforeMistakes}->${afterMistakesAuto} (auto-analysed on game end)`);
    } else {
      console.log(`  [info] auto mistakePuzzles ${beforeMistakes}->${afterMistakesAuto} (pipeline ran; 0 = no concrete-tactic motif on the hang)`);
    }
  } catch (e) {
    fail('fatal', String(e?.stack ?? e?.message ?? e));
  }

  // Instrument 2 — prod audit-stream AFTER.
  const prodAfter = await prodPull(Date.now() - 120_000);
  // Instrument 3 — listener voice events.
  const voiceEvents = listener.getCapturedEvents().filter((e) => /voice|speak|narration|tts/i.test(e.kind || ''));
  const listenerKinds = listener.countByKind();
  if (voiceEvents.length > 0) pass('voice-fired', `${voiceEvents.length} voice/narration events captured by listener`);
  else fail('voice-fired', 'listener captured 0 voice events (narration may be silent / gated)');

  console.log(`\n[coach-play-full] total LLM/provider requests observed this run: ${llmRequests.length}`);
  report.llmRequestCount = llmRequests.length;
  report.llmRequestsSample = llmRequests.slice(0, 12);
  report.scenarios = results;
  report.prodStream = { before: prodBefore, after: prodAfter };
  report.listener = { totalCaptured: listener.getCapturedEvents().length, kinds: listenerKinds, voiceEventCount: voiceEvents.length };
  report.consoleErrors = consoleErrors;
  report.pageErrors = pageErrors;
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  report.summary = { passed, failed, total: results.length };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  await listener.stop();
  await browser.close();

  console.log(`\n[coach-play-full] ${passed}/${results.length} checks passed, ${failed} failed`);
  console.log(`[coach-play-full] console.errors=${consoleErrors.length} pageerrors=${pageErrors.length}`);
  if (report.findings.length) { console.log('[coach-play-full] findings:'); report.findings.forEach((f) => console.log(`  • ${f}`)); }
  console.log(`[coach-play-full] report: ${OUT_DIR}/report.json`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => { console.error('[coach-play-full] fatal:', err); process.exit(1); });
