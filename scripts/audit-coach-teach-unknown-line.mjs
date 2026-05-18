#!/usr/bin/env node
/**
 * Audit-coach-teach-unknown-line — drives /coach/teach with two
 * scenarios that probe how the surface handles an opening name the
 * static registry doesn't carry:
 *
 *   A) "Vienna Game: Frankenstein-Dracula Variation"
 *      A real named sub-line that exists in the Lichess DB but has a
 *      `:` so resolveWalkthroughTree skips it (static registry only
 *      carries the bare "Vienna Game"). The pre-flight DB check
 *      passes → routes to LLM gen (Tier 3). Without an LLM key in the
 *      sandbox env, gen will fail; we record that path and the
 *      surface's fallback messaging.
 *
 *   B) "Hyper-Modern Spaghetti Defense, Anti-Pasta Variation"
 *      A fabricated name that pre-flight DB lookup refuses. Tests the
 *      reject path that falls through to brain chat without a
 *      walkthrough.
 *
 * For each scenario the audit captures:
 *   - audit-stream events posted to the local sidecar listener
 *     (mirrors the prod /api/audit-stream handler)
 *   - on-screen messaging the user actually sees
 *   - which walkthrough phase (if any) the surface advances to
 *   - whether a "Play it for real" affordance becomes visible
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node scripts/audit-coach-teach-unknown-line.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-teach-unknown-${stamp}`;

const BOOT_TIMEOUT_MS = 30_000;
const SHORT_SETTLE_MS = 4000;
const HYDRATE_SETTLE_MS = 1500;
const GEN_WAIT_MS = 25_000; // upper bound for the LLM gen attempt to fail/succeed
const SKIP_TO_LEAF_TIMEOUT_MS = 90_000;
const SKIP_INTERVAL_MS = 600;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const listener = await startAuditListener();
  console.log(`[teach-unknown] base       = ${BASE_URL}`);
  console.log(`[teach-unknown] listener   = ${listener.url}`);
  console.log(`[teach-unknown] outDir     = ${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[teach-unknown] chromium   = ${executablePath}`);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachTeachUnknownBot/1.0 (chromium)',
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
    { url: listener.url, secret: listener.secret },
  );

  const page = await ctx.newPage();

  // Capture audit-stream POSTs the page tries to send — both to the
  // local sidecar AND any other URL (the app might still try the prod
  // URL from another code path). Combine for a complete picture.
  const intercepted = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        if (body && typeof body === 'object') {
          const events = Array.isArray(body) ? body : (body.events ?? [body]);
          for (const ev of events) intercepted.push(ev);
        }
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

  const report = {
    base: BASE_URL,
    startedAt: stamp,
    listenerUrl: listener.url,
    scenarios: [],
  };

  async function snapshot(name) {
    const screenshotPath = join(OUT_DIR, `${name}.png`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch {
      /* ignore */
    }
    return screenshotPath;
  }

  function eventsSince(idx) {
    return intercepted.slice(idx);
  }

  async function clearSession() {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('meta')) { resolve(); return; }
          const tx = db.transaction('meta', 'readwrite');
          tx.objectStore('meta').delete('coachSession.v1');
          tx.objectStore('meta').delete('coachMemory.v1');
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        };
        req.onerror = () => resolve();
      });
    });
  }

  // ── Boot dashboard ───────────────────────────────────────────────
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await page.waitForTimeout(2000);
  console.log(`[teach-unknown] booted at ${page.url()}`);

  // ── Scenario A: real DB-resolvable sub-line ───────────────────────
  const scenarioA = {
    name: 'A_real_subline_not_in_static_registry',
    input: 'Vienna Game: Frankenstein-Dracula Variation',
    description:
      'Real Lichess DB sub-line. Static registry only has bare Vienna; ' +
      '":" causes resolveWalkthroughTree to skip. Pre-flight DB check ' +
      'passes; LLM gen attempts.',
  };

  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(HYDRATE_SETTLE_MS);
  await clearSession();
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(HYDRATE_SETTLE_MS);

  const startA = intercepted.length;
  console.log(`\n[teach-unknown] scenario A — "${scenarioA.input}"`);
  await snapshot('A-before');

  await page.locator('[data-testid="chat-text-input"]').click();
  await page.locator('[data-testid="chat-text-input"]').fill(scenarioA.input);
  await page.locator('[data-testid="chat-send-btn"]').click();
  await page.waitForTimeout(SHORT_SETTLE_MS);

  // Watch for surface routing events for up to GEN_WAIT_MS — they
  // fire synchronously after handleSubmit. We sample 3× during the
  // wait to log progression.
  let lastLogged = 0;
  const watchUntil = Date.now() + GEN_WAIT_MS;
  while (Date.now() < watchUntil) {
    if (intercepted.length !== lastLogged) {
      const fresh = intercepted.slice(lastLogged);
      const kinds = fresh.reduce((acc, e) => {
        acc[e.kind ?? 'unknown'] = (acc[e.kind ?? 'unknown'] ?? 0) + 1;
        return acc;
      }, {});
      console.log(`  +${fresh.length} events: ${Object.entries(kinds).map(([k, n]) => `${n}×${k}`).join(', ')}`);
      lastLogged = intercepted.length;
    }
    // Stop early if generation status disappears (success or fail).
    const genVisible = await page
      .locator('[data-testid="teach-generation-progress"]')
      .isVisible()
      .catch(() => false);
    const walkthroughVisible = await page
      .locator('[data-testid="walkthrough-narrating-panel"], [data-testid="walkthrough-leaf-panel"], [data-testid="walkthrough-stage-menu"]')
      .first()
      .isVisible()
      .catch(() => false);
    if (!genVisible && walkthroughVisible) break;
    // If the failAck text appears in transcript, stop early.
    const failAckVisible = await page
      .locator('text="couldn\'t put together"')
      .isVisible()
      .catch(() => false);
    if (failAckVisible) break;
    await page.waitForTimeout(1500);
  }

  await snapshot('A-after-start');

  // Walk through narration to reach the leaf. Click `walkthrough-skip`
  // repeatedly. If we hit a fork, pick the first option. If we hit a
  // trap prompt, skip. Stop when leaf or stage-menu becomes visible
  // (or timeout).
  console.log(`  driving walkthrough to leaf…`);
  const leafResult = await driveToLeaf(page);
  console.log(`  leaf-result: ${JSON.stringify(leafResult)}`);
  await snapshot('A-at-leaf');

  // Capture leaf-state info
  const leafOutroText = await page
    .locator('[data-testid="walkthrough-leaf-panel"] .italic')
    .first()
    .innerText({ timeout: 2000 })
    .catch(() => '');
  const continueLearningVisible = await page
    .locator('[data-testid="walkthrough-continue-learning"]')
    .isVisible()
    .catch(() => false);
  // Two surfaces of the play-it-out affordance:
  //   - walkthrough-leaf-play-real : prominent button at the leaf
  //     panel (the user's "ask if they want to play it out" path
  //     goes through this).
  //   - walkthrough-stage-play     : Play it for real button at the
  //     stage menu (one click deeper).
  const playOutAtLeafVisible = await page
    .locator('[data-testid="walkthrough-leaf-play-real"]')
    .isVisible()
    .catch(() => false);
  const playOutAtLeafLabel = await page
    .locator('[data-testid="walkthrough-leaf-play-real"]')
    .innerText({ timeout: 2000 })
    .catch(() => '');
  // Chat prompt assertion — coach should have appended a
  // conversational "play it out yourself?" message to the transcript.
  const transcriptDuringLeaf = await page
    .locator('[data-testid="teach-transcript"]')
    .innerText({ timeout: 3000 })
    .catch(() => '');
  const promptedInChat = /play it out yourself|play this line out yourself|want to play .*\b(yourself|out)\b/i.test(
    transcriptDuringLeaf,
  );
  const playForRealAtLeafVisible = playOutAtLeafVisible; // back-compat alias

  // Click "Continue learning" if present to surface the stage menu.
  let stageMenuVisible = false;
  let playForRealAtStageMenuVisible = false;
  let stageMenuLabel = '';
  if (continueLearningVisible) {
    await page.locator('[data-testid="walkthrough-continue-learning"]').click();
    await page.waitForTimeout(1500);
    await snapshot('A-stage-menu');
    stageMenuVisible = await page
      .locator('[data-testid="walkthrough-stage-menu"]')
      .isVisible()
      .catch(() => false);
    playForRealAtStageMenuVisible = await page
      .locator('[data-testid="walkthrough-stage-play"]')
      .isVisible()
      .catch(() => false);
    stageMenuLabel = await page
      .locator('[data-testid="walkthrough-stage-play"]')
      .innerText({ timeout: 2000 })
      .catch(() => '');
  }

  const transcriptA = await page
    .locator('[data-testid="teach-transcript"]')
    .innerText({ timeout: 3000 })
    .catch(() => '');
  const phaseA = await detectWalkthroughPhase(page);
  const eventsA = eventsSince(startA);
  scenarioA.events = eventsA.length;
  scenarioA.eventKinds = countKinds(eventsA);
  scenarioA.surfaceRoutingEvents = eventsA
    .filter((e) => e.kind === 'coach-surface-migrated')
    .map((e) => e.summary);
  scenarioA.phase = phaseA;
  scenarioA.transcriptSnippet = transcriptA.slice(0, 2500);
  scenarioA.leafResult = leafResult;
  scenarioA.leafOutroText = leafOutroText;
  scenarioA.continueLearningVisibleAtLeaf = continueLearningVisible;
  scenarioA.playOutAtLeafVisible = playOutAtLeafVisible;
  scenarioA.playOutAtLeafLabel = playOutAtLeafLabel;
  scenarioA.promptedInChat = promptedInChat;
  scenarioA.stageMenuVisibleAfterContinue = stageMenuVisible;
  scenarioA.playForRealVisibleAtStageMenu = playForRealAtStageMenuVisible;
  scenarioA.playForRealLabel = stageMenuLabel;
  scenarioA.spineNarrationSkips = leafResult?.skips ?? 0;
  scenarioA.reachedMiddlegame = (leafResult?.skips ?? 0) >= 5; // ~5 skips ≈ ~12 plies ≈ middlegame
  report.scenarios.push(scenarioA);
  console.log(`  phase: ${scenarioA.phase}`);
  console.log(`  leafOutroText: ${leafOutroText.slice(0, 120)}`);
  console.log(`  continueLearning@leaf: ${continueLearningVisible}`);
  console.log(`  playOut@leaf: ${playOutAtLeafVisible} (label="${playOutAtLeafLabel.slice(0, 80)}")`);
  console.log(`  promptedInChat: ${promptedInChat}`);
  console.log(`  spineNarrationSkips: ${scenarioA.spineNarrationSkips} (reachedMiddlegame: ${scenarioA.reachedMiddlegame})`);
  console.log(`  stageMenu→playForReal: ${playForRealAtStageMenuVisible} (label="${stageMenuLabel.slice(0, 80)}")`);

  // ── Scenario B: fabricated name, not in DB ───────────────────────
  const scenarioB = {
    name: 'B_fabricated_name_not_in_DB',
    input: 'Hyper-Modern Spaghetti Defense, Anti-Pasta Variation',
    description:
      'Made-up name. resolveOpeningEntry returns null → Tier 2.5 ' +
      'pre-flight DB check refuses → handleSubmit falls through to ' +
      'normal brain chat reply (no walkthrough).',
  };

  await clearSession();
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
  await page.waitForTimeout(HYDRATE_SETTLE_MS);

  const startB = intercepted.length;
  console.log(`\n[teach-unknown] scenario B — "${scenarioB.input}"`);
  await snapshot('B-before');

  await page.locator('[data-testid="chat-text-input"]').click();
  await page.locator('[data-testid="chat-text-input"]').fill(scenarioB.input);
  await page.locator('[data-testid="chat-send-btn"]').click();
  await page.waitForTimeout(SHORT_SETTLE_MS);
  // Short wait — pre-flight reject is synchronous; brain reply (if any)
  // is slower if it has a key, but in the sandbox it'll fail fast too.
  await page.waitForTimeout(8000);

  const screenB = await snapshot('B-after');
  const transcriptB = await page
    .locator('[data-testid="teach-transcript"]')
    .innerText({ timeout: 3000 })
    .catch(() => '');
  const phaseB = await detectWalkthroughPhase(page);
  const eventsB = eventsSince(startB);
  scenarioB.events = eventsB.length;
  scenarioB.eventKinds = countKinds(eventsB);
  scenarioB.surfaceRoutingEvents = eventsB
    .filter((e) => e.kind === 'coach-surface-migrated')
    .map((e) => e.summary);
  scenarioB.phase = phaseB;
  scenarioB.transcriptSnippet = transcriptB.slice(0, 1500);
  scenarioB.screenshot = screenB;
  scenarioB.playForRealVisible = await page
    .locator('[data-testid="walkthrough-stage-play"]')
    .isVisible()
    .catch(() => false);
  scenarioB.continueLearningVisible = await page
    .locator('[data-testid="walkthrough-continue-learning"]')
    .isVisible()
    .catch(() => false);
  report.scenarios.push(scenarioB);
  console.log(`  phase: ${scenarioB.phase}`);
  console.log(`  playForReal visible: ${scenarioB.playForRealVisible}`);

  // ── Summary ──────────────────────────────────────────────────────
  report.consoleErrors = consoleErrors.slice(0, 40);
  report.pageErrors = pageErrors.slice(0, 40);
  report.totalEvents = intercepted.length;
  report.sidecarCapturedCount = listener.getCapturedEvents().length;

  await writeFile(
    join(OUT_DIR, 'report.json'),
    JSON.stringify(report, null, 2),
    'utf-8',
  );
  await writeFile(
    join(OUT_DIR, 'all-events.json'),
    JSON.stringify(intercepted, null, 2),
    'utf-8',
  );

  console.log(`\n[teach-unknown] DONE`);
  console.log(`  total events: ${intercepted.length}`);
  console.log(`  sidecar captured: ${listener.getCapturedEvents().length}`);
  console.log(`  report: ${OUT_DIR}/report.json`);

  await browser.close();
  await listener.stop();
}

