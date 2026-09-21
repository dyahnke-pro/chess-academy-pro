/**
 * audit-sw-two-deploy — the ONE service-worker check a single deploy cannot make.
 *
 * `audit-sw-handover-prod.mjs` proves the deployed `sw.js` does not skip
 * waiting and does not claim, and that the page's hold gate is consulted. Its
 * own header names what it cannot reach:
 *
 *   > WHAT THIS CANNOT PROVE: that a session survives a REAL deploy. That
 *   > needs two deploys — hold a session open on deploy N and land deploy
 *   > N+1 — and is the one check to run by hand after the next unrelated push.
 *
 * That is PLAN §B item 2 / E2, open since the handover fix landed, marked
 * "rides along with whatever ships next". This is the script that rides along.
 *
 * ── THE BUG IT IS WATCHING FOR ──────────────────────────────────────────────
 * A newly-deployed worker used to activate UNDER a running page, delete the
 * precache that page was executing out of, and claim it. The page then asked
 * for hashed files the deploy no longer served. On David's iPhone that read as
 * `stockfish-error` (worker load failure), `lichess-error TypeError: Load
 * failed`, and no `app-boot` on reopen — none of which names a service worker,
 * which is why it took a device report to find.
 *
 * ── WHY A HELD SESSION IS THE ONLY INSTRUMENT ───────────────────────────────
 * Everything else about this is checkable from the artifact. This is not: the
 * failure is a RACE between an activation and a running page, so the page has
 * to be running and the deploy has to be real. A mocked worker proves the gate
 * logic; only a live deploy proves the gate is reached in time.
 *
 * ── WHAT IT ASSERTS, AND WHY EACH ROW EXISTS ────────────────────────────────
 *  1. The session is real before the deploy — booted, a worker registered, and
 *     the hold API present. A run that starts broken proves nothing after.
 *  2. A deploy actually landed during the hold. Without this the whole run is
 *     vacuous, and it would pass for free every time — the most expensive
 *     failure mode in this repo, and the one this file would be embarrassing
 *     to contain. Identified by CONTENT, never by the hash alone: a hash is a
 *     change detector, not an identity (learned 2026-09-21, when two sessions
 *     reached opposite wrong conclusions from one in ten minutes).
 *  3. The running page was NOT claimed out from under itself.
 *  4. No hashed asset 404s AFTER the deploy — the actual user-visible failure.
 *     Driven, not awaited: the run navigates so the SPA must fetch a lazy
 *     chunk, because a page that sits still never asks for the file that would
 *     be missing.
 *  5. The page still works afterwards — no pageerror, and the board/router
 *     still respond.
 *
 * ── HOW TO RUN IT ───────────────────────────────────────────────────────────
 * It is a WINDOW, not a command: start it BEFORE the next push, and push while
 * it waits. It exits on its own once a deploy lands or the deadline passes.
 *
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   SW_MARKER='<a string only the NEW build contains>' \
 *   node scripts/audit-sw-two-deploy-prod.mjs
 *
 * `SW_MARKER` is optional but strongly preferred — with it, row 2 proves the
 * NEW build arrived rather than merely that something changed.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import {
  resolveChromiumExecutable,
  sandboxLaunchArgs,
  sandboxContextOptions,
} from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const MARKER = process.env.SW_MARKER || '';
const DEADLINE_MS = Number(process.env.SW_DEADLINE_MS || 25 * 60 * 1000);

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

/** The entry chunk the ORIGIN is currently serving. */
async function servedEntry(page) {
  try {
    const res = await page.request.get(`${BASE}/?cb=${Date.now()}`, { timeout: 20000 });
    const html = await res.text();
    return (/\/assets\/index-[A-Za-z0-9_-]+\.js/.exec(html) ?? [null])[0];
  } catch {
    return null;
  }
}

