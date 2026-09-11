// HAND-STEP — a driver I STEER, not a fire-and-forget bot (CLAUDE.md 2026-07-24).
// Each invocation: fresh prod page, dismiss the real gates, replay a list of
// actions I pass in, then DUMP the true state (url, walkthrough phase, every
// visible data-testid, transcript tail, a screenshot). I read the dump and
// decide the next action myself. State between clicks is visible; nothing is
// trusted green.
//
// usage: node scripts/audit-lib/hand-step.mjs '<JSON actions>'
//   actions = [{do:'goto', path:'/coach/teach'},
//              {do:'click', tid:'teach-picker-opening-italian-game'},
//              {do:'type', tid:'chat-text-input', text:'Teach me the Italian'},
//              {do:'press', tid:'chat-text-input', key:'Enter'},
//              {do:'square', from:'e2', to:'e4'},
//              {do:'wait', ms:8000}]
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './chromium.mjs';
import { muteTtsForAudit } from './mute-tts.mjs';
import { autoDismissCalibration } from './auto-dismiss.mjs';
import { mkdirSync } from 'node:fs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const actions = JSON.parse(process.argv[2] ?? '[]');
const shot = process.argv[3] ?? '/tmp/claude-0/hand-step.png';
mkdirSync(shot.replace(/\/[^/]+$/, ''), { recursive: true });

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(() => { try { localStorage.setItem('auditRunId', 'handwalk'); } catch {} });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });

const log = (s) => console.log(s);
async function dismissModals() {
  for (const tid of ['ai-consent-allow', 'page-help-modal-close', 'page-help-got-it']) {
    const el = page.locator(`[data-testid="${tid}"]`).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await page.waitForTimeout(400); }
  }
}

for (const a of actions) {
  try {
    if (a.do === 'goto') {
      await page.goto(`${BASE}${a.path}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(a.ms ?? 9000);
      // dismiss strength calibration if present
      const bubble = page.locator('[data-testid="strength-calibration-bubble"]').first();
      if (await bubble.isVisible().catch(() => false)) {
        await page.locator('[data-testid="skill-band-intermediate"]').first().click({ force: true }).catch(() => {});
        await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
      }
      await dismissModals();
      log(`  did goto ${a.path}`);
    } else if (a.do === 'click') {
      const sel = a.sel ?? `[data-testid="${a.tid}"]`;
      const el = page.locator(sel + ':visible').first();
      const ok = await el.isVisible().catch(() => false);
      await el.click({ force: true, timeout: 8000 }).catch((e) => log(`  click ${a.tid ?? a.sel} FAILED ${String(e).slice(0, 60)}`));
      await page.waitForTimeout(a.ms ?? 2500);
      log(`  did click ${a.tid ?? a.sel} (wasVisible=${ok})`);
    } else if (a.do === 'type') {
      const box = page.locator(`[data-testid="${a.tid}"]:visible`).first();
      await box.click({ force: true }).catch(() => {});
      await box.fill('').catch(() => {});
      await box.pressSequentially(a.text, { delay: 10 }).catch(() => {});
      log(`  did type "${a.text}"`);
    } else if (a.do === 'press') {
      await page.locator(`[data-testid="${a.tid}"]:visible`).first().press(a.key).catch(() => {});
      await page.waitForTimeout(a.ms ?? 3000);
      log(`  did press ${a.key}`);
    } else if (a.do === 'square') {
      await page.locator(`[data-square="${a.from}"]`).first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      await page.locator(`[data-square="${a.to}"]`).first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(a.ms ?? 3000);
      log(`  did move ${a.from}->${a.to}`);
    } else if (a.do === 'wait') {
      await page.waitForTimeout(a.ms ?? 5000);
      log(`  waited ${a.ms ?? 5000}ms`);
    }
  } catch (e) { log(`  ACTION ${JSON.stringify(a)} threw ${String(e).slice(0, 80)}`); }
}

// ---- DUMP THE TRUE STATE ----
const url = page.url();
const visTids = await page.evaluate(() => {
  const out = [];
  for (const el of Array.from(document.querySelectorAll('[data-testid]'))) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < (window.innerHeight + 200)) {
      out.push(el.getAttribute('data-testid'));
    }
  }
  return [...new Set(out)];
});
const transcript = await page.locator('[data-testid="teach-transcript"]').first().innerText().catch(() => '');
await page.screenshot({ path: shot }).catch(() => {});
log(`\n===== STATE =====`);
log(`url: ${url}`);
log(`visible testids (${visTids.length}):`);
log('  ' + visTids.join('  '));
if (transcript) log(`transcript tail: "${transcript.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 400)}"`);
log(`errors (${errs.length}):`);
for (const e of errs.slice(0, 8)) log('  ' + e);
log(`screenshot: ${shot}`);
await browser.close();
