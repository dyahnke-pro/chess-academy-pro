#!/usr/bin/env node
/**
 * audit-opening-sale — openings sold one at a time, $0.99 each (David
 * 2026-10-25: "Let's try selling the openings. I like the 0.99" → "À la carte").
 *
 * Billing is native-only, so on the web the store is STUBBED at the module
 * boundary (the dev server's `billingService.ts` is replaced by a fake that
 * prices every opening product at $0.99 and "buys" by adding it to the store's
 * owned list). Everything else is the real app: the drill wall, the paywall,
 * the free-slot ledger, the opening page.
 *
 *   A  free slot spent on another opening → Learn on this one shows the wall,
 *      led by "Unlock for $0.99" naming this opening
 *   B  the App Review screenshot of that screen (fastlane/review/opening-unlock.png,
 *      1290×2796 — an iPhone 6.7" frame)
 *   C  tapping it unlocks THIS opening: the wall steps aside and Learn plays
 *   D  the free slot is untouched (still only the opening it was spent on)
 *   E  an opening the store does not sell here shows no offer, the plans stand
 *   F  health: zero pageerrors
 *
 * Needs a dev server with the gate on (the native build bakes it; web never does):
 *   VITE_PAYWALL_ENABLED=true npx vite --port 5174 --strictPort &
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://localhost:5174 node scripts/audit-opening-sale.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5174';
const SHOT = process.env.SCREENSHOT_PATH || 'fastlane/review/opening-unlock.png';
const FREE = 'italian-game';
const SOLD = 'caro-kann';
const NOT_SOLD = 'vienna-game';
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

// The store, faked at the module boundary. It imports the SAME entitlement
// store module the app uses, so a "purchase" moves the real state the page reads.
const STUB = `
import { useEntitlementStore } from '/src/stores/entitlementStore.ts';
import { openingProductFor } from '/src/services/openingProducts.ts';
const NOT_SOLD = ${JSON.stringify(NOT_SOLD)};
export function isBillingConfigured() { return true; }
export function clearBillingError() { useEntitlementStore.getState().setError(null); }
export async function getStableAnalyticsId() { return null; }
export async function initBilling() { useEntitlementStore.getState().setEntitlement({ isPro: false, source: 'none' }); }
export async function getBillingPackages() {
  return [
    { id: '$rc_annual', priceString: '$34.99', priceAmount: 34.99, currency: 'USD', title: 'Yearly', description: '', hasFreeTrial: false, trialDescription: null, packageType: 'ANNUAL', isAnnual: true },
    { id: '$rc_monthly', priceString: '$3.99', priceAmount: 3.99, currency: 'USD', title: 'Monthly', description: '', hasFreeTrial: true, trialDescription: '7 day', packageType: 'MONTHLY', isAnnual: false },
  ];
}
export async function purchasePackage() { return false; }
export async function restorePurchases() { return false; }
export function extractPurchaseErrorDetail() { return {}; }
export async function getOpeningOffer(openingId) {
  const p = openingProductFor(openingId);
  if (!p || openingId === NOT_SOLD) return null;
  return { openingId, productId: p.productId, priceString: '$0.99', priceAmount: 0.99, currency: 'USD', title: p.name };
}
export async function purchaseOpening(offer) {
  const s = useEntitlementStore.getState();
  s.setOwnedOpenings([...new Set([...s.ownedOpeningIds, offer.openingId])]);
  window.__openingPurchases = [...(window.__openingPurchases || []), offer.productId];
  return true;
}
`;

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
// 430×932 at 3× = 1290×2796, the iPhone 6.7" frame App Review takes.
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript(stampAuditRunId(`opening-sale-${Math.random().toString(36).slice(2, 8)}`));
await ctx.route(/\/src\/services\/billingService\.ts(\?.*)?$/, (route) =>
  route.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));
const tid = (id) => page.locator(`[data-testid="${id}"]`);

async function dismissModals() {
  try { const g = tid('ai-consent-modal'); await g.waitFor({ timeout: 4000 }); await tid('ai-consent-allow').click(); await g.waitFor({ state: 'detached', timeout: 10000 }); } catch { /* not shown */ }
}
async function openLearn(openingId) {
  await page.goto(`${BASE}/openings/${openingId}`, { waitUntil: 'domcontentloaded' });
  await dismissModals();
  // A first visit opens straight into Watch; step back out to the course page.
  await Promise.race([tid('learn-btn').waitFor({ timeout: 60000 }), tid('lesson-back').waitFor({ timeout: 60000 })]);
  if (await tid('lesson-back').count()) await tid('lesson-back').click();
  await tid('learn-btn').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="learn-btn"]')?.getAttribute('data-locked') === 'false', null, { timeout: 30000 });
  await tid('learn-btn').click();
}

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissModals();
  // The opening rows land with the boot seed; wait until all three exist.
  await page.waitForFunction(async (ids) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const found = await Promise.all(ids.map((id) => new Promise((res) => {
      try { const g = db.transaction('openings').objectStore('openings').get(id); g.onsuccess = () => res(!!g.result); g.onerror = () => res(false); } catch { res(false); }
    })));
    db.close();
    return found.every(Boolean);
  }, [FREE, SOLD, NOT_SOLD], { timeout: 90000, polling: 1000 });
  const seeded = await seedUnlockedOpenings(page, [FREE, SOLD, NOT_SOLD]);
  console.log('[seed]', JSON.stringify(seeded));
  // The one free opening, already spent on another course.
  await page.evaluate(async (free) => {
    const { useFreeTierStore } = await import('/src/stores/freeTierStore.ts');
    await useFreeTierStore.getState().hydrate();
    await useFreeTierStore.getState().claimFreeOpening(free);
  }, FREE);

  // A — the wall, led by this opening's offer.
  await openLearn(SOLD);
  await tid('opening-offer').waitFor({ timeout: 20000 });
  const offerText = await tid('opening-offer').innerText();
  const buyText = await tid('opening-offer-buy').innerText();
  check('A the drill wall leads with "Unlock for $0.99" for this opening', /Caro-Kann/.test(offerText) && buyText.trim() === 'Unlock for $0.99', `${offerText.replace(/\n/g, ' | ')}`);

  // B — the App Review screenshot.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  fs.mkdirSync('fastlane/review', { recursive: true });
  await page.screenshot({ path: SHOT });
  const size = fs.statSync(SHOT).size;
  const png = fs.readFileSync(SHOT);
  const w = png.readUInt32BE(16); const h = png.readUInt32BE(20);
  check('B review screenshot saved at 1290×2796', w === 1290 && h === 2796 && size > 20000, `${SHOT} ${w}×${h} ${size}B`);

  // C — buy it: the wall steps aside and Learn plays.
  await tid('opening-offer-buy').click();
  await tid('opening-offer').waitFor({ state: 'detached', timeout: 15000 });
  const bought = await page.evaluate(() => window.__openingPurchases ?? []);
  const owned = await page.evaluate(async () => (await import('/src/stores/entitlementStore.ts')).useEntitlementStore.getState().ownedOpeningIds);
  const wallGone = (await tid('paywall-back-free').count()) === 0;
  check('C tapping it unlocks THIS opening and the lesson opens', wallGone && bought.length === 1 && bought[0] === 'opening.caro_kann' && owned.includes(SOLD), `bought=${JSON.stringify(bought)} owned=${JSON.stringify(owned)} wallGone=${wallGone}`);

  // D — the free slot is untouched.
  const ledger = await page.evaluate(async () => (await import('/src/stores/freeTierStore.ts')).useFreeTierStore.getState().row.freeOpeningIds);
  check('D the free slot was not spent on the bought opening', JSON.stringify(ledger) === JSON.stringify([FREE]), JSON.stringify(ledger));

  // E — an opening not on sale here: no offer, the plans stand.
  await openLearn(NOT_SOLD);
  await tid('paywall-back-free').waitFor({ timeout: 20000 });
  await page.waitForTimeout(1500);
  check('E an opening the store does not sell shows no offer — the plans stand', (await tid('opening-offer').count()) === 0 && (await page.getByText('Yearly').count()) > 0);

  check('F zero pageerrors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' || '));
} catch (e) {
  check('run completed', false, String(e).slice(0, 300));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
fs.mkdirSync('audit-reports', { recursive: true });
fs.writeFileSync(`audit-reports/opening-sale-${Date.now()}.json`, JSON.stringify({ base: BASE, results }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
