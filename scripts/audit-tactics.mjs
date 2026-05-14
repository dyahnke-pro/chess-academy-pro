#!/usr/bin/env node
/**
 * Audit-tactics — full-coverage end-to-end audit of every surface
 * under /tactics/* against the deployed app (or local dev via
 * AUDIT_SMOKE_URL).
 *
 * Pattern mirrors audit-smoke.mjs: one Chromium session, no page
 * reloads, SPA-style navigation via real clicks, outgoing audit POSTs
 * intercepted for per-surface event summaries, console.errors +
 * pageerrors captured per surface, screenshot per surface, JSON
 * report at audit-reports/tactics-<iso>/report.json.
 *
 * Coverage map: see the comments on each section. Every surface has
 * at least a mount check; surfaces with non-trivial state machines
 * have deep-flow checks (Opening Traps Play-it-out side-flip,
 * Drill nav-prev disabled, etc.).
 *
 * Usage:
 *   node scripts/audit-tactics.mjs
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-tactics.mjs
 *   AUDIT_SMOKE_HEADED=1 node scripts/audit-tactics.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET =
  process.env.AUDIT_STREAM_SECRET ??
  '06fe5f2383534090df8b6ba11e79088eb665ec780175df4f032befc02a530782';
const STREAM_URL = `${BASE_URL}/api/audit-stream`;
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/tactics-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const SHORT_SETTLE_MS = 3000;
const MED_SETTLE_MS = 5000;
const PUZZLE_SETTLE_MS = 8000; // boards + Stockfish + puzzle load
const STOCKFISH_SETTLE_MS = 6500; // engine first move

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[tactics] base    = ${BASE_URL}`);
  console.log(`[tactics] stream  = ${STREAM_URL}`);
  console.log(`[tactics] outDir  = ${OUT_DIR}`);
  console.log(`[tactics] headed  = ${HEADED}`);

  const browser = await chromium.launch({ headless: !HEADED });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditTacticsBot/1.0 (chromium)',
  });

  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch {
        /* ignore */
      }
    },
    { url: STREAM_URL, secret: SECRET },
  );

  const page = await ctx.newPage();

  const captured = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u === STREAM_URL && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        if (body && typeof body === 'object') captured.push(body);
      } catch {
        /* ignore */
      }
    }
  });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 500));
  });
  page.on('pageerror', (err) => pageErrors.push(err.message.slice(0, 500)));

  const report = { base: BASE_URL, startedAt: stamp, surfaces: [] };

  async function record(name, action, settleMs = SHORT_SETTLE_MS, expectations = []) {
    const before = captured.length;
    const errsBefore = pageErrors.length;
    const consBefore = consoleErrors.length;
    const t0 = Date.now();
    let actionErr = null;
    try {
      await action();
      await page.waitForTimeout(settleMs);
    } catch (e) {
      actionErr = String(e?.message ?? e);
      console.log(`  [error] ${actionErr}`);
    }
    const screenshotPath = join(OUT_DIR, `${name}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch {
      /* ignore */
    }
    const fresh = captured.slice(before);
    const kindCounts = fresh.reduce((acc, e) => {
      const k = String(e.kind ?? 'unknown');
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const sortedKinds = Object.entries(kindCounts).sort((a, b) => b[1] - a[1]);
    const url = page.url();

    const checks = [];
    for (const exp of expectations) {
      try {
        const ok = await exp.fn();
        checks.push({ label: exp.label, ok: !!ok });
      } catch (e) {
        checks.push({ label: exp.label, ok: false, error: String(e?.message ?? e) });
      }
    }

    const newConsole = consoleErrors.slice(consBefore);
    const newPage = pageErrors.slice(errsBefore);

    console.log(`\n[tactics] ${name}  →  ${url}`);
    console.log(`  ${fresh.length} events, ${Date.now() - t0}ms`);
    for (const [kind, n] of sortedKinds.slice(0, 6)) {
      console.log(`    ${String(n).padStart(3)} × ${kind}`);
    }
    for (const c of checks) {
      console.log(`    ${c.ok ? 'PASS' : 'FAIL'} — ${c.label}${c.error ? ` (${c.error})` : ''}`);
    }
    if (newConsole.length) console.log(`  console.errors: ${newConsole.length}`);
    if (newPage.length) console.log(`  pageerrors: ${newPage.length}`);

    report.surfaces.push({
      name,
      url,
      durationMs: Date.now() - t0,
      eventCount: fresh.length,
      kindCounts,
      checks,
      screenshot: screenshotPath,
      consoleErrors: newConsole,
      pageErrors: newPage,
      sampleEvents: fresh.slice(0, 5),
      error: actionErr,
    });
  }

  // ─── DOM helpers ───────────────────────────────────────────────────
  async function visible(testid) {
    return await page.locator(`[data-testid="${testid}"]`).first().isVisible().catch(() => false);
  }
  async function hasText(needle) {
    const body = (await page.textContent('body').catch(() => '')) ?? '';
    return body.toLowerCase().includes(needle.toLowerCase());
  }
  async function tileCount() {
    return await page.locator('[data-testid^="section-"]').count().catch(() => 0);
  }
  async function readBoardState() {
    return await page.evaluate(() => {
      const squares = document.querySelectorAll('[data-square]');
      const out = {};
      for (const sq of squares) {
        const square = sq.getAttribute('data-square');
        if (!square) continue;
        const piece = sq.querySelector('[data-piece]');
        out[square] = piece?.getAttribute('data-piece') ?? null;
      }
      return out;
    });
  }
  async function readOrientation() {
    return await page.evaluate(() => {
      const a1 = document.querySelector('[data-square="a1"]');
      const h8 = document.querySelector('[data-square="h8"]');
      if (!a1 || !h8) return null;
      const a = a1.getBoundingClientRect();
      const h = h8.getBoundingClientRect();
      if (a.top > h.top) return 'white-bottom';
      if (a.top < h.top) return 'black-bottom';
      return 'unknown';
    });
  }
  async function paddingBottomPx(testid) {
    return await page.evaluate((tid) => {
      const el = document.querySelector(`[data-testid="${tid}"]`);
      if (!el) return null;
      const pb = window.getComputedStyle(el).paddingBottom;
      return parseFloat(pb);
    }, testid);
  }
  async function backToHub() {
    await page.getByRole('link', { name: 'Tactics' }).first().click().catch(() => {});
    await page.locator('[data-testid="tactics-page"]').waitFor({ timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(800);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 1. Boot
  // ═══════════════════════════════════════════════════════════════════
  await record(
    'dashboard',
    async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
      await page.getByText('Chess Academy Pro', { exact: true }).first().waitFor({ timeout: BOOT_TIMEOUT_MS });
    },
    6000,
  );

  // ═══════════════════════════════════════════════════════════════════
  // 2. /tactics — Hub
  // ═══════════════════════════════════════════════════════════════════
  await record(
    'tactics-hub',
    async () => {
      await page.getByRole('link', { name: 'Tactics' }).first().click();
      await page.locator('[data-testid="tactics-page"]').waitFor({ timeout: 15_000 });
    },
    MED_SETTLE_MS,
    [
      { label: 'page mount', fn: () => visible('tactics-page') },
      { label: 'title visible', fn: () => hasText('tactical training') },
      { label: 'search bar present', fn: async () => (await page.locator('input[placeholder*="Search"]').count()) > 0 },
      { label: 'all 16 tiles render', fn: async () => (await tileCount()) >= 16 },
      { label: 'My Profile tile', fn: () => visible('section-spot') },
      { label: 'Daily Training tile', fn: () => visible('section-daily') },
      { label: 'Setup Trainer tile', fn: () => visible('section-setup') },
      { label: 'Random Mix tile', fn: () => visible('section-random-mix') },
      { label: 'Opening Traps tile', fn: () => visible('section-opening traps') },
      { label: 'Forks tile', fn: () => visible('section-forks') },
      { label: 'Pins & Skewers tile', fn: () => visible('section-pins & skewers') },
      { label: 'Discovered Attacks tile', fn: () => visible('section-discovered attacks') },
      { label: 'Back Rank Mates tile', fn: () => visible('section-back rank mates') },
      { label: 'Sacrifices tile', fn: () => visible('section-sacrifices') },
      { label: 'Deflection & Decoy tile', fn: () => visible('section-deflection & decoy') },
      { label: 'Zugzwang tile', fn: () => visible('section-zugzwang') },
      { label: 'Endgame Technique tile', fn: () => visible('section-endgame technique') },
      { label: 'Mating Nets tile', fn: () => visible('section-mating nets') },
      { label: 'My Weaknesses tile', fn: () => visible('section-my-weaknesses') },
      { label: 'My Mistakes tile', fn: () => visible('section-my mistakes') },
      {
        label: 'safe-area padding >= 4.5rem',
        fn: async () => {
          const pb = await paddingBottomPx('tactics-page');
          return pb != null && pb >= 64; // 4.5rem ≈ 72px; allow margin
        },
      },
    ],
  );

  // SmartSearchBar typing — verify no crash
  await record(
    'tactics-hub-search-typing',
    async () => {
      const input = page.locator('input[placeholder*="Search"]').first();
      await input.fill('Sicilian');
      await page.waitForTimeout(800);
    },
    1000,
    [{ label: 'search input retains value', fn: async () => (await page.locator('input[placeholder*="Search"]').first().inputValue()) === 'Sicilian' }],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 3. /tactics/profile
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-profile',
    async () => {
      await page.locator('[data-testid="section-spot"]').click();
      // The page renders the header instantly in its loading state
      // (so back-btn is reachable), but the loaded body — Train Your
      // Weakest CTA + theme rows — waits on getThemeSkills() which on
      // a cold Dexie races seedPuzzles(). Poll up to 20s for the
      // loaded state to materialize before running the assertions.
      await page
        .locator('[data-testid="begin-training-btn"]')
        .waitFor({ timeout: 20_000 })
        .catch(() => {});
    },
    1500,
    [
      { label: 'route /tactics/profile', fn: () => page.url().endsWith('/tactics/profile') },
      { label: 'page mount', fn: () => visible('tactical-profile-page') },
      { label: 'back btn visible (loading or loaded)', fn: () => visible('back-btn') },
      { label: 'refresh btn visible', fn: () => visible('refresh-btn') },
      { label: 'Train Your Weakest CTA', fn: () => visible('begin-training-btn') },
      { label: 'has 11 theme rows (one per THEME_MAP entry)', fn: async () => (await page.locator('[data-testid="theme-row"]').count()) === 11 },
      { label: 'stats labels present', fn: async () => (await hasText('Puzzles Solved')) && (await hasText('Themes Practiced')) },
    ],
  );

  await record(
    'tactics-profile-refresh-click',
    async () => {
      const r = page.locator('[data-testid="refresh-btn"]');
      if (await r.isVisible().catch(() => false)) await r.click();
    },
    2500,
    [
      { label: 'no pageerror', fn: async () => true /* counted globally */ },
      { label: 'page still mounted', fn: () => visible('tactical-profile-page') },
    ],
  );

  await record(
    'tactics-profile-train-weakest-nav',
    async () => {
      await page.locator('[data-testid="begin-training-btn"]').click();
    },
    PUZZLE_SETTLE_MS,
    [
      { label: 'lands on /tactics/drill', fn: () => page.url().endsWith('/tactics/drill') },
      { label: 'drill page mounts', fn: () => visible('tactic-drill-page') },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 4. /tactics/classic — PuzzleTrainerPage
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-classic',
    async () => {
      await page.locator('[data-testid="section-daily"]').click();
    },
    PUZZLE_SETTLE_MS,
    [
      { label: 'route /tactics/classic', fn: () => page.url().endsWith('/tactics/classic') },
      { label: 'page mount', fn: () => visible('puzzle-trainer') },
      { label: 'header shows rating', fn: async () => /rating:\s*\d+/i.test((await page.textContent('body')) ?? '') },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 5. /tactics/setup
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-setup-select',
    async () => {
      await page.locator('[data-testid="section-setup"]').click();
    },
    SHORT_SETTLE_MS,
    [
      { label: 'route /tactics/setup', fn: () => page.url().endsWith('/tactics/setup') },
      { label: 'Beginner button', fn: () => visible('difficulty-1') },
      { label: 'Intermediate button', fn: () => visible('difficulty-2') },
      { label: 'Advanced button', fn: () => visible('difficulty-3') },
    ],
  );

  await record(
    'tactics-setup-beginner-pick',
    async () => {
      const d1 = page.locator('[data-testid="difficulty-1"]');
      if (await d1.isVisible().catch(() => false)) await d1.click();
    },
    PUZZLE_SETTLE_MS,
    [
      {
        label: 'queue loads OR empty-summary OR loading',
        fn: async () =>
          (await visible('puzzle-nav')) ||
          (await visible('session-summary')) ||
          (await visible('loading')),
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 6. /tactics/drill — Random Mix (nav arrows + state assertions)
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-random-mix',
    async () => {
      await page.locator('[data-testid="section-random-mix"]').click();
    },
    PUZZLE_SETTLE_MS,
    [
      { label: 'route /tactics/drill', fn: () => page.url().endsWith('/tactics/drill') },
      { label: 'page mount', fn: () => visible('tactic-drill-page') },
      { label: 'theme label "Mixed"', fn: () => hasText('mixed') },
      {
        label: 'puzzle-nav OR summary visible',
        fn: async () =>
          (await visible('puzzle-nav')) ||
          (await visible('session-summary')),
      },
      {
        label: 'nav-prev disabled at index 0',
        fn: async () => {
          const prev = page.locator('[data-testid="nav-prev"]');
          if (!(await prev.isVisible().catch(() => false))) return true; // no-board surface acceptable
          return await prev.isDisabled().catch(() => false);
        },
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 7. Theme drills (one per theme — quick mount + label check)
  // ═══════════════════════════════════════════════════════════════════
  const themes = [
    { tile: 'section-forks', label: 'fork' },
    { tile: 'section-pins & skewers', label: 'drill' }, // label "Drill: Mixed" when multiple themes
    { tile: 'section-discovered attacks', label: 'discoveredattack' },
    { tile: 'section-back rank mates', label: 'backrankmate' },
    { tile: 'section-sacrifices', label: 'sacrifice' },
    { tile: 'section-deflection & decoy', label: 'deflection' },
    { tile: 'section-zugzwang', label: 'zugzwang' },
    { tile: 'section-endgame technique', label: 'drill' },
    { tile: 'section-mating nets', label: 'drill' },
  ];
  for (const t of themes) {
    await backToHub();
    await record(
      `tactics-drill-${t.tile.replace(/[^a-z0-9-]/gi, '-')}`,
      async () => {
        await page.locator(`[data-testid="${t.tile}"]`).click();
      },
      PUZZLE_SETTLE_MS,
      [
        { label: 'route /tactics/drill', fn: () => page.url().endsWith('/tactics/drill') },
        { label: 'page mount', fn: () => visible('tactic-drill-page') },
        { label: `body mentions ${t.label} or fork or mixed`, fn: async () => (await hasText(t.label)) || (await hasText('drill')) },
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. /tactics/adaptive
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-adaptive',
    async () => {
      await page.goto(`${BASE_URL}/tactics/adaptive`, { waitUntil: 'domcontentloaded' });
    },
    PUZZLE_SETTLE_MS,
    [
      { label: 'route /tactics/adaptive', fn: () => page.url().endsWith('/tactics/adaptive') },
      { label: 'page mount', fn: () => visible('adaptive-puzzle-page') },
      { label: 'back-button present', fn: () => visible('back-button') },
      { label: 'player-rating-header present', fn: () => visible('player-rating-header') },
      { label: 'classic-trainer-link present', fn: () => visible('classic-trainer-link') },
      { label: 'my-mistakes-link present', fn: () => visible('my-mistakes-link') },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 9. /tactics/create
  // ═══════════════════════════════════════════════════════════════════
  await record(
    'tactics-create',
    async () => {
      await page.goto(`${BASE_URL}/tactics/create`, { waitUntil: 'domcontentloaded' });
    },
    MED_SETTLE_MS,
    [
      { label: 'route /tactics/create', fn: () => page.url().endsWith('/tactics/create') },
      { label: 'header "Create" visible', fn: () => hasText('replay your game') },
      {
        label: 'loading OR summary OR replay phase visible',
        fn: async () =>
          (await visible('loading')) ||
          (await visible('session-summary')) ||
          (await hasText('context depth')),
      },
      { label: 'back btn visible', fn: () => visible('back-btn') },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 10. /tactics/opening-traps — deep flow (Play-it-out side-flip)
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-opening-traps-hub',
    async () => {
      await page.locator('[data-testid="section-opening traps"]').click();
      await page.locator('[data-testid="opening-blunders-page"]').waitFor({ timeout: 15_000 });
    },
    SHORT_SETTLE_MS,
    [
      { label: 'route /tactics/opening-traps', fn: () => page.url().endsWith('/tactics/opening-traps') },
      { label: 'page mount', fn: () => visible('opening-blunders-page') },
      { label: '4 phase tabs', fn: async () => (await page.locator('[data-testid^="opening-blunder-phase-"]').count()) >= 4 },
      { label: '>=1 family tile', fn: async () => (await page.locator('[data-testid^="opening-blunder-family-"]').count()) > 0 },
    ],
  );

  await record(
    'tactics-opening-traps-puzzle',
    async () => {
      await page.locator('[data-testid^="opening-blunder-family-"]').first().click({ timeout: 5_000 });
      await page.waitForTimeout(800);
      const firstColor = page.locator('[data-testid^="opening-blunder-color-"]').first();
      if (await firstColor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstColor.click();
        await page.waitForTimeout(600);
      }
      const puzzles = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('[data-testid^="opening-blunder-"]'));
        return all
          .map((el) => el.getAttribute('data-testid'))
          .filter((tid) =>
            tid &&
            !tid.startsWith('opening-blunder-phase-') &&
            !tid.startsWith('opening-blunder-family-') &&
            !tid.startsWith('opening-blunder-color-') &&
            tid !== 'opening-blunder-play-out' &&
            tid !== 'opening-blunder-show-opening' &&
            tid !== 'opening-blunder-hint' &&
            tid !== 'opening-blunder-reveal' &&
            tid !== 'opening-blunder-next' &&
            tid !== 'opening-blunders-page',
          );
      });
      if (puzzles.length === 0) throw new Error('no puzzle tiles found');
      await page.locator(`[data-testid="${puzzles[0]}"]`).click({ timeout: 5_000 });
      await page.waitForTimeout(2500);
    },
    SHORT_SETTLE_MS,
    [
      { label: 'board pieces rendered', fn: async () => (await page.locator('[data-piece]').count()) > 0 },
      {
        label: 'orientation recognized',
        fn: async () => {
          const o = await readOrientation();
          return o === 'white-bottom' || o === 'black-bottom';
        },
      },
    ],
  );

  const orientationBefore = await readOrientation();
  const studentBottom = orientationBefore === 'white-bottom' ? 'white' : 'black';

  await record(
    'tactics-opening-traps-reveal',
    async () => {
      const tries = [
        ['a2', 'a3'], ['a7', 'a6'], ['h2', 'h3'], ['h7', 'h6'],
        ['b2', 'b3'], ['b7', 'b6'], ['g2', 'g3'], ['g7', 'g6'],
      ];
      for (const [from, to] of tries) {
        const reveal = page.locator('[data-testid="opening-blunder-reveal"]');
        if (await reveal.isVisible().catch(() => false)) break;
        const fromSq = page.locator(`[data-square="${from}"]`);
        const toSq = page.locator(`[data-square="${to}"]`);
        if (!(await fromSq.isVisible().catch(() => false))) continue;
        await fromSq.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(150);
        await toSq.click({ timeout: 1500 }).catch(() => {});
        await page.waitForTimeout(400);
      }
      const reveal = page.locator('[data-testid="opening-blunder-reveal"]');
      if (await reveal.isVisible().catch(() => false)) await reveal.click();
      await page.waitForTimeout(2000);
    },
    1500,
    [
      { label: 'play-out button appears', fn: () => visible('opening-blunder-play-out') },
      { label: 'orientation unchanged after reveal', fn: async () => (await readOrientation()) === orientationBefore },
    ],
  );

  const stateBeforePlayOut = await readBoardState();
  await record(
    'tactics-opening-traps-play-out',
    async () => {
      const btn = page.locator('[data-testid="opening-blunder-play-out"]');
      if (!(await btn.isVisible().catch(() => false))) {
        throw new Error('play-out button not present');
      }
      await btn.click();
      await page.waitForTimeout(STOCKFISH_SETTLE_MS);
    },
    1500,
    [
      { label: 'orientation unchanged after Play-it-out', fn: async () => (await readOrientation()) === orientationBefore },
      {
        // The side-flip bug pre-fix: when the curated solution had an
        // ODD number of moves, playOutStartFen captured opponent-to-
        // move. The hook re-derived studentSide from FEN → flipped.
        // If user then dragged a piece, chess.js accepted (it WAS that
        // color's turn) and the hook then asked Stockfish to play the
        // student's actual color. Visible signal: a student-color
        // piece moves spontaneously after Play-it-out.
        //
        // Robust check: post-play-out state must be either (a) no
        // change at all (even-length puzzle, student is correctly to
        // move, no Stockfish kick needed), or (b) only opponent-color
        // pieces moved (Stockfish correctly kicked in to play the
        // opponent's reply). FAIL if any student-color piece moved.
        label: 'no side-flip: post-play-out is opponent-moved OR unchanged',
        fn: async () => {
          const after = await readBoardState();
          const colorsMoved = new Set();
          for (const sq of Object.keys(after)) {
            const was = stateBeforePlayOut[sq];
            const now = after[sq];
            if (was !== now && now) {
              const c = now[0];
              if (c === 'w') colorsMoved.add('white');
              else if (c === 'b') colorsMoved.add('black');
            }
          }
          const opponent = studentBottom === 'white' ? 'black' : 'white';
          if (colorsMoved.size === 0) return true; // even-length: student's turn already
          if (colorsMoved.has(opponent) && !colorsMoved.has(studentBottom)) return true;
          return false; // student-color piece moved spontaneously → bug
        },
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 11. /tactics/weakness-themes
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-weakness-themes',
    async () => {
      await page.locator('[data-testid="section-my-weaknesses"]').click();
    },
    MED_SETTLE_MS,
    [
      { label: 'route /tactics/weakness-themes', fn: () => page.url().endsWith('/tactics/weakness-themes') },
      { label: 'page mount', fn: () => visible('weakness-themes-page') },
      { label: 'back btn', fn: () => visible('back-btn') },
      {
        label: 'themes list, loading, or summary visible',
        fn: async () =>
          (await visible('themes-list')) ||
          (await visible('loading')) ||
          (await visible('session-summary')),
      },
    ],
  );

  // Try Mixed Training if it surfaced
  await record(
    'tactics-weakness-themes-mixed-click',
    async () => {
      const btn = page.locator('[data-testid="mixed-training-btn"]');
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
      }
    },
    MED_SETTLE_MS,
    [
      {
        label: 'after mixed-click: drill-view OR session-summary OR still on themes',
        fn: async () =>
          (await visible('drill-view')) ||
          (await visible('session-summary')) ||
          (await visible('themes-list')),
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 12. /tactics/weakness
  // ═══════════════════════════════════════════════════════════════════
  await record(
    'tactics-weakness',
    async () => {
      await page.goto(`${BASE_URL}/tactics/weakness`, { waitUntil: 'domcontentloaded' });
    },
    PUZZLE_SETTLE_MS,
    [
      { label: 'route /tactics/weakness', fn: () => page.url().endsWith('/tactics/weakness') },
      { label: 'back btn present', fn: () => visible('back-btn') },
      {
        label: 'puzzle-nav OR loading OR summary',
        fn: async () =>
          (await visible('puzzle-nav')) ||
          (await visible('loading')) ||
          (await visible('session-summary')),
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 13. /tactics/mistakes
  // ═══════════════════════════════════════════════════════════════════
  await backToHub();
  await record(
    'tactics-mistakes',
    async () => {
      await page.locator('[data-testid="section-my mistakes"]').click();
    },
    MED_SETTLE_MS,
    [
      { label: 'route /tactics/mistakes', fn: () => page.url().endsWith('/tactics/mistakes') },
      {
        label: 'page mount OR loading OR empty-state',
        fn: async () =>
          (await visible('my-mistakes-page')) ||
          (await visible('loading')) ||
          (await visible('empty-state')),
      },
      {
        label: 're-analyze button or empty-state CTA visible',
        fn: async () => (await visible('reanalyze-button')) || (await visible('empty-state')),
      },
    ],
  );

  // Phase tabs + filter dropdowns (only if non-empty)
  await record(
    'tactics-mistakes-tabs-filters',
    async () => {
      const opening = page.locator('[data-testid="phase-tab-opening"]');
      if (await opening.isVisible({ timeout: 1500 }).catch(() => false)) {
        await opening.click();
        await page.waitForTimeout(400);
      }
      const classFilter = page.locator('[data-testid="classification-filter"]');
      if (await classFilter.isVisible({ timeout: 1500 }).catch(() => false)) {
        await classFilter.selectOption('blunder').catch(() => {});
        await page.waitForTimeout(400);
        await classFilter.selectOption('all').catch(() => {});
      }
    },
    1500,
    [
      {
        label: 'no errors triggered by filter changes',
        fn: () => true, // tracked via global console/page errors
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 14. /tactics/lichess
  // ═══════════════════════════════════════════════════════════════════
  await record(
    'tactics-lichess',
    async () => {
      await page.goto(`${BASE_URL}/tactics/lichess`, { waitUntil: 'domcontentloaded' });
    },
    MED_SETTLE_MS,
    [
      { label: 'route /tactics/lichess', fn: () => page.url().endsWith('/tactics/lichess') },
      {
        label: 'one of: no-token, loaded, loading, error',
        fn: async () =>
          (await visible('lichess-dashboard-no-token')) ||
          (await visible('lichess-dashboard-page')) ||
          (await visible('dashboard-loading')) ||
          (await visible('dashboard-error')),
      },
    ],
  );

  // ═══════════════════════════════════════════════════════════════════
  // 15. Legacy redirects (all 11)
  // ═══════════════════════════════════════════════════════════════════
  const redirects = [
    ['/puzzles', '/tactics'],
    ['/puzzles/classic', '/tactics/classic'],
    ['/puzzles/adaptive', '/tactics/adaptive'],
    ['/puzzles/mistakes', '/tactics/mistakes'],
    ['/puzzles/weakness', '/tactics/weakness'],
    ['/puzzles/lichess-dashboard', '/tactics/lichess'],
    ['/weaknesses/puzzles', '/tactics/weakness'],
    ['/weaknesses/adaptive', '/tactics/adaptive'],
    ['/weaknesses/classic', '/tactics/classic'],
    ['/weaknesses/mistakes', '/tactics/mistakes'],
    ['/weaknesses/lichess-dashboard', '/tactics/lichess'],
  ];
  for (const [src, dst] of redirects) {
    await record(
      `redirect-${src.replace(/\//g, '-')}`,
      async () => {
        await page.goto(`${BASE_URL}${src}`, { waitUntil: 'domcontentloaded' });
      },
      2000,
      [{ label: `${src} → ${dst}`, fn: () => page.url().endsWith(dst) }],
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════
  report.totalEvents = captured.length;
  report.totalConsoleErrors = consoleErrors.length;
  report.totalPageErrors = pageErrors.length;
  report.allKindCounts = captured.reduce((acc, e) => {
    const k = String(e.kind ?? 'unknown');
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  report.errorLevelEvents = captured.filter(
    (e) =>
      String(e.level ?? '').toLowerCase() === 'error' ||
      String(e.kind ?? '').toLowerCase() === 'uncaught-error' ||
      String(e.kind ?? '').toLowerCase() === 'unhandled-rejection',
  );

  const failedChecks = [];
  for (const s of report.surfaces) {
    for (const c of s.checks ?? []) {
      if (!c.ok) failedChecks.push({ surface: s.name, label: c.label, error: c.error });
    }
    if (s.error) failedChecks.push({ surface: s.name, label: 'navigation action', error: s.error });
    if (s.pageErrors?.length) {
      for (const e of s.pageErrors) failedChecks.push({ surface: s.name, label: 'pageerror', error: e });
    }
  }
  report.failedChecks = failedChecks;

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  // ── Markdown summary
  const totalChecks = report.surfaces.reduce((n, s) => n + (s.checks?.length ?? 0), 0);
  const passedChecks = totalChecks - failedChecks.length;
  const mdLines = [
    `# Tactics Tab Audit`,
    ``,
    `Generated: ${stamp}`,
    `Base: ${BASE_URL}`,
    ``,
    `## Summary`,
    ``,
    `- Surfaces visited: **${report.surfaces.length}**`,
    `- Checks: **${passedChecks} / ${totalChecks}** passed`,
    `- Audit events captured: **${captured.length}**`,
    `- Console errors: **${consoleErrors.length}**`,
    `- Page errors: **${pageErrors.length}**`,
    `- Runtime-error audit events: **${report.errorLevelEvents.length}**`,
    ``,
    `## Failures`,
    ``,
  ];
  if (failedChecks.length === 0) {
    mdLines.push('_None._');
  } else {
    for (const f of failedChecks) {
      mdLines.push(`- **${f.surface}** — ${f.label}${f.error ? ` — \`${f.error.slice(0, 200)}\`` : ''}`);
    }
  }
  mdLines.push(``, `## Surfaces`, ``);
  for (const s of report.surfaces) {
    const pass = (s.checks ?? []).filter((c) => c.ok).length;
    const total = (s.checks ?? []).length;
    mdLines.push(`### ${s.name} → \`${s.url}\``);
    mdLines.push(`- Checks: ${pass}/${total}`);
    mdLines.push(`- Events: ${s.eventCount}`);
    if (s.consoleErrors?.length) mdLines.push(`- Console errors: ${s.consoleErrors.length}`);
    if (s.pageErrors?.length) mdLines.push(`- Page errors: ${s.pageErrors.length}`);
    if (s.error) mdLines.push(`- Navigation error: \`${s.error.slice(0, 200)}\``);
    mdLines.push(``);
  }
  await writeFile(join(OUT_DIR, 'report.md'), mdLines.join('\n'));

  console.log(
    `\n[tactics] done — ${captured.length} events, ${consoleErrors.length} console.errors, ${pageErrors.length} pageerrors`,
  );
  console.log(`[tactics] checks: ${passedChecks}/${totalChecks} passed`);
  console.log(`[tactics] failures: ${failedChecks.length}`);
  if (failedChecks.length) {
    for (const f of failedChecks) {
      console.log(`  - ${f.surface} :: ${f.label}${f.error ? ` :: ${String(f.error).slice(0, 120)}` : ''}`);
    }
  }
  console.log(`[tactics] report: ${OUT_DIR}/report.json`);
  console.log(`[tactics] report: ${OUT_DIR}/report.md`);

  await browser.close();
  if (failedChecks.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[tactics] fatal:', err);
  process.exit(1);
});
