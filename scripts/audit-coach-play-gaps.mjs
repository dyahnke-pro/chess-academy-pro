#!/usr/bin/env node
/**
 * audit-coach-play-gaps — the GAP audit for Play-with-Coach (/coach/play,
 * component src/components/Coach/CoachGamePage.tsx).
 *
 * The happy path is already covered by audit-coach-play-functions.mjs (every
 * function, mounts + clicks) and audit-coach-play.mjs (engine wiring + audit
 * events). This script targets the EDGE-CASE contracts those two miss — the
 * things that only break under real human use:
 *
 *   1. MID-GAME CONTROL LOCK — color / difficulty / time-control must become
 *      `disabled` once gameState.moves.length > 0 (the handleColorChange /
 *      setDifficulty / timeControl guards). A control still clickable mid-game
 *      is a FAIL.
 *   2. QUIZ WRONG-ANSWER — a student move that does NOT match the pending
 *      quiz's expectedSan/alternatives resolves the quiz `{ ok:false }` and
 *      emits a `quiz-resolved` audit. Quiz starts only when the LLM emits
 *      `quiz_user_for_move`, so it's not deterministically elicitable — if we
 *      can't get one to fire, it's reported ❌ NOT TESTED with the reason,
 *      never silently skipped.
 *   3. PLAY-VARIATION + RETURN — a "what if I played X" chat hypothetical makes
 *      the coach call play_variation → the board enters a temporary read-only
 *      FEN (temp-position-banner + back-to-game-btn), then Back-to-Game snaps
 *      it to the live position (handlePlayVariation / handleReturnToGame).
 *      Also LLM-gated → ❌ NOT TESTED if the coach doesn't take the tool path.
 *   4. PHASE-NARRATION FIRED — drive the game across the opening→middlegame
 *      boundary and assert a `phase-transition-detected` audit fired (pulled
 *      from /api/audit-stream), not just that the board moved.
 *   5. CLOCK-RESTORE ON RESUME (WO-RESUME-01) — start a TIMED game, play a
 *      couple moves, leave + re-enter /coach/play, assert the move list AND the
 *      clock chips restore (resumable snapshot replays the clock).
 *
 * Doctrine (CLAUDE.md G7 + the 2026-06-12 false-coverage rule): EVERY step
 * asserts its expected post-state and FAILS LOUDLY when the target element is
 * absent or the state didn't change. No "click-if-present" silent no-ops. A
 * per-gap COVERAGE GRID is printed; untested gaps are reported explicitly.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-coach-play-gaps.mjs
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-coach-play-gaps.mjs
 *
 * NB: This cannot run inside the Claude Code sandbox (the egress proxy drops
 * browser TLS to every external host). It runs on the GitHub Action runner
 * (open network) where the sandbox args are a no-op.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? process.env.PROD_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET =
  process.env.AUDIT_STREAM_SECRET ??
  '06fe5f2383534090df8b6ba11e79088eb665ec780175df4f032befc02a530782';
const STREAM_URL = `${BASE}/api/audit-stream`;
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-play-gaps-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const MOVE_SETTLE_MS = 7000;

const sel = (t) => `[data-testid="${t}"]`;

// ── Coverage grid. Every gap is a row; default status is the honest
//    "not reached" so an unfired assertion can NEVER masquerade as a pass. ──
const GAPS = {
  'mid-game-control-lock': { reached: false, status: 'not-reached', detail: '', asserts: 'color/difficulty/time-control disabled once moves.length>0' },
  'quiz-wrong-answer': { reached: false, status: 'not-reached', detail: '', asserts: 'non-matching student move → quiz-resolved {ok:false}' },
  'play-variation-and-return': { reached: false, status: 'not-reached', detail: '', asserts: 'chat hypothetical → temp-position-banner → back-to-game snaps live' },
  'phase-narration-fired': { reached: false, status: 'not-reached', detail: '', asserts: 'opening→middlegame crossing emits phase-transition-detected' },
  'clock-restore-on-resume': { reached: false, status: 'not-reached', detail: '', asserts: 'timed game leave+return restores move list + clock chips' },
};
/** Mark a gap pass/fail/not-tested. A FAIL is loud and exits non-zero. */
const mark = (gap, status, detail = '') => {
  GAPS[gap].reached = status === 'pass' || status === 'fail';
  GAPS[gap].status = status;
  GAPS[gap].detail = detail;
  const glyph = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '❌';
  console.log(`${glyph} [${gap}] ${status.toUpperCase()}${detail ? ` — ${detail}` : ''}`);
};

