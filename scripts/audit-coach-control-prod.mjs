// Full coach-control audit (David 2026-09-08: "coach needs to be able to set up
// any position, open any tab ... it said done, but we were still on the home
// screen"). Drives the coach from a NO-BOARD surface (/coach/chat, which wires no
// board callback) and proves the global actuator ACTUALLY actuates:
//   1. "open the tactics tab" → the app NAVIGATES to /tactics (URL changes).
//   2. "set up <a position>" → the app lands on /coach/play?fen=… with a board.
// Before the fix, these no-op'd and the coach said "done" while the URL never
// moved. The audit asserts the URL MOVED — the real post-state, not the chat text.
//
// LLM-driven, so it's lenient on WHICH board/tab wording the coach uses and
// allows a generous think/navigate window; it fails only if the URL never leaves
// the chat surface (the actual bug).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const page = await (await browser.newContext(sandboxContextOptions())).newPage();
await page.addInitScript(muteTtsForAudit);

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = page.locator(gate); await g.waitFor({ timeout: 8000 }); await page.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* absent */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* none */ }
}

async function ask(text) {
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(text, { delay: 10 });
  await box.press('Enter');
}

async function waitForUrl(re, ms) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (re.test(page.url())) return true;
    await page.waitForTimeout(1500);
  }
  return false;
}

try {
  // A NO-BOARD coach surface — the class of surface that used to no-op board/nav
  // tools. /coach/chat wires no onSetBoardPosition; the global actuator must now
  // supply it.
  await page.goto(`${BASE}/coach/chat`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  // 1. Open a tab from the chat.
  await ask('Open the tactics tab');
  const navigated = await waitForUrl(/\/tactics|\/puzzles/, 60000);
  check('coach navigates to a tab from a no-board surface', navigated,
    navigated ? `url=${page.url()}` : `url never left ${page.url()}`);

  // Back to the chat for the board test.
  await page.goto(`${BASE}/coach/chat`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  // 2. Set up a position from the chat → lands on the play board with a FEN.
  await ask('Set up the Italian Game on the board so I can play it');
  const boardUp = await waitForUrl(/\/coach\/play\?.*fen=/, 90000);
  check('coach sets up a position from a no-board surface', boardUp,
    boardUp ? `url=${decodeURIComponent(page.url()).slice(0, 90)}` : `url never reached the play board: ${page.url()}`);
  if (boardUp) {
    // The board actually rendered the position (pieces present).
    await page.waitForTimeout(4000);
    const pieces = await page.locator('[data-piece]').count().catch(() => 0);
    check('the set-up board actually renders pieces', pieces >= 8, `${pieces} pieces on the board`);
  }
} catch (err) {
  check('run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();
let failed = 0;
for (const r of results) { if (!r.pass) failed += 1; console.log(`${r.pass ? '✓ PASS' : '✗ FAIL'}: ${r.name} — ${r.detail}`); }
console.log(`\n${results.length - failed}/${results.length} green`);
process.exit(failed === 0 ? 0 : 1);
