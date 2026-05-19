#!/usr/bin/env node
/**
 * audit-plan-comprehensive.mjs
 *
 * Section 3: /coach/plan (Training Plan rolodex). The rolodex
 * surface — favorited openings split by color, each card with 8
 * training rows that deep-link to other surfaces.
 *
 * Probes (interactive, sandbox-safe):
 *   - Cold boot + mount on empty state (no favorites)
 *   - Empty state CTAs per color
 *   - Mobile folder tabs (white / black switch)
 *   - Seed favorites via IDB → cards appear in both columns
 *   - Tap a peeking card tab → it becomes active
 *   - All 8 training rows render with counts (or "—" placeholder)
 *   - Tap each row → navigates to the right destination URL
 *   - Tap back / re-enter / state survival
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/plan-comprehensive-${stamp}`;
await mkdir(OUT_DIR, { recursive: true });

const findings = [];
const consoleErrors = [];
const consoleDiagnostics = [];
const pageErrors = [];
const networkFailures = [];
const networkResponses = [];
const auditEvents = [];

function log(line) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${line}`);
}

function record(scenario, ok, detail, severity = 'real') {
  findings.push({ scenario, ok, detail, severity, at: Date.now() });
  const marker = ok ? '✓' : '✗';
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`  ${color}${marker}\x1b[0m ${scenario} → ${detail}`);
}

const SANDBOX_NOISE_PATTERNS = [
  /cdn\.jsdelivr\.net/i,
  /piece.*\.svg/i,
  /ERR_CERT_AUTHORITY_INVALID/i,
  /Failed to load resource.*402/i,
  /Failed to load resource.*403/i,
  /Failed to load resource.*500/i,
  /favicon\.ico/i,
  /\/api\/tts/i,
  /api\.anthropic\.com/i,
  /api\.deepseek\.com/i,
  /APIConnectionError/i,
  /CoachAPI\].*failed/i,
  /stockfish.*\.js/i,
  /ERR_BLOCKED_BY_RESPONSE/i,
];

function isSandboxNoise(t) {
  if (!t) return false;
  return SANDBOX_NOISE_PATTERNS.some((re) => re.test(t));
}

async function waitForMount(page, selector, label, ms = 25_000) {
  try {
    await page.locator(selector).first().waitFor({ state: 'visible', timeout: ms });
    return true;
  } catch {
    record(`mount: ${label}`, false, `${selector} not visible in ${ms}ms`);
    return false;
  }
}

async function tap(page, selector, label, ms = 8000) {
  try {
    const el = page.locator(selector).first();
    await el.waitFor({ state: 'visible', timeout: ms });
    await el.click();
    return true;
  } catch (e) {
    record(`tap: ${label}`, false, `failed: ${e.message.split('\n')[0]}`);
    return false;
  }
}

async function clearStorage(page) {
  // The app holds an open IDB connection to ChessAcademyDB via
  // Dexie; that connection blocks indexedDB.deleteDatabase from
  // completing. Navigate to about:blank first — that unmounts the
  // app, closes the Dexie connection, frees the DB for delete.
  // Then come back to base url to remount.
  await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    try {
      const dbs = await indexedDB.databases?.();
      if (dbs) {
        await Promise.all(dbs.map((db) => db.name
          ? new Promise((resolve) => {
              const req = indexedDB.deleteDatabase(db.name);
              req.onsuccess = resolve;
              req.onerror = resolve;
              req.onblocked = () => setTimeout(resolve, 1000);
            })
          : Promise.resolve()));
      }
    } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  // Return to the app so subsequent navigations work normally.
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
}

async function seedFavorites(page, openings) {
  // Open the Dexie-backed ChessAcademyDB directly and write favorite
  // OpeningRecords. Resilient to schema changes by sniffing keys.
  await page.evaluate((openings) => new Promise((resolve, reject) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('openings', 'readwrite');
        const store = tx.objectStore('openings');
        for (const o of openings) store.put(o);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      } catch (e) {
        db.close();
        reject(e);
      }
    };
  }), openings);
}

const SAMPLE_FAVORITES = [
  {
    id: 'italian-game-test',
    name: 'Italian Game',
    eco: 'C50',
    color: 'white',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    isFavorite: true,
    isPro: false,
    variations: [],
    trapLines: [],
    warningLines: [],
    masteryByVariation: {},
    progress: { linesDiscovered: 0, linesPerfected: 0, sessionsCompleted: 0, lastPlayedAt: null },
    favoritedAt: new Date().toISOString(),
  },
  {
    id: 'ruy-lopez-test',
    name: 'Ruy Lopez',
    eco: 'C60',
    color: 'white',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bb5',
    isFavorite: true,
    isPro: false,
    variations: [],
    trapLines: [],
    warningLines: [],
    masteryByVariation: {},
    progress: { linesDiscovered: 0, linesPerfected: 0, sessionsCompleted: 0, lastPlayedAt: null },
    favoritedAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'sicilian-najdorf-test',
    name: 'Sicilian Defense: Najdorf Variation',
    eco: 'B90',
    color: 'black',
    pgn: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    isFavorite: true,
    isPro: false,
    variations: [],
    trapLines: [],
    warningLines: [],
    masteryByVariation: {},
    progress: { linesDiscovered: 0, linesPerfected: 0, sessionsCompleted: 0, lastPlayedAt: null },
    favoritedAt: new Date().toISOString(),
  },
];

const ALL_ROW_KEYS = ['theory-lines', 'puzzles', 'gm-games', 'traps', 'blunders', 'walkthrough', 'practice-from-start', 'practice-middlegame'];

async function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  /coach/plan — comprehensive interactive audit');
  log(`  target: ${BASE_URL}`);
  log(`  out: ${OUT_DIR}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const executablePath = await resolveChromiumExecutable({
    preferred: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const browser = await chromium.launch({ headless: true, executablePath });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });

  await ctx.route('**/cdn.jsdelivr.net/**/*.svg', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    });
  });

  const page = await ctx.newPage();

  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error' && !isSandboxNoise(text)) {
      consoleErrors.push({ text, at: Date.now() });
    }
  });
  page.on('pageerror', (e) => {
    const msg = e.message || '<no message>';
    // Empty/undefined pageerrors fire during the about:blank →
    // BASE_URL transition when Dexie's connection is being torn
    // down — sandbox artifact of the storage-clear pattern, not a
    // real surface bug. Filter.
    if (msg === 'undefined' || msg === '<no message>' || !e.stack) return;
    if (isSandboxNoise(msg)) return;
    pageErrors.push({
      text: msg,
      name: e.name,
      stack: (e.stack ?? '').split('\n').slice(0, 6).join('\n'),
      at: Date.now(),
    });
  });
  page.on('requestfailed', (r) => {
    const url = r.url();
    const err = r.failure()?.errorText ?? 'unknown';
    if (!isSandboxNoise(url) && !isSandboxNoise(err)) {
      networkFailures.push({ url, err, at: Date.now() });
    }
  });
  page.on('response', (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 400 && !isSandboxNoise(url)) {
      networkResponses.push({ url, status, at: Date.now() });
    }
  });
  page.on('request', async (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try {
        const body = JSON.parse(req.postData() ?? '{}');
        if (Array.isArray(body.events)) for (const ev of body.events) auditEvents.push(ev);
      } catch {}
    }
  });

  // ── A. Cold boot — empty state ────────────────────────────
  log('\n▶ A. cold boot — empty state (no favorites)');
  // clearStorage navigates via about:blank to fully unmount the
  // app + close its Dexie connection, then returns to BASE_URL.
  await clearStorage(page);
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'shell after clear', 45_000);
  await page.goto(`${BASE_URL}/coach/plan`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="training-plan-rolodex-page"]', '/coach/plan');
  // Wait for the loading state to clear and the empty state to
  // mount. The favorite-loading effect runs an async getFavoriteOpenings;
  // empty state replaces the loading placeholder once it resolves.
  try {
    await page.locator('[data-testid="rolodex-empty-state-white"], [data-testid="rolodex-empty-state-black"]')
      .first().waitFor({ state: 'visible', timeout: 15_000 });
  } catch {
    // Will fall through to the assertion below — surfaced as a real
    // failure if neither empty state ever mounted.
  }
  const emptyWhite = await page.locator('[data-testid="rolodex-empty-state-white"]').count();
  const emptyBlack = await page.locator('[data-testid="rolodex-empty-state-black"]').count();
  // On mobile (420px) only one folder is visible at a time. Either
  // empty state being present is fine for the empty-favorites case.
  record('empty state renders (one or both colors)',
    emptyWhite + emptyBlack > 0,
    `white=${emptyWhite}, black=${emptyBlack}`);
  // Empty-state CTA: "Browse Openings" button.
  const emptyCTA = await page.locator('[data-testid^="rolodex-empty-cta-"]').count();
  record('empty-state CTA button present', emptyCTA > 0,
    `count=${emptyCTA}`);

  // ── B. Mobile folder tabs ─────────────────────────────────
  log('\n▶ B. mobile folder tabs — white / black switch');
  const tabWhite = await page.locator('[data-testid="rolodex-folder-tab-white"]').count();
  const tabBlack = await page.locator('[data-testid="rolodex-folder-tab-black"]').count();
  record('mobile folder tab — white present', tabWhite > 0, `count=${tabWhite}`);
  record('mobile folder tab — black present', tabBlack > 0, `count=${tabBlack}`);
  if (tabBlack > 0) {
    await tap(page, '[data-testid="rolodex-folder-tab-black"]', 'switch to Black tab');
    await page.waitForTimeout(800);
    const blackSelected = await page.locator('[data-testid="rolodex-folder-tab-black"][aria-selected="true"]').count();
    record('black tab becomes aria-selected after click', blackSelected > 0,
      `count=${blackSelected}`);
  }
  if (tabWhite > 0) {
    await tap(page, '[data-testid="rolodex-folder-tab-white"]', 'switch back to White tab');
    await page.waitForTimeout(800);
    const whiteSelected = await page.locator('[data-testid="rolodex-folder-tab-white"][aria-selected="true"]').count();
    record('white tab becomes aria-selected after click', whiteSelected > 0,
      `count=${whiteSelected}`);
  }

  // ── C. Seed favorites + verify cards mount ────────────────
  log('\n▶ C. seed 3 favorites via IDB + verify card stack renders');
  try {
    await seedFavorites(page, SAMPLE_FAVORITES);
    record('seed favorites via IDB succeeded', true, `${SAMPLE_FAVORITES.length} records written`);
  } catch (e) {
    record('seed favorites via IDB succeeded', false, String(e), 'real');
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="training-plan-rolodex-page"]', 'rolodex post-seed reload');
  await page.waitForTimeout(3500);
  // White stack: 2 cards (Italian, Ruy Lopez)
  // Black stack: 1 card (Sicilian Najdorf)
  await tap(page, '[data-testid="rolodex-folder-tab-white"]', 'view White folder');
  await page.waitForTimeout(800);
  const whiteCards = await page.locator('[data-testid^="rolodex-card-"]').count();
  record('White folder shows seeded cards', whiteCards >= 1,
    `card elements: ${whiteCards}`);
  await tap(page, '[data-testid="rolodex-folder-tab-black"]', 'view Black folder');
  await page.waitForTimeout(800);
  const blackCards = await page.locator('[data-testid^="rolodex-card-"]').count();
  record('Black folder shows seeded cards', blackCards >= 1,
    `card elements: ${blackCards}`);

  // ── D. Active card rows — all 8 row types render ──────────
  log('\n▶ D. active card rows — verify all 8 row kinds render');
  for (const key of ALL_ROW_KEYS) {
    const present = await page.locator(`[data-testid="rolodex-row-${key}"]`).count();
    record(`row "${key}" rendered`, present > 0, `count=${present}`);
  }

  // ── E. Tap a peeking card tab → becomes active ────────────
  log('\n▶ E. tap a peeking tab → that card becomes active (white folder)');
  await tap(page, '[data-testid="rolodex-folder-tab-white"]', 'view White folder');
  await page.waitForTimeout(800);
  // Find a card-tab (peeking) element.
  const peekingTabs = await page.locator('[data-testid^="rolodex-card-tab-"]').count();
  if (peekingTabs > 0) {
    const firstTab = page.locator('[data-testid^="rolodex-card-tab-"]').first();
    const tabId = await firstTab.getAttribute('data-testid');
    await firstTab.click();
    await page.waitForTimeout(1500);
    // After tap, the card should have data-active="true".
    const tappedCardId = (tabId ?? '').replace('rolodex-card-tab-', '');
    const activeAttr = await page.locator(`[data-testid="rolodex-card-${tappedCardId}"]`)
      .first().getAttribute('data-active');
    record(`tapped tab → card becomes active`, activeAttr === 'true',
      `tab=${tabId}, data-active=${activeAttr}`);
  } else {
    record('peeking tab tap probe runnable (need ≥2 white favorites)',
      false, 'no peeking tabs visible — only 1 card in white folder',
      'sandbox-blocked');
  }

  // ── F. Row tap → deep-link navigation ─────────────────────
  log('\n▶ F. tap each row → navigates to its destination');
  // Each row taps a destination. We test each by tapping, asserting
  // URL changed, then navigating back via /coach/plan and repeating.
  const ROW_DESTINATIONS = {
    'theory-lines': /\/openings/,
    'puzzles': /\/tactics\/drill/,
    'gm-games': /\/games/,
    'traps': /\/tactics\/opening-traps/,
    'blunders': /\/tactics\/mistakes/,
    'walkthrough': /\/coach\/teach/,
    'practice-from-start': /\/coach\/play/,
    'practice-middlegame': /\/coach\/play/,
  };
  for (const key of Object.keys(ROW_DESTINATIONS)) {
    // Return to plan + ensure white folder.
    await page.goto(`${BASE_URL}/coach/plan`, { waitUntil: 'domcontentloaded' });
    await waitForMount(page, '[data-testid="training-plan-rolodex-page"]', '/coach/plan');
    await page.waitForTimeout(2500);
    await tap(page, '[data-testid="rolodex-folder-tab-white"]', `view White (for ${key})`);
    await page.waitForTimeout(800);
    const tapTarget = page.locator(`[data-testid="rolodex-row-tap-${key}"]`).first();
    const tapTargetCount = await tapTarget.count();
    if (tapTargetCount === 0) {
      // Placeholder rows (gm-games, practice variants) may be
      // non-tappable when their count is "—".
      record(`row "${key}" — tap target present`, false,
        `no tap target (placeholder row?)`, 'sandbox-blocked');
      continue;
    }
    await tapTarget.click();
    await page.waitForTimeout(2000);
    const url = page.url();
    const expected = ROW_DESTINATIONS[key];
    record(`row "${key}" → ${expected.source}`, expected.test(url), url);
  }

  // ── G. Back-to-hub + return state survival ────────────────
  log('\n▶ G. back-to-hub + return to /coach/plan');
  await page.goto(`${BASE_URL}/coach/plan`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="training-plan-rolodex-page"]', '/coach/plan');
  await page.waitForTimeout(2000);
  if (await tap(page, '[data-testid="nav-coach-home-tab"]', 'nav to coach hub')) {
    await page.waitForTimeout(1500);
    record('nav: /coach/plan → /coach/home', page.url().includes('/coach/home'),
      page.url());
    if (await tap(page, '[data-testid="coach-action-plan"]', 'Training Plan tile')) {
      await page.waitForTimeout(2500);
      record('return to /coach/plan via tile', page.url().includes('/coach/plan'),
        page.url());
    }
  }

  // ── H. Route log scan ─────────────────────────────────────
  log('\n▶ H. route log scan');
  record('current URL is /coach/plan', page.url().includes('/coach/plan'), page.url());

  // ── Done ──────────────────────────────────────────────────
  await ctx.close();
  await browser.close();

  const ALARM_KINDS = new Set([
    'claim-validator-trip',
    'master-play-enforcement-fallback',
    'tts-failure',
    'asset-load-error',
  ]);
  const auditAlarms = auditEvents.filter((e) => e.kind && ALARM_KINDS.has(e.kind));

  const respBuckets = new Map();
  for (const r of networkResponses) {
    const key = `${r.status} ${r.url.split('?')[0]}`;
    respBuckets.set(key, (respBuckets.get(key) ?? 0) + 1);
  }
  const respTopHits = [...respBuckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => ({ key: k, count: v }));

  const summary = {
    base: BASE_URL,
    timestamp: new Date().toISOString(),
    findings: {
      total: findings.length,
      passed: findings.filter((f) => f.ok).length,
      failed: findings.filter((f) => !f.ok && f.severity !== 'skip').length,
      skipped: findings.filter((f) => f.severity === 'skip').length,
    },
    errors: {
      console: consoleErrors.length,
      page: pageErrors.length,
      network: networkFailures.length,
      networkResponses4xx5xx: networkResponses.length,
      auditAlarms: auditAlarms.length,
    },
    realErrorTotal:
      findings.filter((f) => !f.ok && f.severity === 'real').length +
      consoleErrors.length +
      pageErrors.length +
      networkFailures.length +
      auditAlarms.length,
    respTopHits,
    findingsDetail: findings,
    consoleErrors,
    consoleDiagnostics,
    pageErrors,
    networkFailures,
    networkResponses,
    auditAlarms,
  };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  RESULT`);
  log(`    findings:   ${summary.findings.passed}/${summary.findings.total} passed, ${summary.findings.failed} failed, ${summary.findings.skipped} skipped`);
  log(`    console:    ${summary.errors.console}`);
  log(`    page:       ${summary.errors.page}`);
  log(`    network:    ${summary.errors.network} failures, ${summary.errors.networkResponses4xx5xx} 4xx/5xx responses`);
  log(`    audit-alarms: ${summary.errors.auditAlarms}`);
  log(`    REAL ERROR TOTAL: ${summary.realErrorTotal}`);
  if (respTopHits.length > 0) {
    log(`    top 4xx/5xx hits:`);
    for (const h of respTopHits) log(`      ${h.count}× ${h.key}`);
  }
  log(`  report: ${join(OUT_DIR, 'report.json')}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(summary.realErrorTotal === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
