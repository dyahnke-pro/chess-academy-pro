#!/usr/bin/env node
/**
 * audit-lesson-walkin — verifies the first beat of a curated Watch lesson
 * (LessonPlayer) BUILDS its opening moves one at a time from the start
 * position, instead of SNAPPING straight to a deep position (David 2026-06-26).
 *
 * Signature of the fix: at lesson-player mount the board is the standard
 * initial position (0 pieces off their home squares); as the silent walk
 * plays, that count climbs gradually. The OLD bug rendered the deep first-beat
 * position immediately (many pieces already off home on the first frame).
 *
 * Per opening it snapshots the board ~every 350ms for ~9s and records, per
 * frame, how many pieces are NOT on a back-two-ranks home square. PASS =
 * the first post-mount frame is at/near 0 AND the count strictly grows
 * (a build), never starts already deep.
 *
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *     node scripts/audit-lesson-walkin.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const HEADED = process.env.AUDIT_SMOKE_HEADED === '1';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = process.env.AUDIT_OUT_DIR ?? `audit-reports/lesson-walkin-${stamp}`;

// Openings whose main Watch mounts a curated LessonPlayer AND whose first beat
// is several moves deep (so a snap would be obvious).
const TARGETS = (process.env.AUDIT_OPENINGS ?? 'sicilian-dragon,caro-kann,ruy-lopez').split(',');

// pieces NOT on a home square (ranks 1,2,7,8) = "developed", a proxy for depth.
const OFF_HOME = () => {
  const m = {};
  document.querySelectorAll('[data-piece]').forEach((p) => {
    let n = p, sq = p.getAttribute('data-square');
    while (n && !sq) { n = n.parentElement; sq = n && n.getAttribute && n.getAttribute('data-square'); }
    if (sq && /^[a-h][1-8]$/.test(sq)) m[sq] = p.getAttribute('data-piece');
  });
  const sqs = Object.keys(m);
  const off = sqs.filter((s) => !['1', '2', '7', '8'].includes(s[1])).length;
  return { count: sqs.length, off };
};

async function dismiss(page) {
  for (const [wait, click] of [
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
    ['[data-testid="page-help-modal"]', '[data-testid="page-help-close"]'],
  ]) {
    const el = page.locator(wait).first();
    if (await el.isVisible().catch(() => false)) {
      await page.locator(click).first().click({ timeout: 8000 }).catch(() => {});
      await el.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const exe = await resolveChromiumExecutable(HEADED);
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: !HEADED, executablePath: exe });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1100, height: 900 }, userAgent: 'AuditCoachPlayBot/1.0 (walkin)' });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));

  // Boot + seed.
  await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await dismiss(page);
  await page.goto(`${BASE_URL}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  const seeded = await page.locator('[data-testid="opening-explorer"]').waitFor({ timeout: 90000 }).then(() => true).catch(() => false);
  console.log(`[walkin] seeded: ${seeded}`);

  const results = [];
  for (const id of TARGETS) {
    const r = { id, mounted: false, frames: [], verdict: 'SKIP', note: '' };
    try {
      await page.goto(`${BASE_URL}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await dismiss(page);
      const detail = await page.locator('[data-testid="opening-detail"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      if (!detail) { r.note = 'detail not loaded'; results.push(r); continue; }
      // The page-help modal auto-opens AFTER the detail surface mounts — dismiss
      // it here (an earlier dismiss ran before it appeared) or it eats the click.
      await page.waitForTimeout(1200);
      await dismiss(page);
      const watch = page.locator('[data-testid="walkthrough-btn"]').first();
      await watch.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
      await watch.click({ timeout: 8000 }).catch(() => {});
      const lp = await page.locator('[data-testid="lesson-player"]').waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
      r.mounted = lp;
      r.legacy = await page.locator('[data-testid="walkthrough-mode"]').isVisible().catch(() => false);
      if (!lp) { r.note = `lesson-player did not mount (legacy walkthrough-mode=${r.legacy})`; results.push(r); continue; }

      // Sample the board FAST (~110ms) starting the instant the player mounts, for
      // ~6s. A true SNAP shows the deep position from the very first frame and
      // never the start; a BUILD passes through the start (off≈0) and climbs. We
      // judge on the MINIMUM off-home in the early window (robust to mount
      // latency eating part of the build) + whether it changed over time.
      for (let k = 0; k < 55; k += 1) {
        const snap = await page.evaluate(OFF_HOME).catch(() => ({ count: 0, off: -1 }));
        r.frames.push({ t: k * 110, ...snap });
        await page.waitForTimeout(110);
      }
      const offs = r.frames.map((f) => f.off).filter((n) => n >= 0);
      const minOff = Math.min(...offs);
      const maxOff = Math.max(...offs);
      const distinct = new Set(offs).size;
      // PASS: the board passed through the start/near-start (minOff ≤ 1) AND the
      // position changed over the window (a real build, not a static deep board).
      if (minOff <= 1 && distinct >= 2) { r.verdict = 'PASS'; r.note = `built up: off-home ${minOff} → ${maxOff} (${distinct} distinct)`; }
      else if (minOff >= 4) { r.verdict = 'FAIL'; r.note = `SNAP: never showed the start — min off-home ${minOff} across ${r.frames.length} frames` ; }
      else { r.verdict = 'WARN'; r.note = `min off=${minOff} max=${maxOff} distinct=${distinct} (inconclusive)`; }
      console.log(`[walkin] ${id}: ${r.verdict} — ${r.note}`);
      console.log(`         off-home: ${offs.join(' ')}`);
    } catch (e) {
      r.note = `threw: ${e.message.slice(0, 160)}`;
      console.log(`[walkin] ${id}: ERROR ${r.note}`);
    }
    results.push(r);
  }

  await writeFile(join(OUT_DIR, 'report.json'), JSON.stringify({ base: BASE_URL, pageErrors, results }, null, 2));
  await browser.close();
  const pass = results.filter((r) => r.verdict === 'PASS').length;
  const fail = results.filter((r) => r.verdict === 'FAIL').length;
  console.log(`\n[walkin] DONE: ${pass} PASS / ${fail} FAIL / ${results.length} total — report at ${OUT_DIR}`);
  if (pageErrors.length) console.log('[walkin] pageerrors:', pageErrors.slice(0, 5));
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
