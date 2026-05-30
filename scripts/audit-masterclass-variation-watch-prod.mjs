// Focused post-deploy render+voice audit for the rebuilt masterclass VARIATION
// Watch lessons (PR #693 soundness rebuilds). Runs against LIVE prod.
//
// Why this exists: the heavy 3-tier audit-punish-gems-loop.mjs walks EVERY
// masterclass opening and times out against slow prod from the sandbox. This
// is the scoped, fast verification for the specific variation tabs whose
// LessonScript spine was rebuilt this wave, asserting the two live facts the
// build-time gates can't see:
//   1. The variation Watch renders the CURATED LessonPlayer, NOT the legacy
//      WalkthroughMode (board-INACCURATE auto-narration). Detection: legacy
//      renders [data-testid="walkthrough-progress"]; LessonPlayer does not.
//   2. The Watch lesson actually FIRES voice — a POST to /api/tts on the wire.
// Board-truth of the narration text is enforced at build by the
// narrationAccuracy gate (green); this proves the curated lesson is what the
// live app serves and that it speaks.
//
// Run: AUDIT_SANDBOX=1 node scripts/audit-masterclass-variation-watch-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

// The rebuilt targets this wave. openingId + the exact variation tab label.
const TARGETS = [
  { id: 'pirc-defence', label: '150 Attack' },
  { id: 'two-knights-defence', label: 'Max Lange' },
];

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  headless: true,
  // A fresh audit context has no user gesture before the lesson autoplays,
  // so Chromium's default autoplay policy would reject the streaming play().
  // The /api/tts fetch fires either way, but this removes a variable.
  args: [...sandboxLaunchArgs(), '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
// Capture /api/tts requests, separating real beat narration from the
// one-char warmup probe (text=. — voiceService.warmup) which fires on every
// surface mount and is NOT lesson voice.
const tts = [];
page.on('request', (r) => {
  const u = r.url();
  if (!/\/api\/tts/.test(u)) return;
  const text = decodeURIComponent((u.match(/[?&]text=([^&]*)/) || [])[1] || '');
  tts.push({ t: Date.now(), warmup: text.trim() === '.' || text.trim() === '' });
});
const beatTts = () => tts.filter((x) => !x.warmup).length;

// Two full-screen overlays intercept pointer events and must BOTH be cleared
// before any click: the strength-calibration bubble (z-110, inset-0) RE-APPEARS
// on every fresh page load until strength is calibrated, and the page-help-modal
// auto-opens on the opening surface. Clear both, repeatedly, since dismissing
// one can reveal/re-trigger the other.
async function dismissOverlays() {
  for (let round = 0; round < 4; round++) {
    let acted = false;
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.count() > 0) {
      acted = true;
      await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => null);
      await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => null);
    }
    const help = page.locator('[data-testid="page-help-modal"]');
    if (await help.count() > 0) {
      acted = true;
      await page.keyboard.press('Escape').catch(() => null);
      await help.waitFor({ state: 'detached', timeout: 2500 }).catch(async () => {
        await help.locator('button').last().click({ force: true }).catch(() => null);
        await help.waitFor({ state: 'detached', timeout: 2500 }).catch(() => null);
      });
    }
    if (!acted) return;
  }
}

console.log(`=== Masterclass variation-Watch render+voice audit vs PROD (${PROD}) ===\n`);
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOverlays();
console.log('  waiting 35s for base-repertoire seed...');
await page.waitForTimeout(35000);

// A fresh context defaults pollyEnabled=false (voiceService.loadPrefs), so the
// app would speak via Web Speech and never hit /api/tts — making a voice
// assertion meaningless. David's real device has Polly ON. Flip it on the
// seeded 'main' profile so the streaming path fetches /api/tts, then reload so
// voiceService re-reads prefs. (profiles writes are NOT the openings-store
// sandbox write-stall, so this completes.)
const pollyResult = await page.evaluate(async () => {
  return await new Promise((resolve) => {
    const to = setTimeout(() => resolve('timeout'), 8000);
    const open = indexedDB.open('ChessAcademyDB');
    open.onerror = () => { clearTimeout(to); resolve('open-error'); };
    open.onsuccess = () => {
      const dbi = open.result;
      let tx;
      try { tx = dbi.transaction('profiles', 'readwrite'); } catch (e) { clearTimeout(to); resolve('no-profiles-store'); return; }
      const store = tx.objectStore('profiles');
      const get = store.get('main');
      get.onsuccess = () => {
        const profile = get.result;
        if (!profile) { clearTimeout(to); resolve('no-main-profile'); return; }
        profile.preferences = profile.preferences || {};
        profile.preferences.pollyEnabled = true;
        profile.preferences.voiceEnabled = true;
        profile.preferences.coachNarration = 'full';
        const put = store.put(profile);
        put.onsuccess = () => { clearTimeout(to); resolve('ok'); };
        put.onerror = () => { clearTimeout(to); resolve('put-error'); };
      };
      get.onerror = () => { clearTimeout(to); resolve('get-error'); };
    };
  });
});
console.log(`  enablePolly: ${pollyResult}`);
await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null);
await page.waitForTimeout(2000);

