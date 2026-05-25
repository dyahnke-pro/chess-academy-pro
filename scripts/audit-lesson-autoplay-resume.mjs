// Focused regression audit for the masterclass LessonPlayer autoplay
// pause→resume bug (David 2026-05-25: "After pausing and resuming beats in
// opening the autoplay function fails"). Root cause: applyStep re-armed
// animPromiseRef on resume but the animation effect never re-ran for an
// unchanged beat index, so Promise.all in the speak wrapper hung forever and
// auto-advance died. Fix: an applyNonce that forces the animation effect to
// re-run (and resolve the fresh promise) even when the index is unchanged.
//
//   AUDIT_SMOKE_URL=http://localhost:5173 \
//   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
//   AUDIT_OPENING=scotch-game node scripts/audit-lesson-autoplay-resume.mjs
//
// Sandbox caveat: TTS streams to the blocked prod /api/tts and Polly falls
// back to headless web-speech, whose onend may not fire — if autoplay never
// advances even on the FIRST beat, that's the headless-voice limitation, not
// the bug; the script flags it for David to confirm on a real device.

import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ID = process.env.AUDIT_OPENING ?? 'scotch-game';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function closeHelp(page) {
  const modal = page.locator('[data-testid="page-help-modal"]');
  if (await modal.count()) {
    await page.locator('[data-testid="page-help-close"]').first().click().catch(() => {});
    await modal.first().waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
  }
}

// Parse the "… min · beat X / N" caption into X (1-based) or null.
async function readBeat(page) {
  const txt = await page.locator('[data-testid="lesson-player"] p').first().innerText().catch(() => '');
  const m = txt.match(/beat\s+(\d+)\s*\/\s*(\d+)/i);
  return m ? { beat: Number(m[1]), total: Number(m[2]) } : null;
}

// Poll until readBeat().beat > floor, or timeout. Returns the last reading.
async function waitForAdvance(page, floor, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = await readBeat(page);
  while (Date.now() < deadline) {
    last = await readBeat(page);
    if (last && last.beat > floor) return last;
    await sleep(400);
  }
  return last;
}

async function main() {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));

  const results = [];
  const rec = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };

  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await sleep(2500);
  await page.goto(`${URL}/openings`, { waitUntil: 'networkidle' });
  await sleep(2000);
  await page.goto(`${URL}/openings/${ID}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="variation-tabs"]').first().waitFor({ timeout: 20000 });
  await closeHelp(page);

  // Open the main-line Watch lesson.
  await page.locator('[data-testid="walkthrough-btn"]').click();
  const mounted = await page.locator('[data-testid="lesson-player"]').waitFor({ timeout: 12000 }).then(() => true).catch(() => false);
  rec('lesson-player mounts', mounted);
  if (!mounted) { await finish(); return; }

  const start = await readBeat(page);
  rec('beat counter readable', !!start, start ? `beat ${start.beat}/${start.total}` : 'no counter');
  if (!start) { await finish(); return; }

  // 1) Autoplay advances on its own (the story plays itself).
  const advanced = await waitForAdvance(page, start.beat, 12000);
  const didAutoplay = !!advanced && advanced.beat > start.beat;
  rec('autoplay advances before pause', didAutoplay,
    didAutoplay ? `${start.beat} → ${advanced.beat}` : 'never advanced (headless web-speech onend may not fire — confirm on device)');
  if (!didAutoplay) { await finish(); return; }

  // 2) Pause halts advance.
  const playBtn = page.locator('button[aria-label="Pause"], button[aria-label="Play lesson"]');
  await playBtn.click(); // → pause
  await sleep(300);
  const labelAfterPause = await playBtn.getAttribute('aria-label').catch(() => '');
  rec('pause flips control to Play', labelAfterPause === 'Play lesson', `aria-label="${labelAfterPause}"`);
  const paused = await readBeat(page);
  await sleep(2500);
  const stillPaused = await readBeat(page);
  rec('paused lesson does not advance', !!paused && !!stillPaused && paused.beat === stillPaused.beat,
    `${paused?.beat} → ${stillPaused?.beat}`);

  // 3) THE BUG: resume must continue auto-advancing.
  const beatAtResume = stillPaused?.beat ?? paused?.beat ?? start.beat;
  await playBtn.click(); // → resume
  await sleep(300);
  const labelAfterResume = await playBtn.getAttribute('aria-label').catch(() => '');
  rec('resume flips control to Pause', labelAfterResume === 'Pause', `aria-label="${labelAfterResume}"`);
  const afterResume = await waitForAdvance(page, beatAtResume, 14000);
  const resumed = !!afterResume && afterResume.beat > beatAtResume;
  rec('autoplay RESUMES after pause (the fix)', resumed,
    resumed ? `${beatAtResume} → ${afterResume.beat}` : `stuck at ${beatAtResume} (REGRESSION)`);

  // 4) A second pause/resume cycle (robustness — multiple resumes).
  if (resumed) {
    await playBtn.click(); await sleep(1500); // pause again
    const b2 = await readBeat(page);
    await playBtn.click(); // resume again
    const a2 = await waitForAdvance(page, b2?.beat ?? 0, 14000);
    rec('autoplay resumes on a SECOND cycle', !!a2 && !!b2 && a2.beat > b2.beat, `${b2?.beat} → ${a2?.beat}`);
  }

  await finish();

  async function finish() {
    rec('no page errors', errs.length === 0, errs.length ? errs.join(' | ') : '');
    const passed = results.filter((r) => r.ok).length;
    console.log(`\n=== ${passed}/${results.length} checks green (opening: ${ID}) ===`);
    await browser.close();
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
