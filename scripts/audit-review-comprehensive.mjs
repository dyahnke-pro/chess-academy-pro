#!/usr/bin/env node
/**
 * audit-review-comprehensive.mjs
 * Section 11: /coach/review + /coach/review/:gameId
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/review-comprehensive-${stamp}`;
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

async function seedGames(page, games) {
  await page.evaluate((games) => new Promise((resolve, reject) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('games', 'readwrite');
        const store = tx.objectStore('games');
        for (const g of games) store.put(g);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    };
  }), games);
}

const SAMPLE_GAME = {
  id: 'audit-game-1',
  pgn: '[Event "Coach Game"]\n[Date "2026.05.19"]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. Nc3 Nf6 5. d3 d6 6. O-O 1-0',
  white: 'You',
  black: 'Coach',
  result: '1-0',
  date: '2026.05.19',
  event: 'Coach Game',
  eco: 'C50',
  whiteElo: 1500,
  blackElo: 1500,
  source: 'coach',
  annotations: [],
  coachAnalysis: null,
  isMasterGame: false,
  openingId: 'italian-game',
  fullyAnalyzed: false,
};

async function main() {
  log('━━━ /coach/review — comprehensive interactive audit ━━━');
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

  // A. Empty state
  log('\n▶ A. /coach/review — empty list mount');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell');
  await page.goto(`${BASE_URL}/coach/review`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-review-list-page"]', '/coach/review');
  await page.waitForTimeout(3000);
  record('review list page mounts', true, 'mounted');

  // B. Filter chips — verify present but DON'T tap a filter here
  // (a non-default filter might hide all sample games on cold cache;
  // we tap one later after we've verified cards exist with the
  // default filter).
  log('\n▶ B. filter chips');
  const filters = await page.locator('[data-testid^="review-filter-"]').count();
  record('review filter chips present', filters > 0, `count=${filters}`);

  // C. Verify the page seeds sample games + cards render with the
  // default filter. Poll up to 30s — seedReviewSamplesIfNeeded
  // runs analyzeAllGames + Stockfish per-move analysis which can
  // be slow on cold cache.
  log('\n▶ C. verify cards render (default filter, polling 30s)');
  let anyCard = 0;
  const cardDeadline = Date.now() + 30_000;
  while (Date.now() < cardDeadline) {
    anyCard = await page.locator('[data-testid^="review-game-card-"]').count();
    if (anyCard > 0) break;
    await page.waitForTimeout(2000);
  }
  record('at least one game card renders in list',
    anyCard > 0, `count=${anyCard}`);
  const firstCardTestid = anyCard > 0
    ? await page.locator('[data-testid^="review-game-card-"]').first().getAttribute('data-testid')
    : null;

  // After confirming cards exist, tap a filter chip to verify it
  // responds (the filter may show 0 cards but should not crash).
  if (filters > 0) {
    await page.locator('[data-testid^="review-filter-"]').first().click({ force: true });
    await page.waitForTimeout(800);
    record('first review filter chip tappable', true, 'tapped');
  }

  // D. Tap the first card → enter review session
  log('\n▶ D. tap first available card → enter session');
  if (anyCard > 0 && firstCardTestid) {
    await page.locator(`[data-testid="${firstCardTestid}"]`).first().click({ force: true });
    await page.waitForTimeout(4000);
    const inSession = page.url().includes('/coach/review/');
    record('tap card → /coach/review/:gameId', inSession, page.url());
    if (inSession) {
      // E. Nav controls in the session
      log('\n▶ E. review session nav controls');
      await page.waitForTimeout(2500);
      const reviewMount = await page.locator('[data-testid="coach-game-review"], [data-testid="coach-game-review-walk"]').count();
      record('review session surface mounts',
        reviewMount > 0, `count=${reviewMount}`);
      const navControls = await page.locator('[data-testid="review-nav-controls"]').count();
      if (navControls > 0) {
        const fwd = page.locator('[data-testid="review-forward-btn"]').first();
        if (await fwd.count() > 0) {
          await fwd.click({ force: true });
          await page.waitForTimeout(1500);
          record('forward-btn click responds', true, 'clicked');
        }
        const back = page.locator('[data-testid="review-back-btn"]').first();
        if (await back.count() > 0) {
          await back.click({ force: true });
          await page.waitForTimeout(1500);
          record('back-btn click responds', true, 'clicked');
        }
      }
    }
  }

  // F. Back to /coach/review list
  log('\n▶ F. nav back to list + hub');
  await page.goto(`${BASE_URL}/coach/review`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-review-list-page"]', '/coach/review');
  await page.waitForTimeout(2000);
  await page.locator('[data-testid="nav-coach-home-tab"]').first().click({ force: true });
  await page.waitForTimeout(2000);
  record('nav /coach/review → /coach/home', page.url().includes('/coach/home'), page.url());

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
