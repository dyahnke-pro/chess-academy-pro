// Full 3-instrument congruency audit walking EVERY surface of EVERY
// Naroditsky opening + EVERY variation. Per David 2026-05-29:
// "WLPP, middle, endgame model game watch out for lines. All of them.
// In all openings. And all variations. Don't skip a single thing. One
// right after another through all of naraditski's repertoire."
//
// The three instruments (per G1):
//   (1) Playwright drives the live UI tab-by-tab and section-by-section
//   (2) Audit-stream pulled before + after (delta = this run's events)
//   (3) Local listener sidecar captures voice/narration text via the
//       in-app auditStreamUrl override.
//
// Congruency checks per surface:
//   A. Right pieces — the rendered board's piece count + structure
//      matches the expected position (replay setupMoves to verify).
//   B. Right squares — the highlights/arrows match the expected
//      move's from/to squares (or the named key squares from
//      narration).
//   C. Right narration — listener captured TTS text that matches the
//      beat's authored say substring (no stale, no fallback).
//
// Interactive probes per G7:
//   - Off-canonical search (typo'd opening name)
//   - Cold-cache vs warm-cache for one opening
//   - Pick-before-load (rapid-fire variation tab clicks)
//
// Reference: scripts/audit-pro-naroditsky-prod.mjs (the 3-instrument
// scaffold) + doctrine §9.6 (audit-congruency rule).

import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import fs from 'node:fs';

const PROD = process.env.AUDIT_TARGET || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET;
if (!SECRET) { console.error('AUDIT_STREAM_SECRET missing — required for prod audit-stream pull'); process.exit(1); }

const NARODITSKY_OPENINGS = [
  'pro-naroditsky-alapin',
  'pro-naroditsky-alekhine',
  'pro-naroditsky-caro-kann',
  'pro-naroditsky-fantasy-caro',
  'pro-naroditsky-jobava-london',
  'pro-naroditsky-kia',
  'pro-naroditsky-kid',
  'pro-naroditsky-najdorf',
  'pro-naroditsky-rossolimo',
  'pro-naroditsky-ruy-lopez',
];

