#!/usr/bin/env node
/**
 * audit-teach-corpus-traps-prod — post-deploy verification for the 2026-08-04
 * landing. Three instruments per G1: Playwright drives, the narration listener
 * captures what the voice actually said, and the prod audit-stream is pulled
 * before + after so the delta is exactly this run.
 *
 * What it proves, one scenario per shipped change:
 *
 *  A. THE TRAP STAGE NO LONGER HANGS. The ask must reach the punish stage (or
 *     say plainly that it has none) — never sit on the stage-menu loading
 *     state forever.
 *
 *     It drives DAVID'S EXACT WORDING, smart-quote and all: "Teach me trap
 *     lines in bishop’s opening". That is not incidental — his device log is
 *     what cracked this, and the phrasing is load-bearing. The stage-strip
 *     removes "trap lines in ", the TEACH_PATTERN suffix group eats the
 *     trailing "opening", and the iOS apostrophe survives, so the row gets
 *     written under "bishop’s" while the resolved tree teaches "Bishop's
 *     Opening". Retyping this as a tidy "the Vienna" hides the bug the audit
 *     exists to catch.
 *
 *     Two defects stack here, both fixed: the generator's length check and the
 *     stage menu's validity check disagreed about whether a stage existed, and
 *     the cache row was written under one name and read back under another.
 *
 *  B. AN UNCURATED WATCH HANDS OFF TO THE COACH. Opening an ECO-tail opening's
 *     Watch must land on /coach/teach, NOT render the legacy walkthrough. The
 *     tell for the legacy path is the `walkthrough-progress` testid (G9.3
 *     Gate A) — its annotations are the ungated auto-generated swamp.
 *
 *  C. THE COACH SPOKE. A green DOM pass alone is not an audit; silence where a
 *     keystone should speak is a bug only the listener catches.
 *
 * Usage (from the sandbox, against LIVE prod):
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-teach-corpus-traps-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/teach-corpus-traps-${stamp}`;

/** The stage menu shows a loading state while a stage generates. It must not
 *  still be showing one after this long — that is the hang. */
const STAGE_SETTLE_MS = 150_000;
const BOOT_TIMEOUT_MS = 45_000;

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Instrument 2: the live prod audit stream. Empty is informational, not a
 *  failure (the app may simply not have been open). */