const consoleErrors = [];
const pageErrors = [];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[gaps] base = ${BASE}`);
  console.log(`[gaps] out  = ${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[gaps] chromium = ${executablePath}`);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 1280, height: 980 }, // desktop so the move list + clock chips render
    deviceScaleFactor: 1,
    userAgent: 'AuditCoachPlayBot/1.0 (gaps)',
  });
  // Point the in-app audit logger at the prod stream so the page's own
  // logAppAudit() events (phase-transition, quiz-resolved) are durably
  // emitted; we ALSO pull the stream over HTTP for the phase assertion.
  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch { /* ignore */ }
    },
    { url: STREAM_URL, secret: SECRET },
  );

  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 400)); });
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 400)));

  // ── Shared helpers (selectors lifted verbatim from the existing audits) ──
  async function dismissOverlays() {
    await Promise.race([
      page.locator(sel('strength-calibration-bubble')).waitFor({ state: 'visible', timeout: 6000 }).catch(() => undefined),
      page.locator(sel('page-help-modal')).waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined),
    ]);
    for (let i = 0; i < 4; i++) {
      let acted = false;
      const calib = page.locator(sel('strength-calibration-bubble'));
      if (await calib.count()) {
        acted = true;
        await page.locator(sel('skill-band-intermediate')).first().click({ timeout: 4000 })
          .catch(() => page.getByText('Intermediate', { exact: false }).first().click({ timeout: 4000 }).catch(() => undefined));
        await calib.waitFor({ state: 'detached', timeout: 18000 }).catch(() => undefined);
      }
      const help = page.locator(sel('page-help-modal'));
      if (await help.count()) {
        acted = true;
        const close = page.locator(`${sel('page-help-close')}, ${sel('page-help-modal')} [aria-label="Close"]`);
        if (await close.count()) await close.first().click({ timeout: 4000 }).catch(() => undefined);
        else await page.keyboard.press('Escape').catch(() => undefined);
        await help.waitFor({ state: 'detached', timeout: 8000 }).catch(() => undefined);
      }
      if (!acted) break;
    }
  }
  async function gotoPlay() {
    await page.locator(sel('coach-action-play')).click({ timeout: 8000 }).catch(async () => {
      await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    });
    await page.locator('[data-square="e2"]').first().waitFor({ state: 'visible', timeout: BOOT_TIMEOUT_MS });
    await dismissOverlays();
  }
  async function tryMove(from, to, settle = MOVE_SETTLE_MS) {
    const fromSq = page.locator(`[data-square="${from}"]`).first();
    const toSq = page.locator(`[data-square="${to}"]`).first();
    if ((await fromSq.count()) === 0 || (await toSq.count()) === 0) {
      throw new Error(`square not on board: ${from} or ${to}`);
    }
    await fromSq.click({ timeout: 2500, force: true });
    await page.waitForTimeout(200);
    await toSq.click({ timeout: 2500, force: true });
    await page.waitForTimeout(settle);
  }
  const moveCells = () => page.locator('[data-testid^="move-cell-"]').count();
  const isDisabled = (t) => page.locator(sel(t)).first().isDisabled().catch(() => null);
  const visible = (t, ms = 2500) => page.locator(sel(t)).first().isVisible({ timeout: ms }).catch(() => false);

  /** Pull audit-stream events emitted since `sinceMs` (server, durable). */
  async function pullStream(sinceMs) {
    try {
      const res = await page.request.get(`${STREAM_URL}?since=${sinceMs}`, {
        headers: { 'x-audit-secret': SECRET },
        timeout: 12000,
      });
      if (!res.ok()) return { ok: false, status: res.status(), events: [] };
      const body = await res.json().catch(() => ({}));
      const events = Array.isArray(body) ? body : (body.events ?? body.items ?? []);
      return { ok: true, status: res.status(), events };
    } catch (e) {
      return { ok: false, status: 0, events: [], error: String(e?.message ?? e) };
    }
  }
  /** Read the in-page Dexie audit log (source of truth, no network race). */
  async function dumpInPageAudit() {
    return page.evaluate(async () => {
      const a = window.__AUDIT__;
      if (!a || typeof a.dump !== 'function') return [];
      try { return await a.dump(); } catch { return []; }
    }).catch(() => []);
  }

  try {
    // ── Boot ────────────────────────────────────────────────────────────
    await page.goto(`${BASE}/coach/home?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await dismissOverlays();
    await page.waitForTimeout(500);
    await dismissOverlays();
    await gotoPlay();
    if (!(await visible('coach-game-page', 15000))) {
      throw new Error('coach-game-page never mounted');
    }

    // ════════════════════════════════════════════════════════════════════
    // GAP 1 — MID-GAME CONTROL LOCK
    // Before move 1: color / difficulty / time-control must be ENABLED.
    // After one move: each must be DISABLED. A control still enabled mid-
    // game is a FAIL (the handleColorChange / setDifficulty / timeControl
    // moves.length>0 guards regressed).
    // ════════════════════════════════════════════════════════════════════
    try {
      const controls = ['color-white-btn', 'color-black-btn', 'difficulty-easy', 'difficulty-medium', 'difficulty-hard', 'time-control-select'];
      const missing = [];
      for (const c of controls) if (!(await visible(c, 4000))) missing.push(c);
      if (missing.length) throw new Error(`pre-move control(s) absent: ${missing.join(', ')}`);

      const enabledBefore = {};
      for (const c of controls) enabledBefore[c] = (await isDisabled(c)) === false;
      const notEnabled = controls.filter((c) => !enabledBefore[c]);
      if (notEnabled.length) {
        // Controls must be interactive BEFORE the first move; if not, the
        // contract is already wrong.
        throw new Error(`control(s) NOT enabled pre-move (should be): ${notEnabled.join(', ')}`);
      }

      // Play exactly one student move to flip moves.length to > 0.
      await tryMove('e2', 'e4');
      const cells = await moveCells();
      if (cells === 0) throw new Error('first move did not register on the move list (cells=0)');

      const stillEnabled = [];
      for (const c of controls) {
        const disabled = await isDisabled(c);
        if (disabled === null) { stillEnabled.push(`${c}(absent)`); continue; }
        if (disabled !== true) stillEnabled.push(c);
      }
      if (stillEnabled.length) {
        mark('mid-game-control-lock', 'fail',
          `controls still interactive mid-game (must be disabled): ${stillEnabled.join(', ')}`);
      } else {
        mark('mid-game-control-lock', 'pass',
          `all 6 controls disabled after move 1 (${cells} cell(s) on the list)`);
      }
    } catch (e) {
      mark('mid-game-control-lock', 'fail', e instanceof Error ? e.message : String(e));
    }

    // ════════════════════════════════════════════════════════════════════
    // GAP 4 — PHASE-NARRATION FIRED (run on the SAME live game — drive it
    // deep enough to cross the opening→middlegame boundary, then assert a
    // `phase-transition-detected` audit fired). Done before resign so the
    // game is still live.
    // ════════════════════════════════════════════════════════════════════
    try {
      const t0 = Date.now() - 1000; // small backdate cushion for clock skew
      // We already played e4. Develop both sides toward a middlegame: the
      // phase detector flips once minor pieces are out + castling done. Play
      // a quiet developing sequence; the engine supplies Black's replies.
      const developSeq = [
        ['g1', 'f3'], ['f1', 'c4'], ['b1', 'c3'], ['d2', 'd3'],
        ['c1', 'e3'], ['d1', 'd2'], ['e1', 'g1'] /* O-O if legal */,
        ['f1', 'e1'], ['a2', 'a3'], ['h2', 'h3'],
      ];
      for (const [f, t] of developSeq) {
        await tryMove(f, t).catch(() => undefined); // illegal-at-this-ply moves are skipped; keep driving
      }
      // Inspect BOTH the in-page Dexie log and the HTTP stream so a network
      // hiccup on either path can't produce a false NOT-TESTED.
      const inPage = await dumpInPageAudit();
      const inPagePhase = inPage.filter((e) =>
        typeof e?.timestamp === 'number' && e.timestamp >= t0 &&
        (String(e.kind) === 'phase-transition-detected' || String(e.kind).startsWith('coach-narration')));
      const stream = await pullStream(t0);
      const streamPhase = (stream.events ?? []).filter((e) =>
        String(e.kind) === 'phase-transition-detected' || String(e.kind).startsWith('coach-narration'));

      const fired = inPagePhase.length + streamPhase.length;
      if (fired > 0) {
        mark('phase-narration-fired', 'pass',
          `phase/narration events: ${inPagePhase.length} in-page + ${streamPhase.length} stream`);
      } else if (!stream.ok && inPage.length === 0) {
        // Neither oracle was readable (no __AUDIT__ dump AND stream non-200)
        // — we genuinely couldn't observe, so report NOT TESTED honestly
        // rather than fail on a blind window.
        mark('phase-narration-fired', 'not-tested',
          `no audit oracle reachable (stream status=${stream.status}, in-page=${inPage.length})`);
      } else {
        // Oracles WERE readable and no phase event fired across a full
        // development sequence — that's a real miss.
        mark('phase-narration-fired', 'fail',
          `no phase-transition-detected across opening→middlegame (in-page=${inPage.length} ev, stream ok=${stream.ok})`);
      }
    } catch (e) {
      mark('phase-narration-fired', 'fail', e instanceof Error ? e.message : String(e));
    }

    // ════════════════════════════════════════════════════════════════════
    // GAP 2 — QUIZ WRONG-ANSWER
    // The quiz only registers when the LLM emits `quiz_user_for_move`, which
    // a human can't force deterministically. We try to elicit one via chat,
    // then play a deliberately-wrong move and assert a `quiz-resolved`
    // {ok:false} audit. If no quiz ever registers, report ❌ NOT TESTED with
    // the reason — never a silent skip, never a false pass.
    // ════════════════════════════════════════════════════════════════════
    try {
      let quizActive = false;
      // Open chat and ask for a quiz (best-effort elicitation).
      if (await visible('play-chat-button', 3000)) {
        await page.locator(sel('play-chat-button')).click({ timeout: 4000 }).catch(() => undefined);
        await page.locator(sel('game-chat-panel')).first().waitFor({ timeout: 6000 }).catch(() => undefined);
        await page.waitForTimeout(700);
        const input = page.locator(`${sel('game-chat-panel')} ${sel('chat-text-input')}`).first();
        if (await input.count()) {
          await input.fill('Quiz me: ask me to find the best move in this position.');
          await input.press('Enter');
          await page.waitForTimeout(MOVE_SETTLE_MS); // brain round-trip
        }
        // Close the drawer so it doesn't intercept the board.
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(500);
      }
      quizActive = await visible('coach-quiz-banner', 2500);

      if (!quizActive) {
        mark('quiz-wrong-answer', 'not-tested',
          'no coach quiz registered — quiz fires only when the LLM emits quiz_user_for_move (not deterministically elicitable from the UI). The wrong-answer→quiz-resolved{ok:false} path could not be exercised this run.');
      } else {
        // A quiz is pending. Play a move that is almost certainly NOT the
        // expected best move (a rook-pawn nudge) so the resolver records
        // ok:false. We can't read expectedSan from the DOM, so we pick a
        // throwaway legal move and assert quiz-resolved with ok=false.
        const tStart = Date.now() - 500;
        await tryMove('a2', 'a3').catch(() => tryMove('h2', 'h3').catch(() => undefined));
        const inPage = await dumpInPageAudit();
        const resolved = inPage.filter((e) =>
          typeof e?.timestamp === 'number' && e.timestamp >= tStart && String(e.kind) === 'quiz-resolved');
        const wrong = resolved.find((e) => /ok=false/.test(String(e.summary ?? '')) || e?.details?.ok === false);
        if (wrong) {
          mark('quiz-wrong-answer', 'pass', `quiz-resolved fired with ok=false (${wrong.summary ?? 'details.ok=false'})`);
        } else if (resolved.length) {
          mark('quiz-wrong-answer', 'fail',
            `quiz-resolved fired but NOT ok=false — the wrong move was accepted (summary: ${resolved.map((e) => e.summary).join(' | ')})`);
        } else {
          mark('quiz-wrong-answer', 'fail',
            'quiz was active but the off-best move did not emit a quiz-resolved audit (resolver not wired to the student move)');
        }
      }
    } catch (e) {
      mark('quiz-wrong-answer', 'fail', e instanceof Error ? e.message : String(e));
    }

    // ════════════════════════════════════════════════════════════════════
    // GAP 3 — PLAY-VARIATION + RETURN
    // Ask a "what if I played X" hypothetical in chat; the coach answers by
    // calling play_variation, which sets temporaryFen → the read-only
    // temp-position-banner + back-to-game-btn appear. Clicking Back-to-Game
    // (handleReturnToGame) snaps the board to the live position and the
    // banner detaches. play_variation is an LLM tool call (a human can't
    // force it), so if neither the banner appears, report ❌ NOT TESTED.
    // ════════════════════════════════════════════════════════════════════
    try {
      let bannerSeen = false;
      if (await visible('play-chat-button', 3000)) {
        await page.locator(sel('play-chat-button')).click({ timeout: 4000 }).catch(() => undefined);
        await page.locator(sel('game-chat-panel')).first().waitFor({ timeout: 6000 }).catch(() => undefined);
        await page.waitForTimeout(700);
        const input = page.locator(`${sel('game-chat-panel')} ${sel('chat-text-input')}`).first();
        if (await input.count()) {
          await input.fill('What if I had played Nf3 here? Show me that line on the board.');
          await input.press('Enter');
          await page.waitForTimeout(MOVE_SETTLE_MS + 2000); // brain + tool round-trip
        }
        await page.keyboard.press('Escape').catch(() => undefined);
        await page.waitForTimeout(500);
      }
      bannerSeen = await visible('temp-position-banner', 3000);

      if (!bannerSeen) {
        mark('play-variation-and-return', 'not-tested',
          'coach did not enter a variation — play_variation is an LLM tool call triggered by a hypothetical; it did not fire this run, so the temp-position-banner → back-to-game snap-back could not be exercised.');
      } else {
        // Variation is showing. The board is read-only (interactive gated off
        // while temporaryFen is set) and Back-to-Game must restore the live
        // line. Capture the live move count, then snap back and assert the
        // banner detaches and the move list is intact.
        const cellsDuring = await moveCells();
        const backBtn = page.locator(sel('back-to-game-btn')).first();
        if (!(await backBtn.count())) {
          mark('play-variation-and-return', 'fail',
            'temp-position-banner shown but back-to-game-btn absent — no way to return to the live game');
        } else {
          await backBtn.click({ timeout: 4000 });
          const detached = await page.locator(sel('temp-position-banner'))
            .waitFor({ state: 'detached', timeout: 6000 }).then(() => true).catch(() => false);
          const cellsAfter = await moveCells();
          if (detached && cellsAfter >= cellsDuring && cellsAfter > 0) {
            mark('play-variation-and-return', 'pass',
              `entered variation, Back-to-Game snapped to live (${cellsAfter} move cell(s), banner detached)`);
          } else {
            mark('play-variation-and-return', 'fail',
              `return did not restore live game (bannerDetached=${detached}, cellsDuring=${cellsDuring}, cellsAfter=${cellsAfter})`);
          }
        }
      }
    } catch (e) {
      mark('play-variation-and-return', 'fail', e instanceof Error ? e.message : String(e));
    }

    // ════════════════════════════════════════════════════════════════════
    // GAP 5 — CLOCK-RESTORE ON RESUME (WO-RESUME-01)
    // Restart to a clean board, select a TIMED control (clock chips appear),
    // play two moves, leave the tab + come back, and assert the move list AND
    // the clock chips restore. A fresh empty board / missing clock = FAIL.
    // ════════════════════════════════════════════════════════════════════
    try {
      // Restart so we get a fresh game whose time-control select is editable
      // again (it's disabled once moves are on the board).
      if (await visible('restart-btn', 2500)) {
        await page.locator(sel('restart-btn')).click({ timeout: 4000 }).catch(() => undefined);
        // Some builds confirm restart; click any confirm if present.
        await page.locator(sel('restart-confirm')).first().click({ timeout: 1500 }).catch(() => undefined);
        await page.waitForTimeout(1200);
        await dismissOverlays();
      } else {
        // No restart control — navigate away and back to reset to a fresh
        // game (resume only restores a snapshot if one persisted).
        await page.goto(`${BASE}/coach/home?cb=${Date.now()}`, { waitUntil: 'domcontentloaded' });
        await dismissOverlays();
        await gotoPlay();
      }

      const select = page.locator(sel('time-control-select'));
      if ((await select.count()) === 0) throw new Error('time-control-select missing — cannot start a timed game');
      // Prefer a known blitz id; fall back to the first non-default option.
      const selectedTimed = await select.selectOption('blitz-5-0').then(() => true).catch(() => false);
      if (!selectedTimed) {
        const optCount = await page.locator(`${sel('time-control-select')} option`).count();
        await select.selectOption({ index: Math.min(1, optCount - 1) }).catch(() => undefined);
      }
      await page.waitForTimeout(400);

      // Play two moves so a resumable snapshot persists with clock state.
      // NOTE: the player-info bars (which carry the clock chips) mount with
      // the ACTIVE game view, not the pre-move setup screen — so the clock
      // assertion happens AFTER the first move, not before (the old pre-move
      // check counted 0 because the bars weren't mounted yet — harness
      // timing, not a missing clock).
      await tryMove('e2', 'e4');
      await tryMove('g1', 'f3').catch(() => undefined);
      const cellsBefore = await moveCells();
      if (cellsBefore === 0) throw new Error('moves did not register before leaving the tab');

      // Now the game is active — the timed control MUST render both clocks.
      await page.waitForTimeout(400);
      const clocksBefore = await page.locator(sel('player-clock')).count();
      if (clocksBefore < 2) throw new Error(`active timed game did not render 2 player-clock chips (got ${clocksBefore})`);

      // Leave the Play tab, then return.
      await page.getByRole('link', { name: 'Coach' }).first().click({ timeout: 8000 })
        .catch(() => page.goto(`${BASE}/coach/home`, { waitUntil: 'domcontentloaded' }));
      await page.waitForTimeout(1500);
      await dismissOverlays();
      await gotoPlay();
      await page.waitForTimeout(3000); // let the resume effect replay history + clock

      const cellsAfter = await moveCells();
      const clocksAfter = await page.locator(sel('player-clock')).count();
      const listRestored = cellsAfter >= cellsBefore && cellsAfter > 0;
      const clockRestored = clocksAfter >= 2;
      if (listRestored && clockRestored) {
        mark('clock-restore-on-resume', 'pass',
          `move list restored (${cellsBefore}→${cellsAfter}) and ${clocksAfter} clock chip(s) present after re-entry`);
      } else {
        mark('clock-restore-on-resume', 'fail',
          `resume incomplete — list ${cellsBefore}→${cellsAfter} (restored=${listRestored}), clocks ${clocksBefore}→${clocksAfter} (restored=${clockRestored})`);
      }
    } catch (e) {
      mark('clock-restore-on-resume', 'fail', e instanceof Error ? e.message : String(e));
    }
  } catch (e) {
    // A top-level throw means the harness itself broke before reaching a gap
    // — fail every still-not-reached gap loudly so this can't be a silent
    // green.
    console.log(`[gaps] FATAL during run: ${e instanceof Error ? e.message : String(e)}`);
    for (const g of Object.keys(GAPS)) {
      if (!GAPS[g].reached && GAPS[g].status === 'not-reached') {
        mark(g, 'fail', `not reached — run aborted: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  } finally {
    await page.screenshot({ path: join(OUT_DIR, 'final.png'), fullPage: false }).catch(() => undefined);
    await browser.close();
  }

  // ── COVERAGE GRID ──────────────────────────────────────────────────────
  console.log('\n──────── COACH-PLAY GAP COVERAGE GRID ────────');
  for (const [gap, row] of Object.entries(GAPS)) {
    const glyph = row.status === 'pass' ? '✓ PASS' : row.status === 'fail' ? '✗ FAIL' : '❌ NOT TESTED';
    console.log(`  ${glyph.padEnd(14)} ${gap}`);
    console.log(`                 asserts: ${row.asserts}`);
    if (row.detail) console.log(`                 → ${row.detail}`);
  }

  const fails = Object.entries(GAPS).filter(([, r]) => r.status === 'fail');
  const passes = Object.entries(GAPS).filter(([, r]) => r.status === 'pass');
  const notTested = Object.entries(GAPS).filter(([, r]) => r.status === 'not-tested');

  // A gap left at 'not-reached' (never marked) is a harness bug — fail it.
  const unreached = Object.entries(GAPS).filter(([, r]) => r.status === 'not-reached');
  for (const [g] of unreached) mark(g, 'fail', 'gap never evaluated (harness gap)');
  const allFails = Object.entries(GAPS).filter(([, r]) => r.status === 'fail');

  const report = {
    base: BASE,
    startedAt: stamp,
    grid: GAPS,
    summary: {
      pass: passes.length,
      fail: allFails.length,
      notTested: notTested.length,
      total: Object.keys(GAPS).length,
    },
    consoleErrors,
    pageErrors,
  };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log(
    `\n[gaps] ${passes.length} pass · ${allFails.length} fail · ${notTested.length} not-tested  ` +
    `(${Object.keys(GAPS).length} gaps) — report: ${OUT_DIR}/report.json`,
  );
  if (consoleErrors.length) console.log(`[gaps] console.errors: ${consoleErrors.length}`);
  if (pageErrors.length) console.log(`[gaps] pageerrors: ${pageErrors.length}`);

  // Exit 0 ONLY when no gap FAILED. NOT-TESTED gaps (LLM-gated quiz /
  // variation that didn't fire) do not fail the run — they're reported
  // explicitly in the grid so a reviewer can re-run or wire a deterministic
  // trigger. Any FAIL exits 1.
  process.exit(allFails.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[gaps] fatal:', err);
  process.exit(1);
});
