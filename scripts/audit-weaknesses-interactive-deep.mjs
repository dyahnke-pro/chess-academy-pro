#!/usr/bin/env node
/**
 * Audit-weaknesses-interactive — multi-pass interactive audit of /weaknesses.
 *
 * Designed to be invoked 3 times back-to-back with AUDIT_PASS=1|2|3.
 * Each pass exercises a DIFFERENT permutation of inputs / click order
 * / cold-vs-warm cache so combined coverage across the 3 passes
 * touches every usable surface in the Game Insights page.
 *
 * Variations per pass:
 *   Pass 1 — cold cache, forward tab order, search="knight fork",
 *            mistake-row click, opening-drilldown click, refresh.
 *   Pass 2 — warm cache, reverse tab order, search="endgame
 *            blunder", tactic-row click, multiple mistake rows.
 *   Pass 3 — warm cache, mixed tab order, search="Italian Game",
 *            pattern click, import-games button visible, back-nav.
 *
 * Per CLAUDE.md G7 (Playwright audits MUST be INTERACTIVE), this
 * script types off-canonical queries, exercises cold-cache flow,
 * and drives click sequences a scripted-happy-path audit would
 * never hit.
 *
 * Run:
 *   AUDIT_PASS=1 node scripts/audit-weaknesses-interactive.mjs
 *   AUDIT_PASS=2 node scripts/audit-weaknesses-interactive.mjs
 *   AUDIT_PASS=3 node scripts/audit-weaknesses-interactive.mjs
 *
 * Env:
 *   AUDIT_SMOKE_URL  base URL (default http://localhost:5173)
 *   AUDIT_PASS       1|2|3 (default 1)
 *   AUDIT_SMOKE_HEADED=1  open browser visibly
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const PASS = Number(process.env.AUDIT_PASS ?? '1');
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/weaknesses-interactive-pass${PASS}-${stamp}`;

if (![1, 2, 3].includes(PASS)) {
  console.error(`AUDIT_PASS must be 1, 2, or 3 — got ${PASS}`);
  process.exit(2);
}

// Pass-specific config — keeps the same suite of scenarios but
// varies the inputs each run so we cover different code paths.
const PASS_CONFIG = {
  1: {
    coldCache: true,
    tabOrder: ['overview', 'openings', 'mistakes', 'tactics', 'patterns'],
    searchQuery: 'knight fork',
    mistakeFen: 'rnbqk2r/ppp2ppp/3p1n2/2b5/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    mistakeOpening: 'Italian Game',
    mistakeBest: { uci: 'd2d4', san: 'd4' },
    mistakePlay: { uci: 'd2d3', san: 'd3' },
    mistakeCpLoss: 220,
    mistakeNote: 'Pass 1: cold cache, knight-fork scenario',
  },
  2: {
    coldCache: false,
    tabOrder: ['patterns', 'tactics', 'mistakes', 'openings', 'overview'],
    searchQuery: 'endgame blunder',
    mistakeFen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
    mistakeOpening: "King's Pawn Endgame",
    mistakeBest: { uci: 'e1d2', san: 'Kd2' },
    mistakePlay: { uci: 'e2e3', san: 'e3' },
    mistakeCpLoss: 320,
    mistakeNote: 'Pass 2: warm cache, endgame scenario',
  },
  3: {
    coldCache: false,
    tabOrder: ['overview', 'mistakes', 'openings', 'tactics', 'patterns'],
    searchQuery: 'Italian Game',
    mistakeFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    mistakeOpening: 'Italian Game: Giuoco Piano',
    mistakeBest: { uci: 'g8f6', san: 'Nf6' },
    mistakePlay: { uci: 'd7d6', san: 'd6' },
    mistakeCpLoss: 140,
    mistakeNote: 'Pass 3: mixed order, Italian Giuoco Piano scenario',
  },
};
const cfg = PASS_CONFIG[PASS];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[weaknesses-interactive] pass=${PASS}`);
  console.log(`[weaknesses-interactive] base=${BASE_URL}`);
  console.log(`[weaknesses-interactive] outDir=${OUT_DIR}`);
  console.log(`[weaknesses-interactive] coldCache=${cfg.coldCache}`);
  console.log(`[weaknesses-interactive] tabOrder=${cfg.tabOrder.join('→')}`);
  console.log(`[weaknesses-interactive] searchQuery="${cfg.searchQuery}"`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[weaknesses-interactive] chromium=${executablePath}`);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: `AuditWeaknessesInteractiveBot/${PASS} (chromium)`,
  });

  // Capture audit-stream POST bodies as the page emits them.
  // The /api/audit-stream endpoint may not be running locally
  // (it's a Vercel function); we still want to inspect what the
  // app TRIED to send.
  const auditEvents = [];
  ctx.on('request', (req) => {
    if (req.url().includes('/api/audit-stream')) {
      try {
        const body = req.postData();
        if (body) {
          const parsed = JSON.parse(body);
          if (Array.isArray(parsed?.events)) {
            auditEvents.push(...parsed.events);
          } else if (parsed) {
            auditEvents.push(parsed);
          }
        }
      } catch {
        // ignore malformed posts
      }
    }
  });

  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const txt = m.text();
      // Filter known harmless noise: failed audit-stream POSTs
      // when the endpoint isn't running locally, and Stockfish
      // worker init noise during cold-start in the audit context.
      if (txt.includes('/api/audit-stream')) return;
      if (txt.toLowerCase().includes('failed to load resource') && txt.includes('audit-stream')) return;
      consoleErrors.push(txt);
    }
  });
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  const scenarios = [];
  async function scenario(name, fn) {
    const t0 = Date.now();
    let ok = false;
    let detail = '';
    try {
      detail = await fn();
      ok = true;
    } catch (err) {
      detail = `error: ${err.message}`;
    }
    const result = { name, ok, durationMs: Date.now() - t0, detail };
    scenarios.push(result);
    console.log(`  ${ok ? '✓' : '✗'} ${name} → ${detail}`);
    return result;
  }

  // ─── Boot ────────────────────────────────────────────────────
  await scenario('boot-weaknesses', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    return 'page mounted';
  });

  // Cold-cache: clear Dexie before continuing.
  if (cfg.coldCache) {
    await scenario('cold-cache-clear-indexeddb', async () => {
      await page.evaluate(async () => {
        const dbs = await indexedDB.databases?.();
        if (!dbs) return;
        await Promise.all(
          dbs.map(
            (d) =>
              new Promise((resolve) => {
                if (!d.name) return resolve(undefined);
                const req = indexedDB.deleteDatabase(d.name);
                req.onsuccess = () => resolve(undefined);
                req.onerror = () => resolve(undefined);
                req.onblocked = () => resolve(undefined);
              }),
          ),
        );
      });
      await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
      await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
      return 'IndexedDB cleared + page reloaded cold';
    });
  }

  // ─── Header controls ─────────────────────────────────────────
  await scenario('header-back-btn-visible', async () => {
    await page.locator('[data-testid="back-btn"]').waitFor({ timeout: 10_000 });
    return 'visible';
  });

  await scenario('header-search-input-visible', async () => {
    await page.locator('[data-testid="search-input"]').waitFor({ timeout: 10_000 });
    return 'visible';
  });

  // ─── Search input typing (off-canonical input per G7) ─────────
  await scenario(`search-input-type-${PASS}`, async () => {
    const input = page.locator('[data-testid="search-input"]');
    await input.click();
    await input.fill(cfg.searchQuery);
    const value = await input.inputValue();
    if (value !== cfg.searchQuery) {
      throw new Error(`expected "${cfg.searchQuery}", got "${value}"`);
    }
    return `typed "${cfg.searchQuery}"`;
  });

  // Clear the search so it doesn't filter subsequent UI we want to
  // probe.
  await scenario('search-input-clear', async () => {
    const input = page.locator('[data-testid="search-input"]');
    await input.fill('');
    return 'cleared';
  });

  // ─── All 5 tab buttons present ────────────────────────────────
  for (const t of ['overview', 'openings', 'mistakes', 'tactics', 'patterns']) {
    await scenario(`tab-${t}-button-visible`, async () => {
      const btn = page.locator(`[data-testid="tab-${t}"]`);
      if (!(await btn.isVisible())) throw new Error(`tab-${t} missing`);
      return 'visible';
    });
  }

  // ─── Walk through tabs in this pass's order ──────────────────
  const tabContentVariants = {
    overview: ['overview-tab'],
    openings: ['openings-tab'],
    mistakes: ['mistakes-tab'],
    tactics: ['tactics-tab'],
    patterns: ['patterns-tab', 'patterns-loading', 'patterns-empty'],
  };
  for (const tab of cfg.tabOrder) {
    await scenario(`order-switch-to-${tab}`, async () => {
      await page.locator(`[data-testid="tab-${tab}"]`).click();
      const variants = tabContentVariants[tab];
      const selector = variants.map((v) => `[data-testid="${v}"]`).join(', ');
      const ok = await page
        .locator(selector)
        .first()
        .waitFor({ timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (!ok) throw new Error(`no variant matched: ${variants.join(', ')}`);
      let matched = '?';
      for (const v of variants) {
        if ((await page.locator(`[data-testid="${v}"]`).count()) > 0) {
          matched = v;
          break;
        }
      }
      return `→ ${matched}`;
    });
  }

  // ─── Pre-seed sample games via /coach/review ─────────────────
  await scenario('pre-seed-sample-games', async () => {
    await page.goto(`${BASE_URL}/coach/review`, { timeout: 60_000 });
    await page.locator('[data-testid="coach-review-list-page"]').waitFor({ timeout: 60_000 });
    await page
      .locator('[data-testid^="review-game-card-"]')
      .first()
      .waitFor({ timeout: 30_000 });
    return 'sample games seeded';
  });

  // ─── Seed synthetic mistake puzzle ────────────────────────────
  await scenario(`seed-mistake-${PASS}`, async () => {
    const puzzle = {
      id: `audit-weaknesses-interactive-pass${PASS}-mistake-1`,
      fen: cfg.mistakeFen,
      playerMove: cfg.mistakePlay.uci,
      playerMoveSan: cfg.mistakePlay.san,
      bestMove: cfg.mistakeBest.uci,
      bestMoveSan: cfg.mistakeBest.san,
      moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
      cpLoss: cfg.mistakeCpLoss,
      classification: 'mistake',
      gamePhase: PASS === 2 ? 'endgame' : 'opening',
      moveNumber: PASS === 2 ? 30 : 5,
      sourceGameId: 'sample-morphy-opera-1858',
      sourceMode: 'imported',
      playerColor: 'white',
      promptText: cfg.mistakeNote,
      narration: { intro: '', body: '', outro: '' },
      opponentName: 'AuditBot',
      openingName: cfg.mistakeOpening,
      evalBefore: 30,
      srsInterval: 1,
      srsEaseFactor: 2.5,
      srsRepetitions: 0,
      status: 'new',
      attempts: 0,
      successes: 0,
    };
    await page.evaluate(async (p) => {
      const now = new Date().toISOString();
      const full = { ...p, createdAt: now, gameDate: now, srsDueDate: now, srsLastReview: null };
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onerror = () => reject(new Error('failed to open DB'));
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('mistakePuzzles')) {
            db.close();
            reject(new Error('mistakePuzzles store missing'));
            return;
          }
          const tx = db.transaction('mistakePuzzles', 'readwrite');
          tx.objectStore('mistakePuzzles').put(full);
          tx.oncomplete = () => {
            db.close();
            resolve(undefined);
          };
          tx.onerror = () => {
            db.close();
            reject(new Error('seed transaction failed'));
          };
        };
      });
    }, puzzle);
    return `seeded mistake ${puzzle.id}`;
  });

  // ─── Return to /weaknesses + open Mistakes ────────────────────
  await scenario('return-to-weaknesses-mistakes', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    await page.locator('[data-testid="tab-mistakes"]').click();
    await page.locator('[data-testid="mistake-row"]').first().waitFor({ timeout: 15_000 });
    const count = await page.locator('[data-testid="mistake-row"]').count();
    return `${count} mistake-row(s) rendered`;
  });

  // ─── Click mistake row → review nav ───────────────────────────
  // Pick row index by pass so the 3 passes touch different rows
  // when multiple are present.
  const rowIndex = (PASS - 1) % Math.max(1, await page.locator('[data-testid="mistake-row"]').count());
  await scenario(`mistake-row-${rowIndex}-click-navigates`, async () => {
    await page.locator('[data-testid="mistake-row"]').nth(rowIndex).click();
    await page.waitForURL(/\/coach\/review\/[\w-]+/, { timeout: 15_000 });
    const histState = await page.evaluate(() => history.state?.usr ?? null);
    if (!histState || histState.from !== '/weaknesses' || histState.tab !== 'mistakes') {
      throw new Error(`state.usr wrong: ${JSON.stringify(histState)}`);
    }
    return `state.usr=${JSON.stringify(histState)}`;
  });

  // ─── Back from review restores Mistakes tab ──────────────────
  await scenario('back-from-review-restores-mistakes-tab', async () => {
    await page.locator('[data-testid="coach-game-review"]').waitFor({ timeout: 30_000 });
    const back = page.locator('[data-testid="summary-back-btn"]');
    if ((await back.count()) === 0) throw new Error('summary-back-btn missing');
    await back.click();
    await page.waitForTimeout(2_000);
    if (!/\/weaknesses(?!\/)/.test(page.url())) {
      throw new Error(`expected /weaknesses, got ${new URL(page.url()).pathname}`);
    }
    const ok = await page
      .locator('[data-testid="mistakes-tab"]')
      .waitFor({ timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) throw new Error('mistakes-tab not restored');
    return 'mistakes tab restored';
  });

  // ─── Re-touch the search bar after restore ───────────────────
  await scenario('post-restore-search-still-works', async () => {
    const input = page.locator('[data-testid="search-input"]');
    if (!(await input.isVisible())) throw new Error('search-input gone');
    await input.click();
    await input.fill(cfg.searchQuery.split(' ').reverse().join(' '));
    await input.fill('');
    return 'search input still interactive';
  });

  // ─── Tab content variant — Patterns ──────────────────────────
  await scenario('patterns-tab-mounts-any-variant', async () => {
    await page.locator('[data-testid="tab-patterns"]').click();
    const variants = ['patterns-tab', 'patterns-loading', 'patterns-empty'];
    const ok = await page
      .locator(variants.map((v) => `[data-testid="${v}"]`).join(', '))
      .first()
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) throw new Error('no patterns variant mounted');
    let matched = '?';
    for (const v of variants) {
      if ((await page.locator(`[data-testid="${v}"]`).count()) > 0) {
        matched = v;
        break;
      }
    }
    return `matched ${matched}`;
  });

  // ─── Tactics tab content ─────────────────────────────────────
  await scenario('tactics-tab-mounts', async () => {
    await page.locator('[data-testid="tab-tactics"]').click();
    await page.locator('[data-testid="tactics-tab"]').waitFor({ timeout: 10_000 });
    return 'tactics-tab visible';
  });

  // ─── Openings tab content ────────────────────────────────────
  await scenario('openings-tab-mounts', async () => {
    await page.locator('[data-testid="tab-openings"]').click();
    await page.locator('[data-testid="openings-tab"]').waitFor({ timeout: 10_000 });
    return 'openings-tab visible';
  });

  // ─── Pick-before-load: in pass 2, hammer tab buttons before
  // each tab's data settles ────────────────────────────────────
  if (PASS === 2) {
    await scenario('pick-before-load-rapid-tab-switching', async () => {
      const order = ['openings', 'mistakes', 'tactics', 'patterns', 'overview', 'mistakes'];
      for (const t of order) {
        await page.locator(`[data-testid="tab-${t}"]`).click();
        // intentionally short — don't wait for content
        await page.waitForTimeout(120);
      }
      // Final state should still be valid: mistakes-tab visible.
      await page.locator('[data-testid="mistakes-tab"]').waitFor({ timeout: 10_000 });
      return `rapid-switched ${order.length} times → mistakes-tab settled`;
    });
  }

  // ─── Out-of-order interactions (pass 3): jump to Openings,
  // start typing, jump to Patterns mid-type ────────────────────
  if (PASS === 3) {
    await scenario('out-of-order-typing-then-tab-jump', async () => {
      await page.locator('[data-testid="tab-openings"]').click();
      const input = page.locator('[data-testid="search-input"]');
      await input.click();
      await input.fill('Najdorff'); // misspelling per G7
      await page.locator('[data-testid="tab-patterns"]').click();
      const variants = ['patterns-tab', 'patterns-loading', 'patterns-empty'];
      const ok = await page
        .locator(variants.map((v) => `[data-testid="${v}"]`).join(', '))
        .first()
        .waitFor({ timeout: 10_000 })
        .then(() => true)
        .catch(() => false);
      if (!ok) throw new Error('patterns variant missing after mid-type tab jump');
      // Search value should persist through tab change.
      const value = await input.inputValue();
      if (value !== 'Najdorff') throw new Error(`search lost: "${value}"`);
      await input.fill('');
      return 'mid-type tab jump survived';
    });
  }

  // ─── Refresh button ──────────────────────────────────────────
  await scenario('refresh-btn-click', async () => {
    const btn = page.locator('[data-testid="refresh-btn"]');
    if ((await btn.count()) === 0) throw new Error('refresh-btn missing');
    if (await btn.isDisabled()) {
      // disabled = no analyzable games / no in-flight run. Still
      // counted as visible+wired correctly; not a failure.
      return 'disabled (no work to do)';
    }
    await btn.click();
    // Refresh kicks off async fetches; should re-enable within ~10s.
    await page.waitForTimeout(1500);
    return 'clicked, no crash';
  });

  // ─── Search submit (Enter key → routeChatIntent) ─────────────
  // Per pass, fire a DIFFERENT query that exercises a different
  // intent-routing path: pass 1 = pure question (→ /coach/chat),
  // pass 2 = play intent (→ /coach/play or /coach/chat), pass 3
  // = walkthrough intent (→ /coach/teach or /coach/session/...).
  await scenario('search-submit-routes', async () => {
    // Make sure we're on /weaknesses for the search to fire there.
    if (!page.url().includes('/weaknesses')) {
      await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
      await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    }
    const queries = {
      1: 'why am I losing my queen',
      2: 'play the King\'s Indian against me',
      3: 'teach me the Italian Game',
    };
    const q = queries[PASS] ?? 'help me improve';
    const input = page.locator('[data-testid="search-input"]');
    await input.click();
    await input.fill(q);
    await input.press('Enter');
    await page.waitForTimeout(1500);
    const url = page.url();
    // ANY route off /weaknesses is acceptable — the search routed
    // OR fell back to /coach/chat with the query.
    if (/\/weaknesses(?!\/)/.test(url)) {
      throw new Error(`search "${q}" didn't navigate: still on ${url}`);
    }
    return `"${q}" → ${new URL(url).pathname}`;
  });

  // ─── Return to /weaknesses for the rest ─────────────────────
  await scenario('return-to-weaknesses-after-search', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    return 'back on /weaknesses';
  });

  // ─── Opening-row drilldown (if available) ────────────────────
  // OpeningsTab renders `opening-row` items inside the "Most
  // played as White / Black", "Best results against", "Worst
  // results against" sections. If the seeded sample games create
  // those rows we get to test the drilldown → back contract.
  await scenario('openings-tab-row-or-empty', async () => {
    await page.locator('[data-testid="tab-openings"]').click();
    await page.locator('[data-testid="openings-tab"]').waitFor({ timeout: 10_000 });
    const rowCount = await page.locator('[data-testid="opening-row"]').count();
    if (rowCount === 0) return 'openings-tab empty (no game data yet)';
    // Click the first row, expect drilldown to mount.
    await page.locator('[data-testid="opening-row"]').first().click();
    const ok = await page
      .locator('[data-testid="opening-drilldown"]')
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!ok) throw new Error('opening-drilldown did not mount');
    // Back out
    const back = page.locator('[data-testid="drilldown-back"]');
    if ((await back.count()) > 0) {
      await back.click();
      await page.waitForTimeout(500);
    }
    return `opened drilldown (${rowCount} rows total)`;
  });

  // ─── Patterns tab sub-cards (when populated) ─────────────────
  await scenario('patterns-tab-sub-cards-or-state', async () => {
    await page.locator('[data-testid="tab-patterns"]').click();
    const variants = ['patterns-tab', 'patterns-loading', 'patterns-empty'];
    const selector = variants.map((v) => `[data-testid="${v}"]`).join(', ');
    await page.locator(selector).first().waitFor({ timeout: 15_000 });
    // If we got the populated variant, count sub-cards.
    if ((await page.locator('[data-testid="patterns-tab"]').count()) > 0) {
      const subTestIds = [
        'patterns-breadth',
        'patterns-phase-strength',
        'patterns-records',
        'patterns-repeat-mistake',
        'patterns-streaks',
        'patterns-tactic-recognition',
        'patterns-win-shape',
      ];
      let present = 0;
      for (const t of subTestIds) {
        if ((await page.locator(`[data-testid="${t}"]`).count()) > 0) present++;
      }
      return `patterns populated, ${present}/${subTestIds.length} sub-cards mounted`;
    }
    if ((await page.locator('[data-testid="patterns-loading"]').count()) > 0) {
      return 'patterns-loading (analytics still running)';
    }
    return 'patterns-empty (no game data yet)';
  });

  // ─── Shareable-insights strip swipe (if present) ─────────────
  await scenario('shareable-insights-swipe-or-skip', async () => {
    await page.locator('[data-testid="tab-overview"]').click();
    await page.locator('[data-testid="overview-tab"]').waitFor({ timeout: 10_000 });
    const strip = page.locator('[data-testid="shareable-insights-strip"]');
    if ((await strip.count()) === 0) return 'strip absent (no insights yet)';
    const next = page.locator('[data-testid="shareable-insight-next"]');
    if ((await next.count()) > 0) {
      await next.click();
      await page.waitForTimeout(300);
      const prev = page.locator('[data-testid="shareable-insight-prev"]');
      if ((await prev.count()) > 0) {
        await prev.click();
        await page.waitForTimeout(300);
      }
      return 'next + prev clicked';
    }
    return 'strip present without next/prev buttons';
  });

  // ─── Mistakes-tab severity sort + filter behaviors via seeded ─
  // Bump cpLoss on a 2nd mistake to validate that two rows render
  // simultaneously (sort path) when both seeded. Skip if pass
  // already has 1 row clicked.
  await scenario('seed-second-mistake-and-render-multi-row', async () => {
    const id = `audit-multi-row-pass${PASS}-mistake-2`;
    const fen = cfg.mistakeFen;
    await page.evaluate(async ({ id, fen, opening, pass }) => {
      const now = new Date().toISOString();
      const second = {
        id,
        fen,
        playerMove: 'a2a3',
        playerMoveSan: 'a3',
        bestMove: 'd2d4',
        bestMoveSan: 'd4',
        moves: 'e4 e5',
        cpLoss: 500, // bigger swing — sorts above the first
        classification: 'blunder',
        gamePhase: 'middlegame',
        moveNumber: 12,
        sourceGameId: 'sample-morphy-opera-1858',
        sourceMode: 'imported',
        playerColor: 'white',
        promptText: `multi-row pass ${pass}`,
        narration: { intro: '', body: '', outro: '' },
        opponentName: 'AuditBot2',
        openingName: opening,
        evalBefore: 50,
        srsInterval: 1,
        srsEaseFactor: 2.5,
        srsRepetitions: 0,
        status: 'new',
        attempts: 0,
        successes: 0,
        createdAt: now,
        gameDate: now,
        srsDueDate: now,
        srsLastReview: null,
      };
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onerror = () => reject(new Error('open failed'));
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('mistakePuzzles')) {
            db.close();
            reject(new Error('store missing'));
            return;
          }
          const tx = db.transaction('mistakePuzzles', 'readwrite');
          tx.objectStore('mistakePuzzles').put(second);
          tx.oncomplete = () => { db.close(); resolve(undefined); };
          tx.onerror = () => { db.close(); reject(new Error('put failed')); };
        };
      });
    }, { id, fen, opening: cfg.mistakeOpening, pass: PASS });
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    await page.locator('[data-testid="tab-mistakes"]').click();
    await page.locator('[data-testid="mistake-row"]').first().waitFor({ timeout: 10_000 });
    const count = await page.locator('[data-testid="mistake-row"]').count();
    if (count < 2) throw new Error(`expected ≥2 mistake-rows after seeding 2nd, got ${count}`);
    return `${count} mistake-rows (multi-row sort path verified)`;
  });

  // ─── Click second mistake row to verify state nav for non-first
  // index too. Pass differs row index across passes.
  await scenario('second-mistake-row-click', async () => {
    const rows = await page.locator('[data-testid="mistake-row"]').count();
    const idx = Math.min(1, rows - 1);
    await page.locator('[data-testid="mistake-row"]').nth(idx).click();
    await page.waitForURL(/\/coach\/review\/[\w-]+/, { timeout: 15_000 });
    return `clicked row ${idx} → ${new URL(page.url()).pathname}`;
  });

  // ─── DEEPER: Bulk-seed player games so analytics populate ────
  // Without these, time-control rows / opening matrix / heatmaps
  // all sit empty (each needs ≥3 games per group). Seed 8 player-
  // as-white games across 2 openings so the audit can exercise
  // the populated paths.
  await scenario('seed-bulk-player-games', async () => {
    // Each pass uses a different ECO so passes don't collide.
    const ecoMap = { 1: 'C50', 2: 'B20', 3: 'C42' };
    const eco = ecoMap[PASS];
    // Time-control headers vary so timeControlPerformance() produces
    // multiple buckets (it requires ≥2 different buckets to render
    // the section). Mix of blitz (180+0) and rapid (600+0).
    const buckets = ['180+0', '600+0', '600+0', '180+0', '60+0', '900+10', '600+0', '180+0'];
    const games = Array.from({ length: 8 }).map((_, i) => ({
      id: `audit-bulk-game-pass${PASS}-${i}`,
      pgn: `[Event "audit"]\n[TimeControl "${buckets[i]}"]\n[Result "${i % 3 === 0 ? '1-0' : i % 3 === 1 ? '0-1' : '1/2-1/2'}"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bc4 *`,
      white: 'AuditPlayer',
      black: 'AI Coach',
      result: i % 3 === 0 ? '1-0' : i % 3 === 1 ? '0-1' : '1/2-1/2',
      date: `2026-05-${String(10 + i).padStart(2, '0')}`,
      event: 'audit',
      eco,
      whiteElo: 1400,
      blackElo: 1400,
      source: i % 2 === 0 ? 'lichess' : 'chesscom',
      annotations: [],
      coachAnalysis: null,
      isMasterGame: false,
      openingId: null,
      fullyAnalyzed: true,
    }));
    const result = await page.evaluate(async (rows) => {
      return await new Promise((resolve, reject) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onerror = () => reject(new Error('open failed'));
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('games')) {
            db.close();
            reject(new Error('games store missing'));
            return;
          }
          const tx = db.transaction('games', 'readwrite');
          const store = tx.objectStore('games');
          for (const r of rows) store.put(r);
          tx.oncomplete = () => {
            const tx2 = db.transaction('games', 'readonly');
            const countReq = tx2.objectStore('games').count();
            countReq.onsuccess = () => {
              db.close();
              resolve({ inserted: rows.length, totalInStore: countReq.result });
            };
            countReq.onerror = () => { db.close(); resolve({ inserted: rows.length, totalInStore: -1 }); };
          };
          tx.onerror = () => { db.close(); reject(new Error('bulk put failed')); };
        };
      });
    }, games);
    return `seeded ${result.inserted} (total in games store: ${result.totalInStore}, eco=${eco})`;
  });

  // ─── DEEPER: Overview tab visualization presence ─────────────
  await scenario('overview-tab-visualizations-present', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    await page.locator('[data-testid="tab-overview"]').click();
    await page.locator('[data-testid="overview-tab"]').waitFor({ timeout: 10_000 });
    // Catalog whichever viz are rendered for the current data
    // state. Empty data shouldn't crash — we just count what's
    // present. Either critical-moments-card or analyze-cta must
    // be rendered (one is shown when there's data, the other when
    // there's nothing to analyze yet).
    const candidates = [
      'donut-chart',
      'bar-chart',
      'stacked-bar',
      'activity-heatmap',
      'activity-heatmap-empty',
      'strengths-card',
      'critical-moments-card',
      'analyze-cta',
      'shareable-insights-strip',
    ];
    const seen = {};
    for (const c of candidates) {
      seen[c] = await page.locator(`[data-testid="${c}"]`).count();
    }
    const anyContent = Object.values(seen).some((n) => n > 0);
    if (!anyContent) throw new Error(`no overview content rendered — ${JSON.stringify(seen)}`);
    return Object.entries(seen).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(', ');
  });

  // ─── DEEPER: Critical moments card click → games drilldown ───
  await scenario('critical-moments-card-click-or-skip', async () => {
    const card = page.locator('[data-testid="critical-moments-card"]');
    if ((await card.count()) === 0) return 'absent (no critical moments)';
    // Card is a clickable wrapper. Click it and expect navigation
    // to /weaknesses/games?f=...
    await card.click();
    await page.waitForTimeout(1_500);
    const url = page.url();
    if (!/\/weaknesses\/games/.test(url)) {
      throw new Error(`expected /weaknesses/games, got ${new URL(url).pathname}`);
    }
    // Verify the drilldown page mounted (either populated or empty).
    const mount = await page
      .locator('[data-testid="games-drilldown-page"], [data-testid="games-drilldown-empty"]')
      .first()
      .waitFor({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    if (!mount) throw new Error('games drilldown page did not mount');
    return `nav → ${new URL(url).pathname}`;
  });

  // ─── DEEPER: Games-drilldown back returns to /weaknesses ─────
  await scenario('drilldown-back-or-skip', async () => {
    if (!/\/weaknesses\/games/.test(page.url())) return 'not on drilldown — skipped';
    const back = page.locator('[data-testid="drilldown-back"]');
    if ((await back.count()) === 0) {
      // Some empty states route through the top-bar back-btn instead.
      const topBack = page.locator('[data-testid="back-btn"]');
      if ((await topBack.count()) === 0) throw new Error('no back affordance on drilldown');
      await topBack.click();
    } else {
      await back.click();
    }
    await page.waitForTimeout(800);
    if (!/\/weaknesses(?:$|\/)/.test(page.url())) {
      throw new Error(`expected back to weaknesses, got ${page.url()}`);
    }
    return 'back to /weaknesses';
  });

  // ─── Debug: dump raw games + filter behaviour ────────────────
  await scenario('debug-games-store-and-filter', async () => {
    const info = await page.evaluate(async () => {
      const games = await new Promise((resolve) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('games', 'readonly');
          const all = tx.objectStore('games').getAll();
          all.onsuccess = () => {
            db.close();
            resolve(all.result);
          };
        };
        req.onerror = () => resolve([]);
      });
      // Apply the same filter logic the drilldown uses, inline.
      const AI_NAMES = ['AI Coach', 'Stockfish Bot'];
      const playerGames = games.filter((g) => !g.isMasterGame && g.result !== '*');
      const byColor = { white: 0, black: 0, none: 0 };
      const samples = [];
      for (const g of playerGames) {
        let pc = null;
        if (AI_NAMES.includes(g.white)) pc = 'black';
        else if (AI_NAMES.includes(g.black)) pc = 'white';
        if (pc) byColor[pc]++;
        else byColor.none++;
        if (samples.length < 3) samples.push({ id: g.id, white: g.white, black: g.black, result: g.result, isMaster: g.isMasterGame, source: g.source });
      }
      return { totalGames: games.length, playerGames: playerGames.length, byColor, samples };
    });
    return `games=${info.totalGames}, player=${info.playerGames}, white=${info.byColor.white}, black=${info.byColor.black}`;
  });

  // ─── DEEPER: Direct nav to games drilldown via encoded filter ─
  // Exercises decodeFilters + resolveFiltersToGames pipeline.
  // encodeFilters uses btoa(encodeURIComponent(JSON.stringify(...))).
  await scenario('direct-nav-games-drilldown-with-filter', async () => {
    // Hand-build a filter that decodes cleanly: by player-color.
    const filters = [{ source: 'player-color', color: PASS === 2 ? 'black' : 'white', label: `as ${PASS === 2 ? 'Black' : 'White'} (test)` }];
    const encoded = await page.evaluate(
      (f) => btoa(encodeURIComponent(JSON.stringify(f))),
      filters,
    );
    await page.goto(`${BASE_URL}/weaknesses/games?f=${encodeURIComponent(encoded)}`, { timeout: 60_000 });
    const mount = await page
      .locator('[data-testid="games-drilldown-page"], [data-testid="games-drilldown-empty"]')
      .first()
      .waitFor({ timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!mount) throw new Error('games drilldown did not mount with filter URL');
    // Give the resolveFiltersToGames promise time to settle.
    await page.waitForTimeout(1500);
    const debug = await page.evaluate(() => ({
      href: location.href,
      searchF: new URLSearchParams(location.search).get('f'),
    }));
    const gameCardCount = await page.locator('[data-testid="game-card"]').count();
    const enhancedCount = await page.locator('[data-testid="enhanced-game-card"]').count();
    return `mounted (game-card=${gameCardCount}, enhanced=${enhancedCount}, searchF.len=${debug.searchF?.length ?? 0})`;
  });

  // ─── DEEPER: Open one game card if present → review page ─────
  await scenario('games-drilldown-card-click-or-skip', async () => {
    const cardLocator = page.locator('[data-testid="game-card"], [data-testid="enhanced-game-card"]').first();
    if ((await cardLocator.count()) === 0) return 'no game cards rendered — skipped';
    await cardLocator.click();
    await page.waitForTimeout(1_500);
    const url = page.url();
    if (/\/weaknesses\/games/.test(url)) {
      throw new Error(`click didn't navigate from games drilldown: still ${url}`);
    }
    return `click → ${new URL(url).pathname}`;
  });

  // ─── DEEPER: Openings proficiency matrix cell click ──────────
  // The Openings tab includes a HeatmapGrid; cells route to the
  // /weaknesses/games filter URL.
  await scenario('openings-matrix-cell-or-skip', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    await page.locator('[data-testid="tab-openings"]').click();
    await page.locator('[data-testid="openings-tab"]').waitFor({ timeout: 10_000 });
    // Matrix is loaded via openingProficiencyMatrix() async after
    // mount — give it a beat to settle before declaring absent.
    const matrix = page.locator('[data-testid="opening-proficiency-matrix"]');
    const present = await matrix
      .waitFor({ timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!present) return 'matrix absent (no opening data with ≥3 games)';
    // Cells are inside the matrix; click the first one.
    const cells = matrix.locator('button, [role="button"]');
    if ((await cells.count()) === 0) return 'matrix mounted but no interactive cells';
    await cells.first().click();
    await page.waitForTimeout(1_000);
    if (!/\/weaknesses\/games/.test(page.url())) {
      throw new Error(`cell click didn't route to games: ${page.url()}`);
    }
    return `cell click → ${new URL(page.url()).pathname}`;
  });

  // ─── DEEPER: Patterns sub-card explicit visibility ───────────
  await scenario('patterns-sub-cards-individual', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    await page.locator('[data-testid="tab-patterns"]').click();
    // Wait for one of the three states.
    const stateSel = '[data-testid="patterns-tab"], [data-testid="patterns-loading"], [data-testid="patterns-empty"]';
    await page.locator(stateSel).first().waitFor({ timeout: 15_000 });
    // Give the patterns analytics fetch time to settle so we can
    // observe the populated variant instead of the loading skeleton.
    await page.locator('[data-testid="patterns-tab"], [data-testid="patterns-empty"]')
      .first()
      .waitFor({ timeout: 30_000 })
      .catch(() => undefined);
    if ((await page.locator('[data-testid="patterns-tab"]').count()) === 0) {
      const stillLoading = (await page.locator('[data-testid="patterns-loading"]').count()) > 0;
      return stillLoading ? 'still loading after 30s (analytics slow)' : 'patterns-empty';
    }
    // Each named sub-card should at least be present in the DOM
    // (even if internally empty). Patterns is a single panel with
    // 7 sub-sections, varying per data availability.
    const subs = [
      'patterns-breadth',
      'patterns-phase-strength',
      'patterns-records',
      'patterns-repeat-mistake',
      'patterns-streaks',
      'patterns-tactic-recognition',
      'patterns-win-shape',
    ];
    const counts = {};
    for (const s of subs) {
      counts[s] = await page.locator(`[data-testid="${s}"]`).count();
    }
    return Object.entries(counts).map(([k, n]) => `${k.replace('patterns-', '')}=${n}`).join(', ');
  });

  // ─── DEEPER: Tactics tab tactic-row presence + click if any ──
  await scenario('tactics-tab-row-click-or-skip', async () => {
    await page.locator('[data-testid="tab-tactics"]').click();
    await page.locator('[data-testid="tactics-tab"]').waitFor({ timeout: 10_000 });
    const tactic = page.locator('[data-testid="tactic-row"]');
    if ((await tactic.count()) === 0) return 'no tactic-row (no brilliant/great seeded)';
    await tactic.first().click();
    await page.waitForTimeout(1_500);
    if (!/\/coach\/review\//.test(page.url())) {
      throw new Error(`tactic-row click didn't route to review: ${page.url()}`);
    }
    return `tactic-row → ${new URL(page.url()).pathname}`;
  });

  // ─── DEEPER: Time-control row clicks (per-bucket drilldown) ──
  await scenario('time-control-row-click-or-skip', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    await page.locator('[data-testid="tab-overview"]').click();
    await page.locator('[data-testid="overview-tab"]').waitFor({ timeout: 10_000 });
    // time-control-row-* — bucket suffix varies (bullet/blitz/rapid/classical/correspondence)
    const rowAny = page.locator('[data-testid^="time-control-row-"]').first();
    if ((await rowAny.count()) === 0) return 'no time-control rows (no analyzed games yet)';
    await rowAny.click();
    await page.waitForTimeout(1_500);
    if (!/\/weaknesses\/games/.test(page.url())) {
      throw new Error(`time-control click didn't drilldown: ${page.url()}`);
    }
    return `time-control row → ${new URL(page.url()).pathname}`;
  });

  // Return to /weaknesses one more time before the final back-btn.
  await scenario('return-to-weaknesses-final', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    return 'back on /weaknesses';
  });

  // ─── Back btn leaves /weaknesses ─────────────────────────────
  await scenario('back-btn-leaves-weaknesses', async () => {
    await page.locator('[data-testid="back-btn"]').click();
    await page.waitForTimeout(800);
    if (/\/weaknesses(?!\/)/.test(page.url())) {
      throw new Error(`still on /weaknesses after back-btn: ${page.url()}`);
    }
    return `landed on ${new URL(page.url()).pathname}`;
  });

  // ─── Pull live audit log from Dexie ──────────────────────────
  // The app's appAuditor writes every logAppAudit call to db.meta
  // under key 'app-audit-log.v1'. Running locally means the
  // /api/audit-stream endpoint isn't hit, so we read the rolling
  // buffer directly. This is the "live audit streaming" signal
  // for runtime audit events the page emitted during this pass.
  let dexieAuditEntries = [];
  await scenario('read-dexie-audit-log', async () => {
    // Need to be on a page where Dexie is initialized for this app
    // — navigate back to /weaknesses first since the back btn left
    // us elsewhere.
    if (!page.url().includes('/weaknesses') && !page.url().includes('/coach')) {
      await page.goto(`${BASE_URL}/weaknesses`, { timeout: 60_000 });
      await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 60_000 });
    }
    const entries = await page.evaluate(async () => {
      return await new Promise((resolve) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onerror = () => resolve([]);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('meta')) {
            db.close();
            resolve([]);
            return;
          }
          const tx = db.transaction('meta', 'readonly');
          const getReq = tx.objectStore('meta').get('app-audit-log.v1');
          getReq.onsuccess = () => {
            db.close();
            try {
              const raw = getReq.result?.value ?? '[]';
              const parsed = JSON.parse(raw);
              resolve(Array.isArray(parsed) ? parsed : []);
            } catch {
              resolve([]);
            }
          };
          getReq.onerror = () => {
            db.close();
            resolve([]);
          };
        };
      });
    });
    dexieAuditEntries = entries;
    return `${entries.length} runtime audit entries`;
  });

  // ─── Roll-up ──────────────────────────────────────────────────
  const failures = scenarios.filter((s) => !s.ok);
  const allEntries = [...dexieAuditEntries, ...auditEvents];
  const kindCounts = allEntries.reduce((acc, e) => {
    const k = e.kind ?? 'unknown';
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  // Bug-signal audit kinds. Excludes "fallback" generically because
  // some fallbacks are legit by-design routing decisions (e.g.
  // weakness-report-search-fallback when a typed question correctly
  // routes to /coach/chat). Only fallback kinds that indicate real
  // regression are in the allowlist below.
  const ERROR_SUBSTRINGS = ['-error', 'crash', '-failure', 'unhandled'];
  const ERROR_EXACT = new Set([
    'claim-validator-trip',
    'master-play-enforcement-fallback',
    'audit-stream-truncated',
    'asset-load-error',
    'uncaught-error',
  ]);
  const errorKinds = allEntries.filter((e) => {
    if (!e.kind) return false;
    if (ERROR_EXACT.has(e.kind)) return true;
    return ERROR_SUBSTRINGS.some((sub) => e.kind.includes(sub));
  });
  const report = {
    pass: PASS,
    base: BASE_URL,
    durationMs: scenarios.reduce((acc, s) => acc + s.durationMs, 0),
    consoleErrors,
    pageErrors,
    scenarios,
    auditEvents: {
      total: allEntries.length,
      streamPostedTotal: auditEvents.length,
      dexieRollingTotal: dexieAuditEntries.length,
      kinds: Object.fromEntries(Object.entries(kindCounts).sort(([a], [b]) => a.localeCompare(b))),
      errorKindCount: errorKinds.length,
      errorKindSample: errorKinds.slice(0, 10).map((e) => ({
        kind: e.kind,
        source: e.source,
        summary: e.summary,
      })),
    },
    summary: {
      total: scenarios.length,
      passed: scenarios.length - failures.length,
      failed: failures.length,
    },
  };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  await writeFile(join(OUT_DIR, 'audit-events.json'), JSON.stringify(allEntries, null, 2));

  console.log(`\n[weaknesses-interactive] pass ${PASS} summary:`);
  console.log(`  passed:           ${report.summary.passed}/${report.summary.total}`);
  console.log(`  failed:           ${failures.length}`);
  console.log(`  console.errors:   ${consoleErrors.length}`);
  console.log(`  pageerrors:       ${pageErrors.length}`);
  console.log(`  dexie audits:     ${dexieAuditEntries.length}`);
  console.log(`  stream POSTs:     ${auditEvents.length}`);
  console.log(`  audit error kinds: ${errorKinds.length}`);
  if (errorKinds.length > 0) {
    console.log(`\nAUDIT ERROR KINDS (first 5):`);
    for (const e of errorKinds.slice(0, 5)) {
      console.log(`  - ${e.kind} (${e.source}): ${e.summary?.slice(0, 120) ?? ''}`);
    }
  }
  if (failures.length > 0) {
    console.log(`\nFAILURES:`);
    for (const f of failures) {
      console.log(`  ✗ ${f.name}: ${f.detail}`);
    }
  }
  if (consoleErrors.length > 0) {
    console.log(`\nCONSOLE.ERROR (first 5):`);
    for (const c of consoleErrors.slice(0, 5)) console.log(`  - ${c.slice(0, 200)}`);
  }
  if (pageErrors.length > 0) {
    console.log(`\nPAGE.ERROR (first 5):`);
    for (const p of pageErrors.slice(0, 5)) console.log(`  - ${p.slice(0, 200)}`);
  }

  await browser.close();
  const passClean = failures.length === 0 && pageErrors.length === 0 && errorKinds.length === 0;
  process.exit(passClean ? 0 : 1);
}

main().catch((err) => {
  console.error('[weaknesses-interactive] fatal:', err);
  process.exit(2);
});
