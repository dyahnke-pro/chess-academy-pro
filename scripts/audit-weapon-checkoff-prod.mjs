// Focused post-deploy audit for the WLPP weapon (trap/gem) check-off fix.
//
// The bug: named-trap + punish-gem WLPP rows never checked off when completed
// (they persisted nothing and rendered no ✓). The fix adds string-keyed
// `weaponRungs` on OpeningRecord, written by markWeaponRungComplete and read by
// isWeaponRungComplete to render the green ✓ per rung.
//
// This audit proves the READ/RENDER + persistence path on LIVE prod: seed a
// gem's weaponRungs into IndexedDB, reload, and assert the ✓ renders for the
// seeded rungs (and stays absent for the unseeded ones). The WRITE path
// (markWeaponRungComplete monotonic backfill) is covered by the unit suite
// openingService.ladder.test.ts. Together: write proven by unit, read+persist
// proven here against the deployed bundle.
//
// Run: AUDIT_SANDBOX=1 node scripts/audit-weapon-checkoff-prod.mjs
import { chromium } from 'playwright';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OPENING = 'caro-kann';

async function dismissOverlays(page) {
  // Strength-calibration bubble (fresh context) → pick Intermediate, wait gone.
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ state: 'visible', timeout: 6000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown on this load */ }
  // Page-help modal that auto-opens on the surface.
  try {
    const help = page.locator('[data-testid="page-help-modal"]');
    await help.waitFor({ state: 'visible', timeout: 3000 });
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* none */ }
}

function seedWeaponRungs(page, openingId, weaponKey, rungs) {
  return page.evaluate(({ openingId, weaponKey, rungs }) => new Promise((resolve) => {
    let settled = false;
    const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
    setTimeout(() => finish({ ok: false, reason: 'open-timeout' }), 15000);
    const req = indexedDB.open('ChessAcademyDB');
    req.onerror = () => finish({ ok: false, reason: 'open-error' });
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('openings', 'readwrite');
      const store = tx.objectStore('openings');
      const g = store.get(openingId);
      g.onsuccess = () => {
        const rec = g.result;
        if (!rec) { finish({ ok: false, reason: 'no-record' }); return; }
        rec.weaponRungs = { ...(rec.weaponRungs ?? {}), [weaponKey]: rungs };
        // Re-assert the unlock in the SAME write so the gem section keeps
        // rendering after the reload (the boot reconcile can otherwise race it).
        rec.linesUnlockedAll = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        store.put(rec);
      };
      tx.oncomplete = () => { db.close(); finish({ ok: true }); };
      tx.onerror = () => { db.close(); finish({ ok: false, reason: 'tx-error' }); };
    };
  }), { openingId, weaponKey, rungs });
}

async function main() {
  const results = [];
  const rec = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' :: ' + detail : ''}`); };

  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();

  try {
    await page.goto(`${BASE}/openings/${OPENING}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dismissOverlays(page);
    await page.locator('[data-testid="opening-detail"]').waitFor({ state: 'visible', timeout: 60000 });

    // Let the deferred seed land the opening record.
    await page.waitForTimeout(8000);

    const unlock = await seedUnlockedOpenings(page, [OPENING]);
    rec('seed weapons unlocked', unlock.ok, JSON.stringify(unlock));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await page.locator('[data-testid="opening-detail"]').waitFor({ state: 'visible', timeout: 60000 });

    const gemWatch = page.locator('[data-testid^="gem-watch-"]').first();
    await gemWatch.waitFor({ state: 'visible', timeout: 30000 });
    const watchTestid = await gemWatch.getAttribute('data-testid');
    const gemKey = watchTestid.replace(/^gem-watch-/, '');
    rec('gem WLPP row rendered (weapons unlocked)', !!gemKey, gemKey);

    // Before seeding completion: no ✓ on this gem.
    const checkBefore = await page.locator(`[data-testid="gem-done-watch-${gemKey}"]`).count();
    rec('no checkmark before completion', checkBefore === 0, `count=${checkBefore}`);

    // Seed Watch+Learn complete, reload, assert the ✓ persists for those rungs.
    const seed = await seedWeaponRungs(page, OPENING, gemKey, ['watch', 'learn']);
    rec('seed weaponRungs[watch,learn]', seed.ok, JSON.stringify(seed));

    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await page.locator('[data-testid="opening-detail"]').waitFor({ state: 'visible', timeout: 60000 });
    // Query FAST — the boot reconcile can wipe the seeded unlock if we dawdle,
    // so assert the rendered ✓ as soon as the gem row paints (same timing that
    // surfaced the row on the prior reload).
    await page.locator(`[data-testid="gem-watch-${gemKey}"]`).first().waitFor({ state: 'visible', timeout: 30000 });

    const watchDone = await page.locator(`[data-testid="gem-done-watch-${gemKey}"]`).count();
    const learnDone = await page.locator(`[data-testid="gem-done-learn-${gemKey}"]`).count();
    const practiceDone = await page.locator(`[data-testid="gem-done-practice-${gemKey}"]`).count();
    const playDone = await page.locator(`[data-testid="gem-done-play-${gemKey}"]`).count();

    rec('Watch ✓ persists across reload', watchDone === 1, `count=${watchDone}`);
    rec('Learn ✓ persists across reload', learnDone === 1, `count=${learnDone}`);
    rec('Practice ✓ correctly absent (not completed)', practiceDone === 0, `count=${practiceDone}`);
    rec('Play ✓ correctly absent (not completed)', playDone === 0, `count=${playDone}`);
  } catch (e) {
    rec('audit ran without throwing', false, String(e?.message ?? e));
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} checks green`);
  process.exit(passed === results.length ? 0 : 1);
}

main();
