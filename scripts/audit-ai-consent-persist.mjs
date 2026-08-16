#!/usr/bin/env node
/**
 * Verifies the AI data-sharing consent decision PERSISTS across a cold boot
 * (David 2026-07-03: "It keeps popping up on me when I reenter the app, only
 * if I close it completely").
 *
 * Root cause fixed in b2707d5: AiConsentModal.decide() and AiConsentSetting
 * .turnOff() wrote the decision only to in-memory Zustand (setActiveProfile),
 * never to Dexie — so a full app close reloaded the profile with
 * aiDataConsent === undefined and the blocking modal re-prompted every cold
 * boot. Both paths now also call updateProfile(id, { aiDataConsent }).
 *
 * A page RELOAD is the faithful cold-boot simulation: fresh JS heap (Zustand
 * re-hydrates from Dexie on boot) with IndexedDB intact — exactly what a full
 * app close does.
 *
 * Scenarios (FRESH, cleared IndexedDB so it's a true first run):
 *   1. After calibration, the AI-consent modal auto-pops (blocking).
 *   2. Clicking "Allow" persists aiDataConsent='granted' to Dexie.
 *   3. Reload (cold boot) → the consent modal does NOT re-pop. ← the regression
 *   4. Fresh install + "Don't allow" persists aiDataConsent='denied' to Dexie
 *      and also does not re-pop on reload (a denied user isn't nagged on boot).
 *
 * Usage:
 *   node scripts/audit-ai-consent-persist.mjs
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app AUDIT_SANDBOX=1 node scripts/audit-ai-consent-persist.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';

async function main() {
  const executablePath = await resolveChromiumExecutable(HEADED);
  if (executablePath) console.log(`[consent] chromium = ${executablePath}`);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => { consoleErrors.push(`pageerror: ${e.message.slice(0, 300)}`); });

  async function freshLoad() {
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

  async function readConsent() {
    return page.evaluate(() => new Promise((resolve) => {
      const open = indexedDB.open('ChessAcademyDB');
      open.onsuccess = () => {
        try {
          const tx = open.result.transaction('profiles', 'readonly');
          const get = tx.objectStore('profiles').get('main');
          get.onsuccess = () => resolve(get.result ? (get.result.aiDataConsent ?? null) : null);
          get.onerror = () => resolve(null);
        } catch { resolve('__err__'); }
      };
      open.onerror = () => resolve(null);
    }));
  }

  // Clear the strength-calibration bubble so the consent modal can surface.
  async function dismissCalibration() {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ timeout: 30_000 }).catch(() => undefined);
    if (await bubble.count()) {
      await page.locator('[data-testid="skill-band-intermediate"]').click().catch(() => undefined);
      await bubble.waitFor({ state: 'detached', timeout: 45_000 }).catch(() => undefined);
    }
  }

  async function runFlow(decision /* 'granted' | 'denied' */) {
    const clickTestId = decision === 'granted' ? 'ai-consent-allow' : 'ai-consent-deny';
    const out = {};
    await freshLoad();
    await dismissCalibration();

    const modal = page.locator('[data-testid="ai-consent-modal"]');
    await modal.waitFor({ timeout: 20_000 });
    out.popped = true;

    await page.locator(`[data-testid="${clickTestId}"]`).click();
    await modal.waitFor({ state: 'detached', timeout: 15_000 }).catch(() => undefined);

    // Persisted to Dexie?
    let persisted = null;
    for (let i = 0; i < 20; i++) {            // poll up to ~10s for the write
      persisted = await readConsent();
      if (persisted === decision) break;
      await page.waitForTimeout(500);
    }
    out.persisted = persisted;

    // Cold boot: reload (fresh heap, Dexie intact) → modal must NOT re-pop.
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await dismissCalibration();             // a fresh heap may re-show calibration if that also failed; harmless here
    await page.waitForTimeout(3000);
    out.repopped = (await page.locator('[data-testid="ai-consent-modal"]').count()) > 0;
    return out;
  }

  const results = [];

  console.log('\n[flow] GRANTED — allow, then cold-boot reload');
  try {
    const g = await runFlow('granted');
    results.push({ label: 'consent modal auto-pops (granted flow)', ok: g.popped === true, why: g.popped ? 'popped' : 'never popped' });
    results.push({ label: "Allow persists aiDataConsent='granted' to Dexie", ok: g.persisted === 'granted', why: `persisted=${g.persisted}` });
    results.push({ label: 'REGRESSION: modal does NOT re-pop on cold boot after granting', ok: g.repopped === false, why: g.repopped ? 're-popped (bug still present)' : 'stayed dismissed' });
  } catch (err) {
    results.push({ label: 'granted flow', ok: false, why: `error: ${err.message}` });
  }

  console.log('\n[flow] DENIED — dont-allow, then cold-boot reload');
  try {
    const d = await runFlow('denied');
    results.push({ label: "Don't allow persists aiDataConsent='denied' to Dexie", ok: d.persisted === 'denied', why: `persisted=${d.persisted}` });
    results.push({ label: 'denied user is not re-nagged on cold boot', ok: d.repopped === false, why: d.repopped ? 're-popped' : 'stayed dismissed' });
  } catch (err) {
    results.push({ label: 'denied flow', ok: false, why: `error: ${err.message}` });
  }

  for (const r of results) console.log(`  ${r.ok ? '✓ PASS' : '✗ FAIL'} — ${r.label} :: ${r.why}`);

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n[summary] ${passed}/${results.length} scenarios passed`);
  if (consoleErrors.length) {
    console.log(`[console-errors] ${consoleErrors.length}:`);
    consoleErrors.slice(0, 5).forEach((m) => console.log(`  ${m}`));
  }

  await mkdir('audit-reports', { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await writeFile(
    join('audit-reports', `ai-consent-persist-${stamp}.json`),
    JSON.stringify({ base: BASE_URL, results, consoleErrors }, null, 2),
  );

  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
