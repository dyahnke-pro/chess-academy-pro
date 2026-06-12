#!/usr/bin/env node
/**
 * audit-coach-teach-functional — drive /coach/teach like a REAL PERSON:
 * click the picker chips, opening tiles, action buttons, fork choices,
 * stage tiles, quiz answers, board squares, Resume/End — NO synthetic
 * command injection into the chat box. Watch a full lesson actually play.
 *
 * Records, per STEP: console/page errors introduced (so we see exactly
 * which click triggers a bug, e.g. the React duplicate-key warning), a
 * screenshot, and the phase reached.
 *
 * Usage: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 \
 *        node scripts/audit-coach-teach-functional.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/coach-teach-functional-${stamp}`;

const exe = await resolveChromiumExecutable(false);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();

const errs = [];
const keyDetails = [];
page.on('console', async (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/same key|each child|unique "key"|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|Cannot update a component/i.test(t)) {
    errs.push(t.slice(0, 200));
    if (/same key|each child/i.test(t) && keyDetails.length < 4) {
      try {
        const args = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => '<obj>')));
        // args[1] = the duplicate key value; last arg = component stack
        keyDetails.push({ key: String(args[1] ?? '?'), stack: String(args[args.length - 1] ?? '').slice(0, 400) });
      } catch { /* */ }
    }
  }
});
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 200)));

const steps = [];
async function step(name, fn) {
  const before = errs.length;
  let note = '';
  try { note = (await fn()) ?? ''; } catch (e) { note = `ERROR: ${String(e?.message ?? e).slice(0, 120)}`; }
  const newErrs = errs.slice(before);
  const phase = await detectPhase();
  const shot = join(OUT, `${String(steps.length + 1).padStart(2, '0')}-${name.replace(/[^a-z0-9]+/gi, '-')}.png`);
  await page.screenshot({ path: shot }).catch(() => undefined);
  const uniqErrs = [...new Set(newErrs)];
  steps.push({ name, phase, note, newErrorCount: newErrs.length, errors: uniqErrs });
  const flag = newErrs.length ? `💥 +${newErrs.length} err` : 'ok';
  console.log(`[${String(steps.length).padStart(2, '0')}] ${name}  → phase=${phase} ${flag}${note ? ` :: ${note}` : ''}`);
  for (const e of uniqErrs) console.log(`        ⤷ ${e}`);
}

async function detectPhase() {
  const ids = ['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-paused-panel', 'walkthrough-choose-mode', 'walkthrough-stage-menu', 'walkthrough-quiz-panel', 'walkthrough-quiz-complete', 'walkthrough-drill-picker', 'walkthrough-drill-active', 'walkthrough-punish-picker', 'teach-generation-progress', 'line-picker', 'teach-picker'];
  for (const id of ids) {
    if (await page.locator(`[data-testid="${id}"]`).first().isVisible().catch(() => false)) return id;
  }
  return 'none';
}
async function visible(sel) { return page.locator(sel).first().isVisible().catch(() => false); }
async function clickIf(sel, { timeout = 4000 } = {}) {
  const el = page.locator(sel).first();
  if (await el.isVisible().catch(() => false)) { await el.click({ timeout, force: true }).catch(() => undefined); return true; }
  return false;
}
async function waitInput() {
  await page.waitForFunction(() => { const el = document.querySelector('[data-testid="chat-text-input"]'); return el && !el.disabled; }, { timeout: 60000 }).catch(() => undefined);
}

// ── Drive a lesson to its leaf/stage-menu the way a user watches + taps ──
async function watchLessonToEnd(maxMs = 120000) {
  const deadline = Date.now() + maxMs;
  let last = '';
  while (Date.now() < deadline) {
    const phase = await detectPhase();
    if (phase !== last) { last = phase; }
    if (phase === 'walkthrough-leaf-panel' || phase === 'walkthrough-stage-menu') return phase;
    if (phase === 'walkthrough-narrating-panel') {
      // a user watches a beat, then taps "Skip narration" to move on
      await page.waitForTimeout(1500);
      await clickIf('[data-testid="walkthrough-skip"]');
    } else if (phase === 'walkthrough-fork-panel') {
      await page.waitForTimeout(1200);
      await clickIf('[data-testid="walkthrough-fork-option-0"]');
    } else if (phase === 'walkthrough-trap-prompt') {
      await clickIf('[data-testid="walkthrough-trap-skip"]');
    } else if (phase === 'teach-generation-progress') {
      await page.waitForTimeout(2000);
    } else {
      await page.waitForTimeout(1000);
    }
  }
  return last;
}

