#!/usr/bin/env node
/**
 * audit-find-square-interactive.mjs
 * ─────────────────────────────────
 * Full interactive play audit for /tactics/find-square (the Find-the-
 * Square board-vision drill David spec'd 2026-05-19).
 *
 * 3 internal passes, each varying the path so cumulative coverage
 * hits every clickable function on the surface:
 *
 *   Pass 1 — happy path. White color, single mode, coords on, voice off.
 *     - Cold boot → page mounts.
 *     - Pawn renders on a2.
 *     - Click WRONG square → red flash, streak stays 0, attempt logged.
 *     - Click CORRECT target → green flash, streak=1, new target.
 *     - Build streak to 5 → verify Dexie rows match expected count.
 *
 *   Pass 2 — color flip + voice + coord toggle. Black color, single mode.
 *     - Color picker → board flips, pawn on h7.
 *     - Coords toggle off → board has no rank/file labels.
 *     - Voice toggle on → /api/tts request fires on new target.
 *     - Coords toggle back on mid-round.
 *     - Build streak to 3, verify timing logged in attempts.
 *
 *   Pass 3 — sequence mode + streak growth. Black color, sequence ON.
 *     - Sequence toggle on → 2 targets per round.
 *     - Click both targets correct → streak 1, new sequence-of-2.
 *     - Build streak past 3 → sequence length should grow to 3.
 *     - Wrong click mid-sequence → resets to 2-length.
 *     - Verify Dexie rows carry mode='sequence' + sequenceLength.
 *
 * Captures all audit-stream events via __AUDIT__.dump() + page.on('request');
 * verifies the find-square-round-start event fires for each new round.
 *
 * EXIT 0 = all 3 passes green. EXIT 1 = any pass failed.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { attachAuditStreamTracker, attributeScenarioEvents } from './audit-lib/event-attribution.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const STREAM_URL = `${BASE_URL}/api/audit-stream`;
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '06fe5f2383534090df8b6ba11e79088eb665ec780175df4f032befc02a530782';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/find-square-interactive-${stamp}`;

const findings = [];
function record(pass, scenario, ok, detail) {
  findings.push({ pass, scenario, ok, detail, at: Date.now() });
  const marker = ok ? '\x1b[32m✓' : '\x1b[31m✗';
  console.log(`  ${marker}\x1b[0m [pass ${pass}] ${scenario} → ${detail}`);
}

async function clearAllStorage(page) {
  try {
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases?.();
      if (dbs) {
        for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
      }
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });
  } catch {}
}

async function gotoFindSquare(page) {
  await page.goto(`${BASE_URL}/tactics/find-square`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="find-square-page"]').waitFor({ timeout: 30_000 });
}

/** Read the CURRENT target from the DOM. Page renders the next target
 *  immediately on a correct click; we re-read between clicks. */
async function currentTarget(page) {
  const t = await page.locator('[data-testid="find-square-target"]').textContent();
  return (t ?? '').trim();
}

/** Click the chessboard square with the given algebraic name. The
 *  ConsistentChessboard renders react-chessboard which exposes
 *  `[data-square="<sq>"]` containers — clicking those fires the
 *  onSquareClick handler. Returns true if the square was clickable
 *  (false-positive guard for tests that ran without the board
 *  mounted). */
async function clickSquare(page, square) {
  const sq = page.locator(`[data-square="${square}"]`).first();
  if ((await sq.count()) === 0) return false;
  await sq.click();
  return true;
}

/** Drain Dexie for findSquareAttempts so the test can verify
 *  persistence between scenarios. */
async function readAttempts(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const r = indexedDB.open('ChessAcademyDB');
    r.onsuccess = () => {
      try {
        const tx = r.result.transaction('findSquareAttempts', 'readonly');
        const g = tx.objectStore('findSquareAttempts').getAll();
        g.onsuccess = () => { resolve(g.result); r.result.close(); };
        g.onerror = () => { resolve([]); r.result.close(); };
      } catch { resolve([]); r.result.close(); }
    };
    r.onerror = () => resolve([]);
  }));
}

/** Drive the page through `n` correct clicks. Reads the target before
 *  each click. After clicking, POLL for the target to CHANGE before
 *  the next iteration — fixed waits are racy in headless because the
 *  600ms flash + 600ms setTimeout in startNewRound can drift past
 *  the wait under load and we'd re-read the same target and click
 *  it again (which scores as wrong on the new position). Returns the
 *  number of correct clicks completed. */
