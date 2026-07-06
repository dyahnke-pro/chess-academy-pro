#!/usr/bin/env node
/**
 * Bucket delivery + organization audit (David 2026-07-06: "we need audit tools
 * for bucket delivery and organization"). Runs the SAME invariant engine the
 * unit gate uses (src/services/bucketPipelineAudit.ts) against the LIVE app's
 * Dexie via window.__bucketAudit, proving the real weakness-loop pipeline
 * delivers a captured "why'd you play that?" answer to the RIGHT bucket + a
 * drill, and keeps the buckets ranked/deduped/spaced.
 *
 * Two controlled scenarios (weakness stores cleared first so the result is
 * deterministic — not at the mercy of whatever the app already seeded):
 *   1. CLEAN DELIVERY — a counted slip + its matching mistakePuzzle → the
 *      audit reports ok=true, delivery.withDrill=1, inProfile=1, 0 violations.
 *   2. DROP DETECTION — a counted, legal, best-move slip with NO drill → the
 *      audit flags COUNTED_NO_DRILL (the "picker fired, nothing to drill"
 *      class). Proves the tool actually catches a dropped delivery live.
 *
 * Usage:
 *   node scripts/audit-bucket-delivery-loop.mjs                 # localhost:5173
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_SANDBOX=1 \
 *     node scripts/audit-bucket-delivery-loop.mjs               # live prod
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const STREAM_URL = `${BASE_URL.replace(/\/$/, '')}/api/audit-stream`;

// A counted slip position: black to move, 'a6' legal quiet, 'd5' legal best.
const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function main() {
  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[bucket-audit] chromium = ${executablePath}`);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });

  // Set auditStreamUrl BEFORE load so the bucket-audit bridge installs.
  await ctx.addInitScript((url) => {
    try { window.localStorage.setItem('auditStreamUrl', url); } catch { /* ignore */ }
  }, STREAM_URL);

  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}`));

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Let the app boot + the bridge install.
    await page.waitForFunction(() => !!window.__bucketAudit, { timeout: 30000 });
    record('bridge installed', true, 'window.__bucketAudit present');

    // Clear the weakness stores + seed a CLEAN delivery (capture + matching drill).
    const seedClean = await page.evaluate(async (fen) => {
      const openReq = indexedDB.open('ChessAcademyDB');
      const db = await new Promise((res, rej) => {
        openReq.onsuccess = () => res(openReq.result);
        openReq.onerror = () => rej(openReq.error);
      });
      const stores = ['misconceptionTags', 'mistakePuzzles', 'openingWeakSpots', 'classifiedTactics', 'games'];
      const present = stores.filter((s) => db.objectStoreNames.contains(s));
      await new Promise((res, rej) => {
        const tx = db.transaction(present, 'readwrite');
        for (const s of present) tx.objectStore(s).clear();
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      const now = Date.now();
      const core = fen.split(' ').slice(0, 4).join(' ');
      const put = (store, val) => new Promise((res, rej) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(val); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      await put('misconceptionTags', {
        id: 'aud-clean-1', tag: 'missed-tactic', source: 'discussion-practice', createdAt: now,
        fen, playedSan: 'a6', bestSan: 'd5', cpLoss: 142, gamePhase: 'opening',
        status: 'open', masteryHits: 0, dueAt: now, counted: true,
      });
      await put('mistakePuzzles', {
        id: 'aud-mp-1', fen, playerMove: 'a7a6', playerMoveSan: 'a6', bestMove: 'd7d5', bestMoveSan: 'd5',
        moves: 'd7d5', cpLoss: 150, classification: 'mistake', gamePhase: 'opening', moveNumber: 1,
        sourceGameId: 'aud-g1', sourceMode: 'coach-capture', playerColor: 'black', promptText: 'Find the best move.',
        narration: { intro: '', explanation: '', outro: '' }, createdAt: new Date().toISOString(),
        opponentName: null, gameDate: null, openingName: 'Vienna Game', evalBefore: null,
        srsInterval: 0, srsEaseFactor: 2.5, srsRepetitions: 0, srsDueDate: new Date().toISOString(),
        srsLastReview: null, status: 'unsolved', attempts: 0, successes: 0,
      });
      db.close();
      return { core, seeded: true };
    }, FEN);
    record('seeded clean delivery', seedClean.seeded === true);

    const clean = await page.evaluate(() => window.__bucketAudit.auditBucketPipeline());
    record('CLEAN — ok=true', clean.ok === true, `violations=${clean.violations.length}`);
    record('CLEAN — drill wired', clean.delivery.withDrill >= 1, `withDrill=${clean.delivery.withDrill}`);
    record('CLEAN — in unified profile', clean.delivery.inProfile >= 1, `inProfile=${clean.delivery.inProfile}`);
    record('CLEAN — no dropped deliveries', clean.delivery.dropped === 0, `dropped=${clean.delivery.dropped}`);
    console.log('   buckets:', JSON.stringify(clean.buckets));

    // Now seed a DROPPED delivery: counted, legal, best move — but NO drill.
    await page.evaluate(async (fen) => {
      const openReq = indexedDB.open('ChessAcademyDB');
      const db = await new Promise((res) => { openReq.onsuccess = () => res(openReq.result); });
      const now = Date.now();
      await new Promise((res, rej) => {
        const tx = db.transaction('misconceptionTags', 'readwrite');
        tx.objectStore('misconceptionTags').put({
          id: 'aud-drop-1', tag: 'hung-material', source: 'discussion-practice', createdAt: now,
          fen, playedSan: 'a6', bestSan: 'd5', cpLoss: 300, gamePhase: 'opening',
          status: 'open', masteryHits: 0, dueAt: now, counted: true,
        });
        tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
      });
      db.close();
    }, 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'); // different pos, no matching puzzle

    const dropped = await page.evaluate(() => window.__bucketAudit.auditBucketPipeline());
    const flagged = dropped.violations.some((v) => v.code === 'COUNTED_NO_DRILL');
    record('DROP DETECTION — COUNTED_NO_DRILL flagged', flagged, `dropped=${dropped.delivery.dropped}`);
  } catch (e) {
    record('run', false, e.message);
  } finally {
    const passed = results.filter((r) => r.pass).length;
    const dir = join('audit-reports', `bucket-delivery-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'report.json'), JSON.stringify({ base: BASE_URL, results }, null, 2));
    console.log(`\n${passed}/${results.length} checks passed — report at ${dir}`);
    await browser.close();
    process.exit(passed === results.length ? 0 : 1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