function countKinds(events) {
  return events.reduce((acc, e) => {
    acc[e.kind ?? 'unknown'] = (acc[e.kind ?? 'unknown'] ?? 0) + 1;
    return acc;
  }, {});
}

async function driveToLeaf(page) {
  const deadline = Date.now() + SKIP_TO_LEAF_TIMEOUT_MS;
  let lastPhase = '';
  let skips = 0;
  while (Date.now() < deadline) {
    const phase = await detectWalkthroughPhase(page);
    if (phase !== lastPhase) {
      console.log(`    phase → ${phase}`);
      lastPhase = phase;
    }
    if (phase === 'walkthrough-leaf-panel') return { reached: 'leaf', skips };
    if (phase === 'walkthrough-stage-menu') return { reached: 'stage-menu', skips };

    if (phase === 'walkthrough-narrating-panel') {
      // Click skip; if Polly is loading the next narration line, the
      // skip button might be briefly disabled.
      const skipBtn = page.locator('[data-testid="walkthrough-skip"]');
      const isVisible = await skipBtn.isVisible().catch(() => false);
      if (isVisible) {
        await skipBtn.click({ timeout: 1500 }).catch(() => undefined);
        skips++;
      }
    } else if (phase === 'walkthrough-fork-panel') {
      // Pick the first fork option.
      const opt = page.locator('[data-testid="walkthrough-fork-option-0"]');
      if (await opt.isVisible().catch(() => false)) {
        await opt.click().catch(() => undefined);
      }
    } else if (phase === 'walkthrough-trap-prompt') {
      const skipTrap = page.locator('[data-testid="walkthrough-trap-skip"]');
      if (await skipTrap.isVisible().catch(() => false)) {
        await skipTrap.click().catch(() => undefined);
      }
    } else if (phase === 'walkthrough-choose-mode') {
      // First-time chooser if walkthrough already completed.
      const c = page.locator('[data-testid="walkthrough-choose-walkthrough"]');
      if (await c.isVisible().catch(() => false)) {
        await c.click().catch(() => undefined);
      }
    } else if (phase === 'teach-generation-progress') {
      // Still generating — wait.
    } else if (phase === 'none') {
      // Walkthrough not on screen at all — surface may have rejected.
      return { reached: 'none', skips };
    }
    await page.waitForTimeout(SKIP_INTERVAL_MS);
  }
  return { reached: 'timeout', skips, lastPhase };
}

async function detectWalkthroughPhase(page) {
  const phases = [
    'walkthrough-narrating-panel',
    'walkthrough-leaf-panel',
    'walkthrough-stage-menu',
    'walkthrough-choose-mode',
    'walkthrough-fork-panel',
    'walkthrough-paused-panel',
    'walkthrough-trap-prompt',
    'walkthrough-quiz-panel',
    'walkthrough-drill-active',
    'teach-generation-progress',
    'line-picker',
  ];
  for (const p of phases) {
    const visible = await page
      .locator(`[data-testid="${p}"]`)
      .first()
      .isVisible()
      .catch(() => false);
    if (visible) return p;
  }
  return 'none';
}

main().catch((err) => {
  console.error('[teach-unknown] FATAL', err);
  process.exit(1);
});
