#!/usr/bin/env node
/**
 * audit-coach-grounded-loop — ADVERSARIAL live stress of the grounded
 * self-knowledge verticals shipped in #779 (David 2026-07-04: "make each pass
 * harder with different questions until it breaks and then we know what to
 * fix"). Focused + FAST: fires only grounded questions (the voiceFacts fast
 * path, ~2s each) at the REAL prod coach, so a full escalating run finishes in
 * minutes instead of the hours the full-brain teach loop takes.
 *
 * Each pass adds a harder batch (canonical → slang → adversarial → state-chaos)
 * and RESHUFFLES. Every break is captured WITH the exact input:
 *   - pageerror / app console error (React key dup, TypeError, …)
 *   - error-fallback reply ("hit a snag" / "say it again")
 *   - silent hang (no new assistant bubble + input stuck past timeout)
 *   - empty reply
 * A break is the deliverable; 3 consecutive clean escalating passes = MET.
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://127.0.0.1:8099 \
 *     node scripts/audit-coach-grounded-loop.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://127.0.0.1:8099';
const MAX_PASSES = Number(process.env.AUDIT_MAX_PASSES ?? 5);
const CLEAN_TARGET = Number(process.env.AUDIT_LOOP_CLEAN_TARGET ?? 3);
const ASK_GAP_MS = Number(process.env.AUDIT_ASK_GAP_MS ?? 2500);
const ANSWER_TIMEOUT_MS = 60_000;
const FALLBACKS = ['hit a snag', 'say it again', 'something went wrong', "couldn't reach"];

// Escalating batches. Pass N fires batches 0..min(N-1, last).
const BATCHES = [
  // batch 0 — canonical grounded
  ['what are my weaknesses?', "what's my rating?", "what's my best opening?", "what's my weakest opening?",
   'how are my tactics?', 'which phase am I weakest in?', 'how often do I blunder?', "what's due for review?",
   'am I better as White or Black?', "what's my puzzle rating?", 'am I improving?', 'what should I work on?'],
  // batch 1 — slang / rephrased / record-vs / move-rating
  ['what am i bad at', "what's my kryptonite", 'how do i do against the Sicilian', 'my record vs the French',
   "what's my w/l in the najdorf", 'my record against Magnus', 'was that a good move', 'rate my last move',
   'am i better at blitz or rapid', 'do i throw away winning positions', 'whats my best scalp', 'assess my chess'],
  // batch 2 — adversarial: multi-intent, contradiction, fidelity-bait, caps, awkward
  ['what are my weaknesses and how do i do against the french and rate my last move',
   'what are my weaknesses no wait my strengths',
   'exactly what percent do i win as white, give me the precise number to two decimals',
   'HOW DO I DO AGAINST THE CARO-KANN', 'was picking that a mistake', 'how do i do against the Hyper Spaghetti Defense',
   "what's my record", 'was that move any good', 'how do i fare vs that player', 'rate my move and also whats my rating'],
  // batch 3 — state chaos: empty, single-char, emoji, very-long, raw-move, punctuation
  ['', '   ', '?', 'k', '🔥', 'weakness'.repeat(60), 'was that a good move???!!!',
   'e4 e5 Nf3', 'wat r my weeknesses', 'record vs', 'how do i do against', 'rate'],
];

const breaks = [];
function logBreak(cls, input, detail = '') {
  breaks.push({ cls, input, detail });
  console.log(`  ❌ BREAK [${cls}] input="${String(input).slice(0, 50)}"${detail ? ` — ${detail}` : ''}`);
}

const consoleErrs = [];
const pageErrs = [];

async function run() {
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'AuditGroundedLoopBot/1.0 (chromium)' });
  await ctx.addInitScript(autoDismissCalibration);
  // Auto-grant AI consent (Apple 5.1.1) so sends aren't blocked by the modal.
  await ctx.addInitScript(() => {
    const sweep = () => { const a = document.querySelector('[data-testid="ai-consent-allow"]'); if (a instanceof HTMLElement) a.click(); };
    const start = () => { if (!document.body) { setTimeout(start, 50); return; } new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true }); sweep(); };
    start(); setInterval(sweep, 400);
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { const s = String(e).slice(0, 160); pageErrs.push(s); });
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/same key|each child|unique "key"|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|Cannot update a component/i.test(t)) consoleErrs.push(t.slice(0, 160));
  });

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 20_000 });
  await waitInputEnabled(page, 60_000);
  await page.waitForTimeout(1500);

  const assistantCount = () => page.evaluate(() => document.querySelectorAll('[data-testid="chat-message-assistant"]').length);

  let cleanStreak = 0;
  for (let pass = 1; pass <= MAX_PASSES && cleanStreak < CLEAN_TARGET; pass++) {
    const topBatch = Math.min(pass - 1, BATCHES.length - 1);
    const pool = [];
    for (let b = 0; b <= topBatch; b++) pool.push(...BATCHES[b].map((t) => ({ t, b })));
    // reshuffle deterministically per pass
    const rand = rng(pass * 2654435761);
    shuffle(pool, rand);
    console.log(`\n[grounded-loop] ===== PASS ${pass} (batches 0..${topBatch}, ${pool.length} asks) =====`);
    const before = breaks.length;

    for (let i = 0; i < pool.length; i++) {
      const { t } = pool[i];
      const beErr = pageErrs.length, ceErr = consoleErrs.length;
      const preCount = await assistantCount().catch(() => 0);
      const label = t === '' ? '(empty)' : t === '   ' ? '(whitespace)' : t.slice(0, 46);
      process.stdout.write(`  [P${pass} ${i + 1}/${pool.length}] "${label}" … `);

      try {
        await typeAndSend(page, t);
      } catch (e) {
        console.log('send-failed'); logBreak('send-failed', t, String(e).slice(0, 80)); continue;
      }

      // Empty/whitespace are correct no-ops — assert NO new bubble + no error.
      const isNoop = t.trim() === '';
      const got = await waitForReply(page, preCount, isNoop ? 4000 : ANSWER_TIMEOUT_MS).catch(() => false);

      const newPage = pageErrs.length - beErr, newConsole = consoleErrs.length - ceErr;
      if (newPage > 0) logBreak('pageerror', t, pageErrs[pageErrs.length - 1]);
      if (newConsole > 0) logBreak('console-error', t, consoleErrs[consoleErrs.length - 1]);

      if (isNoop) {
        // A no-op should NOT produce a reply and should NOT error.
        console.log(got ? 'replied(!)' : 'no-op ok');
        // a spurious reply to empty is not a hard break; note only if it errored (handled above)
      } else if (!got) {
        // Distinguish silent-hang from error-fallback by scanning last bubble.
        const last = await lastAssistantText(page).catch(() => '');
        if (FALLBACKS.some((f) => last.toLowerCase().includes(f))) { console.log('error-fallback'); logBreak('error-fallback', t, last.slice(0, 80)); }
        else { console.log('silent-hang'); logBreak('silent-hang', t); }
      } else {
        const last = await lastAssistantText(page).catch(() => '');
        if (FALLBACKS.some((f) => last.toLowerCase().includes(f))) { console.log('error-fallback'); logBreak('error-fallback', t, last.slice(0, 80)); }
        else if (!last.trim()) { console.log('empty-reply'); logBreak('empty-reply', t); }
        else console.log(`ok (${last.length}c)`);
      }

      await page.waitForTimeout(ASK_GAP_MS);
    }

    // Rapid double-submit chaos on the hardest passes (fire two before settle).
    if (pass >= 3) {
      console.log(`  [P${pass}] rapid double-submit chaos`);
      const beErr = pageErrs.length, ceErr = consoleErrs.length;
      try {
        await typeAndSend(page, 'what are my weaknesses?');
        await page.waitForTimeout(200);
        await typeAndSend(page, "what's my rating?").catch(() => {});
        await page.waitForTimeout(ANSWER_TIMEOUT_MS / 2);
      } catch { /* */ }
      if (pageErrs.length > beErr) logBreak('pageerror', 'rapid-double-submit', pageErrs[pageErrs.length - 1]);
      if (consoleErrs.length > ceErr) logBreak('console-error', 'rapid-double-submit', consoleErrs[consoleErrs.length - 1]);
    }

    const passBreaks = breaks.length - before;
    if (passBreaks === 0) { cleanStreak++; console.log(`[grounded-loop] PASS ${pass} clean (streak ${cleanStreak}/${CLEAN_TARGET})`); }
    else { cleanStreak = 0; console.log(`[grounded-loop] PASS ${pass} — ${passBreaks} break(s), streak reset`); }
  }

  await browser.close();
}

