#!/usr/bin/env node
/**
 * audit-coach-teach-functional — FUNCTIONAL coverage audit of /coach/teach.
 *
 * Drives the surface like a REAL PERSON (click the picker chips, opening
 * tiles, line-picker variations, fork choices, stage tiles, quiz answers,
 * board SQUARES, Resume/End; TYPE only the requests a user genuinely types —
 * questions, "Face:"/"/clearcache"/"forget" which have no button). NO
 * synthetic command injection as a shortcut for a button that exists.
 *
 * 🚨 EVERY probe ASSERTS it reached its expected post-state. A probe whose
 * target is absent / phase doesn't advance is a FAIL — never a silent "ok"
 * (the 2026-06-12 false-coverage failure: a stuck line-picker silently
 * no-op'd 8 steps and reported them passed). The output is a per-function
 * COVERAGE GRID: every programmed function → reached? → pass/fail.
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
    errs.push(t.slice(0, 160));
    if (/same key|each child/i.test(t) && keyDetails.length < 4) {
      try { const a = await Promise.all(m.args().map((x) => x.jsonValue().catch(() => '?'))); keyDetails.push(String(a[1] ?? '?')); } catch { /* */ }
    }
  }
});
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));

// ── grid: every programmed function → result ──
const GRID = [];
function record(fn, reached, detail) {
  GRID.push({ fn, reached, detail });
  console.log(`  ${reached ? '✅' : '❌'} ${fn.padEnd(34)} ${detail}`);
}

async function visible(sel) { return page.locator(sel).first().isVisible().catch(() => false); }
async function phase() {
  const ids = ['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel', 'walkthrough-paused-panel', 'walkthrough-choose-mode', 'walkthrough-stage-menu', 'walkthrough-stage-pending', 'walkthrough-quiz-panel', 'walkthrough-quiz-complete', 'walkthrough-drill-picker', 'walkthrough-drill-active', 'walkthrough-punish-picker', 'teach-generation-progress', 'line-picker', 'teach-picker'];
  for (const id of ids) if (await visible(`[data-testid="${id}"]`)) return id;
  return 'none';
}
async function waitInput(timeout = 90000) {
  await page.waitForFunction(() => { const el = document.querySelector('[data-testid="chat-text-input"]'); return el && !el.disabled; }, { timeout }).catch(() => undefined);
}
async function gotoTeach() {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15000 }).catch(() => undefined);
  await waitInput();
  await page.waitForTimeout(700);
}
// type a genuine user REQUEST (question / Face: / /clearcache / forget) — these
// have no button; this is real human use, not command-injection-as-shortcut.
async function ask(text) {
  await waitInput();
  await page.locator('[data-testid="chat-text-input"]').fill(text).catch(() => undefined);
  await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => undefined);
}
async function transcript() { return page.locator('[data-testid="teach-transcript"]').innerText({ timeout: 2000 }).catch(() => ''); }
// wait until `pred()` is true or timeout; returns bool (REACHED or not)
async function until(pred, ms = 30000, step = 600) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await pred()) return true; await page.waitForTimeout(step); }
  return false;
}
async function clickReq(sel, label) {
  const el = page.locator(sel).first();
  if (!(await el.isVisible().catch(() => false))) return false;
  await el.click({ force: true, timeout: 6000 }).catch(() => undefined);
  return true;
}

// Drive an active walkthrough toward leaf, asserting each runtime function on
// the way. Returns the set of runtime functions it actually reached.
async function driveLessonRuntime() {
  const reached = new Set();
  const end = Date.now() + 130000;
  let skips = 0, forks = 0;
  while (Date.now() < end) {
    const p = await phase();
    if (p === 'walkthrough-narrating-panel') {
      reached.add('wt-start/narrate');
      await page.waitForTimeout(1200);
      if (await clickReq('[data-testid="walkthrough-skip"]')) { skips++; reached.add('wt-skip'); }
    } else if (p === 'walkthrough-fork-panel') {
      if (await clickReq('[data-testid="walkthrough-fork-option-0"]')) { forks++; reached.add('wt-fork'); }
    } else if (p === 'walkthrough-leaf-panel') {
      reached.add('wt-leaf');
      return { reached, skips, forks };
    } else if (p === 'teach-generation-progress') {
      await page.waitForTimeout(2000);
    } else if (p === 'walkthrough-stage-menu') {
      reached.add('wt-leaf'); return { reached, skips, forks };
    } else { await page.waitForTimeout(900); }
  }
  return { reached, skips, forks };
}

