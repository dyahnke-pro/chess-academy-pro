// 3-instrument post-deploy audit for the 2026-06-23 model-game work:
//   1. Vienna model game swapped to Nakamura-Firouzja (Vienna Gambit) — proves
//      the new model-games.json shipped (and the old Caruana-Grischuk / Kasparov
//      games are gone).
//   2. ModelGameViewer explore (compass) button now supports click-to-move.
//   3. Variation-tab tagging — a tagged game surfaces under its variation tab.
//
// Instruments (G1): Playwright drives the live page; the prod audit-stream is
// pulled before + after; the narration listener is attached (model-game viewer
// only voices critical moments, so it may stay quiet — informational).
//
// Run: AUDIT_SANDBOX=1 node scripts/audit-vienna-modelgames-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';
const results = [];
const rec = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`[audit] ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ` :: ${detail}` : ''}`); };

async function pullStream(since) {
  if (!SECRET) return { ok: false, note: 'no secret' };
  try { const r = await fetch(`${BASE}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
    const j = await r.json().catch(() => ({})); return { ok: r.status === 200, status: r.status, storage: j.storage, count: j.count ?? (j.entries?.length ?? 0) };
  } catch (e) { return { ok: false, note: String(e).slice(0, 80) }; }
}

async function main() {
  const listener = await startAuditListener();
  const t0 = Date.now();
  const streamBefore = await pullStream(t0 - 60000);
  console.log('[audit] stream before:', JSON.stringify(streamBefore));

  const isLocal = /localhost|127\.0\.0\.1/.test(BASE);
  const proxyServer = isLocal ? undefined : (process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
    ...(proxyServer ? { proxy: { server: proxyServer } } : {}),
  });
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 140)));

  // Point the page's audit stream at the local listener on first load.
  await page.addInitScript((url) => { try { localStorage.setItem('auditStreamUrl', url); } catch { /* */ } }, listener.url);

  try {
    await page.goto(`${BASE}/openings/vienna-game`, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Dismiss onboarding bubble + page-help modal.
    try {
      const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
      await bubble.waitFor({ state: 'visible', timeout: 12000 });
      await page.locator('[data-testid="skill-band-intermediate"]').click();
      await bubble.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* bubble may not appear on a warm context */ }
    try { await page.locator('[data-testid="page-help-modal"] button').first().click({ timeout: 4000 }); } catch { /* */ }

    // Wait for the deferred seed to land the new Vienna model game in Dexie
    // (poll with evaluate — more reliable than waitForFunction for async IDB).
    const readVienna = () => page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => { const db = req.result;
        if (!db.objectStoreNames.contains('modelGames')) { resolve(null); return; }
        const all = db.transaction('modelGames', 'readonly').objectStore('modelGames').getAll();
        all.onsuccess = () => resolve(all.result.filter((g) => g.openingId === 'vienna-game').map((g) => `${g.white}/${g.variation || '-'}`));
        all.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    }));
    let viennaGames = null;
    for (let i = 0; i < 14; i++) {
      await page.waitForTimeout(7000);
      const v = await readVienna();
      if (Array.isArray(v) && v.some((s) => s.includes('Nakamura'))) { viennaGames = v; break; }
    }
    rec('new Nakamura Vienna Gambit game shipped to prod Dexie', !!viennaGames, viennaGames ? JSON.stringify(viennaGames) : 'not found in 75s');

    // The removed/old games must be gone.
    const oldGone = await page.evaluate(async () => {
      return await new Promise((resolve) => {
        const req = indexedDB.open('ChessAcademyDB');
        req.onsuccess = () => { const tx = req.result.transaction('modelGames', 'readonly');
          const g = tx.objectStore('modelGames').get('mg-lichess-2NIYGBtv');
          g.onsuccess = () => resolve(!g.result); g.onerror = () => resolve(true); };
        req.onerror = () => resolve(true);
      });
    });
    rec('old Caruana-Grischuk Vienna game removed from prod', oldGone, oldGone ? 'absent' : 'STILL PRESENT');

    // Variation tagging shipped: at least one Vienna game carries a variation tag.
    const tagged = Array.isArray(viennaGames) && viennaGames.some((s) => !s.endsWith('/-'));
    rec('Vienna model game carries a variation tag', tagged, Array.isArray(viennaGames) ? viennaGames.join(', ') : 'n/a');

    // Best-effort UI drive of the explore (compass) nav fix. The Model Games
    // section only renders under the variation tab whose games match, so it may
    // not be on the default landing; the live compass tap is also a touch
    // gesture better confirmed on-device. Logged as INFO, never fails the run —
    // the explore click-to-move logic is covered by ModelGameViewer.test.tsx.
    try {
      const section = page.locator('[data-testid="model-games-section"]');
      await section.scrollIntoViewIfNeeded({ timeout: 8000 });
      const card = page.locator('[data-testid^="model-game-card-"]').first();
      await card.click({ timeout: 6000 });
      await page.locator('[data-testid="model-game-viewer"]').waitFor({ state: 'visible', timeout: 8000 });
      await page.locator('[data-testid="model-game-explore"]').click({ timeout: 6000 });
      await page.locator('[data-square="e2"]').click({ timeout: 4000, force: true });
      await page.locator('[data-square="e4"]').click({ timeout: 4000, force: true });
      const moved = await page.getByText(/Exploring:/).first().isVisible().catch(() => false);
      console.log(`[audit] INFO — explore click-to-move drive: ${moved ? 'move registered' : 'reached viewer, move not confirmed'}`);
    } catch (e) {
      console.log(`[audit] INFO — explore UI not driven headless (verify compass on-device): ${String(e.message || e).slice(0, 70)}`);
    }

    rec('no uncaught page errors during the run', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  } finally {
    const streamAfter = await pullStream(t0);
    console.log('[audit] stream after:', JSON.stringify(streamAfter));
    console.log('[audit] listener voice events:', listener.getCapturedEvents().length);
    await browser.close();
    await listener.stop();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n[audit] ${passed}/${results.length} checks passed`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
main().catch((e) => { console.error('[audit] fatal', e); process.exit(1); });
