#!/usr/bin/env node
/**
 * audit-coach-misc-surfaces.mjs
 *
 * Sections 7-10: smaller coach surfaces in one pass.
 *   - /coach/home (hub itself — all 7 tiles tap correctly)
 *   - /coach/train (recommendations / no-recs / training-card)
 *   - /coach/report (legacy alias — verify redirect to /weaknesses)
 *   - /coach/session/walkthrough (verify redirect to /coach/teach)
 *   - /coach/session/play-against (verify redirect to /coach/play)
 *   - /coach/session/puzzle (verify redirect)
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-misc-${stamp}`;
await mkdir(OUT_DIR, { recursive: true });

const findings = [];
const consoleErrors = [];
const pageErrors = [];
const networkFailures = [];
const networkResponses = [];

function log(line) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${line}`);
}
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

const HUB_TILES = [
  { testid: 'coach-action-teach', expectedUrl: '/coach/teach' },
  { testid: 'coach-action-play', expectedUrl: '/coach/play' },
  { testid: 'coach-action-plan', expectedUrl: '/coach/plan' },
  { testid: 'coach-action-endgame', expectedUrl: '/coach/endgame' },
  { testid: 'coach-action-report', expectedUrl: '/weaknesses' }, // alias redirect
  { testid: 'coach-action-analyse', expectedUrl: '/coach/analyse' },
  { testid: 'coach-action-review', expectedUrl: '/coach/review' },
];

const SESSION_REDIRECTS = [
  { from: '/coach/session/walkthrough?subject=Sicilian', expected: '/coach/teach' },
  { from: '/coach/session/play-against?subject=Italian', expected: '/coach/play' },
  { from: '/coach/session/puzzle?theme=fork', expected: '/tactics' },
];

async function main() {
  log('━━━ /coach/* misc surfaces audit ━━━');
  log(`  target: ${BASE_URL}`);
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

  // A. /coach/home — hub mounts
  log('\n▶ A. /coach/home — hub mount + all tiles');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell');
  await page.goto(`${BASE_URL}/coach/home`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-home-page"]', '/coach/home');
  await page.waitForTimeout(2000);
  for (const tile of HUB_TILES) {
    const present = await page.locator(`[data-testid="${tile.testid}"]`).count();
    record(`hub tile "${tile.testid}" present`, present > 0, `count=${present}`);
  }

  // B. Each tile tap → correct destination
  log('\n▶ B. tap each hub tile → correct destination');
  for (const tile of HUB_TILES) {
    await page.goto(`${BASE_URL}/coach/home`, { waitUntil: 'domcontentloaded' });
    await waitForMount(page, '[data-testid="coach-home-page"]', `/coach/home (before ${tile.testid})`);
    await page.waitForTimeout(1500);
    if (await tap(page, `[data-testid="${tile.testid}"]`, `tap ${tile.testid}`)) {
      await page.waitForTimeout(2500);
      record(`"${tile.testid}" → ${tile.expectedUrl}`,
        page.url().includes(tile.expectedUrl),
        page.url());
    }
  }

  // C. /coach/train — recommendations OR no-recs OR loading
  log('\n▶ C. /coach/train mount');
  await page.goto(`${BASE_URL}/coach/train`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-train-page"]', '/coach/train');
  await page.waitForTimeout(3500);
  const trainHeading = await page.locator('[data-testid="training-heading"]').count();
  record('training-heading present', trainHeading > 0, `count=${trainHeading}`);
  const trainState =
    await page.locator('[data-testid="train-loading"]').count() +
    await page.locator('[data-testid="no-recommendations"]').count() +
    await page.locator('[data-testid="recommendations"]').count();
  record('one of loading / no-recs / recommendations state visible',
    trainState > 0, `state count: ${trainState}`);
  // If recommendations present, tap the first card.
  const cards = await page.locator('[data-testid="training-card"]').count();
  if (cards > 0) {
    const beforeUrl = page.url();
    await page.locator('[data-testid="training-card"]').first().click({ force: true });
    await page.waitForTimeout(2500);
    record('training card tap navigates somewhere',
      page.url() !== beforeUrl, `from=${beforeUrl}, to=${page.url()}`);
  }

  // D. Session redirects — verify the 3 redirect routes. The
  // <Navigate to=... replace /> redirect fires client-side after
  // React mounts, so we have to wait through the post-domcontentloaded
  // hydration. Polling for the URL change is more robust than a
  // fixed sleep.
  log('\n▶ D. /coach/session/* redirects');
  for (const probe of SESSION_REDIRECTS) {
    await page.goto(`${BASE_URL}${probe.from}`, { waitUntil: 'domcontentloaded' });
    try {
      await page.waitForFunction(
        (expected) => location.pathname.includes(expected),
        probe.expected,
        { timeout: 15_000 },
      );
    } catch {
      // Will be caught by the assertion below.
    }
    record(`${probe.from} → ${probe.expected}`,
      page.url().includes(probe.expected),
      page.url());
  }

  // E. /coach/report — legacy alias redirect
  log('\n▶ E. /coach/report alias → /weaknesses');
  await page.goto(`${BASE_URL}/coach/report`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(
      () => location.pathname.includes('/weaknesses'),
      undefined,
      { timeout: 15_000 },
    );
  } catch {}
  record('/coach/report alias → /weaknesses',
    page.url().includes('/weaknesses'), page.url());

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
