#!/usr/bin/env node
// audit-board-bar-fold — THE BOARD BAR IS ON SCREEN WITHOUT SCROLLING (David
// 2026-10-07: "Keep the boards identical … All buttons NEED to be visible
// without scrolling down! Even the show the line button").
//
// For each phone viewport, opens Learn, Play, Review and the Openings Play rung
// on a fresh device and asserts, with the page at scrollY 0:
//   • the ONE bar (`coach-board-bar`) renders on every board,
//   • all six core buttons are inside the viewport (bottom ≤ innerHeight),
//   • and so is the extras row.
// MUTED (G1). Run: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-board-bar-fold.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const VIEWPORTS = [{ width: 375, height: 667 }, { width: 390, height: 844 }];
const CORE = ['back', 'forward', 'hint', 'read', 'why', 'line'];
const OPENING = process.env.AUDIT_OPENING ?? 'vienna-game';

const rows = [];
const pass = (name) => { rows.push({ name, ok: true }); console.log(`  ✓ ${name}`); };
const fail = (name, why) => { rows.push({ name, ok: false, why }); console.log(`  ✗ ${name} — ${why}`); };

async function consent(page) {
  const allow = page.locator('[data-testid="ai-consent-allow"]');
  if (await allow.count()) await allow.first().click({ timeout: 2000 }).catch(() => {});
}

/** Every core button of the bar inside the viewport, at scrollY 0. */
async function checkFold(page, label) {
  const bar = page.locator('[data-testid="coach-board-bar"]').first();
  try { await bar.waitFor({ state: 'attached', timeout: 120000 }); } catch { fail(`${label}: bar renders`, 'no coach-board-bar'); return; }
  pass(`${label}: bar renders`);
  await page.evaluate(() => { window.scrollTo(0, 0); for (const el of document.querySelectorAll('*')) if (el.scrollTop) el.scrollTop = 0; });
  await page.waitForTimeout(300);
  const out = await page.evaluate((core) => {
    const bar = document.querySelector('[data-testid="coach-board-bar"]');
    if (!bar) return null;
    // The screen ends where the fixed bottom nav begins — a button under it is
    // as hidden as one below the glass.
    const nav = document.querySelector('[data-bottom-nav]');
    const h = Math.round(nav && nav.getBoundingClientRect().height > 0 ? nav.getBoundingClientRect().top : window.innerHeight);
    const btns = [...bar.querySelectorAll(':scope > div:first-child > button')];
    const extras = bar.querySelector('[data-testid="coach-board-bar-extras"]');
    return {
      h,
      count: btns.length,
      offscreen: btns.map((b, i) => ({ name: core[i], bottom: Math.round(b.getBoundingClientRect().bottom) })).filter((b) => b.bottom > h || b.bottom <= 0),
      extrasBottom: extras ? Math.round(extras.getBoundingClientRect().bottom) : null,
    };
  }, CORE);
  if (!out) { fail(`${label}: fold`, 'bar vanished'); return; }
  if (out.count !== 6) fail(`${label}: six buttons`, `found ${out.count}`); else pass(`${label}: six buttons`);
  if (out.offscreen.length) fail(`${label}: core buttons above the fold`, `${out.offscreen.map((b) => `${b.name}@${b.bottom}`).join(', ')} > ${out.h}`);
  else pass(`${label}: core buttons above the fold`);
  if (out.extrasBottom !== null && out.extrasBottom > out.h) fail(`${label}: extras above the fold`, `bottom ${out.extrasBottom} > ${out.h}`);
  else pass(`${label}: extras above the fold`);
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
try {
  for (const vp of VIEWPORTS) {
    const tag = `${vp.width}×${vp.height}`;
    console.log(`\n── ${tag}`);
    const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: vp, isMobile: true, hasTouch: true });
    await ctx.addInitScript(muteTtsForAudit);
    await ctx.addInitScript(autoDismissCalibration);
    // A fresh page per surface — four heavy boards in one tab run the dev
    // server's renderer out of memory, which reads as a product crash.
    const fresh = async () => { for (const old of ctx.pages()) await old.close().catch(() => {}); return ctx.newPage(); };

    let page = await fresh();
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' });
    await consent(page);
    await checkFold(page, `${tag} Learn`);

    page = await fresh();
    await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded' });
    await consent(page);
    await checkFold(page, `${tag} Play`);

    page = await fresh();
    await page.goto(`${BASE}/openings/${OPENING}?line=main`, { waitUntil: 'domcontentloaded' });
    // The openings store fills on the deferred seed (~30-60s cold): unlock the
    // ladder by SEEDING, never by clicking, once the row exists.
    for (let i = 0; i < 30; i++) {
      const r = await seedUnlockedOpenings(page, [OPENING]).catch(() => null);
      if (r?.updated) break;
      await page.waitForTimeout(3000);
    }
    await page.goto(`${BASE}/openings/${OPENING}?line=main`, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const play = page.locator('[data-testid="play-btn"]').first();
    try { await play.waitFor({ timeout: 60000 }); } catch { fail(`${tag} Openings Play: reach`, 'play-btn not reachable'); }
    if (await play.count()) { await play.click({ force: true }); await checkFold(page, `${tag} Openings Play`); }

    // The review list seeds the sample games on first visit; then open one.
    page = await fresh();
    await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await page.goto(`${BASE}/coach/review/sample-morphy-opera-1858`, { waitUntil: 'domcontentloaded' });
    await consent(page);
    // The review opens on its summary card; Start walk mounts the board.
    // A tap that lands before the card's handler is live does nothing (a
    // harness timing artifact, not an overlay) — tap again until the walk mounts.
    for (let i = 0; i < 24; i++) {
      if (await page.locator('[data-testid="coach-board-bar"]').count()) break;
      const start = page.locator('[data-testid="start-walk-btn"]').first();
      if (await start.count()) await start.evaluate((el) => el.click()).catch(() => {});
      await page.waitForTimeout(5000);
    }
    await checkFold(page, `${tag} Review`);

    await ctx.close();
  }
} finally {
  await browser.close();
}
const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} PASS`);
process.exit(failed.length ? 1 : 0);
