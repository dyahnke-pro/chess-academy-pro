#!/usr/bin/env node
/**
 * cdp-step.mjs — attach to a long-lived Chrome over CDP and perform ONE
 * action, then detach WITHOUT closing. Lets Claude drive the live coach
 * BY HAND, step by step, reading the real DOM after each action.
 *
 * Launch the browser once (background):
 *   AUDIT_SANDBOX=1 node scripts/cdp-launch.mjs &
 * Then drive:
 *   node scripts/cdp-step.mjs goto /coach/play
 *   node scripts/cdp-step.mjs white
 *   node scripts/cdp-step.mjs setboard "<fen>"
 *   node scripts/cdp-step.mjs ask "what are my three best moves here?"
 *   node scripts/cdp-step.mjs play e4
 *   node scripts/cdp-step.mjs read
 *   node scripts/cdp-step.mjs nav "Caro-Kann"
 */
import { chromium } from 'playwright';

const PMAP = { wP: 'P', wN: 'N', wB: 'B', wR: 'R', wQ: 'Q', wK: 'K', bP: 'p', bN: 'n', bB: 'b', bR: 'r', bQ: 'q', bK: 'k' };
const ACK = /board'?s?\s+(?:is\s+)?set|position\s+set|you'?re\s+playing|taking too long|try again in a moment|drill lines|lines just loaded|what'?s your next test|reach the end/i;
const ASK_TIMEOUT = Number(process.env.ASK_TIMEOUT ?? 180000);

async function snap(page) {
  return page.$$eval('[data-testid="chat-message-assistant"]', (els) => els.map((e) => {
    const b = e.querySelector('[data-testid="coach-badge"]');
    const bt = b && b.textContent ? b.textContent : '';
    let t = e.textContent || '';
    if (bt && t.startsWith(bt)) t = t.slice(bt.length);
    return t.trim();
  }));
}
async function scrapeFen(page) {
  const map = await page.evaluate(() => {
    const m = {};
    document.querySelectorAll('[data-piece]').forEach((p) => {
      let n = p, sq = p.getAttribute('data-square');
      while (n && !sq) { n = n.parentElement; sq = n && n.getAttribute && n.getAttribute('data-square'); }
      if (sq && /^[a-h][1-8]$/.test(sq)) m[sq] = p.getAttribute('data-piece');
    });
    return m;
  });
  if (!Object.keys(map).length) return null;
  const rows = [];
  for (let r = 8; r >= 1; r--) { let row = '', e = 0; for (const f of 'abcdefgh') { const p = map[f + r]; if (p && PMAP[p]) { if (e) { row += e; e = 0; } row += PMAP[p]; } else e++; } if (e) row += e; rows.push(row); }
  return rows.join('/');
}

