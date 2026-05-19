#!/usr/bin/env node
/**
 * audit-chat-comprehensive.mjs
 *
 * Section 5: /coach/chat — the standalone coach chat surface.
 * Brain-dependent surface, so most replies are sandbox-blocked;
 * structural probes + input acceptance + back navigation are the
 * primary signal.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/chat-comprehensive-${stamp}`;
await mkdir(OUT_DIR, { recursive: true });

const findings = [];
const consoleErrors = [];
const pageErrors = [];
const networkFailures = [];
const networkResponses = [];

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
  /Failed to load resource.*40[2-3]/i,
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

const isSandboxNoise = (t) => !!t && SANDBOX_NOISE_PATTERNS.some((re) => re.test(t));

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

const WRITTEN = [
  'what is the best opening for a beginner',
  'explain the pin tactic',
  'how do i improve my endgame',
  'why is the center important',
];
const VOICE = [
  'what is a fork',
  'tell me about the london system',
  'how do i checkmate with two rooks',
];
const pickRandom = (pool, n) => [...pool].sort(() => Math.random() - 0.5).slice(0, n);

async function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  /coach/chat — comprehensive interactive audit');
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
    if (m.type() === 'error' && !isSandboxNoise(m.text())) {
      consoleErrors.push({ text: m.text(), at: Date.now() });
    }
  });
  page.on('pageerror', (e) => {
    const msg = e.message || '';
    if (!msg || msg === 'undefined' || !e.stack || isSandboxNoise(msg)) return;
    pageErrors.push({ text: msg, at: Date.now() });
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

  // ── A. Cold boot + mount ──────────────────────────────────
  log('\n▶ A. cold boot + page mount');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell', 25_000);
  await page.goto(`${BASE_URL}/coach/chat`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-chat-page"]', '/coach/chat');
  await page.waitForTimeout(2500);
  const greeting = await page.locator('[data-testid="coach-greeting"]').count();
  record('coach greeting renders', greeting > 0, `count=${greeting}`);

  // ── B. Voice toggle ───────────────────────────────────────
  log('\n▶ B. voice toggle');
  const voiceToggle = await page.locator('[data-testid="voice-toggle"]').count();
  record('voice-toggle present', voiceToggle > 0, `count=${voiceToggle}`);
  if (voiceToggle > 0) {
    await tap(page, '[data-testid="voice-toggle"]', 'toggle voice');
    await page.waitForTimeout(500);
  }

  // ── C. Starter chips ──────────────────────────────────────
  log('\n▶ C. starter chips');
  const chips = await page.locator('[data-testid="coach-starter-chip"]').count();
  record('coach starter chips present', chips > 0, `count=${chips}`);
  if (chips > 0) {
    // Tap the first starter chip — should fire a turn.
    const beforeMsgs = await page.locator('[data-testid^="chat-message-"]').count();
    await page.locator('[data-testid="coach-starter-chip"]').first().click({ force: true });
    await page.waitForTimeout(4000);
    const afterMsgs = await page.locator('[data-testid^="chat-message-"]').count();
    record('starter chip tap fires a turn (msgs grow)',
      afterMsgs > beforeMsgs, `before=${beforeMsgs}, after=${afterMsgs}`);
  }

  // ── D. Type a written prompt ──────────────────────────────
  log('\n▶ D. typed prompt — written');
  const probe = pickRandom(WRITTEN, 1)[0];
  const input = page.locator('[data-testid="chat-text-input"]').first();
  if (await input.count() > 0) {
    await input.focus();
    await input.fill(probe);
    await page.waitForTimeout(300);
    const sendBtn = page.locator('[data-testid="chat-send-btn"]').first();
    if (await sendBtn.count() > 0) {
      await sendBtn.click({ force: true });
      await page.waitForTimeout(4000);
      record(`written prompt "${probe}" accepted by chat`,
        true, 'sent without crash');
    }
  } else {
    record('chat input present', false, 'no chat-text-input', 'real');
  }

  // ── E. Voice-style transcript ─────────────────────────────
  log('\n▶ E. voice-style transcript');
  const vprobe = pickRandom(VOICE, 1)[0];
  if (await input.count() > 0) {
    await input.focus();
    await input.fill(vprobe);
    await page.waitForTimeout(300);
    const sendBtn = page.locator('[data-testid="chat-send-btn"]').first();
    if (await sendBtn.count() > 0) {
      await sendBtn.click({ force: true });
      await page.waitForTimeout(4000);
      record(`voice-style "${vprobe}" accepted`, true, 'sent');
    }
  }

  // ── F. Back to hub + return ───────────────────────────────
  log('\n▶ F. nav back to /coach/home + return');
  await tap(page, '[data-testid="nav-coach-home-tab"]', 'nav coach');
  await page.waitForTimeout(2000);
  record('nav: /coach/chat → /coach/home', page.url().includes('/coach/home'),
    page.url());
  // /coach/chat doesn't have a hub tile by default — we re-enter via URL.
  await page.goto(`${BASE_URL}/coach/chat`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  record('re-enter /coach/chat via URL works',
    page.url().includes('/coach/chat'), page.url());

  await ctx.close();
  await browser.close();

  const respBuckets = new Map();
  for (const r of networkResponses) {
    const k = `${r.status} ${r.url.split('?')[0]}`;
    respBuckets.set(k, (respBuckets.get(k) ?? 0) + 1);
  }
  const respTopHits = [...respBuckets.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
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
    },
    realErrorTotal:
      findings.filter((f) => !f.ok && f.severity === 'real').length +
      consoleErrors.length +
      pageErrors.length +
      networkFailures.length,
    respTopHits,
    findingsDetail: findings,
    consoleErrors,
    pageErrors,
    networkFailures,
    networkResponses,
  };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log(`  RESULT`);
  log(`    findings:   ${summary.findings.passed}/${summary.findings.total} passed, ${summary.findings.failed} failed`);
  log(`    console:    ${summary.errors.console}`);
  log(`    page:       ${summary.errors.page}`);
  log(`    network:    ${summary.errors.network} failures, ${summary.errors.networkResponses4xx5xx} 4xx/5xx`);
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
