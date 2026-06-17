#!/usr/bin/env node
/**
 * audit-leaf-stagemenu — investigate the functional audit's recurring
 * `leaf→continue-learning→stage-menu phase=none` (David 2026-06-17). Reach a
 * walkthrough leaf, click "Continue learning", then log the ACTUAL phase
 * (visible walkthrough panel testids) + relevant audit events every second
 * for 20s, with screenshots — to tell a real dead-end (stays none / leaves
 * the walkthrough) from a slow render the functional audit's 12s window
 * missed.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OPENING = process.env.AUDIT_OPENING_NAME ?? 'teach me the Vienna';
const SHOT_DIR = 'audit-reports/leaf-stagemenu';
const PANELS = ['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-paused-panel', 'walkthrough-choose-mode', 'walkthrough-stage-menu', 'walkthrough-stage-pending', 'walkthrough-quiz-panel', 'walkthrough-drill-picker', 'walkthrough-drill-active', 'walkthrough-punish-picker', 'line-picker', 'teach-picker'];

async function main() {
  await mkdir(SHOT_DIR, { recursive: true });
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'AuditLeafBot/1.0' });
  // Trap any navigation to /coach/home and print the JS stack that caused it.
  await ctx.addInitScript(() => {
    const trap = (orig, label) => function (...args) {
      try { const u = String(args[2] ?? ''); if (u.includes('/coach/home')) console.log(`[NAVTRAP ${label}] -> ${u}\n${new Error().stack}`); } catch { /* */ }
      return orig.apply(this, args);
    };
    history.pushState = trap(history.pushState, 'pushState');
    history.replaceState = trap(history.replaceState, 'replaceState');
  });
  const page = await ctx.newPage();
  page.on('console', (m) => { const t = m.text(); if (t.startsWith('[NAVTRAP')) console.log(t.slice(0, 700)); });
  const elementAtButton = async () => page.evaluate(() => {
    const b = document.querySelector('[data-testid="walkthrough-continue-learning"]');
    if (!b) return 'button NOT in DOM';
    const r = b.getBoundingClientRect();
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return `btn box=${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} | elementAtCenter=<${at?.tagName} testid=${at?.getAttribute?.('data-testid') ?? '-'} aria=${at?.getAttribute?.('aria-label') ?? '-'}>`;
  }).catch((e) => `eval err ${String(e).slice(0, 60)}`);
  const errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e?.message || '(empty)'}`));
  page.on('console', (m) => { if (m.type() === 'error' && /Uncaught|TypeError|same key|Each child|Minified React/i.test(m.text())) errs.push(`console: ${m.text().slice(0, 120)}`); });

  const phase = async () => {
    for (const id of PANELS) { if (await page.locator(`[data-testid="${id}"]`).first().isVisible().catch(() => false)) return id; }
    return 'none';
  };
  const dumpAudits = async () => page.evaluate(async () => { const a = window.__AUDIT__; return (a && a.dump) ? await a.dump().catch(() => []) : []; }).catch(() => []);

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => { const a = window.__AUDIT__; return !!a?.isStreamHydrated?.(); }, { timeout: 20000 }).catch(() => {});
    const calib = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await calib.count()) { await page.locator('[data-testid="skill-band-intermediate"]').first().click({ timeout: 5000 }).catch(() => {}); await calib.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {}); }
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);
    const help = page.locator('[data-testid="page-help-modal"]'); if (await help.count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(500); }

    // Start the walkthrough. On a cold context the opening SEED isn't loaded
    // yet, so "teach me the Vienna" can't resolve Vienna and just shows the
    // picker — wait for the seed + retry the send until a walkthrough panel
    // (or its chooser) appears.
    const input = page.locator('[data-testid="chat-text-input"]');
    await input.waitFor({ timeout: 15000 });
    let started = false;
    for (let attempt = 0; attempt < 5 && !started; attempt++) {
      await input.fill(OPENING, { timeout: 8000 }).catch(() => {});
      await page.locator('[data-testid="chat-send-btn"]').click({ timeout: 8000, force: true }).catch(() => {});
      // give it time to route / start
      const adl = Date.now() + 18000;
      while (Date.now() < adl) {
        if (await page.locator('[data-testid="walkthrough-choose-walkthrough"]').first().isVisible().catch(() => false)) {
          await page.locator('[data-testid="walkthrough-choose-walkthrough"]').click({ force: true }).catch(() => {});
        }
        const ph = await phase();
        if (['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-choose-mode'].includes(ph)) { started = true; break; }
        await page.waitForTimeout(800);
      }
      if (!started) { console.log(`  start attempt ${attempt + 1}: phase=${await phase()} (seed likely not ready) — waiting + retrying`); await page.waitForTimeout(12000); }
    }
    console.log(`walkthrough started: ${started}`);
    if (!started) { console.log('::could not start walkthrough (seed/routing) — inconclusive'); return; }

    // Skip narration + pick forks until we hit the leaf (≤90s).
    const dl = Date.now() + 90000;
    let p = 'none';
    while (Date.now() < dl) {
      p = await phase();
      if (p === 'walkthrough-leaf-panel') break;
      if (p === 'walkthrough-fork-panel') await page.locator('[data-testid="walkthrough-fork-option-0"]').first().click({ force: true, timeout: 2000 }).catch(() => {});
      else if (p === 'walkthrough-narrating-panel') await page.locator('[data-testid="walkthrough-skip"]').first().click({ force: true, timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
    }
    console.log(`reached phase=${p}`);
    await page.screenshot({ path: `${SHOT_DIR}/01-leaf.png` }).catch(() => {});
    if (p !== 'walkthrough-leaf-panel') { console.log('::did not reach leaf — inconclusive'); return; }

    const contVisible = await page.locator('[data-testid="walkthrough-continue-learning"]').first().isVisible().catch(() => false);
    console.log(`continue-learning button visible: ${contVisible}`);
    if (!contVisible) { console.log('::no continue-learning button (hasStages false — stages not generated)'); return; }

    console.log(`url before click: ${page.url()}`);
    console.log(`what's at the button center: ${await elementAtButton()}`);
    // Full layout dump — measure every relevant box so we see WHY the button
    // lands under the nav (overflow? board too tall? padding not applied?).
    const layout = await page.evaluate(() => {
      const box = (sel, label) => {
        const el = document.querySelector(sel);
        if (!el) return `${label}: (absent)`;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return `${label}: top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} h=${Math.round(r.height)} overflowY=${cs.overflowY} pb=${cs.paddingBottom}`;
      };
      return [
        `viewport: ${window.innerHeight}h`,
        box('[data-testid="coach-teach-page"]', 'outer'),
        box('[data-testid="coach-teach-page"] > div.flex-none', 'board-col'),
        box('[data-testid="walkthrough-leaf-panel"]', 'leaf-panel'),
        box('[data-testid="nav-coach-home-tab"]', 'nav-tab'),
      ].join('\n  ');
    }).catch((e) => `layout eval err ${String(e).slice(0, 80)}`);
    console.log(`LAYOUT:\n  ${layout}`);
    // Scroll the page fully to the bottom (what a real user does to reach the
    // button), then re-measure: is the continue button EVER clear of the nav?
    const scrolled = await page.evaluate(() => {
      const scroller = document.scrollingElement || document.documentElement;
      scroller.scrollTop = scroller.scrollHeight;
      return { scrollTop: Math.round(scroller.scrollTop), scrollHeight: Math.round(scroller.scrollHeight), client: scroller.clientHeight };
    }).catch(() => null);
    await page.waitForTimeout(300);
    console.log(`after scroll-to-bottom: ${JSON.stringify(scrolled)}`);
    console.log(`button after scroll-to-bottom: ${await elementAtButton()}`);
    // Also try scrolling JUST the continue button to the top of the viewport
    // (best case for clearing the nav at the bottom).
    await page.evaluate(() => document.querySelector('[data-testid="walkthrough-continue-learning"]')?.scrollIntoView({ block: 'start' })).catch(() => {});
    await page.waitForTimeout(300);
    console.log(`button after scrollIntoView(start): ${await elementAtButton()}`);
    // Reset scroll for the real click test below.
    await page.evaluate(() => { const s = document.scrollingElement || document.documentElement; s.scrollTop = 0; }).catch(() => {});
    await page.waitForTimeout(200);
    // Click WITHOUT force so an overlay/covered target surfaces as an error
    // instead of silently delivering the click to the wrong element.
    await page.locator('[data-testid="walkthrough-continue-learning"]').click({ timeout: 4000 }).catch((e) => console.log('click err (no-force):', String(e).slice(0, 140)));
    console.log(`url right after click: ${page.url()}`);
    console.log('clicked continue-learning; watching phase for 20s:');
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      console.log(`  t+${i + 1}s phase=${await phase()}`);
    }
    await page.screenshot({ path: `${SHOT_DIR}/02-after-continue.png` }).catch(() => {});
    const a = await dumpAudits();
    const recent = a.slice(-12).map((e) => `${e.kind}: ${String(e.summary || '').slice(0, 60)}`);
    console.log('recent audit events:\n  ' + recent.join('\n  '));
    console.log(`pageerrors/console-errors: ${errs.length}${errs.length ? ' :: ' + errs.slice(0, 3).join(' | ') : ''}`);
  } finally {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(2); });