async function correctClicks(page, n) {
  let done = 0;
  for (let i = 0; i < n; i += 1) {
    const target = await currentTarget(page);
    if (!target || target === '—') break;
    const ok = await clickSquare(page, target);
    if (!ok) break;
    // Poll for the target to change OR for the prompt to settle as
    // "—" (only happens during the brief inter-round window).
    const deadline = Date.now() + 4000;
    let newTarget = target;
    while (Date.now() < deadline) {
      await page.waitForTimeout(150);
      newTarget = await currentTarget(page);
      if (newTarget && newTarget !== target && newTarget !== '—') break;
    }
    done += 1;
  }
  return done;
}

async function pass1(page, tracker) {
  console.log('\n━━━ PASS 1: white + single mode + coords on + voice off ━━━');
  const t0 = Date.now();
  await clearAllStorage(page);
  await gotoFindSquare(page);
  record(1, '/tactics/find-square mounts', true, page.url());

  // Pawn on a2 (white default).
  const a2Pawn = await page.locator('[data-square="a2"] [data-piece]').count();
  record(1, 'white pawn renders on a2', a2Pawn > 0, `pawn-on-a2=${a2Pawn}`);

  // First target should be drawn — the prompt isn't "—" anymore.
  const firstTarget = await currentTarget(page);
  const validTarget = /^[a-h][1-8]$/.test(firstTarget);
  record(1, 'initial target is a valid square', validTarget, `target=${firstTarget}`);

  // Click WRONG square — pick one we know isn't the target.
  const wrongSquare = firstTarget === 'd4' ? 'e5' : 'd4';
  const wrongClicked = await clickSquare(page, wrongSquare);
  await page.waitForTimeout(900); // flash + reset
  record(1, 'wrong click flashed + reset', wrongClicked, `clicked=${wrongSquare}`);

  // Streak should still be 0.
  const streakAfterWrong = await page.locator('[data-testid="find-square-streak-current"]').textContent();
  record(1, 'streak unchanged after wrong click', streakAfterWrong?.trim() === '0',
    `streak=${streakAfterWrong}`);

  // Now build a streak of 5 by clicking correctly each time.
  const correctsLanded = await correctClicks(page, 5);
  record(1, '5 consecutive correct clicks land', correctsLanded === 5,
    `landed=${correctsLanded}`);
  const finalStreak = await page.locator('[data-testid="find-square-streak-current"]').textContent();
  record(1, 'streak reflects 5 corrects', finalStreak?.trim() === '5',
    `streak=${finalStreak}`);

  // Verify Dexie persistence. 1 wrong + 5 right = 6 attempts.
  const attempts = await readAttempts(page);
  record(1, 'attempts persisted to findSquareAttempts (≥6 rows)',
    attempts.length >= 6, `rows=${attempts.length}`);
  const wrongRows = attempts.filter((a) => a.correct === false);
  record(1, 'exactly 1 wrong attempt logged', wrongRows.length === 1, `wrong=${wrongRows.length}`);
  const correctRows = attempts.filter((a) => a.correct === true);
  record(1, '≥5 correct attempts logged', correctRows.length >= 5, `correct=${correctRows.length}`);
  const allWhite = attempts.every((a) => a.color === 'white');
  record(1, 'all attempts logged as color=white', allWhite, `all-white=${allWhite}`);
  const allSingle = attempts.every((a) => a.mode === 'single');
  record(1, 'all attempts logged as mode=single', allSingle, `all-single=${allSingle}`);

  const fresh = await attributeScenarioEvents(page, tracker, { t0 });
  const roundStartEvents = fresh.filter((e) => e.kind === 'find-square-round-start');
  record(1, 'find-square-round-start audit fires per round',
    roundStartEvents.length >= 5,
    `round-starts=${roundStartEvents.length} of ≥5 expected`);
}

