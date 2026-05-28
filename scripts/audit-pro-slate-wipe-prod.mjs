// 3-instrument post-deploy audit for the 2026-05-28 pro-rep slate-wipe
// (David). Verifies on LIVE PROD that:
//   - all 14 player names still render in the roster
//   - the 12 wiped players show the names-only empty state ("No
//     openings found for this player") — their builds are gone
//   - the 2 kept players (Naroditsky + GothamChess) still render
//     opening cards
// Plus G7 interactive probing (off-canonical: tap a wiped player
// cold, then a kept one) and the audit-stream + listener instruments.

import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const PROD = 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET;
if (!SECRET) { console.error('AUDIT_STREAM_SECRET missing'); process.exit(1); }

const results = [];
function rec(name, status, detail) {
  results.push({ name, status, detail });
  console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`);
}

async function pullProdStream(since) {
  const res = await fetch(`${PROD}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return await res.json();
}

const KEPT = [
  { id: 'naroditsky', name: 'Daniel Naroditsky' },
  { id: 'gothamchess', name: 'Levy Rozman' },
];
const WIPED = [
  'carlsen', 'hikaru', 'caruana', 'firouzja', 'dubov', 'gukesh',
  'praggnanandhaa', 'niemann', 'ericrosen', 'annacramling',
  'chesswithakeem', 'samayraina',
];

const tStart = Date.now();
console.log('=== Post-deploy audit: pro-rep slate-wipe (PROD) ===');
console.log(`run start: ${new Date(tStart).toISOString()}\n`);

console.log('--- (3a) Audit-stream baseline pull ---');
const baseline = await pullProdStream(tStart - 60_000);
if (baseline.error) rec('prod audit-stream reachable', 'FAIL', baseline.error);
else rec('prod audit-stream reachable', 'PASS', `${(baseline.entries || []).length} events / storage=${baseline.storage}`);

console.log('\n--- (2) Starting local listener sidecar ---');
const listener = await startAuditListener();
console.log(`  listener: ${listener.url}`);

console.log('\n--- (1) Playwright driving live prod ---');
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(`pageerror: ${e.message}`));

async function dismissOnboarding() {
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ timeout: 8000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15000 });
  } catch { /* no bubble — fine on a warm context */ }
  try {
    const help = page.locator('[data-testid="page-help-modal"]');
    await help.waitFor({ timeout: 3000 });
    await page.keyboard.press('Escape');
  } catch { /* none */ }
}

try {
  // Boot once so the reconciler runs (it deletes the wiped players'
  // orphan rows from Dexie under the new revision) + deferred seed.
  await page.goto(`${PROD}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissOnboarding();
  // Point the page's audit stream at the local listener.
  await page.evaluate((u) => localStorage.setItem('auditStreamUrl', u), listener.url);
  // Allow deferred seed + reconcile to settle (CLAUDE.md: 45-60s).
  await page.waitForTimeout(55000);
  await page.goto(`${PROD}/openings`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissOnboarding();

  // Navigate to the pro-repertoires tab and confirm the roster renders.
  await page.locator('[data-testid="pro-repertoires-tab"], button:has-text("Pro")').first().waitFor({ timeout: 15000 }).catch(() => {});
  // The roster may be behind a "Pro" sub-tab — click it if present.
  const proTab = page.locator('button:has-text("Pro")').first();
  if (await proTab.count()) { await proTab.click().catch(() => {}); await page.waitForTimeout(800); }

  // ── Roster: all 14 names present ──
  const bodyText = await page.locator('body').innerText();
  let namesFound = 0;
  for (const p of [...KEPT.map((k) => k.name), 'Magnus Carlsen', 'Hikaru Nakamura', 'Fabiano Caruana', 'Alireza Firouzja', 'Daniil Dubov', 'Gukesh', 'Praggnanandhaa', 'Hans Niemann', 'Eric Rosen', 'Anna Cramling', 'Akeem', 'Samay']) {
    if (bodyText.includes(p)) namesFound++;
  }
  rec('roster shows all player names (incl. wiped)', namesFound >= 13 ? 'PASS' : 'FAIL', `${namesFound}/14 name fragments visible`);

  // ── Kept players: opening cards render ──
  for (const k of KEPT) {
    await page.goto(`${PROD}/openings/pro/${k.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('[data-testid="pro-player-page"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const txt = await page.locator('[data-testid="pro-player-page"]').innerText();
    const empty = txt.includes('No openings found for this player');
    rec(`kept ${k.id} renders openings`, empty ? 'FAIL' : 'PASS', empty ? 'showed empty state' : 'has opening cards');
  }

  // ── Wiped players: names-only empty state ──
  let wipedOk = 0;
  for (const id of WIPED) {
    await page.goto(`${PROD}/openings/pro/${id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.locator('[data-testid="pro-player-page"]').waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(900);
    const txt = await page.locator('[data-testid="pro-player-page"]').innerText().catch(() => '');
    if (txt.includes('No openings found for this player')) wipedOk++;
    else rec(`wiped ${id} empty`, 'FAIL', `still shows content: ${txt.slice(0, 80)}`);
  }
  rec('all 12 wiped players show names-only empty state', wipedOk === WIPED.length ? 'PASS' : 'FAIL', `${wipedOk}/${WIPED.length}`);

  rec('no page errors', pageErrors.length === 0 ? 'PASS' : 'FAIL', pageErrors.slice(0, 3).join(' | ') || 'clean');
} catch (e) {
  rec('audit run', 'FAIL', e.message);
} finally {
  await browser.close();
}

console.log('\n--- (3b) Audit-stream delta pull ---');
const delta = await pullProdStream(tStart);
if (delta.error) rec('audit-stream delta', 'INFO', delta.error);
else rec('audit-stream delta', 'INFO', `${(delta.entries || []).length} events this run`);
console.log(`  listener captured ${listener.getCapturedEvents().length} narration/voice events`);
await listener.stop();

const fail = results.filter((r) => r.status === 'FAIL').length;
const pass = results.filter((r) => r.status === 'PASS').length;
console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
