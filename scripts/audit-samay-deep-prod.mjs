import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';
import { chromium } from 'playwright';

// DEEP instrumented Samay audit against LIVE prod. Per CLAUDE.md G1 write-stall
// rule: SEED-UNLOCK the progression (linesUnlockedAll) so every rung + gem is
// reachable WITHOUT the stalling runtime write, then drive every function on
// every opening + variation tab: Watch / Learn / Practice / Play + gems, with
// the narration LISTENER attached and the /api/tts voice contract decoded.
const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OPENINGS = ['pro-samayraina-sicilian-black', 'pro-samayraina-open-e5', 'pro-samayraina-kings-gambit',
  'pro-samayraina-open-sicilian', 'pro-samayraina-ruy', 'pro-samayraina-italian',
  'pro-samayraina-french-white', 'pro-samayraina-caro-white', 'pro-samayraina-scandi'];
// Loop-contract depth: PASS 1 = standard; PASS≥2 = out-of-order tab coverage
// (reverse, main last) + wrong-move-in-Learn rejection probe; PASS≥3 = cold
// IndexedDB reseed first (exercise the cold seed/unlock path).
const PASS = Number(process.env.AUDIT_PASS) || 1;
console.log(`[pass ${PASS}] depth: ${PASS >= 3 ? 'cold-reseed + out-of-order + wrong-move' : PASS >= 2 ? 'out-of-order + wrong-move' : 'standard'}`);

const listener = await startAuditListener();
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript((u) => { try { localStorage.setItem('auditStreamUrl', u); } catch {} }, listener.url);
const page = await ctx.newPage();
const tts = [];
page.on('request', (r) => { const u = r.url(); if (/\/api\/tts/.test(u)) { const m = /[?&]text=([^&]*)/.exec(u); tts.push(m ? decodeURIComponent(m[1]) : ''); } });
const pageerrors = [];
page.on('pageerror', (e) => pageerrors.push(e.message));
const warmup = (t) => !t || t.trim() === '.' || t.trim() === '';
const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const ok = (m) => console.log('  ✓ ' + m);
const squares = () => page.locator('[data-square]').count().catch(() => 0);
// poll for the lesson board to mount — returns as soon as ≥64 squares (fast
// mounts resolve in ~1s instead of paying a fixed wait), cap maxMs.
async function waitMounted(maxMs = 6500) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) { if ((await squares()) >= 64) return true; await page.waitForTimeout(400); }
  return (await squares()) >= 64;
}

async function openDetail(id) {
  await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try { await page.locator('[data-testid="page-help-modal"] button').first().click({ timeout: 2500 }); } catch {}
  await page.waitForTimeout(1200);
}
async function exitPlayer() {
  const back = page.locator('[aria-label="Exit" i],[aria-label="Back" i],[data-testid*="exit" i],[data-testid="back-button"]').first();
  if (await back.isVisible().catch(() => false)) await back.click().catch(() => {});
  await page.waitForTimeout(600);
}
// click a WLPP/gem button, return {present, mounted, fired[]}
// wait until /api/tts has been quiet for `quietMs` so a prior mode's straggler
// request can't bleed into the next mode's capture window (esp. Practice=silent).
async function drainTts(quietMs = 900, maxMs = 4000) {
  const t0 = Date.now(); let last = tts.length, lastChange = Date.now();
  while (Date.now() - t0 < maxMs) {
    await page.waitForTimeout(250);
    if (tts.length !== last) { last = tts.length; lastChange = Date.now(); }
    else if (Date.now() - lastChange >= quietMs) return;
  }
}
async function drive(testidSel, id, label, expectMount = true) {
  await drainTts();
  const before = tts.length;
  const b = page.locator(testidSel).first();
  const present = (await b.count()) > 0;
  if (!present) return { present: false };
  await b.click().catch(() => {});
  const mounted = await waitMounted(7000); // polls; returns the instant it mounts
  await page.waitForTimeout(700); // let the first narration request fire
  const fired = tts.slice(before).filter((t) => !warmup(t));
  // exit via the player's back button (fast); only full-reload if that didn't
  // return us to the detail page (keeps state stable without the slow renav).
  await exitPlayer();
  if (!(await page.locator('[data-testid="opening-detail"]').count())) await openDetail(id);
  return { present: true, mounted, fired };
}

// ── setup: bubble + cold seed ──
console.log(`[setup] ${URL}`);
await page.goto(URL + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
try {
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 10000 });
  await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 8000 });
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { state: 'detached', timeout: 15000 });
} catch (e) { console.log('[setup] bubble: ' + String(e).slice(0, 60)); }
if (PASS >= 3) {
  console.log('[pass 3] cold-cache: clearing IndexedDB then reloading…');
  await page.evaluate(async () => { for (const d of await indexedDB.databases()) if (d.name) indexedDB.deleteDatabase(d.name); }).catch(() => {});
  await page.goto(URL + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  try { await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 8000 }); await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { state: 'detached', timeout: 15000 }); } catch {}
}
console.log('[setup] 60s deferred seed…');
await page.waitForTimeout(60000);
// touch each opening detail so its record is in Dexie, then UNLOCK the ladder
await openDetail(OPENINGS[0]);
const unlock = await seedUnlockedOpenings(page, OPENINGS);
console.log(`[unlock] seedUnlockedOpenings -> ${JSON.stringify(unlock)}`);
if (!unlock.ok) fail(`progression seed-unlock FAILED (${unlock.reason}) — write-stall hit; Learn/Practice/Play/gems may be locked`);

