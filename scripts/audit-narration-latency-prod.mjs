#!/usr/bin/env node
/**
 * Focused post-deploy audit for the 2026-06-02 narration + latency fixes:
 *
 *  1. COUNTING REMOVED — walkthrough narration must NOT speak a
 *     move-number prefix ("4…Nf3", "5.O-O"). We drive a DB-narration
 *     walkthrough and scan every coach-narration-spoken event.
 *  2. LIVE BRAIN OFF THE REASONER — a /coach/teach step-by-step move
 *     turn (chat_response) must resolve to a FAST model (deepseek-chat /
 *     claude-sonnet), never deepseek-reasoner, even though the user's
 *     analysis pick is the reasoner. We drive one move turn and read the
 *     coach-llm-model-selected event.
 *
 * 3-instrument: Playwright drives, the listener + intercepted audit POSTs
 * capture emitted events, and we diff the live audit-stream around the run.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-narration-latency-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_HEADED === '1';
const SANDBOX = process.env.AUDIT_SANDBOX === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = join('audit-reports', `narration-latency-${stamp}`);

// Move-number prefix: a 1-2 digit number + "." / "…" / "..." immediately
// before a SAN token. Stats like "92%" or "528 games" never match.
const MOVE_NUMBER_RE = /\b\d{1,2}(?:\.|…|\.\.\.)(?=\s?[NBRQKO]|\s?[a-h][1-8])/;

function sandboxLaunchArgs() {
  return SANDBOX ? ['--ignore-certificate-errors', '--no-sandbox'] : [];
}
function sandboxContextOptions() {
  return SANDBOX ? { ignoreHTTPSErrors: true } : {};
}

async function pullStream(sinceMs) {
  try {
    const secret = process.env.AUDIT_STREAM_SECRET || '';
    const res = await fetch(`${BASE_URL}/api/audit-stream?since=${sinceMs}`, {
      headers: { 'x-audit-secret': secret },
    });
    return await res.json();
  } catch (e) {
    return { error: String(e) };
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  const startMs = Date.now() - 5000;
  const streamBefore = await pullStream(startMs);
  console.log(`[audit] base=${BASE_URL} listener=${listener.url}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath,
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditNarrationBot/1.0 (chromium)',
    ...sandboxContextOptions(),
  });
  await ctx.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch { /* ignore */ }
    },
    { url: listener.url, secret: listener.secret },
  );
  const page = await ctx.newPage();

  const events = [];
  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('/audit-stream') && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        const arr = Array.isArray(body) ? body : (body?.events ?? (body ? [body] : []));
        for (const ev of arr) events.push(ev);
      } catch { /* ignore */ }
    }
  });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => consoleErrors.push('PAGEERROR ' + e.message.slice(0, 300)));

  const result = { base: BASE_URL, startedAt: stamp, build: null, checks: [], violations: [] };
  const add = (name, pass, detail) => {
    result.checks.push({ name, pass, detail });
    console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  async function dismissOnboarding() {
    try {
      const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
      await bubble.waitFor({ state: 'visible', timeout: 8000 });
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* not shown — fine */ }
    try {
      const help = page.locator('[data-testid="page-help-modal"]');
      await help.waitFor({ state: 'visible', timeout: 4000 });
      await page.keyboard.press('Escape');
    } catch { /* none */ }
  }

  try {
    await page.goto(`${BASE_URL}/coach/teach?cb=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 20000 });
    await dismissOnboarding();
    await page.locator('[data-testid="chat-text-input"]').waitFor({ state: 'visible', timeout: 15000 });
    add('S0 /coach/teach mounts', true, '');

    // Read the live build from any emitted event later; meanwhile capture from page.
    result.build = await page.evaluate(() => {
      try { return document.querySelector('meta[name="build"]')?.content || window.__BUILD__ || null; } catch { return null; }
    });

    // ── Drive a DB-narration walkthrough (Catalan Closed — David's case) ──
    async function teach(line) {
      await page.locator('[data-testid="chat-text-input"]').click();
      await page.locator('[data-testid="chat-text-input"]').fill(line);
      await page.locator('[data-testid="chat-send-btn"]').click();
    }
    await teach('Catalan Opening: Closed');
    // The DB seed for ECO data can take 45-60s on a cold context; allow it.
    await page.waitForTimeout(60000);
    // If a line picker surfaced, pick the first concrete line.
    try {
      const picker = page.locator('[data-testid="line-picker"] button, [data-testid="teach-picker-openings"] button');
      if (await picker.count() > 0) { await picker.first().click(); await page.waitForTimeout(45000); }
    } catch { /* ok */ }
    // Step the walkthrough forward several times to emit narration.
    for (let i = 0; i < 10; i++) {
      try {
        const next = page.locator('[data-testid="walkthrough-next"], [data-testid="walkthrough-continue-learning"]');
        if (await next.count() > 0 && await next.first().isVisible().catch(() => false)) {
          await next.first().click();
        }
      } catch { /* ok */ }
      await page.waitForTimeout(3500);
    }

    // ── Drive a step-by-step move turn to exercise the live chat brain ──
    await teach('I played e4. Your move.');
    await page.waitForTimeout(20000);

    // ── Assertions from captured events ──
    const narration = events.filter((e) => e.kind === 'coach-narration-spoken' || (e.summary || '').includes('voiceService.speak'));
    const offenders = narration
      .map((e) => e.data?.textPreview || e.summary || '')
      .filter((t) => MOVE_NUMBER_RE.test(t));
    result.violations = offenders.slice(0, 10);
    add('S1 no move-number prefix in narration', offenders.length === 0,
      `${narration.length} narration events, ${offenders.length} with a count prefix`);

    const modelSel = events.filter((e) => e.kind === 'coach-llm-model-selected');
    const chatModels = modelSel
      .filter((e) => (e.data?.task || '').includes('chat_response') || (e.summary || '').includes('chat_response'))
      .map((e) => e.data?.model || (e.summary || '').match(/model=([\w-]+)/)?.[1])
      .filter(Boolean);
    const reasonerOnChat = chatModels.filter((m) => /reasoner|thinking/i.test(m));
    add('S2 live chat brain off the reasoner', chatModels.length > 0 && reasonerOnChat.length === 0,
      `chat_response models: ${[...new Set(chatModels)].join(', ') || '(none captured)'}`);

    add('S3 no console/page errors', consoleErrors.length === 0,
      consoleErrors.length ? consoleErrors.slice(0, 3).join(' | ') : '');
  } catch (err) {
    add('FATAL', false, String(err).slice(0, 300));
  }

  const streamAfter = await pullStream(startMs);
  result.streamDelta = {
    before: streamBefore?.count ?? null,
    after: streamAfter?.count ?? null,
    storage: streamAfter?.storage ?? null,
  };
  const listenerEvents = listener.getCapturedEvents?.() ?? [];
  result.listenerEvents = listenerEvents.length;
  // Merge listener-captured narration into the violation scan too (the
  // listener is the canonical voice-event sink).
  const listenerNarration = listenerEvents
    .filter((e) => e.kind === 'coach-narration-spoken')
    .map((e) => e.data?.textPreview || e.summary || '')
    .filter((t) => MOVE_NUMBER_RE.test(t));
  if (listenerNarration.length > 0) {
    result.violations = [...result.violations, ...listenerNarration].slice(0, 10);
    const s2 = result.checks.find((c) => c.name.startsWith('S1'));
    if (s2) s2.pass = false;
  }
  result.capturedEvents = events.length;

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(result, null, 2));
  console.log(`\n[audit] report → ${join(OUT_DIR, 'report.json')}`);
  console.log(`[audit] captured ${events.length} POST events, ${listenerEvents.length} listener events; stream ${result.streamDelta.before}→${result.streamDelta.after} (${result.streamDelta.storage})`);
  await browser.close();
  await listener.stop?.();

  const failed = result.checks.filter((c) => !c.pass);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