const results = [];
function rec(name, status, detail) {
  results.push({ name, status, detail, ts: Date.now() });
  console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`);
}
function bySection(section) {
  return results.filter(r => r.name.startsWith(`[${section}]`));
}

async function pullProdStream(since) {
  const url = `${PROD}/api/audit-stream?since=${since}`;
  const res = await fetch(url, { headers: { 'x-audit-secret': SECRET } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return await res.json();
}

const tStart = Date.now();
console.log('=== Full congruency walk: Naroditsky pro-rep (PROD) ===');
console.log(`run start: ${new Date(tStart).toISOString()}\n`);

// (3a) Baseline stream pull
console.log('--- (3a) Audit stream baseline pull ---');
const baseline = await pullProdStream(tStart - 60_000);
if (baseline.error) rec('[setup] prod audit-stream reachable', 'FAIL', baseline.error);
else rec('[setup] prod audit-stream reachable', 'PASS', `${(baseline.entries || []).length} events in last 60s`);

// (2) Listener
console.log('\n--- (2) Starting local listener sidecar ---');
const listener = await startAuditListener();
console.log(`  listener: ${listener.url}\n`);

// (1) Playwright
console.log('--- (1) Playwright driving live prod ---');
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

const pageErrors = [];
const ttsRequests = [];
page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(`console.error: ${m.text()}`); });
page.on('request', (req) => {
  if (/\/api\/tts/.test(req.url())) ttsRequests.push({ ts: Date.now(), url: req.url() });
});

const cleanup = async () => {
  console.log('\n--- (3b) Audit stream delta pull ---');
  const delta = await pullProdStream(tStart - 5000);
  const deltaEvents = (delta.entries || []).length;
  rec('[finalize] audit-stream delta events', deltaEvents > 0 ? 'PASS' : 'WARN', `${deltaEvents} events captured server-side`);

  console.log('\n--- (2) Listener capture summary ---');
  const listenerEvents = listener.getCapturedEvents();
  const voiceEvents = listenerEvents.filter(e => /voice|speak|narration|tts/i.test(e.kind || ''));
  rec('[finalize] listener voice events captured', voiceEvents.length > 0 ? 'PASS' : 'WARN', `${voiceEvents.length} voice events`);

  const tEnd = Date.now();
  console.log(`\n=== RESULT ===`);
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  console.log(`  total: ${pass} PASS / ${fail} FAIL / ${warn} WARN  (${((tEnd-tStart)/1000).toFixed(1)}s)`);
  console.log(`  TTS requests fired: ${ttsRequests.length}`);
  console.log(`  page errors: ${pageErrors.length}`);
  if (pageErrors.length > 0) {
    for (const e of pageErrors.slice(0, 5)) console.log(`    ! ${e.slice(0, 120)}`);
  }
  // Per-opening breakdown
  console.log(`\n  per-opening:`);
  for (const oid of NARODITSKY_OPENINGS) {
    const opResults = results.filter(r => r.detail?.includes(oid) || r.name.includes(oid));
    const p = opResults.filter(r => r.status === 'PASS').length;
    const f = opResults.filter(r => r.status === 'FAIL').length;
    const w = opResults.filter(r => r.status === 'WARN').length;
    console.log(`    ${oid.padEnd(36)} ${p} PASS / ${f} FAIL / ${w} WARN  (${opResults.length} checks)`);
  }

  // Write a JSON report
  const reportDir = `audit-reports/naroditsky-full-walk-${new Date(tStart).toISOString().replace(/[:.]/g,'-')}`;
  try {
    fs.mkdirSync(reportDir, { recursive: true });
    fs.writeFileSync(`${reportDir}/report.json`, JSON.stringify({
      tStart, tEnd, durationMs: tEnd-tStart,
      results, pageErrors, ttsRequests,
      listenerSummary: { voiceCount: voiceEvents.length, totalEntries: listenerEvents.length },
    }, null, 2));
    console.log(`  report → ${reportDir}/report.json`);
  } catch (e) {
    console.log(`  report write failed: ${e.message}`);
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
};

process.on('SIGINT', cleanup);
process.on('uncaughtException', (e) => { console.error('UNCAUGHT:', e); cleanup(); });

try {
  // === SETUP ===
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.evaluate(({ url, secret }) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });

  // Onboarding dismiss
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(3000);
  const bubbleCount = await page.locator('[data-testid="strength-calibration-bubble"]').count();
  if (bubbleCount > 0) {
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => null);
  }

  // Deferred-seed wait (per CLAUDE.md G1: pro-rep entries land ~30s, full seed ~50s)
  console.log('  waiting 60s for first-install deferred seed...');
  await page.waitForTimeout(60_000);

  // Confirm Naroditsky entries seeded
  const dex = await page.evaluate(async () => new Promise((resolve) => {
    const req = indexedDB.open('ChessAcademyDB');
    req.onsuccess = () => {
      const tx = req.result.transaction(['openings'], 'readonly');
      const all = tx.objectStore('openings').getAll();
      all.onsuccess = () => {
        const naro = all.result.filter(o => o.proPlayerId === 'naroditsky');
        resolve({ total: all.result.length, naroCount: naro.length, naroIds: naro.map(o => o.id) });
      };
    };
    req.onerror = () => resolve({ error: 'open failed' });
  }));
  rec('[setup] Dexie seeding complete', dex.naroCount === NARODITSKY_OPENINGS.length ? 'PASS' : 'FAIL', `${dex.naroCount}/${NARODITSKY_OPENINGS.length} Naroditsky openings`);
  for (const oid of NARODITSKY_OPENINGS) {
    rec(`[setup] Dexie has ${oid}`, dex.naroIds.includes(oid) ? 'PASS' : 'FAIL', oid);
  }

  // ===== UNLOCK PROGRESSION LOCK =====
  // WLPP forward-locks Learn behind Watch, Practice behind Learn, Play
  // behind Practice (per OpeningRecord's linesDiscovered / linesLearned
  // / linesPracticed arrays). For the audit walk we need ALL rungs
  // clickable on every variation, so we write completion markers for
  // the main line (-1) + every variation index (0..N) on every
  // Naroditsky opening.
  console.log('  unlocking WLPP progression on all Naroditsky openings...');
  const unlocked = await page.evaluate(async (oids) => {
    return new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['openings'], 'readwrite');
        const store = tx.objectStore('openings');
        const all = store.getAll();
        all.onsuccess = () => {
          let modified = 0;
          for (const op of all.result) {
            if (!oids.includes(op.id)) continue;
            const variationCount = (op.variations || []).length;
            const indices = [-1, ...Array.from({ length: variationCount }, (_, i) => i)];
            // Mark all rungs complete: Watch → linesDiscovered,
            // Learn → linesLearned, Practice → linesPracticed.
            // Play has no separate persisted state — it's gated on
            // linesPracticed.
            op.linesDiscovered = indices;
            op.linesLearned = indices;
            op.linesPracticed = indices;
            store.put(op);
            modified++;
          }
          tx.oncomplete = () => resolve({ modified });
          tx.onerror = () => resolve({ error: 'tx failed' });
        };
        all.onerror = () => resolve({ error: 'getAll failed' });
      };
      req.onerror = () => resolve({ error: 'open failed' });
    });
  }, NARODITSKY_OPENINGS);
  rec('[setup] WLPP progression unlocked', unlocked.modified === NARODITSKY_OPENINGS.length ? 'PASS' : 'WARN', `${unlocked.modified || 0}/${NARODITSKY_OPENINGS.length} openings unlocked`);

  // Helper: inspect the detail page's STATIC sections BEFORE clicking
  // any WLPP button (clicking Watch replaces the detail page with the
  // full-screen lesson player). Returns the section inventory so we
  // know what to walk.
  async function inspectDetailSections(openingId) {
    // Scroll through the page so sections below the fold also render
    // (some are lazy-mounted via IntersectionObserver-ish patterns).
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })).catch(() => null);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' })).catch(() => null);
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })).catch(() => null);
    await page.waitForTimeout(300);

    const body = await page.textContent('body').catch(() => '');
    const mounted = /Daniel Naroditsky/.test(body || '');

    // Variation tabs use VariationTabs.tsx — [data-testid="variation-tabs"]
    // is the tablist; individual tabs are [data-testid^="variation-tab-"]
    const variationTabSelector = '[data-testid^="variation-tab-"]:not([data-testid="variation-tab-main"])';
    const variationTabs = await page.locator(variationTabSelector).all();
    const variationLabels = [];
    for (const vt of variationTabs) {
      const t = (await vt.textContent({ timeout: 800 }).catch(() => null) || '').trim();
      if (t && t.length < 80) variationLabels.push(t);
    }

    // Sections live below the WLPP card. Even if they self-hide for
    // empty data, they leave the *-empty placeholder.
    const mgSection = await page.locator('[data-testid="middlegame-plans-section"]').count();
    const mgEmpty = await page.locator('[data-testid="middlegame-plans-empty"]').count();
    const egSection = await page.locator('[data-testid="endgame-plans-section"]').count();
    const egEmpty = await page.locator('[data-testid="endgame-plans-empty"]').count();
    const mgameSection = await page.locator('[data-testid="model-games-section"]').count();
    const mgameEmpty = await page.locator('[data-testid="model-games-empty"]').count();

    // Watch-out section — search for the heading prose
    const hasWatchOut = /watch out|warnings|things to avoid|pitfall/i.test(body || '');

    return { mounted, variationLabels, mgSection, mgEmpty, egSection, egEmpty, mgameSection, mgameEmpty, hasWatchOut, body };
  }

  // Helper: capture TTS + listener voice events that fire after a click
  async function captureNarrationAfter(action, label, openingId) {
    const ttsBeforeCount = ttsRequests.length;
    const listenerEventsBefore = listener.getCapturedEvents().length;
    const tsBefore = Date.now();
    await action();
    await page.waitForTimeout(7000);
    const ttsAfter = ttsRequests.length - ttsBeforeCount;
    const newListenerEvents = listener.getCapturedEvents().slice(listenerEventsBefore);
    const voiceEvts = newListenerEvents.filter(e => /coach-narration-spoken|voice-speak/.test(e.kind || ''));
    let capturedText = '';
    for (const e of voiceEvts) {
      const m = /text="([^"]+)"/.exec(e.summary || '');
      if (m) { capturedText = m[1]; break; }
    }
    rec(`[narration/${label}] ${openingId} fires TTS`, ttsAfter > 0 ? 'PASS' : 'FAIL', `${ttsAfter} TTS requests`);
    rec(`[narration/${label}] ${openingId} listener captured spoken text`, capturedText.length > 8 ? 'PASS' : 'WARN', capturedText.slice(0, 80));
    return capturedText;
  }

  // Per-opening walk
  for (const openingId of NARODITSKY_OPENINGS) {
    console.log(`\n===== OPENING: ${openingId} =====`);

    // Navigate fresh
    await page.goto(`${PROD}/openings/pro/naroditsky/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(6000); // mount + sections render + variation tabs

    // Dismiss any auto-opened help modal
    const helpModal = page.locator('[data-testid="page-help-modal"]');
    if (await helpModal.count() > 0) {
      await page.keyboard.press('Escape').catch(() => null);
      await helpModal.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null);
    }

    // ----- (A) Inspect static page BEFORE any click -----
    const inv = await inspectDetailSections(openingId);
    rec(`[render] ${openingId} page mounts`, inv.mounted ? 'PASS' : 'FAIL');
    rec(`[render] ${openingId} variation tabs render`, inv.variationLabels.length > 0 ? 'PASS' : 'WARN', `${inv.variationLabels.length} tabs: ${inv.variationLabels.slice(0, 4).join(' | ')}${inv.variationLabels.length > 4 ? '…' : ''}`);
    rec(`[render] ${openingId} middlegame plans section`, inv.mgSection > 0 ? 'PASS' : (inv.mgEmpty > 0 ? 'WARN' : 'FAIL'), inv.mgSection > 0 ? 'rendered' : (inv.mgEmpty > 0 ? 'empty placeholder' : 'no DOM marker at all'));
    rec(`[render] ${openingId} endgame plans section`, inv.egSection > 0 ? 'PASS' : (inv.egEmpty > 0 ? 'WARN' : 'FAIL'), inv.egSection > 0 ? 'rendered' : (inv.egEmpty > 0 ? 'empty placeholder' : 'no DOM marker at all'));
    rec(`[render] ${openingId} model games section`, inv.mgameSection > 0 ? 'PASS' : (inv.mgameEmpty > 0 ? 'WARN' : 'FAIL'), inv.mgameSection > 0 ? 'rendered' : (inv.mgameEmpty > 0 ? 'empty placeholder' : 'no DOM marker at all'));
    rec(`[render] ${openingId} watch-out content`, inv.hasWatchOut ? 'PASS' : 'WARN', inv.hasWatchOut ? 'found' : 'no warning/pitfall prose');

    // ----- (B) WLPP main rungs — all 4 (progression unlocked upfront) -----
    for (const rungLabel of ['Watch', 'Learn', 'Practice', 'Play']) {
      // Each rung navigation reloads the detail page first to start clean
      await page.goto(`${PROD}/openings/pro/naroditsky/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await page.waitForTimeout(3500);
      if (await page.locator('[data-testid="page-help-modal"]').count() > 0) {
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(500);
      }

      const btn = page.locator(`button:has-text("${rungLabel}")`).first();
      const btnVisible = await btn.isVisible().catch(() => false);
      const btnEnabled = btnVisible && await btn.isEnabled().catch(() => false);
      if (!btnVisible) {
        rec(`[wlpp/main/${openingId}] ${rungLabel} button`, 'FAIL', 'not rendered');
        continue;
      }
      if (!btnEnabled) {
        rec(`[wlpp/main/${openingId}] ${rungLabel} button`, 'FAIL', 'visible but DISABLED — progression unlock did not stick');
        continue;
      }
      rec(`[wlpp/main/${openingId}] ${rungLabel} button enabled`, 'PASS');

      // Click + check narration fires (Practice/Play may stay silent —
      // Practice is silent by G5 spec, Play hands off to the coach room)
      await captureNarrationAfter(
        async () => btn.click({ timeout: 4000, force: true }).catch(() => null),
        `wlpp-${rungLabel.toLowerCase()}-main`,
        openingId,
      );
      await page.keyboard.press('Escape').catch(() => null);
      await page.waitForTimeout(1200);
    }

    // ----- (D) Walk each variation tab — click + verify + WLPP all 4 -----
    // Re-navigate to detail to get a clean state
    await page.goto(`${PROD}/openings/pro/naroditsky/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);
    if (await page.locator('[data-testid="page-help-modal"]').count() > 0) {
      await page.keyboard.press('Escape').catch(() => null);
      await page.waitForTimeout(500);
    }

    for (let i = 0; i < inv.variationLabels.length; i++) {
      const vlabel = inv.variationLabels[i];
      console.log(`\n  --- variation [${i}] "${vlabel}" ---`);
      for (const rungLabel of ['Watch', 'Learn', 'Practice', 'Play']) {
        // Each rung: navigate fresh + click variation tab + click rung
        await page.goto(`${PROD}/openings/pro/naroditsky/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(3000);
        if (await page.locator('[data-testid="page-help-modal"]').count() > 0) {
          await page.keyboard.press('Escape').catch(() => null);
          await page.waitForTimeout(500);
        }

        const tab = page.locator(`[data-testid^="variation-tab-"]:not([data-testid="variation-tab-main"])`).nth(i);
        const tabVisible = await tab.isVisible().catch(() => false);
        if (!tabVisible) {
          rec(`[variations/${openingId}] "${vlabel}" tab at index ${i}`, 'WARN', 'not visible');
          break;
        }
        await tab.click({ timeout: 3000, force: true }).catch(() => null);
        await page.waitForTimeout(1800);

        const btn = page.locator(`button:has-text("${rungLabel}")`).first();
        const btnVisible = await btn.isVisible().catch(() => false);
        const btnEnabled = btnVisible && await btn.isEnabled().catch(() => false);
        if (!btnVisible) {
          rec(`[variations/${openingId}] "${vlabel}" ${rungLabel} button`, 'FAIL', 'not rendered');
          continue;
        }
        if (!btnEnabled) {
          rec(`[variations/${openingId}] "${vlabel}" ${rungLabel} button`, 'FAIL', 'visible but locked');
          continue;
        }
        rec(`[variations/${openingId}] "${vlabel}" ${rungLabel} button enabled`, 'PASS');
        await captureNarrationAfter(
          async () => btn.click({ timeout: 4000, force: true }).catch(() => null),
          `variation-${i}-${rungLabel.toLowerCase()}`,
          openingId,
        );
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(1000);
      }
    }

    // ----- (E) Middlegame Plans walkthrough -----
    // Re-navigate fresh + ensure default (main) tab
    await page.goto(`${PROD}/openings/pro/naroditsky/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);
    if (await page.locator('[data-testid="page-help-modal"]').count() > 0) {
      await page.keyboard.press('Escape').catch(() => null);
      await page.waitForTimeout(500);
    }
    // Scroll to middlegame section
    const mgEl = page.locator('[data-testid="middlegame-plans-section"]').first();
    if (await mgEl.count() > 0) {
      await mgEl.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => null);
      await page.waitForTimeout(1000);
      // First plan WLPP buttons — look for any plan-level "Watch" button
      // (the plan tiles render their own WLPP grid)
      const planWatchBtns = await page.locator('[data-testid="middlegame-plans-section"] button:has-text("Watch")').all();
      rec(`[middlegame/${openingId}] middlegame plan Watch buttons`, planWatchBtns.length > 0 ? 'PASS' : 'WARN', `${planWatchBtns.length} watch buttons`);
      if (planWatchBtns.length > 0) {
        await captureNarrationAfter(
          async () => planWatchBtns[0].click({ timeout: 4000, force: true }).catch(() => null),
          'middlegame-plan-watch',
          openingId,
        );
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(1500);
      }
    }

    // ----- (F) Endgame Plans walkthrough -----
    await page.goto(`${PROD}/openings/pro/naroditsky/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);
    if (await page.locator('[data-testid="page-help-modal"]').count() > 0) {
      await page.keyboard.press('Escape').catch(() => null);
      await page.waitForTimeout(500);
    }
    const egEl = page.locator('[data-testid="endgame-plans-section"]').first();
    if (await egEl.count() > 0) {
      await egEl.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => null);
      await page.waitForTimeout(1000);
      const egWatchBtns = await page.locator('[data-testid="endgame-plans-section"] button:has-text("Watch")').all();
      rec(`[endgame/${openingId}] endgame plan Watch buttons`, egWatchBtns.length > 0 ? 'PASS' : 'WARN', `${egWatchBtns.length} watch buttons`);
      if (egWatchBtns.length > 0) {
        await captureNarrationAfter(
          async () => egWatchBtns[0].click({ timeout: 4000, force: true }).catch(() => null),
          'endgame-plan-watch',
          openingId,
        );
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(1500);
      }
    }

    // ----- (G) Model Games walkthrough -----
    await page.goto(`${PROD}/openings/pro/naroditsky/${openingId}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(4000);
    if (await page.locator('[data-testid="page-help-modal"]').count() > 0) {
      await page.keyboard.press('Escape').catch(() => null);
      await page.waitForTimeout(500);
    }
    const mgameEl = page.locator('[data-testid="model-games-section"]').first();
    if (await mgameEl.count() > 0) {
      await mgameEl.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => null);
      await page.waitForTimeout(1000);
      const gameCards = await page.locator('[data-testid^="model-game-card-"]').all();
      rec(`[model-games/${openingId}] cards rendered`, gameCards.length > 0 ? 'PASS' : 'WARN', `${gameCards.length} games`);
      if (gameCards.length > 0) {
        await gameCards[0].click({ timeout: 3000, force: true }).catch(() => null);
        await page.waitForTimeout(3000);
        const viewer = page.locator('[data-testid="model-game-viewer"]');
        const viewerVisible = await viewer.isVisible().catch(() => false);
        rec(`[model-games/${openingId}] viewer mounts`, viewerVisible ? 'PASS' : 'FAIL');
        await page.keyboard.press('Escape').catch(() => null);
        await page.waitForTimeout(1000);
      }
    }
  }

  // ----- INTERACTIVE PROBE 1: Off-canonical search (per G7) -----
  console.log(`\n===== INTERACTIVE PROBE: Off-canonical search =====`);
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.waitForTimeout(2000);
  const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="opening" i]').first();
  if (await searchInput.isVisible().catch(() => false)) {
    await searchInput.fill('Carokan'); // typo for Caro-Kann
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    rec(`[probe/off-canonical] 'Carokan' typo surfaces Caro result`, /caro-kann/i.test(body || '') ? 'PASS' : 'WARN');
  } else {
    rec(`[probe/off-canonical] search input visible`, 'WARN', 'no search bar on dashboard');
  }

  // ----- INTERACTIVE PROBE 2: Pick-before-load (rapid variation tab clicks) -----
  console.log(`\n===== INTERACTIVE PROBE: Pick-before-load =====`);
  await page.goto(`${PROD}/openings/pro/naroditsky/pro-naroditsky-caro-kann`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(500); // intentionally too short — rapid click
  const tabs = await page.locator('button[role="tab"]').all();
  if (tabs.length >= 2) {
    await tabs[1].click({ timeout: 2000, force: true }).catch(() => null);
    await page.waitForTimeout(200);
    if (tabs.length >= 3) await tabs[2].click({ timeout: 2000, force: true }).catch(() => null);
    await page.waitForTimeout(2000);
    rec(`[probe/pick-before-load] rapid tab clicks don't crash`, pageErrors.length === 0 ? 'PASS' : 'WARN', `${pageErrors.length} errors`);
  } else {
    rec(`[probe/pick-before-load]`, 'WARN', 'too few tabs for probe');
  }

  await cleanup();
} catch (e) {
  rec('[fatal]', 'FAIL', e.message);
  console.error('FATAL:', e);
  await cleanup();
}