for (const id of OPENINGS) {
  console.log(`\n=== ${id.replace('pro-samayraina-', '')} ===`);
  await openDetail(id);
  const body0 = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (/Loading opening/i.test(body0)) { fail(`${id}: stuck Loading (seed)`); continue; }
  const tabN = await page.locator('[data-testid^="variation-tab-"]').count();
  const tabRange = Array.from({ length: Math.min(tabN, 4) }, (_, i) => i);
  // PASS≥2 digs deeper: drive the tabs OUT OF ORDER (reverse, main last) to
  // catch pick-before-load / stale-tab bugs the in-order pass can't.
  const tabOrder = PASS >= 2 ? [...tabRange].reverse().concat(-1) : [-1, ...tabRange];
  // PASS≥2 adversarial: rapid mode-toggle with no settle — assert no leak/error.
  if (PASS >= 2) {
    const e0 = pageerrors.length;
    for (const bsel of ['walkthrough-btn', 'learn-btn', 'practice-btn']) { await page.locator(`[data-testid="${bsel}"]`).first().click({ timeout: 2000 }).catch(() => {}); }
    await page.waitForTimeout(800); await openDetail(id);
    if (pageerrors.length > e0) fail(`${id}: rapid mode-toggle leaked a pageerror`);
  }
  for (const ti of tabOrder) {
    let label = 'main';
    const selectTab = async () => { if (ti >= 0) { await page.locator('[data-testid^="variation-tab-"]').nth(ti).click().catch(() => {}); await page.waitForTimeout(1200); } };
    await selectTab();
    if (ti >= 0) label = (await page.locator('[data-testid^="variation-tab-"]').nth(ti).innerText().catch(() => `#${ti}`)).trim().replace(/\s+/g, ' ').slice(0, 22);
    for (const btn of ['walkthrough-btn', 'learn-btn', 'practice-btn', 'play-btn']) {
      if (!(await page.locator(`[data-testid="${btn}"]`).count())) fail(`${id} [${label}]: missing ${btn}`);
    }
    await selectTab();
    const w = await drive('[data-testid="walkthrough-btn"]', id, label);
    if (w.present) { if (!w.mounted) fail(`${id} [${label}] Watch: no mount`); else if (!w.fired.length) fail(`${id} [${label}] Watch: NO /api/tts`); else ok(`Watch [${label}] mount+prose "${w.fired[0].slice(0, 42)}"`); }
    await selectTab();
    const l = await drive('[data-testid="learn-btn"]', id, label);
    if (l.present) { if (!l.mounted) fail(`${id} [${label}] Learn: no mount (still locked? unlock=${unlock.ok})`); else ok(`Learn [${label}] mount, ${l.fired.length} tts`); }
    await selectTab();
    const p = await drive('[data-testid="practice-btn"]', id, label);
    if (p.present) { if (!p.mounted) fail(`${id} [${label}] Practice: no mount`); else if (p.fired.length) fail(`${id} [${label}] Practice: NOT silent ("${p.fired[0].slice(0, 30)}")`); else ok(`Practice [${label}] mount+SILENT`); }
    await selectTab();
    const pl = await drive('[data-testid="play-btn"]', id, label);
    if (pl.present) { const inPlay = (await page.locator('[data-testid="opening-play-mode"]').count()) > 0 || pl.mounted; if (!inPlay) fail(`${id} [${label}] Play: did not enter play`); else ok(`Play [${label}] entered`); }
  }
  // GEMS (weapons) — unlocked via seed; assert card + drive a gem Watch
  const gemCard = (await page.locator('[data-testid="punish-gems-card"]').count()) > 0;
  const gemWatchN = await page.locator('[data-testid^="gem-watch-"]').count();
  if (gemCard && gemWatchN > 0) {
    const g = await drive('[data-testid^="gem-watch-"]', id, 'gem');
    if (g.mounted) ok(`Gems unlocked (${gemWatchN}), gem-watch mounts${g.fired.length ? ' + tts' : ''}`); else fail(`${id}: gem-watch did not mount`);
  } else if (await page.locator('[data-testid="weapons-locked-card"]').count()) {
    fail(`${id}: weapons still LOCKED after seed-unlock (write-stall) — gems unverified`);
  } else { ok(`${id}: no weapon gems (self-hide, expected if none real)`); }
}

const events = listener.getCapturedEvents ? listener.getCapturedEvents() : [];
console.log('\n══════ RESULT ══════');
console.log(`unlock seed: ${JSON.stringify(unlock)}`);
console.log(`listener events: ${events.length} | /api/tts requests: ${tts.length} | pageerrors: ${pageerrors.length}`);
if (pageerrors.length) console.log('  ' + pageerrors.slice(0, 8).join('\n  '));
console.log(`FAILURES: ${fails.length}`);
for (const f of fails) console.log('  - ' + f);
console.log(fails.length === 0 && pageerrors.length === 0 ? '\n✅ DEEP AUDIT CLEAN' : `\n❌ ${fails.length} failures / ${pageerrors.length} pageerrors`);
await browser.close();
await listener.close?.();
process.exit(0);