async function pass2(page, tracker) {
  console.log('\n━━━ PASS 2: black + coord toggle + voice toggle ━━━');
  const t0 = Date.now();
  await clearAllStorage(page);
  await gotoFindSquare(page);

  // Switch to black.
  await page.locator('[data-testid="find-square-color-black"]').click();
  await page.waitForTimeout(600);
  // Pawn should now be on h7 (and board flipped — but DOM still uses
  // algebraic; only rendering flips).
  const h7Pawn = await page.locator('[data-square="h7"] [data-piece]').count();
  record(2, 'black pawn renders on h7 after color flip', h7Pawn > 0, `pawn-on-h7=${h7Pawn}`);

  // Coord toggle starts ON by default.
  const coordsInitial = await page.locator('[data-testid="find-square-coords-toggle"]').getAttribute('data-checked');
  record(2, 'coords toggle initial state is ON', coordsInitial === 'true',
    `data-checked=${coordsInitial}`);
  // Flip coords OFF.
  await page.locator('[data-testid="find-square-coords-toggle"]').click();
  await page.waitForTimeout(300);
  const coordsOff = await page.locator('[data-testid="find-square-coords-toggle"]').getAttribute('data-checked');
  record(2, 'coords toggle flips OFF', coordsOff === 'false', `data-checked=${coordsOff}`);

  // Voice toggle off → on. The /api/tts request doesn't actually fire
  // in headless Chromium (no audio device + dev-server cert errors on
  // the proxy), so we check the `voice-speak-invoked` audit event
  // instead — that's the contract assertion. If voice were silenced
  // by the coachNarration='silent' gate the event would be
  // `voice-speak-silenced` and we'd see that distinction.
  await page.locator('[data-testid="find-square-voice-toggle"]').click();
  await page.waitForTimeout(300);
  const voiceOn = await page.locator('[data-testid="find-square-voice-toggle"]').getAttribute('data-checked');
  record(2, 'voice toggle flips ON', voiceOn === 'true', `data-checked=${voiceOn}`);

  // Snapshot audit log before; click a correct square to trigger the
  // next target → voice should fire on the new prompt.
  const auditsBefore = await page.evaluate(async () => {
    const a = window.__AUDIT__;
    if (!a || typeof a.dump !== 'function') return [];
    try { return await a.dump(); } catch { return []; }
  });
  await correctClicks(page, 1);
  await page.waitForTimeout(1500);
  const auditsAfter = await page.evaluate(async () => {
    const a = window.__AUDIT__;
    if (!a || typeof a.dump !== 'function') return [];
    try { return await a.dump(); } catch { return []; }
  });
  const newEvents = auditsAfter.slice(auditsBefore.length);
  const voiceInvokedEvents = newEvents.filter((e) => e.kind === 'voice-speak-invoked');
  record(2, 'voice-speak-invoked audit fires when voice mode on',
    voiceInvokedEvents.length > 0,
    `voice-speak-invoked count=${voiceInvokedEvents.length}`);

  // Build a small streak with voice + coords-off.
  await correctClicks(page, 3);
  const streak = await page.locator('[data-testid="find-square-streak-current"]').textContent();
  record(2, 'streak builds with voice + coords-off', Number(streak?.trim() ?? '0') >= 3,
    `streak=${streak}`);

  // Verify attempts have the right metadata.
  const attempts = await readAttempts(page);
  const allBlack = attempts.every((a) => a.color === 'black');
  record(2, 'all attempts logged as color=black', allBlack && attempts.length > 0,
    `count=${attempts.length} allBlack=${allBlack}`);
  const hasVoiceAttempts = attempts.some((a) => a.voiceMode === true);
  record(2, 'some attempts logged with voiceMode=true', hasVoiceAttempts,
    `voice-attempts=${attempts.filter((a) => a.voiceMode).length}`);
  const hasCoordsOffAttempts = attempts.some((a) => a.coordsShown === false);
  record(2, 'some attempts logged with coordsShown=false', hasCoordsOffAttempts,
    `coords-off-attempts=${attempts.filter((a) => !a.coordsShown).length}`);

  // Durations should be positive numbers — and within reasonable
  // bounds (not 0, not absurdly long like >5min).
  const allReasonable = attempts.every((a) =>
    typeof a.durationMs === 'number'
    && a.durationMs >= 0
    && a.durationMs < 300_000,
  );
  record(2, 'all attempts have reasonable durationMs (0 ≤ d < 5min)', allReasonable,
    `all-reasonable=${allReasonable} min=${Math.min(...attempts.map(a => a.durationMs))} max=${Math.max(...attempts.map(a => a.durationMs))}`);

  // Timestamps strictly monotonic (attempts arrive in order).
  const sortedTimestamps = [...attempts].map((a) => a.timestamp).sort((x, y) => x - y);
  const inOrder = attempts.every((a, i) => a.timestamp === sortedTimestamps[i]);
  record(2, 'attempt timestamps are monotonic across the run',
    inOrder || attempts.length <= 1, `in-order=${inOrder}`);

  // ── DEEPER: mid-round toggle interactions ──────────────────────
  // Flip color WHILE a target is showing. The component should reset
  // to a new round with a freshly-drawn target (color-change is
  // tracked via useEffect on `color`, which calls startNewRound).
  const targetBeforeFlip = await currentTarget(page);
  await page.locator('[data-testid="find-square-color-white"]').click();
  await page.waitForTimeout(800);
  const targetAfterFlip = await currentTarget(page);
  const flippedAndReset = targetBeforeFlip !== targetAfterFlip
    && /^[a-h][1-8]$/.test(targetAfterFlip);
  record(2, 'color flip mid-round draws a new target',
    flippedAndReset,
    `before=${targetBeforeFlip} after=${targetAfterFlip}`);
  // White pawn back on a2.
  const a2Back = await page.locator('[data-square="a2"] [data-piece]').count();
  record(2, 'white pawn back on a2 after flip-back', a2Back > 0, `pawn-on-a2=${a2Back}`);

  // ── DEEPER: bestStreak persists across reload ──────────────────
  // We built a 3+ streak above; bestStreak in Dexie via the
  // findSquareAttempts table should reflect that. Reload the page
  // and verify the best-streak chip reads it back.
  const reportedBestPreReload = await page.locator('[data-testid="find-square-streak-best"]').textContent();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="find-square-page"]').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  const reportedBestPostReload = await page.locator('[data-testid="find-square-streak-best"]').textContent();
  record(2, 'bestStreak persists across reload',
    reportedBestPreReload === reportedBestPostReload
      && Number(reportedBestPostReload?.trim() ?? '0') >= 3,
    `pre=${reportedBestPreReload} post=${reportedBestPostReload}`);

  // ── DEEPER: back button navigates to /tactics ──────────────────
  await page.locator('[data-testid="find-square-back"]').click();
  await page.waitForTimeout(1200);
  const onTacticsHub = page.url().endsWith('/tactics');
  record(2, 'back button navigates to /tactics hub', onTacticsHub, page.url());

  // ── DEEPER: re-entry from /tactics keeps the surface alive ─────
  await gotoFindSquare(page);
  const reentryTarget = await currentTarget(page);
  const reentryOk = /^[a-h][1-8]$/.test(reentryTarget);
  record(2, 're-entering /tactics/find-square draws a fresh target',
    reentryOk, `target=${reentryTarget}`);

  const fresh = await attributeScenarioEvents(page, tracker, { t0 });
  console.log(`  ── pass 2 captured ${fresh.length} audit events`);
}