async function main() {
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath, args: sandboxLaunchArgs() });
  const context = await browser.newContext(sandboxContextOptions());
  await context.addInitScript(muteTtsForAudit); // G1: audits never spend TTS money
  await context.addInitScript(autoDismissCalibration);
  // 🚨 A CLAIM RELOADS THE PAGE, WHICH ERASES THE EVIDENCE OF THE CLAIM.
  // `index.html` sets `__swHandover.controllerChanged = true` and then calls
  // `location.reload()` — so reading that flag afterwards reads a FRESH page
  // where it is false again. The reload itself is the observable, and it
  // survives only in storage that outlives a reload in the same tab.
  await context.addInitScript(() => {
    try {
      const n = Number(sessionStorage.getItem('__auditLoads') ?? '0') + 1;
      sessionStorage.setItem('__auditLoads', String(n));
    } catch { /* private mode — the row says so rather than passing */ }
  });
  const page = await context.newPage();

  const pageErrors = [];
  const failedAssets = [];
  // Every load we CAUSE is counted here; anything beyond it is the page
  // reloading ITSELF, which is what a takeover looks like from out here.
  //
  // 🔴 The first cut used a `framenavigated` listener with `navigations += 0`
  // — a typo that pinned the counter at zero, so the row comparing against it
  // could never fail. It also would have counted the page's OWN reload, which
  // is the very event being detected. Counting our own gotos is both correct
  // and impossible to get silently wrong.
  let navigations = 0;
  const go = async (url) => {
    navigations += 1;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => undefined);
  };
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  // A 404 on a HASHED asset is the signature — an unhashed miss is ordinary.
  page.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|wasm)/.test(u)) {
      failedAssets.push(`${r.status()} ${u.split('/').pop()}`);
    }
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|wasm)/.test(u)) {
      failedAssets.push(`FAILED ${u.split('/').pop()} (${r.failure()?.errorText ?? '?'})`);
    }
  });

  // ── 1. A REAL SESSION ON DEPLOY N ────────────────────────────────────────
  const before = await servedEntry(page);
  log(`deploy N entry: ${before ?? '(unreadable)'}`);
  await go(BASE);
  await page.waitForTimeout(10000);

  const ready = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return {
      registrations: regs.length,
      controller: !!navigator.serviceWorker.controller,
      handover: window.__swHandover ?? null,
      hasRequest: typeof window.__swRequestHandover === 'function',
    };
  });
  record(
    'session is real before the deploy',
    ready.registrations > 0 && ready.handover !== null && ready.hasRequest,
    `registrations=${ready.registrations} controller=${ready.controller} handover=${JSON.stringify(ready.handover)}`,
  );

  // Load a real surface so the page is executing out of lazy chunks, not just
  // the entry — the precache deletion only hurts a page that will ask again.
  await go(`${BASE}/openings`);
  await page.waitForTimeout(5000);
  const preErrors = pageErrors.length;
  const preFailed = failedAssets.length;
  log(`holding — pageerrors=${preErrors} failedAssets=${preFailed}. PUSH NOW.`);

  // ── 2. WAIT FOR A REAL DEPLOY ────────────────────────────────────────────
  const started = Date.now();
  let after = before;
  let markerSeen = false;
  while (Date.now() - started < DEADLINE_MS) {
    await page.waitForTimeout(15000);
    const now = await servedEntry(page);
    if (now && now !== before) {
      after = now;
      if (MARKER) {
        const res = await page.request.get(`${BASE}${now}`, { timeout: 60000 }).catch(() => null);
        const body = res && res.ok() ? await res.text() : '';
        markerSeen = body.includes(MARKER);
        log(`entry changed -> ${now}; marker ${markerSeen ? 'PRESENT' : 'ABSENT'}`);
        // A changed hash WITHOUT the marker is not the deploy we are waiting
        // for — keep waiting rather than grading the wrong build.
        if (!markerSeen) { before = now; continue; }
      } else {
        log(`entry changed -> ${now}`);
      }
      break;
    }
    log(`still deploy N (${Math.round((Date.now() - started) / 1000)}s elapsed)`);
  }
  const deployLanded = !!after && after !== null && after !== undefined && after !== before;
  record(
    'a REAL deploy landed during the hold',
    deployLanded && (!MARKER || markerSeen),
    deployLanded
      ? `${before} -> ${after}${MARKER ? ` (marker ${markerSeen ? 'present' : 'ABSENT'})` : ' (no marker given — change only)'}`
      : `no deploy within ${Math.round(DEADLINE_MS / 60000)} min — NOTHING BELOW IS GRADED`,
  );
  if (!deployLanded) {
    // Say it rather than pass the rest for free.
    record('page was not claimed by the new worker', false, 'not graded — no deploy landed');
    record('no hashed asset failed after the deploy', false, 'not graded — no deploy landed');
    record('the held session still works', false, 'not graded — no deploy landed');
    await finish(browser);
    return;
  }

  // Give the new worker every chance to misbehave before we look.
  await page.waitForTimeout(20000);

  // ── 3. WAS THE RUNNING PAGE TAKEN OVER? ──────────────────────────────────
  // 🔴 THE FIELD IS `controllerChanged`, NOT `controllerChanges` (index.html:54).
  // The first cut of this row read the plural, got `undefined`, and therefore
  // PASSED FOR FREE on every run — the exact vacuity this file's own header
  // calls the most expensive failure mode in the repo. Caught by reading
  // index.html instead of trusting the name I had typed.
  const post = await page.evaluate(() => {
    let loads = null;
    try { loads = Number(sessionStorage.getItem('__auditLoads') ?? '0'); } catch { /* blocked */ }
    return {
      handover: window.__swHandover ?? null,
      changed: window.__swHandover?.controllerChanged ?? null,
      controller: !!navigator.serviceWorker.controller,
      loads,
    };
  });
  // What CORRECT looks like: the new worker waits, nothing claims a running
  // page, and the ask only happens when the page is quiet. An unexpected
  // reload (loads climbing beyond the navigations this script performed) is
  // the handover firing under a live session.
  const unexpectedReload = post.loads != null && post.loads > navigations;
  record(
    'the new worker did not take over a running page',
    post.changed === false && !unexpectedReload,
    `controllerChanged=${post.changed ?? 'MISSING — row not graded'} loads=${post.loads ?? 'n/a'} `
      + `expected<=${navigations} handover=${JSON.stringify(post.handover)}`,
  );

  // ── 4. DRIVE A LAZY FETCH — a still page never asks for the missing file ──
  await go(`${BASE}/tactics`);
  await page.waitForTimeout(6000);
  await go(`${BASE}/coach/home`);
  await page.waitForTimeout(6000);
  const newFailed = failedAssets.slice(preFailed);
  // 🔒 A STARVATION TIMEOUT LOOKS EXACTLY LIKE A HANDOVER CASUALTY, and this
  // run deliberately overlaps another session's work, so it WILL sometimes be
  // starved. The contamination is in the safe direction — a false RED, never a
  // false green — but a false red on the one window we get is still a run
  // nobody can read. The discriminator costs one request: a genuine casualty
  // is a file the deploy NO LONGER SERVES and stays 4xx; a starved fetch comes
  // back 200 on a retry.
  const confirmed = [];
  for (const entry of newFailed.slice(0, 8)) {
    const name = entry.split(' ').pop();
    const res = await page.request.get(`${BASE}/assets/${name}`, { timeout: 30000 }).catch(() => null);
    const status = res ? res.status() : 0;
    if (status !== 200) confirmed.push(`${entry} (retry ${status || 'no response'})`);
    else log(`  ${name} failed once but retries 200 — starvation, not a casualty`);
  }
  record(
    'no hashed asset failed after the deploy',
    confirmed.length === 0,
    confirmed.length
      ? confirmed.slice(0, 5).join(' | ')
      : newFailed.length
        ? `${newFailed.length} transient failure(s), all 200 on retry — starvation, not the handover`
        : 'none across two lazy navigations',
  );

  // ── 5. THE SESSION STILL WORKS ───────────────────────────────────────────
  const alive = await page.evaluate(() => !!document.querySelector('[data-testid], main, #root'));
  const newErrors = pageErrors.slice(preErrors);
  record(
    'the held session still works',
    alive && newErrors.length === 0,
    `alive=${alive} newPageErrors=${newErrors.length}${newErrors.length ? ` :: ${newErrors[0].slice(0, 120)}` : ''}`,
  );

  await finish(browser);
}

async function finish(browser) {
  const dir = `audit-reports/sw-two-deploy-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify({ base: BASE, results }, null, 2));
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n${pass}/${results.length} — report at ${dir}/report.json`);
  await browser.close();
  process.exit(pass === results.length ? 0 : 1);
}

main().catch(async (e) => {
  console.error('FATAL', e);
  process.exit(1);
});
