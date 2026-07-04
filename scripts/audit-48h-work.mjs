// Comprehensive post-deploy audit for the last 48h of work (David 2026-07-04).
// A) Openings: the Glek System masterclass renders fully + the ECO subline→
//    masterclass tab routing lands on the right target. B) Smoke pass over the
//    other 48h surfaces (coach adaptive drills/hints/tactical, consent boot):
//    they mount with no page/console errors.
// Chromium→prod egress resets in this container, so this runs vs localhost
// (AUDIT_SMOKE_URL) to verify the CODE; the prod DEPLOY is verified separately
// via bundle grep + the audit-stream.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startProdBridge } from './audit-lib/prod-bridge.mjs';

// AUDIT_PROD_BRIDGE=1 audits the LIVE prod app: Chromium's HTTPS handshake is
// reset by this container's TLS-re-terminating egress proxy, so we bridge prod
// over plain HTTP on localhost (see prod-bridge.mjs). Otherwise target
// AUDIT_SMOKE_URL (a localhost dev server).
const bridge = process.env.AUDIT_PROD_BRIDGE === '1' ? await startProdBridge(Number(process.env.AUDIT_BRIDGE_PORT || 8099)) : null;
const URL = bridge ? bridge.url : (process.env.AUDIT_SMOKE_URL || 'http://localhost:5173');
if (bridge) console.log(`[bridge] auditing LIVE PROD via ${bridge.url} → ${bridge.prod}`);
const results = [];
const rec = (name, status, detail) => { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); };

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${(e.message || '').split('\n')[0]}`));
page.on('console', (m) => { if (m.type() === 'error') { const t = m.text(); if (!/favicon|ERR_|Failed to load resource|manifest|404/.test(t)) errors.push(`console: ${t.slice(0, 120)}`); } });
const errSnapshot = () => errors.length;

async function gotoRetry(path, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { await page.goto(`${URL}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); return true; }
    catch { await page.waitForTimeout(1500 * (i + 1)); }
  }
  return false;
}
async function dismissOnboarding() {
  try { await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 10000 }); await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }); await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 12000 }); } catch { /* */ }
}
async function dismissHelp() { const m = page.locator('[data-testid="page-help-modal"]'); if (await m.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await m.waitFor({ state: 'detached', timeout: 4000 }).catch(() => null); } }
const bodyText = () => page.evaluate(() => document.body.innerText).catch(() => '');

console.log(`=== 48h work audit vs ${URL} ===\n`);
await gotoRetry('/');
await dismissOnboarding();
console.log('  waiting 55s for the deferred seed...');
await page.waitForTimeout(55000);

// ── A1. Glek System masterclass ──────────────────────────────────────────────
console.log('\n--- A1. Glek System masterclass ---');
await gotoRetry('/openings/glek-system'); await page.waitForTimeout(3000); await dismissHelp();
{
  const body = await bodyText();
  const tabs = ['Central', 'Pin', 'Fianchetto'].filter((t) => body.includes(t));
  rec('Glek: variation tabs', tabs.length >= 2 ? 'PASS' : 'FAIL', tabs.join(','));
  const sections = ['Middlegame', 'Model Game', 'Mistake', 'Pitfall'].filter((s) => new RegExp(s, 'i').test(body));
  rec('Glek: masterclass sections', sections.length >= 2 ? 'PASS' : 'FAIL', sections.join(','));
  const models = (body.match(/Rapport|Mamedyarov|Amonatov|Safarli/g) || []);
  rec('Glek: model games present', models.length >= 1 ? 'PASS' : 'WARN', [...new Set(models)].join(','));
  const watch = page.locator('button:has-text("Watch")').first();
  if (await watch.count() > 0) { await watch.click().catch(() => null); await page.waitForTimeout(2000); await dismissHelp();
    const legacy = await page.locator('[data-testid="walkthrough-progress"],[data-testid="walkthrough-back"]').count() > 0;
    rec('Glek: Watch is curated lesson', legacy ? 'FAIL' : 'PASS', legacy ? 'legacy WalkthroughMode' : '');
  }
}

