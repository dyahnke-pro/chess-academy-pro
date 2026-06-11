/**
 * audit-coach-player-game
 * -----------------------
 * 3-INSTRUMENT audit (G1) for the deterministic player-game surface on
 * /coach/teach (David 2026-06-11).
 *
 * The bug this guards: typing "show me a game that magnus played the
 * catalan opening" got fuzzy-matched as an OPENING NAME and bounced with
 * "I don't have an exact match … Did you mean Catalan Opening?" — the
 * player-game lookup was never reached, even though Carlsen's Catalan wins
 * ship on disk. This audit proves the new deterministic branch routes the
 * ask to lookup_player_games (no LLM) and WALKS the real game in-page —
 * never the fuzzy "did you mean" picker.
 *
 * Three instruments:
 *   1. Playwright — drives /coach/teach, types the asks, asserts the
 *      in-page model-game runner mounts + the transcript names a real game.
 *   2. Audit-stream interception — captures the coach-surface-migrated
 *      "player-game … mounted N-ply game" routing event (what the app DID).
 *   3. Narration listener sidecar — attached. A model-game walk is SILENT
 *      by design (no authored narration), so an empty voice delta here is
 *      CORRECT, not a miss.
 *
 * Sandbox note: lookup_player_games is a pure READ of bundled JSON (fetched
 * from /data/pro-game-references.json) — no IndexedDB WRITE, so the
 * write-stall caveat does NOT apply. Runs against prod by default.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-coach-player-game.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const SANDBOX = process.env.AUDIT_SANDBOX === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-player-game-${stamp}`;
const BOOT_TIMEOUT_MS = 30_000;

async function waitForEvent(intercepted, predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (intercepted.some(predicate)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function dismissOnboarding(page) {
  const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bubble.count().catch(() => 0)) {
    await bubble.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => undefined);
    await bubble.first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
  }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count().catch(() => 0)) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(300);
  }
}

async function ask(page, text) {
  await page.locator('[data-testid="chat-text-input"]').click();
  await page.locator('[data-testid="chat-text-input"]').fill(text);
  await page.locator('[data-testid="chat-send-btn"]').click();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  console.log(`[pg] base     = ${BASE_URL}`);
  console.log(`[pg] listener = ${listener.url}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const launchArgs = SANDBOX ? ['--ignore-certificate-errors', '--no-sandbox'] : [];
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: launchArgs });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditPlayerGameBot/1.0 (chromium)',
    ignoreHTTPSErrors: true,
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
      } catch { /* ignore */ }
    }
  });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.message.slice(0, 300)));

  const report = { base: BASE_URL, startedAt: stamp, scenarios: [] };

  async function snapshot(name) {
    const p = join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: p, fullPage: false }).catch(() => undefined);
    return p;
  }

  async function recordScenario(name, options) {
    const startIdx = intercepted.length;
    const errsBefore = pageErrors.length;
    const t0 = Date.now();
    console.log(`\n[pg] ${name}`);
    let err = null;
    try { await options.run(); } catch (e) { err = String(e?.message ?? e); console.log(`  [error] ${err}`); }
    const screenshot = await snapshot(name);
    const events = intercepted.slice(startIdx);
    const routing = events.filter((e) => e.kind === 'coach-surface-migrated').map((e) => e.summary);
    for (const s of routing) console.log(`    routing: ${s}`);

    const assertions = [];
    for (const a of options.assertions ?? []) {
      let ok = false, actual = '?';
      try {
        if (a.kind === 'visible') {
          const count = await page.locator(a.selector).count();
          const visible = count > 0 ? await page.locator(a.selector).first().isVisible().catch(() => false) : false;
          actual = visible ? 'visible' : `not-visible (count=${count})`;
          ok = visible;
        } else if (a.kind === 'transcript-contains') {
          const t = await page.locator('[data-testid="teach-transcript"]').innerText({ timeout: 2000 }).catch(() => '');
          actual = String(t).slice(-200);
          ok = String(t).toLowerCase().includes(String(a.value).toLowerCase());
        } else if (a.kind === 'transcript-absent') {
          const t = await page.locator('[data-testid="teach-transcript"]').innerText({ timeout: 2000 }).catch(() => '');
          actual = String(t).toLowerCase().includes(String(a.value).toLowerCase()) ? `FOUND "${a.value}"` : 'absent (good)';
          ok = !String(t).toLowerCase().includes(String(a.value).toLowerCase());
        } else if (a.kind === 'audit-summary-contains') {
          const m = events.find((e) => (e.summary ?? '').toLowerCase().includes(String(a.value).toLowerCase()));
          actual = m ? `${m.kind}: ${(m.summary ?? '').slice(0, 110)}` : 'absent';
          ok = !!m;
        } else if (a.kind === 'audit-absent-summary') {
          const m = events.find((e) => (e.summary ?? '').toLowerCase().includes(String(a.value).toLowerCase()));
          actual = m ? `FOUND: ${(m.summary ?? '').slice(0, 90)}` : 'absent (good)';
          ok = !m;
        } else if (a.kind === 'audit-global-all') {
          // Search the FULL intercepted list (not the scenario slice) for an
          // event whose summary contains EVERY substring — the audit-stream
          // POSTs in batches that can land a scenario late, so window-slicing
          // is unreliable for routing events. Keying on the scenario's unique
          // query text makes the match scenario-correct regardless of timing.
          const subs = (Array.isArray(a.value) ? a.value : [a.value]).map((s) => String(s).toLowerCase());
          const m = intercepted.find((e) => {
            const s = (e.summary ?? '').toLowerCase();
            return subs.every((sub) => s.includes(sub));
          });
          actual = m ? `${(m.summary ?? '').slice(0, 120)}` : `no global event with [${subs.join(' + ')}]`;
          ok = !!m;
        } else if (a.kind === 'audit-global-absent') {
          const subs = (Array.isArray(a.value) ? a.value : [a.value]).map((s) => String(s).toLowerCase());
          const m = intercepted.find((e) => {
            const s = (e.summary ?? '').toLowerCase();
            return subs.every((sub) => s.includes(sub));
          });
          actual = m ? `FOUND: ${(m.summary ?? '').slice(0, 90)}` : 'absent (good)';
          ok = !m;
        }
      } catch (e) { actual = `error: ${e.message?.slice(0, 80)}`; }
      assertions.push({ ...a, actual, ok });
      console.log(`  ${ok ? '✓' : '✗'} ${a.label} → ${actual}`);
    }
    report.scenarios.push({
      name, url: page.url(), durationMs: Date.now() - t0,
      eventCount: events.length, routing, screenshot,
      pageErrors: pageErrors.slice(errsBefore), assertions, error: err,
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 15_000 });
  await dismissOnboarding(page);
  await page.locator('[data-testid="chat-text-input"]').waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(1500);

  // ── S1: the exact bug input → real game walks in-page, no "did you mean"
  await recordScenario('S1_magnus_catalan_ondisk', {
    run: async () => {
      await ask(page, 'show me a game that magnus played the catalan opening');
      await waitForEvent(intercepted, (e) =>
        /player-game/i.test(e.summary ?? '') && /magnus played the catalan/i.test(e.summary ?? ''), 25_000);
      await page.locator('[data-testid="middlegame-plan-inline"]').waitFor({ timeout: 10_000 }).catch(() => undefined);
    },
    assertions: [
      { kind: 'audit-global-all', value: ['player-game', 'magnus played the catalan'], label: 'routed to deterministic player-game lookup' },
      { kind: 'audit-global-all', value: ['magnus played the catalan', 'mounted'], label: 'a real game was mounted (N-ply)' },
      { kind: 'audit-global-absent', value: "i don't have an exact match", label: 'NO "did you mean" brush-off (the bug)' },
      { kind: 'visible', selector: '[data-testid="middlegame-plan-inline"]', label: 'game walks on the board in-page' },
      { kind: 'transcript-contains', value: 'catalan', label: 'transcript names the Catalan' },
      { kind: 'transcript-absent', value: 'did you mean', label: 'transcript has no "did you mean"' },
    ],
  });

  // Reset to a clean board for the next ask — the model game mounts a
  // FULL-BLEED overlay that occludes the chat input, so it MUST be
  // dismissed (and confirmed detached) before the next ask.
  await page.locator('[data-testid="middlegame-plan-exit"]').click({ timeout: 4000 }).catch(() => undefined);
  await page.locator('[data-testid="middlegame-plan-inline"]').waitFor({ state: 'detached', timeout: 8000 }).catch(() => undefined);
  await page.waitForTimeout(600);

  // ── S2: off-canonical phrasing ("how does X play Y") still resolves ─
  await recordScenario('S2_how_does_carlsen_play', {
    run: async () => {
      await ask(page, 'how does carlsen play the catalan');
      await waitForEvent(intercepted, (e) =>
        /player-game/i.test(e.summary ?? '') && /how does carlsen play/i.test(e.summary ?? ''), 25_000);
      await page.locator('[data-testid="middlegame-plan-inline"]').waitFor({ timeout: 10_000 }).catch(() => undefined);
    },
    assertions: [
      { kind: 'audit-global-all', value: ['player-game', 'how does carlsen play'], label: 'off-canonical phrasing routed to player-game' },
      { kind: 'visible', selector: '[data-testid="middlegame-plan-inline"]', label: 'game walks on the board' },
      { kind: 'audit-global-absent', value: "i don't have an exact match", label: 'NO "did you mean" brush-off' },
      { kind: 'transcript-absent', value: 'repertoire', label: 'shows the player name, not the repertoire title' },
    ],
  });

  await page.locator('[data-testid="middlegame-plan-exit"]').click({ timeout: 4000 }).catch(() => undefined);
  await page.waitForTimeout(600);

  // ── S3: NO false positive — "show me the catalan" has no player named,
  //        must NOT mount a player game (routes to normal opening flow). ─
  await recordScenario('S3_no_false_positive', {
    run: async () => {
      await ask(page, 'show me the catalan');
      // Let the normal opening-routing event land + any late batch flush.
      await waitForEvent(intercepted, (e) =>
        /show me the catalan/i.test(e.summary ?? '') || /line picker shown for "catalan/i.test(e.summary ?? ''), 15_000);
      await page.waitForTimeout(3000);
    },
    assertions: [
      // No player-game event keyed to THIS ask (a plain opening ask names no player).
      { kind: 'audit-global-absent', value: ['player-game', 'show me the catalan'], label: 'plain opening ask did NOT hit player-game routing' },
    ],
  });

  // ── Listener (instrument 3): a model-game walk is silent by design. ──
  report.listenerVoiceEvents = listener.getCapturedEvents().length;
  report.note = 'Model-game walk is silent by design (no authored narration) — empty voice delta is correct.';

  const passed = report.scenarios.every((s) => !s.error && s.assertions.every((a) => a.ok));
  report.passed = passed;
  report.pageErrorsTotal = pageErrors.length;
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n[pg] ${passed ? 'ALL GREEN ✓' : 'FAILURES ✗'} — report: ${OUT_DIR}/report.json`);
  console.log(`[pg] page errors: ${pageErrors.length}`);

  await listener.stop().catch(() => undefined);
  await browser.close();
  process.exit(passed ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
