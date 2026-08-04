/**
 * audit-coach-discovery-prod — post-deploy smoke for the Learn-with-Coach
 * DISCOVERY feature (David 2026-07-04): the rotating greeting + the grounded
 * suggested-question pickers. Client-side only (coachGreetings.ts + ChatInput
 * coach-choice-chips) so it needs NO provider key — verifies the new bundle
 * mounts /coach/teach and the greeting + chips render without console errors.
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-coach-discovery-prod.mjs
 *
 * NB: the grounded ANSWERS + the voiceFacts correctness net need a provider
 * key to exercise and are NOT covered here — that's the keyed on-device step.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startProdBridge } from './audit-lib/prod-bridge.mjs';

// The rotating greeting pool (kept in sync with src/data/coachGreetings.ts).
const COACH_GREETINGS = [
  "What are we working on today?",
  "Good to see you. What's on your mind — an opening, your weak spots, a position?",
  "Ready when you are. Ask me about your game, or pick a line to drill.",
  "Back at the board. What would you like to sharpen today?",
  "Let's get to work. Curious about your stats, your openings, or a specific move?",
  "What can I help you with? Your weaknesses, a new opening, or a game to review?",
];

const results = [];
const errs = [];

// Chromium's HTTPS to prod RESETS through this container's egress proxy, so
// route it through the local prod-bridge (real prod bundle + API over HTTP).
const bridge = await startProdBridge(8099);
const BASE = bridge.url;
console.log(`bridging ${bridge.prod} → ${BASE}`);

const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs
const page = await ctx.newPage();
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|same key|Maximum update depth/i.test(t)) errs.push(t.slice(0, 160));
});
page.on('pageerror', (e) => errs.push(`pageerror: ${String(e).slice(0, 160)}`));

function check(name, ok, detail = '') { results.push({ name, ok, detail }); console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`); }

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // The greeting is spoken/shown on kickoff. Wait for an assistant bubble.
  const greetingSel = '[data-testid="chat-message"], .prose, [class*="message"]';
  await page.waitForTimeout(6000); // kickoff + render
  const bodyText = await page.evaluate(() => document.body.innerText);

  const matchedGreeting = COACH_GREETINGS.find((g) => bodyText.includes(g)) ?? null;
  check('rotating greeting rendered (one of the pool, not the old static line)', !!matchedGreeting, matchedGreeting ? `"${matchedGreeting.slice(0, 40)}…"` : `none found; body starts: "${bodyText.slice(0, 80)}"`);
  check('old "welcome to my classroom" line is GONE', !/welcome to my classroom/i.test(bodyText));

  // Suggested-question chips.
  const chip0 = await page.$('[data-testid="coach-choice-chip-0"]');
  check('suggested-question pickers render (coach-choice-chip-0)', !!chip0);
  if (chip0) {
    const chipText = (await chip0.innerText()).trim();
    check('chip carries a real question', chipText.length > 3, `"${chipText}"`);
  }

  check('no app-level console/page errors during mount', errs.length === 0, errs.slice(0, 3).join(' | '));
  void greetingSel;
} catch (e) {
  check('audit ran to completion', false, String(e).slice(0, 160));
} finally {
  await browser.close();
  await bridge.close();
}

const pass = results.filter((r) => r.ok).length;
console.log(`\n${pass}/${results.length} checks green${errs.length ? ` · ${errs.length} console/page errors` : ''}`);
process.exit(pass === results.length ? 0 : 1);