async function pullStream(sinceMs) {
  if (!SECRET) return { ok: false, reason: 'AUDIT_STREAM_SECRET not set', events: [] };
  try {
    const res = await fetch(`${BASE_URL}/api/audit-stream?since=${sinceMs}`, {
      headers: { 'x-audit-secret': SECRET },
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}`, events: [] };
    const json = await res.json();
    return { ok: true, events: json.events ?? json.entries ?? [] };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err), events: [] };
  }
}

/** The coach surfaces gate the chat behind an AI-consent modal; the textarea
 *  stays non-interactive until it is dismissed. The calibration bubble and
 *  page-help modal are handled by the init script instead (they must be
 *  neutralized on EVERY navigation, not once). */
async function dismissConsent(page) {
  const allow = page.locator('[data-testid="ai-consent-allow"]');
  if (await allow.count().then((n) => n > 0).catch(() => false)) {
    await allow.first().click({ timeout: 5000 }).catch(() => {});
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const runStart = Date.now();
  const before = await pullStream(runStart - 60_000);
  console.log(`[stream] pre-run pull: ${before.ok ? `${before.events.length} events` : `unavailable (${before.reason})`}`);

  const listener = await startAuditListener();
  console.log(`[listener] up at ${listener.url}`);

  const executablePath = await resolveChromiumExecutable();
  console.log(`[chromium] ${executablePath}`);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext(sandboxContextOptions());
  // Point the app's audit stream at the sidecar so instrument 3 captures every
  // voice event, and neutralize the onboarding gates on EVERY navigation —
  // a fresh prod context puts the calibration bubble over every click.
  await context.addInitScript(
    ({ url, secret }) => {
      try {
        window.localStorage.setItem('auditStreamUrl', url);
        window.localStorage.setItem('auditStreamSecret', secret);
      } catch { /* ignore */ }
    },
    { url: listener.url, secret: listener.secret },
  );
  await context.addInitScript(autoDismissCalibration);
  // No TTS spend: the listener reads the spoken text from the audit events, so
  // synthesising it buys nothing and costs real money (see mute-tts.mjs).
  await context.addInitScript(muteTtsForAudit);
  const page = await context.newPage();

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  try {
    // ── B. Uncurated Watch must hand off to the coach, not the legacy mode ──
    // A raw ECO row: seeded by dataLoader into db.openings, no LessonScript.
    await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await page.waitForTimeout(60_000); // deferred seed: ECO rows land ~30-50s in

    const ecoId = await page.evaluate(async () => {
      const req = indexedDB.open('ChessAcademyDB');
      const db = await new Promise((res, rej) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      if (!db.objectStoreNames.contains('openings')) return null;
      const rows = await new Promise((res) => {
        const all = db.transaction('openings').objectStore('openings').getAll();
        all.onsuccess = () => res(all.result ?? []);
        all.onerror = () => res([]);
      });
      const eco = rows.find((r) => r.isRepertoire === false && r.pgn);
      return eco ? eco.id : null;
    });

    if (!ecoId) {
      record('B. uncurated Watch hands off to the coach', false, 'no ECO-tail opening found in Dexie — seed may not have completed');
    } else {
      await page.goto(`${BASE_URL}/openings/${ecoId}?view=walkthrough`, {
        waitUntil: 'domcontentloaded',
        timeout: BOOT_TIMEOUT_MS,
      });
      await page.waitForTimeout(8000);
      const url = page.url();
      const legacy = await page.locator('[data-testid="walkthrough-progress"]').count();
      record(
        'B. uncurated Watch hands off to the coach',
        legacy === 0,
        `opening=${ecoId} url=${url.replace(BASE_URL, '')} legacyTestids=${legacy}`,
      );
    }

    // ── A. The trap stage must resolve or say so — never hang ──────────────
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await dismissConsent(page);
    await page.waitForTimeout(4000);

    const input = page.locator('textarea').first();
    await input.waitFor({ state: 'visible', timeout: 20_000 });
    // pressSequentially, not fill — the React textarea needs real key events
    // or the send button stays disabled and the message never submits.
    await input.pressSequentially('Teach me trap lines in bishop\u2019s opening', { delay: 12 });
    await page.keyboard.press('Enter');

    const deadline = Date.now() + STAGE_SETTLE_MS;
    let outcome = 'timeout';
    const trail = [];
    while (Date.now() < deadline) {
      await page.waitForTimeout(2500);
      const seen = {};
      for (const t of ['walkthrough-punish-picker', 'walkthrough-quiz-panel', 'walkthrough-stage-menu',
        'walkthrough-trap-prompt', 'walkthrough-leaf-panel', 'walkthrough-fork-panel']) {
        seen[t] = await page.locator(`[data-testid="${t}"]`).count();
      }
      const body = await page.locator('body').innerText().catch(() => '');
      trail.push({ at: Math.round((Date.now() - (deadline - STAGE_SETTLE_MS)) / 1000), ...seen, chars: body.length });
      if (seen['walkthrough-punish-picker'] > 0 || seen['walkthrough-quiz-panel'] > 0) {
        outcome = 'reached-stage';
        break;
      }
      // The give-up path: the coach says it plainly instead of spinning.
      if (/No verified trap lines|didn't hold up/i.test(body)) { outcome = 'said-none-available'; break; }
    }
    if (outcome === 'timeout') {
      await page.screenshot({ path: `${OUT_DIR}/trap-timeout.png`, fullPage: true }).catch(() => {});
      const body = await page.locator('body').innerText().catch(() => '');
      await writeFile(`${OUT_DIR}/trap-timeout-body.txt`, body);
      await writeFile(`${OUT_DIR}/trap-trail.json`, JSON.stringify(trail, null, 2));
      console.log(`[diag] last state: ${JSON.stringify(trail[trail.length - 1] ?? {})}`);
      console.log(`[diag] tail of transcript:\n${body.slice(-1200)}`);
    }
    record(
      'A. trap ask resolves (stage reached, or an honest "none") — never hangs',
      outcome !== 'timeout',
      `outcome=${outcome}`,
    );

    // ── C. The coach spoke ────────────────────────────────────────────────
    const spoke = listener.getCapturedEvents().filter((e) =>
      /voice-speak-invoked|coach-narration-spoken|voice/i.test(`${e.kind ?? ''} ${e.source ?? ''}`),
    );
    record('C. narration listener captured speech', spoke.length > 0, `${spoke.length} voice events`);

    record('D. no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  } finally {
    await browser.close().catch(() => {});
    await listener.stop();
  }

  const after = await pullStream(runStart);
  console.log(`[stream] post-run pull: ${after.ok ? `${after.events.length} events this run` : `unavailable (${after.reason})`}`);

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    results,
    listenerEvents: listener.getCapturedEvents().length,
    listenerByKind: listener.countByKind(),
    streamEventsThisRun: after.events.length,
    pageErrors,
  };
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green — report at ${OUT_DIR}/report.json`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('audit crashed:', err);
  process.exit(1);
});
