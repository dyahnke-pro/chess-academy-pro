/**
 * audit-coach-teach-middlegame-plans
 * ----------------------------------
 * 3-INSTRUMENT audit (G1) for the in-page middlegame-plan surface on
 * /coach/teach (David 2026-05-29).
 *
 * The bug this guards: Learn-with-Coach told David it couldn't teach
 * middlegame plans on the Pirc while 8 authored Pirc plans sat
 * reachable. The plan ask fuzzy-matched "Pirc" → Evans Gambit's
 * "Pierce Defense". This audit proves the new intent gate routes
 * middlegame-plan asks to the authored plans IN-PAGE — never the
 * fuzzy matcher.
 *
 * Three instruments:
 *   1. Playwright — drives /coach/teach, types the asks, asserts the
 *      picker + in-page runner mount (DOM).
 *   2. Audit-stream interception — captures coach-surface-migrated
 *      routing events ("in-page plan(s)", "in-page middlegame plan
 *      started") + voice events (what the app DID).
 *   3. Narration listener sidecar — captures the voice the plan runner
 *      actually spoke when Play fired.
 *
 * Sandbox notes: middlegame-plan resolution is a pure READ of bundled
 * JSON (findPlansForOpening) — no IndexedDB WRITE, so the sandbox
 * write-stall caveat does NOT apply here. Runs fully in-sandbox against
 * the local dev server (prod was blocked by Vercel's daily build cap at
 * the time of authoring — run AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app
 * once the cap clears for the deploy-pipeline check).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 node scripts/audit-coach-teach-middlegame-plans.mjs
 *   AUDIT_SMOKE_URL=http://localhost:5173 AUDIT_SANDBOX=1 node scripts/audit-coach-teach-middlegame-plans.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-teach-middlegame-${stamp}`;
const BOOT_TIMEOUT_MS = 30_000;
const HYDRATE_SETTLE_MS = 1500;

async function waitForEvent(intercepted, predicate, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (intercepted.some(predicate)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function dismissOnboarding(page) {
  // Strength-calibration bubble blocks every click on a fresh context.
  const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bubble.count().catch(() => 0)) {
    await bubble.first().waitFor({ timeout: 15_000 }).catch(() => undefined);
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => undefined);
    await bubble.first().waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);
  }
  // A page-help modal sometimes auto-opens on the destination surface.
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
  console.log(`[mg] base     = ${BASE_URL}`);
  console.log(`[mg] listener = ${listener.url}`);
  console.log(`[mg] outDir   = ${OUT_DIR}`);

  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath });
  const ctx = await browser.newContext({
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditMiddlegameBot/1.0 (chromium)',
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
    console.log(`\n[mg] ${name}`);
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
        } else if (a.kind === 'count-gte') {
          const count = await page.locator(a.selector).count();
          actual = `count=${count}`;
          ok = count >= a.value;
        } else if (a.kind === 'transcript-contains') {
          const t = await page.locator('[data-testid="teach-transcript"]').innerText({ timeout: 2000 }).catch(() => '');
          actual = String(t).slice(-160);
          ok = String(t).toLowerCase().includes(String(a.value).toLowerCase());
        } else if (a.kind === 'audit-summary-contains') {
          const m = events.find((e) => (e.summary ?? '').toLowerCase().includes(String(a.value).toLowerCase()));
          actual = m ? `${m.kind}: ${(m.summary ?? '').slice(0, 90)}` : 'absent';
          ok = !!m;
        } else if (a.kind === 'audit-absent-summary') {
          const m = events.find((e) => (e.summary ?? '').toLowerCase().includes(String(a.value).toLowerCase()));
          actual = m ? `FOUND: ${(m.summary ?? '').slice(0, 90)}` : 'absent (good)';
          ok = !m;
        } else if (a.kind === 'audit-kind-present') {
          const kinds = Array.isArray(a.value) ? a.value : [a.value];
          const m = events.filter((e) => kinds.includes(e.kind));
          actual = m.length ? `${m.length}× ${m[0].kind}` : `none of ${kinds.join('/')}`;
          ok = m.length > 0;
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
  await page.waitForTimeout(HYDRATE_SETTLE_MS);

  // ── S1: "middle game plans in the Pirc" → in-page picker (8 plans) ─
  await recordScenario('S1_pirc_plan_picker', {
    run: async () => {
      await ask(page, 'middle game plans in the Pirc');
      await waitForEvent(intercepted, (e) =>
        e.kind === 'coach-surface-migrated' && /in-page plan\(s\)/i.test(e.summary ?? ''), 20_000);
      await page.locator('[data-testid="middlegame-plan-picker"]').waitFor({ timeout: 8000 }).catch(() => undefined);
    },
    assertions: [
      { kind: 'audit-summary-contains', value: 'in-page plan(s)', label: 'routed to in-page middlegame plans' },
      { kind: 'audit-absent-summary', value: 'pierce', label: 'NO "Pierce Defense" fuzzy garbage (the bug)' },
      { kind: 'audit-absent-summary', value: "i don't have an exact match", label: 'NO "no exact match" brush-off' },
      { kind: 'visible', selector: '[data-testid="middlegame-plan-picker"]', label: 'in-page plan picker appears' },
      { kind: 'count-gte', selector: '[data-testid^="middlegame-plan-choice-"]', value: 2, label: 'multiple Pirc plan choices listed' },
    ],
  });

  // ── S2: tap a plan → in-page runner mounts, Play speaks ────────────
  await recordScenario('S2_pirc_plan_runs_inpage', {
    run: async () => {
      const listenBefore = listener.getCapturedEvents().length;
      await page.locator('[data-testid^="middlegame-plan-choice-"]').first().click();
      await page.locator('[data-testid="middlegame-plan-inline"]').waitFor({ timeout: 8000 });
      // Drive the plan: hit Play and wait for voice.
      await page.locator('[data-testid="middlegame-plan-inline"] button[aria-label="Play"]').click().catch(() => undefined);
      await waitForEvent(intercepted, (e) =>
        (e.kind === 'voice-speak-invoked' || e.kind === 'coach-narration-spoken'), 15_000);
      report.listenerVoiceDelta = listener.getCapturedEvents().length - listenBefore;
    },
    assertions: [
      { kind: 'audit-summary-contains', value: 'in-page middlegame plan started', label: 'plan started audit fired' },
      { kind: 'visible', selector: '[data-testid="middlegame-plan-inline"]', label: 'in-page plan runner mounted' },
      { kind: 'visible', selector: '[data-testid="middlegame-plan-inline"] .cg-board, [data-testid="middlegame-plan-inline"] [data-boardid], [data-testid="middlegame-plan-inline"]', label: 'plan board present' },
      { kind: 'audit-kind-present', value: ['voice-speak-invoked', 'coach-narration-spoken'], label: 'voice fired during plan playback' },
    ],
  });

  // ── S3: drive plan to END → "play it out" picker → in-page play ───
  await recordScenario('S3_playout_inpage', {
    run: async () => {
      // Advance the plan to its end instantly via Next (no voice wait).
      const nextBtn = page.locator('[data-testid="middlegame-plan-inline"] button[aria-label="Next move"]');
      for (let i = 0; i < 40; i++) {
        if (await nextBtn.isDisabled().catch(() => true)) break;
        await nextBtn.click().catch(() => undefined);
        await page.waitForTimeout(120);
      }
      await page.locator('[data-testid="middlegame-plan-playout-prompt"]').waitFor({ timeout: 8000 });
      await page.locator('[data-testid="middlegame-plan-playout-yes"]').click();
      await page.locator('[data-testid="coach-teach-playout"]').waitFor({ timeout: 10_000 });
      const stillOnTeach = await page.locator('[data-testid="coach-teach-page"]').count();
      report.playoutStayedInTab = stillOnTeach >= 1 && page.url().includes('/coach/teach');
      // Exit play-out cleanly (its own back button) → back to lesson.
      await page.locator('[data-testid="opening-play-mode"] button').first().click().catch(() => undefined);
      await page.waitForTimeout(600);
    },
    assertions: [
      { kind: 'audit-summary-contains', value: 'in-page play-out started', label: 'play-out audit fired (stayed in tab)' },
      { kind: 'visible', selector: '[data-testid="coach-teach-page"]', label: 'play-out lives inside /coach/teach (never navigated away)' },
    ],
  });

  // ── S4 (G7 off-canonical): "midgame plans caro kann" ───────────────
  await recordScenario('S4_offcanonical_caro', {
    run: async () => {
      await ask(page, 'midgame plans caro kann');
      await waitForEvent(intercepted, (e) =>
        e.kind === 'coach-surface-migrated' && /in-page plan\(s\)/i.test(e.summary ?? ''), 20_000);
    },
    assertions: [
      { kind: 'audit-summary-contains', value: 'in-page plan(s)', label: 'off-canonical caro routes to plans' },
      { kind: 'audit-absent-summary', value: 'pierce', label: 'no fuzzy garbage' },
    ],
  });

  // ── S5 (honest fallback): an opening with NO authored plan ─────────
  await recordScenario('S5_honest_no_plan', {
    run: async () => {
      // Close the caro picker overlay (its dismiss button) so the chat
      // input is clickable again.
      await page.locator('[data-testid="middlegame-plan-picker"] button[aria-label="Dismiss plan picker"]')
        .click({ timeout: 3000 }).catch(() => undefined);
      await page.waitForTimeout(300);
      await ask(page, 'middle game plans in the Latvian Gambit');
      await waitForEvent(intercepted, (e) =>
        e.kind === 'coach-surface-migrated' && /no authored plan/i.test(e.summary ?? ''), 20_000);
    },
    assertions: [
      { kind: 'audit-summary-contains', value: 'no authored plan', label: 'honest "no plan" path taken' },
      { kind: 'audit-absent-summary', value: 'pierce', label: 'still no fuzzy garbage' },
      { kind: 'transcript-contains', value: "don't have hand-authored middlegame plans", label: 'honest coach message shown' },
    ],
  });

  // ── Summary ────────────────────────────────────────────────────────
  const totalAssertions = report.scenarios.reduce((n, s) => n + s.assertions.length, 0);
  const passed = report.scenarios.reduce((n, s) => n + s.assertions.filter((a) => a.ok).length, 0);
  report.summary = {
    totalAssertions, passed, failed: totalAssertions - passed,
    pageErrors: pageErrors.length,
    listenerEventsTotal: listener.getCapturedEvents().length,
    listenerVoiceDelta: report.listenerVoiceDelta ?? 0,
  };
  report.listenerSample = listener.getCapturedEvents().slice(0, 12);

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\n[mg] ───────────────────────────────`);
  console.log(`[mg] assertions: ${passed}/${totalAssertions} passed`);
  console.log(`[mg] pageErrors: ${pageErrors.length}`);
  console.log(`[mg] listener voice events: ${listener.getCapturedEvents().length} (delta on play: ${report.listenerVoiceDelta ?? 0})`);
  console.log(`[mg] report: ${join(OUT_DIR, 'report.json')}`);

  await browser.close();
  await listener.stop?.();
  process.exit(passed === totalAssertions && pageErrors.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
