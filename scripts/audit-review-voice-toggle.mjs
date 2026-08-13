// Prove the Review Voice Narration toggle on LIVE prod, both directions.
// OFF: the walk advances and the written narration banner fills, but NOT ONE
// coach-narration-spoken event fires. ON: the same walk speaks.
// Muted throughout — the mute branch emits the same narration events, so the
// instrument works with zero TTS spend.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = 'https://chess-academy-pro.vercel.app';
const sleep = (ms) => new Promise((r) => { setTimeout(r, ms); });

async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  const page = await ctx.newPage();

  const spoken = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
  page.on('request', (req) => {
    if (!req.url().includes('/api/audit') || req.method() !== 'POST') return;
    try {
      const body = JSON.parse(req.postData() ?? '{}');
      for (const e of (body.events ?? body.entries ?? [body])) {
        if (e.kind === 'coach-narration-spoken' && (e.narrationText ?? '').trim()) spoken.push(e.narrationText.trim());
      }
    } catch { /* not ours */ }
  });

  const dismiss = async () => {
    for (const [wait, click] of [
      ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
      ['[data-testid="page-help-modal"]', '[data-testid="page-help-close"]'],
    ]) {
      const seen = await page.locator(wait).first().waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
      if (seen) { await page.locator(click).first().click({ timeout: 5000, force: true }).catch(() => {}); await sleep(600); }
    }
  };

  const setToggle = async (want) => {
    await page.goto(`${BASE}/settings`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="settings-page"]').waitFor({ state: 'visible', timeout: 60_000 });
    await dismiss();
    // The toggle lives INSIDE the "Gameplay Coaching" modal on the Coach tab
    // (same as coach-narration-select — a real user clicks the row first).
    const sel = '[data-testid="coach-review-voice-toggle"]';
    const rowSel = '[data-testid="gameplay-coaching-row"]';
    if (!await page.locator(rowSel).first().isVisible().catch(() => false)) {
      const tabs = page.locator('[data-testid^="tab-"]');
      const n = await tabs.count();
      for (let i = 0; i < n; i += 1) {
        await tabs.nth(i).click({ timeout: 3000, force: true }).catch(() => {});
        await sleep(600);
        if (await page.locator(rowSel).first().isVisible().catch(() => false)) break;
      }
    }
    await page.locator(rowSel).first().click({ timeout: 5000, force: true });
    await sleep(900);
    const toggle = page.locator(sel).first();
    if (!await toggle.isVisible().catch(() => false)) throw new Error('toggle not found in any tab');
    const checked = await toggle.getAttribute('aria-checked')
      ?? await toggle.evaluate((el) => (el.querySelector('input') ?? el).checked ?? null).catch(() => null);
    const isOn = String(checked) === 'true';
    if (isOn !== want) { await toggle.click(); await sleep(1500); }
    // VERIFY the click landed — checkbox state AND the Dexie write. The first
    // run trusted the click blind and could not tell toggle-failure from the
    // hook bug.
    const now = await toggle.evaluate((el) => el.checked);
    const persisted = await page.evaluate(async () => new Promise((resolve) => {
      const req = indexedDB.open('ChessAcademyDB');
      req.onsuccess = () => {
        const tx = req.result.transaction('profiles', 'readonly');
        tx.objectStore('profiles').getAll().onsuccess = (e) =>
          resolve(e.target.result[0]?.preferences?.coachReviewVoice ?? null);
      };
      req.onerror = () => resolve('open-failed');
    }));
    console.log(`  toggle set → ${want ? 'ON' : 'OFF'} (was ${isOn ? 'ON' : 'OFF'}; checkbox=${now}; dexie=${persisted})`);
    if (now !== want) throw new Error(`toggle did not land: wanted ${want}, checkbox reads ${now}`);
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(500);
  };

  const driveReview = async (sampleId, label) => {
    const before = spoken.length;
    await page.goto(`${BASE}/coach/review`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('[data-testid="coach-review-list-page"]').waitFor({ state: 'visible', timeout: 60_000 });
    await dismiss();
    const card = page.locator(`[data-testid="review-game-card-${sampleId}"]`);
    await card.waitFor({ state: 'visible', timeout: 60_000 });
    console.log(`  [${label}] opening review: ${sampleId}`);
    await card.click({ force: true });
    // Review opens on the SUMMARY card — the walk starts when the user taps
    // Start (the probe run found this; the first cut waited for nav-controls
    // that only exist after the click).
    // The button renders DISABLED ("Preparing…") until walk prep resolves —
    // a force-click on it is a no-op (the second instrument bug this drive).
    // Wait for the ENABLED state like a human would, then click for real.
    const start = page.locator('[data-testid="start-walk-btn"]:not([disabled])');
    await start.waitFor({ state: 'visible', timeout: 120_000 });
    await start.click();
    await page.locator('[data-testid="review-nav-controls"]').waitFor({ state: 'visible', timeout: 180_000 });
    let bannerSeen = false;
    let steps = 0;
    const until = Date.now() + 90_000;
    while (Date.now() < until && steps < 10) {
      const banner = page.locator('[data-testid="review-narration-banner"]');
      if (await banner.isVisible().catch(() => false)) {
        const t = (await banner.innerText().catch(() => '')).trim();
        if (t.length > 10) bannerSeen = true;
      }
      // Resolve any diagnostic card that blocks the walk, then step.
      for (const dSel of ['[data-testid="review-find-shot-reveal"]', '[data-testid="review-rewind-card"] button', '[data-testid="review-turning-card"] button']) {
        const d = page.locator(dSel).first();
        if (await d.isVisible().catch(() => false)) await d.click({ force: true }).catch(() => {});
      }
      const fwd = page.locator('[data-testid="review-forward-btn"]');
      if (await fwd.isEnabled().catch(() => false)) {
        await fwd.click({ force: true }).catch(() => {});
        steps += 1;
      }
      await sleep(5000);
    }
    const gained = spoken.length - before;
    console.log(`  [${label}] steps=${steps} writtenBanner=${bannerSeen} spokenEvents=${gained}`);
    return { steps, bannerSeen, gained };
  };

  console.log('■ boot + toggle OFF');
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await sleep(10_000);
  await dismiss();
  await setToggle(false);

  console.log('■ review with voice OFF');
  const off = await driveReview('sample-morphy-opera-1858', 'OFF');

  console.log('■ toggle ON');
  await setToggle(true);

  console.log('■ review with voice ON');
  const on = await driveReview('sample-fischer-byrne-1956', 'ON');

  await browser.close();
  console.log('\n──────── REVIEW VOICE TOGGLE ────────');
  console.log(`OFF: walk advanced (${off.steps} steps), written narration ${off.bannerSeen ? 'present' : 'MISSING'}, spoken events ${off.gained} ${off.gained === 0 ? '✅ silent' : '❌ SPOKE ANYWAY'}`);
  console.log(`ON:  walk advanced (${on.steps} steps), spoken events ${on.gained} ${on.gained > 0 ? '✅ spoke' : '❌ STILL SILENT'}`);
  console.log(`page errors: ${pageErrors.length} ${JSON.stringify(pageErrors.slice(0, 3))}`);
  const ok = off.gained === 0 && off.steps > 0 && on.gained > 0 && pageErrors.length === 0;
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error('ERROR', e); process.exit(1); });
