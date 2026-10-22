#!/usr/bin/env node
// audit-board-bar-fold — THE BOARD BAR IS ON SCREEN WITHOUT SCROLLING (David
// 2026-10-07: "Keep the boards identical … All buttons NEED to be visible
// without scrolling down! Even the show the line button").
//
// For each phone viewport, opens Learn, the Campaign (before Start and in the
// game), Play, Review and the Openings Play rung on a fresh device and
// asserts, with the page at scrollY 0:
//   • the ONE bar (`coach-board-bar`) renders on every board,
//   • all six core buttons are inside the viewport (bottom ≤ innerHeight),
//   • and so is the extras row;
//   • no bar button is clipped sideways — every button's left/right edge sits
//     inside the viewport AND inside the extras row's own visible box (a row
//     that scrolls sideways hides its last button as surely as the glass);
//   • and all of it holds on the FIRST FRAME the bar is on screen, not only
//     once the page settles (2026-10-22: Review's extras row sat under the nav
//     for seconds after Start walk, until the first ply re-ran the fit);
//   • the Campaign's board is never smaller than Learn's before Start — its
//     missions card floats over the board (2026-10-21: under it, the card
//     pushed the board to its minimum and the bar under the nav).
// MUTED (G1). Run: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-board-bar-fold.mjs
// AUDIT_ONLY=review (comma list of learn,campaign,play,openings,review) scopes the run.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
// AUDIT_VIEWPORT=375x667 runs one size.
const VIEWPORTS = [{ width: 375, height: 667 }, { width: 390, height: 844 }]
  .filter((v) => !process.env.AUDIT_VIEWPORT || process.env.AUDIT_VIEWPORT === `${v.width}x${v.height}`);
const CORE = ['back', 'forward', 'hint', 'read', 'why', 'line'];
const OPENING = process.env.AUDIT_OPENING ?? 'vienna-game';
const ONLY = process.env.AUDIT_ONLY ? new Set(process.env.AUDIT_ONLY.split(',').map((s) => s.trim())) : null;
const on = (surface) => !ONLY || ONLY.has(surface);

const rows = [];
const pass = (name) => { rows.push({ name, ok: true }); console.log(`  ✓ ${name}`); };
const fail = (name, why) => { rows.push({ name, ok: false, why }); console.log(`  ✗ ${name} — ${why}`); };

async function consent(page) {
  const allow = page.locator('[data-testid="ai-consent-allow"]');
  if (await allow.count()) await allow.first().click({ timeout: 2000 }).catch(() => {});
}

/** Every core button of the bar inside the viewport, at scrollY 0. */
/** The board's width on screen (a8's left to h1's right), px. */
async function boardWidth(page) {
  return page.evaluate(() => {
    const a = document.querySelector('[data-square="a8"]')?.getBoundingClientRect();
    const h = document.querySelector('[data-square="h1"]')?.getBoundingClientRect();
    return a && h ? Math.round(h.right - a.left) : null;
  });
}

/** In the page: where every bar button sits, against the screen's bottom
 *  (the nav's top) and its sides (the viewport, and the extras row's box). */
function measureBar(core) {
  const bar = document.querySelector('[data-testid="coach-board-bar"]');
  if (!bar) return null;
  // The screen ends where the fixed bottom nav begins — a button under it is
  // as hidden as one below the glass.
  const nav = document.querySelector('[data-bottom-nav]');
  const h = Math.round(nav && nav.getBoundingClientRect().height > 0 ? nav.getBoundingClientRect().top : window.innerHeight);
  const w = window.innerWidth;
  const btns = [...bar.querySelectorAll(':scope > div:first-child > button')];
  const extras = bar.querySelector('[data-testid="coach-board-bar-extras"]');
  const extrasBox = extras ? extras.getBoundingClientRect() : null;
  const extraBtns = extras ? [...extras.querySelectorAll('button')] : [];
  const clipped = [];
  for (const [list, box] of [[btns, null], [extraBtns, extrasBox]]) {
    list.forEach((b, i) => {
      const r = b.getBoundingClientRect();
      if (r.width === 0) return;
      const left = Math.max(0, box ? box.left : 0);
      const right = Math.min(w, box ? box.right : w);
      const name = box ? (b.getAttribute('data-testid') || b.textContent || '?').trim() : core[i];
      if (r.left < left - 0.5 || r.right > right + 0.5) clipped.push(`${name}@${Math.round(r.left)}–${Math.round(r.right)} (visible ${Math.round(left)}–${Math.round(right)})`);
    });
  }
  return {
    h,
    count: btns.length,
    offscreen: btns.map((b, i) => ({ name: core[i], bottom: Math.round(b.getBoundingClientRect().bottom) })).filter((b) => b.bottom > h || b.bottom <= 0),
    extrasBottom: extrasBox ? Math.round(extrasBox.bottom) : null,
    clipped,
  };
}

