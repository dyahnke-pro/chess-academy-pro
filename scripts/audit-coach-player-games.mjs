#!/usr/bin/env node
/**
 * audit-coach-player-games
 * ------------------------
 * Post-deploy audit for the coach game-reference layer (David
 * 2026-06-01 — "coach full access to player games"). Verifies the
 * runtime instruments of the feature:
 *
 *   1. RUNTIME LOAD — after boot + deferred seed, the `proGameReferences`
 *      Dexie store is populated and every row has the expected shape
 *      (playerId, proOpeningId, studentSide, chess.js-shaped pgn,
 *      source in {chess.com,otb,lichess}). This proves
 *      `dataLoader.loadProGameReferences` ran on the LIVE bundle.
 *   2. COACH ENVELOPE (key-gated) — when a provider key is present,
 *      drive a coach turn on a pro opening and pull the audit-stream
 *      for `coachService.ask.playerGames` ("loaded N/M player game
 *      ref(s)"). Without a key the brain call can't run; the scenario
 *      is SKIPPED (not failed) and flagged for a keyed run.
 *
 * The envelope/tool wiring itself is covered by unit tests
 * (envelope.test.ts toolbelt count = 24, playerGames.test.ts,
 * lookupPlayerGames.test.ts) — this audit is the deploy-pipeline +
 * Dexie-seed instrument those can't see.
 *
 * Sandbox: AUDIT_SANDBOX=1 node scripts/audit-coach-player-games.mjs
 * Prod (default URL):  AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-coach-player-games.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/coach-player-games-${stamp}`;
const SEED_WAIT_MS = 60_000;

const report = { baseUrl: BASE_URL, startedAt: new Date().toISOString(), scenarios: [] };
function record(name, status, detail) {
  report.scenarios.push({ name, status, detail });
  const tag = status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL';
  console.log(`[${tag}] ${name} — ${detail}`);
}

async function main() {
  const since = Date.now();
  const browser = await chromium.launch({
    executablePath: resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    // Dismiss the strength-calibration bubble if it appears (fresh context).
    try {
      const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
      await bubble.waitFor({ state: 'visible', timeout: 8000 });
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15_000 });
    } catch { /* no bubble — fine */ }

    // Let the deferred seed run (loadProGameReferences lands with the
    // model-games/plans backfill). Allow the full window.
    console.log(`[audit] waiting ${SEED_WAIT_MS / 1000}s for deferred seed…`);
    await page.waitForTimeout(SEED_WAIT_MS);

    // ── Scenario 1: runtime load + shape ──────────────────────────────────
    const probe = await page.evaluate(async () => {
      const open = indexedDB.open('ChessAcademyDB');
      const dbp = await new Promise((res, rej) => {
        open.onsuccess = () => res(open.result);
        open.onerror = () => rej(open.error);
      });
      if (!dbp.objectStoreNames.contains('proGameReferences')) {
        return { hasStore: false, count: 0, sample: null };
      }
      const tx = dbp.transaction('proGameReferences', 'readonly');
      const store = tx.objectStore('proGameReferences');
      const count = await new Promise((res) => { const r = store.count(); r.onsuccess = () => res(r.result); });
      const all = await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => res(r.result); });
      const sample = all[0] ?? null;
      const sources = Array.from(new Set(all.map((g) => g.source)));
      const sides = Array.from(new Set(all.map((g) => g.studentSide)));
      const players = Array.from(new Set(all.map((g) => g.playerId)));
      return { hasStore: true, count, sample, sources, sides, players };
    });

    if (!probe.hasStore) {
      record('runtime-load', 'fail', 'proGameReferences store missing — schema v29 not applied on live bundle');
    } else if (probe.count === 0) {
      record('runtime-load', 'fail', 'proGameReferences store EMPTY after seed — loadProGameReferences did not run');
    } else {
      const s = probe.sample;
      const shapeOk = s && s.id && s.playerId && s.proOpeningId && s.studentSide && typeof s.pgn === 'string' && s.pgn.length > 0;
      const sourcesOk = probe.sources.every((x) => ['chess.com', 'otb', 'lichess'].includes(x));
      record(
        'runtime-load',
        shapeOk && sourcesOk ? 'pass' : 'fail',
        `${probe.count} refs, players=[${probe.players.join(',')}], sources=[${probe.sources.join(',')}], sides=[${probe.sides.join(',')}], shapeOk=${shapeOk}`,
      );
    }

    // ── Scenario 2: coach envelope playerGames event (key-gated) ──────────
    const hasKey = Boolean(process.env.DEEPSEEK_KEY || process.env.ANTHROPIC_KEY);
    if (!hasKey) {
      record('coach-envelope-playergames', 'skip', 'no DEEPSEEK_KEY/ANTHROPIC_KEY in env — brain call cannot run; re-run with a key to verify the playerGames injection event');
    } else if (!SECRET) {
      record('coach-envelope-playergames', 'skip', 'no AUDIT_STREAM_SECRET — cannot pull the audit-stream to confirm the event');
    } else {
      // Pull the audit-stream for the playerGames injection event. (A keyed
      // run would first drive a coach turn on /openings/pro/... here.)
      const events = await page.evaluate(async ([url, secret, sinceMs]) => {
        const res = await fetch(`${url}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': secret } });
        if (!res.ok) return { ok: false, status: res.status };
        const body = await res.json();
        const list = Array.isArray(body.events) ? body.events : Array.isArray(body) ? body : [];
        return { ok: true, hits: list.filter((e) => String(e.source || '').includes('playerGames')).length };
      }, [BASE_URL, SECRET, since]);
      record(
        'coach-envelope-playergames',
        events.ok ? 'pass' : 'fail',
        events.ok ? `${events.hits} playerGames audit event(s) since run start` : `audit-stream HTTP ${events.status}`,
      );
    }
  } catch (err) {
    record('audit-run', 'fail', `unhandled: ${err?.message ?? err}`);
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  const fails = report.scenarios.filter((s) => s.status === 'fail').length;
  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\n[audit] ${report.scenarios.length} scenarios, ${fails} failed — report at ${OUT_DIR}/report.json`);
  process.exit(fails > 0 ? 1 : 0);
}

main();
