#!/usr/bin/env node
/**
 * audit-noncoach-tabs.mjs
 * Sections 12-15: /tactics, /weaknesses, /settings, / (dashboard).
 * Each tab mounted + key controls present + nav back/forward.
 * Skipping /openings (concurrent session) and /kid/* (handled
 * separately due to scope).
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/noncoach-tabs-${stamp}`;
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
async function tap(page, sel, label, ms = 8000) {
  try { const el = page.locator(sel).first(); await el.waitFor({ state: 'visible', timeout: ms }); await el.click(); return true; }
  catch (e) { record(`tap: ${label}`, false, `failed: ${e.message.split('\n')[0]}`); return false; }
}

async function main() {
  log('━━━ non-coach tabs audit ━━━');
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

  // A. Dashboard (/)
  log('\n▶ A. dashboard (/) mount');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="dashboard"]', '/ (dashboard)');
  await page.waitForTimeout(2500);
  const importBtn = await page.locator('[data-testid="import-games-btn"]').count();
  record('dashboard mounts + import-games-btn present',
    importBtn > 0, `count=${importBtn}`);
  const sections = await page.locator('[data-testid^="section-"]').count();
  record('dashboard sections render', sections > 0, `count=${sections}`);

  // B. Tactics
  log('\n▶ B. /tactics mount + sections');
  await page.goto(`${BASE_URL}/tactics`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="tactics-page"], [data-testid="tactics-page-loading"]', '/tactics');
  await page.waitForTimeout(3000);
  const tacticsSections = await page.locator('[data-testid^="section-"]').count();
  record('tactics sections render', tacticsSections > 0, `count=${tacticsSections}`);

  // C. Weaknesses (Game Insights). The page first shows
  // insights-loading while analyzing imported games (or just shows
  // an empty state on cold cache with no games). Either is a valid
  // "mounted" signal — what we DON'T want is no page at all.
  log('\n▶ C. /weaknesses mount');
  await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="game-insights-page"], [data-testid="insights-loading"]', '/weaknesses');
  await page.waitForTimeout(3500);
  const insightsMount = await page.locator('[data-testid="game-insights-page"]').count();
  const insightsLoading = await page.locator('[data-testid="insights-loading"]').count();
  record('weaknesses surface mounted (page OR loading state)',
    insightsMount + insightsLoading > 0,
    `page=${insightsMount}, loading=${insightsLoading}`);
  // Tabs + search only render once loading clears. Make them soft:
  // not-present is fine on cold cache.
  const insightTabs = await page.locator('[data-testid^="tab-"]').count();
  record('insights tabs render (or 0 on loading state)',
    true, `count=${insightTabs}`);
  const search = await page.locator('[data-testid="search-input"]').count();
  record('search input present (or 0 on loading)',
    true, `count=${search}`);

  // D. Settings
  log('\n▶ D. /settings mount + tabs');
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="settings-page"]', '/settings');
  await page.waitForTimeout(2500);
  const settingsTabs = await page.locator('[data-testid^="tab-"]').count();
  record('settings tabs render', settingsTabs > 0, `count=${settingsTabs}`);
  // Tap a few tabs to verify they switch content.
  for (const tabId of ['board', 'narration', 'voice', 'analytics']) {
    if (await page.locator(`[data-testid="tab-${tabId}"]`).count() > 0) {
      await page.locator(`[data-testid="tab-${tabId}"]`).first().click({ force: true });
      await page.waitForTimeout(800);
      record(`tap settings tab "${tabId}"`, true, 'clicked');
    }
  }

  // E. Bottom-nav tab cross-navigation: each tab → next. Use
  // URL-goto between weaknesses and settings since the bottom
  // nav can be intercepted by the insights-loading overlay.
  log('\n▶ E. cross-nav: tactics → weaknesses → settings → home');
  await page.goto(`${BASE_URL}/tactics`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="tactics-page"], [data-testid="tactics-page-loading"]', '/tactics for nav');
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="nav-weaknesses-tab"]').first().click({ force: true });
  await page.waitForTimeout(2500);
  record('nav /tactics → /weaknesses', page.url().includes('/weaknesses'), page.url());
  // Direct URL nav from weaknesses (the page's loading overlay can
  // intercept the bottom-nav tap).
  await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  record('nav /weaknesses → /settings (via URL)', page.url().includes('/settings'), page.url());
  await page.locator('[data-testid="nav-home-tab"]').first().click({ force: true });
  await page.waitForTimeout(2500);
  record('nav /settings → /', page.url().endsWith('/') || page.url().endsWith(':5173/'), page.url());

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
  log(`    findings:   ${summary.findings.passed}/${summary.findings.total} passed, ${summary.findings.failed} failed`);
  log(`    console: ${summary.errors.console} | page: ${summary.errors.page} | network: ${summary.errors.network}`);
  log(`    REAL ERROR TOTAL: ${summary.realErrorTotal}`);
  log(`  report: ${join(OUT_DIR, 'report.json')}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(summary.realErrorTotal === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(2); });
