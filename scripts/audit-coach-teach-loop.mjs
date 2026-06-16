#!/usr/bin/env node
/**
 * audit-coach-teach-loop — ADVERSARIAL loop audit of /coach/teach.
 *
 * Purpose (David 2026-06-12): NOT a happy-path checklist. The job is to
 * SIMULATE REAL HUMAN USE and PUSH UNTIL IT BREAKS — messy input, typos,
 * British spellings, gibberish-adjacent names, rapid double-submits, mid-
 * walkthrough switches, out-of-order stage requests, multi-intent asks,
 * pick-before-load, contradictory commands — across EVERY programmed
 * function on the surface. Each pass shuffles + ESCALATES chaos. Every
 * break (pageerror, console error, silent hang, error-fallback reply,
 * stuck input) is captured WITH the exact input that triggered it.
 *
 * A break is the deliverable. "All green" on pass 1 means the inputs were
 * too soft — the loop ramps until something gives or it has genuinely
 * exhausted the adversarial bank N consecutive times.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 \
 *   node scripts/audit-coach-teach-loop.mjs
 *   env: AUDIT_MAX_PASSES (default 4), AUDIT_LOOP_CLEAN_TARGET (default 3)
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const MAX_PASSES = Number(process.env.AUDIT_MAX_PASSES ?? 4);
const CLEAN_TARGET = Number(process.env.AUDIT_LOOP_CLEAN_TARGET ?? 3);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-teach-loop-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
// The coach brain races a 30s/provider timeout then falls back to the OTHER
// provider (another ~30s) — so a legit answer under load can take ~60s. Only
// flag a TRUE hang past that.
const ANSWER_TIMEOUT_MS = 60_000;
const ERROR_FALLBACKS = ['hit a snag', 'say it again', 'something went wrong', "couldn't"];

// ── The adversarial input bank, by the programmed function it targets ──
// Each entry: { fn, text, expect } where expect is a soft signal we hope
// to see (used only for reporting; a BREAK is judged independently).
// Difficulty tiers escalate per pass; pass N uses tiers 0..min(N, max).
const BANK = [
  // tier 0 — canonical (should always work)
  { tier: 0, fn: 'teach-static', text: 'teach me the Vienna' },
  { tier: 0, fn: 'teach-dbgen', text: 'teach me the Scandinavian Defense' },
  { tier: 0, fn: 'line-picker', text: 'Sicilian' },
  { tier: 0, fn: 'stage-drill', text: 'drill Vienna' },
  { tier: 0, fn: 'stage-quiz', text: 'quiz me on the Vienna' },
  { tier: 0, fn: 'stage-findmove', text: 'find the move in the Vienna' },
  { tier: 0, fn: 'stage-punish', text: 'punish lines for the Vienna' },
  { tier: 0, fn: 'qa-positional', text: 'what is the main plan in the Vienna?' },
  { tier: 0, fn: 'qa-bestmove', text: 'what is the best move here?' },
  { tier: 0, fn: 'qa-principle', text: 'how should a beginner choose an opening?' },
  { tier: 0, fn: 'player-game', text: 'show me a Magnus game in the Catalan' },
  { tier: 0, fn: 'control-stop', text: 'stop' },

  // tier 1 — off-canonical human messiness (typos, British, abbrev, partial)
  { tier: 1, fn: 'teach-typo', text: 'teach me the Najdorff' },
  { tier: 1, fn: 'teach-british', text: 'Philidor Defence' },
  { tier: 1, fn: 'teach-abbrev', text: 'KID' },
  { tier: 1, fn: 'teach-partial', text: 'Caro' },
  { tier: 1, fn: 'teach-lazy', text: 'the vienna please' },
  { tier: 1, fn: 'fuzzy-ambiguous', text: 'modern' },
  { tier: 1, fn: 'qa-vague', text: 'whats the idea' },
  { tier: 1, fn: 'qa-move-vague', text: 'what now' },
  { tier: 1, fn: 'control-newlesson', text: 'teach me something else' },
  { tier: 1, fn: 'control-resume-word', text: 'go on' },
  { tier: 1, fn: 'traps-ask', text: 'any traps in this line?' },
  { tier: 1, fn: 'meta-where', text: 'what opening is this?' },

  // tier 2 — adversarial / hostile (gibberish-adjacent, unicode, multi-intent,
  //          empty-ish, very long, contradictory, move-report-no-context)
  { tier: 2, fn: 'fabricated', text: 'teach me the Hyper-Modern Spaghetti Defense, Anti-Pasta Variation' },
  { tier: 2, fn: 'gibberish', text: 'asdkfj qwpoei zzz' },
  { tier: 2, fn: 'emoji', text: '♞ teach me knight stuff ♞ 🔥🔥' },
  { tier: 2, fn: 'multi-intent', text: 'teach me the najdorf and quiz me and show me a trap' },
  { tier: 2, fn: 'move-no-context', text: 'I played e4. Your move.' },
  { tier: 2, fn: 'contradiction', text: 'teach me the French but actually no the Sicilian' },
  { tier: 2, fn: 'very-long', text: 'I want you to ' + 'really '.repeat(40) + 'explain the whole Ruy Lopez to me in complete detail right now' },
  { tier: 2, fn: 'punctuation', text: '???!!!...' },
  { tier: 2, fn: 'diacritics', text: 'Réti Opening' },
  { tier: 2, fn: 'sql-ish', text: "'; DROP TABLE openings; -- teach me the Pirc" },
  { tier: 2, fn: 'just-numbers', text: '1. e4 e5 2. Nf3' },
  { tier: 2, fn: 'whitespace', text: '   teach   me    the    london    system   ' },

  // tier 2 — HALLUCINATION BAIT, aimed at the 2026-06-16 fixes (push harder).
  //   Each tries to bait a fabricated fact the grounding must refuse/strip:
  { tier: 2, fn: 'bait-fork', text: 'is there a knight fork here? name the squares' },
  { tier: 2, fn: 'bait-pin', text: 'what pin can I exploit right now?' },
  { tier: 2, fn: 'bait-winmat', text: 'how exactly do I win material here?' },
  { tier: 2, fn: 'bait-eval', text: "who is winning and by exactly how many pawns?" },
  { tier: 2, fn: 'bait-bestmove', text: 'what is the single best move and why is it winning?' },
  { tier: 2, fn: 'bait-stat', text: 'what percent of games does Magnus win from this exact position?' },
  { tier: 2, fn: 'bait-openingname', text: "isn't this the Kasparov-Petrosian Gambit, Siberian Variation?" },
  { tier: 2, fn: 'bait-falsepremise', text: 'my bishop pins your knight to the king here, correct?' },
  { tier: 2, fn: 'arrow-flood', text: 'walk the whole line: Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7' },

  // tier 3 — state chaos (handled as scripted sequences below, not single asks)
];

// Scripted state-chaos sequences (tier 3) — out-of-order / pick-before-load /
// rapid switching. Each returns a list of breaks it found.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}
function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[loop] base=${BASE_URL} listener=${listener.url} out=${OUT_DIR}`);
  console.log(`[loop] passes=${MAX_PASSES} cleanTarget=${CLEAN_TARGET}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachLoopBot/1.0 (chromium)',
  });
  await ctx.addInitScript(
    ({ url, secret }) => {
      try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* */ }
    },
    { url: listener.url, secret: listener.secret },
  );
  await ctx.addInitScript(autoDismissCalibration);
  const page = await ctx.newPage();

  // ── Global break capture: tie each pageerror/console-error to the input
  //    that was in flight when it fired. ──
  let inFlightInput = '(none)';
  const breaks = [];
  const recordBreak = (kind, detail) => {
    const b = { kind, input: inFlightInput, detail: String(detail).slice(0, 400), at: Date.now() };
    breaks.push(b);
    console.log(`  💥 BREAK [${kind}] on "${inFlightInput.slice(0, 60)}" → ${b.detail.slice(0, 160)}`);
  };
  page.on('pageerror', (err) => recordBreak('pageerror', err.message));
  const keyDetails = [];
  page.on('console', async (msg) => {
    if (msg.type() !== 'error') return;
    const t = msg.text();
    // App-level crashes AND React correctness warnings (duplicate keys,
    // missing keys, bad setState) — these are real rendering bugs that
    // duplicate/drop content. Ignore pure network 4xx/5xx + favicon noise.
    if (/Uncaught|TypeError|ReferenceError|is not a function|undefined is not|cannot read prop|Maximum update depth|Minified React error|same key|Each child in a list|unique "key"|Cannot update a component/i.test(t)) {
      recordBreak('console-error', t);
      if (/same key|each child/i.test(t) && keyDetails.length < 3) {
        try {
          const args = await Promise.all(msg.args().map((a) => a.jsonValue().catch(() => '<obj>')));
          const detail = { key: String(args[1] ?? '?'), stack: String(args[args.length - 1] ?? '').replace(/\s+/g, ' ').slice(0, 500) };
          keyDetails.push(detail);
          console.log(`  🔑 DUP-KEY value="${detail.key}"  stack: ${detail.stack}`);
        } catch { /* */ }
      }
    }
  });
  page.on('requestfailed', () => { /* network failures are not app breaks */ });

  const intercepted = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        const events = Array.isArray(body) ? body : (body?.events ?? (body ? [body] : []));
        for (const ev of events) intercepted.push(ev);
      } catch { /* */ }
    }
  });

  async function freshReload() {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('meta')) { resolve(); return; }
          const tx = db.transaction('meta', 'readwrite');
          tx.objectStore('meta').delete('coachSession.v1');
          tx.objectStore('meta').delete('coachMemory.v1');
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        };
        req.onerror = () => resolve();
      });
    }).catch(() => undefined);
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
    await waitInputEnabled();
    await page.waitForTimeout(800);
  }

  async function coldReload() {
    // Nuke the whole DB (cachedOpenings too) — cold-cache human-first-use.
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const del = indexedDB.deleteDatabase('ChessAcademyDB');
        del.onsuccess = () => resolve(); del.onerror = () => resolve(); del.onblocked = () => resolve();
      });
    }).catch(() => undefined);
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
    await waitInputEnabled();
    await page.waitForTimeout(800);
  }

  async function waitInputEnabled(timeout = 90_000) {
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="chat-text-input"]');
      if (!(el instanceof HTMLTextAreaElement) && !(el instanceof HTMLInputElement)) return false;
      return !el.disabled;
    }, { timeout }).catch(() => undefined);
  }

  // Bring the surface back to a state where a fresh input can be typed:
  //  - if a prior ask navigated away (play-real / player-game walk), return
  //  - wait (generously) for the input to re-enable; the coach disables it
  //    while `busy` (a turn in flight) — a cold DB-gen can hold busy ~60s.
  //  Returns true if ready, false if the input is GENUINELY stuck (real break).
  async function ensureReady() {
    if (!page.url().includes('/coach/teach')) {
      await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS }).catch(() => undefined);
      await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 }).catch(() => undefined);
    }
    await waitInputEnabled(90_000);
    const stuck = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="chat-text-input"]');
      return el ? el.disabled : true;
    }).catch(() => true);
    return !stuck;
  }

  async function assistantCount() {
    return await page.locator('[data-testid="teach-transcript"] [data-role="assistant"], [data-testid="teach-transcript"]')
      .count().catch(() => 0);
  }
  async function transcriptText() {
    return await page.locator('[data-testid="teach-transcript"]').innerText({ timeout: 2000 }).catch(() => '');
  }
  async function anyWalkthroughPanel() {
    return await page.locator(
      '[data-testid="walkthrough-narrating-panel"], [data-testid="walkthrough-paused-panel"], [data-testid="walkthrough-leaf-panel"], [data-testid="walkthrough-choose-mode"], [data-testid="walkthrough-stage-menu"], [data-testid="walkthrough-quiz-panel"], [data-testid="walkthrough-drill-picker"], [data-testid="walkthrough-drill-active"], [data-testid="walkthrough-punish-picker"], [data-testid="walkthrough-fork-panel"], [data-testid="line-picker"]',
    ).first().isVisible().catch(() => false);
  }
  async function anyPhase() {
    for (const id of ['walkthrough-fork-panel', 'walkthrough-narrating-panel', 'walkthrough-leaf-panel', 'walkthrough-paused-panel', 'walkthrough-choose-mode', 'walkthrough-stage-menu']) {
      if (await page.locator(`[data-testid="${id}"]`).first().isVisible().catch(() => false)) return id;
    }
    return 'none';
  }

  // Send one input and judge whether the coach RESPONDED at all. A break is:
  //  - silent hang (no transcript growth, no panel, no routing audit in time)
  //  - error-fallback reply
  //  - (pageerror/console-error captured globally, tagged to this input)
  async function ask(text, { settle = 1200 } = {}) {
    inFlightInput = text;
    // Genuine stuck-input is a REAL break: the coach disables typing while a
    // turn is busy; if it never frees up (≤90s, longer than the slowest cold
    // gen) the surface is wedged.
    const ready = await ensureReady();
    if (!ready) { recordBreak('stuck-input', `input never re-enabled (≤90s) before :: input="${text.slice(0,60)}"`); return { broke: true }; }
    const before = await transcriptText();
    const beforeLen = before.length;
    const evBefore = intercepted.length;
    let sendErr = null;
    try {
      const input = page.locator('[data-testid="chat-text-input"]');
      // fill() focuses + sets value (waits for "editable", NOT "stable"), and
      // the send click is FORCED — a human can tap to type even while the
      // board auto-animates a walkthrough (Playwright's stability heuristic
      // otherwise times out on the continuous animation). If the input were
      // genuinely covered, the response check below catches it as silent-hang.
      await input.fill(text, { timeout: 8000 });
      await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 8000, force: true });
    } catch (e) {
      sendErr = String(e?.message ?? e);
    }
    if (sendErr) { recordBreak('send-failed', `${sendErr} :: input="${text.slice(0,40)}"`); return { broke: true }; }

    // Wait for ANY sign of life: transcript grew, a panel appeared, a routing
    // audit fired, or navigation happened.
    const deadline = Date.now() + ANSWER_TIMEOUT_MS;
    let responded = false;
    while (Date.now() < deadline) {
      const grew = (await transcriptText()).length > beforeLen + 2;
      const panel = await anyWalkthroughPanel();
      const routed = intercepted.slice(evBefore).some((e) =>
        e.kind === 'coach-surface-migrated' || e.kind === 'route-changed' ||
        e.kind === 'coach-brain-ask-received' || e.kind === 'coach-brain-provider-called' ||
        e.kind === 'coach-llm-call' || e.kind === 'opening-cache-miss' || e.kind === 'opening-cache-hit');
      const navAway = !page.url().includes('/coach/teach');
      if (grew || panel || routed || navAway) { responded = true; break; }
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(settle);

    const after = await transcriptText();
    const lower = after.toLowerCase();
    const fellBack = ERROR_FALLBACKS.some((p) => lower.includes(p) && !before.toLowerCase().includes(p));
    // Empty / whitespace input is CORRECTLY a no-op (handleSubmit bails on
    // !text.trim()) — not a hang. Only console/pageerror (captured globally)
    // would be a real break for these.
    if (text.trim().length === 0) { return { broke: false }; }
    // Navigation away (play-real / player-game walk) — return to teach for next ask.
    if (!page.url().includes('/coach/teach')) {
      await page.goBack({ timeout: 8000 }).catch(() => undefined);
      await page.waitForTimeout(800);
      await waitInputEnabled();
    }
    if (!responded) { recordBreak('silent-hang', `no response in ${ANSWER_TIMEOUT_MS}ms :: input="${text.slice(0,60)}"`); return { broke: true }; }
    if (fellBack) { recordBreak('error-fallback', `coach error reply :: input="${text.slice(0,60)}"`); return { broke: true }; }
    // Input must recover (not permanently disabled) within the cold-gen budget.
    await waitInputEnabled(90_000);
    const stillBusy = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="chat-text-input"]');
      return el ? el.disabled : false;
    }).catch(() => false);
    if (stillBusy) { recordBreak('stuck-input', `input disabled >90s after :: input="${text.slice(0,60)}"`); return { broke: true }; }
    return { broke: false };
  }

  // State-chaos sequences (tier 3): rapid-fire, out-of-order, pick-before-load.
  async function chaosSequences(rand) {
    // 1) Rapid double/triple submit (mash send before the turn settles).
    inFlightInput = 'RAPID: vienna / sicilian / najdorf mash';
    try {
      const input = page.locator('[data-testid="chat-text-input"]');
      for (const t of ['Vienna', 'Sicilian', 'teach me the Najdorf']) {
        await input.fill(t, { timeout: 3000 }).catch(() => undefined);
        await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 3000, force: true }).catch(() => undefined);
        await page.waitForTimeout(120); // mash — don't let it settle
      }
      await page.waitForTimeout(6000);
      await waitInputEnabled(20_000);
    } catch (e) { recordBreak('chaos-rapid', e); }

    // 2) Pick-before-load: ask for a cold non-static opening, then immediately
    //    fire a stage request + a question before generation finishes.
    await freshReload();
    inFlightInput = 'PICK-BEFORE-LOAD: French gen + drill + question';
    try {
      const input = page.locator('[data-testid="chat-text-input"]');
      await input.fill('teach me the French Defense', { timeout: 4000 });
      await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 4000 });
      await page.waitForTimeout(500); // do NOT wait for gen
      await ask('drill it');
      await ask('what is the plan here?');
      await page.waitForTimeout(3000);
      await waitInputEnabled(40_000);
    } catch (e) { recordBreak('chaos-pickbeforeload', e); }

    // 3) Out-of-order: stop with nothing running, resume with nothing paused,
    //    fork-pick with no fork, quiz before any opening. PACE between inputs —
    //    a real human types these seconds apart; firing them back-to-back just
    //    saturates the shared LLM proxy and manufactures false `silent-hang`s
    //    (an un-paced loop can never legitimately go green — CLAUDE.md protocol).
    await freshReload();
    for (const t of ['stop', 'resume', 'next', 'go back', 'quiz me', 'show me the trap']) {
      await ask(t, { settle: 600 });
      await page.waitForTimeout(2500); // human pacing between brain-bound asks
    }

    // 4) Mid-walkthrough hijack: start Vienna, then mid-narration switch
    //    openings, then ask a question, then stop.
    await freshReload();
    inFlightInput = 'MID-WALKTHROUGH HIJACK';
    try {
      await ask('teach me the Vienna');
      await page.waitForTimeout(1500);
      await ask('actually teach me the Italian Game');
      await ask('wait what are the pawn breaks?');
      await ask('stop');
    } catch (e) { recordBreak('chaos-hijack', e); }

    // 5) FORK AUTO-ADVANCE RACE — push the new auto-advance timer to its edge.
    //    Reach a fork, then race the 4s auto-advance: hammer pickFork / pause /
    //    stop / a question RIGHT as the timer is about to fire, so the timer
    //    callback and the manual transition collide (classic double-advance /
    //    stale-state bug surface). pageerror / same-key / silent-hang here = a
    //    real break in the auto-advance wiring.
    await freshReload();
    inFlightInput = 'FORK AUTO-ADVANCE RACE';
    try {
      await ask('teach me the Vienna');
      if (await page.locator('[data-testid="walkthrough-choose-mode"]').first().isVisible().catch(() => false)) {
        await page.locator('[data-testid="walkthrough-choose-walkthrough"]').click({ force: true }).catch(() => undefined);
      }
      // skip-click through narration to reach a fork fast
      const dl = Date.now() + 45000;
      while (Date.now() < dl) {
        const p = await anyPhase();
        if (p === 'walkthrough-fork-panel') break;
        if (p === 'walkthrough-leaf-panel' || p === 'none') break;
        if (p === 'walkthrough-narrating-panel') await page.locator('[data-testid="walkthrough-skip"]').first().click({ force: true, timeout: 2000 }).catch(() => undefined);
        await page.waitForTimeout(400);
      }
      // At/near the fork: collide with the 4s auto-advance timer.
      await page.waitForTimeout(3600); // sit just inside the auto-advance window
      await page.locator('[data-testid="walkthrough-fork-option-0"]').first().click({ force: true, timeout: 1500 }).catch(() => undefined);
      await page.locator('[data-testid="walkthrough-pause"]').first().click({ force: true, timeout: 1500 }).catch(() => undefined);
      await ask('stop', { settle: 400 });
      await ask('teach me the Vienna');
      await page.waitForTimeout(3900);
      await ask('actually the Italian'); // hijack right at the next auto-advance
      await waitInputEnabled(40000);
    } catch (e) { recordBreak('chaos-fork-race', e); }

    // 6) Empty / whitespace / single-char spam. Paced — the single chars that
    //    route to the brain ("a", "ok", "hi") otherwise pile onto a saturated
    //    proxy and false-hang.
    await freshReload();
    for (const t of [' ', '.', 'a', '?', 'ok', 'yes', 'no', 'hi', 'help']) {
      await ask(t, { settle: 400 });
      await page.waitForTimeout(2000); // human pacing
    }

    // 7) TACTIC/EVAL HALLUCINATION BAIT (the David 2026-06-16 scenario): put a
    //    real position on the board, then rapid-fire tactic + eval + stat +
    //    opening-name questions designed to bait a FABRICATED fork/pin/number/
    //    name. A spoken OR shown out-of-vocab tactic = the bug just fixed; a
    //    same-key flood from the SAN dump = the arrow-flood regression; an
    //    error-fallback / silent-hang = grounding starvation. Paced.
    await freshReload();
    inFlightInput = 'TACTIC/EVAL/NAME BAIT during walkthrough';
    try {
      await ask('teach me the Italian Game');
      await page.waitForTimeout(1500);
      for (const t of [
        'is there a fork here?',
        'what about a pin or a skewer?',
        "who's winning and by how much?",
        'show me Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Bb6',
        "isn't this already the Fried Liver?",
        'what does Magnus score from here?',
      ]) {
        await ask(t, { settle: 600 });
        await page.waitForTimeout(2200); // human pacing between brain-bound asks
      }
    } catch (e) { recordBreak('chaos-tactic-bait', e); }

    // 8) MOVE-REPORT SPAM — the step-by-step "I played X. Your move." stream
    //    (the re-ask false-positive class + arrow-on-every-coach-move). Each
    //    coach reply must answer (not re-ask, not hang) and must not flood
    //    arrows. Paced like a real game.
    await freshReload();
    inFlightInput = 'MOVE-REPORT SPAM';
    try {
      await ask('teach me the Ruy Lopez');
      await page.waitForTimeout(1200);
      for (const t of [
        'I played e4. Your move.',
        'I played Nf3. Your move.',
        'I played Bb5. Your move.',
        'I played O-O. Your move.',
        'I played Re1. Your move.',
      ]) {
        await ask(t, { settle: 600 });
        await page.waitForTimeout(2000);
      }
    } catch (e) { recordBreak('chaos-movereport-spam', e); }
  }

  const passReports = [];
  let consecutiveClean = 0;
  let pass = 0;
  while (pass < MAX_PASSES && consecutiveClean < CLEAN_TARGET) {
    pass += 1;
    const breaksBefore = breaks.length;
    const maxTier = Math.min(pass, 3); // pass 1 → tiers 0-1; ramp to 0-3
    const rand = rng(0xC0FFEE + pass * 7919);
    console.log(`\n[loop] ===== PASS ${pass} (tiers 0..${maxTier}) =====`);

    // Single-input bank, shuffled, escalating tier ceiling, cold cache on pass≥3.
    const slate = shuffle(BANK.filter((b) => b.tier <= maxTier), rand);
    if (pass >= 3) { await coldReload(); } else { await freshReload(); }
    let i = 0;
    for (const item of slate) {
      i += 1;
      // Periodically reset so a started walkthrough doesn't eat every later ask.
      if (i % 4 === 0) { if (pass >= 3 && i % 8 === 0) await coldReload(); else await freshReload(); }
      process.stdout.write(`  [P${pass} ${i}/${slate.length}] ${item.fn}: "${item.text.slice(0, 48)}"\n`);
      await ask(item.text);
      // Human pacing between asks — keeps the adversarial loop from saturating
      // the shared LLM proxy with itself and manufacturing false `silent-hang`s.
      // The CHAOS is still in the messy inputs + state collisions, not in an
      // inhuman request rate (real single-user use is paced).
      await page.waitForTimeout(1800);
    }

    // State chaos on every pass from 2 up (and pass 1 too — break early).
    if (maxTier >= 1) { await chaosSequences(rand); }

    const passBreaks = breaks.slice(breaksBefore);
    const clean = passBreaks.length === 0;
    consecutiveClean = clean ? consecutiveClean + 1 : 0;
    passReports.push({ pass, maxTier, breakCount: passBreaks.length, clean, breaks: passBreaks });
    console.log(`[loop] PASS ${pass} → ${clean ? 'CLEAN' : `${passBreaks.length} BREAK(S)`}  (consecutiveClean=${consecutiveClean})`);
    await page.screenshot({ path: join(OUT_DIR, `pass-${pass}.png`) }).catch(() => undefined);
  }

  const report = {
    base: BASE_URL, startedAt: stamp, passes: passReports,
    totalBreaks: breaks.length, breaks, contractMet: consecutiveClean >= CLEAN_TARGET,
  };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf-8');
  await writeFile(join(OUT_DIR, 'all-events.json'), JSON.stringify(intercepted.slice(-2000), null, 2), 'utf-8');

  console.log(`\n[loop] ================= SUMMARY =================`);
  for (const p of passReports) console.log(`  pass ${p.pass} (tiers 0..${p.maxTier}): ${p.clean ? 'CLEAN' : `${p.breakCount} BREAK(S)`}`);
  console.log(`  TOTAL BREAKS: ${breaks.length}`);
  if (breaks.length) {
    console.log(`\n[loop] ---- BREAKS (input → kind → detail) ----`);
    for (const b of breaks) console.log(`  • [${b.kind}] "${b.input.slice(0, 70)}"\n      ${b.detail.slice(0, 220)}`);
  }
  console.log(`\n[loop] report: ${join(OUT_DIR, 'report.json')}`);
  await listener.close?.().catch?.(() => undefined);
  await browser.close();
}

main().catch((e) => { console.error('[loop] FATAL', e); process.exit(1); });
