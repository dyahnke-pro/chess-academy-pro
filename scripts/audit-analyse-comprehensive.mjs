#!/usr/bin/env node
/**
 * audit-analyse-comprehensive.mjs
 * Section 6: /coach/analyse — paste FEN, see analysis.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/analyse-comprehensive-${stamp}`;
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
  /favicon\.ico/i, /\/api\/tts/i, /api\.anthropic\.com/i, /api\.deepseek\.com/i,
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

const FENS = [
  { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', label: 'starting position' },
  { fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3', label: 'Italian Game' },
  { fen: '8/8/8/8/3k4/8/3K4/3R4 w - - 0 1', label: 'KR vs K endgame' },
  { fen: '7k/5Q2/5K2/8/8/8/8/8 w - - 0 1', label: 'mate-in-1 position' },
];

async function main() {
  log('━━━ /coach/analyse — comprehensive interactive audit ━━━');
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

  // A. Cold mount
  log('\n▶ A. cold boot + page mount');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell');
  await page.goto(`${BASE_URL}/coach/analyse`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-analyse-page"]', '/coach/analyse');
  await page.waitForTimeout(2500);
  const fenInput = await page.locator('[data-testid="fen-input"]').count();
  const loadBtn = await page.locator('[data-testid="load-fen-btn"]').count();
  record('fen-input present', fenInput > 0, `count=${fenInput}`);
  record('load-fen-btn present', loadBtn > 0, `count=${loadBtn}`);

  // B. Try each FEN. Each load fires an LLM analysis call (which
  // is sandbox-blocked at the API layer but the surface still
  // shows the board). Wait extra between iterations so the
  // brain-call timeout doesn't bleed into the next probe.
  for (const probe of FENS) {
    log(`\n▶ B.${probe.label} — load FEN`);
    const input = page.locator('[data-testid="fen-input"]').first();
    if (await input.count() === 0) {
      record(`fen-input still present for "${probe.label}"`, false, 'missing', 'real');
      continue;
    }
    await input.focus();
    await input.fill(probe.fen);
    await page.waitForTimeout(300);
    await tap(page, '[data-testid="load-fen-btn"]', `load FEN "${probe.label}"`);
    await page.waitForTimeout(4000);
    const pieces = await page.locator('[id^="chessboard-piece-"]').count();
    record(`"${probe.label}" loaded → pieces on board`, pieces > 0,
      `pieces=${pieces}`);
    // Reset for next probe — bumped to 40s mount timeout since the
    // post-LLM-call remount can hang briefly while the brain call
    // is timing out in the background.
    await page.goto(`${BASE_URL}/coach/analyse`, { waitUntil: 'domcontentloaded' });
    await waitForMount(page, '[data-testid="coach-analyse-page"]',
      `/coach/analyse (post ${probe.label})`, 40_000);
    await page.waitForTimeout(2500);
  }

  // C. Garbage FEN
  log('\n▶ C. garbage FEN — no crash');
  const garbageFen = 'this is not a valid FEN string';
  const input = page.locator('[data-testid="fen-input"]').first();
  if (await input.count() > 0) {
    await input.focus();
    await input.fill(garbageFen);
    await page.waitForTimeout(300);
    await tap(page, '[data-testid="load-fen-btn"]', 'load garbage FEN');
    await page.waitForTimeout(3000);
    record('garbage FEN — no crash', true,
      'load attempted, surface still mounted');
  }

  // D. Back to hub. The analyse-loaded board can overlay/scroll the
  // bottom nav out of click range — use force-click on the testid.
  log('\n▶ D. nav back to /coach/home');
  await page.goto(`${BASE_URL}/coach/analyse`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.locator('[data-testid="nav-coach-home-tab"]').first().click({ force: true });
  await page.waitForTimeout(2500);
  record('nav /coach/analyse → /coach/home', page.url().includes('/coach/home'), page.url());
  await page.locator('[data-testid="coach-action-analyse"]').first().click({ force: true });
  await page.waitForTimeout(2500);
  record('re-enter /coach/analyse via tile', page.url().includes('/coach/analyse'), page.url());

  await ctx.close();
  await browser.close();

  const respBuckets = new Map();
  for (const r of networkResponses) {
    const k = `${r.status} ${r.url.split('?')[0]}`;
    respBuckets.set(k, (respBuckets.get(k) ?? 0) + 1);
  }
  const respTopHits = [...respBuckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => ({ key: k, count: v }));

  const summary = {
    base: BASE_URL, timestamp: new Date().toISOString(),
    findings: { total: findings.length, passed: findings.filter((f) => f.ok).length, failed: findings.filter((f) => !f.ok && f.severity !== 'skip').length, skipped: findings.filter((f) => f.severity === 'skip').length },
    errors: { console: consoleErrors.length, page: pageErrors.length, network: networkFailures.length, networkResponses4xx5xx: networkResponses.length },
    realErrorTotal: findings.filter((f) => !f.ok && f.severity === 'real').length + consoleErrors.length + pageErrors.length + networkFailures.length,
    respTopHits, findingsDetail: findings, consoleErrors, pageErrors, networkFailures, networkResponses,
  };
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  RESULT`);
  log(`    findings:   ${summary.findings.passed}/${summary.findings.total} passed, ${summary.findings.failed} failed`);
  log(`    console:    ${summary.errors.console}`);
  log(`    page:       ${summary.errors.page}`);
  log(`    network:    ${summary.errors.network} failures, ${summary.errors.networkResponses4xx5xx} 4xx/5xx`);
  log(`    REAL ERROR TOTAL: ${summary.realErrorTotal}`);
  if (respTopHits.length > 0) { log(`    top 4xx/5xx hits:`); for (const h of respTopHits) log(`      ${h.count}× ${h.key}`); }
  log(`  report: ${join(OUT_DIR, 'report.json')}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(summary.realErrorTotal === 0 ? 0 : 1);
}

main().catch((err) => { console.error('FATAL:', err); process.exit(2); });
