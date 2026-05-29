// Interactive PROD audit for the GAMBIT-TAB punish-gems (separate lane).
// Drives the live UI: unlocks each line's WEAPONS section by pre-seeding the
// opening record's `linesUnlockedAll` at LOAD (reads work in-sandbox; only the
// click-handler writes stall — CLAUDE.md G1), then verifies the gem WLPP cards
// surface, Watch mounts the played-out line, and the Watch annotation shows the
// hand-authored narration. Run:
//   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   node scripts/audit-gambit-gems-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OUT = join('audit-reports', `gambit-gems-${new Date().toISOString().replace(/[:.]/g, '-')}`);
// White + Black, original + newly-narrated. Each must surface ≥1 gem.
const TARGETS = ['gambit-kings-gambit', 'vienna-gambit', 'stafford-gambit', 'englund-gambit'];
const results = [];
const rec = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); };

async function dismissModals(page) {
  const cal = page.locator('[data-testid="strength-calibration-bubble"]');
  await cal.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await cal.count() > 0) {
    await page.locator('[data-testid^="skill-band-"]').first().click({ timeout: 5000 }).catch(() => {});
    await cal.waitFor({ state: 'detached', timeout: 45000 }).catch(() => {});
  }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.isVisible().catch(() => false)) {
    await page.locator('[data-testid="page-help-close"]').click({ timeout: 5000 }).catch(() => {});
    await help.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
}

// Has the gambit opening record been seeded yet?
async function openingSeeded(page, id) {
  return page.evaluate((openingId) => new Promise((resolve) => {
    const r = indexedDB.open('ChessAcademyDB');
    r.onsuccess = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('openings')) return resolve(false);
      const g = db.transaction('openings', 'readonly').objectStore('openings').get(openingId);
      g.onsuccess = () => resolve(!!g.result);
      g.onerror = () => resolve(false);
    };
    r.onerror = () => resolve(false);
  }), id);
}

// Pre-seed the unlock at LOAD: set linesUnlockedAll on the opening record so
// areWeaponsUnlocked() returns true for the main line (-1) + every variation.
async function unlockWeapons(page, ids) {
  return page.evaluate((openingIds) => new Promise((resolve) => {
    const r = indexedDB.open('ChessAcademyDB');
    r.onsuccess = () => {
      const db = r.result;
      const tx = db.transaction('openings', 'readwrite');
      const store = tx.objectStore('openings');
      let done = 0; const out = {};
      const lines = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (const id of openingIds) {
        const g = store.get(id);
        g.onsuccess = () => {
          const rec = g.result;
          if (rec) { rec.linesUnlockedAll = lines; rec.linesPlayed = lines; store.put(rec); out[id] = true; }
          else out[id] = false;
          if (++done === openingIds.length) { /* wait for tx */ }
        };
        g.onerror = () => { out[id] = false; if (++done === openingIds.length) {} };
      }
      tx.oncomplete = () => resolve({ ok: true, out });
      tx.onerror = () => resolve({ ok: false, out });
      tx.onabort = () => resolve({ ok: false, out, aborted: true });
    };
    r.onerror = () => resolve({ ok: false, reason: 'open-failed' });
    // Safety timeout — surfaces the write-stall instead of hanging forever.
    setTimeout(() => resolve({ ok: false, reason: 'timeout' }), 20000);
  }), ids);
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const page = await browser.newContext(sandboxContextOptions()).then((c) => c.newPage());
  page.setDefaultTimeout(30000);
  const report = { ts: new Date().toISOString(), base: BASE, targets: TARGETS, results, perOpening: {} };
  try {
    // Boot once and let the deferred seed run (gambits land late — allow 60s).
    await page.goto(`${BASE}/openings/${TARGETS[0]}`, { waitUntil: 'domcontentloaded' });
    await dismissModals(page);
    let seeded = false;
    for (let i = 0; i < 40; i++) { seeded = await openingSeeded(page, TARGETS[0]); if (seeded) break; await page.waitForTimeout(2000); }
    rec('gambit openings seeded', seeded, `${TARGETS[0]} present in IndexedDB`);

    for (const id of TARGETS) {
      const o = { gemButtons: 0, watchMounted: false, annotation: '', unlocked: false };
      await page.goto(`${BASE}/openings/${id}`, { waitUntil: 'domcontentloaded' });
      await dismissModals(page);
      // Wait for THIS opening's record, then unlock it and reload so the read
      // is fresh AND after its own deferred-seed write (the seed runs per
      // opening; unlocking globally up-front gets clobbered for late ones).
      for (let i = 0; i < 30; i++) { if (await openingSeeded(page, id)) break; await page.waitForTimeout(2000); }
      const unlock = await unlockWeapons(page, [id]);
      o.unlocked = !!unlock.ok;
      await page.reload({ waitUntil: 'domcontentloaded' });
      await dismissModals(page);
      // Weapons section + gem cards (main-line tab surfaces ALL the opening's gems).
      const watchBtns = page.locator(`[data-testid^="gem-watch-${id}"]`);
      await watchBtns.first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
      o.gemButtons = await watchBtns.count();
      rec(`${id}: gem weapon cards surface`, o.gemButtons > 0, `${o.gemButtons} gem(s)`);
      await page.screenshot({ path: join(OUT, `${id}-cards.png`), fullPage: true }).catch(() => {});

      if (o.gemButtons > 0) {
        await watchBtns.first().click({ timeout: 10000 }).catch(() => {});
        const demo = page.locator('[data-testid="line-player-demo"]');
        o.watchMounted = await demo.isVisible({ timeout: 15000 }).catch(() => false);
        rec(`${id}: gem Watch mounts the played-out line`, o.watchMounted);
        // The demo auto-plays; the inaccuracy/punish beats carry the narration
        // (move 0 = silent book setup). Poll the annotation until it populates.
        const anno = page.locator('[data-testid="demo-annotation"]').first();
        for (let i = 0; i < 16; i++) {
          o.annotation = (await anno.innerText({ timeout: 4000 }).catch(() => '')).trim();
          if (o.annotation.length > 0) break;
          await page.waitForTimeout(1500);
        }
        rec(`${id}: Watch shows hand-authored narration`, o.annotation.length > 0, o.annotation.slice(0, 90));
        await page.screenshot({ path: join(OUT, `${id}-watch.png`), fullPage: true }).catch(() => {});
        // back out for the next opening
        await page.locator('[data-testid="line-player-back"]').click({ timeout: 5000 }).catch(() => {});
      }
      report.perOpening[id] = o;
    }
  } catch (err) {
    console.error('AUDIT ERROR:', err.message);
    rec('audit completed without throwing', false, err.message);
  } finally {
    await browser.close();
    await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n${pass}/${results.length} checks green — report at ${OUT}`);
  }
})();
