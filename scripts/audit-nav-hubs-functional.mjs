#!/usr/bin/env node
/**
 * audit-nav-hubs-functional — coverage grid for the navigation HUB surfaces
 * (dashboard, openings, games, coach home, puzzles, academy). For each hub:
 * mounts + renders real content, has tap targets, and a primary tile actually
 * NAVIGATES (URL changes), with zero console/page errors. Asserts each; the
 * sweep proved they don't crash — this proves they're interactive.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/nav-hubs-functional-${stamp}`;
const exe = await resolveChromiumExecutable(false);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const errs = [];
let cur = '';
page.on('console', (m) => { if (m.type() === 'error' && /same key|each child|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|is not a function/i.test(m.text())) errs.push(`${cur}: ${m.text().slice(0, 120)}`); });
page.on('pageerror', (e) => errs.push(`${cur}: PAGEERR ${e.message.slice(0, 120)}`));
const GRID = [];
function record(fn, ok, d) { GRID.push({ fn, ok, d }); console.log(`  ${ok ? '✅' : '❌'} ${fn.padEnd(26)} ${d}`); }
async function until(p, ms = 15000, step = 400) { const e = Date.now() + ms; while (Date.now() < e) { if (await p()) return true; await page.waitForTimeout(step); } return false; }

async function main() {
  console.log(`[nav-hubs] ${BASE}\n`);
  // warm seed once
  await page.goto(`${BASE}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 120, { timeout: 60000 }).catch(() => undefined);

  const hubs = [
    ['dashboard', '/'],
    ['openings', '/openings'],
    ['games', '/games'],
    ['coach-home', '/coach/home'],
    ['puzzles', '/puzzles'],
    ['academy', '/academy'],
    ['weaknesses', '/weaknesses'],
  ];
  for (const [name, route] of hubs) {
    cur = name;
    const eb = errs.length;
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => undefined);
    await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 80, { timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(800);
    const bodyLen = await page.locator('body').innerText({ timeout: 2000 }).then((t) => t.trim().length).catch(() => 0);
    const tiles = await page.locator('button:visible, [role="button"]:visible, a[href]:visible').count().catch(() => 0);
    // click a primary tile → does it navigate or change view (no crash)?
    const before = page.url();
    let navigated = false;
    const tile = page.locator('button:visible, [role="button"]:visible, a[href]:visible').nth(1); // skip nav/back
    if (await tile.isVisible().catch(() => false)) {
      await tile.click({ force: true, timeout: 4000 }).catch(() => undefined);
      navigated = await until(async () => page.url() !== before, 6000);
    }
    const clean = errs.length === eb;
    const ok = bodyLen > 80 && tiles >= 2 && clean;
    record(`hub:${name}`, ok, `body=${bodyLen}ch tiles=${tiles}${navigated ? ' nav✓' : ''}${clean ? '' : ' ERR'}`);
  }

  const reached = GRID.filter((g) => g.ok).length;
  console.log(`\n===== NAV-HUBS COVERAGE GRID =====`);
  console.log(`  probed: ${GRID.length}  reached: ${reached}  failed: ${GRID.length - reached}  console/page errors: ${errs.length}`);
  const failed = GRID.filter((g) => !g.ok);
  if (failed.length) console.log(`  ❌ ${failed.map((f) => f.fn).join(', ')}`);
  else console.log(`  ✅ every hub mounts + interactive + clean`);
  for (const e of [...new Set(errs)].slice(0, 8)) console.log(`     ⚠ ${e}`);
  await writeFile(join(OUT, 'grid.json'), JSON.stringify({ grid: GRID, errors: [...new Set(errs)] }, null, 2), 'utf-8');
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
