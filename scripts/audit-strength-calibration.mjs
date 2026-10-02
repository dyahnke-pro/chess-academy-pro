#!/usr/bin/env node
/**
 * Verifies FIRST-RUN STRENGTH: the one skippable question (back 2026-10-02),
 * then fully adaptive from there. Scenario 1 below supersedes the "no picker"
 * contract this file asserted from 2026-09-12 until David asked for it back.
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

  /** The app's own local audit log (Dexie `meta` / `app-audit-log.v1`). It is
   *  the source of truth on-device regardless of whether the opt-in stream is
   *  on, so an audit with no listener sidecar reads it directly. */
  async function readAuditLog() {
    return page.evaluate(() => new Promise((resolve) => {
      const open = indexedDB.open('ChessAcademyDB');
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction('meta', 'readonly');
          const get = tx.objectStore('meta').get('app-audit-log.v1');
          get.onsuccess = () => {
            try { resolve(JSON.parse(get.result?.value ?? '[]')); } catch { resolve([]); }
          };
          get.onerror = () => resolve([]);
        } catch { resolve([]); }
      };
      open.onerror = () => resolve([]);
    }));
  }

  const tests = [
    {
      // THE QUESTION IS BACK (David 2026-10-02: "make sure the strength
      // question is still available first time you open the app"). Driven like
      // a person: answer consent, see the question, pick Beginner.
      label: 'First run asks the strength question after consent; Beginner seeds 900 + beginner mode',
      run: async () => {
        await freshLoad();
        const allow = page.locator('[data-testid="ai-consent-allow"]');
        await allow.waitFor({ timeout: 30_000 }).catch(() => {});
        if (await allow.count()) await allow.first().click();
        const screen = page.locator('[data-testid="first-run-strength"]');
        const shown = await screen.waitFor({ timeout: 20_000 }).then(() => true).catch(() => false);
        if (!shown) return { ok: false, why: 'the first-run strength question never appeared after consent' };
        const bands = await page.locator('[data-testid^="first-run-band-"]').count();
        await page.locator('[data-testid="first-run-band-beginner"]').click();
        const closed = await screen.waitFor({ state: 'detached', timeout: 10_000 }).then(() => true).catch(() => false);
        await page.waitForTimeout(1500);
        const profile = await readProfile();
        const ok = bands === 4 && closed && profile?.skillBand === 'beginner' && Number(profile?.currentRating) === 900;
        return { ok, why: `bands=${bands} closed=${closed} skillBand=${profile?.skillBand} currentRating=${profile?.currentRating}` };
      },
    },
    {
      label: 'Beginner mode: Up next leads with the Start-here path',
      run: async () => {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        const bar = page.locator('[data-testid="dashboard-up-next"]');
        await bar.waitFor({ timeout: 30_000 }).catch(() => {});
        const text = (await bar.innerText().catch(() => '')).replace(/\s+/g, ' ');
        const ok = /Start here: the fundamentals/.test(text);
        return { ok, why: ok ? `up next: ${text.slice(0, 80)}` : `up next did not lead with Start here: "${text.slice(0, 120)}"` };
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
      // THE ALGO-AUDIT RULE applied to the estimator (David 2026-09-20: "I want
      // audit tools on all algo based builds"). The rating is a four-rung
      // confidence chain and only its OUTPUT was ever visible, so a chain that
      // silently always falls through to the default looks exactly like one
      // that works. This asserts the rung is named — and, on a FRESH boot with
      // no games, that the named rung is one of the two that honestly apply.
      label: 'The rating estimator NAMES which rung of the confidence chain answered',
      run: async () => {
        const log = await readAuditLog();
        const rows = log.filter((e) => e && e.kind === 'player-rating-estimated');
        if (rows.length === 0) {
          return { ok: false, why: `no player-rating-estimated row in ${log.length} audit entries — the estimator ran unobserved, or calibrateStrength never called it` };
        }
        let est = null;
        try { est = JSON.parse(rows[rows.length - 1].details ?? ''); } catch { est = null; }
        const src = est?.source;
        // A fresh profile has no imported and no coach games, so only 'profile'
        // (the boot-created default) or 'default' can honestly answer here.
        const ok = src === 'profile' || src === 'default';
        return {
          ok,
          why: ok
            ? `${rows.length} estimate(s); newest source=${src} rating=${est?.rating} n=${est?.sampleSize}`
            : `newest source=${src} on a FRESH profile with no games — that rung cannot honestly have answered`,
        };
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