for (const { id, label } of TARGETS) {
  console.log(`\n--- ${id} :: ${label} ---`);
  await page.goto(`${PROD}/openings/${id}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => null);
  await page.waitForTimeout(2500);
  await dismissOverlays();

  // Confirm the detail page mounted.
  if (await page.locator('[data-testid="opening-detail"]').count() === 0) {
    rec(`${id}: opening detail page mounts`, 'FAIL', 'opening-detail not found');
    continue;
  }

  // Select the variation tab by its visible label.
  const tab = page.locator('[data-testid="variation-tabs"] [role="tab"]', { hasText: label }).first();
  if (await tab.count() === 0) { rec(`${id}: variation tab "${label}" present`, 'FAIL', 'tab not found'); continue; }
  await tab.click({ timeout: 8000 }).catch(() => null);
  await page.waitForTimeout(800);
  await dismissOverlays();
  // Verify it actually selected (aria-selected), not just clicked-at.
  if (await tab.getAttribute('aria-selected') === 'true') rec(`${id}: variation tab "${label}" selected`, 'PASS');
  else rec(`${id}: variation tab "${label}" selected`, 'FAIL', 'tab did not become selected');

  // The Watch rung. If locked, free the ladder via unlock-all.
  const watch = page.locator('[data-testid="walkthrough-btn"]').first();
  if (await watch.getAttribute('data-locked') === 'true') {
    await page.locator('[data-testid="unlock-all-btn"], [data-testid="weapons-unlock-all-btn"]').first().click({ timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(600);
  }
  // Click Watch — dismiss any help overlay that intercepts, retry up to 3x
  // until the LessonPlayer (or the legacy walkthrough) actually mounts.
  const beatBefore = beatTts();
  let mounted = false;
  for (let i = 0; i < 3 && !mounted; i++) {
    await dismissOverlays();
    await watch.click({ timeout: 5000 }).catch(() => null);
    await page.waitForTimeout(2500);
    await dismissOverlays();
    mounted = await page.locator('[data-testid="lesson-player"], [data-testid="walkthrough-progress"]').count() > 0;
  }

  // 1. Curated LessonPlayer mounts (positive), NOT legacy WalkthroughMode.
  const isLesson = await page.locator('[data-testid="lesson-player"]').count() > 0;
  const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
  if (isLesson && !isLegacy) rec(`${id}: Watch mounts curated LessonPlayer (not legacy WalkthroughMode)`, 'PASS');
  else if (isLegacy) rec(`${id}: Watch mounts curated LessonPlayer (not legacy WalkthroughMode)`, 'FAIL', 'legacy WalkthroughMode rendered');
  else rec(`${id}: Watch mounts curated LessonPlayer (not legacy WalkthroughMode)`, 'FAIL', 'neither mounted — Watch click did not open the lesson');

  // 2. Lesson voice fired on the wire — a real beat /api/tts (not the warmup
  //    `.` probe). Allow up to ~12s for the first beat's narration fetch.
  let fired = beatTts() > beatBefore;
  for (let i = 0; i < 16 && !fired; i++) { await page.waitForTimeout(750); fired = beatTts() > beatBefore; }
  if (fired) rec(`${id}: Watch lesson speaks (beat /api/tts fires)`, 'PASS', `${beatTts() - beatBefore} beat request(s)`);
  else rec(`${id}: Watch lesson speaks (beat /api/tts fires)`, 'FAIL', 'no beat /api/tts request observed');

  // Exit back to the detail surface for the next target.
  await page.locator('[data-testid="back-button"]').first().click({ timeout: 3000 }).catch(() => page.goBack().catch(() => null));
  await page.waitForTimeout(1000);
}

await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
console.log('  Board-truth of the narration is enforced at build by narrationAccuracy (green); this audit proves the curated lesson renders + speaks live.');
process.exit(fail > 0 ? 1 : 0);
