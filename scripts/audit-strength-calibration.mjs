#!/usr/bin/env node
/**
 * Verifies FIRST-RUN DIFFICULTY IS FULLY ADAPTIVE — no calibration step.
 *
 * REWRITTEN 2026-09-12: the first-run skill-band calibration bubble was
 * REMOVED by David on 2026-09-02 ("remove strength calibration → go fully
 * adaptive"; see src/App.tsx "Difficulty is FULLY ADAPTIVE — no calibration
 * step"). `StrengthCalibrationBubble.tsx` is now orphaned (mounted at no call
 * site) and `calibrateStrength` runs ONLY when the player has imported games.
 * The old audit asserted the removed bubble and so false-RED'd a healthy app
 * (1/4) — a stale tripwire on a deleted feature. This asserts the CURRENT
 * contract instead, so it catches the real regressions: the bubble sneaking
 * BACK (blocking first-run) or boot failing to create a usable profile.
 *
 * Scenarios (against a FRESH, cleared IndexedDB so it's a true first run):
 *   1. NO calibration bubble / skill-band picker appears — first run is not
 *      blocked by a picker (the removal is the contract).
 *   2. Boot creates a profile with sane default (adaptive-baseline) ratings —
 *      currentRating AND puzzleRating are real positive numbers, not 0/unset.
 *   3. The dashboard renders and is usable first-run (section bars present),
 *      with no page errors — the app is not wedged behind a missing gate.
 *
 * Usage:
 *   node scripts/audit-strength-calibration.mjs              # localhost
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app node scripts/audit-strength-calibration.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
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
  if (executablePath) console.log(`[calibration] chromium = ${executablePath}`);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
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
      label: 'Fully adaptive: NO calibration bubble / skill-band picker on first run',
      run: async () => {
        await freshLoad();
        // Give boot + the deferred profile-create effect room; the bubble (if
        // it regressed back) auto-pops within a couple of seconds of mount.
        await page.waitForTimeout(12_000);
        const bubble = await page.locator('[data-testid="strength-calibration-bubble"]').count();
        const bands = await page.locator('[data-testid^="skill-band-"]').count();
        const ok = bubble === 0 && bands === 0;
        return { ok, why: ok ? 'no first-run picker (fully adaptive)' : `REGRESSED: bubble=${bubble} skill-bands=${bands} — the removed calibration picker is back` };
      },
    },
    {
      label: 'Boot creates a profile with sane default (adaptive-baseline) ratings',
      run: async () => {
        const profile = await readProfile();
        const cr = Number(profile?.currentRating);
        const pr = Number(profile?.puzzleRating);
        const ok = !!profile && Number.isFinite(cr) && cr > 0 && Number.isFinite(pr) && pr > 0;
        return { ok, why: ok ? `currentRating=${cr} puzzleRating=${pr}` : `bad profile=${JSON.stringify(profile)}` };
      },
    },
    {
      label: 'Dashboard renders + usable first-run (section bars, no page errors)',
      run: async () => {
        const sections = await page.locator('[data-testid^="section-"]').count();
        const errs = consoleErrors.filter((m) => /pageerror:/.test(m));
        const ok = sections >= 1 && errs.length === 0;
        return { ok, why: ok ? `${sections} section bar(s), no pageerrors` : `sections=${sections}, pageerrors=${errs.length}` };
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
