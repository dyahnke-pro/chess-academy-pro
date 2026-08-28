// One hand-driven action against the persistent browser (see server.mjs).
// Usage:
//   node do.mjs goto /coach/play      — navigate + dismiss gates
//   node do.mjs dump                  — print url, testids, chat transcript, screenshot
//   node do.mjs click <testid>        — click a data-testid
//   node do.mjs move e2 e4            — click two squares (a move)
//   node do.mjs ask "what's the threat?"  — type in chat, send, print the reply
//   node do.mjs board                 — print the current board (piece map) + whose move
import fs from 'node:fs';
import { chromium } from 'playwright';
import { sandboxContextOptions } from '../audit-lib/chromium.mjs';
import { muteTtsForAudit } from '../audit-lib/mute-tts.mjs';

const WS = '/tmp/claude-0/-home-user-chess-academy-pro/4ce43189-b910-54d0-aa42-ce3f047e0b1b/scratchpad/walk-ws.txt';
const OUT = '/tmp/claude-0/-home-user-chess-academy-pro/4ce43189-b910-54d0-aa42-ce3f047e0b1b/scratchpad';
const BASE = 'https://chess-academy-pro.vercel.app';
const [cmd, ...rest] = process.argv.slice(2);

const browser = await chromium.connect(fs.readFileSync(WS, 'utf8').trim());
let ctx = browser.contexts()[0];
if (!ctx) { ctx = await browser.newContext(sandboxContextOptions()); await ctx.addInitScript(muteTtsForAudit); }
let page = ctx.pages()[0] ?? await ctx.newPage();

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-beginner"]'],
  ]) {
    try { await page.locator(gate).waitFor({ timeout: 6000 }); await page.locator(btn).click(); await page.locator(gate).waitFor({ state: 'detached', timeout: 12000 }); console.log('dismissed', gate); } catch { /**/ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 3000 }); await page.keyboard.press('Escape'); } catch { /**/ }
}

const bubbles = () => page.locator('[data-testid="chat-message-assistant"]');

async function transcript() {
  const t = await page.locator('[data-testid="game-chat-panel"], [data-testid="teach-transcript"]').first().innerText().catch(() => '');
  return t;
}

try {
  if (cmd === 'goto') {
    await page.goto(`${BASE}${rest[0] || '/coach/play'}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissGates(); await dismissGates();
    await page.waitForTimeout(2000);
    console.log('at', page.url());
  } else if (cmd === 'dump') {
    const info = await page.evaluate(() => ({
      url: location.href,
      squares: document.querySelectorAll('[data-square]').length,
      turn: document.querySelector('[data-testid="eval-label"]')?.textContent || '',
      testids: [...new Set([...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')))],
    }));
    console.log('URL:', info.url, '| squares:', info.squares, '| eval:', info.turn);
    console.log('TESTIDS:', info.testids.join(' '));
    console.log('\nCHAT:\n' + (await transcript()).slice(-1500));
    await page.screenshot({ path: `${OUT}/walk.png` });
    console.log('\nscreenshot:', `${OUT}/walk.png`);
  } else if (cmd === 'click') {
    await page.locator(`[data-testid="${rest[0]}"]`).click({ timeout: 6000 });
    await page.waitForTimeout(1500);
    console.log('clicked', rest[0]);
  } else if (cmd === 'move') {
    await page.locator(`[data-square="${rest[0]}"]`).click({ timeout: 6000 });
    await page.waitForTimeout(400);
    await page.locator(`[data-square="${rest[1]}"]`).click({ timeout: 6000 });
    await page.waitForTimeout(3000);
    console.log(`moved ${rest[0]}->${rest[1]}`);
  } else if (cmd === 'board') {
    const b = await page.evaluate(() => {
      const map = {};
      for (const el of document.querySelectorAll('[data-square]')) {
        const sq = el.getAttribute('data-square');
        const piece = el.querySelector('[data-piece]')?.getAttribute('data-piece') || el.querySelector('img')?.alt || '';
        if (piece) map[sq] = piece;
      }
      return map;
    });
    console.log('PIECES:', JSON.stringify(b));
  } else if (cmd === 'ask') {
    const q = rest.join(' ');
    const box = page.locator('[data-testid="chat-text-input"]');
    await box.waitFor({ timeout: 12000 });
    for (let i = 0; i < 40 && !(await box.isEditable().catch(() => false)); i++) await page.waitForTimeout(1000);
    const n0 = await bubbles().count();
    await box.click(); await box.fill(''); await box.pressSequentially(q, { delay: 6 });
    try { await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 4000 }); } catch { await box.press('Enter'); }
    let last = '';
    for (let i = 0; i < 75; i++) {
      await page.waitForTimeout(1000);
      if (await bubbles().count() > n0) {
        const t = (await bubbles().last().innerText().catch(() => '')).replace(/^C\s+/, '').trim();
        if (t && t === last && t.length >= 12) { last = t; break; }
        last = t;
      }
    }
    console.log(`Q: ${q}\nA: ${last || '(no reply captured)'}`);
  } else {
    console.log('unknown cmd', cmd);
  }
} finally {
  // Detach WITHOUT closing the server browser (keep the session alive).
  await browser.close();
}
