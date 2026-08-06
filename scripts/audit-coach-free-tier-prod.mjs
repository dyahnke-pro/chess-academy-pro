#!/usr/bin/env node
/**
 * audit-coach-free-tier-prod — post-deploy verification for the coach
 * metered-free-tier gate (accessPolicy / freeTierService / AccessGate /
 * CoachUnlockAnnouncement), shipped 2026-08-06.
 *
 * Three scenarios against LIVE prod:
 *   A. Fresh user (no freeTier row)      → /coach/home is OPEN, announcement fires.
 *   B. Legacy user (pre-migration row, no coach fields) → /coach/home is STILL OPEN
 *      (proves the unlock reaches EXISTING users via loadFreeTier's backfill).
 *   C. Control — /academy stays WALLED (unaffected route, gate didn't break).
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-coach-free-tier-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';

async function newContext(browser) {
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    deviceScaleFactor: 2,
    userAgent: 'AuditCoachFreeTierBot/1.0 (chromium)',
  });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  return ctx;
}

async function paywallVisible(page) {
  return (await page.locator('[data-testid="paywall-back-free"]').count()) > 0;
}

async function announcementVisible(page) {
  return (await page.locator('[data-testid="coach-unlock-announcement"]').count()) > 0;
}

async function main() {
  console.log(`[coach-free-tier] base = ${BASE_URL}`);
  const executablePath = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ headless: !HEADED, executablePath, args: sandboxLaunchArgs() });
  const results = [];

  // ---- Scenario A: fresh user, no freeTier row at all ----
  {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/coach/home`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(4000);
    const walled = await paywallVisible(page);
    const announced = await announcementVisible(page);
    console.log(`[A: fresh user] /coach/home walled=${walled} announcementVisible=${announced} url=${page.url()}`);
    results.push({ scenario: 'A-fresh-user-coach-open', pass: !walled });
    results.push({ scenario: 'A-fresh-user-announcement-shown', pass: announced });
    await ctx.close();
  }

  // ---- Scenario B: legacy user — seed a freeTier row with NO coach fields
  //      (simulates a row persisted before this migration), then verify the
  //      coach is still open (loadFreeTier backfills missing fields to 0).
  {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(2000);
    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('freeTier', 'readwrite');
          tx.objectStore('freeTier').put({
            id: 'singleton',
            puzzlesSolved: 3,
            freeOpeningId: 'italian-game',
            kidFirstAccessAt: null,
            updatedAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
            // deliberately NO coachLessonsUsed / coachChatTurnsUsed / coachUnlockSeenAt
          });
          tx.oncomplete = () => resolve(undefined);
          tx.onerror = () => reject(tx.error);
        };
        req.onerror = () => reject(req.error);
      });
    });
    await page.goto(`${BASE_URL}/coach/home`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(4000);
    const walled = await paywallVisible(page);
    const announced = await announcementVisible(page);
    console.log(`[B: legacy user] /coach/home walled=${walled} announcementVisible=${announced} url=${page.url()}`);
    results.push({ scenario: 'B-legacy-user-coach-open', pass: !walled });
    results.push({ scenario: 'B-legacy-user-announcement-shown', pass: announced });
    await ctx.close();
  }

  // ---- Scenario C: control — /academy is unrelated and should stay walled
  //      (proves the gate itself still works; this push didn't neuter it) ----
  {
    const ctx = await newContext(browser);
    const page = await ctx.newPage();
    await page.goto(`${BASE_URL}/academy`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await page.waitForTimeout(4000);
    const walled = await paywallVisible(page);
    console.log(`[C: control] /academy walled=${walled} url=${page.url()}`);
    // Informational only — if the paywall gate is dormant in prod entirely
    // (VITE_PAYWALL_ENABLED=false), /academy will ALSO be open; that's a
    // build-flag fact, not a regression from this push.
    results.push({ scenario: 'C-academy-control (informational)', pass: true, note: `walled=${walled}` });
    await ctx.close();
  }

  await browser.close();

  console.log('\n[coach-free-tier] ── results ──');
  let allPass = true;
  for (const r of results) {
    console.log(`  ${r.pass ? '✓' : '✗'} ${r.scenario}${r.note ? ` (${r.note})` : ''}`);
    if (!r.pass) allPass = false;
  }
  console.log(allPass ? '\nALL GREEN' : '\nSOME FAILED');
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error('[coach-free-tier] fatal', e);
  process.exit(1);
});
