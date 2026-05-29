// Wave-0 prod audit: the Italian masterclass data-rebuild (2026-05-29).
// Verifies the live page reflects the rebuild — variation tabs are
// Two Knights / Evans / Møller (NO "Modern" duplicate), and the main-line
// Watch plays the new Giuoco Pianissimo narration on the data spine.
//   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   node scripts/audit-italian-rebuild-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OUT = join('audit-reports', `italian-rebuild-${new Date().toISOString().replace(/[:.]/g, '-')}`);
const results = [];
const rec = (n, ok, d = '') => { results.push({ n, ok, d }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? ' — ' + d : ''}`); };

async function dismiss(page) {
  const cal = page.locator('[data-testid="strength-calibration-bubble"]');
  await cal.waitFor({ state: 'visible', timeout: 4000 }).catch(() => {});
  if (await cal.count() > 0) { await page.locator('[data-testid^="skill-band-"]').first().click({ timeout: 5000 }).catch(() => {}); await cal.waitFor({ state: 'detached', timeout: 45000 }).catch(() => {}); }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.isVisible().catch(() => false)) { await page.locator('[data-testid="page-help-close"]').click({ timeout: 5000 }).catch(() => {}); await help.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {}); }
}

(async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const page = await browser.newContext(sandboxContextOptions()).then((c) => c.newPage());
  page.setDefaultTimeout(30000);
  const report = { ts: new Date().toISOString(), base: BASE, results };
  try {
    await page.goto(`${BASE}/openings/italian-game`, { waitUntil: 'domcontentloaded' });
    await dismiss(page);
    await page.locator('[data-testid="variation-tabs"]').waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});

    // 1) Tab set: Two Knights / Evans / Møller present, NO "Modern".
    const tabText = (await page.locator('[data-testid="variation-tabs"]').innerText().catch(() => '')).replace(/\n/g, ' | ');
    rec('tabs include Two Knights', /two knights/i.test(tabText), tabText);
    rec('tabs include Evans', /evans/i.test(tabText));
    rec('tabs include Møller', /m(ø|o)ller/i.test(tabText));
    rec('NO redundant "Modern" tab', !/\bmodern\b/i.test(tabText), tabText);
    await page.screenshot({ path: join(OUT, 'tabs.png'), fullPage: true }).catch(() => {});

    // 2) Main-line Watch → the Pianissimo narration on the data spine.
    const watch = page.getByRole('button', { name: /^watch$/i }).first();
    await watch.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    let mounted = false, narration = '';
    if (await watch.count()) {
      await watch.click({ timeout: 10000 }).catch(() => {});
      const demo = page.locator('[data-testid="line-player-demo"], [data-testid="lesson-player"]').first();
      mounted = await demo.isVisible({ timeout: 15000 }).catch(() => false);
      rec('main-line Watch mounts the lesson player', mounted);
      const anno = page.locator('[data-testid="demo-annotation"], [data-testid="lesson-narration"]').first();
      for (let i = 0; i < 18; i++) {
        narration = (await anno.innerText({ timeout: 4000 }).catch(() => '')).trim();
        if (/pianissimo|quietest|delayed|manoeuvr|d3|f7/i.test(narration)) break;
        await page.waitForTimeout(1500);
      }
      rec('Watch speaks the Pianissimo narration', /pianissimo|quietest|delayed|manoeuvr|d3|f7|centre/i.test(narration), narration.slice(0, 100));
      await page.screenshot({ path: join(OUT, 'watch.png'), fullPage: true }).catch(() => {});
    } else {
      rec('main-line Watch button found', false);
    }
    report.tabText = tabText; report.narration = narration;
  } catch (err) {
    rec('audit completed without throwing', false, err.message);
  } finally {
    await browser.close();
    await writeFile(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
    const pass = results.filter((r) => r.ok).length;
    console.log(`\n${pass}/${results.length} checks green — ${OUT}`);
  }
})();
