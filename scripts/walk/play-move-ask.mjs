// Hand-walk: on /coach/play, make real moves, then ask ONE board question and
// dump the real reply. Observe before assuming.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from '../audit-lib/chromium.mjs';
import { muteTtsForAudit } from '../audit-lib/mute-tts.mjs';

const BASE = 'https://chess-academy-pro.vercel.app';
const QUESTION = process.argv[2] || "What's the best move here?";
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
    try { await page.locator(gate).waitFor({ timeout: 8000 }); await page.locator(btn).click(); await page.locator(gate).waitFor({ state: 'detached', timeout: 15000 }); } catch { /**/ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /**/ }
}

async function move(from, to) {
  await page.locator(`[data-square="${from}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(400);
  await page.locator(`[data-square="${to}"]`).click({ timeout: 5000 });
  await page.waitForTimeout(2500); // let the bot reply
}

const bubbles = () => page.locator('[data-testid="chat-message-assistant"]');
async function ask(q) {
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 15000 });
  for (let i = 0; i < 30 && !(await box.isEditable().catch(() => false)); i++) await page.waitForTimeout(1000);
  const n0 = await bubbles().count();
  await box.click(); await box.fill(''); await box.pressSequentially(q, { delay: 8 });
  await page.locator('[data-testid="chat-send-btn"]').click();
  let last = '';
  for (let i = 0; i < 90; i++) {
    await page.waitForTimeout(1000);
    if (await bubbles().count() > n0) {
      const t = (await bubbles().last().innerText().catch(() => '')).replace(/^C\s+/, '').trim();
      if (t && t === last && t.length >= 12) return t;
      last = t;
    }
  }
  return last || '(no reply)';
}

await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await dismissGates(); await dismissGates();
await page.waitForTimeout(2500);

// Play a few real moves into a middlegame-ish position.
await move('e2', 'e4');
await move('g1', 'f3');
await move('f1', 'c4');
const fen = await page.evaluate(() => document.querySelector('[data-testid="eval-label"]')?.textContent || '');
console.log('after 3 moves, eval label:', fen);

const reply = await ask(QUESTION);
console.log(`\nQ: ${QUESTION}\nA: ${reply}`);

await page.screenshot({ path: `${OUT}/walk-play-ask.png` });
await browser.close();
