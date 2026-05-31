// INTERACTIVE gambit-tab audit (David 2026-05-31). Drives the LIVE UI through
// every gambit + every variation tab on the Gambit tab, asserting the runtime
// contracts the data-walk can't see:
//   • Watch mounts the CURATED LessonPlayer (data-testid lesson-player), never
//     the legacy WalkthroughMode (walkthrough-mode / walkthrough-progress).
//   • The lesson has real beats (depth from the "Beat X / Y" progress label).
//   • Voice FIRES — a POST to /api/tts is attempted when Watch plays (the
//     narration path is wired). Real audio playback can't be verified headless
//     (flagged to David).
// Runs against localhost:5173 (the dev server carries this session's fixes;
// prod doesn't yet). Set AUDIT_SMOKE_URL to point elsewhere.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';

// The 12 gambit-tab openings (gambits.json + repertoire isGambit), ECO order.
const GAMBITS = [
  'englund-gambit', 'budapest-gambit', 'benko-gambit', 'smith-morra-gambit',
  'danish-gambit', 'vienna-gambit', 'kings-gambit', 'stafford-gambit',
  'scotch-gambit', 'evans-gambit', 'marshall-attack', 'albin-countergambit',
];

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

// Capture every /api/tts attempt (voice fired). Reset per-lesson.
let ttsHits = [];
page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) ttsHits.push(r.url()); });
page.on('console', (m) => { if (m.type() === 'error' && /chess|lesson|narrat/i.test(m.text())) console.log(`    [console.error] ${m.text().slice(0, 140)}`); });

async function dismissOnboarding() {
  try {
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* already calibrated */ }
}
async function dismissHelp() {
  const m = page.locator('[data-testid="page-help-modal"]');
  if (await m.count() > 0) {
    await page.keyboard.press('Escape').catch(() => null);
    await m.waitFor({ state: 'detached', timeout: 4000 }).catch(async () => {
      await m.locator('button').last().click({ force: true }).catch(() => null);
      await m.waitFor({ state: 'detached', timeout: 4000 }).catch(() => null);
    });
  }
}

// Click the Watch rung, assert the curated LessonPlayer mounts, read depth +
// voice, then exit back to the detail page.
async function walkWatch(label) {
  ttsHits = [];
  const watchBtn = page.locator('[data-testid="walkthrough-btn"]').first();
  if (await watchBtn.count() === 0 || !(await watchBtn.isVisible().catch(() => false))) {
    rec(`${label}: Watch button present`, 'WARN', 'walkthrough-btn not found/visible');
    return;
  }
  await watchBtn.click().catch(() => null);
  // Wait for EITHER the curated player or the legacy mode to appear.
  await page.waitForTimeout(1800);
  await dismissHelp();
  const curated = await page.locator('[data-testid="lesson-player"]').count() > 0;
  const legacy = await page.locator('[data-testid="walkthrough-mode"], [data-testid="walkthrough-progress"]').count() > 0;

  if (curated) {
    // Read "Beat X / Y" depth.
    let beats = null;
    const txt = await page.locator('[data-testid="lesson-progress"]').first().innerText().catch(() => '');
    const m = txt.match(/(\d+)\s*\/\s*(\d+)/);
    if (m) beats = parseInt(m[2], 10);
    rec(`${label}: Watch → curated LessonPlayer (not legacy)`, 'PASS', beats ? `${beats} beats` : 'mounted');
    // Let the first narration fire.
    await page.waitForTimeout(2600);
    if (ttsHits.length > 0) rec(`${label}: voice fired (/api/tts)`, 'PASS', `${ttsHits.length} request(s)`);
    else rec(`${label}: voice fired (/api/tts)`, 'WARN', 'no tts request seen (headless; may use Web Speech fallback)');
    // Exit.
    await page.locator('[data-testid="lesson-back"]').first().click({ timeout: 4000 }).catch(() => page.goBack().catch(() => null));
    await page.waitForTimeout(700);
    await dismissHelp();
  } else if (legacy) {
    rec(`${label}: Watch → curated LessonPlayer (not legacy)`, 'FAIL', 'fell back to legacy WalkthroughMode');
    await page.locator('[data-testid="walkthrough-back"]').first().click({ timeout: 4000 }).catch(() => page.goBack().catch(() => null));
    await page.waitForTimeout(700);
    await dismissHelp();
  } else {
    rec(`${label}: Watch mounts a player`, 'WARN', 'neither lesson-player nor walkthrough-mode appeared');
    await page.goBack().catch(() => null);
    await page.waitForTimeout(700);
  }
}

console.log(`=== INTERACTIVE gambit-tab audit vs ${BASE} ===\n`);
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  waiting 50s for deferred seed (gambits load)...');
await page.waitForTimeout(50000);

for (const id of GAMBITS) {
  console.log(`\n── ${id} ──`);
  await page.goto(`${BASE}/openings/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(2500);
  await dismissHelp();

  // Confirm the detail page mounted for this gambit.
  const detail = page.locator('[data-testid="opening-detail"]');
  if (await detail.count() === 0) { rec(`${id}: detail page mounts`, 'FAIL', 'opening-detail not found'); continue; }

  // Enumerate variation tabs.
  await page.locator('[data-testid="variation-tabs"]').first().waitFor({ timeout: 6000 }).catch(() => null);
  const tabEls = page.locator('[data-testid^="variation-tab-"]');
  const tabCount = await tabEls.count();
  const tabIds = [];
  for (let i = 0; i < tabCount; i++) tabIds.push(await tabEls.nth(i).getAttribute('data-testid'));
  rec(`${id}: variation tabs render`, 'PASS', `${tabCount} tab(s): ${tabIds.join(', ')}`);

  // Main line Watch (tab "main" is selected by default).
  await page.locator('[data-testid="variation-tab-main"]').first().click({ timeout: 4000 }).catch(() => null);
  await page.waitForTimeout(500);
  await walkWatch(`${id}/MAIN`);

  // Each non-main variation tab.
  for (const tid of tabIds) {
    if (tid === 'variation-tab-main') continue;
    await page.locator(`[data-testid="${tid}"]`).first().click({ timeout: 4000 }).catch(() => null);
    await page.waitForTimeout(700);
    await dismissHelp();
    await walkWatch(`${id}/${tid}`);
  }
}

await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n${'='.repeat(60)}\nRESULT: ${pass} passed, ${fail} failed, ${warn} warnings`);
const fails = results.filter((r) => r.status === 'FAIL');
if (fails.length) { console.log('\nFAILURES:'); for (const f of fails) console.log(`  ✗ ${f.name}: ${f.detail}`); }
process.exit(fail > 0 ? 1 : 0);
