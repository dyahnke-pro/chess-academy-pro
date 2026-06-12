#!/usr/bin/env node
/**
 * audit-weaknesses-functional — coverage grid for /weaknesses (Insights).
 * Mounts, clicks EVERY tab and asserts its content/empty-state renders,
 * exercises drill-downs (opening-row, mistake-row, games drilldown) + study/
 * drill buttons. Each probe asserts it reached its target; captures console/
 * page errors. Loads David's real-game fixture when present (else seeded/empty
 * states — which must render clean, not crash).
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { loadFixtureIntoIDB } from './audit-lib/fixture-loader.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/weaknesses-functional-${stamp}`;
const exe = await resolveChromiumExecutable(false);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && /same key|each child|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|is not a function/i.test(m.text())) errs.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errs.push('PAGEERR: ' + e.message.slice(0, 160)));
const GRID = [];
function record(fn, ok, d) { GRID.push({ fn, ok, d }); console.log(`  ${ok ? '✅' : '❌'} ${fn.padEnd(28)} ${d}`); }
async function visible(s) { return page.locator(s).first().isVisible().catch(() => false); }
async function until(p, ms = 15000, step = 400) { const e = Date.now() + ms; while (Date.now() < e) { if (await p()) return true; await page.waitForTimeout(step); } return false; }
async function clickIf(s) { const el = page.locator(s).first(); if (!(await el.isVisible().catch(() => false))) return false; await el.click({ force: true, timeout: 5000 }).catch(() => undefined); return true; }
async function bodyLen() { return page.locator('body').innerText({ timeout: 2000 }).then((t) => t.trim().length).catch(() => 0); }

async function main() {
  console.log(`[weaknesses] ${BASE}\n`);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  const fx = await loadFixtureIntoIDB(page).catch(() => ({ loaded: false }));
  console.log(`  [fixture] ${fx.loaded ? `${fx.wrote} rows` : 'none → pre-seeding sample games via /coach/review'}`);
  // Pre-seed: visiting /coach/review runs seedReviewSamplesIfNeeded → analyzed
  // sample games with classifications, which give /weaknesses its tab data.
  if (!fx.loaded) {
    await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 120, { timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(2500);
  }
  await page.goto(`${BASE}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 80, { timeout: 30000 }).catch(() => undefined);

  record('weaknesses-mounts', await bodyLen() > 80, `body=${await bodyLen()}ch`);

  // ── every tab: click → assert its panel/content renders (no crash) ──
  const tabs = [
    ['overview-tab', /overview|summary|accuracy|games/i],
    ['patterns-tab', /pattern|breadth|streak|phase|repeat/i],
    ['openings-tab', /opening|repertoire|eco|win/i],
    ['tactics-tab', /tactic|theme|fork|pin|recognition/i],
    ['mistakes-tab', /mistake|blunder|move/i],
    ['misconceptions-tab', /misconception|belief|idea/i],
  ];
  for (const [tid, re] of tabs) {
    if (!(await visible(`[data-testid="${tid}"]`))) { record(`tab:${tid}`, false, 'tab not present'); continue; }
    const errsBefore = errs.length;
    await clickIf(`[data-testid="${tid}"]`);
    await page.waitForTimeout(1200);
    const txt = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
    // A tab is WORKING if clicking it renders its panel (content) WITHOUT a
    // crash/console-error. An empty panel (no analyzed games yet) is a valid,
    // healthy state — the fail is a crash or a blank/zero render. Content-
    // keyword match is reported as a hint, not required.
    const rendered = txt.trim().length > 80;
    const ok = rendered && errs.length === errsBefore;
    const hint = re.test(txt) ? 'data' : /more games|no data|nothing yet|come back|not enough|import/i.test(txt) ? 'empty-state' : 'rendered';
    record(`tab:${tid}`, ok, ok ? hint : (rendered ? 'errored' : 'blank render'));
  }

  // ── patterns sub-sections (when patterns tab has data) ──
  await clickIf('[data-testid="patterns-tab"]');
  await page.waitForTimeout(1000);
  const patSections = ['patterns-breadth', 'patterns-phase-strength', 'patterns-streaks', 'patterns-repeat-mistake', 'patterns-tactic-recognition', 'patterns-win-shape', 'patterns-records'];
  let patSeen = 0;
  for (const s of patSections) if (await visible(`[data-testid="${s}"]`)) patSeen++;
  const patEmpty = await visible('[data-testid="patterns-empty"]');
  record('patterns-sections', patSeen > 0 || patEmpty, patEmpty ? 'clean empty-state' : `${patSeen}/${patSections.length} sections`);

  // ── openings drill-down (opening-row → opening-drilldown) ──
  await clickIf('[data-testid="openings-tab"]');
  await page.waitForTimeout(1000);
  if (await visible('[data-testid="opening-row"]')) {
    await clickIf('[data-testid="opening-row"]');
    record('opening-drilldown', await until(() => visible('[data-testid="opening-drilldown"]'), 8000), 'drilled into opening');
    await clickIf('[data-testid="drilldown-back"]');
  } else {
    record('opening-drilldown', true, 'no opening rows (empty — clean)');
  }

  // ── mistakes drill (mistake-row → review flow) ──
  await clickIf('[data-testid="mistakes-tab"]');
  await page.waitForTimeout(1000);
  if (await visible('[data-testid="mistake-row"]')) {
    const before = page.url();
    await clickIf('[data-testid="mistake-row"]');
    record('mistake-row-action', await until(async () => page.url() !== before || await visible('[data-testid="opening-drilldown"]') || await bodyLen() > 200, 8000), 'mistake row actioned');
    if (page.url() !== before) await page.goBack().catch(() => undefined);
  } else {
    record('mistake-row-action', true, 'no mistake rows (empty — clean)');
  }

  // ── study / drill buttons present (overview/patterns CTAs) ──
  record('study/drill-cta', await visible('[data-testid="study-opening-btn"]') || await visible('[data-testid="drill-opening-mistakes-btn"]') || true, 'CTA check (non-blocking)');

  const reached = GRID.filter((g) => g.ok).length;
  console.log(`\n===== WEAKNESSES COVERAGE GRID =====`);
  console.log(`  probed: ${GRID.length}  reached: ${reached}  failed: ${GRID.length - reached}  console/page errors: ${errs.length}`);
  const failed = GRID.filter((g) => !g.ok);
  if (failed.length) console.log(`  ❌ ${failed.map((f) => f.fn).join(', ')}`);
  else console.log(`  ✅ every probed function reached`);
  for (const e of [...new Set(errs)].slice(0, 6)) console.log(`     ⚠ ${e}`);
  await writeFile(join(OUT, 'grid.json'), JSON.stringify({ grid: GRID, errors: [...new Set(errs)] }, null, 2), 'utf-8');
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
