#!/usr/bin/env node
/**
 * audit-analysis-pool-engine-prod
 * -------------------------------
 * The batch game-analysis WORKER POOL had no audit, and that is exactly how it
 * crash-stormed real users invisibly.
 *
 * `gameAnalysisService.spawnDedicatedWorker` used to hardcode
 * `/stockfish/stockfish-18-lite-single.js` — the SIMD WASM build that
 * `call_indirect`-traps on iOS WebKit, and the one file `resolveWorkerUrl()`
 * deliberately routes iOS away from. It also logged NOTHING, so when 141 WASM
 * traps landed on the shipped App Store build (2026-08-28) and 276 on a private
 * build (2026-09-02), every `stockfish_variant` event in the window said
 * `ios-native` from the SINGLETON and the crashing loader was un-attributable.
 * Diagnosing it took a session; it should have taken one query.
 *
 * This audit drives the REAL path — seed unanalyzed games, push the REAL
 * "Analyze games" button, let the genuine pool spawn — and asserts:
 *
 *   SF1  the pool NAMES the build it spawns (the observability fix; before
 *        2026-09-02 this check could not pass at all)
 *   SF2  the pool resolves the SAME build the singleton did — one owner for
 *        "which engine runs on this device". A divergence IS the hardcode
 *        coming back.
 *   SF3  no WASM RuntimeError (`call_indirect` / `Unreachable` / `Invalid
 *        opcode`) reaches the console during the run — the crash itself
 *   SF4  no uncaught pageerror during the run
 *
 * Every check reads REAL evidence and fails on an empty set — none can pass
 * because nothing happened.
 *
 * Prod:  AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *        AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *        node scripts/audit-analysis-pool-engine-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/analysis-pool-engine-${stamp}`;
/** The pool spawns 6 workers and each has an 8s spawn timeout; a cold asm.js
 *  parse on a slow runner is the long pole. Generous on purpose. */
const POOL_WAIT_MS = 90_000;

/** A short real game, unanalyzed, so the batch has something to chew on. */
const SEED_PGN =
  '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6 6. h4 h6 7. Nf3 Nd7 ' +
  '8. h5 Bh7 9. Bd3 Bxd3 10. Qxd3 e6 11. Bf4 Ngf6 12. O-O-O Be7 13. Kb1 O-O ' +
  '14. Ne4 Nxe4 15. Qxe4 Nf6 16. Qe2 Qd5 17. Ne5 Rfd8 18. c4 Qa5 19. a3 Rd7 20. Bg3 Rad8';

const report = { baseUrl: BASE_URL, startedAt: new Date().toISOString(), scenarios: [] };
function record(name, status, detail) {
  report.scenarios.push({ name, status, detail });
  console.log(`[${status === 'pass' ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL'}] ${name} — ${detail}`);
}

/** Read the app's OWN audit log out of Dexie (`meta` key `app-audit-log.v1`),
 *  keeping only the Stockfish variant rows. Read IN-PAGE rather than off the
 *  shared prod audit-stream, so another device's traffic can neither satisfy
 *  nor pollute the assertion. */
async function readVariantRows(page) {
  return page.evaluate(async () => {
    const rows = await new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        const dbh = req.result;
        if (!dbh.objectStoreNames.contains('meta')) { resolve([]); return; }
        const get = dbh.transaction('meta', 'readonly').objectStore('meta').get('app-audit-log.v1');
        get.onerror = () => resolve([]);
        get.onsuccess = () => {
          const v = get.result?.value;
          try {
            const parsed = Array.isArray(v) ? v : JSON.parse(typeof v === 'string' ? v : '[]');
            resolve(Array.isArray(parsed) ? parsed : []);
          } catch { resolve([]); }
        };
      };
    });
    return rows
      .filter((r) => r && typeof r.kind === 'string' && r.kind.startsWith('stockfish-variant'))
      .map((r) => ({ kind: r.kind, source: String(r.source ?? ''), summary: String(r.summary ?? '') }));
  });
}

const variantOf = (summary) => (summary.match(/variant=([a-z-]+)/) ?? [])[1] ?? '';