async function getPage(browser) {
  const ctxs = browser.contexts();
  const ctx = ctxs[0];
  const pages = ctx.pages();
  return pages[0] ?? (await ctx.newPage());
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const arg = rest.join(' ');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = await getPage(browser);
  const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';

  if (cmd === 'goto') {
    await page.goto(`${BASE}${arg}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4500);
    try { if (await page.locator('[data-testid="page-help-modal"]').count()) await page.keyboard.press('Escape'); } catch {}
    // dismiss strength bubble if present
    try { const b = page.locator('[data-testid="strength-calibration-bubble"]'); if (await b.count()) { await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => {}); await b.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); } } catch {}
    console.log(`URL: ${page.url()}\nFEN: ${await scrapeFen(page)}`);
  } else if (cmd === 'white') {
    const cs = page.locator('[data-testid="color-selector"]');
    if (await cs.count()) { const w = page.getByRole('button', { name: /white/i }); if (await w.count()) await w.first().click().catch(() => {}); await page.waitForTimeout(2000); }
    console.log(`picked white; FEN: ${await scrapeFen(page)}`);
  } else if (cmd === 'read') {
    const a = await snap(page);
    console.log(`URL: ${page.url()}\nFEN: ${await scrapeFen(page)}\n--- ${a.length} assistant bubbles ---`);
    a.slice(-6).forEach((t, i) => console.log(`[${i}] ${t}`));
  } else if (cmd === 'setboard') {
    const target = arg.split(' ')[0];
    const input = page.locator('[data-testid="chat-text-input"]');
    await input.click(); await input.fill(`set the board to ${arg}`);
    await page.locator('[data-testid="chat-send-btn"]').click();
    let ok = false;
    for (let i = 0; i < 40; i++) { await page.waitForTimeout(1000); if ((await scrapeFen(page)) === target) { ok = true; break; } }
    console.log(`setboard ${ok ? 'OK' : 'MISMATCH'}\nwant: ${target}\ngot:  ${await scrapeFen(page)}`);
  } else if (cmd === 'play') {
    const before = await scrapeFen(page);
    const input = page.locator('[data-testid="chat-text-input"]');
    await input.click(); await input.fill(`play ${arg}`);
    await page.locator('[data-testid="chat-send-btn"]').click();
    for (let i = 0; i < 25; i++) { await page.waitForTimeout(800); const n = await scrapeFen(page); if (n && n !== before) break; }
    await page.waitForTimeout(2000);
    console.log(`played ${arg}\nFEN: ${await scrapeFen(page)}`);
  } else if (cmd === 'ask') {
    const before = await snap(page); const bs = new Set(before);
    const input = page.locator('[data-testid="chat-text-input"]');
    await input.waitFor({ state: 'visible', timeout: 12000 }); await input.click(); await input.fill(arg);
    const t0 = Date.now();
    await page.locator('[data-testid="chat-send-btn"]').click();
    let got = false;
    try {
      await page.waitForFunction((prev) => {
        const A = /board'?s?\s+set|you'?re playing|taking too long/i;
        const els = [...document.querySelectorAll('[data-testid="chat-message-assistant"]')];
        return els.some((e) => { const b = e.querySelector('[data-testid="coach-badge"]'); const bt = b && b.textContent ? b.textContent : ''; let t = e.textContent || ''; if (bt && t.startsWith(bt)) t = t.slice(bt.length); t = t.trim(); return t.length > 8 && !prev.includes(t) && !A.test(t); });
      }, before, { timeout: ASK_TIMEOUT });
      got = true;
    } catch { got = false; }
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    if (!got) { console.log(`(NO ANSWER in ${elapsed}s)`); }
    else {
      let pl = -1, st = 0, r = '';
      for (let k = 0; k < 35; k++) { await page.waitForTimeout(700); const a = await snap(page); const fr = a.filter((t) => !bs.has(t) && !ACK.test(t)); const cur = fr.length ? fr.reduce((x, y) => (y.length > x.length ? y : x)) : ''; if (cur.length === pl) { st++; if (st >= 2) { r = cur; break; } } else st = 0; pl = cur.length; r = cur; }
      const ack = (await snap(page)).filter((t) => !bs.has(t) && ACK.test(t));
      console.log(`(answered in ${elapsed}s)\nFEN: ${await scrapeFen(page)}`);
      if (ack.length) console.log(`ACK: ${ack[ack.length - 1].slice(0, 160)}`);
      console.log(`A: ${r || '(empty)'}`);
    }
  } else if (cmd === 'nav') {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3500);
    const si = page.locator('[data-testid="smart-search-input"]'); await si.waitFor({ state: 'visible', timeout: 10000 }); await si.click(); await si.fill(''); await si.fill(arg); await page.waitForTimeout(3000);
    const agent = page.locator('[data-testid="agent-action-option"]'); const result = page.locator('[data-testid="search-result"]');
    const nA = await agent.count(), nR = await result.count();
    if (nA) await agent.first().click({ timeout: 8000 }).catch(() => {});
    else if (nR) await result.first().click({ timeout: 8000 }).catch(() => {});
    else await si.press('Enter');
    await page.waitForTimeout(3500);
    console.log(`nav "${arg}": agentOpts=${nA} resultOpts=${nR}\n→ URL: ${page.url()}`);
  } else {
    console.log(`unknown cmd: ${cmd}`);
  }
  await browser.close(); // detaches CDP; does NOT kill the launched browser
}
main().catch((e) => { console.error('step error:', e?.message ?? e); process.exit(1); });
