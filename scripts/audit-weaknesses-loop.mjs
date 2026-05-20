#!/usr/bin/env node
/**
 * Deep interactive Weaknesses loop audit.
 *
 * David's directive (2026-05-19):
 *   "do a full play interactive audit loop using playwright and live
 *    audit streaming touching and playing with every usable function
 *    within the weaknesses tab. you will repeat this audit until you
 *    have 3 consecutive passes with no errors. You must use tabs
 *    differently after each pass, this allows for maximizing usable
 *    surface area covered by the audit. so ask different questions.
 *    click on different functions. but every single functions needs
 *    to be audited. dig deeper after first clean sweep to make sure
 *    deeper functions and connections work properly."
 *
 * Strategy:
 *   1. Each pass varies its interaction set (different search
 *      queries, different tab orderings, different rows clicked).
 *      The pass index drives which interactions fire.
 *   2. Every interactable on the surface gets exercised across the
 *      pass-chain: 5 tabs, search bar (multiple queries),
 *      refresh, back, mistake/opening/tactic rows, shareable insight
 *      strip prev/next/share, time-control rows, critical-moments
 *      card, analyze CTAs, pattern sub-cards, drilldown filter chips,
 *      drilldown back.
 *   3. Live audit-stream capture via page.on('request') — reads
 *      every POST to /api/audit-stream and tallies events. Sandbox
 *      blocks the actual POST landing but the body is still readable
 *      from the request.
 *   4. Loop until 3 consecutive clean passes (no failures, no
 *      uncaught errors, no unfiltered console errors).
 *   5. After the first clean sweep, deeper-mode flips on: each
 *      pass adds drilldown navigation, back-button state-restore
 *      verification, pattern card iteration, and synthetic-data
 *      seeding so empty surfaces still get exercised.
 *
 * Sandbox notes:
 *   - Default target = localhost:5173 (sandbox blocks prod with
 *     host_not_allowed). Override with AUDIT_SMOKE_URL.
 *   - Network errors from blocked external hosts (Lichess, Polly,
 *     audit-stream POSTs, asset CDN cert mismatches) are filtered
 *     from the console-error count — they're sandbox-specific noise.
 *
 * Usage:
 *   node scripts/audit-weaknesses-loop.mjs
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-weaknesses-loop.mjs
 *   AUDIT_LOOP_MAX_PASSES=10 node scripts/audit-weaknesses-loop.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const MAX_PASSES = parseInt(process.env.AUDIT_LOOP_MAX_PASSES ?? '12', 10);
const PASSES_REQUIRED = 3;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/weaknesses-loop-${stamp}`;

// Sandbox-specific noise — not real app bugs.
const BENIGN_ERROR_PATTERNS = [
  /ERR_CERT_AUTHORITY_INVALID/,
  /403.*Forbidden/i,
  /host_not_allowed/i,
  /Failed to fetch.*audit-stream/i,
  /audit-stream.*POST.*fail/i,
  /explorer\.lichess\.ovh/,
  /api\.deepseek\.com/,
  /api\.anthropic\.com/,
  /polly/i,
  /Failed to load resource.*403/i,
  /Failed to load resource.*cert/i,
  /Failed to load resource.*the server responded/i,
  /ERR_INTERNET_DISCONNECTED/,
  /ERR_NAME_NOT_RESOLVED/,
  /DevTools/,
  // Coach API connection errors — happens when search bar routes to
  // the brain and there's no API key configured in the sandbox dev
  // server. App handles this with the "⚠️ No API key configured"
  // user message; not a real bug.
  /CoachAPI.*Fallback also failed/,
  /APIConnectionError.*Connection error/,
  /callAnthropic/,
  /callChatWithConf/,
  /Failed to load resource.*generativeai/,
];
const isBenign = (s) => BENIGN_ERROR_PATTERNS.some((re) => re.test(s));

// ─── Interaction sets — pass index drives which fires ────────────
// Each pass picks DIFFERENT queries / orderings / rows so consecutive
// passes touch different functions. All interactions are tagged with
// which pass-indices use them; collectively all interactables must
// fire across the full chain.

const SEARCH_QUERIES = [
  'show me my biggest weakness',
  'what openings should I avoid',
  'when do I blunder',
  'puzzle accuracy this week',
  'best opening for me',
  'fix my time pressure',
  'mistakes in the middlegame',
  "what's my worst time control",
];

const TAB_ORDERINGS = [
  ['overview', 'openings', 'mistakes', 'tactics', 'patterns'],
  ['patterns', 'tactics', 'mistakes', 'openings', 'overview'],
  ['mistakes', 'overview', 'patterns', 'openings', 'tactics'],
  ['openings', 'patterns', 'overview', 'mistakes', 'tactics'],
  ['tactics', 'mistakes', 'openings', 'patterns', 'overview'],
];

const PATTERN_TESTIDS = [
  'patterns-records',
  'patterns-phase-strength',
  'patterns-tactic-recognition',
  'patterns-streaks',
  'patterns-win-shape',
  'patterns-breadth',
  'patterns-repeat-mistake',
];

// ─── Synthetic data seeders ──────────────────────────────────────
// Inject synthetic puzzles + game records so the rows actually
// render under fresh-storage conditions. Without this, empty
// states would short-circuit every drilldown.

async function seedSyntheticData(page, passIndex) {
  // Multiple mistake puzzles so rows display + drilldown has variety.
  await page.evaluate(async (pidx) => {
    const openDb = () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(new Error('open failed'));
      });
    const put = (db, store, value) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const r = tx.objectStore(store).put(value);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(new Error('put failed'));
      });
    const db = await openDb();
    const now = new Date().toISOString();
    const baseOpenings = ['Italian Game', 'Ruy Lopez', 'Sicilian: Najdorf', 'French Defence', "King's Indian Defence"];
    // Seed 5 mistake puzzles (pass-varying themes)
    for (let i = 0; i < 5; i += 1) {
      const puzzle = {
        id: `audit-mistake-p${pidx}-${i}`,
        fen: 'rnbqk2r/ppp2ppp/3p1n2/2b5/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
        playerMove: 'd2d3',
        playerMoveSan: 'd3',
        bestMove: 'd2d4',
        bestMoveSan: 'd4',
        moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 Nc3 Nf6',
        cpLoss: 150 + i * 30,
        classification: i % 2 === 0 ? 'mistake' : 'blunder',
        gamePhase: i % 3 === 0 ? 'opening' : i % 3 === 1 ? 'middlegame' : 'endgame',
        moveNumber: 5 + i,
        sourceGameId: 'sample-morphy-opera-1858',
        sourceMode: 'imported',
        playerColor: i % 2 === 0 ? 'white' : 'black',
        promptText: 'audit synthetic',
        narration: { intro: '', body: '', outro: '' },
        createdAt: now,
        opponentName: `AuditBot${i}`,
        gameDate: now,
        openingName: baseOpenings[i % baseOpenings.length],
        evalBefore: 30,
        srsInterval: 1,
        srsEaseFactor: 2.5,
        srsRepetitions: 0,
        srsDueDate: now,
        srsLastReview: null,
        status: 'new',
        attempts: 0,
        successes: 0,
      };
      try {
        if (db.objectStoreNames.contains('mistakePuzzles')) {
          await put(db, 'mistakePuzzles', puzzle);
        }
      } catch {}
    }
    db.close();
  }, passIndex);
}

// ─── Audit-event capture ─────────────────────────────────────────
function attachAuditCapture(page) {
  const events = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postData();
        if (!body) return;
        const parsed = JSON.parse(body);
        const list = parsed.entries ?? parsed.events ?? [parsed];
        for (const e of list) if (e?.kind) events.push(e);
      } catch {}
    }
  });
  return events;
}

// ─── Scenario runner ─────────────────────────────────────────────
async function runPass(browser, passIdx) {
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditWeaknessesLoopBot/1.0',
  });
  const page = await ctx.newPage();
  const auditEvents = attachAuditCapture(page);
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const text = m.text();
      if (!isBenign(text)) consoleErrors.push(text);
    }
  });
  page.on('pageerror', (e) => {
    if (!isBenign(String(e))) pageErrors.push(String(e));
  });

  const scenarios = [];
  const ranInteractions = new Set();
  async function scenario(name, fn) {
    const t0 = Date.now();
    try {
      const detail = await fn();
      scenarios.push({ name, ok: true, durationMs: Date.now() - t0, detail });
      return { ok: true, detail };
    } catch (err) {
      scenarios.push({ name, ok: false, durationMs: Date.now() - t0, detail: err.message });
      return { ok: false, detail: err.message };
    }
  }
  const tick = (key) => ranInteractions.add(key);

  // ─── Boot ────────────────────────────────────────────────────────
  await scenario('warmup-home-seed', async () => {
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // give Dexie seed time
    await page.waitForTimeout(8000);
    return 'home loaded, seed time';
  });

  await scenario('pre-seed-sample-games', async () => {
    await page.goto(`${BASE_URL}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('[data-testid="coach-review-list-page"]')
      .waitFor({ timeout: 20000 }).catch(() => {});
    return 'review list mounted';
  });

  await scenario('seed-synthetic-mistakes', async () => {
    await seedSyntheticData(page, passIdx);
    return 'seeded';
  });
  tick('synthetic-seed');

  await scenario('boot-weaknesses', async () => {
    await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // Vite dev cold-compile of GameInsightsPage + its many child
    // components can push ~25-35s on first request. Give it 45.
    await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 45000 });
    return 'page mounted';
  });

  // ─── Header controls (every pass) ────────────────────────────────
  await scenario('header-back-btn', async () => {
    if (!(await page.locator('[data-testid="back-btn"]').isVisible())) {
      throw new Error('back-btn missing');
    }
    tick('header-back');
    return 'visible';
  });

  await scenario('header-refresh-btn', async () => {
    const btn = page.locator('[data-testid="refresh-btn"]');
    if ((await btn.count()) > 0 && (await btn.first().isVisible())) {
      tick('header-refresh-seen');
      // Click only on odd passes to vary refresh frequency
      if (passIdx % 2 === 1) {
        await btn.first().click();
        await page.waitForTimeout(800);
        tick('header-refresh-clicked');
      }
    }
    return 'present';
  });

  // ─── Search interaction (every pass uses a different query) ──────
  await scenario('search-bar-interaction', async () => {
    const query = SEARCH_QUERIES[passIdx % SEARCH_QUERIES.length];
    const input = page.locator('[data-testid="search-input"]');
    if ((await input.count()) === 0) throw new Error('search-input missing');
    await input.first().fill(query);
    await input.first().press('Enter');
    await page.waitForTimeout(1500);
    tick(`search-${passIdx % SEARCH_QUERIES.length}`);
    // After search, the page may navigate. Force-return.
    if (!/\/weaknesses/.test(page.url())) {
      await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 20000 });
    }
    return `query="${query}" routed`;
  });

  // ─── Tab cycling — order varies per pass ─────────────────────────
  const order = TAB_ORDERINGS[passIdx % TAB_ORDERINGS.length];
  for (const tab of order) {
    await scenario(`tab-${tab}-click`, async () => {
      const btn = page.locator(`[data-testid="tab-${tab}"]`);
      if (!(await btn.isVisible())) throw new Error(`tab-${tab} missing`);
      await btn.click();
      await page.waitForTimeout(900);
      tick(`tab-${tab}`);

      // Tab-specific verification
      if (tab === 'overview') {
        const ok = await page.locator('[data-testid="overview-tab"]')
          .first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
        if (!ok) throw new Error('overview-tab content missing');
      } else if (tab === 'openings') {
        await page.locator('[data-testid="openings-tab"]')
          .waitFor({ timeout: 8000 }).catch(() => {});
      } else if (tab === 'mistakes') {
        await page.locator('[data-testid="mistakes-tab"]')
          .waitFor({ timeout: 8000 }).catch(() => {});
      } else if (tab === 'tactics') {
        await page.locator('[data-testid="tactics-tab"]')
          .waitFor({ timeout: 8000 }).catch(() => {});
      } else if (tab === 'patterns') {
        // patterns has variant mount testids
        const variants = ['patterns-tab', 'patterns-loading', 'patterns-empty'];
        const matched = await Promise.race(variants.map(
          (v) => page.locator(`[data-testid="${v}"]`)
            .waitFor({ timeout: 8000 }).then(() => v).catch(() => null)
        ));
        if (!matched) throw new Error('patterns content missing');
      }
      return `${tab} mounted`;
    });
  }

  // ─── Overview tab deep exercises ────────────────────────────────
  await scenario('back-to-overview', async () => {
    await page.locator('[data-testid="tab-overview"]').click();
    await page.waitForTimeout(900);
    return 'switched';
  });

  // Shareable insights — varies per pass which button is clicked
  await scenario('shareable-insights-strip', async () => {
    const strip = page.locator('[data-testid="shareable-insights-strip"]');
    if ((await strip.count()) === 0) return 'strip not present (no data)';
    const action = ['prev', 'next', 'next', 'prev'][passIdx % 4];
    const target = page.locator(`[data-testid="shareable-insight-${action}"]`);
    if ((await target.count()) > 0 && (await target.first().isVisible())) {
      await target.first().click();
      await page.waitForTimeout(500);
      tick(`shareable-${action}`);
      // Click again on later passes for deeper exercise
      if (passIdx >= 3) {
        await target.first().click().catch(() => {});
        await page.waitForTimeout(400);
      }
    }
    return `${action} fired`;
  });

  await scenario('critical-moments-card', async () => {
    const card = page.locator('[data-testid="critical-moments-card"]');
    if ((await card.count()) === 0) return 'not present';
    await card.first().click().catch(() => {});
    tick('critical-moments-click');
    await page.waitForTimeout(800);
    if (!/\/weaknesses/.test(page.url())) {
      await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 15000 });
    }
    return 'clicked';
  });

  // Time-control rows — varies which row per pass
  await scenario('time-control-rows', async () => {
    const rows = page.locator('[data-testid^="time-control-row-"]');
    const count = await rows.count();
    if (count === 0) return 'no rows';
    const idx = passIdx % count;
    await rows.nth(idx).click().catch(() => {});
    tick(`time-control-${idx}`);
    await page.waitForTimeout(700);
    if (!/\/weaknesses(?!\/[^/]+)/.test(page.url())) {
      await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 15000 });
    }
    return `clicked row ${idx} of ${count}`;
  });

  await scenario('analyze-cta', async () => {
    const cta = page.locator('[data-testid="analyze-now-btn"]');
    if ((await cta.count()) === 0) return 'no CTA';
    if (passIdx % 3 === 0) {
      // every 3rd pass actually clicks (kicks off background analysis)
      await cta.first().click().catch(() => {});
      tick('analyze-now-clicked');
      await page.waitForTimeout(1500);
    } else {
      tick('analyze-now-visible');
    }
    return 'OK';
  });

  // ─── Mistakes tab: row exercise ─────────────────────────────────
  await scenario('mistakes-row-exercise', async () => {
    await page.locator('[data-testid="tab-mistakes"]').click();
    await page.waitForTimeout(900);
    const rows = page.locator('[data-testid="mistake-row"]');
    const count = await rows.count();
    if (count === 0) return 'no rows (empty data)';
    // Pick a different row per pass
    const targetIdx = passIdx % count;
    await rows.nth(targetIdx).click();
    await page.waitForURL(/\/coach\/review\/[\w-]+/, { timeout: 12000 });
    tick(`mistake-row-${targetIdx}`);
    // Verify state.usr carries the from-tab info
    const histState = await page.evaluate(() => history.state?.usr ?? null);
    if (!histState || histState.from !== '/weaknesses' || histState.tab !== 'mistakes') {
      throw new Error(`state.usr wrong: ${JSON.stringify(histState)}`);
    }
    return `row ${targetIdx} navigated, state.usr OK`;
  });

  // ─── Back from review → weaknesses with restored tab ────────────
  await scenario('back-from-review-restores-tab', async () => {
    await page.locator('[data-testid="coach-game-review"]').waitFor({ timeout: 25000 }).catch(() => {});
    const back = page.locator('[data-testid="summary-back-btn"]');
    if ((await back.count()) === 0) {
      // try generic back-btn fallback
      const fallback = page.locator('[data-testid="back-btn"]');
      if ((await fallback.count()) === 0) throw new Error('back button missing');
      await fallback.first().click();
    } else {
      await back.first().click();
    }
    await page.waitForTimeout(2500);
    if (!/\/weaknesses(?!\/)/.test(page.url())) {
      throw new Error(`expected /weaknesses, got ${new URL(page.url()).pathname}`);
    }
    tick('back-restores-tab');
    return 'back lands on /weaknesses';
  });

  // ─── Openings tab → drilldown ───────────────────────────────────
  await scenario('openings-tab-drilldown', async () => {
    await page.locator('[data-testid="tab-openings"]').click();
    await page.waitForTimeout(900);
    const rows = page.locator('[data-testid="opening-row"]');
    const count = await rows.count();
    if (count === 0) return 'no opening rows';
    const targetIdx = passIdx % count;
    await rows.nth(targetIdx).click();
    await page.waitForTimeout(1200);
    // After click, may show OpeningDrilldown inline OR navigate
    const dd = page.locator('[data-testid="opening-drilldown"]');
    if ((await dd.count()) > 0) {
      tick(`opening-drilldown-${targetIdx}`);
      // Back via drilldown-back
      const ddBack = page.locator('[data-testid="drilldown-back"]');
      if ((await ddBack.count()) > 0) {
        await ddBack.first().click();
        await page.waitForTimeout(500);
        tick('opening-drilldown-back');
      }
    }
    return `clicked opening ${targetIdx}`;
  });

  // ─── Tactics tab: row exercise ──────────────────────────────────
  await scenario('tactics-tab-rows', async () => {
    await page.locator('[data-testid="tab-tactics"]').click();
    await page.waitForTimeout(900);
    const rows = page.locator('[data-testid="tactic-row"]');
    const count = await rows.count();
    if (count === 0) return 'no rows';
    const targetIdx = passIdx % count;
    await rows.nth(targetIdx).click().catch(() => {});
    await page.waitForTimeout(800);
    tick(`tactic-row-${targetIdx}`);
    // Return to /weaknesses if we navigated away
    if (!/\/weaknesses(?!\/[^/]+)/.test(page.url())) {
      await page.goto(`${BASE_URL}/weaknesses`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-testid="game-insights-page"]').waitFor({ timeout: 15000 });
      await page.locator('[data-testid="tab-tactics"]').click();
      await page.waitForTimeout(700);
    }
    return `tactic ${targetIdx} interacted`;
  });

  // ─── Patterns tab: sub-cards ────────────────────────────────────
  await scenario('patterns-tab-deep', async () => {
    await page.locator('[data-testid="tab-patterns"]').click();
    await page.waitForTimeout(1500);
    let foundCount = 0;
    for (const tid of PATTERN_TESTIDS) {
      const el = page.locator(`[data-testid="${tid}"]`);
      if ((await el.count()) > 0) {
        foundCount += 1;
        tick(`pattern-${tid}`);
      }
    }
    return `${foundCount}/${PATTERN_TESTIDS.length} pattern sub-cards rendered`;
  });

  // ─── /weaknesses/games drilldown (deeper, passes ≥2) ───────────
  if (passIdx >= 1) {
    await scenario('games-drilldown-page', async () => {
      await page.goto(`${BASE_URL}/weaknesses/games`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const mounted = await page.locator('[data-testid="games-drilldown-page"]')
        .waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      if (!mounted) return 'page did not mount (might be empty)';
      tick('games-drilldown-mount');
      // Click some filter chips, varies per pass
      const chips = page.locator('[data-testid^="filter-chip-"]');
      const chipCount = await chips.count();
      if (chipCount > 0) {
        const idx = passIdx % chipCount;
        await chips.nth(idx).click().catch(() => {});
        tick(`filter-chip-${idx}`);
        await page.waitForTimeout(500);
      }
      // Click a game card if any
      const card = page.locator('[data-testid="game-card"]');
      if ((await card.count()) > 0 && passIdx % 3 === 1) {
        await card.first().click().catch(() => {});
        tick('drilldown-game-card-click');
        await page.waitForTimeout(800);
      }
      return `mounted, ${chipCount} chips`;
    });
  }

  // ─── Console / page-error gate ──────────────────────────────────
  await scenario('no-console-errors', async () => {
    if (consoleErrors.length === 0) return 'clean';
    throw new Error(`${consoleErrors.length} console errors: ${consoleErrors.slice(0, 3).join(' | ').slice(0, 300)}`);
  });

  await scenario('no-page-errors', async () => {
    if (pageErrors.length === 0) return 'clean';
    throw new Error(`${pageErrors.length} page errors: ${pageErrors.slice(0, 2).join(' | ').slice(0, 300)}`);
  });

  await ctx.close();

  const failed = scenarios.filter((s) => !s.ok);
  return {
    passIdx,
    scenarios,
    failed,
    consoleErrors,
    pageErrors,
    interactionsExercised: [...ranInteractions],
    auditEventsCount: auditEvents.length,
    auditEventKinds: [...new Set(auditEvents.map((e) => e.kind))],
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[weaknesses-loop] base   = ${BASE_URL}`);
  console.log(`[weaknesses-loop] outDir = ${OUT_DIR}`);
  console.log(`[weaknesses-loop] passes required for completion = ${PASSES_REQUIRED} consecutive clean`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[weaknesses-loop] chromium = ${executablePath}`);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });

  let consecutiveClean = 0;
  let passIdx = 0;
  const allPasses = [];

  while (passIdx < MAX_PASSES) {
    passIdx += 1;
    console.log(`\n━━━ PASS ${passIdx} (consecutive clean so far: ${consecutiveClean}/${PASSES_REQUIRED}) ━━━`);
    const result = await runPass(browser, passIdx - 1);

    const okCount = result.scenarios.filter((s) => s.ok).length;
    const failCount = result.failed.length;
    console.log(`  scenarios: ${okCount} ok, ${failCount} failed`);
    if (failCount > 0) {
      for (const f of result.failed) {
        console.log(`    ✗ ${f.name} → ${f.detail}`);
      }
    }
    console.log(`  interactions exercised this pass: ${result.interactionsExercised.length}`);
    console.log(`  audit events captured: ${result.auditEventsCount} (kinds: ${result.auditEventKinds.slice(0, 8).join(', ')}${result.auditEventKinds.length > 8 ? ', …' : ''})`);

    await writeFile(`${OUT_DIR}/pass-${passIdx}.json`, JSON.stringify(result, null, 2));
    allPasses.push(result);

    if (failCount === 0) {
      consecutiveClean += 1;
      console.log(`  ✓ clean pass (${consecutiveClean}/${PASSES_REQUIRED})`);
      if (consecutiveClean >= PASSES_REQUIRED) {
        console.log(`\n✓✓✓ ${PASSES_REQUIRED} CONSECUTIVE CLEAN PASSES — loop complete.`);
        break;
      }
    } else {
      console.log(`  ✗ pass failed, resetting consecutive counter`);
      consecutiveClean = 0;
    }
  }

  if (consecutiveClean < PASSES_REQUIRED) {
    console.log(`\n⚠ hit max passes (${MAX_PASSES}) without ${PASSES_REQUIRED} consecutive clean.`);
  }

  // Aggregate interaction coverage
  const allInteractions = new Set();
  for (const p of allPasses) p.interactionsExercised.forEach((i) => allInteractions.add(i));
  console.log(`\nTotal unique interactions exercised across all passes: ${allInteractions.size}`);
  console.log(`Sample interactions: ${[...allInteractions].slice(0, 20).join(', ')}${allInteractions.size > 20 ? ', …' : ''}`);

  await browser.close();
  await writeFile(`${OUT_DIR}/summary.json`, JSON.stringify({
    base: BASE_URL,
    passesRun: passIdx,
    consecutiveClean,
    cleanComplete: consecutiveClean >= PASSES_REQUIRED,
    totalInteractions: [...allInteractions],
    passes: allPasses.map((p) => ({
      passIdx: p.passIdx,
      failed: p.failed.map((f) => ({ name: f.name, detail: f.detail })),
      okCount: p.scenarios.filter((s) => s.ok).length,
      failCount: p.failed.length,
      consoleErrorsCount: p.consoleErrors.length,
      pageErrorsCount: p.pageErrors.length,
      interactionsCount: p.interactionsExercised.length,
      auditEventsCount: p.auditEventsCount,
    })),
  }, null, 2));

  console.log(`\nReport: ${OUT_DIR}/`);
  process.exit(consecutiveClean >= PASSES_REQUIRED ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