async function main() {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15000 }).catch(() => undefined);
  await waitInput();
  await page.waitForTimeout(1500);

  await step('land on teach page (picker visible)', async () => {
    return (await visible('[data-testid="teach-picker"]')) ? 'picker shown' : 'no picker';
  });

  // A user taps the "Teach" action, then taps an opening tile.
  await step('tap Teach action chip', async () => {
    await clickIf('[data-testid="teach-picker-action-teach"]');
    await page.waitForTimeout(400);
  });
  await step('tap first opening tile to start a lesson', async () => {
    const chip = page.locator('[data-testid="teach-picker-openings"] button').first();
    const label = await chip.innerText().catch(() => '?');
    await chip.click({ force: true }).catch(() => undefined);
    await waitInput();
    return `tapped "${label.replace(/\s+/g, ' ').slice(0, 30)}"`;
  });

  // A broad family (e.g. Sicilian) opens the variation picker — a real
  // user taps a specific line to dive in. Click the first variation tile.
  await step('if a variation picker appears, tap a line', async () => {
    if (await visible('[data-testid="line-picker"]')) {
      // option buttons carry no testid; skip the mode/dismiss buttons
      const optBtns = page.locator('[data-testid="line-picker"] button:not([data-testid])');
      const n = await optBtns.count();
      if (n > 0) { await optBtns.first().click({ force: true }).catch(() => undefined); await waitInput(); return `tapped variation (of ${n})`; }
      return 'picker shown but no option button';
    }
    return 'no variation picker (went straight to lesson)';
  });

  await step('watch the lesson play (tap Skip / pick forks)', async () => {
    const reached = await watchLessonToEnd();
    return `reached ${reached}`;
  });

  // At the leaf a user taps "Continue learning" to see stages.
  await step('tap Continue learning (or Play this line)', async () => {
    if (!(await clickIf('[data-testid="walkthrough-continue-learning"]'))) {
      await clickIf('[data-testid="walkthrough-leaf-play-real"]');
    }
    await page.waitForTimeout(1500);
  });

  // Stage menu: tap Quiz, answer a question by clicking a choice.
  await step('tap Quiz stage tile', async () => { await clickIf('[data-testid="walkthrough-stage-concepts"]'); await page.waitForTimeout(2000); });
  await step('answer a quiz question (click a choice)', async () => {
    const clicked = await clickIf('[data-testid="walkthrough-quiz-choice-0"]');
    await page.waitForTimeout(1200);
    await clickIf('[data-testid="walkthrough-quiz-next"]');
    await page.waitForTimeout(1000);
    return clicked ? 'answered' : 'no quiz choice surfaced';
  });

  // Back to menu → tap Drill, make a real board move by clicking squares.
  await step('go back to stage menu', async () => {
    await clickIf('[data-testid="walkthrough-quiz-complete"] [data-testid="walkthrough-stage-menu"]');
    await clickIf('[data-testid="walkthrough-back-to-menu"]');
    await page.waitForTimeout(800);
  });
  await step('tap Drill stage tile', async () => { await clickIf('[data-testid="walkthrough-stage-drill"]'); await page.waitForTimeout(1500); });
  await step('pick a drill line + play a move by clicking squares', async () => {
    await clickIf('[data-testid="walkthrough-drill-line-0"]');
    await page.waitForTimeout(1500);
    // try a common opening move by tapping squares
    const e2 = page.locator('[data-square="e2"]').first();
    const e4 = page.locator('[data-square="e4"]').first();
    if (await e2.isVisible().catch(() => false) && await e4.isVisible().catch(() => false)) {
      await e2.click({ force: true }).catch(() => undefined); await page.waitForTimeout(300);
      await e4.click({ force: true }).catch(() => undefined);
      return 'tapped e2→e4';
    }
    return 'drill board not interactable';
  });

  // A user types ONE real question in the chat box (legit use of the box).
  await step('ask a real question in chat', async () => {
    await waitInput();
    await page.locator('[data-testid="chat-text-input"]').fill('what is the main idea of this opening?').catch(() => undefined);
    await clickIf('[data-testid="chat-send-btn"]');
    await page.waitForTimeout(6000);
  });

  // If a walkthrough paused, tap Resume; otherwise tap End.
  await step('tap Resume or End on the lesson panel', async () => {
    if (!(await clickIf('[data-testid="walkthrough-resume"]'))) {
      await clickIf('[data-testid="walkthrough-end-from-paused"]') || await clickIf('[data-testid="walkthrough-end"]');
    }
    await page.waitForTimeout(2000);
  });

  // Final settle — let any deferred renders flush so a late dup-key shows.
  await step('settle + final render check', async () => { await page.waitForTimeout(3000); });

  const totalErrs = steps.reduce((a, s) => a + s.newErrorCount, 0);
  const firstBad = steps.find((s) => s.newErrorCount > 0);
  console.log(`\n===== FUNCTIONAL AUDIT SUMMARY =====`);
  console.log(`  steps: ${steps.length}  total console/page errors: ${totalErrs}`);
  if (firstBad) console.log(`  FIRST error introduced at step: "${firstBad.name}" → ${firstBad.errors[0]}`);
  else console.log(`  no console/page errors across the whole functional play-through ✅`);
  if (keyDetails.length) {
    console.log(`\n  ---- DUPLICATE-KEY DETAILS (key + component stack) ----`);
    for (const k of keyDetails) console.log(`  key="${k.key}"\n    stack: ${k.stack.replace(/\s+/g, ' ')}`);
  }
  await writeFile(join(OUT, 'report.json'), JSON.stringify({ base: BASE, steps }, null, 2), 'utf-8');
  console.log(`  report: ${join(OUT, 'report.json')}`);
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
