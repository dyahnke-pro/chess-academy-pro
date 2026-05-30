// G9.3 VARIATION-TAB Watch audit vs LIVE PROD. Companion to
// audit-gotham-watch-depth-prod.mjs (which checks the MAIN-line Watch). This one
// clicks EVERY variation tab on every GothamChess opening, opens its Watch, and
// verifies it renders the curated LessonPlayer — NOT the legacy WalkthroughMode
// auto-narration (the "Bg5 pins the knight" bug class, one surface deeper).
// Detection: legacy WalkthroughMode renders [data-testid="walkthrough-progress"]
// / [data-testid="walkthrough-back"]; the curated LessonPlayer does not.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OPENINGS = [
  'pro-gothamchess-caro-advance-white', 'pro-gothamchess-italian', 'pro-gothamchess-london',
  'pro-gothamchess-vienna', 'pro-gothamchess-trompowsky', 'pro-gothamchess-english',
  'pro-gothamchess-ponziani', 'pro-gothamchess-anti-sicilian', 'pro-gothamchess-milner-barry',
  'pro-gothamchess-fantasy-caro', 'pro-gothamchess-stafford-refute', 'pro-gothamchess-kia',
  'pro-gothamchess-closed-sicilian', 'pro-gothamchess-caro-kann', 'pro-gothamchess-scandinavian',
  'pro-gothamchess-qgd', 'pro-gothamchess-french-defense', 'pro-gothamchess-pirc-defense',
];

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

async function dismissOnboarding() {
  try { await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 }); await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }); await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }); } catch { /* */ }
}
async function dismissHelp() {
  const m = page.locator('[data-testid="page-help-modal"]');
  if (await m.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => { await m.locator('button').last().click({ force: true }).catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); }); }
}

console.log(`=== Gotham VARIATION-tab Watch audit vs PROD (${PROD}) ===\n`);
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  waiting 55s for seed...');
await page.waitForTimeout(55000);

let legacyCount = 0, tabCount = 0;
for (const id of OPENINGS) {
  const short = id.replace('pro-gothamchess-', '');
  await page.goto(`${PROD}/openings/pro/gothamchess/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(2500);
  await dismissHelp();

  const tabStrip = page.locator('[data-testid="variation-tabs"]');
  if (await tabStrip.count() === 0) { rec(`${short}: variation tabs`, 'WARN', 'no tab strip'); continue; }
  // Count variation tabs (excluding the "main" tab).
  const nTabs = await page.locator('[data-testid^="variation-tab-"]:not([data-testid="variation-tab-main"])').count();
  if (nTabs === 0) { rec(`${short}: variation tabs`, 'WARN', 'none found'); continue; }

  for (let i = 0; i < nTabs; i++) {
    const tab = page.locator(`[data-testid="variation-tab-${i}"]`);
    if (await tab.count() === 0) continue;
    tabCount++;
    await tab.click().catch(() => null);
    await page.waitForTimeout(900);
    await dismissHelp();
    // Click the Watch rung for the selected variation.
    let clicked = false;
    for (const sel of ['button:has-text("Watch")', '[data-testid*="watch"]']) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) { await el.click().catch(() => null); clicked = true; break; }
    }
    if (!clicked) { rec(`${short} tab ${i}: Watch button`, 'WARN', 'not found'); continue; }
    await page.waitForTimeout(2200);
    await dismissHelp();
    const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
    if (isLegacy) { legacyCount++; rec(`${short} tab ${i}: variation Watch is curated`, 'FAIL', 'legacy WalkthroughMode'); }
    else { rec(`${short} tab ${i}: variation Watch is curated`, 'PASS'); }
    // Exit back to the opening page for the next tab.
    await page.locator('[data-testid="walkthrough-back"]').click({ timeout: 2500 }).catch(() => null);
    await page.goto(`${PROD}/openings/pro/gothamchess/${id}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => null);
    await page.waitForTimeout(1500);
    await dismissHelp();
  }
}

await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings ===`);
console.log(`  ${tabCount} variation tabs probed; ${legacyCount} fell back to legacy auto-narration`);
process.exit(fail > 0 ? 1 : 0);
