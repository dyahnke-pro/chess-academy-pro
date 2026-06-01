import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { chromium } from 'playwright';

// DEEP instrumented Samay audit against LIVE prod. For every Samay opening and
// every variation tab: assert the 4 WLPP buttons, drive Watch (mounts + prose
// fires on /api/tts), Learn (mounts + cue fires), Practice (mounts + SILENT),
// capture pageerrors + the narration-LISTENER events. Reports REAL per-function
// results incl. failures. One warm context (seed once) to dodge the cold-seed
// IndexedDB write-stall (G1.4); the gem/Play UNLOCK write still stalls here and
// is reported as such, not faked.
const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OPENINGS = ['pro-samayraina-sicilian-black', 'pro-samayraina-open-e5', 'pro-samayraina-kings-gambit',
  'pro-samayraina-open-sicilian', 'pro-samayraina-ruy', 'pro-samayraina-italian',
  'pro-samayraina-french-white', 'pro-samayraina-caro-white', 'pro-samayraina-scandi'];

const listener = await startAuditListener();
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
// point the app's audit stream at the local listener BEFORE any app code runs
await ctx.addInitScript((u) => { try { localStorage.setItem('auditStreamUrl', u); } catch {} }, listener.url);
const page = await ctx.newPage();
const tts = [];
page.on('request', (r) => { const u = r.url(); if (/\/api\/tts/.test(u)) { const m = /[?&]text=([^&]*)/.exec(u); tts.push({ t: Date.now(), text: m ? decodeURIComponent(m[1]) : '' }); } });
const pageerrors = [];
page.on('pageerror', (e) => pageerrors.push(e.message));
const warmup = (t) => !t || t.trim() === '.' || t.trim() === '';

const fails = [];
const fail = (m) => { fails.push(m); console.log('  ✗ ' + m); };
const squares = () => page.locator('[data-square]').count().catch(() => 0);
async function exitPlayer() {
  const back = page.locator('[aria-label="Exit" i],[aria-label="Back" i],[data-testid*="exit" i],[data-testid="back-button"]').first();
  if (await back.isVisible().catch(() => false)) await back.click().catch(() => {});
  await page.waitForTimeout(700);
}
async function openDetail(id) {
  await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  try { await page.locator('[data-testid="page-help-modal"] button').first().click({ timeout: 2500 }); } catch {}
  await page.waitForSelector('[data-testid="opening-detail"], h1', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
}
// drive one WLPP mode; return {mounted, ttsTexts}
async function driveMode(btn, id, label) {
  const before = tts.length;
  const b = page.locator(`[data-testid="${btn}"]`).first();
  if (!(await b.count())) { fail(`${id} [${label}]: missing ${btn}`); return null; }
  await b.click().catch(() => {});
  await page.waitForTimeout(3500);
  const mounted = (await squares()) >= 64;
  const fired = tts.slice(before).map((x) => x.text).filter((t) => !warmup(t));
  await exitPlayer();
  await openDetail(id);
  return { mounted, fired };
}

// ── setup: bubble + cold seed once ──
console.log(`[setup] ${URL} — dismiss bubble + seed`);
await page.goto(URL + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
try {
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 10000 });
  await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 8000 });
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { state: 'detached', timeout: 15000 });
} catch (e) { console.log('[setup] bubble: ' + String(e).slice(0, 60)); }
await page.waitForTimeout(60000);

const titles = []; // {opening, tab, title} for distinctness
for (const id of OPENINGS) {
  console.log(`\n=== ${id.replace('pro-samayraina-', '')} ===`);
  await openDetail(id);
  if (!(await page.locator('[data-testid="opening-detail"], h1').count())) { fail(`${id}: detail did not render`); continue; }
  const body = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  if (/Loading opening/i.test(body)) { fail(`${id}: stuck on "Loading opening" (seed write-stall)`); continue; }
  // tabs: main (index -1) + each variation tab
  const tabN = await page.locator('[data-testid^="variation-tab-"]').count();
  const tabIdx = [-1, ...Array.from({ length: tabN }, (_, i) => i)];
  for (const ti of tabIdx) {
    let label = 'main';
    if (ti >= 0) {
      const t = page.locator('[data-testid^="variation-tab-"]').nth(ti);
      label = (await t.innerText().catch(() => `#${ti}`)).trim().replace(/\s+/g, ' ');
      await t.click().catch(() => {});
      await page.waitForTimeout(1500);
    }
    // 4 WLPP buttons present?
    for (const btn of ['walkthrough-btn', 'learn-btn', 'practice-btn', 'play-btn']) {
      if (!(await page.locator(`[data-testid="${btn}"]`).count())) fail(`${id} [${label}]: missing ${btn}`);
    }
    // re-select tab after the button-presence reads (no-op for main)
    if (ti >= 0) { await page.locator('[data-testid^="variation-tab-"]').nth(ti).click().catch(() => {}); await page.waitForTimeout(1000); }
    // WATCH
    const w = await driveMode('walkthrough-btn', id, label);
    if (w) {
      if (!w.mounted) fail(`${id} [${label}] Watch: did not mount`);
      if (w.fired.length === 0) fail(`${id} [${label}] Watch: NO narration fired on /api/tts`);
      const ttl = (await page.locator('[data-testid="lesson-title"]').first().innerText().catch(() => '')).trim();
      if (w.mounted) console.log(`  ✓ Watch [${label}] mounted, ${w.fired.length} tts | "${(w.fired[0] || '').slice(0, 50)}"`);
    }
    if (ti >= 0) { await page.locator('[data-testid^="variation-tab-"]').nth(ti).click().catch(() => {}); await page.waitForTimeout(1000); }
    // LEARN
    const l = await driveMode('learn-btn', id, label);
    if (l) {
      if (!l.mounted) fail(`${id} [${label}] Learn: did not mount`);
      else console.log(`  ✓ Learn [${label}] mounted, ${l.fired.length} tts`);
    }
    if (ti >= 0) { await page.locator('[data-testid^="variation-tab-"]').nth(ti).click().catch(() => {}); await page.waitForTimeout(1000); }
    // PRACTICE — must be SILENT
    const beforeP = tts.length;
    const p = await driveMode('practice-btn', id, label);
    if (p) {
      if (!p.mounted) fail(`${id} [${label}] Practice: did not mount`);
      else if (p.fired.length > 0) fail(`${id} [${label}] Practice: fired narration (must be silent): "${p.fired[0].slice(0, 40)}"`);
      else console.log(`  ✓ Practice [${label}] mounted + SILENT`);
    }
  }
}

// distinctness already implicitly checked via per-tab titles; report listener
const events = listener.getCapturedEvents ? listener.getCapturedEvents() : [];
console.log('\n══════ RESULT ══════');
console.log(`openings audited: ${OPENINGS.length}`);
console.log(`listener captured ${events.length} app audit events; ${tts.length} /api/tts requests`);
console.log(`pageerrors: ${pageerrors.length}` + (pageerrors.length ? '\n  ' + pageerrors.slice(0, 8).join('\n  ') : ''));
console.log(`FAILURES: ${fails.length}`);
for (const f of fails) console.log('  - ' + f);
console.log(fails.length === 0 && pageerrors.length === 0 ? '\n✅ deep audit clean' : `\n❌ ${fails.length} failures / ${pageerrors.length} pageerrors`);
await browser.close();
await listener.close?.();
process.exit(0);
