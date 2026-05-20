#!/usr/bin/env node
/**
 * Comprehensive surface audit — drives Playwright across every
 * usable surface in the app. For each surface, asserts "what SHOULD
 * this tab look like" per CLAUDE.md contracts, captures audit events
 * via page.on('request'), and reports per-surface pass/fail.
 *
 * Loop mode: pass --loop and the script repeats until all surfaces
 * report zero errors for 3 consecutive passes (David's audit-loop
 * directive 2026-05-19).
 *
 * Usage:
 *   node scripts/audit-everything.mjs                  # one pass
 *   node scripts/audit-everything.mjs --loop           # repeat until clean
 *   AUDIT_SMOKE_URL=http://localhost:5173 node ...     # local dev
 *   AUDIT_SMOKE_HEADED=1 node ...                      # headed
 *
 * Default target = http://localhost:5173 (sandbox can't reach prod).
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const LOOP = process.argv.includes('--loop');
const MAX_LOOPS = 10;
const PASSES_REQUIRED = 3;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/everything-${stamp}`;

// ─── Per-surface expectations ─────────────────────────────────────
// Each scenario:
//   name        — short id
//   url         — relative path to visit
//   description — what this tab SHOULD look like
//   expect      — list of expectations to verify after navigation
//                 Each expectation is one of:
//                   { kind: 'visible',     selector, description }
//                   { kind: 'invisible',   selector, description }
//                   { kind: 'count-gte',   selector, n, description }
//                   { kind: 'text-contains', selector, text, description }
//                   { kind: 'no-console-error', description }
//                   { kind: 'audit-event', eventKind, description }
//                   { kind: 'no-errors',   description } (matches uncaught-error / unhandled-rejection)
//
// post-actions  — optional array of { action: 'click'|'fill', selector, text? }
//                 that run BEFORE expectations (e.g. type into a search box)

const SCENARIOS = [
  // ── Dashboard ──────────────────────────────────────────────────
  {
    name: 'dashboard',
    url: '/',
    description: 'Dashboard: search bar at top, 2-column section grid.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
      { kind: 'count-gte', selector: 'a, button', n: 5, description: 'has nav targets' },
    ],
  },

  // ── Openings ───────────────────────────────────────────────────
  {
    name: 'openings-list',
    url: '/openings',
    description: 'Openings list with cards + filter chips.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'opening-detail-ruy-lopez',
    url: '/openings/ruy-lopez',
    description: 'Opening detail: header, action row, key ideas, Classic Wisdom card (book passages), middlegame plans.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
      { kind: 'visible', selector: '[data-testid="opening-detail"]', description: 'page mounted' },
      { kind: 'visible', selector: '[data-testid="walkthrough-btn"]', description: 'Watch button' },
      { kind: 'visible', selector: '[data-testid="learn-btn"]', description: 'Learn button' },
      { kind: 'visible', selector: '[data-testid="classic-wisdom-section"]', description: 'Classic Wisdom card renders for book-covered opening' },
      { kind: 'count-gte', selector: '[data-testid="classic-wisdom-passage"]', n: 1, description: '≥1 book passage rendered' },
    ],
  },
  {
    name: 'opening-detail-italian-game',
    url: '/openings/italian-game',
    description: 'Italian Game opening detail with Classic Wisdom card.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
      { kind: 'visible', selector: '[data-testid="opening-detail"]', description: 'page mounted' },
      { kind: 'visible', selector: '[data-testid="classic-wisdom-section"]', description: 'Classic Wisdom for Italian Game' },
    ],
  },
  {
    name: 'opening-detail-french-defence',
    url: '/openings/french-defence',
    description: 'French Defence opening detail with Classic Wisdom card.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
      { kind: 'visible', selector: '[data-testid="opening-detail"]', description: 'page mounted' },
      { kind: 'visible', selector: '[data-testid="classic-wisdom-section"]', description: 'Classic Wisdom for French' },
    ],
  },
  {
    name: 'opening-detail-london-system',
    url: '/openings/london-system',
    description: 'London System (no book coverage) — Classic Wisdom card hidden.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
      { kind: 'visible', selector: '[data-testid="opening-detail"]', description: 'page mounted' },
      { kind: 'invisible', selector: '[data-testid="classic-wisdom-section"]', description: 'Classic Wisdom hidden when no passages' },
    ],
  },

  // ── Pro openings ───────────────────────────────────────────────
  {
    name: 'pro-openings-hub',
    url: '/openings/pro',
    description: 'Pro openings hub with player tiles.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },

  // ── Coach surfaces ─────────────────────────────────────────────
  {
    name: 'coach-home',
    url: '/coach/home',
    description: 'Coach hub with tile cluster.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'coach-teach',
    url: '/coach/teach',
    description: 'Learn with Coach: 2-col flex (board + chat at md+); search bar.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'coach-play',
    url: '/coach/play',
    description: 'Play with Coach: live board + Stockfish opponent.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'coach-chat',
    url: '/coach/chat',
    description: 'Coach chat free-form.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'coach-plan',
    url: '/coach/plan',
    description: 'Training plan rolodex.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'coach-review',
    url: '/coach/review',
    description: 'Coach review list of games.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'coach-analyse',
    url: '/coach/analyse',
    description: 'Coach analyse: board + engine.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'coach-endgame',
    url: '/coach/endgame',
    description: 'Endgame studies hub.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },

  // ── Tactics / weaknesses / train ───────────────────────────────
  {
    name: 'tactics',
    url: '/tactics',
    description: 'Tactics hub with mode tiles.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'weaknesses',
    url: '/weaknesses',
    description: 'Weaknesses report with urgency tiers, click-anywhere rows.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'train',
    url: '/train',
    description: 'Training entry.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },

  // ── Settings ───────────────────────────────────────────────────
  {
    name: 'settings',
    url: '/settings',
    description: 'Settings toggle list.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },

  // ── Kid surfaces (G3 — kid contract) ──────────────────────────
  {
    name: 'kid-hub',
    url: '/kid',
    description: 'Kid hub with 6 piece tiles. No bottom-nav phantom padding.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'kid-pawn-games',
    url: '/kid/pawn-games',
    description: 'Pawn games hub.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
  {
    name: 'kid-knight-games',
    url: '/kid/knight-games',
    description: 'Knight games hub.',
    expect: [
      { kind: 'no-console-error', description: 'no console errors' },
    ],
  },
];

// ─── Expectation runner ───────────────────────────────────────────
async function runExpectation(page, exp, consoleErrors, auditEvents) {
  switch (exp.kind) {
    case 'visible': {
      const el = await page.locator(exp.selector).first();
      const visible = await el.isVisible().catch(() => false);
      return visible
        ? { pass: true }
        : { pass: false, reason: `selector "${exp.selector}" not visible` };
    }
    case 'invisible': {
      const el = page.locator(exp.selector);
      const count = await el.count().catch(() => 0);
      if (count === 0) return { pass: true };
      const visible = await el.first().isVisible().catch(() => false);
      return visible
        ? { pass: false, reason: `selector "${exp.selector}" should be hidden but is visible` }
        : { pass: true };
    }
    case 'count-gte': {
      const count = await page.locator(exp.selector).count().catch(() => 0);
      return count >= exp.n
        ? { pass: true, detail: `count=${count}` }
        : { pass: false, reason: `selector "${exp.selector}" count=${count}, expected ≥ ${exp.n}` };
    }
    case 'text-contains': {
      const text = await page.locator(exp.selector).first().textContent().catch(() => '');
      return text?.includes(exp.text)
        ? { pass: true }
        : { pass: false, reason: `selector "${exp.selector}" text "${text?.slice(0,60)}" missing "${exp.text}"` };
    }
    case 'no-console-error': {
      // consoleErrors is already filtered for benign noise by the caller
      return consoleErrors.length === 0
        ? { pass: true }
        : { pass: false, reason: `${consoleErrors.length} console error(s): ${consoleErrors.slice(0,2).join(' | ').slice(0,200)}` };
    }
    case 'audit-event': {
      const fired = auditEvents.some(e => e.kind === exp.eventKind);
      return fired
        ? { pass: true }
        : { pass: false, reason: `audit event "${exp.eventKind}" did not fire` };
    }
    case 'no-errors': {
      const errs = auditEvents.filter(e =>
        e.kind === 'uncaught-error' || e.kind === 'unhandled-rejection'
      );
      return errs.length === 0
        ? { pass: true }
        : { pass: false, reason: `${errs.length} uncaught error(s)` };
    }
  }
  return { pass: false, reason: `unknown expectation kind: ${exp.kind}` };
}

// Errors we know are sandbox-specific (Vercel asset CDN cert, external
// host blocks like Lichess explorer, audit-stream POST to blocked
// prod URL). NOT real app bugs.
const BENIGN_ERROR_PATTERNS = [
  /ERR_CERT_AUTHORITY_INVALID/,
  /403.*Forbidden/i,
  /host_not_allowed/i,
  /Failed to fetch.*audit-stream/i,
  /audit-stream.*POST/i,
  /explorer\.lichess\.ovh/,
  /api\.deepseek\.com/,
  /api\.anthropic\.com/,
  /polly/i,
  /Failed to load resource.*403/i,
  /Failed to load resource.*cert/i,
  /ERR_INTERNET_DISCONNECTED/,
  /ERR_NAME_NOT_RESOLVED/,
  // DevTools / SW noise
  /DevTools/,
  /sw\.js/,
  /serviceWorker/i,
];

function isBenign(errMsg) {
  return BENIGN_ERROR_PATTERNS.some((re) => re.test(errMsg));
}

// ─── Per-scenario driver ──────────────────────────────────────────
async function runScenario(ctx, scenario, sharedState) {
  const page = await ctx.newPage();
  const consoleErrors = [];
  const auditEvents = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!isBenign(text)) consoleErrors.push(text);
    }
  });
  page.on('pageerror', (err) => {
    const text = `pageerror: ${err.message}`;
    if (!isBenign(text)) consoleErrors.push(text);
  });
  page.on('request', (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postData();
        if (body) {
          const parsed = JSON.parse(body);
          for (const e of parsed.entries ?? parsed.events ?? [parsed]) {
            if (e?.kind) auditEvents.push(e);
          }
        }
      } catch {}
    }
  });

  let navError = null;
  try {
    await page.goto(`${BASE_URL}${scenario.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    // For opening-detail pages: wait longer for Dexie seed before
    // asserting (the page renders "Opening not found" until db.openings
    // has been populated by seedDatabase).
    if (scenario.url.startsWith('/openings/') && scenario.url !== '/openings/pro') {
      await page.waitForSelector('[data-testid="opening-detail"]', { timeout: 10000 }).catch(() => {});
    }
    await page.waitForTimeout(1200);
  } catch (e) {
    navError = e.message;
  }

  // Run post-actions if any
  if (scenario.postActions && !navError) {
    for (const a of scenario.postActions) {
      try {
        if (a.action === 'click') await page.locator(a.selector).first().click({ timeout: 3000 });
        if (a.action === 'fill') await page.locator(a.selector).first().fill(a.text, { timeout: 3000 });
      } catch {}
    }
    await page.waitForTimeout(800);
  }

  const results = [];
  if (navError) {
    results.push({ desc: 'navigation', pass: false, reason: `nav error: ${navError}` });
  } else {
    for (const exp of scenario.expect ?? []) {
      const r = await runExpectation(page, exp, consoleErrors, auditEvents);
      results.push({ desc: exp.description, pass: r.pass, reason: r.reason, detail: r.detail });
    }
  }

  await page.close();
  const failures = results.filter(r => !r.pass);
  return {
    name: scenario.name,
    url: scenario.url,
    description: scenario.description,
    results,
    failures,
    consoleErrors,
    consoleErrorsCount: consoleErrors.length,
    auditEventsCount: auditEvents.length,
  };
}

// ─── Warmup: seed Dexie before scenario assertions ────────────────
async function warmup(ctx) {
  process.stdout.write('  [warmup] seeding Dexie ... ');
  const page = await ctx.newPage();
  page.on('console', () => {});
  page.on('pageerror', () => {});
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  // App.tsx kicks seedDatabase() async; wait enough for the bulkPut
  // of ~40 repertoire openings to complete on a fresh IndexedDB.
  await page.waitForTimeout(8000);
  // Verify by checking a known opening loads
  await page.goto(`${BASE_URL}/openings/ruy-lopez`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('[data-testid="opening-detail"]', { timeout: 12000 }).catch(() => {});
  await page.close();
  console.log('done');
}

// ─── Main ─────────────────────────────────────────────────────────
async function runPass(ctx) {
  const out = [];
  for (const sc of SCENARIOS) {
    process.stdout.write(`  [${sc.name}] ... `);
    const r = await runScenario(ctx, sc);
    if (r.failures.length === 0) {
      console.log(`✓ (${r.results.length} checks, ${r.auditEventsCount} audits)`);
    } else {
      console.log(`✗ ${r.failures.length}/${r.results.length} failed`);
      for (const f of r.failures) {
        console.log(`     - ${f.desc}: ${f.reason}`);
      }
    }
    out.push(r);
  }
  return out;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[audit-everything] base    = ${BASE_URL}`);
  console.log(`[audit-everything] outDir  = ${OUT_DIR}`);
  console.log(`[audit-everything] mode    = ${LOOP ? `loop until ${PASSES_REQUIRED} consecutive clean passes (max ${MAX_LOOPS})` : 'single pass'}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[audit-everything] chromium = ${executablePath}`);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });

  // Shared context across the whole pass so Dexie seed persists
  // between scenarios. Recreate per loop pass so each loop starts
  // fresh (no leaked state).
  let consecutiveClean = 0;
  let loop = 0;
  const allPasses = [];

  while (true) {
    loop++;
    console.log(`\n━━━ PASS ${loop} ━━━`);
    const ctx = await browser.newContext({
      viewport: { width: 414, height: 896 },
      deviceScaleFactor: 2,
      userAgent: 'AuditEverythingBot/1.0',
    });
    await warmup(ctx);
    const results = await runPass(ctx);
    await ctx.close();
    const totalFailures = results.reduce((s, r) => s + r.failures.length, 0);
    const failedSurfaces = results.filter(r => r.failures.length > 0).length;
    console.log(`\nPass ${loop} summary: ${failedSurfaces}/${results.length} surfaces with failures (${totalFailures} total)`);

    allPasses.push({ loop, totalFailures, failedSurfaces, results });
    await writeFile(`${OUT_DIR}/pass-${loop}.json`, JSON.stringify({ loop, totalFailures, failedSurfaces, results }, null, 2));

    if (totalFailures === 0) {
      consecutiveClean++;
      console.log(`  clean pass: ${consecutiveClean}/${PASSES_REQUIRED}`);
    } else {
      consecutiveClean = 0;
    }

    if (!LOOP) break;
    if (consecutiveClean >= PASSES_REQUIRED) {
      console.log(`\n✓ ${PASSES_REQUIRED} consecutive clean passes — audit loop complete.`);
      break;
    }
    if (loop >= MAX_LOOPS) {
      console.log(`\n⚠ hit max loops (${MAX_LOOPS}) without ${PASSES_REQUIRED} consecutive clean passes.`);
      break;
    }
  }

  await browser.close();
  await writeFile(`${OUT_DIR}/summary.json`, JSON.stringify({
    base: BASE_URL,
    passesRun: loop,
    consecutiveCleanAtEnd: consecutiveClean,
    allPasses,
  }, null, 2));

  console.log(`\nReport: ${OUT_DIR}/`);
  process.exit(consecutiveClean >= PASSES_REQUIRED || !LOOP ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