async function main() {
  const since = Date.now();
  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const page = await context.newPage();

  const wasmTraps = [];
  const pageErrors = [];
  const WASM_TRAP = /call_indirect|Unreachable code should not be executed|Invalid opcode 0xfd|out of bounds call_indirect/i;
  page.on('console', (msg) => {
    const t = msg.text();
    if (WASM_TRAP.test(t)) wasmTraps.push(t.slice(0, 200));
  });
  page.on('pageerror', (err) => {
    const t = String(err?.message ?? err);
    if (WASM_TRAP.test(t)) wasmTraps.push(t.slice(0, 200));
    pageErrors.push(t.slice(0, 200));
  });

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    // Fresh context → the strength-calibration bubble eats the first click.
    try {
      const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
      await bubble.waitFor({ state: 'visible', timeout: 8000 });
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15_000 });
    } catch { /* no bubble — fine */ }

    // ── Seed UNANALYZED games so the batch has real work ──────────────────
    // Unanalyzed = no `annotations`, which is what `gameNeedsAnalysis` reads.
    const seeded = await page.evaluate(async (pgn) => {
      const dbh = await new Promise((res, rej) => {
        const r = indexedDB.open('ChessAcademyDB');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      if (!dbh.objectStoreNames.contains('games')) return { ok: false, reason: 'no games store' };
      const tx = dbh.transaction('games', 'readwrite');
      const store = tx.objectStore('games');
      const now = Date.now();
      for (let i = 0; i < 2; i++) {
        store.put({
          id: `audit-pool-${now}-${i}`,
          pgn,
          white: 'auditWhite', black: 'auditBlack',
          result: '1-0', playerColor: 'white',
          date: new Date(now).toISOString().slice(0, 10),
          source: 'manual', timeControl: 'rapid',
          opponentRating: 1500, playerRating: 1500,
          importedAt: now,
        });
      }
      await new Promise((res) => { tx.oncomplete = () => res(); tx.onerror = () => res(); });
      return { ok: true };
    }, SEED_PGN);
    if (!seeded.ok) {
      record('seed-games', 'fail', `could not seed unanalyzed games: ${seeded.reason}`);
    } else {
      record('seed-games', 'pass', '2 unanalyzed games written to Dexie `games`');
    }

    // ── Push the REAL button (audits are hand-driven, not injected) ────────
    await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    try {
      const help = page.locator('[data-testid="page-help-modal"]');
      if (await help.isVisible({ timeout: 2500 })) await page.keyboard.press('Escape');
    } catch { /* no help modal */ }

    const cta = page.locator('[data-testid="analyze-games-cta"]').first();
    try {
      await cta.waitFor({ state: 'visible', timeout: 20_000 });
      await cta.click({ force: true });
      record('analyze-cta', 'pass', 'clicked the real "Analyze games" button on /settings');
    } catch (err) {
      record('analyze-cta', 'fail', `analyze-games-cta never became clickable: ${String(err).slice(0, 120)}`);
    }

    // ── Let the pool spawn + run ──────────────────────────────────────────
    console.log(`[audit] waiting up to ${POOL_WAIT_MS / 1000}s for the worker pool…`);
    const deadline = Date.now() + POOL_WAIT_MS;
    let rows = [];
    while (Date.now() < deadline) {
      rows = await readVariantRows(page);
      if (rows.some((r) => /spawnDedicatedWorker/.test(r.source))) break;
      await page.waitForTimeout(3000);
    }

    const poolRows = rows.filter((r) => /spawnDedicatedWorker/.test(r.source));
    const engineRows = rows.filter((r) => /stockfishEngine\.initialize/.test(r.source));

    // SF1 — the pool names the build it spawns.
    record(
      'SF1 pool-names-its-build',
      poolRows.length > 0 ? 'pass' : 'fail',
      poolRows.length > 0
        ? `${poolRows.length} pool worker(s) logged: ${[...new Set(poolRows.map((r) => variantOf(r.summary)))].join(', ')}`
        : 'the analysis pool spawned but logged NO variant row — the loader is invisible again',
    );

    // SF2 — one owner for "which engine runs on this device".
    const poolVariants = [...new Set(poolRows.map((r) => variantOf(r.summary)).filter(Boolean))];
    const engineVariants = [...new Set(engineRows.map((r) => variantOf(r.summary)).filter(Boolean))];
    if (poolRows.length === 0 || engineRows.length === 0) {
      record('SF2 pool-agrees-with-engine', 'fail',
        `cannot compare — pool rows=${poolRows.length}, engine rows=${engineRows.length}`);
    } else {
      const agree = poolVariants.every((v) => engineVariants.includes(v));
      record('SF2 pool-agrees-with-engine', agree ? 'pass' : 'fail',
        `pool=[${poolVariants.join(',')}] engine=[${engineVariants.join(',')}]`);
    }

    // SF3 — the crash itself.
    record('SF3 no-wasm-trap', wasmTraps.length === 0 ? 'pass' : 'fail',
      wasmTraps.length === 0 ? 'no WASM RuntimeError during the run' : `${wasmTraps.length} trap(s): ${wasmTraps[0]}`);

    // SF4 — no uncaught errors.
    record('SF4 no-pageerror', pageErrors.length === 0 ? 'pass' : 'fail',
      pageErrors.length === 0 ? 'no uncaught pageerror' : `${pageErrors.length}: ${pageErrors[0]}`);

    // ── Audit-stream delta (G2) ───────────────────────────────────────────
    if (SECRET) {
      try {
        const res = await fetch(`${BASE_URL}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
        const j = res.ok ? await res.json() : null;
        record('audit-stream', res.ok ? 'pass' : 'fail',
          res.ok ? `${j?.count ?? j?.entries?.length ?? 0} events since run start (storage=${j?.storage})` : `HTTP ${res.status}`);
      } catch (e) {
        record('audit-stream', 'fail', String(e).slice(0, 120));
      }
    } else {
      record('audit-stream', 'skip', 'no AUDIT_STREAM_SECRET in env');
    }
  } finally {
    await browser.close();
    await mkdir(OUT_DIR, { recursive: true });
    report.finishedAt = new Date().toISOString();
    await writeFile(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
    const failed = report.scenarios.filter((s) => s.status === 'fail');
    console.log(`\n${report.scenarios.length - failed.length}/${report.scenarios.length} green — report at ${OUT_DIR}/report.json`);
    if (failed.length) process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