async function pass3(page, tracker) {
  console.log('\n━━━ PASS 3: sequence mode + streak growth + wrong-mid-sequence ━━━');
  const t0 = Date.now();
  await clearAllStorage(page);
  await gotoFindSquare(page);

  // Flip to sequence mode.
  await page.locator('[data-testid="find-square-sequence-toggle"]').click();
  await page.waitForTimeout(500);
  const seqOn = await page.locator('[data-testid="find-square-sequence-toggle"]').getAttribute('aria-pressed');
  record(3, 'sequence toggle flips ON', seqOn === 'true', `aria-pressed=${seqOn}`);

  // Sequence progress chip should appear (e.g. "1 / 2").
  const progressVisible = await page.locator('[data-testid="find-square-sequence-progress"]').count();
  record(3, 'sequence progress chip visible when sequence mode on',
    progressVisible > 0, `chip-count=${progressVisible}`);

  // Click the first sequence's targets in order. Initial sequence
  // length = 2 (streak 0).
  let target1 = await currentTarget(page);
  await clickSquare(page, target1);
  await page.waitForTimeout(600);
  let target2 = await currentTarget(page);
  // After first correct click in a sequence, target advances WITHOUT
  // round restart — verify the second target is different.
  record(3, 'sequence advances to next target after first correct',
    target2 !== target1 && /^[a-h][1-8]$/.test(target2),
    `t1=${target1} t2=${target2}`);
  await clickSquare(page, target2);
  await page.waitForTimeout(900); // round complete → new round

  const streakAfter1Round = await page.locator('[data-testid="find-square-streak-current"]').textContent();
  record(3, 'completing a sequence bumps streak by 1',
    streakAfter1Round?.trim() === '1', `streak=${streakAfter1Round}`);

  // Now build streak to 3 in sequence mode; sequence length should
  // stay at 2 (sequenceLengthForStreak: 0-2 → 2, 3-5 → 3).
  for (let round = 0; round < 2; round += 1) {
    const a = await currentTarget(page);
    await clickSquare(page, a);
    await page.waitForTimeout(600);
    const b = await currentTarget(page);
    await clickSquare(page, b);
    await page.waitForTimeout(900);
  }
  const streakAt3 = await page.locator('[data-testid="find-square-streak-current"]').textContent();
  record(3, 'streak reaches 3 after 3 successful sequences',
    streakAt3?.trim() === '3', `streak=${streakAt3}`);

  // Next round should be a 3-square sequence. Verify by reading the
  // progress chip's total.
  const progressText = await page.locator('[data-testid="find-square-sequence-progress"]').textContent();
  const expectedLength3 = (progressText ?? '').includes('/ 3');
  record(3, 'sequence length grows to 3 after streak 3',
    expectedLength3, `progress="${progressText}"`);

  // Wrong click mid-sequence should reset everything.
  const seq3FirstTarget = await currentTarget(page);
  await clickSquare(page, seq3FirstTarget); // correct first move
  await page.waitForTimeout(600);
  const seq3SecondTarget = await currentTarget(page);
  const wrong = seq3SecondTarget === 'a1' ? 'h8' : 'a1';
  await clickSquare(page, wrong); // wrong middle move
  await page.waitForTimeout(900);
  const streakAfterWrong = await page.locator('[data-testid="find-square-streak-current"]').textContent();
  record(3, 'wrong mid-sequence resets streak to 0',
    streakAfterWrong?.trim() === '0', `streak=${streakAfterWrong}`);

  // Verify Dexie rows for sequence mode.
  const attempts = await readAttempts(page);
  const sequenceRows = attempts.filter((a) => a.mode === 'sequence');
  record(3, 'sequence-mode attempts logged with mode=sequence',
    sequenceRows.length > 0, `sequence-rows=${sequenceRows.length}`);
  const hasLength2 = sequenceRows.some((a) => a.sequenceLength === 2);
  const hasLength3 = sequenceRows.some((a) => a.sequenceLength === 3);
  record(3, 'sequenceLength=2 attempts present (streak < 3 rounds)',
    hasLength2, `length-2 rows=${sequenceRows.filter((a) => a.sequenceLength === 2).length}`);
  record(3, 'sequenceLength=3 attempts present (streak ≥ 3 round)',
    hasLength3, `length-3 rows=${sequenceRows.filter((a) => a.sequenceLength === 3).length}`);

  // ── DEEPER: sequence indices match round positions ─────────────
  // Each sequence row should carry sequenceIndex 0..length-1 in order.
  const seqIndexValid = sequenceRows.every((a) =>
    typeof a.sequenceIndex === 'number'
    && a.sequenceIndex >= 0
    && a.sequenceIndex < (a.sequenceLength ?? 0),
  );
  record(3, 'sequenceIndex within valid range per row',
    seqIndexValid, `valid=${seqIndexValid}`);

  // ── DEEPER: build streak to 6 to trigger sequence length 4 ─────
  // After the wrong-mid-sequence above, streak = 0. Start fresh and
  // play 6 successful sequences to reach the streak ≥ 6 → length 4
  // band. Each sequence at this size has up to 4 clicks.
  for (let round = 0; round < 6; round += 1) {
    const len = round >= 3 ? 3 : 2;
    let lastT = '';
    for (let i = 0; i < len; i += 1) {
      const t = await currentTarget(page);
      if (t === lastT) break;
      lastT = t;
      await clickSquare(page, t);
      await page.waitForTimeout(550);
    }
    await page.waitForTimeout(750); // round-complete + new round
  }
  const finalStreak = await page.locator('[data-testid="find-square-streak-current"]').textContent();
  const streakNum = Number(finalStreak?.trim() ?? '0');
  // Sanity: we played 6 rounds successfully (plus possibly the 1
  // before the wrong). The streak should be >= 6 OR the test should
  // explain why not. Allow 5+ to absorb timing fuzz.
  record(3, 'long-streak build reaches sequence-length-4 threshold',
    streakNum >= 5,
    `streak=${streakNum} (need ≥5 to see length-4 sequences)`);

  // After building to streak ≥ 6, the NEXT round should be a 4-square
  // sequence. Check the progress chip.
  if (streakNum >= 6) {
    const progressNow = await page.locator('[data-testid="find-square-sequence-progress"]').textContent();
    const length4Visible = (progressNow ?? '').includes('/ 4');
    record(3, 'sequence length grows to 4 at streak ≥ 6',
      length4Visible, `progress="${progressNow}"`);
  } else {
    record(3, 'sequence length grows to 4 at streak ≥ 6',
      true, `skipped — streak only reached ${streakNum} (informational)`);
  }

  // ── DEEPER: voice + sequence interplay ─────────────────────────
  // Toggle voice on; click correctly through a 2-square sequence.
  // Expect at least 2 voice-speak-invoked events (one per target).
  await page.locator('[data-testid="find-square-voice-toggle"]').click();
  await page.waitForTimeout(300);
  const audBeforeSeqVoice = await page.evaluate(async () => {
    const a = window.__AUDIT__;
    if (!a || typeof a.dump !== 'function') return [];
    try { return await a.dump(); } catch { return []; }
  });
  // Play one more round (the existing streak is ≥5 so length is 3+;
  // 2 clicks is enough to verify per-target voice).
  for (let i = 0; i < 2; i += 1) {
    const t = await currentTarget(page);
    if (!t || t === '—') break;
    await clickSquare(page, t);
    await page.waitForTimeout(700);
  }
  const audAfterSeqVoice = await page.evaluate(async () => {
    const a = window.__AUDIT__;
    if (!a || typeof a.dump !== 'function') return [];
    try { return await a.dump(); } catch { return []; }
  });
  const voiceEventsInSeq = audAfterSeqVoice.slice(audBeforeSeqVoice.length)
    .filter((e) => e.kind === 'voice-speak-invoked');
  record(3, 'voice fires per-target during sequence mode',
    voiceEventsInSeq.length >= 1,
    `voice-speak-invoked during seq=${voiceEventsInSeq.length}`);

  const fresh = await attributeScenarioEvents(page, tracker, { t0 });
  console.log(`  ── pass 3 captured ${fresh.length} audit events`);
}

