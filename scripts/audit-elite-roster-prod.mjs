#!/usr/bin/env node
/**
 * Audit-elite-roster — post-deploy audit for the Elite (pro-repertoire)
 * roster after the 2026-07-30 removal of the seven zero-opening
 * placeholder pros.
 *
 * Contract:
 *   1. The Elite tab shows exactly the 8 built pros; the 7 removed ids
 *      render NO card.
 *   2. Every card shows a non-zero opening count (no dead "0 openings").
 *   3. A kept player's page still lists their openings and a tile opens.
 *   4. G8: a stale Dexie row whose proPlayerId left the roster is swept
 *      by reconcileProRepertoires on the next boot.
 *
 * Three instruments (G1): Playwright drives, the prod audit-stream is
 * pulled before + after, and the narration listener is attached.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-elite-roster-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/elite-roster-${stamp}`;

const KEPT = ['naroditsky', 'gothamchess', 'carlsen', 'hikaru', 'caruana', 'ericrosen', 'samayraina', 'aman'];
const REMOVED = ['firouzja', 'dubov', 'gukesh', 'praggnanandhaa', 'niemann', 'annacramling', 'chesswithakeem'];

const results = [];
function rec(name, status, detail = '') {
  results.push({ name, status, detail });
  console.log(`  [${status}] ${name}${detail ? ' :: ' + detail : ''}`);
}

async function pullStream(since) {
  try {
    const res = await fetch(`${BASE_URL}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (e) {
    return { error: String(e.message ?? e) };
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const tStart = Date.now();
  console.log(`=== Elite roster audit :: ${BASE_URL} ===`);

  console.log('\n--- (2) audit-stream baseline ---');
  const baseline = await pullStream(tStart - 60_000);
  rec('audit-stream reachable', baseline.error ? 'FAIL' : 'PASS',
    baseline.error ?? `${(baseline.entries ?? []).length} events / storage=${baseline.storage}`);

  console.log('\n--- (3) narration listener sidecar ---');
  const listener = await startAuditListener();
  rec('narration listener up', 'PASS', listener.url);

  console.log('\n--- (1) Playwright driving prod ---');
  const executablePath = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({
    ...sandboxContextOptions(),
    viewport: { width: 414, height: 896 },
    userAgent: 'AuditEliteRosterBot/1.0 (chromium)',
  });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(({ url, secret }) => {
    try {
      window.localStorage.setItem('auditStreamUrl', url);
      window.localStorage.setItem('auditStreamSecret', secret);
    } catch { /* storage blocked — listener just stays quiet */ }
  }, { url: listener.url, secret: SECRET });

  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|manifest|Failed to load resource/i.test(t)) return;
    consoleErrors.push(t);
  });

  try {
    await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('[data-testid="tab-pro"]').waitFor({ timeout: 45_000 });

    // The deferred seed streams in ~30-60s after first navigation
    // (CLAUDE.md G1.6) and writes pro_data_revision LAST. Wait for that
    // key — a single pro row landing mid-write is not "seeded", and the
    // player page reads Dexie once on mount, so racing it renders empty.
    let revision = null;
    for (let i = 0; i < 40; i++) {
      revision = await page.evaluate(async () => {
        try {
          const db = await new Promise((resolve, reject) => {
            const req = indexedDB.open('ChessAcademyDB');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });
          const row = await new Promise((resolve) => {
            const t = db.transaction('meta', 'readonly');
            const r = t.objectStore('meta').get('pro_data_revision');
            r.onsuccess = () => resolve(r.result);
            r.onerror = () => resolve(null);
          });
          db.close();
          return row?.value ?? null;
        } catch { return null; }
      });
      if (revision) break;
      await page.waitForTimeout(5000);
    }
    rec('deferred seed complete', revision ? 'PASS' : 'FAIL', revision ?? 'no pro_data_revision after 200s');
    await page.locator('[data-testid="tab-pro"]').click();
    await page.locator('[data-testid="pro-repertoires-tab"]').waitFor({ timeout: 20_000 });
    rec('Elite tab mounts', 'PASS');

    // (1) removed pros render no card
    const stillThere = [];
    for (const id of REMOVED) {
      if (await page.locator(`[data-testid="pro-player-card-${id}"]`).count() > 0) stillThere.push(id);
    }
    rec('removed placeholder pros absent', stillThere.length === 0 ? 'PASS' : 'FAIL',
      stillThere.length ? `still rendering: ${stillThere.join(', ')}` : `${REMOVED.length} ids checked`);

    // (2) kept pros present, each with a non-zero opening count
    const missing = [];
    const zeroCount = [];
    for (const id of KEPT) {
      const card = page.locator(`[data-testid="pro-player-card-${id}"]`);
      if (await card.count() === 0) { missing.push(id); continue; }
      const text = (await card.innerText()).replace(/\s+/g, ' ');
      const m = text.match(/(\d+)\s+openings/);
      if (!m || Number(m[1]) === 0) zeroCount.push(`${id} → "${m ? m[0] : 'no count'}"`);
    }
    rec('all 8 built pros render', missing.length === 0 ? 'PASS' : 'FAIL',
      missing.length ? `missing: ${missing.join(', ')}` : KEPT.join(', '));
    rec('no card shows 0 openings', zeroCount.length === 0 ? 'PASS' : 'FAIL', zeroCount.join('; '));

    const cardCount = await page.locator('[data-testid^="pro-player-card-"]').count();
    rec('card count == 8', cardCount === 8 ? 'PASS' : 'FAIL', `saw ${cardCount}`);

    // (3) a kept player's page still lists openings
    await page.locator('[data-testid="tab-pro"]').click();
    await page.locator('[data-testid="pro-player-card-naroditsky"]').click();
    await page.waitForURL(/\/openings\/pro\/naroditsky/, { timeout: 20_000 });
    await page.waitForTimeout(8000);
    const tiles = await page.locator('[data-testid^="opening-card-pro-naroditsky"]').count();
    rec('kept player page lists openings', tiles === 11 ? 'PASS' : 'FAIL', `tiles=${tiles} (expected 11)`);

    // a tile still opens its detail page
    if (tiles > 0) {
      await page.locator('[data-testid^="opening-card-pro-naroditsky"]').first().click();
      const routed = await page.waitForURL(/\/pro-naroditsky-/, { timeout: 20_000 }).then(() => true).catch(() => false);
      const mounted = await page.locator('[data-testid="opening-detail"]')
        .first().waitFor({ timeout: 25_000 }).then(() => true).catch(() => false);
      rec('opening tile opens its detail page', routed && mounted ? 'PASS' : 'FAIL',
        `${page.url()} routed=${routed} mounted=${mounted}`);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
    }

    // (4) G8 sweep — a row for a dropped player is deleted on reconcile
    const sweep = await page.evaluate(async () => {
      function open() {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('ChessAcademyDB');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
      }
      function tx(db, store, mode, fn) {
        return new Promise((resolve, reject) => {
          const t = db.transaction(store, mode);
          const s = t.objectStore(store);
          const r = fn(s);
          t.oncomplete = () => resolve(r?.result);
          t.onerror = () => reject(t.error);
        });
      }
      const db = await open();
      const template = await tx(db, 'openings', 'readonly', (s) => s.get('pro-naroditsky-caro-kann'));
      if (!template) return { ok: false, reason: 'template row missing — pro data not seeded yet' };
      const orphan = { ...template, id: 'pro-dubov-audit-orphan', proPlayerId: 'dubov' };
      await tx(db, 'openings', 'readwrite', (s) => s.put(orphan));
      const wrote = await tx(db, 'openings', 'readonly', (s) => s.get('pro-dubov-audit-orphan'));
      // force reconcile on next boot
      await tx(db, 'meta', 'readwrite', (s) => s.delete('pro_data_revision'));
      db.close();
      return { ok: Boolean(wrote), seeded: Boolean(wrote) };
    });

    if (!sweep.ok) {
      rec('G8 dropped-player sweep', 'SKIP', sweep.reason ?? 'could not seed orphan');
    } else {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(25_000);
      const gone = await page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => {
          const req = indexedDB.open('ChessAcademyDB');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        const row = await new Promise((resolve, reject) => {
          const t = db.transaction('openings', 'readonly');
          const r = t.objectStore('openings').get('pro-dubov-audit-orphan');
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
        db.close();
        return !row;
      });
      rec('G8 dropped-player sweep', gone ? 'PASS' : 'FAIL',
        gone ? 'pro-dubov-audit-orphan deleted on reconcile' : 'orphan survived reconcile');
    }
  } catch (e) {
    rec('driver', 'FAIL', String(e.message ?? e));
  }

  rec('no pageerror', pageErrors.length === 0 ? 'PASS' : 'FAIL', pageErrors.slice(0, 3).join(' | '));
  rec('no console error', consoleErrors.length === 0 ? 'PASS' : 'FAIL', consoleErrors.slice(0, 3).join(' | '));

  await page.screenshot({ path: join(OUT_DIR, 'elite-tab.png'), fullPage: true }).catch(() => {});
  await browser.close();

  console.log('\n--- (2) audit-stream delta ---');
  const after = await pullStream(tStart);
  const events = after.entries ?? [];
  rec('audit-stream delta pulled', after.error ? 'FAIL' : 'PASS',
    after.error ?? `${events.length} events this run`);

  const heard = listener.events ?? [];
  rec('narration listener events', 'INFO', `${heard.length} voice events (roster tab is silent by design)`);
  await listener.stop?.();

  const fails = results.filter((r) => r.status === 'FAIL');
  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify({ base: BASE_URL, results, events: events.length, voice: heard.length }, null, 2));
  console.log(`\n=== ${results.filter((r) => r.status === 'PASS').length} pass / ${fails.length} fail — report ${OUT_DIR}/report.json`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
