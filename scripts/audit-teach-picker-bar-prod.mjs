// UNDER-BOARD IN-GAME PICKER BAR (David 2026-08-26: "move the picker up to just
// under the board … right where it says the player name and elo … no scrolling
// needed to see the options").
//
// The bug it verifies the fix for: on /coach/teach with the board at the top of
// the screen, the fork picker rendered inside the bottom WalkthroughControls —
// BELOW the chat text field, off the bottom of the screen. The walkthrough
// looked like it silently stopped; the user never saw the decision options.
//
// THE ASSERTION: when a live walkthrough reaches a fork, the picker renders in
// the under-board bar (data-testid="walkthrough-fork-bar"), and that bar sits
// ABOVE the chat input vertically — i.e. it was hoisted up next to the board,
// not left down in the controls. Before the fix the picker's y was BELOW the
// chat input; after, it's above.
//
// Silent per the non-negotiable TTS-mute standard (muteTtsForAudit): the app
// still emits coach-narration-spoken and paces voice-gated auto-advance on a
// text-proportional delay, so the walk reaches the fork at real speed — with no
// synthesis and no bill.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   node scripts/audit-teach-picker-bar-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
// A matchup with an early fork so the walk reaches a branch quickly.
const ASK = process.env.AUDIT_OPENING || "King's Pawn vs French Defense";

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit); // SILENT — no synthesis, no bill (non-negotiable)
const p = await ctx.newPage();
const pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = p.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await p.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* absent */ }
  }
  try {
    const m = p.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await p.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* absent */ }
}

try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();

  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(`teach me the ${ASK}`, { delay: 12 });
  await box.press('Enter');
  record('lesson request submitted', true, `"teach me the ${ASK}"`);

  // Drive the walk forward (skip through narration) until a fork surfaces.
  const forkBar = p.locator('[data-testid="walkthrough-fork-bar"]');
  const started = Date.now();
  let reached = false;
  while (Date.now() - started < 300000) {
    if (await forkBar.isVisible().catch(() => false)) { reached = true; break; }
    try {
      const skip = p.locator('[data-testid="walkthrough-skip"]').first();
      if (await skip.isVisible({ timeout: 400 })) await skip.click({ force: true });
    } catch { /* nothing to nudge */ }
    await p.waitForTimeout(1500);
  }
  record('walkthrough reached a fork (under-board fork-bar rendered)', reached,
    `${Math.round((Date.now() - started) / 1000)}s`);
  if (!reached) throw new Error('never reached a fork');

  // The options live INSIDE the bar.
  const optCount = await p.locator('[data-testid^="walkthrough-fork-option-"]').count();
  record('fork options render inside the bar', optCount >= 2, `${optCount} option(s)`);

  // THE HOIST (David's literal spec: "right where it says the player name and
  // elo"): the bar renders directly under the bottom player-info-bar — its top
  // is at or just below the player-info-bar's, not down in the controls below
  // the chat field. (Comparing against the chat input is unreliable: in the
  // desktop two-column layout the chat column can scroll off-screen, y<0.)
  const barBox = await forkBar.boundingBox();
  const pibs = await p.locator('[data-testid="player-info-bar"]').all();
  const pibBoxes = (await Promise.all(pibs.map((l) => l.boundingBox()))).filter(Boolean);
  const bottomPib = pibBoxes.sort((a, b) => a.y - b.y).at(-1); // the player (lower) bar
  const gap = barBox && bottomPib ? barBox.y - (bottomPib.y + bottomPib.height) : NaN;
  const underBoard = !!barBox && !!bottomPib && gap >= -8 && gap <= 160;
  record('fork-bar sits under the board next to the player ELO bar', underBoard,
    barBox && bottomPib ? `bar.y=${Math.round(barBox.y)} gap-below-pib=${Math.round(gap)}px` : 'no box');

  // And it's near the board bottom, not scrolled off — visible within the
  // viewport height (no scroll needed to see the options).
  const vh = p.viewportSize()?.height ?? 720;
  const inView = !!barBox && barBox.y >= 0 && barBox.y + barBox.height <= vh;
  record('fork-bar is within the viewport (no scroll to see options)', inView,
    barBox ? `y=${Math.round(barBox.y)} h=${Math.round(barBox.height)} vh=${vh}` : 'no box');

  record('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  record('run completed without throwing', false, String(e).slice(0, 160));
}

await b.close().catch(() => undefined);
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} checks green`);
process.exit(passed === results.length ? 0 : 1);