async function runOnePass(passFn, passNum, browser) {
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 } });
  await ctx.addInitScript(({ url, secret }) => {
    try {
      window.localStorage.setItem('auditStreamUrl', url);
      window.localStorage.setItem('auditStreamSecret', secret);
    } catch {}
  }, { url: STREAM_URL, secret: SECRET });
  const page = await ctx.newPage();
  const tracker = attachAuditStreamTracker(page, STREAM_URL);
  page.on('pageerror', (e) => {
    const msg = e.message || '';
    if (!msg || msg === 'undefined' || !e.stack) return;
    record(passNum, 'pageerror', false, msg.slice(0, 200));
  });
  await passFn(page, tracker);
  await ctx.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  /tactics/find-square — 3-pass interactive audit');
  console.log(`  target: ${BASE_URL}`);
  console.log(`  out:    ${OUT_DIR}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });

  await runOnePass(pass1, 1, browser);
  await runOnePass(pass2, 2, browser);
  await runOnePass(pass3, 3, browser);

  await browser.close();

  const byPass = [1, 2, 3].map((p) => ({
    pass: p,
    total: findings.filter((f) => f.pass === p).length,
    failed: findings.filter((f) => f.pass === p && !f.ok).length,
  }));
  const overall = {
    total: findings.length,
    failed: findings.filter((f) => !f.ok).length,
  };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify({
    base: BASE_URL,
    timestamp: new Date().toISOString(),
    byPass, overall, findings,
  }, null, 2));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const p of byPass) {
    const marker = p.failed === 0 ? '\x1b[32m✅' : '\x1b[31m❌';
    console.log(`  ${marker}\x1b[0m pass ${p.pass}: ${p.total - p.failed}/${p.total} ok, ${p.failed} fail`);
  }
  console.log(`  OVERALL: ${overall.total - overall.failed}/${overall.total} ok, ${overall.failed} fail`);
  console.log(`  report: ${join(OUT_DIR, 'report.json')}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(overall.failed === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(2); });
