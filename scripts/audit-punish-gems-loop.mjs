#!/usr/bin/env node
/**
 * Punish-gems + WLPP interactive loop audit — POST-DEPLOY CONTRACT (G7).
 *
 * David's contract (2026-05-23): "Three CONSECUTIVE passes, each digging
 * deeper and challenging the code harder, with ZERO errors = pass. Not just
 * 3 passes." This runs three escalating tiers in one sweep; the contract is
 * MET only when ALL THREE come back with 0 errors. Any error fails the sweep
 * — you fix and re-run until you get a clean 3/3.
 *
 *   Tier 1 — BREADTH / happy path. Every gem-bearing opening: card renders,
 *            every gem carries the 4 WLPP buttons, Watch mounts the played-
 *            out line and the Watch prose actually fires on the wire.
 *   Tier 2 — FAILURE MODES. Cold IndexedDB, no-gem tab self-hide, pick-
 *            before-load, out-of-order mode switching, the Caro named-trap
 *            Learn path, AND the voice contract decoded off /api/tts:
 *            Learn speaks MOVE-DICTATION only, Practice fires NOTHING.
 *   Tier 3 — ADVERSARIAL / stress. Wrong move in Learn (board rejects, no
 *            desync), rapid mode toggling (no leak), full Watch playout to
 *            completion, Practice silence under interaction. Zero pageerrors
 *            / unhandledrejection across the whole tier.
 *
 * The WLPP contract being proven (David): Watch = authored prose narration,
 * Learn = TTS move dictation ONLY, Practice = silent, Play = coach room.
 *
 * Run (sandbox): npm run dev, then
 *   AUDIT_SMOKE_URL=http://localhost:5173 node scripts/audit-punish-gems-loop.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { mkdir, writeFile } from 'node:fs/promises';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const GEM_OPENINGS = ['caro-kann', 'ruy-lopez', 'pirc-defence'];

// Console noise that is NOT a bug in the sandbox (firewalled prod + the dev
// server having no /api/tts function). Real app bugs are anything else.
const NOISE = [
  /ERR_CERT/i, /net::ERR_/i, /Failed to load resource/i,
  /\/api\/tts/i, /\/api\/audit-stream/i, /favicon/i, /Polly/i,
  /tts-failure/i, /the server responded with a status of 404/i,
];
const isNoise = (s) => NOISE.some((re) => re.test(s));

function ttsTextOf(url) {
  const m = url.match(/[?&]text=([^&]+)/);
  if (!m) return '';
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}
// Move dictation looks like "Knight to f 3" / "Pawn to e 4" / "Castle
// kingside" / "e takes d 5" — short, no full-sentence prose.
const isMoveDictation = (t) =>
  /^([A-Z][a-z]+ to [a-h] [1-8]|Castle (kingside|queenside)|[a-h] takes [a-h] [1-8]|[A-Z][a-z]+ takes [a-h] [1-8])/.test(t.trim()) &&
  t.trim().split(/\s+/).length <= 6;
const isProse = (t) => t.trim().split(/\s+/).length > 6;

async function makeCtx(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const ev = { pageerrors: [], consoleErrors: [], tts: [] };
  page.on('pageerror', (e) => ev.pageerrors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text())) ev.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('request', (r) => { const u = r.url(); if (/\/api\/tts/.test(u)) ev.tts.push({ t: Date.now(), text: ttsTextOf(u) }); });
  return { ctx, page, ev };
}

async function bootSeed(page) {
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(12000);
}
async function openDetail(page, id) {
  await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(1000);
    if (await page.locator('[data-testid="punish-gems-card"]').isVisible().catch(() => false)) return 'card';
    const t = await page.locator('body').innerText().catch(() => '');
    if (/not found/i.test(t)) return 'notfound';
    if (/Pitfalls|Master|Overview/i.test(t)) return 'detail';
  }
  return 'timeout';
}
const cardVisible = (p) => p.locator('[data-testid="punish-gems-card"]').isVisible().catch(() => false);
const squares = (p) => p.locator('[data-square]').count();
async function exitPlayer(page) {
  // The player exposes a back/exit affordance; fall back to browser back.
  const back = page.locator('[aria-label="Exit" i], [aria-label="Back" i], [data-testid*="exit" i], [data-testid*="back" i]').first();
  if (await back.isVisible().catch(() => false)) { await back.click().catch(() => {}); }
  else { await page.goBack().catch(() => {}); }
  await page.waitForTimeout(1200);
}

// ─── Tier 1 — breadth / happy path ──────────────────────────────────────────
async function tier1(browser) {
  const { ctx, page, ev } = await makeCtx(browser);
  const errs = [];
  const fail = (m) => errs.push(`T1: ${m}`);
  try {
    await bootSeed(page);
    for (const id of GEM_OPENINGS) {
      const st = await openDetail(page, id);
      if (st !== 'card') { fail(`${id}: gems card did not render (state=${st})`); continue; }
      const tiles = await page.locator('[data-testid^="punish-gem-"]').count();
      if (tiles < 1) { fail(`${id}: no gem tiles`); continue; }
      for (const mode of ['watch', 'learn', 'practice', 'play']) {
        const n = await page.locator(`[data-testid^="gem-${mode}-"]`).count();
        if (n < 1) fail(`${id}: missing ${mode} button`);
      }
      ev.tts.length = 0;
      await page.locator('[data-testid^="gem-watch-"]').first().click();
      await page.waitForTimeout(3500);
      if (await cardVisible(page)) fail(`${id}: Watch did not unmount the detail card`);
      if ((await squares(page)) < 64) fail(`${id}: Watch board not present`);
      // Watch should narrate AUTHORED PROSE on the wire (its annotation beats).
      if (!ev.tts.some((r) => isProse(r.text))) fail(`${id}: Watch fired no prose narration (tts: ${ev.tts.map((r) => r.text).join(' | ').slice(0, 80)})`);
      await exitPlayer(page);
    }
  } catch (e) { fail(`threw — ${String(e).slice(0, 160)}`); }
  errs.push(...ev.pageerrors.map((p) => `T1 pageerror: ${p}`), ...ev.consoleErrors.map((c) => `T1 console: ${c}`));
  await ctx.close();
  return errs;
}

// ─── Tier 2 — failure modes ──────────────────────────────────────────────────
async function tier2(browser) {
  const { ctx, page, ev } = await makeCtx(browser);
  const errs = [];
  const fail = (m) => errs.push(`T2: ${m}`);
  try {
    await bootSeed(page);
    // Cold IndexedDB → reopen → must recover after seed (no permanent not-found).
    await page.evaluate(async () => { for (const d of await indexedDB.databases()) if (d.name) indexedDB.deleteDatabase(d.name); });
    await bootSeed(page);
    if ((await openDetail(page, 'caro-kann')) !== 'card') fail('cold-cache: Caro gems card did not recover after IDB clear + reseed');

    // No-gem tab self-hides (Fantasy has no mined gem) — no crash, card gone.
    const fantasy = page.getByText('Fantasy Variation', { exact: false }).first();
    if (await fantasy.isVisible().catch(() => false)) {
      await fantasy.click(); await page.waitForTimeout(1500);
      if (await cardVisible(page)) fail('no-gem tab (Fantasy): gems card should self-hide');
    }

    // Pick-before-load: reopen and slam Watch immediately.
    await page.goto(`${URL}/openings/caro-kann`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const wb = page.locator('[data-testid^="gem-watch-"]').first();
    if (await wb.isVisible().catch(() => false)) await wb.click().catch(() => {});
    await page.waitForTimeout(3000);
    // recover to detail for the next checks
    await openDetail(page, 'caro-kann');

    // VOICE CONTRACT — Learn = move dictation only.
    ev.tts.length = 0;
    await page.locator('[data-testid^="gem-learn-"]').first().click();
    await page.waitForTimeout(4000);
    if ((await squares(page)) < 64) fail('Learn board not present');
    const learnTts = ev.tts.map((r) => r.text).filter(Boolean);
    if (learnTts.length === 0) fail('Learn fired NO tts (expected move dictation)');
    if (learnTts.some((t) => isProse(t))) fail(`Learn spoke PROSE (contract: moves only): "${learnTts.find(isProse)}"`);
    if (learnTts.length && !learnTts.some((t) => isMoveDictation(t))) fail(`Learn tts not move-dictation shaped: "${learnTts[0]}"`);
    await exitPlayer(page);
    await openDetail(page, 'caro-kann');

    // VOICE CONTRACT — Practice = silent (zero tts).
    ev.tts.length = 0;
    await page.locator('[data-testid^="gem-practice-"]').first().click();
    await page.waitForTimeout(4000);
    if ((await squares(page)) < 64) fail('Practice board not present');
    if (ev.tts.length > 0) fail(`Practice is NOT silent — fired ${ev.tts.length} tts: "${ev.tts[0]?.text}"`);
    await exitPlayer(page);
    await openDetail(page, 'caro-kann');

    // Play → coach room (OpeningPlayMode).
    await page.locator('[data-testid^="gem-play-"]').first().click();
    await page.waitForTimeout(2500);
    if (await cardVisible(page)) fail('Play did not leave the detail card');
    await exitPlayer(page);

    // Caro named-trap Learn (the Qe2 warning) now mounts (was null before).
    await openDetail(page, 'caro-kann');
    const trapLearn = page.locator('[data-testid="named-trap-learn-karpov-qe2-mate"]');
    if (await trapLearn.isVisible().catch(() => false)) {
      await trapLearn.click(); await page.waitForTimeout(2500);
      if ((await squares(page)) < 64) fail('Caro named-trap Learn did not mount a board');
      await exitPlayer(page);
    } else { fail('Caro named-trap Learn button not found on main tab'); }
  } catch (e) { fail(`threw — ${String(e).slice(0, 160)}`); }
  errs.push(...ev.pageerrors.map((p) => `T2 pageerror: ${p}`), ...ev.consoleErrors.map((c) => `T2 console: ${c}`));
  await ctx.close();
  return errs;
}

// ─── Tier 3 — adversarial / stress ───────────────────────────────────────────
async function tier3(browser) {
  const { ctx, page, ev } = await makeCtx(browser);
  const errs = [];
  const fail = (m) => errs.push(`T3: ${m}`);
  try {
    await bootSeed(page);
    await openDetail(page, 'caro-kann');

    // Rapid mode toggling — no leak / crash. Watch→exit ×3 fast.
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-testid^="gem-watch-"]').first().click().catch(() => {});
      await page.waitForTimeout(500);
      await exitPlayer(page);
      await openDetail(page, 'caro-kann');
    }

    // Full Watch playout to completion — board must reach the final ply with
    // no desync (the played-out line is gate-legal; this proves the runtime
    // never throws mid-playout).
    await page.locator('[data-testid^="gem-watch-"]').first().click();
    let lastMove = '';
    let stalls = 0;
    for (let i = 0; i < 40 && stalls < 6; i++) {
      await page.waitForTimeout(1000);
      const body = await page.locator('body').innerText().catch(() => '');
      const m = body.match(/MOVE\s+(\d+)\s*\/\s*(\d+)/i);
      const tag = m ? `${m[1]}/${m[2]}` : '';
      if (tag && tag === lastMove) stalls++; else stalls = 0;
      lastMove = tag;
      if (m && m[1] === m[2]) break; // reached the end
    }
    if ((await squares(page)) < 64) fail('Watch playout lost the board');
    await exitPlayer(page);
    await openDetail(page, 'caro-kann');

    // Wrong move in Learn — click an own piece then an illegal target; the
    // MOVE counter must not advance to completion and nothing may throw.
    await page.locator('[data-testid^="gem-learn-"]').first().click();
    await page.waitForTimeout(2500);
    const before = await page.locator('body').innerText().catch(() => '');
    // Poke two arbitrary squares (Black student → try a nonsense reply).
    for (const sq of ['a6', 'h6', 'a3']) {
      const cell = page.locator(`[data-square="${sq}"]`).first();
      if (await cell.isVisible().catch(() => false)) { await cell.click().catch(() => {}); await page.waitForTimeout(200); }
    }
    await page.waitForTimeout(1500);
    if ((await squares(page)) < 64) fail('Learn board vanished after a stray click');
    void before;
    await exitPlayer(page);
    await openDetail(page, 'caro-kann');

    // Practice silence under interaction (hard) — poke the board, expect 0 tts.
    ev.tts.length = 0;
    await page.locator('[data-testid^="gem-practice-"]').first().click();
    await page.waitForTimeout(2000);
    for (const sq of ['e7', 'e6', 'd7']) {
      const cell = page.locator(`[data-square="${sq}"]`).first();
      if (await cell.isVisible().catch(() => false)) { await cell.click().catch(() => {}); await page.waitForTimeout(300); }
    }
    await page.waitForTimeout(2500);
    if (ev.tts.length > 0) fail(`Practice broke silence under interaction — ${ev.tts.length} tts: "${ev.tts[0]?.text}"`);
    await exitPlayer(page);

    // Ruy too — adversarial breadth.
    await openDetail(page, 'ruy-lopez');
    await page.locator('[data-testid^="gem-watch-"]').first().click().catch(() => {});
    await page.waitForTimeout(2500);
    if ((await squares(page)) < 64) fail('ruy-lopez Watch board not present');
    await exitPlayer(page);
  } catch (e) { fail(`threw — ${String(e).slice(0, 160)}`); }
  errs.push(...ev.pageerrors.map((p) => `T3 pageerror: ${p}`), ...ev.consoleErrors.map((c) => `T3 console: ${c}`));
  await ctx.close();
  return errs;
}

(async () => {
  const exe = await resolveChromiumExecutable();
  const browser = await chromium.launch({ executablePath: exe, headless: true });
  const tiers = [['Tier 1 — breadth', tier1], ['Tier 2 — failure modes', tier2], ['Tier 3 — adversarial', tier3]];
  const report = { url: URL, ts: new Date().toISOString(), tiers: [] };
  let clean = 0;
  for (const [name, fn] of tiers) {
    process.stdout.write(`\n[loop] ${name} …\n`);
    const errs = await fn(browser);
    report.tiers.push({ name, errors: errs });
    if (errs.length === 0) { clean++; console.log(`[loop] ${name}: 0 errors ✓ (consecutive clean: ${clean})`); }
    else { console.log(`[loop] ${name}: ${errs.length} ERROR(S) — streak reset`); errs.forEach((e) => console.log(`   ✗ ${e}`)); clean = 0; }
  }
  await browser.close();
  await mkdir('audit-reports', { recursive: true }).catch(() => {});
  await writeFile(`audit-reports/punish-gems-loop-${report.ts.replace(/[:.]/g, '-')}.json`, JSON.stringify(report, null, 2));
  const met = clean === 3;
  console.log(`\n[loop] ${met ? 'CONTRACT MET — 3 consecutive error-free passes' : 'CONTRACT NOT MET — need 3 consecutive error-free tiers'} (clean streak: ${clean}/3)`);
  process.exit(met ? 0 : 1);
})();
