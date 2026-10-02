#!/usr/bin/env node
/**
 * audit-review-card-prod — the import→review handoff, on LIVE prod.
 *
 * 🚨 WHAT THIS PROVES, AND WHY IT EXISTS (PostHog, 2026-09-12).
 *
 * Two things shipped together and both were invisible to every existing audit:
 *
 *  1. THE COLLISION. `ImportPage` sent `platform` meaning "chess.com vs
 *     lichess". posthog-js merges call-site props OVER super-properties, so it
 *     overwrote `platform: 'native'` and the LOCKED native-only user analysis
 *     deleted the entire import funnel from every report. Three sessions read
 *     the empty result as "manual import is uninstrumented". This audit decodes
 *     the REAL posthog payloads off the wire and fails if any event carries a
 *     chess-site value in `platform`.
 *
 *  2. THE HANDOFF. Every user who pressed import succeeded, Stockfish ran, the
 *     weaknesses landed — and both new importers left without opening a
 *     review. The ReviewLastGameCard that bridged them was REMOVED 2026-10-02
 *     (David: redundant with Up next's "Fix your slip"); its checks went with
 *     it, and this audit now asserts only that it stays gone.
 *
 * THREE INSTRUMENTS (G1), never Playwright alone:
 *   1. Playwright drives live prod — real clicks, real Dexie, real routing.
 *   2. The prod audit-stream is pulled BEFORE and AFTER (the delta is this run).
 *      The stream is OPT-IN and off by default since 2026-09-11, so an empty
 *      pull is EXPECTED and is reported, never treated as a failure or as
 *      evidence about app health.
 *   3. The narration-listener sidecar captures the app's own emitted events.
 *
 * Payload note: events ingest through the first-party reverse proxy
 * `/api/ph/e/` (NOT us.i.posthog.com) and the body is GZIP (compression=gzip-js),
 * so it must be read with postDataBuffer() + gunzip. A regex over postData()
 * sees binary noise and silently matches nothing — which would make this audit
 * pass having verified exactly zero events.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-review-card-prod.mjs
 */
import { chromium } from 'playwright';
import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = `review-card-${Date.now().toString(36)}`;
const OUT = `audit-reports/review-card-${new Date().toISOString().replace(/[:.]/g, '-')}`;

/** Chess-site values that must NEVER appear in the `platform` super-property.
 *  This is the exact corruption the guard exists to stop. */
const SITE_VALUES = new Set(['chesscom', 'lichess', 'chess.com']);
const VALID_PLATFORMS = new Set(['web', 'pwa', 'native']);

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

/** Decode one posthog batch. Gzip first (the live config), plain JSON as the
 *  fallback so a future compression flip degrades to readable instead of mute. */
function decodeBatch(buf) {
  if (!buf) return [];
  let text;
  try {
    text = buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  } catch { return []; }
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch { return []; }
}


async function pullStream(since) {
  const secret = process.env.AUDIT_STREAM_SECRET || '';
  if (!secret) return { ok: false, reason: 'AUDIT_STREAM_SECRET not set' };
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': secret } });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.json();
    return { ok: true, storage: body.storage, count: Array.isArray(body.entries) ? body.entries.length : 0 };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  console.log(`\n── audit-review-card-prod ──\n  target: ${BASE}\n  runId:  ${RUN_ID}\n`);

  const startedAt = Date.now() - 60_000;
  const streamBefore = await pullStream(startedAt);
  console.log(`  [stream:before] ${JSON.stringify(streamBefore)}`);

  const listener = await startAuditListener();
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);          // G1: audits never spend TTS
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(stampAuditRunId(RUN_ID));  // isolates this run in PostHog
  await ctx.addInitScript(`try { window.localStorage.setItem('auditStreamUrl', ${JSON.stringify(listener.url)}); } catch {}`);

  const page = await ctx.newPage();
  const captured = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('request', (r) => {
    if (!/\/api\/ph\/|posthog/.test(r.url())) return;
    let buf = null;
    try { buf = r.postDataBuffer(); } catch { /* no body */ }
    for (const evt of decodeBatch(buf)) captured.push(evt);
  });

  try {
    // The "Review your last game" card that sections 1-5 tested was REMOVED
    // from Home (David 2026-10-02: the "redundant review button" — Up next
    // already sends the student to the slip from their last game). What stays
    // is the half of this audit that never depended on it: the import funnel
    // and the platform super-property.
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 60_000 });
    record('the removed review card is gone from Home', await page.locator('[data-testid="dashboard-review-last-game"]').count() === 0);

    // ── 6. The import funnel, with the platform dimension intact ─────────
    await page.goto(`${BASE}/games/import`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForSelector('[data-testid="import-page"]', { timeout: 45_000 });
    const box = page.locator('input[type="text"]').first();
    await box.pressSequentially('auditprobe-no-such-user-zz', { delay: 20 });
    const importBtn = page.getByRole('button', { name: /import/i }).first();
    await importBtn.click({ force: true });
    await page.waitForTimeout(12_000);

    await page.waitForTimeout(6_000); // let the batch flush
    const importEvents = captured.filter((e) => String(e.event || '').startsWith('import_'));
    record('import funnel emits events', importEvents.length > 0, importEvents.map((e) => e.event).join(', ') || 'none');
    const withSource = importEvents.filter((e) => e.properties?.import_source);
    record('import events carry import_source', withSource.length > 0,
      withSource.map((e) => `${e.event}:${e.properties.import_source}`).join(', ') || 'none');

    // THE REGRESSION GATE. Any chess-site value in `platform` is the exact bug.
    const corrupted = captured.filter((e) => SITE_VALUES.has(String(e.properties?.platform)));
    record('no event has a chess site in `platform`', corrupted.length === 0,
      corrupted.length ? corrupted.map((e) => `${e.event}=${e.properties.platform}`).join(', ') : `${captured.length} events checked`);
    const platforms = new Set(captured.map((e) => e.properties?.platform).filter(Boolean));
    const allValid = [...platforms].every((p) => VALID_PLATFORMS.has(String(p)));
    record('`platform` holds only device values', allValid && platforms.size > 0, `seen: ${[...platforms].join(', ') || 'NONE'}`);

    // NON-VACUITY: an audit that verified nothing must not report green.
    record('decoder actually read events off the wire', captured.length >= 5, `${captured.length} posthog events decoded`);

    record('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | ') || 'clean');
  } finally {
    const listenerEvents = listener.getCapturedEvents();
    const streamAfter = await pullStream(startedAt);
    console.log(`\n  [stream:after]  ${JSON.stringify(streamAfter)}`);
    console.log(`  [listener]      ${listenerEvents.length} app events captured`);
    console.log(`  [posthog]       ${captured.length} events decoded (runId ${RUN_ID})`);
    writeFileSync(`${OUT}/report.json`, JSON.stringify({
      base: BASE, runId: RUN_ID, results,
      instruments: { streamBefore, streamAfter, listenerEvents: listenerEvents.length, posthogEvents: captured.length },
      posthogEventNames: [...new Set(captured.map((e) => e.event))],
      pageErrors,
    }, null, 2));
    await listener.stop();
    await browser.close();
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n  ${results.length - failed.length}/${results.length} green — report: ${OUT}/report.json\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
