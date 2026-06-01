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
async function drive(testidSel, id, label, expectMount = true) {
  const before = tts.length;
  const b = page.locator(testidSel).first();
  const present = (await b.count()) > 0;
  if (!present) return { present: false };
  await b.click().catch(() => {});
  await page.waitForTimeout(3000);
  const mounted = (await squares()) >= 64;
  const fired = tts.slice(before).filter((t) => !warmup(t));
  await exitPlayer(); await openDetail(id);
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
  for (const ti of [-1, ...Array.from({ length: Math.min(tabN, 4) }, (_, i) => i)]) {
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
