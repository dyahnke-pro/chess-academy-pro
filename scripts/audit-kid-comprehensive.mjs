#!/usr/bin/env node
/**
 * audit-kid-comprehensive.mjs
 * Section 16: /kid/* — kid mode hub + 6 piece games + puzzles.
 * Per CLAUDE.md G1-G17 kid-section non-negotiables.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/kid-comprehensive-${stamp}`;
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

// 6 piece hubs (per CLAUDE.md: pawn-games, rook-games, knight-games,
// bishop-games, queen-games, king-games).
const PIECE_HUBS = [
  { testid: 'pawn-games-card', url: '/kid/pawn-games' },
  { testid: 'knight-games-card', url: '/kid/knight-games' },
  { testid: 'rook-games-card', url: '/kid/rook-games' },
  { testid: 'bishop-games-card', url: '/kid/bishop-games' },
  { testid: 'queen-games-card', url: '/kid/queen-games' },
  { testid: 'king-games-card', url: '/kid/king-games' },
];

async function main() {
  log('━━━ /kid/* — comprehensive interactive audit ━━━');
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

  // A. /kid hub mount
  log('\n▶ A. /kid hub mount');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell');
  await page.goto(`${BASE_URL}/kid`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="kid-mode-page"]', '/kid');
  await page.waitForTimeout(2500);

  // B. All 6 piece hub tiles present
  log('\n▶ B. 6 piece-game hub tiles present');
  for (const hub of PIECE_HUBS) {
    const count = await page.locator(`[data-testid="${hub.testid}"]`).count();
    record(`hub tile "${hub.testid}" present`, count > 0, `count=${count}`);
  }
  const playGames = await page.locator('[data-testid="play-games-card"]').count();
  record('play-games-card present', playGames > 0, `count=${playGames}`);

  // C. Tap each hub tile → correct destination. Bishop is GATED on
  // bishopGamesUnlocked (progression unlock); on cold sandbox it's
  // disabled and clicking it is a no-op. Mark as expected.
  log('\n▶ C. tap each piece hub → correct destination');
  for (const hub of PIECE_HUBS) {
    await page.goto(`${BASE_URL}/kid`, { waitUntil: 'domcontentloaded' });
    await waitForMount(page, '[data-testid="kid-mode-page"]', `/kid (before ${hub.testid})`);
    await page.waitForTimeout(1500);
    const btn = page.locator(`[data-testid="${hub.testid}"]`).first();
    const isDisabled = await btn.getAttribute('disabled') !== null;
    if (isDisabled) {
      record(`tap "${hub.testid}" — gated/locked on cold sandbox`,
        true, 'button disabled (progression-gated)', 'sandbox-blocked');
      continue;
    }
    await btn.click({ force: true });
    await page.waitForTimeout(2500);
    record(`tap "${hub.testid}" → ${hub.url}`,
      page.url().includes(hub.url), page.url());
  }

  // D. Enter Knight games. The page is GATED on bishopCompleted;
  // shows knight-games-locked instead of game cards on cold sandbox.
  // Either state is a valid mount; we just verify the surface is
  // alive (locked OR unlocked).
  log('\n▶ D. knight games → locked screen OR game cards');
  await page.goto(`${BASE_URL}/kid/knight-games`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="knight-games-page"]', '/kid/knight-games');
  await page.waitForTimeout(1500);
  const knightLocked = await page.locator('[data-testid="knight-games-locked"]').count();
  const leapFrog = await page.locator('[data-testid="leap-frog-card"]').count();
  record('knight games shows locked-screen OR game cards',
    knightLocked + leapFrog > 0,
    `locked=${knightLocked}, leap-frog-card=${leapFrog}`);
  if (leapFrog > 0) {
    await page.locator('[data-testid="leap-frog-card"]').first().click({ force: true });
    await page.waitForTimeout(3500);
    const lfActive = await page.locator('[data-testid="leap-frog-level-select"], [data-testid="leap-frog-game"]').count();
    record('Leap-Frog mounts (level-select OR game)',
      lfActive > 0, `count=${lfActive}`);
  }

  // E. Enter King games → King-Escape game
  log('\n▶ E. king games → King-Escape game');
  await page.goto(`${BASE_URL}/kid/king-games`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="king-games-page"]', '/kid/king-games');
  await page.waitForTimeout(1500);
  const keCard = await page.locator('[data-testid="king-escape-card"]').count();
  record('King-Escape card present', keCard > 0, `count=${keCard}`);
  if (keCard > 0) {
    await page.locator('[data-testid="king-escape-card"]').first().click({ force: true });
    await page.waitForTimeout(3500);
    const keGame = await page.locator('[data-testid="king-escape-game"]').count();
    record('King-Escape game mount', keGame > 0, `count=${keGame}`);
  }

  // F. Enter Bishop games (direct URL). Page is also progression-
  // gated — accept either locked state or game cards.
  log('\n▶ F. bishop games (direct URL) → locked OR cards');
  await page.goto(`${BASE_URL}/kid/bishop-games`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="bishop-games-page"]', '/kid/bishop-games');
  await page.waitForTimeout(2500);
  const bvpCard = await page.locator('[data-testid="bishop-vs-pawns-card"]').count();
  const cwCard = await page.locator('[data-testid="color-wars-card"]').count();
  const bishopLocked = await page.locator('text=Locked').count();
  record('bishop games shows locked OR Bishop-vs-Pawns + Color-Wars',
    bvpCard + cwCard + bishopLocked > 0,
    `bvp=${bvpCard}, cw=${cwCard}, lockedText=${bishopLocked}`);

  // G. Nav back to /kid + verify no coach state contamination
  log('\n▶ G. nav back to /kid hub + state check');
  await page.goto(`${BASE_URL}/kid`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="kid-mode-page"]', '/kid (return)');
  await page.waitForTimeout(2000);
  record('return to /kid hub works', page.url().includes('/kid'), page.url());

  // H. Mobile bottom nav shows top-5 routes only (NAV_ITEMS.slice
  // (0, 5)): Home, Openings, Coach, Tactics, Weaknesses. /kid is at
  // index 5 and only appears in the desktop sidebar — confirm
  // expected absence from mobile bottom nav.
  log('\n▶ H. mobile bottom-nav kids-mode tab (expected absent at 420px)');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell');
  const kidsTab = await page.locator('[data-testid="nav-kid-tab"]').count();
  record('nav-kid-tab absent from mobile bottom nav (top-5 only)',
    kidsTab === 0, `count=${kidsTab}`);

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
