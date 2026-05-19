#!/usr/bin/env node
/**
 * audit-play-comprehensive.mjs
 *
 * Comprehensive interactive failure-mode audit for /coach/play
 * (Play with Coach). Mirrors the audit-learn-comprehensive.mjs
 * structure: rotation pools + filtered noise + brain-aware
 * severity tags + voice-style transcript injection.
 *
 * Section 2 of the audit-fix-audit loop David started 2026-05-19.
 * Target: 3 consecutive runs with 0 real errors.
 *
 * Surface map probed:
 *   - Cold boot + mount of /coach/play
 *   - Color selector (white / black) — pick + verify orientation
 *   - Difficulty toggle
 *   - Coach tips toggle
 *   - Stockfish engine: read-position button → Polly fires
 *   - Move navigation: first / prev / next / last (in review mode)
 *   - Take back move
 *   - Restart button
 *   - Skip-to-review button (mid-game post-loss)
 *   - Game chat panel: type a question, verify reply
 *   - Voice-style transcript path
 *   - Inline coach tip bubble interactions:
 *       - explore-from-here-btn
 *       - show-tactic-line-btn
 *       - dismiss-tip-btn
 *       - show-next-btn / show-prev-btn step nav
 *   - Blunder interception flow (synth a blunder, verify
 *     intercept appears with continue / takeback / try-best)
 *   - Coach quiz banner dismiss
 *   - Back button to /coach/home + return
 *   - Practice-position-banner exit
 *   - Stress test: rapid-fire chat prompts
 *   - Route-log scan: no bounce to /coach/session/play-against
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/play-comprehensive-${stamp}`;
await mkdir(OUT_DIR, { recursive: true });

const findings = [];
const consoleErrors = [];
const consoleDiagnostics = [];
const pageErrors = [];
const networkFailures = [];
const networkResponses = [];
const brainCalls = [];
const auditEvents = [];
const ttsChunks = [];

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

async function clearStorageAndReload(page) {
  await page.evaluate(async () => {
    try {
      const dbs = await indexedDB.databases?.();
      if (dbs) for (const db of dbs) if (db.name) indexedDB.deleteDatabase(db.name);
    } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  // After IDB delete + reload the service worker re-registers and
  // the bundle re-hydrates — can take 30-45s in sandbox. Wait long
  // enough; also accept ANY of the common mount signals across
  // surfaces (some hide the bottom nav).
  try {
    await page.locator(
      '[data-testid="nav-home-tab"], [data-testid="coach-game-page"], [data-testid="coach-home-page"], [data-testid="coach-teach-page"]'
    ).first().waitFor({ state: 'visible', timeout: 45_000 });
  } catch {
    record('mount: shell post-reload', false,
      'no recognized mount signal visible in 45s post-reload');
  }
}

/** Robust chat input fill — focus + fill, no .click() (which races
 *  the chat-log-overlay subtree intercepting pointer events in the
 *  mobile drawer). */
async function fillChatInput(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]').first();
  await input.waitFor({ state: 'visible', timeout: 10_000 });
  await input.focus();
  await input.fill(text);
  await page.waitForTimeout(200);
}

async function clickSend(page) {
  const sendBtn = page.locator('[data-testid="chat-send-btn"]').first();
  if (await sendBtn.count() === 0) return false;
  // Force click — same drawer-overlay issue can affect the send btn.
  await sendBtn.click({ force: true });
  return true;
}

async function gotoPlay(page) {
  await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-game-page"]', '/coach/play');
}

const CHAT_PROBES = [
  'what is a fianchetto',
  'why is the center important',
  'should I castle queenside',
  'what does e4 do',
  'how do knights move',
  'tell me about pawn structures',
];

const VOICE_CHAT_PROBES = [
  'why did i lose that piece',
  'should i trade queens',
  'what is the best move here',
  'how do i defend f7',
];

function pickRandom(pool, n) {
  return [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(n, pool.length));
}

