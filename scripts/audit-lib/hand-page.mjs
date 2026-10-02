#!/usr/bin/env node
/**
 * hand-page — the hand-driver for ANY page (hand-driver.mjs is shaped around
 * /coach/teach). A live, MUTED browser Claude steers one command at a time
 * (David 2026-09-24: "I want you walking the test. Not a bot"). Each HTTP call
 * does ONE thing and returns what is on screen.
 *
 *   node scripts/audit-lib/hand-page.mjs                 (port 7778)
 *   curl -s 'localhost:7778/goto?path=/coach/endgame'
 *   curl -s 'localhost:7778/click?testid=endgame-hint'   (or ?text=Pawn)
 *   curl -s 'localhost:7778/move?from=e2&to=e4'          click two squares
 *   curl -s  localhost:7778/state                        visible text, board, spoken, errors
 *   curl -s 'localhost:7778/shot?name=pawn-tab'          screenshot to /tmp/claude-0/shots/
 */
import http from 'node:http';
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './chromium.mjs';
import { startAuditListener } from './audit-listener.mjs';
import { autoDismissCalibration } from './auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './mute-tts.mjs';
import { readPlacement, sleep } from './board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const PORT = Number(process.env.HAND_PORT ?? 7778);
const SHOTS = '/tmp/claude-0/shots';
mkdirSync(SHOTS, { recursive: true });

const listener = await startAuditListener();
const browser = await chromium.launch({ headless: true, executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 430, height: 932 } });
await ctx.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
}, { url: listener.url, secret: listener.secret });
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(stampAuditRunId(`hand-page-${Math.random().toString(36).slice(2, 8)}`));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|ERR_|net::/.test(m.text())) errors.push(`console: ${m.text().slice(0, 300)}`); });

let seen = 0;
async function state() {
  const evs = listener.getCapturedEvents();
  const fresh = evs.slice(seen); seen = evs.length;
  const spoken = fresh
    .filter((e) => e.kind === 'coach-narration-spoken' || /voice=/.test(e.narrationText ?? e.summary ?? ''))
    .map((e) => (e.narrationText ?? e.summary ?? '').replace(/\s+/g, ' ').trim().slice(0, 400));
  const text = (await page.locator('main, #root').first().innerText().catch(() => '')).replace(/\n{2,}/g, '\n').slice(0, 3500);
  const placement = await readPlacement(page).catch(() => null);
  const testids = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].filter((el) => el.offsetParent !== null).map((el) => el.getAttribute('data-testid')).filter((t, i, a) => a.indexOf(t) === i).slice(0, 120));
  return { url: page.url(), text, placement, testids, spoken, errors: errors.splice(0) };
}

const json = (res, body) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(body, null, 1)); };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/goto') { await page.goto(`${BASE}${u.searchParams.get('path') ?? '/'}`, { waitUntil: 'domcontentloaded' }); await sleep(Number(u.searchParams.get('wait') ?? 2500)); return json(res, await state()); }
    if (u.pathname === '/click') {
      const id = u.searchParams.get('testid'); const t = u.searchParams.get('text');
      const loc = id ? page.locator(`[data-testid="${id}"]`).first() : page.getByText(t ?? '', { exact: u.searchParams.get('exact') === '1' }).first();
      await loc.click({ timeout: 6000, force: true });
      await sleep(Number(u.searchParams.get('wait') ?? 1500));
      return json(res, await state());
    }
    if (u.pathname === '/move') {
      await page.locator(`[data-square="${u.searchParams.get('from')}"]`).first().click({ timeout: 6000, force: true });
      await sleep(200);
      await page.locator(`[data-square="${u.searchParams.get('to')}"]`).first().click({ timeout: 6000, force: true });
      await sleep(Number(u.searchParams.get('wait') ?? 2500));
      return json(res, await state());
    }
    if (u.pathname === '/drag') {
      const from = page.locator(`[data-square="${u.searchParams.get('from')}"]`).first();
      const to = page.locator(`[data-square="${u.searchParams.get('to')}"]`).first();
      const a = await from.boundingBox(); const b = await to.boundingBox();
      if (!a || !b) throw new Error('square not found');
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
      await page.mouse.up();
      await sleep(Number(u.searchParams.get('wait') ?? 2500));
      return json(res, await state());
    }
    if (u.pathname === '/js') {
      // Dev-server only: run a snippet in the page (an async function body).
      const out = await page.evaluate(`(async () => { ${u.searchParams.get('code') ?? ''} })()`).catch((e) => `ERR ${String(e)}`);
      return json(res, { out });
    }
    if (u.pathname === '/type') {
      // Real key events — a React textarea ignores fill() and keeps Send disabled.
      const box = page.locator(u.searchParams.get('sel') ?? 'textarea').first();
      await box.click({ timeout: 6000, force: true });
      await box.pressSequentially(u.searchParams.get('text') ?? '', { delay: 15 });
      await page.keyboard.press('Enter');
      await sleep(Number(u.searchParams.get('wait') ?? 6000));
      return json(res, await state());
    }
    if (u.pathname === '/wait') { await sleep(Number(u.searchParams.get('ms') ?? 2000)); return json(res, await state()); }
    if (u.pathname === '/state') return json(res, await state());
    if (u.pathname === '/shot') { const p = `${SHOTS}/${u.searchParams.get('name') ?? Date.now()}.png`; await page.screenshot({ path: p, fullPage: true }); return json(res, { path: p }); }
    if (u.pathname === '/quit') { json(res, { bye: true }); await browser.close(); process.exit(0); }
    json(res, { error: 'unknown command' });
  } catch (e) { json(res, { error: String(e), ...(await state()) }); }
}).listen(PORT, () => console.log(`hand-page on :${PORT} → ${BASE}`));