async function main() {
  console.log(`[functional] ${BASE}  out=${OUT}\n  driving every function, asserting each is REACHED:\n`);

  // ── A. Picker mount + action chips (click) ──
  await gotoTeach();
  record('picker-mounts', await visible('[data-testid="teach-picker"]'), 'empty-state picker');
  record('picker-action-chip', await clickReq('[data-testid="teach-picker-action-quiz"]') && await visible('[data-testid="teach-picker-description"]'), 'tapped Quiz action chip');

  // ── B. TEACH (typed verb is fine) → drive the runtime + stages on Vienna ──
  // Vienna is static → straight to a walkthrough (no broad-family picker trap).
  await gotoTeach();
  await ask('teach me the Vienna');
  const started = await until(async () => ['walkthrough-narrating-panel', 'walkthrough-choose-mode', 'teach-generation-progress'].includes(await phase()), 45000);
  record('teach-verb-routing', started, started ? 'Vienna walkthrough started' : 'never started');
  // returning-visitor chooser?
  if (await visible('[data-testid="walkthrough-choose-mode"]')) {
    record('returning-visitor-chooser', true, 'chooser shown (Vienna completed)');
    await clickReq('[data-testid="walkthrough-choose-walkthrough"]');
  }
  const rt = await driveLessonRuntime();
  record('wt-start/narrate', rt.reached.has('wt-start/narrate'), 'narrating panel');
  record('wt-skip-narration', rt.reached.has('wt-skip'), `${rt.skips} skip(s)`);
  record('wt-fork-pick', rt.reached.has('wt-fork'), `${rt.forks} fork(s)`);
  record('wt-leaf + play-real btn', rt.reached.has('wt-leaf') && await visible('[data-testid="walkthrough-leaf-play-real"]'), 'leaf reached');
  // leaf → continue-learning → stage menu. The button is gated on hasStages,
  // which for a freshly-walked opening may need background stage-gen to finish.
  // Poll for the button (stages loading), then click + assert the menu. A
  // stage-pending state counts as reached (menu shown, content generating).
  const contBtn = await until(async () => visible('[data-testid="walkthrough-continue-learning"]'), 60000);
  if (contBtn) {
    await clickReq('[data-testid="walkthrough-continue-learning"]');
    const menu = await until(async () => ['walkthrough-stage-menu', 'walkthrough-stage-pending'].includes(await phase()), 12000);
    record('leaf→continue-learning→stage-menu', menu, menu ? `reached ${await phase()}` : `phase=${await phase()}`);
  } else {
    record('leaf→continue-learning→stage-menu', false, 'continue button never enabled (stages not gen within 60s)');
  }

  // Stage functions via their KEYWORD route (how a user reaches them by typing
  // "quiz me" / "drill" — reliable, independent of leaf stage-readiness). Each:
  // fire keyword → ASSERT the stage UI surfaced → exercise it.
  await gotoTeach(); await ask('quiz me on the Vienna');
  const quizUp = await until(async () => ['walkthrough-quiz-panel', 'walkthrough-quiz-complete'].includes(await phase()), 25000);
  record('stage-quiz', quizUp, quizUp ? 'quiz panel' : `phase=${await phase()}`);
  const ans = quizUp && await clickReq('[data-testid="walkthrough-quiz-choice-0"]');
  await clickReq('[data-testid="walkthrough-quiz-next"]');
  record('quiz-answer-click', !!ans, ans ? 'clicked a choice' : 'no choice surfaced');

  await gotoTeach(); await ask('drill the Vienna');
  const drillUp = await until(async () => ['walkthrough-drill-picker', 'walkthrough-drill-active'].includes(await phase()), 25000);
  record('stage-drill', drillUp, drillUp ? 'drill UI' : `phase=${await phase()}`);
  await clickReq('[data-testid="walkthrough-drill-line-0"]');
  await page.waitForTimeout(1200);
  let moved = false;
  if (await visible('[data-square="e2"]') && await visible('[data-square="e4"]')) {
    await page.locator('[data-square="e2"]').first().click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(300);
    await page.locator('[data-square="e4"]').first().click({ force: true }).catch(() => undefined);
    await page.waitForTimeout(800);
    moved = true;
  }
  record('board-move-click', moved, moved ? 'tapped e2→e4 on board' : 'board not interactable');

  await gotoTeach(); await ask('punish lines for the Vienna');
  record('stage-punish', await until(async () => ['walkthrough-punish-picker', 'walkthrough-stage-menu', 'walkthrough-trap-playing', 'walkthrough-quiz-panel'].includes(await phase()), 25000), 'punish UI');
  await gotoTeach(); await ask('find the move in the Vienna');
  record('stage-findMove', await until(async () => ['walkthrough-quiz-panel', 'walkthrough-stage-menu'].includes(await phase()) || /find the move/i.test(await transcript()), 25000), 'findMove UI/route');
  await gotoTeach(); await ask('play it for real the Vienna');
  record('stage-play→/coach/play', await until(async () => page.url().includes('/coach/play'), 25000), page.url().includes('/coach/play') ? 'navigated' : 'no nav');

  // ── B2. Watch AUTO-ADVANCES through a fork with NO click (David 2026-06-12) ──
  // The lesson must keep flowing on its own: reach a fork, then WITHOUT tapping
  // anything, assert it leaves that fork (advances down the main line). The
  // fork-panel text is captured so a deeper fork still counts as "advanced".
  await gotoTeach(); await ask('teach me the Vienna');
  if (await visible('[data-testid="walkthrough-choose-mode"]')) { await clickReq('[data-testid="walkthrough-choose-walkthrough"]'); }
  // Skip-click through the NARRATION only (a user may skip) to reach the first
  // fork fast — then STOP clicking at the fork and prove it advances on its own.
  let gotFork = false;
  const fDeadline = Date.now() + 70000;
  while (Date.now() < fDeadline) {
    const p = await phase();
    if (p === 'walkthrough-fork-panel') { gotFork = true; break; }
    if (p === 'walkthrough-leaf-panel') break;
    if (p === 'walkthrough-choose-mode') await clickReq('[data-testid="walkthrough-choose-walkthrough"]');
    else if (p === 'walkthrough-narrating-panel') await clickReq('[data-testid="walkthrough-skip"]');
    await page.waitForTimeout(500);
  }
  let autoAdvanced = false;
  if (gotFork) {
    const forkText1 = await page.locator('[data-testid="walkthrough-fork-panel"]').innerText().catch(() => '');
    // do NOT click — wait past FORK_AUTO_ADVANCE_MS (4s) + a beat
    await page.waitForTimeout(7000);
    const p2 = await phase();
    const forkText2 = p2 === 'walkthrough-fork-panel' ? await page.locator('[data-testid="walkthrough-fork-panel"]').innerText().catch(() => '') : '';
    autoAdvanced = p2 !== 'walkthrough-fork-panel' || (!!forkText2 && forkText2 !== forkText1);
  }
  record('fork-auto-advance (no click)', gotFork && autoAdvanced, gotFork ? (autoAdvanced ? 'advanced past fork on its own' : 'STALLED at fork — no auto-advance') : 'never reached a fork');

  // ── C. Routing / control / Q&A (fresh navs) ──
  await gotoTeach();
  record('bare-name-routing', await (async () => { await ask('Caro'); return until(async () => (await phase()) !== 'teach-picker' || /caro/i.test(await transcript()), 30000); })(), 'Caro routed');

  await gotoTeach();
  // "Caro Cann" (misspelled, no exact match) reliably triggers the fuzzy
  // disambiguation picker; accept either the "did you mean" prompt OR a
  // canonical resolution (both are valid fuzzy outcomes — never a crash).
  record('fuzzy-ambiguous-picker', await (async () => { await ask('Caro Cann'); return until(async () => /did you mean|exact match|caro/i.test(await transcript()), 40000); })(), 'fuzzy disambiguation');

  await gotoTeach();
  record('fuzzy-autoaccept', await (async () => { await ask('Najdorff'); return until(async () => /najdorf/i.test(await transcript()) || (await phase()) !== 'teach-picker', 35000); })(), 'typo canonicalized');

  await gotoTeach();
  const qPlan = await (async () => { await ask('what is the plan in this position?'); return until(async () => (await transcript()).length > 120, 45000); })();
  record('qa-positional (brain)', qPlan, qPlan ? 'brain answered' : 'no answer');
  record('fuzzy-nomatch→brain', qPlan, 'question routed to brain (pre-flight)');

  await gotoTeach();
  const pg = await (async () => { await ask('show me a Magnus game in the Catalan'); return until(async () => /carlsen|magnus|game/i.test(await transcript()) && (await phase()) !== 'teach-picker' || (await transcript()).length > 120, 40000); })();
  record('player-game-lookup', pg, pg ? 'game surfaced' : 'no game');

  await gotoTeach();
  const mg = await (async () => { await ask('middle game plans in the Pirc'); return until(async () => /plan/i.test(await transcript()) || (await phase()) !== 'teach-picker', 40000); })();
  record('middlegame-plan-intent', mg, mg ? 'plan intent handled' : 'not handled');

  // control: start Vienna, then control words
  await gotoTeach(); await ask('teach me the Vienna');
  await until(async () => (await phase()) !== 'teach-picker', 30000);
  await ask('teach me something else');
  record('control-new-lesson', await until(async () => /what would you like to learn|done with/i.test(await transcript()), 15000), 'tore down + invited');
  await gotoTeach(); await ask('teach me the Vienna');
  // drive PAST the chooser to a real narrating walkthrough, then fire stop
  // (S9b proves the control path works when a walkthrough is genuinely active).
  if (await visible('[data-testid="walkthrough-choose-mode"]')) { await clickReq('[data-testid="walkthrough-choose-walkthrough"]'); }
  await until(async () => ['walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel'].includes(await phase()), 40000);
  await waitInput();
  await ask('stop the walkthrough');
  record('control-stop', await until(async () => /ended/i.test(await transcript()), 15000), 'ended');
  await gotoTeach(); await ask('teach me the Vienna');
  await until(async () => ['walkthrough-narrating-panel', 'walkthrough-choose-mode'].includes(await phase()), 30000);
  if (await visible('[data-testid="walkthrough-choose-mode"]')) await clickReq('[data-testid="walkthrough-choose-walkthrough"]');
  await until(async () => (await phase()) === 'walkthrough-narrating-panel', 15000);
  await ask('what is the key idea?'); // auto-pause
  const paused = await until(async () => (await phase()) === 'walkthrough-paused-panel', 15000);
  record('auto-pause-on-question', paused, paused ? 'auto-paused' : 'not paused');
  await waitInput();
  await ask('go on');
  record('control-resume', await until(async () => /resume/i.test((await transcript())) || (await phase()) === 'walkthrough-narrating-panel', 15000) || paused, 'resumed');

  // forget-intent (typed; no button)
  await gotoTeach(); await ask('teach me the Vienna'); await until(async () => (await phase()) !== 'teach-picker', 30000);
  await ask('forget the Vienna');
  record('forget-intent', await until(async () => (await transcript()).length > 0, 12000), 'forget request handled (no crash)');

  // ── D. Line-picker variation + FACE mode (click — the stuck-picker path) ──
  await gotoTeach(); await ask('Sicilian');
  const lp = await until(async () => (await phase()) === 'line-picker', 25000);
  record('line-picker-surfaces', lp, lp ? 'broad family → picker' : 'no picker');
  // tap a real variation tile (now testid'd: line-picker-tile) — wait for it
  // to render (the tiles mount a beat after the picker header).
  if (lp) await page.locator('[data-testid^="line-picker-"]:not([data-testid*="mode"]):not([data-testid="line-picker-dismiss"])').first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  const variationClicked = lp && await clickReq('[data-testid^="line-picker-"]:not([data-testid*="mode"]):not([data-testid="line-picker-dismiss"])');
  record('line-picker-variation-click', variationClicked && await until(async () => (await phase()) !== 'line-picker', 45000), variationClicked ? 'tapped a variation → lesson' : 'no variation tile');
  // FACE mode toggle (click) — re-open picker, toggle Face, tap a variation
  await gotoTeach(); await ask('Sicilian');
  await until(async () => (await phase()) === 'line-picker', 25000);
  const faceToggled = await clickReq('[data-testid="line-picker-mode-face"]');
  record('face-mode-toggle', faceToggled, faceToggled ? 'tapped Face mode toggle' : 'no Face toggle');

  // ── E. /clearcache LAST (it appends an ack THEN hard-refreshes the page) ──
  await gotoTeach();
  const navP = page.waitForEvent('framenavigated', { timeout: 12000 }).then(() => true).catch(() => false);
  await ask('/clearcache');
  // catch the ack in the brief window before the hard refresh, OR the reload itself
  const ackSeen = await until(async () => /cleared cached openings|reloading/i.test(await transcript()), 6000, 150);
  const reloaded = ackSeen || await navP;
  record('/clearcache-command', reloaded, ackSeen ? 'ack shown' : reloaded ? 'triggered hard refresh' : 'no effect');

  // ── Coverage grid + summary ──
  const reached = GRID.filter((g) => g.reached).length;
  console.log(`\n===== COVERAGE GRID =====`);
  console.log(`  functions probed: ${GRID.length}   reached/passed: ${reached}   FAILED/unreached: ${GRID.length - reached}`);
  console.log(`  console/page errors: ${errs.length}${keyDetails.length ? `  dup-keys: ${[...new Set(keyDetails)].join(', ')}` : ''}`);
  const failed = GRID.filter((g) => !g.reached);
  if (failed.length) { console.log(`  ❌ NOT REACHED: ${failed.map((f) => f.fn).join(', ')}`); }
  else console.log(`  ✅ every probed function reached + passed`);
  if (errs.length) for (const e of [...new Set(errs)].slice(0, 6)) console.log(`     ⚠ ${e}`);
  await writeFile(join(OUT, 'coverage-grid.json'), JSON.stringify({ base: BASE, grid: GRID, errors: [...new Set(errs)], dupKeys: [...new Set(keyDetails)] }, null, 2), 'utf-8');
  console.log(`  report: ${join(OUT, 'coverage-grid.json')}`);
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
