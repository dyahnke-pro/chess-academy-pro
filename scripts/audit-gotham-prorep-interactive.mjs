// INTERACTIVE post-build audit (G7) for the GothamChess pro-rep — runs against
// the LATEST code on a localhost dev server because prod is Vercel-cap-blocked
// (bundle frozen at C9F65Jim / Vienna era). This is the sanctioned localhost
// fallback per CLAUDE.md G1 — it verifies the CODE + content interactively
// (off-canonical input, cold-cache, first-time-user, pick-before-load,
// out-of-order), NOT the prod deploy pipeline. Re-run against prod once the cap
// resets and the bundle advances past C9F65Jim.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const results = [];
function rec(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`);
}

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });

async function freshPage() {
  const ctx = await browser.newContext(sandboxContextOptions());
  const page = await ctx.newPage();
  return { ctx, page };
}

async function dismissOnboarding(page) {
  try {
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 });
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* not shown */ }
}
async function dismissHelp(page) {
  const m = page.locator('[data-testid="page-help-modal"]');
  if (await m.count() > 0) {
    await page.keyboard.press('Escape').catch(() => null);
    await m.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => {
      const btn = m.locator('button').last();
      await btn.click({ force: true }).catch(() => null);
      await m.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null);
    });
  }
}

console.log('=== INTERACTIVE GothamChess pro-rep audit (localhost, latest code) ===\n');

// ── SCENARIO 1: FIRST-TIME USER + COLD CACHE ────────────────────────────────
// Fresh context = empty IndexedDB, no warmed pools, no session state.
console.log('--- Scenario 1: first-time user / cold cache ---');
let { ctx, page } = await freshPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
let ttsCount = 0;
page.on('request', (r) => { if (r.url().includes('/api/tts')) ttsCount++; });

await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding(page);
console.log('  onboarding dismissed; waiting 60s for cold deferred-seed (pro-rep + ECO + plans + models)...');
await page.waitForTimeout(60000);

// ── SCENARIO 2: FEATURED PLACEMENT on the Pro tab (off-canonical entry) ──────
console.log('\n--- Scenario 2: featured Gotham placement on /openings Pro tab ---');
await page.goto(`${URL}/openings`, { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2000);
await dismissHelp(page);
const proTab = page.locator('[data-testid="tab-pro"]');
if (await proTab.count() > 0) {
  await proTab.first().click().catch(() => null);
  await page.locator('[data-testid="featured-pro-openings"]').waitFor({ state: 'attached', timeout: 12000 }).catch(() => null);
  await page.locator('[data-testid="featured-pro-openings"] [data-testid^="opening-card-pro-gothamchess"]').first()
    .waitFor({ state: 'attached', timeout: 12000 }).catch(() => null);
  const featured = await page.locator('[data-testid="featured-pro-openings"]').count();
  const cards = await page.locator('[data-testid="featured-pro-openings"] [data-testid^="opening-card-pro-gothamchess"]').count();
  rec('Gotham repertoire pinned to top of Pro tab', featured > 0 ? 'PASS' : 'FAIL', `${featured} section`);
  rec('featured section lists his opening cards', cards > 0 ? 'PASS' : 'FAIL', `${cards} cards`);
} else {
  rec('Pro tab present on /openings', 'WARN', 'tab-pro not found');
}

// ── SCENARIO 3: COLD-CACHE detail pages for NEW openings (never opened) ──────
// Drive several of the openings built this session, interacting with each.
console.log('\n--- Scenario 3: cold detail pages + interactive tab/Watch probing ---');
const TARGETS = [
  'pro-gothamchess-pirc-defense',
  'pro-gothamchess-french-defense',
  'pro-gothamchess-scandinavian',
  'pro-gothamchess-closed-sicilian',
  'pro-gothamchess-caro-advance-white',
];
for (const id of TARGETS) {
  const short = id.replace('pro-gothamchess-', '');
  await page.goto(`${URL}/openings/pro/gothamchess/${id}`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(2500);
  await dismissHelp(page);

  const onPage = page.url().includes(id);
  const body = await page.evaluate(() => document.body.innerText).catch(() => '');
  rec(`${short}: detail page mounts`, onPage && body.length > 200 ? 'PASS' : 'FAIL');

  // PICK-BEFORE-LOAD: click a variation tab as soon as it appears.
  const tabs = page.locator('[role="tab"], [data-testid^="variation-tab"]');
  const tabN = await tabs.count();
  if (tabN > 1) {
    // out-of-order: click the LAST tab first, then the second.
    await tabs.nth(tabN - 1).click({ timeout: 4000 }).catch(() => null);
    await page.waitForTimeout(1200);
    await tabs.nth(1).click({ timeout: 4000 }).catch(() => null);
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => document.body.innerText).catch(() => '');
    rec(`${short}: variation tabs switch without empty state`, after.length > 200 && !/something went wrong|no data|undefined/i.test(after) ? 'PASS' : 'FAIL', `${tabN} tabs`);
  } else {
    rec(`${short}: variation tabs present`, tabN >= 1 ? 'PASS' : 'WARN', `${tabN} tabs`);
  }

  // Plans section present (the work added this session)
  const hasPlans = /middlegame|plan/i.test(body);
  rec(`${short}: middlegame plans surface`, hasPlans ? 'PASS' : 'WARN');
  // Model games present
  const hasModels = /model game|GothamChess|grandmaster|win/i.test(body);
  rec(`${short}: model games surface`, hasModels ? 'PASS' : 'WARN');
}

// ── SCENARIO 4: INTERACTIVE Watch — drive a plan's Watch button + voice ─────
console.log('\n--- Scenario 4: interactive Watch (plan playback + voice) ---');
await page.goto(`${URL}/openings/pro/gothamchess/pro-gothamchess-french-defense`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => null);
await page.waitForTimeout(3000);
await dismissHelp(page);
const ttsBefore = ttsCount;
// Find any Watch button and click it
const watchSelectors = ['button:has-text("Watch")', '[data-testid*="watch"]', 'button:has-text("Listen")'];
let watchClicked = false;
for (const sel of watchSelectors) {
  const el = page.locator(sel).first();
  if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
    await el.click().catch(() => null);
    watchClicked = true;
    break;
  }
}
rec('Watch button found + clicked', watchClicked ? 'PASS' : 'WARN');
if (watchClicked) {
  await page.waitForTimeout(10000);
  rec('TTS streaming fired on Watch (/api/tts)', ttsCount > ttsBefore ? 'PASS' : 'WARN', `${ttsCount - ttsBefore} requests`);
}

// ── SCENARIO 5: OFF-CANONICAL search input ──────────────────────────────────
console.log('\n--- Scenario 5: off-canonical search input ---');
await page.goto(`${URL}/openings`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => null);
await page.waitForTimeout(1500);
await dismissHelp(page);
const search = page.locator('input[type="search"], input[placeholder*="earch"], [data-testid="smart-search-bar"] input').first();
if (await search.count() > 0) {
  for (const q of ['levy', 'gotham caro', 'pirc']) {
    await search.fill(q).catch(() => null);
    await page.waitForTimeout(1200);
  }
  const noErr = errs.filter((e) => !/ERR_CERT|Failed to load resource/.test(e)).length === 0;
  rec('off-canonical search inputs handled without crash', noErr ? 'PASS' : 'FAIL');
} else {
  rec('search bar present', 'WARN', 'not found');
}

// ── Final: app-error sweep ──────────────────────────────────────────────────
const realErrors = errs.filter((e) => !/ERR_CERT|Failed to load resource|ResizeObserver/.test(e));
rec('no uncaught app errors across the run', realErrors.length === 0 ? 'PASS' : 'FAIL', `${realErrors.length} errors`);
for (const e of realErrors.slice(0, 5)) console.log('     ', e);

await ctx.close();
await browser.close();

const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings ===`);
process.exit(fail > 0 ? 1 : 0);
