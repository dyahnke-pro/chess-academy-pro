// Hand-walk helper: drive ONE short sequence, then DUMP the real page state
// (url, testids, buttons, chat transcript) + a screenshot so I can SEE what is
// actually on screen and decide the next action — not assume a happy path.
// Usage: node scripts/walk/step.mjs <route>
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from '../audit-lib/chromium.mjs';
import { muteTtsForAudit } from '../audit-lib/mute-tts.mjs';

const BASE = 'https://chess-academy-pro.vercel.app';
const ROUTE = process.argv[2] || '/coach/play';
const OUT = '/tmp/claude-0/-home-user-chess-academy-pro/4ce43189-b910-54d0-aa42-ce3f047e0b1b/scratchpad';

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-beginner"]'],
  ]) {
    try {
      await page.locator(gate).waitFor({ timeout: 8000 });
      await page.locator(btn).click();
      await page.locator(gate).waitFor({ state: 'detached', timeout: 15000 });
      console.log(`dismissed ${gate}`);
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
    console.log('dismissed page-help-modal');
  } catch { /* not shown */ }
}

await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await dismissGates();
await dismissGates();
await page.waitForTimeout(3000);

const state = await page.evaluate(() => {
  const testids = [...document.querySelectorAll('[data-testid]')]
    .map((e) => e.getAttribute('data-testid'))
    .filter((v, i, a) => a.indexOf(v) === i);
  const buttons = [...document.querySelectorAll('button')]
    .map((b) => (b.innerText || b.getAttribute('aria-label') || '').trim().slice(0, 40))
    .filter(Boolean).slice(0, 60);
  const squares = document.querySelectorAll('[data-square]').length;
  const input = document.querySelector('[data-testid="chat-text-input"]');
  return { url: location.href, testidCount: testids.length, testids, buttons, squares, hasChatInput: !!input };
});

console.log('URL:', state.url);
console.log('squares on board:', state.squares, '| chat input present:', state.hasChatInput);
console.log('\n=== TESTIDS (' + state.testidCount + ') ===');
console.log(state.testids.join('  '));
console.log('\n=== BUTTONS ===');
console.log(state.buttons.join('  |  '));

await page.screenshot({ path: `${OUT}/walk-${ROUTE.replace(/\W/g, '_')}.png`, fullPage: false });
console.log(`\nscreenshot: ${OUT}/walk-${ROUTE.replace(/\W/g, '_')}.png`);
await browser.close();
