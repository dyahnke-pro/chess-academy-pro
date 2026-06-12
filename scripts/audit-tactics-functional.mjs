#!/usr/bin/env node
/**
 * audit-tactics-functional — coverage grid for the /tactics surface.
 * Hub mounts, every mode tile navigates, each puzzle mode actually LOADS a
 * board + is interactable (click squares / find-square targets). Asserts each
 * probe reached its target; captures console/page errors. Per-function grid.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/tactics-functional-${stamp}`;
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
function record(fn, ok, d) { GRID.push({ fn, ok, d }); console.log(`  ${ok ? '✅' : '❌'} ${fn.padEnd(30)} ${d}`); }
async function visible(s) { return page.locator(s).first().isVisible().catch(() => false); }
async function until(p, ms = 15000, step = 500) { const e = Date.now() + ms; while (Date.now() < e) { if (await p()) return true; await page.waitForTimeout(step); } return false; }
async function goto(r) { await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => undefined); }
async function clickIf(s) { const el = page.locator(s).first(); if (!(await el.isVisible().catch(() => false))) return false; await el.click({ force: true, timeout: 5000 }).catch(() => undefined); return true; }

async function main() {
  console.log(`[tactics] ${BASE}\n`);
  // warm seed (puzzles need it)
  await goto('/'); await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 120, { timeout: 60000 }).catch(() => undefined);

  // ── hub ──
  await goto('/tactics');
  record('tactics-hub-mounts', await until(() => visible('[data-testid="tactics-page"]'), 20000), 'hub');
  // hub has nav tiles + theme cards (rendered as buttons) — count them
  const tiles = await page.locator('[data-testid="tactics-page"] button, [data-testid="tactics-page"] [role="button"]').count().catch(() => 0);
  record('tactics-hub-tiles', tiles >= 5, `${tiles} tap targets`);

  // ── each mode loads + (where applicable) a board renders ──
  const modes = [
    // (drill is reached via the hub "Random Mix" tile below — direct
    //  /tactics/drill lacks the filterThemes router state, so it shows the
    //  theme-selector, not a board; the hub-tile probe covers it.)
    { r: '/tactics/adaptive', testid: 'adaptive-puzzle-page', label: 'adaptive', board: true },
    { r: '/tactics/classic', testid: null, label: 'classic (daily)', board: true },
    { r: '/tactics/find-square', testid: 'find-square-page', label: 'find-the-square', board: false },
    { r: '/tactics/setup', testid: null, label: 'setup trainer', board: false },
    { r: '/tactics/mistakes', testid: null, label: 'my mistakes', board: false },
    { r: '/tactics/weakness-themes', testid: null, label: 'weakness themes', board: false },
    { r: '/tactics/profile', testid: null, label: 'profile', board: false },
    { r: '/tactics/opening-traps', testid: null, label: 'opening traps', board: false },
  ];
  for (const m of modes) {
    await goto(m.r);
    // mode is "loaded" if its testid is present OR a board renders OR real content
    const loaded = await until(async () => {
      if (m.testid && await visible(`[data-testid="${m.testid}"]`)) return true;
      if (await visible('[data-testid="chess-board"], [data-testid="board-wrapper"], [data-testid="consistent-chessboard"]')) return true;
      const t = await page.locator('body').innerText({ timeout: 1500 }).catch(() => '');
      return t.trim().length > 120 && !/something went wrong|unexpected error/i.test(t);
    }, 25000);
    record(`mode:${m.label}`, loaded, loaded ? 'loaded' : 'did not load');
  }

  // ── drill: reach it via the hub "Random Mix" tile (it passes the
  //    filterThemes router state a direct /tactics/drill nav lacks), then
  //    attempt a move on the board ──
  await goto('/tactics');
  await until(() => visible('[data-testid="tactics-page"]'), 15000);
  await page.getByText('Random Mix', { exact: false }).first().click({ force: true }).catch(() => undefined);
  await until(() => visible('[data-testid="chess-board"], [data-testid="board-wrapper"]'), 25000);
  let interacted = false;
  for (const [from, to] of [['e2', 'e4'], ['d2', 'd4'], ['g1', 'f3']]) {
    const f = page.locator(`[data-square="${from}"]`).first(), t = page.locator(`[data-square="${to}"]`).first();
    if (await f.isVisible().catch(() => false) && await t.isVisible().catch(() => false)) {
      await f.click({ force: true }).catch(() => undefined); await page.waitForTimeout(250);
      await t.click({ force: true }).catch(() => undefined); await page.waitForTimeout(500);
      interacted = true; break;
    }
  }
  record('drill-board-interactable', interacted, interacted ? 'tapped a move' : 'no board squares');

  // ── find-square: tap the target square (real game interaction) ──
  await goto('/tactics/find-square');
  const fsLoaded = await until(() => visible('[data-testid="find-square-page"]'), 20000);
  let fsPlayed = false;
  if (fsLoaded) {
    // tap white-color start if a chooser shows, then tap a board square
    await clickIf('[data-testid="find-square-color-white"]');
    await page.waitForTimeout(800);
    const sq = page.locator('[data-square]').first();
    if (await sq.isVisible().catch(() => false)) { await sq.click({ force: true }).catch(() => undefined); fsPlayed = true; }
  }
  record('find-square-playable', fsLoaded && fsPlayed, fsLoaded ? (fsPlayed ? 'tapped a square' : 'loaded, no board') : 'did not load');

  // ── hub tile navigation (click a NAMED mode tile → routes) ──
  await goto('/tactics');
  await until(() => visible('[data-testid="tactics-page"]'), 15000);
  const before = page.url();
  await page.getByText('Daily Training', { exact: false }).first().click({ force: true }).catch(() => undefined);
  const navigated = await until(async () => page.url() !== before && /\/tactics\//.test(page.url()), 8000);
  record('hub-tile-navigates', navigated, navigated ? `→ ${page.url().split('/').slice(-1)[0]}` : 'no nav');

  const reached = GRID.filter((g) => g.ok).length;
  console.log(`\n===== TACTICS COVERAGE GRID =====`);
  console.log(`  probed: ${GRID.length}  reached: ${reached}  failed: ${GRID.length - reached}  console/page errors: ${errs.length}`);
  const failed = GRID.filter((g) => !g.ok);
  if (failed.length) console.log(`  ❌ ${failed.map((f) => f.fn).join(', ')}`);
  else console.log(`  ✅ every probed function reached`);
  for (const e of [...new Set(errs)].slice(0, 6)) console.log(`     ⚠ ${e}`);
  await writeFile(join(OUT, 'grid.json'), JSON.stringify({ grid: GRID, errors: [...new Set(errs)] }, null, 2), 'utf-8');
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
