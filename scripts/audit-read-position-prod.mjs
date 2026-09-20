#!/usr/bin/env node
/**
 * audit-read-position-prod — focused probe for the "Read this position"
 * coach-play affordance (usePositionNarration).
 *
 * 🔴 CONTRACT CHANGE 2026-09-19. This audit used to wait for
 * `[data-testid="position-narration-banner"]` and check it was sticky. That
 * banner was DELETED on 2026-07-10 (e81f758eb, David: "read position and phase
 * narration needs to go in the chat section. No more special place for them")
 * — nothing in `src/` renders it — so the wait timed out on every run and the
 * fleet recorded "voice fires but the banner never appears" (PLAN §C #59) as a
 * product defect for two months. It was a dead selector: the calibration-bubble
 * class (`noDeadCalibrationBubble.test.ts`).
 *
 * The read now streams into the game chat as ONE growing assistant bubble
 * (`GameChatPanel.streamAssistantMessage`), and the voice still plays live.
 * What this audit proves today:
 *   1. Tapping the button adds exactly one new assistant message and its text
 *      GROWS while the read is in flight (the streaming contract).
 *   2. The read text is gate-clean (you/they — never we/our) and non-trivial.
 *   3. The voice path engages EVEN ON coachNarration='silent' — the explicit
 *      tap is the G5 read-aloud carve-out (`speakReadAloud`), so a dead
 *      control here is the 2026-06-12 regression. Two instruments: the
 *      narration listener sidecar sees a `coach-narration-spoken` event from
 *      `voiceService.*` carrying the read, AND a `/api/tts` request fires. The
 *      request IS the instrument for the bypass, so it is intercepted with
 *      `blockTtsNetwork` (G1 class 2), never muted — the provider still never
 *      sees a byte.
 *
 * NOTE: headless Chromium can't reproduce the iOS-standalone-PWA
 * web-speech-after-async-gap block, so "voice physically audible on an iPhone"
 * is NOT something this proves — that caveat is flagged to David.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-read-position-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/read-position-${stamp}`;

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` → ${detail}` : ''}`);
}

async function clearOverlays(page) {
  // The page-help modal can pop a beat AFTER navigation settles — wait briefly
  // for it, dismiss, loop (it re-opens per surface). The strength-calibration
  // bubble that used to be handled here was removed from the app on
  // 2026-09-02; `autoDismissCalibration` (init script) still neutralises any
  // overlay by CSS, so nothing here may BLOCK on a testid.
  await page.locator('[data-testid="page-help-modal"]').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 4; i++) {
    const help = page.locator('[data-testid="page-help-modal"]');
    if (!(await help.count())) break;
    const close = page.locator('[data-testid="page-help-close"]');
    if (await close.count()) await close.first().click({ timeout: 4000 }).catch(() => {});
    else await page.keyboard.press('Escape').catch(() => {});
    await help.waitFor({ state: 'detached', timeout: 10000 }).catch(() => {});
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`[read-position] base = ${BASE_URL}`);

  const browser = await chromium.launch({
    headless: !HEADED,
    executablePath: await resolveChromiumExecutable(HEADED),
    args: sandboxLaunchArgs(),
  });
  const listener = await startAuditListener();
  console.log(`[listener] up at ${listener.url}`);
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(({ url, secret }) => {
    try { window.localStorage.setItem('auditStreamUrl', url); window.localStorage.setItem('auditStreamSecret', secret); } catch { /* ignore */ }
  }, { url: listener.url, secret: listener.secret });
  await context.addInitScript(autoDismissCalibration);
  const page = await context.newPage();
  await blockTtsNetwork(page);   // instrument keeps the request; the provider never sees it

  const ttsRequests = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/tts')) ttsRequests.push(req.url());
  });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await clearOverlays(page);

    // Force coachNarration = 'silent' so we prove the explicit read still
    // engages the voice path (the dead-button regression).
    await page.evaluate(async () => {
      const open = indexedDB.open('ChessAcademyDB');
      await new Promise((resolve) => {
        open.onsuccess = () => {
          const db = open.result;
          try {
            const tx = db.transaction('profiles', 'readwrite');
            const store = tx.objectStore('profiles');
            const getReq = store.get('main');
            getReq.onsuccess = () => {
              const p = getReq.result;
              if (p) {
                p.preferences = { ...(p.preferences || {}), coachNarration: 'silent', voiceEnabled: true, cloudEnabled: true };
                store.put(p);
              }
              resolve();
            };
            getReq.onerror = () => resolve();
          } catch { resolve(); }
        };
        open.onerror = () => resolve();
      });
    });

    // Navigate to /coach/play.
    await page.goto(`${BASE_URL}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await clearOverlays(page);
    await page.waitForTimeout(3000);

    // Make a couple of moves so there's a non-trivial position to read.
    async function move(from, to) {
      await page.locator(`[data-square="${from}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(200);
      await page.locator(`[data-square="${to}"]`).first().click({ timeout: 2500 }).catch(() => {});
      await page.waitForTimeout(2500);
    }
    await move('e2', 'e4');
    await move('g1', 'f3');

    // The chat renders NEWEST FIRST and every assistant bubble carries a
    // literal "C" badge div before the body — read the BODY only, and never
    // identify the read by index: tips and move commentary land in the same
    // list while the read streams. The read is the bubble whose text GROWS
    // while the button reads "Restart position narration".
    const bubbles = page.locator('[data-testid="chat-message-assistant"]');
    const bodyTexts = () => bubbles.evaluateAll((els) => els.map((el) => {
      const body = Array.from(el.children).find((c) => c.getAttribute('data-testid') !== 'coach-badge');
      return (body?.textContent ?? '').trim();
    }));
    const before = await bodyTexts();
    const btn = page.locator('[data-testid="read-position-btn"]');
    check('read-position button present', (await btn.count()) > 0);
    if (await btn.count()) {
      await btn.first().click({ timeout: 4000 });
    }

    // 1. A new bubble appears and one bubble's text GROWS while narrating.
    const appeared = await page.waitForFunction(
      (n) => document.querySelectorAll('[data-testid="chat-message-assistant"]').length > n, before.length, { timeout: 90000 },
    ).then(() => true).catch(() => false);
    check('a new assistant chat bubble appears after the tap (the banner is gone — 2026-07-10)', appeared);
    let finalText = '';
    if (appeared) {
      const growth = new Map(); // first-seen text → latest text, keyed by position from the bottom (stable under newest-first)
      const t0 = Date.now();
      let narrating = true;
      while (Date.now() - t0 < 60000) {
        const now = await bodyTexts();
        // key by index from the END so prepended bubbles do not shift keys
        now.forEach((t, i) => { const k = now.length - 1 - i; if (k >= before.length) { const g = growth.get(k) ?? []; if (t && t !== g[g.length - 1]) g.push(t); growth.set(k, g); } });
        narrating = await btn.first().getAttribute('aria-label').then((a) => /Restart/i.test(a ?? '')).catch(() => false);
        if (!narrating && [...growth.values()].some((g) => g.length >= 1 && g[g.length - 1].length > 40)) break;
        await page.waitForTimeout(400);
      }
      const streams = [...growth.values()].filter((g) => g.length >= 2 && g[g.length - 1].length > g[0].length);
      const readSamples = streams.sort((a, b) => b[b.length - 1].length - a[a.length - 1].length)[0] ?? [...growth.values()].sort((a, b) => (b[b.length - 1]?.length ?? 0) - (a[a.length - 1]?.length ?? 0))[0] ?? [];
      finalText = readSamples[readSamples.length - 1] ?? '';
      check('the read STREAMS into its bubble (text grows while in flight)', streams.length >= 1, `${readSamples.length} growth step(s), ${finalText.length} chars; ${growth.size} new bubble(s) during the read`);
      check('the read is non-trivial', finalText.length >= 40, finalText.slice(0, 120));
      check('the read is gate-clean (you/they or coach-as-opponent I/my — never we/our)', !/\b(we|our|us|ours)\b/i.test(finalText), finalText.match(/\b(we|our|us|ours)\b/i)?.[0] ?? '');
      results.push({ name: 'NEW BUBBLES DURING READ', pass: true, detail: JSON.stringify([...growth.values()].map((g) => g[g.length - 1]?.slice(0, 160))) });
    }

    // 3. Voice path engaged despite coachNarration='silent' (the 2026-06-12
    //    dead-control regression): the listener saw voiceService speak the read
    //    AND a /api/tts request fired (speakReadAloud bypasses the gate).
    await page.waitForTimeout(6000);
    const spoken = listener.getCapturedEvents()
      .filter((e) => e.kind === 'coach-narration-spoken' && String(e.source ?? '').startsWith('voiceService.') && e.narrationText);
    check('narration listener saw voiceService speak the read', spoken.length > 0, `${spoken.length} spoken event(s)`);
    check('voice path engaged (/api/tts fired) on silent', ttsRequests.length > 0, `${ttsRequests.length} tts request(s)`);
    results.push({ name: 'READ TEXT', pass: true, detail: finalText });
    // The narrations are the product (David: "show me the narrations as well").
    results.push({ name: 'SPOKEN (voiceService)', pass: true, detail: spoken.map((e) => `[${e.source}] ${String(e.narrationText).slice(0, 160)}`).join(' ‖ ') });

    check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
    check('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

    await page.screenshot({ path: `${OUT_DIR}/read-position.png`, fullPage: false }).catch(() => {});
  } finally {
    await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ base: BASE_URL, results, ttsRequests, listenerEvents: listener.getCapturedEvents().length, listenerByKind: listener.getCapturedEvents().reduce((m, e) => ({ ...m, [e.kind]: (m[e.kind] ?? 0) + 1 }), {}), voiceEvents: listener.getCapturedEvents().filter((e) => /voice|tts|polly|narration/i.test(e.kind ?? '')).map((e) => ({ kind: e.kind, source: e.source, summary: String(e.summary ?? '').slice(0, 160) })), consoleErrors, pageErrors }, null, 2));
    await browser.close();
    await listener.close?.();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n[read-position] ${results.length - failed.length}/${results.length} green — report: ${OUT_DIR}/report.json`);
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
