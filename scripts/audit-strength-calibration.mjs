#!/usr/bin/env node
/**
 * Verifies first-run strength calibration — the fix that makes difficulty
 * adaptive for beginners (David 2026-05-26: "difficulty based off imported
 * games, if non-imported then the skill picker").
 *
 * Scenarios (against a FRESH, cleared IndexedDB so it's a true first run):
 *   1. The strength bubble auto-pops as the FIRST coach-mark, blocking.
 *   2. Picking a band writes BOTH currentRating AND puzzleRating to Dexie
 *      and flips strengthCalibrated → true (the two ratings used to
 *      diverge; the puzzle pool reads puzzleRating).
 *   3. The bubble dismisses and the "how to use this app" PageHelp pops
 *      SECOND (suppressed until calibration is answered).
 *   4. A `strength-calibrated` audit event fires.
 *   5. Re-load → the bubble does NOT pop again (calibration is sticky).
 *
 * Note: this drives a WRITE to db.profiles. Per CLAUDE.md the sandbox
 * IndexedDB write-stall affects the `openings` store specifically; the
 * `profiles` store write here is a simple keyed update and resolves —
 * but if a future sandbox stalls it, route the persistence assertion to
 * a real device. The bubble-popped / dismissed assertions are env-safe.
 *
 * Usage:
 *   node scripts/audit-strength-calibration.mjs              # localhost
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-strength-calibration.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const SECRET =
  process.env.AUDIT_STREAM_SECRET ??
  '06fe5f2383534090df8b6ba11e79088eb665ec780175df4f032befc02a530782';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const STREAM_URL_PROD = 'https://chess-academy-pro.vercel.app/api/audit-stream';
const STREAM_URL_LOCAL = `${BASE_URL}/api/audit-stream`;

async function main() {
  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[calibration] chromium = ${executablePath}`);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(({ url, secret }) => {
    try {
      window.localStorage.setItem('auditStreamUrl', url);
      window.localStorage.setItem('auditStreamSecret', secret);
    } catch { /* ignore */ }
  }, { url: STREAM_URL_PROD, secret: SECRET });

  const page = await ctx.newPage();
  const captured = [];
  page.on('request', (req) => {
    const u = req.url();
    if ((u === STREAM_URL_PROD || u === STREAM_URL_LOCAL) && req.method() === 'POST') {
      try {
        const body = req.postDataJSON?.();
        if (body && typeof body === 'object') captured.push(body);
      } catch { /* ignore */ }
    }
  });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => { consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`); });

  async function freshLoad() {
    // Wipe every IndexedDB so the app boots as a brand-new install.
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const dbs = (await indexedDB.databases?.()) ?? [{ name: 'ChessAcademyDB' }];
      await Promise.all(
        dbs.map((d) => d.name ? new Promise((res) => {
          const req = indexedDB.deleteDatabase(d.name);
          req.onsuccess = req.onerror = req.onblocked = () => res();
        }) : Promise.resolve()),
      );
      try { window.localStorage.clear(); } catch { /* ignore */ }
    });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
  }

  async function readProfile() {
    return page.evaluate(() => new Promise((resolve) => {
      const open = indexedDB.open('ChessAcademyDB');
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction('profiles', 'readonly');
          const get = tx.objectStore('profiles').get('main');
          get.onsuccess = () => resolve(get.result ?? null);
          get.onerror = () => resolve(null);
        } catch { resolve(null); }
      };
      open.onerror = () => resolve(null);
    }));
  }

  const tests = [
    {
      label: 'Strength bubble auto-pops as the first blocking coach-mark',
      run: async () => {
        await freshLoad();
        const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
        await bubble.waitFor({ timeout: 30_000 });
        // The "how to use this app" help must NOT be open yet.
        const helpOpen = await page.locator('[data-testid="page-help-modal"]').count();
        return { ok: helpOpen === 0, why: helpOpen === 0 ? 'bubble first, help suppressed' : 'page-help opened simultaneously' };
      },
    },
    {
      label: 'Picking a band seeds BOTH ratings + flips strengthCalibrated',
      run: async () => {
        await page.locator('[data-testid="skill-band-newcomer"]').click();
        // Generous timeout: the sandbox IndexedDB write-stall (CLAUDE.md G1)
        // can delay the profiles.update commit that flips needsCalibration.
        await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 45_000 });
        const profile = await readProfile();
        const ok = !!profile && profile.currentRating === 600 && profile.puzzleRating === 600 && profile.strengthCalibrated === true;
        return { ok, why: ok ? 'currentRating=puzzleRating=600, calibrated' : `profile=${JSON.stringify(profile)}` };
      },
    },
    {
      label: '"How to use this app" help pops SECOND after calibration',
      run: async () => {
        const help = page.locator('[data-testid="page-help-modal"]');
        await help.waitFor({ timeout: 10_000 }).catch(() => undefined);
        const ok = (await help.count()) > 0;
        return { ok, why: ok ? 'dashboard help revealed after calibration' : 'help never opened (suppress did not lift)' };
      },
    },
    {
      label: 'strength-calibrated audit event fired',
      run: async () => {
        await page.waitForTimeout(500);
        const ok = captured.some((e) => e.kind === 'strength-calibrated');
        return { ok, why: ok ? 'event present' : 'no strength-calibrated event (stream may be blocked in sandbox)', soft: true };
      },
    },
    {
      label: 'Calibration is sticky — bubble does not re-pop on reload',
      run: async () => {
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        const popped = await page.locator('[data-testid="strength-calibration-bubble"]').count();
        return { ok: popped === 0, why: popped === 0 ? 'no re-pop' : 'bubble popped again after calibration' };
      },
    },
  ];

  const results = [];
  for (const t of tests) {
    console.log(`\n[test] ${t.label}`);
    try {
      const r = await t.run();
      console.log(`  ${r.ok ? '✓ PASS' : (r.soft ? '~ SOFT' : '✗ FAIL')} — ${r.why}`);
      results.push({ label: t.label, ok: r.ok, soft: !!r.soft, why: r.why });
    } catch (err) {
      console.log(`  ✗ ERROR — ${err.message}`);
      results.push({ label: t.label, ok: false, why: `error: ${err.message}` });
    }
  }

  const hard = results.filter((r) => !r.soft);
  const passed = hard.filter((r) => r.ok).length;
  console.log(`\n[summary] ${passed}/${hard.length} hard scenarios passed (+${results.filter((r) => r.soft).length} soft)`);
  if (consoleErrors.length) {
    console.log(`[console-errors] ${consoleErrors.length}:`);
    consoleErrors.slice(0, 5).forEach((m) => console.log(`  ${m}`));
  }

  await mkdir('audit-reports', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(
    join('audit-reports', `strength-calibration-${stamp}.json`),
    JSON.stringify({ base: BASE_URL, results, consoleErrors, totalEvents: captured.length }, null, 2),
  );

  await browser.close();
  process.exit(passed === hard.length ? 0 : 1);
}

main().catch((err) => {
  console.error('[calibration] fatal:', err);
  process.exit(1);
});
