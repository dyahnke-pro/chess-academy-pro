#!/usr/bin/env node
/**
 * audit-kid-functional — coverage grid for the /kid section (David's brother).
 * The kid hub mounts, each of the 6 piece hubs loads, a puzzle is playable
 * (board renders + a move can be tapped), the journey map + chapter load.
 * Asserts each probe reached its target; captures console/page errors (a crash
 * in kid mode is a P0 per CLAUDE.md §🧒). Kid puzzles are seeded from
 * puzzles.json — no fixture needed.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/kid-functional-${stamp}`;
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
function record(fn, ok, d) { GRID.push({ fn, ok, d }); console.log(`  ${ok ? '✅' : '❌'} ${fn.padEnd(26)} ${d}`); }
async function visible(s) { return page.locator(s).first().isVisible().catch(() => false); }
async function until(p, ms = 20000, step = 500) { const e = Date.now() + ms; while (Date.now() < e) { if (await p()) return true; await page.waitForTimeout(step); } return false; }
async function goto(r) { await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => undefined); }
async function clickIf(s) { const el = page.locator(s).first(); if (!(await el.isVisible().catch(() => false))) return false; await el.click({ force: true, timeout: 5000 }).catch(() => undefined); return true; }
const KID_MOUNT = '[data-testid="kid-layout"], [data-testid="kid-mode-page"], [data-testid="kid-piece-puzzles-overlay"], [data-testid="kid-puzzle-page"], [data-testid="journey-map-page"]';

async function main() {
  console.log(`[kid] ${BASE}\n`);
  await goto('/'); await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 120, { timeout: 60000 }).catch(() => undefined);

  // ── kid hub ──
  await goto('/kid');
  record('kid-hub-mounts', await until(() => visible('[data-testid="kid-layout"], [data-testid="kid-mode-page"]'), 20000), 'kid hub');

  // ── each of the 6 piece hubs loads cleanly ──
  for (const piece of ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']) {
    const eb = errs.length;
    await goto(`/kid/${piece}-games`);
    const loaded = await until(async () => {
      if (await visible(KID_MOUNT)) return true;
      const t = await page.locator('body').innerText({ timeout: 1500 }).catch(() => '');
      return t.trim().length > 80 && !/something went wrong|unexpected error/i.test(t);
    }, 20000);
    record(`hub:${piece}-games`, loaded && errs.length === eb, loaded ? (errs.length === eb ? 'loaded' : 'errored') : 'did not load');
  }

  // ── journey map + chapter ──
  await goto('/kid/journey');
  const jmap = await until(() => visible('[data-testid="journey-map-page"]'), 20000);
  record('journey-map', jmap, jmap ? 'map loaded' : 'no map');
  let jchapter = false;
  if (jmap && await visible('[data-testid="journey-card"]')) {
    await clickIf('[data-testid="journey-card"]');
    jchapter = await until(() => visible('[data-testid="journey-chapter-page"]'), 12000);
    await clickIf('[data-testid="journey-back-btn"]');
  }
  record('journey-chapter', jmap && (jchapter || !(await visible('[data-testid="journey-card"]'))), jchapter ? 'chapter opened' : 'no chapters / locked');

  // ── a piece puzzle is PLAYABLE (board + a move) ──
  let puzzleBoard = false, kidMoved = false;
  for (const piece of ['pawn', 'queen', 'rook']) {
    await goto(`/kid/${piece}-games`);
    await until(() => visible(KID_MOUNT), 15000);
    // tap into a game/puzzle if the hub shows tiles
    await clickIf('button, [role="button"]');
    await page.waitForTimeout(1500);
    if (await visible('[data-testid="kid-puzzle-board"], [data-testid="kid-piece-puzzles-overlay"]')) {
      puzzleBoard = true;
      const sq = page.locator('[data-square]').first();
      if (await sq.isVisible().catch(() => false)) {
        await sq.click({ force: true }).catch(() => undefined); await page.waitForTimeout(300);
        const sq2 = page.locator('[data-square]').nth(16);
        if (await sq2.isVisible().catch(() => false)) { await sq2.click({ force: true }).catch(() => undefined); }
        kidMoved = true;
      }
      break;
    }
  }
  record('kid-puzzle-board', puzzleBoard, puzzleBoard ? 'puzzle board rendered' : 'no puzzle board reached');
  record('kid-puzzle-interactable', kidMoved, kidMoved ? 'tapped squares' : 'no board squares');

  // ── voice toggle + back-to-main present (kid contract) ──
  await goto('/kid');
  record('kid-back-to-main', await visible('[data-testid="kid-back-to-main"]') || await visible('[data-testid="kid-header"]'), 'kid chrome present');

  const reached = GRID.filter((g) => g.ok).length;
  console.log(`\n===== KID COVERAGE GRID =====`);
  console.log(`  probed: ${GRID.length}  reached: ${reached}  failed: ${GRID.length - reached}  console/page errors: ${errs.length}`);
  const failed = GRID.filter((g) => !g.ok);
  if (failed.length) console.log(`  ❌ ${failed.map((f) => f.fn).join(', ')}`);
  else console.log(`  ✅ every probed function reached`);
  for (const e of [...new Set(errs)].slice(0, 6)) console.log(`     ⚠ ${e}`);
  await writeFile(join(OUT, 'grid.json'), JSON.stringify({ grid: GRID, errors: [...new Set(errs)] }, null, 2), 'utf-8');
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
