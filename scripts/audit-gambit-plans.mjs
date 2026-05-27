// Post-deploy interactive audit for the separate-lane GAMBIT middlegame plans.
// For every gambit-tab opening: navigate, confirm the plan seeds + the section
// renders, exercise Watch (board + narration + lead-the-eye paint) and Learn.
// Pieces load from a CDN that's blocked in the sandbox, so piece-render is NOT
// asserted here (it works on prod); everything else is. Run against a local dev
// server: AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-gambit-plans.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const PLANS = JSON.parse(readFileSync('src/data/gambit-plans.json', 'utf8')).map((p) => ({ id: p.openingId, plan: p.id }));
// Albin's plan is the masterclass one (shared id), shown on the gambit card too.
PLANS.push({ id: 'albin-countergambit', plan: 'mp-albincountergambit-main' });
const OUT = join('audit-reports', `gambit-plans-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const report = [];

async function dismiss(page) {
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
async function seeded(page, id) {
  return page.evaluate((oid) => new Promise((res) => {
    const r = indexedDB.open('ChessAcademyDB');
    r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('middlegamePlans')) return res(0);
      const tx = db.transaction('middlegamePlans', 'readonly').objectStore('middlegamePlans').getAll();
      tx.onsuccess = () => res(tx.result.filter((p) => p.openingId === oid).length); tx.onerror = () => res(-1); };
    r.onerror = () => res(-1);
  }), id);
}
async function leadEyePainted(page) {
  return page.evaluate(() => {
    let n = 0;
    for (const d of document.querySelectorAll('div')) {
      const bg = getComputedStyle(d).backgroundColor.replace(/\s/g, '');
      if (/255,165,0|255,235,59|34,197,94/.test(bg)) n++;
    }
    return n;
  });
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const page = await browser.newContext(sandboxContextOptions()).then((c) => c.newPage());
  page.setDefaultTimeout(25000);
  for (const { id, plan } of PLANS) {
    const r = { id, plan, seeded: 0, section: false, line: false, watchNarration: false, leadEye: 0, learn: false, error: null };
    try {
      await page.goto(`${BASE}/openings/${id}`, { waitUntil: 'domcontentloaded' });
      await dismiss(page);
      for (let i = 0; i < 40; i++) { r.seeded = await seeded(page, id); if (r.seeded > 0) break; await page.waitForTimeout(1500); }
      if (r.seeded > 0) { await page.reload({ waitUntil: 'domcontentloaded' }); await dismiss(page); }
      r.section = await page.locator('[data-testid="middlegame-plans-section"]').isVisible({ timeout: 20000 }).catch(() => false);
      r.line = await page.locator(`[data-testid="plan-line-${plan}"]`).isVisible().catch(() => false);
      if (r.line) {
        await page.locator(`[data-testid="plan-watch-${plan}"]`).click().catch(() => {});
        await page.waitForTimeout(3500);
        r.watchNarration = await page.locator('text=/gambit|centre|attack|pawn|develop|king|bishop|knight/i').first().isVisible().catch(() => false);
        r.leadEye = await leadEyePainted(page);
        await page.goto(`${BASE}/openings/${id}`, { waitUntil: 'domcontentloaded' }); await dismiss(page);
        await page.locator(`[data-testid="plan-learn-${plan}"]`).click().catch(() => {});
        await page.waitForTimeout(2000);
        r.learn = await page.locator('text=/Learn/i').first().isVisible().catch(() => false);
      }
    } catch (e) { r.error = e.message; }
    const ok = r.seeded > 0 && r.section && r.line && r.watchNarration && r.leadEye > 0 && r.learn;
    console.log(`${ok ? 'PASS' : 'WARN'}  ${id.padEnd(24)} seed:${r.seeded} sec:${+r.section} line:${+r.line} narr:${+r.watchNarration} leadEye:${r.leadEye} learn:${+r.learn}${r.error ? ' ERR:' + r.error : ''}`);
    report.push({ ...r, ok });
  }
  await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  const pass = report.filter((r) => r.ok).length;
  console.log(`\n=== ${pass}/${report.length} fully green — report ${OUT} ===`);
  await browser.close();
})();