async function typeAndSend(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ timeout: 20_000 });
  await input.fill(text);
  const btn = page.locator('[data-testid="chat-send-btn"]');
  if (await btn.isEnabled().catch(() => false)) await btn.click({ force: true });
  else await input.press('Enter');
}

async function waitForReply(page, preCount, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const c = await page.evaluate(() => document.querySelectorAll('[data-testid="chat-message-assistant"]').length).catch(() => preCount);
    if (c > preCount) return true; // a new assistant bubble appeared
    await page.waitForTimeout(500);
  }
  return false;
}

async function lastAssistantText(page) {
  return page.evaluate(() => {
    const msgs = [...document.querySelectorAll('[data-testid="chat-message-assistant"]')];
    return msgs.length ? (msgs[msgs.length - 1].innerText || '') : '';
  });
}

async function waitInputEnabled(page, timeout) {
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="chat-text-input"]');
    return (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) && !el.disabled;
  }, { timeout }).catch(() => {});
}

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; }; }
function shuffle(a, rand) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

await run();
console.log(`\n===== GROUNDED STRESS COMPLETE =====`);
console.log(`${breaks.length} break(s) · ${pageErrs.length} pageerror · ${consoleErrs.length} console-error`);
if (breaks.length) {
  console.log('\nBREAKS:');
  for (const b of breaks) console.log(`  [${b.cls}] "${String(b.input).slice(0, 60)}" ${b.detail ? `— ${b.detail}` : ''}`);
}
process.exit(breaks.length ? 1 : 0);
