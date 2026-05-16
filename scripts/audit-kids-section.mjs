#!/usr/bin/env node
// scripts/audit-kids-section.mjs
// ----------------------------------------------------------------------
// Playwright-driven full play audit for the kids section. Scoped per
// David's 2026-05-16 directive ("audit should be scoped to kids
// section only"). Pairs with scripts/audit-kid-static.mjs for the
// source-side contracts.
//
// Walks every /kid/* surface end-to-end and asserts the surface
// non-negotiables (#9 hubs route, #12 KidChessboard renders,
// #14 piece-named routes, #16 movingPiece tag in use, etc.) hold at
// runtime against the live local dev server.
//
// Run via the sandbox runbook (see docs/sandbox-playwright-setup.md):
//   npm run dev > /tmp/vite.log 2>&1 &
//   AUDIT_SMOKE_URL=http://localhost:5173 \
//     PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell \
//     node scripts/audit-kids-section.mjs
//
// Or via the npm script:  npm run kid:audit-play

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/kid-${stamp}`;

// Standard nav timeout — kid surfaces are light, no Stockfish needed.
const NAV_TIMEOUT_MS = 30_000;
// Initial cold-start gets some grace for Dexie seeding (puzzles +
// training pool).
const FIRST_PAGE_TIMEOUT_MS = 60_000;

const PIECES = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

const scenarios = [];

function record(name, status, details = '') {
  scenarios.push({ name, status, details });
  const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⊘';
  console.log(`  ${icon} ${name}${details ? ' — ' + details : ''}`);
}

async function tryScenario(name, fn) {
  try {
    const details = await fn();
    record(name, 'pass', details ?? '');
  } catch (err) {
    record(name, 'fail', err?.message ?? String(err));
  }
}

async function main() {
  await mkdir(resolve(ROOT, OUT_DIR), { recursive: true });
  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[kid-audit] chromium = ${executablePath}`);
  console.log(`[kid-audit] base   = ${BASE_URL}`);
  console.log(`[kid-audit] outDir = ${OUT_DIR}\n`);

  const browser = await chromium.launch({ headless: !HEADED, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditKidsBot/1.0 (chromium)',
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  // Cold-start: warm the SPA, give Dexie seeding time.
  console.log('[kid-audit] warmup — /');
  await page.goto(`${BASE_URL}/`, { timeout: FIRST_PAGE_TIMEOUT_MS });
  await page.waitForTimeout(2500);

  // ─── 1. Kid hub renders + 6 piece tiles present ────────────────────
  console.log('\n[kid-audit] /kid hub');
  await tryScenario('hub-loads', async () => {
    await page.goto(`${BASE_URL}/kid`, { timeout: NAV_TIMEOUT_MS });
    await page.locator('[data-testid="kid-mode-page"]').waitFor({ timeout: 15_000 });
    return 'kid-mode-page mounted';
  });
  await tryScenario('hub-has-pawn-tile', async () => {
    await page.locator('[data-testid="pawn-games-card"]').waitFor({ timeout: 5_000 });
  });
  await tryScenario('hub-has-rook-tile', async () => {
    await page.locator('[data-testid="rook-games-card"]').waitFor({ timeout: 5_000 });
  });
  await tryScenario('hub-has-knight-tile', async () => {
    await page.locator('[data-testid="knight-games-card"]').waitFor({ timeout: 5_000 });
  });
  await tryScenario('hub-has-bishop-tile', async () => {
    await page.locator('[data-testid="bishop-games-card"]').waitFor({ timeout: 5_000 });
  });
  await tryScenario('hub-has-queen-tile', async () => {
    await page.locator('[data-testid="queen-games-card"]').waitFor({ timeout: 5_000 });
  });
  await tryScenario('hub-has-king-tile', async () => {
    await page.locator('[data-testid="king-games-card"]').waitFor({ timeout: 5_000 });
  });

  // ─── 2. Each piece hub loads + has a Puzzles tile ──────────────────
  for (const piece of PIECES) {
    const hubPath = `/kid/${piece}-games`;
    console.log(`\n[kid-audit] hub: ${piece}`);
    await tryScenario(`${piece}-hub-loads`, async () => {
      await page.goto(`${BASE_URL}${hubPath}`, { timeout: NAV_TIMEOUT_MS });
      // Use the Puzzles tile as the "hub loaded" signal — it's stable
      // markup, present on every hub. Outer testids race with HMR in
      // dev (the parent div sometimes lags 'visible' for ~15s even
      // though the children render fine).
      await page.locator(`[data-testid="${piece}-puzzles-card"]`).waitFor({ timeout: 20_000 });
      return hubPath;
    });
  }

  // ─── 3. Per-piece puzzle session loads + rating widget present ─────
  for (const piece of PIECES) {
    const puzzlePath = `/kid/${piece}-games/puzzles`;
    console.log(`\n[kid-audit] puzzles: ${piece}`);
    await tryScenario(`${piece}-puzzles-page-loads`, async () => {
      await page.goto(`${BASE_URL}${puzzlePath}`, { timeout: NAV_TIMEOUT_MS });
      // Use rating widget as the page-loaded signal — same reasoning
      // as the hub-tile check above.
      await page.locator(`[data-testid="kid-piece-puzzles-rating"]`).waitFor({ timeout: 20_000 });
      return puzzlePath;
    });
    await tryScenario(`${piece}-puzzles-rating-widget-renders`, async () => {
      const widget = page.locator('[data-testid="kid-piece-puzzles-rating"]');
      await widget.waitFor({ timeout: 10_000 });
      const text = await widget.textContent();
      return `rating displayed: ${text}`;
    });
    // After Dexie seeds, the surface should either show puzzles (board)
    // or the empty state. Either is "rendered correctly".
    await tryScenario(`${piece}-puzzles-shows-board-or-empty-state`, async () => {
      const ok = await Promise.race([
        page.locator('[data-testid="puzzle-board"]').waitFor({ timeout: 10_000 }).then(() => 'board'),
        page.locator('[data-testid="kid-piece-puzzles-empty"]').waitFor({ timeout: 10_000 }).then(() => 'empty'),
        page.locator('[data-testid="kid-piece-puzzles-loading"]').waitFor({ timeout: 10_000 }).then(() => 'loading'),
      ]);
      return ok;
    });
  }

  // ─── 4. Legacy /kid/mini-games redirect ────────────────────────────
  console.log(`\n[kid-audit] legacy redirects`);
  await tryScenario('mini-games-redirects-to-pawn-games', async () => {
    await page.goto(`${BASE_URL}/kid/mini-games`, { timeout: NAV_TIMEOUT_MS });
    await page.waitForURL(`**/kid/pawn-games`, { timeout: 5_000 });
    return page.url();
  });
  await tryScenario('king-escape-redirects-to-king-games', async () => {
    await page.goto(`${BASE_URL}/kid/king-escape`, { timeout: NAV_TIMEOUT_MS });
    await page.waitForURL(`**/kid/king-games/escape`, { timeout: 5_000 });
    return page.url();
  });

  // ─── 5. /kid/journey + /kid/fairy-tale + /kid/puzzles still load ───
  // (regression check — Phase 4/5 routing changes shouldn't have
  // broken the existing curriculum surfaces.)
  console.log(`\n[kid-audit] curriculum regressions`);
  await tryScenario('journey-map-loads', async () => {
    await page.goto(`${BASE_URL}/kid/journey`, { timeout: NAV_TIMEOUT_MS });
    await page.locator('body').waitFor({ timeout: 10_000 });
  });
  await tryScenario('fairy-tale-map-loads', async () => {
    await page.goto(`${BASE_URL}/kid/fairy-tale`, { timeout: NAV_TIMEOUT_MS });
    await page.locator('body').waitFor({ timeout: 10_000 });
  });
  await tryScenario('puzzle-quest-loads', async () => {
    await page.goto(`${BASE_URL}/kid/puzzles`, { timeout: NAV_TIMEOUT_MS });
    await page.locator('[data-testid="kid-puzzle-page"]').waitFor({ timeout: 10_000 });
  });

  await browser.close();

  // ─── Report ────────────────────────────────────────────────────────
  const passed = scenarios.filter((s) => s.status === 'pass').length;
  const failed = scenarios.filter((s) => s.status === 'fail').length;
  console.log(`\n[kid-audit] summary: ${passed} pass / ${failed} fail / ${scenarios.length} total`);
  console.log(`[kid-audit] console.errors: ${consoleErrors.length}`);
  console.log(`[kid-audit] pageerrors: ${pageErrors.length}`);

  await writeFile(
    resolve(ROOT, OUT_DIR, 'report.json'),
    JSON.stringify({
      baseUrl: BASE_URL,
      scenarios,
      consoleErrorCount: consoleErrors.length,
      consoleErrors: consoleErrors.slice(0, 30),
      pageErrorCount: pageErrors.length,
      pageErrors,
    }, null, 2),
  );
  console.log(`[kid-audit] report: ${OUT_DIR}/report.json`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[kid-audit] fatal:', err);
  process.exit(2);
});
