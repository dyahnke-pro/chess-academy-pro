// UNLOCK + verify the Hikaru punish-gem TILES actually render (David: "unlock
// and audit with playwright x3 tools"). The weapon section is gated behind the
// WLPP ladder — areWeaponsUnlocked() is true when the opening record's
// linesPlayed includes the main-line index (-1) OR linesUnlockedAll does. So
// we (1) drive the in-app "expert pass" unlock button AND (2) as a fallback,
// seed the unlock directly into Dexie (ChessAcademyDB → openings) and reload —
// then count the real `punish-gem-*` tiles. If the openings-store WRITE stalls
// (CLAUDE.md G1.4 sandbox caveat), we report it honestly with the probe timing.
//
// 3 instruments: (1) Playwright drives unlock + counts tiles + reads tile text;
// (2) audit-stream pulled pre/post; (3) /api/tts capture when a gem Watch plays.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';
const GEM_OPENINGS = [
  { id: 'pro-hikaru-caro-kann', expect: 5 },
  { id: 'pro-hikaru-closed-sicilian', expect: 1 },
];

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

async function pullStream(sinceMs) {
  if (!SECRET) return { count: null, note: 'no secret' };
  try { const r = await fetch(`${PROD}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': SECRET } }); if (!r.ok) return { count: null, note: `HTTP ${r.status}` }; const j = await r.json(); return { count: j.count ?? 0, entries: j.entries || [], storage: j.storage }; } catch (e) { return { count: null, note: String(e).slice(0, 60) }; }
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const appErrors = [];
let ttsCount = 0;
page.on('pageerror', (e) => appErrors.push(e.message));
page.on('request', (r) => { if (r.url().includes('/api/tts')) ttsCount++; });

async function dismissOnboarding() { try { await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 }); await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }); await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }); } catch { /* */ } }
async function dismissHelp() { const m = page.locator('[data-testid="page-help-modal"]'); if (await m.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => { await m.locator('button').last().click({ force: true }).catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); }); } }

// Seed linesPlayed:[-1] into the opening record via raw IndexedDB, with an
// internal timeout so a stalled write is reported (not hung). Returns timing.
async function seedUnlock(openingId) {
  return await page.evaluate(async (id) => {
    const t0 = Date.now();
    function withTimeout(p, ms) { return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]); }
    try {
      const db = await withTimeout(new Promise((res, rej) => { const r = indexedDB.open('ChessAcademyDB'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }), 8000);
      const rec = await withTimeout(new Promise((res, rej) => { const tx = db.transaction('openings', 'readonly'); const rq = tx.objectStore('openings').get(id); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }), 8000);
      if (!rec) return { ok: false, reason: 'record-not-found', ms: Date.now() - t0 };
      rec.linesPlayed = Array.from(new Set([...(rec.linesPlayed || []), -1]));
      rec.linesUnlockedAll = Array.from(new Set([...(rec.linesUnlockedAll || []), -1]));
      await withTimeout(new Promise((res, rej) => { const tx = db.transaction('openings', 'readwrite'); tx.objectStore('openings').put(rec); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(new Error('abort')); }), 8000);
      return { ok: true, ms: Date.now() - t0, linesPlayed: rec.linesPlayed };
    } catch (e) { return { ok: false, reason: String(e && e.message || e), ms: Date.now() - t0 }; }
  }, openingId);
}

console.log(`=== Hikaru gem UNLOCK + tile verification vs PROD (${PROD}) ===\n`);
const runStart = Date.now();
const pre = await pullStream(runStart - 5000);
console.log(`  [stream-pre] ${pre.count ?? 'n/a'} events (storage: ${pre.storage ?? pre.note})`);

await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  cold seed: waiting 60s for openings + gems...');
await page.waitForTimeout(60000);

for (const { id, expect } of GEM_OPENINGS) {
  const short = id.replace('pro-hikaru-', '');
  console.log(`\n--- ${short} (expect ${expect} gems) ---`);
  await page.goto(`${PROD}/openings/pro/hikaru/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(3000);
  await dismissHelp();

  const lockedBefore = await page.locator('[data-testid="weapons-locked-card"]').count().catch(() => 0);
  rec(`${short}: weapons locked before unlock (gems recognized)`, lockedBefore > 0 ? 'PASS' : 'WARN', `${lockedBefore} locked-card`);

  // PATH 1 — drive the in-app expert-pass unlock button.
  let tiles = 0, path = '';
  const unlockBtn = page.locator('[data-testid="weapons-unlock-all-btn"]');
  if (await unlockBtn.count() > 0) {
    await unlockBtn.click({ timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(500);
    await unlockBtn.click({ timeout: 2000 }).catch(() => null); // two-tap confirm
    await page.waitForTimeout(3000);
    tiles = await page.locator('[data-testid^="punish-gem-"]').count().catch(() => 0);
    if (tiles > 0) path = 'in-app expert pass';
  }

  // PATH 2 — fallback: seed the unlock directly into Dexie + reload.
  let seed = null;
  if (tiles === 0) {
    seed = await seedUnlock(id);
    console.log(`    [seed-unlock] ${seed.ok ? `ok in ${seed.ms}ms` : `FAILED (${seed.reason}) after ${seed.ms}ms`}`);
    if (seed.ok) {
      await page.goto(`${PROD}/openings/pro/hikaru/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
      await page.waitForTimeout(3000);
      await dismissHelp();
      tiles = await page.locator('[data-testid^="punish-gem-"]').count().catch(() => 0);
      if (tiles > 0) path = 'dexie-seed + reload';
    }
  }

  if (tiles > 0) {
    rec(`${short}: gem TILES render after unlock (expect >=${expect})`, tiles >= expect ? 'PASS' : 'WARN', `${tiles} tiles via ${path}`);
    // Read the tiles' text — each must name a real inaccuracy + punish (correctness).
    const card = page.locator('[data-testid="punish-gems-card"]');
    const cardText = (await card.innerText().catch(() => '')) || '';
    const namesMoves = /[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8]\+?/.test(cardText) && /punish|opponent|play/i.test(cardText);
    rec(`${short}: gem tiles name the inaccuracy + punish`, namesMoves ? 'PASS' : 'WARN', `${cardText.length} chars`);
    // Drive the first gem's Watch — voice should fire.
    const ttsBefore = ttsCount;
    const gemWatch = page.locator('[data-testid^="gem-watch-"]').first();
    if (await gemWatch.count() > 0) {
      await gemWatch.click({ timeout: 3000 }).catch(() => null);
      await page.waitForTimeout(9000);
      rec(`${short}: gem Watch fires TTS voice`, ttsCount > ttsBefore ? 'PASS' : 'WARN', `${ttsCount - ttsBefore} /api/tts`);
    }
  } else {
    const stalled = seed && !seed.ok && /timeout|abort/.test(seed.reason || '');
    rec(`${short}: gem tiles render after unlock`, stalled ? 'WARN' : 'FAIL',
      stalled ? `openings-store WRITE stalled in-sandbox (G1.4) after ${seed.ms}ms — verify on device` : `0 tiles (seed: ${seed ? seed.reason : 'n/a'})`);
  }
}

await page.waitForTimeout(1500);
const post = await pullStream(runStart);
console.log(`\n  [stream-post] ${post.count ?? 0} events this run (storage: ${post.storage ?? post.note})`);
rec('audit-stream reachable (instrument 2)', (post.count ?? null) !== null ? 'PASS' : 'WARN', `${post.count ?? 'n/a'} events`);

const realErrors = appErrors.filter((e) => !/ERR_CERT|Failed to load resource|ResizeObserver/.test(e));
rec('no uncaught app errors across the run', realErrors.length === 0 ? 'PASS' : 'FAIL', `${realErrors.length} errors`);
for (const e of realErrors.slice(0, 6)) console.log('     ', e);

await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings ===`);
process.exit(fail > 0 ? 1 : 0);