/** The verdict rows for one measurement. */
function judge(out, label) {
  if (!out) { fail(`${label}: fold`, 'bar vanished'); return; }
  if (out.count !== 6) fail(`${label}: six buttons`, `found ${out.count}`); else pass(`${label}: six buttons`);
  if (out.offscreen.length) fail(`${label}: core buttons above the fold`, `${out.offscreen.map((b) => `${b.name}@${b.bottom}`).join(', ')} > ${out.h}`);
  else pass(`${label}: core buttons above the fold`);
  if (out.extrasBottom !== null && out.extrasBottom > out.h) fail(`${label}: extras above the fold`, `bottom ${out.extrasBottom} > ${out.h}`);
  else pass(`${label}: extras above the fold`);
  if (out.clipped.length) fail(`${label}: no button clipped sideways`, out.clipped.join(', '));
  else pass(`${label}: no button clipped sideways`);
}

/** The FIRST frame the bar is on screen: the measurement itself is the poll
 *  (null until the bar attaches), run on every animation frame, so it reads
 *  the layout that frame paints — before any later re-fit. */
async function firstFrame(page, timeout) {
  try {
    const handle = await page.waitForFunction(measureBar, CORE, { polling: 'raf', timeout });
    return await handle.jsonValue();
  } catch { return undefined; }
}

/** `opened` is the first-frame measurement when the caller caught the mount
 *  itself (Review's Start walk); otherwise it is caught here. */
async function checkFold(page, label, opened = undefined) {
  const early = opened ?? await firstFrame(page, 120000);
  if (early === undefined) { fail(`${label}: bar renders`, 'no coach-board-bar'); return; }
  pass(`${label}: bar renders`);
  judge(early, `${label} (first frame)`);
  await page.evaluate(() => { window.scrollTo(0, 0); for (const el of document.querySelectorAll('*')) if (el.scrollTop) el.scrollTop = 0; });
  await page.waitForTimeout(300);
  judge(await page.evaluate(measureBar, CORE), label);
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

    let page;
    let learnBoard = null;
    if (on('learn') || on('campaign')) {
      page = await fresh();
      await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded' });
      await consent(page);
      await checkFold(page, `${tag} Learn`);
      learnBoard = await boardWidth(page);
    }

    if (on('campaign')) {
    page = await fresh();
    await page.goto(`${BASE}/coach/campaign`, { waitUntil: 'domcontentloaded' });
    await consent(page);
    await checkFold(page, `${tag} Campaign before Start`);
    const campaignBoard = await boardWidth(page);
    if (learnBoard !== null && campaignBoard !== null && campaignBoard < learnBoard - 2) fail(`${tag} Campaign before Start: board not shrunk by the missions card`, `${campaignBoard}px < Learn's ${learnBoard}px`);
    else pass(`${tag} Campaign before Start: board not shrunk by the missions card`);
    const start = page.locator('[data-testid="mission-card-start"]').first();
    await start.waitFor({ timeout: 30000 }).catch(() => {});
    if (await start.count()) {
      await start.click({ force: true });
      for (let i = 0; i < 12 && !(await page.locator('[data-testid="mission-banner"]').count()); i++) {
        const done = page.locator('[data-testid="mission-briefing-sheet"] button').last();
        if (await done.count()) await done.click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
      }
      await checkFold(page, `${tag} Campaign in the game`);
    } else fail(`${tag} Campaign: Start`, 'no mission-card-start');
    }

    if (on('play')) {
      page = await fresh();
      await page.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded' });
      await consent(page);
      await checkFold(page, `${tag} Play`);
    }

    if (on('openings')) {
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
    }

    // The review list seeds the sample games on first visit; then open one.
    if (on('review')) {
    page = await fresh();
    await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(6000);
    await page.goto(`${BASE}/coach/review/sample-morphy-opera-1858`, { waitUntil: 'domcontentloaded' });
    await consent(page);
    // The review opens on its summary card; Start walk mounts the board.
    // A tap that lands before the card's handler is live does nothing (a
    // harness timing artifact, not an overlay) — tap again until the walk
    // mounts, and measure the walk's FIRST frame: the fit must not lag it.
    // A fresh device grades the game before Start walk shows (~1-2 min on
    // prod, longer on a busy dev machine): AUDIT_REVIEW_WAIT_S widens it.
    let opened;
    const tries = Math.ceil(Number(process.env.AUDIT_REVIEW_WAIT_S ?? 360) / 5);
    for (let i = 0; i < tries && opened === undefined; i++) {
      const start = page.locator('[data-testid="start-walk-btn"]').first();
      if (await start.count()) await start.evaluate((el) => el.click()).catch(() => {});
      opened = await firstFrame(page, 5000);
    }
    await checkFold(page, `${tag} Review`, opened);
    }

    await ctx.close();
  }
} finally {
  await browser.close();
}
const failed = rows.filter((r) => !r.ok);
console.log(`\n${rows.length - failed.length}/${rows.length} PASS`);
process.exit(failed.length ? 1 : 0);
