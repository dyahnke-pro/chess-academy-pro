// End-to-end proof for the Vienna-in-Spanish narration pilot on LIVE prod.
// Seeds narrationLanguage='es' on the profile, opens the Vienna masterclass
// Watch, and asserts the narration card renders SPANISH (not English) + captures
// any /api/tts request (whose text is Spanish → the voice path speaks Spanish).
//
// Run: AUDIT_SANDBOX=1 node scripts/audit-vienna-spanish-prod.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OPENING = 'vienna-game';
const SPANISH_MARKERS = ['Bienvenidos', 'ajedrez', 'apertura', 'blancas', 'caballo', 'las negras'];

async function dismissOverlays(page) {
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ state: 'visible', timeout: 6000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown */ }
  try {
    const help = page.locator('[data-testid="page-help-modal"]');
    await help.waitFor({ state: 'visible', timeout: 3000 });
    await page.keyboard.press('Escape');
    await help.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* none */ }
}

async function seedSpanish(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let req;
    try { req = indexedDB.open('ChessAcademyDB'); } catch { resolve({ ok: false, reason: 'open-threw' }); return; }
    req.onerror = () => resolve({ ok: false, reason: 'open' });
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('profiles')) { db.close(); resolve({ ok: false, reason: 'no-profiles' }); return; }
      const tx = db.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      const all = store.getAll();
      all.onsuccess = () => {
        const profiles = all.result || [];
        profiles.forEach((p) => { p.preferences = p.preferences || {}; p.preferences.narrationLanguage = 'es'; store.put(p); });
        tx.oncomplete = () => { db.close(); resolve({ ok: true, count: profiles.length }); };
      };
      all.onerror = () => resolve({ ok: false, reason: 'getAll' });
    };
  }));
}

async function run() {
  const browser = await chromium.launch({
    executablePath: await resolveChromiumExecutable(),
    headless: true,
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext(sandboxContextOptions());
  const page = await context.newPage();
  await blockTtsNetwork(page);   // instrument keeps the request; the provider never sees it
  const ttsTexts = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/tts') && r.method() === 'POST') {
      try { const t = JSON.parse(r.postData() || '{}').text; if (t) ttsTexts.push(t.slice(0, 90)); } catch { /* ignore */ }
    }
  });

  const out = { base: BASE, steps: {} };
  try {
    await page.goto(`${BASE}/openings/${OPENING}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await dismissOverlays(page);
    await page.waitForTimeout(45000); // deferred seed lands the opening record
    out.steps.unlock = await seedUnlockedOpenings(page, [OPENING]);
    out.steps.seedSpanish = await seedSpanish(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await dismissOverlays(page);
    await page.waitForTimeout(4000);

    // Click the main-line Watch rung (data-testid="walkthrough-btn", always
    // unlocked) → mounts the curated LessonPlayer whose narration card is
    // data-testid="lesson-narration".
    const watchBtn = page.locator('[data-testid="walkthrough-btn"]');
    out.steps.watchButtons = await watchBtn.count();
    let narrationText = '';
    try {
      await watchBtn.first().waitFor({ state: 'visible', timeout: 15000 });
      await watchBtn.first().scrollIntoViewIfNeeded();
      await watchBtn.first().click({ force: true });
      await page.locator('[data-testid="lesson-narration"]').waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(4000); // let the first beat render + voice kick off
      narrationText = (await page.locator('[data-testid="lesson-narration"]').innerText()).trim();
    } catch (e) { out.steps.clickError = String(e).split('\n')[0]; }
    out.steps.narrationText = narrationText.slice(0, 240);
    out.steps.ttsTexts = ttsTexts.slice(0, 3);

    const isSpanish = SPANISH_MARKERS.some((m) => narrationText.toLowerCase().includes(m.toLowerCase()));
    const ttsSpanish = ttsTexts.some((t) => SPANISH_MARKERS.some((m) => t.toLowerCase().includes(m.toLowerCase())));
    out.steps.narrationIsSpanish = isSpanish;
    out.steps.ttsSentSpanish = ttsSpanish;

    mkdirSync('audit-reports/vienna-spanish', { recursive: true });
    await page.screenshot({ path: 'audit-reports/vienna-spanish/watch-es.png', fullPage: false });
    out.verdict = isSpanish ? 'PASS' : (narrationText ? 'FAIL_ENGLISH' : 'FAIL_NO_NARRATION');
  } catch (e) {
    out.verdict = 'ERROR';
    out.error = String(e).split('\n')[0];
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.verdict === 'PASS' ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