// ── A2. Subline → masterclass tab routing ────────────────────────────────────
console.log('\n--- A2. Subline → masterclass routing ---');
// `assert:'url'` — the ECO record exists as its own bare row, so the page
//   navigate(replace)s to the masterclass (URL changes; tab pre-selected).
// `assert:'content'` — the Glek twin is ALIASED in getOpeningById to the
//   glek-system masterclass, so it renders the masterclass IN PLACE (URL stays
//   the twin, content is the masterclass). Both satisfy "no bare page".
const CASES = [
  { id: 'c47-four-knights-game-glek-system', to: 'glek-system', assert: 'content' },
  { id: 'b12-caro-kann-defense-advance-variation', to: 'caro-kann', assert: 'url' },
  { id: 'c57-italian-game-two-knights-defense-fried-liver-attack', to: 'two-knights-defence', assert: 'url' },
  { id: 'a45-trompowsky-attack-classical-defense', to: 'trompowsky-attack', assert: 'url' },
  { id: 'c15-french-defense-winawer-variation', to: 'french-defence', assert: 'url' },
  { id: 'b90-sicilian-defense-najdorf-variation-english-attack', to: 'sicilian-najdorf', assert: 'url' },
];
for (const c of CASES) {
  await gotoRetry(`/openings/${c.id}`); await page.waitForTimeout(2500); await dismissHelp();
  if (c.assert === 'content') {
    // Aliased render-in-place: the twin URL must show the masterclass, NOT the
    // bare reference page (which has no variation tabs / masterclass sections).
    const body = await bodyText();
    const rich = ['Central', 'Pin', 'Fianchetto', 'Middlegame', 'Model Game'].filter((t) => new RegExp(t, 'i').test(body));
    rec(`alias ${c.id.slice(0, 30)}… renders ${c.to} masterclass`, rich.length >= 2 ? 'PASS' : 'FAIL', rich.join(',') || 'bare page');
  } else {
    const url = page.url();
    const landed = url.includes(`/openings/${c.to}`);
    rec(`redirect ${c.id.slice(0, 30)}… → ${c.to}`, landed ? 'PASS' : 'FAIL', landed ? url.split('/openings/')[1] : `stuck at ${url.split('/openings/')[1] ?? url}`);
  }
}

// ── B. Other 48h surfaces — boot + no errors ─────────────────────────────────
console.log('\n--- B. Coach/other 48h surfaces boot clean ---');
for (const [label, path, mustSee] of [
  ['coach home', '/coach/home', /coach|learn|play/i],
  ['coach teach (adaptive drills)', '/coach/teach', /coach|opening|type/i],
  ['coach play (ponder/narration)', '/coach/play', /coach|play|board/i],
  ['coach endgame (adaptive seed)', '/coach/endgame', /endgame|coach/i],
]) {
  const before = errSnapshot();
  await gotoRetry(path); await page.waitForTimeout(3500); await dismissHelp();
  const body = await bodyText();
  const mounted = mustSee.test(body) && body.length > 40;
  const newErrs = errors.slice(before);
  rec(`${label} mounts`, mounted ? 'PASS' : 'WARN', mounted ? '' : 'unexpected/empty');
  rec(`${label} no errors`, newErrs.length === 0 ? 'PASS' : 'FAIL', newErrs.slice(0, 2).join(' | '));
}

await browser.close();
if (bridge) await bridge.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL');
console.log(`\n=== ${pass} PASS / ${fail.length} FAIL / ${results.filter((r) => r.status === 'WARN').length} WARN ===`);
console.log(`total captured errors: ${errors.length}`);
if (errors.length) errors.slice(0, 8).forEach((e) => console.log(`  ! ${e}`));
if (fail.length) { fail.forEach((f) => console.log(`  FAIL ${f.name}${f.detail ? ' — ' + f.detail : ''}`)); process.exit(1); }