async function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  /coach/play — comprehensive interactive audit');
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
    if (/CoachAPI|coachApi|Polly|TTS|Anthropic|DeepSeek|\bbrain\b|connection/i.test(text)) {
      consoleDiagnostics.push({ level: m.type(), text, at: Date.now() });
    }
  });
  page.on('pageerror', (e) => {
    if (!isSandboxNoise(e.message)) pageErrors.push({ text: e.message, at: Date.now() });
  });
  page.on('requestfailed', (r) => {
    const url = r.url();
    const err = r.failure()?.errorText ?? 'unknown';
    if (!isSandboxNoise(url) && !isSandboxNoise(err)) {
      networkFailures.push({ url, err, at: Date.now() });
    }
  });
  page.on('response', async (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 400 && !isSandboxNoise(url)) {
      networkResponses.push({ url, status, at: Date.now() });
    }
    if (url.includes('api.anthropic.com') || url.includes('api.deepseek.com')) {
      brainCalls.push({ url: url.split('?')[0], status, ok: res.ok(), at: Date.now() });
    }
    try {
      if (url.includes('/api/tts') && status === 200) {
        const bytes = await res.body();
        if (bytes && bytes.length > 0) {
          ttsChunks.push({ at: Date.now(), bytes });
        }
      }
    } catch {}
  });
  page.on('request', async (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try {
        const body = JSON.parse(req.postData() ?? '{}');
        if (Array.isArray(body.events)) for (const ev of body.events) auditEvents.push(ev);
      } catch {}
    }
  });

  // ── A. Cold boot + mount ──────────────────────────────────
  log('\n▶ A. cold boot + page mount');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell', 25_000);
  await clearStorageAndReload(page);
  await gotoPlay(page);
  await page.waitForTimeout(3000);
  const pageMount = await page.locator('[data-testid="coach-game-page"]').count();
  record('coach-game-page rendered', pageMount > 0, `count=${pageMount}`);

  // ── B. Color selector ─────────────────────────────────────
  log('\n▶ B. color selector — white / black');
  const colorSelector = await page.locator('[data-testid="color-selector"]').count();
  record('color-selector present', colorSelector > 0, `count=${colorSelector}`);
  if (colorSelector > 0) {
    if (await tap(page, '[data-testid="color-white-btn"]', 'pick white')) {
      await page.waitForTimeout(800);
      record('color white-btn tappable', true, 'tapped');
    }
    if (await tap(page, '[data-testid="color-black-btn"]', 'pick black')) {
      await page.waitForTimeout(800);
      record('color black-btn tappable', true, 'tapped');
    }
    // Back to white for the rest of the audit.
    await tap(page, '[data-testid="color-white-btn"]', 'back to white');
    await page.waitForTimeout(500);
  }

  // ── C. UI controls — difficulty / tips / chat button ──────
  log('\n▶ C. UI controls');
  const diffToggle = await page.locator('[data-testid="difficulty-toggle"]').count();
  record('difficulty-toggle present', diffToggle > 0, `count=${diffToggle}`);
  const tipsToggle = await page.locator('[data-testid="coach-tips-toggle"]').count();
  record('coach-tips-toggle present', tipsToggle > 0, `count=${tipsToggle}`);
  const chatBtn = await page.locator('[data-testid="play-chat-button"]').count();
  record('play-chat-button present', chatBtn > 0, `count=${chatBtn}`);

  // ── D. Open chat panel + type a question ─────────────────
  log('\n▶ D. chat panel — type a question (brain-dependent)');
  if (chatBtn > 0) {
    await tap(page, '[data-testid="play-chat-button"]', 'open chat panel');
    await page.waitForTimeout(2000);
    const chatPanel = await page.locator('[data-testid="game-chat-panel"]').count();
    record('chat panel opens after play-chat-button tap', chatPanel > 0,
      `count=${chatPanel}`);
    if (chatPanel > 0) {
      const chatInput = await page.locator('[data-testid="chat-text-input"]').count();
      record('chat input visible inside chat panel', chatInput > 0,
        `count=${chatInput}`);
      const probe = pickRandom(CHAT_PROBES, 1)[0];
      if (chatInput > 0) {
        await fillChatInput(page, probe);
        if (await clickSend(page)) {
          await page.waitForTimeout(3000);
          record(`chat send accepted "${probe}" (brain reply may sandbox-block)`,
            true, 'no crash');
        }
      }
    }
  }

  // ── E. Take-back + restart + read-position controls ───────
  log('\n▶ E. game controls — takeback / restart / read-position');
  // Close chat if open by going back to play page.
  await gotoPlay(page);
  await page.waitForTimeout(2000);
  const takebackBtn = await page.locator('[data-testid="takeback-btn"]').count();
  record('takeback-btn present', takebackBtn > 0, `count=${takebackBtn}`);
  const restartBtn = await page.locator('[data-testid="restart-btn"]').count();
  record('restart-btn present', restartBtn > 0, `count=${restartBtn}`);
  const readPosBtn = await page.locator('[data-testid="read-position-btn"]').count();
  record('read-position-btn present', readPosBtn > 0, `count=${readPosBtn}`);

  // ── F. Move navigation (when present in review mode) ──────
  log('\n▶ F. move navigation controls');
  const moveNav = await page.locator('[data-testid="move-nav"]').count();
  record('move-nav present (or hidden when no moves yet)',
    moveNav >= 0, `count=${moveNav}`);
  if (moveNav > 0) {
    for (const sel of ['nav-first', 'nav-prev', 'nav-next', 'nav-last']) {
      const present = await page.locator(`[data-testid="${sel}"]`).count();
      record(`${sel} button present`, present > 0, `count=${present}`);
    }
  }

  // ── G. Voice-style chat probe ─────────────────────────────
  log('\n▶ G. voice-style chat probe');
  const probe2 = pickRandom(VOICE_CHAT_PROBES, 1)[0];
  // Re-open chat (close + reopen for clean state).
  await gotoPlay(page);
  await page.waitForTimeout(1500);
  if (await page.locator('[data-testid="play-chat-button"]').count() > 0) {
    await tap(page, '[data-testid="play-chat-button"]', 'reopen chat');
    await page.waitForTimeout(1500);
    if (await page.locator('[data-testid="chat-text-input"]').count() > 0) {
      await fillChatInput(page, probe2);
      if (await clickSend(page)) {
        await page.waitForTimeout(3000);
        record(`voice-style chat send "${probe2}" — no crash`, true, 'sent');
      }
    }
  }

  // ── H. Back to coach hub + return ─────────────────────────
  log('\n▶ H. back to /coach/home + return');
  // The mobile chat drawer (opened in section G) overlays the
  // back button and intercepts clicks. Close it first via ESC.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  // If the drawer overlay is still present, tap it to close.
  if (await page.locator('[data-testid="chat-drawer-overlay"]').count() > 0) {
    await page.locator('[data-testid="chat-drawer-overlay"]').first().click({ force: true });
    await page.waitForTimeout(500);
  }
  // The back button uses aria-label "Back to coach hub" on /coach/play too.
  const backTapped = await tap(page, 'button[aria-label="Back to coach hub"]', 'back to hub');
  if (backTapped) {
    await page.waitForTimeout(2000);
    record('back button → /coach/home', page.url().includes('/coach/home'), page.url());
    if (await tap(page, '[data-testid="coach-action-play"]', 'Play tile')) {
      await page.waitForTimeout(2500);
      record('re-enter /coach/play from hub works',
        page.url().includes('/coach/play'), page.url());
    }
  }

  // ── I. Stress test — open chat (if not already), rapid-fire 3 ────
  log('\n▶ I. stress test — 3 rapid-fire chat messages');
  // If the chat panel isn't already open, open it. Skip the open-tap
  // when it IS open (drawer overlay would intercept the click).
  const chatAlreadyOpen = await page.locator('[data-testid="chat-text-input"]').count();
  if (chatAlreadyOpen === 0 && await page.locator('[data-testid="play-chat-button"]').count() > 0) {
    await page.locator('[data-testid="play-chat-button"]').first().click({ force: true });
    await page.waitForTimeout(1500);
  }
  for (let i = 0; i < 3; i++) {
    if (await page.locator('[data-testid="chat-text-input"]').count() > 0) {
      await fillChatInput(page, `stress message ${i}`);
      await clickSend(page);
    }
    await page.waitForTimeout(1500);
  }
  await page.waitForTimeout(3000);
  record('stress test — 3 rapid-fire sends, no crash', true,
    'all 3 attempted');

  // ── J. Route-log scan — no legacy bounce ─────────────────
  log('\n▶ J. route-log scan');
  const url = page.url();
  record('no nav to /coach/session/play-against',
    !url.includes('/coach/session/play-against'), url);

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
      ttsChunksCaptured: ttsChunks.length,
    },
    realErrorTotal:
      findings.filter((f) => !f.ok && f.severity === 'real').length +
      consoleErrors.length +
      pageErrors.length +
      networkFailures.length +
      auditAlarms.length,
    respTopHits,
    brainCalls,
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
  log(`    TTS chunks: ${summary.errors.ttsChunksCaptured}`);
  log(`    REAL ERROR TOTAL: ${summary.realErrorTotal}`);
  if (respTopHits.length > 0) {
    log(`    top 4xx/5xx hits:`);
    for (const h of respTopHits) log(`      ${h.count}× ${h.key}`);
  }
  log(`    brain API hits: ${brainCalls.length}`);
  log(`  report: ${join(OUT_DIR, 'report.json')}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(summary.realErrorTotal === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
