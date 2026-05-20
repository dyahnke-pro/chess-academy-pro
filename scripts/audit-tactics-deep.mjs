#!/usr/bin/env node
/**
 * audit-tactics-deep.mjs
 * Section 17: /tactics + 10 sub-routes
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/tactics-deep-${stamp}`;
await mkdir(OUT_DIR, { recursive: true });

const findings = [];
const consoleErrors = [];
const pageErrors = [];
const networkFailures = [];
const networkResponses = [];

function log(line) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${line}`); }
function record(scenario, ok, detail, severity = 'real') {
  findings.push({ scenario, ok, detail, severity, at: Date.now() });
  console.log(`  ${ok ? '\x1b[32m✓' : '\x1b[31m✗'}\x1b[0m ${scenario} → ${detail}`);
}
const SANDBOX_NOISE = [
  /cdn\.jsdelivr\.net/i, /piece.*\.svg/i, /ERR_CERT_AUTHORITY_INVALID/i,
  /Failed to load resource.*40[2-3]/i, /Failed to load resource.*500/i,
  /favicon\.(ico|svg|png)/i, /\/api\/tts/i, /api\.anthropic\.com/i, /api\.deepseek\.com/i,
  /APIConnectionError/i, /CoachAPI\].*failed/i, /stockfish.*\.js/i, /ERR_BLOCKED_BY_RESPONSE/i,
];
const noise = (t) => !!t && SANDBOX_NOISE.some((re) => re.test(t));

async function waitForMount(page, sel, label, ms = 25_000) {
  try { await page.locator(sel).first().waitFor({ state: 'visible', timeout: ms }); return true; }
  catch { record(`mount: ${label}`, false, `${sel} not visible in ${ms}ms`); return false; }
}

// Each sub-route + the landmark testid that proves it mounted.
const SUB_ROUTES = [
  { url: '/tactics', mount: '[data-testid="tactics-page"], [data-testid="tactics-page-loading"]', label: 'tactics hub' },
  { url: '/tactics/profile', mount: '[data-testid="tactical-profile-page"]', label: 'tactical profile' },
  { url: '/tactics/drill', mount: '[data-testid="tactic-drill-page"]', label: 'tactic drill' },
  { url: '/tactics/setup', mount: '[data-testid="back-btn"]', label: 'tactic setup' },
  { url: '/tactics/create', mount: '[data-testid="back-btn"]', label: 'tactic create' },
  { url: '/tactics/mistakes', mount: '[data-testid="my-mistakes-page"], [data-testid="loading"], [data-testid="solving-mode"]', label: 'my mistakes' },
  { url: '/tactics/adaptive', mount: '[data-testid="adaptive-puzzle-page"]', label: 'adaptive puzzle' },
  { url: '/tactics/classic', mount: '[data-testid="puzzle-trainer"], [data-testid="back-to-modes"]', label: 'classic trainer' },
  { url: '/tactics/weakness', mount: '[data-testid="back-btn"], [data-testid="loading"]', label: 'weakness puzzles' },
  { url: '/tactics/opening-traps', mount: '[data-testid="opening-blunders-page"]', label: 'opening traps' },
];

async function main() {
  log('━━━ /tactics + 9 sub-routes deep audit ━━━');
  const executablePath = await resolveChromiumExecutable({
    preferred: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const browser = await chromium.launch({ headless: true, executablePath });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
  await ctx.route('**/cdn.jsdelivr.net/**/*.svg', async (route) =>
    route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>' }));
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error' && !noise(m.text())) consoleErrors.push({ text: m.text(), at: Date.now() }); });
  page.on('pageerror', (e) => { const msg = e.message || ''; if (!msg || msg === 'undefined' || !e.stack || noise(msg)) return; pageErrors.push({ text: msg, at: Date.now() }); });
  page.on('requestfailed', (r) => { const url = r.url(); const err = r.failure()?.errorText ?? 'unknown'; if (!noise(url) && !noise(err)) networkFailures.push({ url, err, at: Date.now() }); });
  page.on('response', (res) => { const url = res.url(); const status = res.status(); if (status >= 400 && !noise(url)) networkResponses.push({ url, status, at: Date.now() }); });

  // A. Cold boot
  log('\n▶ A. cold boot');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell');

  // B. Mount each sub-route + nav back to hub between
  log('\n▶ B. visit each sub-route');
  for (const r of SUB_ROUTES) {
    await page.goto(`${BASE_URL}${r.url}`, { waitUntil: 'domcontentloaded' });
    const ok = await waitForMount(page, r.mount, `${r.url} (${r.label})`, 20_000);
    record(`${r.url} mounts`, ok, ok ? 'landed' : 'see mount error above');
    await page.waitForTimeout(1500);
  }

  // C. Tactical profile — interactive controls
  log('\n▶ C. /tactics/profile interactive controls');
  await page.goto(`${BASE_URL}/tactics/profile`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="tactical-profile-page"]', 'profile');
  await page.waitForTimeout(3000);
  const refresh = await page.locator('[data-testid="refresh-btn"]').count();
  const beginTrain = await page.locator('[data-testid="begin-training-btn"]').count();
  record('profile refresh-btn or begin-training-btn present',
    refresh + beginTrain > 0,
    `refresh=${refresh}, begin=${beginTrain}`);

  // D. Adaptive puzzles — header controls
  log('\n▶ D. /tactics/adaptive — header + state');
  await page.goto(`${BASE_URL}/tactics/adaptive`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="adaptive-puzzle-page"]', 'adaptive');
  await page.waitForTimeout(3000);
  const ratingHeader = await page.locator('[data-testid="player-rating-header"]').count();
  record('adaptive player-rating-header present', ratingHeader > 0,
    `count=${ratingHeader}`);
  const classicLink = await page.locator('[data-testid="classic-trainer-link"]').count();
  const mistakesLink = await page.locator('[data-testid="my-mistakes-link"]').count();
  record('adaptive cross-links to classic + mistakes',
    classicLink + mistakesLink >= 1,
    `classic=${classicLink}, mistakes=${mistakesLink}`);

  // E. Cross-nav inside tactics: hub → adaptive → mistakes → back to hub
  log('\n▶ E. cross-nav within tactics');
  await page.goto(`${BASE_URL}/tactics`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="tactics-page"], [data-testid="tactics-page-loading"]', 'hub');
  await page.waitForTimeout(2000);
  await page.goto(`${BASE_URL}/tactics/adaptive`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="adaptive-puzzle-page"]', 'adaptive');
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="back-button"]').first().click({ force: true });
  await page.waitForTimeout(2500);
  record('adaptive back-button → /tactics',
    page.url().includes('/tactics') && !page.url().includes('adaptive'),
    page.url());

  await ctx.close();
  await browser.close();

  const summary = {
    base: BASE_URL, timestamp: new Date().toISOString(),
    findings: { total: findings.length, passed: findings.filter((f) => f.ok).length, failed: findings.filter((f) => !f.ok && f.severity !== 'skip').length, skipped: findings.filter((f) => f.severity === 'skip').length },
    errors: { console: consoleErrors.length, page: pageErrors.length, network: networkFailures.length, networkResponses4xx5xx: networkResponses.length },
    realErrorTotal: findings.filter((f) => !f.ok && f.severity === 'real').length + consoleErrors.length + pageErrors.length + networkFailures.length,
    findingsDetail: findings, consoleErrors, pageErrors, networkFailures, networkResponses,
  };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  RESULT`);
  log(`    findings: ${summary.findings.passed}/${summary.findings.total} passed, ${summary.findings.failed} failed`);
  log(`    console: ${summary.errors.console} | page: ${summary.errors.page} | network: ${summary.errors.network}`);
  log(`    REAL ERROR TOTAL: ${summary.realErrorTotal}`);
  log(`  report: ${join(OUT_DIR, 'report.json')}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(summary.realErrorTotal === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(2); });
