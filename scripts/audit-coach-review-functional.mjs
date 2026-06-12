#!/usr/bin/env node
/**
 * audit-coach-review-functional — FUNCTIONAL coverage grid for /coach/review.
 *
 * Drives the surface like a real person: open a seeded review game, step the
 * moves with the nav buttons, toggle engine lines / narration / explore, open
 * the ask panel and TYPE a question, reach a blunder and exercise show-me +
 * the blunder-capture flow, then the play-again / practice-in-chat / resume /
 * back affordances. EVERY probe ASSERTS it reached its target — a missing
 * target = FAIL, never a silent "ok". Emits a per-function coverage grid +
 * captures console/page errors (incl. React key warnings).
 *
 * Usage: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 \
 *        node scripts/audit-coach-review-functional.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/coach-review-functional-${stamp}`;

const exe = await resolveChromiumExecutable(false);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();

const errs = [];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/same key|each child|unique "key"|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|Cannot update a component/i.test(t)) errs.push(t.slice(0, 160));
});
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));

const GRID = [];
function record(fn, reached, detail) {
  GRID.push({ fn, reached, detail });
  console.log(`  ${reached ? '✅' : '❌'} ${fn.padEnd(30)} ${detail}`);
}
async function visible(sel) { return page.locator(sel).first().isVisible().catch(() => false); }
async function clickReq(sel) {
  const el = page.locator(sel).first();
  if (!(await el.isVisible().catch(() => false))) return false;
  await el.click({ force: true, timeout: 6000 }).catch(() => undefined);
  return true;
}
async function until(pred, ms = 20000, step = 500) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await pred()) return true; await page.waitForTimeout(step); }
  return false;
}
async function boardFen() {
  // "position changed" signal: the review panel's text carries the move
  // index + per-move narration/classification, which change on every step —
  // more reliable than the board's transform-based innerHTML.
  return page.locator('[data-testid="coach-game-review"]').first().innerText({ timeout: 2000 }).catch(() => '').then((t) => t.replace(/\s+/g, ' ').slice(0, 300));
}

async function main() {
  console.log(`[review] ${BASE}  out=${OUT}\n`);
  // boot + seed real data if the fixture exists (else the app seeds samples)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const fx = await loadFixtureIntoIDB(page).catch(() => ({ loaded: false }));
  console.log(`  [fixture] ${fx.loaded ? `${fx.wrote} rows` : 'none (app seeds review samples)'}`);

  // ── list page ──
  await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-testid="coach-review-list-page"]').waitFor({ timeout: 15000 }).catch(() => undefined);
  const listMounts = await visible('[data-testid="coach-review-list-page"]');
  const gotCard = await until(() => visible('[data-testid^="review-game-card-"]'), 30000);
  record('review-list-mounts', listMounts, listMounts ? 'list page' : 'no list');
  record('review-cards-seeded', gotCard, gotCard ? 'game card(s) present' : 'no game cards');

  // ── open a review session (pick a sample WITH blunders so the
  //    classification / capture / show-me functions are reachable) ──
  let opened = false;
  if (gotCard) {
    const blunderCard = page.locator('[data-testid="review-game-card-sample-morphy-opera-1858"]');
    const target = (await blunderCard.isVisible().catch(() => false))
      ? blunderCard
      : page.locator('[data-testid^="review-game-card-"]').first();
    await target.click({ force: true }).catch(() => undefined);
    opened = await until(() => visible('[data-testid="coach-game-review"]'), 25000);
  }
  record('open-review-session', opened, opened ? 'session mounted' : 'session did not open');
  if (!opened) { return finish(); }

  // ── the session opens to a SUMMARY card; the "Start" button is gated on the
  //    LLM-generated walk narration ("Preparing…" → "Start"). Wait for it to
  //    ENABLE, then tap it to enter the walk. Never-enabling >75s = a wedge.
  const startEnabled = await until(async () => {
    const b = page.locator('[data-testid="start-walk-btn"]').first();
    return (await b.isVisible().catch(() => false)) && (await b.isEnabled().catch(() => false));
  }, 75000);
  const started = startEnabled &&
    await clickReq('[data-testid="start-walk-btn"]') &&
    await until(() => visible('[data-testid="review-forward-btn"]') || visible('[data-testid="review-nav-controls"]'), 15000);
  record('start-walk', started, startEnabled ? (started ? 'entered the move walk' : 'enabled but walk did not open') : 'Start stayed DISABLED >75s (walk narration never ready — wedge)');

  // ── nav forward / back ──
  await until(() => visible('[data-testid="review-forward-btn"]'), 15000);
  const f0 = await boardFen();
  await clickReq('[data-testid="review-forward-btn"]');
  const fwd = await until(async () => (await boardFen()) !== f0, 8000);
  record('nav-forward', fwd, fwd ? 'advanced a move' : 'board did not change');
  const f1 = await boardFen();
  await clickReq('[data-testid="review-back-btn"]');
  const back = await until(async () => (await boardFen()) !== f1, 8000);
  record('nav-back', back, back ? 'stepped back' : 'board did not change');

  // ── step forward until a classification badge + (blunder) capture/show-me ──
  let sawBadge = false, sawCapture = false, sawNarration = false;
  for (let i = 0; i < 40 && !(sawBadge && sawCapture); i++) {
    if (await visible('[data-testid="review-classification-badge"]')) sawBadge = true;
    if (await visible('[data-testid="review-narration-banner"]')) sawNarration = true;
    if (await visible('[data-testid="review-blunder-capture"]')) sawCapture = true;
    if (sawBadge && sawCapture) break;
    if (!(await clickReq('[data-testid="review-forward-btn"]'))) break;
    await page.waitForTimeout(700);
  }
  record('classification-badge', sawBadge, sawBadge ? 'badge shown on a move' : 'no badge in 40 moves');
  record('narration-banner', sawNarration, sawNarration ? 'narration shown' : 'no narration banner');

  // ── engine lines toggle ──
  const engT = await clickReq('[data-testid="review-engine-lines-toggle"]');
  record('engine-lines-toggle', engT && await until(() => visible('[data-testid="review-engine-lines-panel"]'), 8000), engT ? 'panel toggled' : 'no toggle');

  // ── narration toggle ──
  record('narration-toggle', await clickReq('[data-testid="walk-narration-toggle-btn"]'), 'tapped narration toggle');

  // ── ask panel: open → type a real question → response ──
  const askOpen = await clickReq('[data-testid="walk-ask-toggle-btn"]') && await until(() => visible('[data-testid="walk-ask-panel"]'), 8000);
  let askAnswered = false;
  if (askOpen) {
    const input = page.locator('[data-testid="walk-ask-panel"] textarea, [data-testid="walk-ask-panel"] input').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill('why was this a mistake?').catch(() => undefined);
      await page.keyboard.press('Enter').catch(() => undefined);
      askAnswered = await until(() => visible('[data-testid="walk-ask-response"]'), 40000);
    }
  }
  record('ask-panel + answer', askOpen && askAnswered, askOpen ? (askAnswered ? 'answered' : 'opened, no answer') : 'panel did not open');

  // ── blunder-capture flow (continue/skip/teach) ──
  if (await visible('[data-testid="review-blunder-capture"]')) {
    record('blunder-capture-shown', true, 'capture prompt present');
    record('blunder-capture-skip', await clickReq('[data-testid="review-capture-skip"]'), 'tapped skip');
  } else {
    record('blunder-capture-shown', sawCapture, sawCapture ? 'seen earlier' : 'no capture prompt (no blunder in sample)');
  }

  // ── show-me / explore / missed-tactics (appear contextually) ──
  record('show-me-btn', await clickReq('[data-testid="walk-show-me-btn"]') || await visible('[data-testid="walk-show-me-btn"]'), 'show-me present/tapped');
  record('explore-toggle', await clickReq('[data-testid="walk-explore-toggle-btn"]') || await visible('[data-testid="walk-explore-toggle-btn"]'), 'explore present/tapped');
  record('missed-tactics', await visible('[data-testid="walk-missed-tactics"]'), 'missed-tactics section present');

  // ── end-of-walk affordances ──
  record('practice-in-chat-btn', await visible('[data-testid="walk-practice-in-chat-btn"]') || await visible('[data-testid="walk-practice-in-chat"]'), 'present');
  record('play-again-btn', await visible('[data-testid="walk-play-again-btn"]'), 'present');
  record('resume-game-btn', await visible('[data-testid="walk-resume-game-btn"]'), 'present');

  // ── back to list ──
  const backable = await clickReq('[data-testid="review-back-btn"]') || await clickReq('[data-testid="walk-back-to-coach-btn"]');
  record('back-navigation', backable, backable ? 'tapped back' : 'no back affordance');

  return finish();

  async function finish() {
    const reached = GRID.filter((g) => g.reached).length;
    console.log(`\n===== COACH-REVIEW COVERAGE GRID =====`);
    console.log(`  functions probed: ${GRID.length}   reached/passed: ${reached}   FAILED/unreached: ${GRID.length - reached}`);
    console.log(`  console/page errors: ${errs.length}`);
    const failed = GRID.filter((g) => !g.reached);
    if (failed.length) console.log(`  ❌ NOT REACHED: ${failed.map((f) => f.fn).join(', ')}`);
    else console.log(`  ✅ every probed function reached`);
    for (const e of [...new Set(errs)].slice(0, 6)) console.log(`     ⚠ ${e}`);
    await writeFile(join(OUT, 'coverage-grid.json'), JSON.stringify({ base: BASE, grid: GRID, errors: [...new Set(errs)] }, null, 2), 'utf-8');
    console.log(`  report: ${join(OUT, 'coverage-grid.json')}`);
    await browser.close();
  }
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
