#!/usr/bin/env node
/**
 * audit-app-sweep — load EVERY route, assert it mounts (no crash / error
 * boundary), capture console/page errors (incl. React correctness warnings),
 * and do a light primary interaction. First-pass audit of the WHOLE app for
 * the most important break class; red routes get a deep adversarial-functional
 * dive. Per-route PASS/FAIL grid.
 *
 * Usage: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 \
 *        node scripts/audit-app-sweep.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT = `audit-reports/app-sweep-${stamp}`;

// Concrete routes (dynamic params resolved to real values).
const ROUTES = [
  '/', '/academy', '/privacy',
  '/openings', '/openings/srs', '/openings/italian-game', '/openings/pro/naroditsky',
  '/coach', '/coach/home', '/coach/play', '/coach/chat', '/coach/teach',
  '/coach/analyse', '/coach/plan', '/coach/train', '/coach/endgame', '/coach/review',
  '/tactics', '/tactics/profile', '/tactics/drill', '/tactics/setup', '/tactics/create',
  '/tactics/mistakes', '/tactics/find-square', '/tactics/adaptive', '/tactics/classic',
  '/tactics/weakness-drill', '/tactics/weakness-themes', '/tactics/lichess', '/tactics/opening-traps',
  '/puzzles', '/puzzles/classic', '/puzzles/adaptive', '/puzzles/mistakes', '/puzzles/weakness',
  '/weaknesses', '/weaknesses/games', '/weaknesses/puzzles', '/weaknesses/adaptive',
  '/weaknesses/classic', '/weaknesses/mistakes',
  '/games', '/games/import', '/settings', '/settings/onboarding',
  '/kid', '/kid/journey', '/kid/pawn-games', '/kid/rook-games', '/kid/knight-games',
  '/kid/bishop-games', '/kid/queen-games', '/kid/king-games',
  '/coach/report', '/this-route-does-not-exist',
];

const exe = await resolveChromiumExecutable(false);
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 } });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();

let curRoute = '';
const errsByRoute = {};
function pushErr(t) { (errsByRoute[curRoute] ??= []).push(t.slice(0, 180)); }
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (/same key|each child|unique "key"|Uncaught|TypeError|ReferenceError|cannot read prop|Minified React|Maximum update depth|Cannot update a component|is not a function|undefined is not/i.test(t)) pushErr(t);
});
page.on('pageerror', (e) => pushErr('PAGEERROR: ' + e.message));

const GRID = [];

async function main() {
  console.log(`[sweep] ${BASE}  ${ROUTES.length} routes\n`);
  for (const route of ROUTES) {
    curRoute = route;
    let mounted = false, errorBoundary = false, note = '';
    try {
      const resp = await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500); // settle: effects, first render, async data
      // mounted = some app chrome is present (body has real content, not blank)
      const bodyLen = await page.locator('body').innerText({ timeout: 3000 }).then((t) => t.trim().length).catch(() => 0);
      mounted = bodyLen > 0;
      // error boundary text (ErrorBoundary fallback)
      const txt = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
      errorBoundary = /something went wrong|unexpected error|reload the (app|page)|error boundary/i.test(txt);
      // light interaction: tap the first visible button (not destructive on a fresh nav)
      const btn = page.locator('button:visible, [role="button"]:visible').first();
      if (await btn.isVisible().catch(() => false)) { await btn.click({ force: true, timeout: 2500 }).catch(() => undefined); await page.waitForTimeout(800); }
      note = `body=${bodyLen}ch`;
    } catch (e) {
      note = `NAV ERROR: ${String(e?.message ?? e).slice(0, 80)}`;
    }
    const routeErrs = [...new Set(errsByRoute[curRoute] ?? [])];
    const is404 = route === '/this-route-does-not-exist';
    const ok = mounted && !errorBoundary && routeErrs.length === 0 && !note.startsWith('NAV ERROR');
    GRID.push({ route, ok, mounted, errorBoundary, errors: routeErrs, note });
    const flag = ok ? '✅' : (errorBoundary ? '🛑 ERROR-BOUNDARY' : routeErrs.length ? `💥 ${routeErrs.length} err` : (note.startsWith('NAV') ? '💥 NAV' : '⚠'));
    console.log(`  ${flag.padEnd(18)} ${route.padEnd(28)} ${note}`);
    for (const e of routeErrs.slice(0, 2)) console.log(`        ⤷ ${e.slice(0, 150)}`);
  }

  const clean = GRID.filter((g) => g.ok).length;
  const red = GRID.filter((g) => !g.ok && g.route !== '/this-route-does-not-exist');
  console.log(`\n===== APP SWEEP =====`);
  console.log(`  routes: ${GRID.length}   clean: ${clean}   needs-attention: ${GRID.length - clean}`);
  if (red.length) {
    console.log(`  🔴 ROUTES TO DEEP-DIVE:`);
    for (const r of red) console.log(`     ${r.route}  — ${r.errorBoundary ? 'ERROR BOUNDARY' : r.errors.length ? r.errors[0].slice(0, 90) : r.note}`);
  } else {
    console.log(`  ✅ every route mounted clean — no crashes / console errors / React warnings`);
  }
  await writeFile(join(OUT, 'sweep.json'), JSON.stringify(GRID, null, 2), 'utf-8');
  console.log(`  report: ${join(OUT, 'sweep.json')}`);
  await browser.close();
}
main().catch((e) => { console.error('FATAL', e); process.exit(1); });
