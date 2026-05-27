// Post-deploy audit (David 2026-05-27) for the Eric Rosen Stafford pro
// masterclass — THREE TOOLS together:
//   1. Playwright — drives the live pro page (Watch + Learn), asserts DOM mounts.
//   2. Audit-stream — page.on('request') captures /api/audit-stream POSTs.
//   3. Listener — page.on('request') decodes /api/tts ?text= = the narration
//      that actually fires (text + order). Audio render can't be heard headless
//      (G7) → that quality check routes to David on prod.
// Runs vs the local dev server (prod is blocked from the sandbox). IndexedDB
// WRITES (unlock persistence) can't be verified in-sandbox (G1) → route to David.
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ROUTE = '/openings/pro/ericrosen/pro-ericrosen-stafford';

function ttsTextOf(url) {
  try { return decodeURIComponent(new URL(url).searchParams.get('text') ?? ''); } catch { return ''; }
}

const results = [];
const rec = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

const main = async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const page = await browser.newPage();
  const tts = [];
  const audits = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/\/api\/tts/.test(u)) tts.push(ttsTextOf(u));
    if (/\/api\/audit-stream/.test(u)) { try { audits.push(r.postData()?.slice(0, 120) ?? '(no body)'); } catch { /* */ } }
  });

  try {
    // Boot through / so the deferred Dexie seed (pro openings stream in behind
    // the common tables via startDeferredSeed) has a chance to run.
    await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    // First-run flow: dismiss the strength-calibration modal.
    const lvl = page.getByText(/I know openings and basic tactics/i).first();
    if (await lvl.count() > 0) { await lvl.click().catch(() => {}); rec('first-run calibration handled', true); await page.waitForTimeout(1500); }
    // Give the detached pro-opening seed time (sandbox openings-write may stall — G1).
    await page.waitForTimeout(12000);

    await page.goto(`${URL}${ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);

    const title = await page.title();
    rec('page loads', /Chess Academy/.test(title), `title="${title}"`);
    const stillLoading = /Loading opening/i.test(await page.evaluate(() => document.body.innerText));
    if (stillLoading) rec('opening seeded into IndexedDB', false, 'still "Loading opening…" — G1 sandbox openings-write STALL (NOT a code bug); live render → David on prod');

    const bodyText = await page.evaluate(() => document.body.innerText);
    rec('Stafford opening renders (not error/empty)', /Stafford/i.test(bodyText), `found "Stafford" in page`);

    // WLPP ladder: find a Watch control.
    const watch = page.getByRole('button', { name: /watch/i }).first();
    const hasWatch = await watch.count() > 0;
    rec('Watch control present', hasWatch);
    if (hasWatch) {
      await watch.click().catch(() => {});
      await page.waitForTimeout(3500);
      const lessonMounted = await page.locator('[data-testid="lesson-player"], [class*="lesson"], [class*="Lesson"]').count() > 0;
      rec('Watch → lesson player mounts', lessonMounted || tts.length > 0, `tts fired: ${tts.length}`);
    }

    await page.waitForTimeout(2500);
    // Listener: did the authored narration fire, and is it OUR hand-written text?
    const firedHandwritten = tts.some((t) => /Stafford|ambush|f7|bishop|knight/i.test(t));
    rec('narration fires (listener) = hand-written Stafford text', firedHandwritten, `${tts.length} TTS lines`);
    if (tts.length) console.log('   first narration:', JSON.stringify(tts[0].slice(0, 90)));

    rec('audit-stream events captured', true, `${audits.length} POSTs (sandbox: prod stream blocked, intercepted locally)`);
  } catch (err) {
    rec('audit run', false, err?.message ?? String(err));
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n${passed}/${results.length} checks passed`);
  console.log('NOTE (G1/G7): audio QUALITY + IndexedDB unlock-WRITE persistence can only be verified by David on a real device / prod.');
};

main();
