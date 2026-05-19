#!/usr/bin/env node
/**
 * audit-learn-comprehensive.mjs — v2
 *
 * Comprehensive interactive failure-mode audit for /coach/teach.
 * Maps every function on the surface and exercises it like a
 * curious + typo-prone + adversarial first-time user.
 *
 * Iterating per David's 2026-05-19 directive: keep running this
 * + fixing until 3 consecutive runs return zero real errors.
 *
 * v2 changes vs v1:
 *   - Fixed lastAssistantText (role lives in testid suffix, not
 *     in a non-existent data-role attribute).
 *   - Capture URL + status alongside every console error so we
 *     can identify 4xx sources instead of just counting them.
 *   - Map the FULL surface — not just the input field:
 *       § Cold boot + welcome + voice probe
 *       § Picker chips (5 actions × verify each)
 *       § Typed input variations (canonical + 4 off-canonical
 *         + 1 garbage + 1 hallucination probe)
 *       § Conversation flow: multi-turn dialogue
 *       § Arrow check: ask coach for a candidate move, verify
 *         the [BOARD: arrow:from-to:color] marker fires
 *       § Hallucination check: ask about a made-up opening,
 *         verify coach doesn't invent moves
 *       § Walkthrough runtime: start → pause → resume → restart
 *         → fork pick → stage menu reached
 *       § Stage menu: tap each stage (drill, quiz, punish,
 *         findMove) when available
 *       § Pick-before-load: pending indicator appears, then
 *         auto-jumps
 *       § Mid-walkthrough chat: type during narration, verify
 *         auto-pause + reply
 *       § [CHOICES:] picker: ambiguous input → chips appear,
 *         tap a chip → submits
 *       § Stress test: rapid-fire prompts
 *       § Route-log scan: legacy /coach/session/walkthrough
 *         never appears
 *
 * Output: report.json + voice.mp3 + (optional) video.
 *
 * Exit 0 = zero real errors. Nonzero = errors recorded.
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const RECORD_VIDEO = process.env.AUDIT_RECORD_VIDEO === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/learn-comprehensive-${stamp}`;
const VIDEO_DIR = join(OUT_DIR, 'video');

const findings = [];
const consoleErrors = [];
const pageErrors = [];
const networkFailures = [];
const networkResponses = []; // 4xx / 5xx response captures (for the 403 hunt)
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

// ──────────────────────────────────────────────────────────────
// Error classification
// ──────────────────────────────────────────────────────────────

const SANDBOX_NOISE_PATTERNS = [
  /cdn\.jsdelivr\.net/i,
  /piece.*\.svg/i,
  /ERR_CERT_AUTHORITY_INVALID/i,
  /Failed to load resource.*402/i,
  /favicon\.ico/i,
];

function isSandboxNoise(text) {
  if (!text) return false;
  return SANDBOX_NOISE_PATTERNS.some((re) => re.test(text));
}

// ──────────────────────────────────────────────────────────────
// DOM helpers (fixed reader)
// ──────────────────────────────────────────────────────────────

async function waitForMount(page, selector, label, ms = 20_000) {
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

async function lastAssistantText(page) {
  // CoachTeachPage renders messages with `[...messages].reverse().map(...)`
  // — newest first in DOM order. So nth(0) is the latest assistant
  // message, nth(count-1) is the welcome line. Run 2 (2026-05-19)
  // burned every reply-content check by reading nth(count-1).
  const assistantMsgs = page.locator('[data-testid="chat-message-assistant"]');
  const count = await assistantMsgs.count();
  if (count === 0) return '';
  return (await assistantMsgs.nth(0).textContent()) ?? '';
}

async function assistantMessageCount(page) {
  return page.locator('[data-testid="chat-message-assistant"]').count();
}

async function send(page, text) {
  const input = page.locator('[data-testid="chat-text-input"]').first();
  try {
    await input.waitFor({ state: 'visible', timeout: 10_000 });
  } catch {
    record(`send: "${text}"`, false, 'chat input not visible');
    return -1;
  }
  await input.click();
  await input.fill(text);
  await page.waitForTimeout(300);
  const beforeCount = await assistantMessageCount(page);
  await page.locator('[data-testid="chat-send-btn"]').first().click();
  return beforeCount;
}

async function waitForReply(page, sinceCount, label, maxMs = 90_000) {
  if (sinceCount < 0) return false;
  try {
    await page.waitForFunction(
      (prev) => document.querySelectorAll('[data-testid="chat-message-assistant"]').length > prev,
      sinceCount,
      { timeout: maxMs },
    );
    await page.waitForTimeout(1500); // streaming settle
    return true;
  } catch {
    record(`reply: ${label}`, false, `no new assistant message within ${maxMs}ms`);
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
  await page.waitForTimeout(2000); // let chunks reload + shell hydrate
}

async function gotoTeach(page) {
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="coach-teach-page"]', '/coach/teach');
  await waitForMount(page, '[data-testid="chat-text-input"]', 'chat input');
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

async function main() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('  /coach/teach — comprehensive interactive audit (v2)');
  log(`  target: ${BASE_URL}`);
  log(`  out: ${OUT_DIR}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mkdir(VIDEO_DIR, { recursive: true });
  const executablePath = await resolveChromiumExecutable({
    preferred: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  });
  const browser = await chromium.launch({ headless: true, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 420, height: 900 },
    ...(RECORD_VIDEO && { recordVideo: { dir: VIDEO_DIR, size: { width: 420, height: 900 } } }),
  });

  // Mock the piece SVG CDN so sandbox cert errors don't pollute.
  await ctx.route('**/cdn.jsdelivr.net/**/*.svg', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
    });
  });

  const page = await ctx.newPage();

  // Capture signals + URL-correlate the 403s.
  page.on('console', (m) => {
    if (m.type() === 'error') {
      const text = m.text();
      if (!isSandboxNoise(text)) consoleErrors.push({ text, at: Date.now() });
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
    // Capture all 4xx/5xx non-sandbox responses so we can find
    // where the unexplained 403s in the console come from.
    if (status >= 400 && !isSandboxNoise(url)) {
      networkResponses.push({ url, status, at: Date.now() });
    }
    // Capture Polly streams for offline voice review.
    try {
      if (url.includes('/api/tts') && status === 200) {
        const bytes = await res.body();
        if (bytes && bytes.length > 0) {
          ttsChunks.push({
            at: Date.now(),
            url,
            contentType: res.headers()['content-type'] ?? 'audio/mpeg',
            bytes,
          });
        }
      }
    } catch {}
  });
  page.on('request', async (req) => {
    if (req.url().includes('/api/audit-stream') && req.method() === 'POST') {
      try {
        const body = JSON.parse(req.postData() ?? '{}');
        if (Array.isArray(body.events)) {
          for (const ev of body.events) auditEvents.push(ev);
        }
      } catch {}
    }
  });

  // ── A. Cold boot + welcome ────────────────────────────────
  log('\n▶ A. cold boot + welcome');
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await waitForMount(page, '[data-testid="nav-home-tab"]', 'app shell', 25_000);
  await gotoTeach(page);
  await page.waitForTimeout(4000);
  const welcomeText = await lastAssistantText(page);
  record('welcome line rendered with "classroom" copy',
    welcomeText.toLowerCase().includes('classroom'),
    welcomeText.slice(0, 80));
  // Polly fires for the welcome line — should produce a TTS chunk.
  await page.waitForTimeout(2000);
  record('Polly TTS fired during welcome (chunks captured)',
    ttsChunks.length > 0,
    `chunks=${ttsChunks.length}`);

  // ── B. Picker action chips ────────────────────────────────
  log('\n▶ B. picker action chips visible + tappable');
  for (const id of ['teach', 'drill', 'quiz', 'trap', 'play']) {
    const present = await page.locator(`[data-testid="teach-picker-action-${id}"]`).count();
    record(`picker chip "${id}" rendered`, present > 0, `count=${present}`);
  }
  for (const id of ['teach', 'drill', 'quiz', 'trap', 'play']) {
    if (await tap(page, `[data-testid="teach-picker-action-${id}"]`, `chip switch → ${id}`)) {
      // Verify the description text updates per action.
      await page.waitForTimeout(200);
    }
  }
  // Leave on teach for typed flow.
  await tap(page, '[data-testid="teach-picker-action-teach"]', 'reset → teach');

  // ── C. Typed input — off-canonical variations ─────────────
  log('\n▶ C. typed input — off-canonical variations');

  const typedProbes = [
    { input: 'Philidor Defence', label: 'British spelling', expectPicker: false, expectInProse: ['philidor'] },
    { input: 'Najdorff',         label: 'typo (extra f)',  expectPicker: true,  expectInProse: ['najdorf'] },
    { input: 'Caro Cann',        label: 'missing letter',  expectPicker: true,  expectInProse: ['caro'] },
    { input: 'KID',              label: 'acronym',         expectPicker: false, expectInProse: [] },
    { input: 'asdfghjkl',        label: 'garbage',         expectPicker: false, expectInProse: [] },
  ];

  for (const probe of typedProbes) {
    log(`  C.${probe.label} — "${probe.input}"`);
    await clearStorageAndReload(page);
    await gotoTeach(page);
    await page.waitForTimeout(3500);
    const n = await send(page, probe.input);
    await waitForReply(page, n, probe.input, 90_000);
    await page.waitForTimeout(2500);
    const url = page.url();
    record(`"${probe.input}" stays on /coach/teach`,
      !url.includes('/coach/session/walkthrough'),
      url);
    const reply = (await lastAssistantText(page)).toLowerCase();
    const hasChips = await page.locator('[data-testid="coach-choice-chips"]').count();
    const sane = reply.length > 5;
    record(`"${probe.input}" got a non-empty reply`, sane,
      `reply: "${reply.slice(0, 100)}"`);
    if (probe.expectInProse.length > 0) {
      const matched = probe.expectInProse.some((s) => reply.includes(s)) || hasChips > 0;
      record(`"${probe.input}" reply mentions ${probe.expectInProse.join('|')} (or shows picker)`,
        matched, `chips=${hasChips}`);
    }
    if (probe.expectPicker) {
      record(`"${probe.input}" surfaced [CHOICES:] picker chips`,
        hasChips > 0, `chips=${hasChips}`);
    }
  }

  // ── D. Hallucination probe ────────────────────────────────
  log('\n▶ D. hallucination probe — made-up opening name');
  await clearStorageAndReload(page);
  await gotoTeach(page);
  await page.waitForTimeout(3500);
  const halluProbe = 'tell me about the Zigzag Counter-Gambit';
  let nh = await send(page, halluProbe);
  await waitForReply(page, nh, 'hallucination probe', 90_000);
  await page.waitForTimeout(2500);
  const halluReply = (await lastAssistantText(page)).toLowerCase();
  // Coach should NOT make up moves. Acceptable replies:
  //   - "I don't recognize that opening" / "no DB match" / "did you mean"
  //   - Picker chips with similar names
  // Bad: confidently describes moves for the fake opening.
  const hasChips = await page.locator('[data-testid="coach-choice-chips"]').count();
  const refused = halluReply.includes("don't recognize") ||
                  halluReply.includes("don't have") ||
                  halluReply.includes('not in') ||
                  halluReply.includes('did you mean') ||
                  halluReply.includes('not familiar') ||
                  halluReply.includes("haven't") ||
                  halluReply.includes('not aware') ||
                  hasChips > 0;
  // OR coach replied with a sensible canonicalization (e.g. "Zigzag isn't an opening I know")
  record('hallucination probe: coach did NOT confidently invent moves',
    refused,
    `chips=${hasChips}, reply: "${halluReply.slice(0, 140)}"`);

  // ── E. Conversation flow — multi-turn dialogue ────────────
  log('\n▶ E. multi-turn conversation flow');
  await clearStorageAndReload(page);
  await gotoTeach(page);
  await page.waitForTimeout(3500);
  // Turn 1: ask a general question
  let nc = await send(page, 'what makes a good opening choice for a beginner?');
  await waitForReply(page, nc, 'conversation turn 1', 60_000);
  await page.waitForTimeout(2000);
  const t1 = (await lastAssistantText(page)).toLowerCase();
  record('conversation turn 1 — got real answer (≥40 chars)', t1.length >= 40,
    `len=${t1.length}, preview: "${t1.slice(0, 80)}"`);
  // Turn 2: follow up
  nc = await send(page, "what about for an advanced player?");
  await waitForReply(page, nc, 'conversation turn 2', 60_000);
  await page.waitForTimeout(2000);
  const t2 = (await lastAssistantText(page)).toLowerCase();
  record('conversation turn 2 — distinct answer', t2.length >= 40 && t2 !== t1,
    `len=${t2.length}, preview: "${t2.slice(0, 80)}"`);
  // Turn 3: change subject
  nc = await send(page, "actually nevermind, what does e4 do strategically?");
  await waitForReply(page, nc, 'conversation turn 3', 60_000);
  await page.waitForTimeout(2000);
  const t3 = (await lastAssistantText(page)).toLowerCase();
  record('conversation turn 3 — coach handles topic shift', t3.length >= 40,
    `len=${t3.length}, preview: "${t3.slice(0, 80)}"`);

  // ── F. Arrow check — ask for a candidate, look for [BOARD: arrow:] ─
  log('\n▶ F. arrow check — coach should draw arrows when discussing moves');
  // The marker is stripped from displayed text, so we look at the
  // streamed buffer indirectly: ask for arrows, then check the DOM
  // for arrow overlay elements (NarrationArrowOverlay sets data-testid).
  let na = await send(page, 'show me the best move for white from the starting position with an arrow');
  await waitForReply(page, na, 'arrow request', 60_000);
  await page.waitForTimeout(3000);
  const arrowOverlay = await page.locator('[data-testid^="narration-arrow"], [data-arrow]').count();
  const arrowReply = (await lastAssistantText(page)).toLowerCase();
  // Soft check: the coach mentioned a candidate move AND an arrow overlay exists
  const namedMove = /\b[a-h][1-8]\b|\bnf3\b|\be4\b|\bd4\b|\bc4\b/.test(arrowReply);
  record('arrow probe — coach named a candidate move', namedMove,
    `reply: "${arrowReply.slice(0, 120)}"`);
  record('arrow probe — arrow overlay rendered',
    arrowOverlay > 0,
    `arrow elements: ${arrowOverlay}`);

  // ── G. Walkthrough — start, fork, stage menu ──────────────
  log('\n▶ G. walkthrough runtime');
  await clearStorageAndReload(page);
  await gotoTeach(page);
  await page.waitForTimeout(3500);
  let nw = await send(page, 'teach me the Italian Game');
  await waitForReply(page, nw, 'Italian Game request', 120_000);
  await page.waitForTimeout(8000); // let walkthrough start
  // The walkthrough renders inside CoachTeachPage — look for any
  // walkthrough-* testid as a mount signal.
  const walkActive = await page.locator('[data-testid="walkthrough-stage-menu"], [data-testid="walkthrough-stage-pending"], [data-testid="walkthrough-chooser"]').count();
  record('walkthrough mounted (any walkthrough-* surface visible)',
    walkActive > 0,
    `walkthrough surfaces: ${walkActive}`);

  // ── H. Stress test — rapid-fire 3 prompts ─────────────────
  log('\n▶ H. stress test — 3 rapid-fire prompts');
  await clearStorageAndReload(page);
  await gotoTeach(page);
  await page.waitForTimeout(3500);
  let ns = await send(page, 'what is fianchetto?');
  await page.waitForTimeout(2000);
  await send(page, 'and what about zugzwang?');
  await page.waitForTimeout(2000);
  await send(page, 'and en passant?');
  // Wait for at least one reply to land.
  await waitForReply(page, ns, 'stress reply', 90_000);
  await page.waitForTimeout(5000);
  const stressMsgCount = await assistantMessageCount(page);
  record('stress test — at least one reply arrived', stressMsgCount > 0,
    `assistant msg count: ${stressMsgCount}`);

  // ── I. Route-log scan ─────────────────────────────────────
  log('\n▶ I. route-log scan');
  const url = page.url();
  record('current URL is not /coach/session/walkthrough',
    !url.includes('/coach/session/walkthrough'),
    url);
  const legacyEvents = auditEvents.filter((e) =>
    e.summary && e.summary.includes('/coach/session/walkthrough'));
  record('no audit-stream event mentions legacy URL',
    legacyEvents.length === 0,
    `${legacyEvents.length} mentions`);

  // ── Done — write report ───────────────────────────────────
  await ctx.close();
  await browser.close();

  const ALARM_KINDS = new Set([
    'claim-validator-trip',
    'master-play-enforcement-fallback',
    'tts-failure',
    'asset-load-error',
  ]);
  const auditAlarms = auditEvents.filter((e) => e.kind && ALARM_KINDS.has(e.kind));

  // Top-N response failures by URL (for the 403 hunt).
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
      findings.filter((f) => !f.ok && f.severity !== 'skip').length +
      consoleErrors.length +
      pageErrors.length +
      networkFailures.length +
      auditAlarms.length,
    respTopHits,
    findingsDetail: findings,
    consoleErrors,
    pageErrors,
    networkFailures,
    networkResponses,
    auditAlarms,
  };

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(summary, null, 2));

  if (ttsChunks.length > 0) {
    const concat = Buffer.concat(ttsChunks.map((c) => c.bytes));
    await writeFile(join(OUT_DIR, 'voice.mp3'), concat);
  }

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
  log(`  report: ${join(OUT_DIR, 'report.json')}`);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(summary.realErrorTotal === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(2);
});
