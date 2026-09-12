#!/usr/bin/env node
/**
 * Drives the Settings UI in a headless browser and verifies that
 * behavior-critical settings actually take effect on downstream
 * surfaces. Pairs each setting change with a relevant action on a
 * runtime surface, intercepts the auditor's POSTs, and asserts the
 * expected event pattern (or absence) was emitted.
 *
 * Usage:
 *   node scripts/audit-settings-behavior.mjs              # against localhost
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-settings-behavior.mjs
 *
 * Output: stdout summary + audit-reports/settings-behavior-<iso>.json
 *
 * Each test case (TestSpec) has:
 *   - label:          short human description
 *   - prep:           async (page) => set the Settings field
 *   - exercise:       async (page) => take an action on a surface
 *   - assert:         (events) => { ok, why } — inspects captured POSTs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { enableAuditCapture } from './audit-lib/enable-audit-capture.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const SECRET =
  process.env.AUDIT_STREAM_SECRET ??
  '';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const STREAM_URL_PROD = 'https://chess-academy-pro.vercel.app/api/audit-stream';
const STREAM_URL_LOCAL = `${BASE_URL}/api/audit-stream`;

async function main() {
  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[settings-behavior] chromium = ${executablePath}`);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath });
  const ctx = await browser.newContext({ ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
  });
  // Enable audit emission (opt-in/off by default since 2026-09-11) so the app
  // POSTs its events, then intercept the POST LOCALLY and fulfil it — the
  // proven capture pattern (bare-name, storage-persistence). Letting the POST
  // hit real prod raced the (Upstash-degraded) stream and captured nothing
  // even though narration fired (probe 2026-09-12 caught it locally fine).
  await ctx.addInitScript(enableAuditCapture);
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit); // no TTS spend — see mute-tts.mjs

  const page = await ctx.newPage();

  const captured = [];
  await page.route('**/api/audit-stream**', async (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      try {
        const parsed = JSON.parse(req.postData() || '');
        for (const e of (Array.isArray(parsed) ? parsed : parsed.events || [parsed])) captured.push(e);
      } catch { /* ignore */ }
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => { consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`); });

  // ── Helpers ─────────────────────────────────────────────────────
  async function openSettings() {
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
    // Wait for either the settings page or the boot splash to give way.
    await page.locator('[data-testid="settings-page"]').waitFor({ timeout: 30_000 });
  }
  async function pickCoachTab() {
    // The tab button can be clickable before the page finishes hydrating,
    // in which case the first click lands on a not-yet-wired button and
    // the panel never mounts (seen on the 3rd settings visit of a run,
    // 2026-08-14). Retry the click once, generous panel wait.
    await page.locator('[data-testid="tab-coach"]').click();
    try {
      await page.locator('[data-testid="coach-tab"]').waitFor({ timeout: 8000 });
    } catch {
      await page.locator('[data-testid="tab-coach"]').click();
      await page.locator('[data-testid="coach-tab"]').waitFor({ timeout: 15_000 });
    }
  }
  async function pickBoardTab() {
    await page.locator('[data-testid="tab-board"]').click();
    await page.locator('[data-testid="board-tab"]').waitFor({ timeout: 5000 });
  }
  async function setCoachNarration(value) {
    await pickCoachTab();
    // The Coach Narration SelectRow lives inside the "Gameplay
    // Coaching" SettingsModalRow — open it first.
    const modalAlreadyOpen = await page.locator('[data-testid="gameplay-coaching-row-modal"]').count();
    if (modalAlreadyOpen === 0) {
      await page.locator('[data-testid="gameplay-coaching-row"]').click();
      await page.locator('[data-testid="gameplay-coaching-row-modal"]').waitFor({ timeout: 5000 });
    }
    await page.locator('[data-testid="coach-narration-select"]').selectOption(value);
    await page.waitForTimeout(400);
    // Close the modal so subsequent navigation doesn't get caught by it.
    await page.locator('[data-testid="gameplay-coaching-row-close"]').click().catch(() => undefined);
    await page.waitForTimeout(300);
    // CONFIRM the write actually committed to the profile BEFORE we navigate —
    // otherwise the auto-launched walkthrough can read the PREVIOUS test's
    // verbosity (the 2026-09-12 full-mode false-fail: voice-speak-silenced
    // fired in "full" because the walk narrated while the profile was still
    // "silent" from the prior test). Poll Dexie until preferences.coachNarration
    // matches, up to 8s.
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const current = await page.evaluate(() => new Promise((resolve) => {
        try {
          const open = indexedDB.open('ChessAcademyDB');
          open.onsuccess = () => {
            try {
              const tx = open.result.transaction('profiles', 'readonly');
              const get = tx.objectStore('profiles').get('main');
              get.onsuccess = () => resolve(get.result?.preferences?.coachNarration ?? null);
              get.onerror = () => resolve(null);
            } catch { resolve(null); }
          };
          open.onerror = () => resolve(null);
        } catch { resolve(null); }
      })).catch(() => null);
      if (current === value) break;
      await page.waitForTimeout(400);
    }
  }
  async function snapshot() {
    return captured.length;
  }
  function eventsSince(idx) {
    return captured.slice(idx);
  }
  function eventsHaveKind(events, kind) {
    return events.some((e) => e.kind === kind);
  }

  // ── Pre-warm the Vienna lesson ─────────────────────────────────
  // A COLD generation runs 60-120s before the first spoken word. The three
  // verbosity scenarios each waited a fixed 8s, so whichever ran first paid
  // the cold gen and "failed" while the later ones rode its warm cache and
  // passed — the audit reporting the exact wiring it had just proved, as
  // broken. One warm-up visit here puts all three scenarios on equal cached
  // footing, which is also the footing a real user's second visit has.
  await page.goto(`${BASE_URL}/coach/teach?teach=Vienna%20Game&auto=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(
    () => (document.body?.innerText ?? '').length > 200,
    { timeout: 30_000 },
  ).catch(() => {});
  await page.waitForTimeout(120_000);

  // ── Test specs ──────────────────────────────────────────────────
  const tests = [
    // The narration assertions drive the AUTO-LAUNCHED walkthrough via
    // /coach/teach?teach=<name>&auto=1. Route consolidation (2026-09):
    // /coach/session/walkthrough?subject= now REDIRECTS to /coach/teach and
    // lands on an opt-in "Ready to start? pick a mode" prompt that does NOT
    // auto-narrate — so the old URL made full/brief report 0 spoken even though
    // the walkthrough voice was fine. The `auto=1` kickoff starts the walk and
    // narrates without a tap (verified on prod 2026-09-12), which is the path
    // that actually exercises the per-move voiceService gate.
    //
    // SIGNAL = `coach-narration-spoken`, the line the voice ACTUALLY fired. The
    // G1-mandatory audit mute (voiceService.speakInternal isAuditMuted gate)
    // returns after emitting `coach-narration-spoken` and BEFORE the synthesis
    // tiers where the success `voice-speak-invoked` fires — so under the mute
    // (which every audit runs) `voice-speak-invoked` never fires for successful
    // narration, and keying on it made this measure a dead event (0 vs 0). The
    // silent gate (voiceService line ~1263) fires `voice-speak-silenced`
    // instead, before the mute gate.
    {
      label: 'Coach Narration = "silent" → walkthrough ATTEMPTS to speak but is gate-SILENCED (nothing spoken)',
      run: async () => {
        await openSettings();
        await setCoachNarration('silent');
        const before = await snapshot();
        await page.goto(`${BASE_URL}/coach/teach?teach=Vienna%20Game&auto=1`, { waitUntil: 'domcontentloaded' });
        // Poll up to 45s: pass only once an attempt was gate-silenced (proves
        // the gate actually suppressed a real narration, not that the walk
        // simply hadn't started yet — the vacuous 0/0 the old fixed 8s allowed).
        let spoke = 0, silenced = 0;
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
          await page.waitForTimeout(2000);
          const evs = eventsSince(before);
          spoke = evs.filter((e) => e.kind === 'coach-narration-spoken').length;
          silenced = evs.filter((e) => e.kind === 'voice-speak-silenced').length;
          if (spoke > 0 || silenced > 0) break;
        }
        const events = eventsSince(before);
        return {
          ok: spoke === 0 && silenced > 0,
          why: `${spoke} spoken / ${silenced} silenced; silent must suppress a real attempt (0 spoken, ≥1 silenced)`,
          events,
        };
      },
    },
    {
      label: 'Coach Narration = "full" → the coach SPEAKS on the Vienna walkthrough',
      run: async () => {
        await openSettings();
        await setCoachNarration('full');
        const before = await snapshot();
        await page.goto(`${BASE_URL}/coach/teach?teach=Vienna%20Game&auto=1`, { waitUntil: 'domcontentloaded' });
        // Poll up to 45s for the first spoken line — the walkthrough's first
        // narration lands behind session resolution + voice-gated start, which
        // cold-varies well past a fixed 8s. SIGNAL = `coach-narration-spoken`
        // (the mute-preserved "voice fired this line" event; see the silent
        // scenario for why `voice-speak-invoked` is dead under the audit mute).
        let spoke = 0;
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
          await page.waitForTimeout(2000);
          spoke = eventsSince(before).filter((e) => e.kind === 'coach-narration-spoken').length;
          if (spoke > 0) break;
        }
        const events = eventsSince(before);
        return {
          ok: spoke > 0,
          why: `${spoke} spoken line(s); expected ≥1`,
          events,
        };
      },
    },
    {
      label: 'Coach Narration = "brief" → the coach SPEAKS (capped) on the Vienna walkthrough',
      run: async () => {
        await openSettings();
        await setCoachNarration('brief');
        const before = await snapshot();
        await page.goto(`${BASE_URL}/coach/teach?teach=Vienna%20Game&auto=1`, { waitUntil: 'domcontentloaded' });
        // Same 45s poll + `coach-narration-spoken` signal as the full-mode
        // scenario. If brief shows 0 spoken at 45s while full spoke, that is a
        // REAL G5 dead-control (brief must speak the capped line, never
        // silence) — not a timing artifact.
        let spoke = 0;
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
          await page.waitForTimeout(2000);
          spoke = eventsSince(before).filter((e) => e.kind === 'coach-narration-spoken').length;
          if (spoke > 0) break;
        }
        const events = eventsSince(before);
        return {
          ok: spoke > 0,
          why: `${spoke} spoken line(s); expected ≥1`,
          events,
        };
      },
    },
    {
      label: 'Settings page renders the unified Coach Narration row (no legacy verbosity controls)',
      run: async () => {
        await openSettings();
        await pickCoachTab();
        await page.locator('[data-testid="gameplay-coaching-row"]').click();
        await page.locator('[data-testid="gameplay-coaching-row-modal"]').waitFor({ timeout: 5000 });
        const hasUnified = await page.locator('[data-testid="coach-narration-select"]').count();
        const hasLegacyVerbosity = await page.locator('[data-testid="coach-verbosity-select"]').count();
        const hasLegacyCommentary = await page.locator('[data-testid="coach-commentary-verbosity-select"]').count();
        return {
          ok: hasUnified === 1 && hasLegacyVerbosity === 0 && hasLegacyCommentary === 0,
          why: `unified=${hasUnified}, legacyVerbosity=${hasLegacyVerbosity}, legacyCommentary=${hasLegacyCommentary}`,
          events: [],
        };
      },
    },
  ];

  // ── Execute ─────────────────────────────────────────────────────
  const results = [];
  for (const t of tests) {
    console.log(`\n[test] ${t.label}`);
    try {
      const r = await t.run();
      console.log(`  ${r.ok ? '✓ PASS' : '✗ FAIL'} — ${r.why}`);
      if (!r.ok && r.events && r.events.length > 0) {
        console.log('  Captured kinds: ', [...new Set(r.events.map((e) => e.kind))].join(', '));
      }
      results.push({
        label: t.label,
        ok: r.ok,
        why: r.why,
        eventKinds: r.events ? [...new Set(r.events.map((e) => e.kind))] : [],
        // Full voice events so a silent-mode leak is diagnosable from the
        // report (source/summary tell bypassVerbosity-sanctioned apart
        // from a real G5 leak; kinds alone cannot).
        voiceEvents: r.events ? r.events.filter((e) => String(e.kind).startsWith('voice-')) : [],
      });
    } catch (err) {
      console.log(`  ✗ ERROR — ${err.message}`);
      results.push({ label: t.label, ok: false, why: `error: ${err.message}` });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n[summary] ${passed}/${results.length} passed`);
  if (consoleErrors.length > 0) {
    console.log(`[console-errors] ${consoleErrors.length}:`);
    consoleErrors.slice(0, 5).forEach((m) => console.log(`  ${m}`));
  }

  await mkdir('audit-reports', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(
    join('audit-reports', `settings-behavior-${stamp}.json`),
    JSON.stringify({ base: BASE_URL, results, consoleErrors, totalEvents: captured.length }, null, 2),
  );

  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => {
  console.error('[settings-behavior] fatal:', err);
  process.exit(1);
});
