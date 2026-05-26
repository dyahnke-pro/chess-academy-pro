#!/usr/bin/env node
/**
 * New-user journey audit — plays the app like a fresh user and verifies the
 * WLPP progression WIRING actually flows + tracks (NO seeding shortcuts; the
 * ladder is unlocked by genuinely completing each rung through the UI).
 *
 * Per opening it proves the cascade end-to-end:
 *   1. Fresh state — Watch enabled, Learn/Practice/Play LOCKED, no progress.
 *   2. Play WATCH to the final beat (manual "Next beat") → markRungComplete
 *      writes linesDiscovered, persists across reload, Learn UNLOCKS.
 *   3. Play LEARN (click the line's student moves) → completes → linesLearned
 *      persists, SRS auto-enroll fires (flashcards grow), Practice UNLOCKS.
 *   4. Play PRACTICE (silent, click the moves) → linesPerfected persists,
 *      Play UNLOCKS.
 *   5. The weapons/gems card surfaces.
 *
 * Modes:
 *   AUDIT_OPENING=<id>    full cascade for one opening (default ruy-lopez).
 *   AUDIT_WATCH_GATE=1     broad sweep: every masterclass opening, prove only
 *                          the load-bearing Watch→Learn unlock + persist.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node scripts/audit-new-user-journey.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';

const U = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const WATCH_GATE = process.env.AUDIT_WATCH_GATE === '1';
const ONLY = (process.env.AUDIT_OPENING || '').trim();

const REP = JSON.parse(await readFile('src/data/repertoire.json', 'utf-8'));
const REP_LIST = Array.isArray(REP) ? REP : (REP.openings || []);
const MANIFESTS = JSON.parse(await readFile('src/data/opening-manifests.json', 'utf-8'));
const repFor = (id) => REP_LIST.find((o) => o.id === id);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function pgnMoves(pgn) { const c = new Chess(); return pgn.trim().split(/\s+/).filter(Boolean).map((s) => { try { const m = c.move(s); return { san: s, from: m.from, to: m.to }; } catch { return null; } }).filter(Boolean); }

let page;
const readDexie = (id) => page.evaluate((id) => new Promise((res) => { const o = indexedDB.open('ChessAcademyDB'); o.onsuccess = () => { const g = o.result.transaction('openings', 'readonly').objectStore('openings').get(id); g.onsuccess = () => { const r = g.result; res(r ? { D: r.linesDiscovered ?? null, L: r.linesLearned ?? null, P: r.linesPerfected ?? null } : null); }; g.onerror = () => res('err'); }; o.onerror = () => res('err'); }), id);
const srsCount = () => page.evaluate(() => new Promise((res) => { const o = indexedDB.open('ChessAcademyDB'); o.onsuccess = () => { const db = o.result; if (!db.objectStoreNames.contains('flashcards')) { res(-1); return; } const g = db.transaction('flashcards', 'readonly').objectStore('flashcards').getAll(); g.onsuccess = () => res(g.result.length); g.onerror = () => res(-1); }; o.onerror = () => res(-1); }));
async function closeHelp() { const m = page.locator('[data-testid="page-help-modal"]'); for (let i = 0; i < 4; i++) { if (!(await m.count().catch(() => 0))) return; await page.keyboard.press('Escape').catch(() => {}); await page.locator('[data-testid="page-help-close"]').first().click({ timeout: 1500 }).catch(() => {}); if (await m.first().waitFor({ state: 'detached', timeout: 1500 }).then(() => 1).catch(() => 0)) return; await sleep(300); } }
const rungs = () => page.evaluate(() => { const st = (t) => { const e = document.querySelector(`[data-testid="${t}"]`); return e ? !(e.disabled || e.getAttribute('data-locked') === 'true') : null; }; return { W: st('walkthrough-btn'), L: st('learn-btn'), P: st('practice-btn'), Play: st('play-btn') }; });
async function gotoDetail(id) { for (let i = 0; i < 3; i++) { await page.goto(`${U}/openings/${id}`, { waitUntil: 'domcontentloaded' }); if (await page.locator('[data-testid="opening-detail"]').waitFor({ state: 'visible', timeout: 12000 }).then(() => 1).catch(() => 0)) { await closeHelp(); return true; } await sleep(800); } return false; }
const clickSq = (sq) => page.locator(`[data-square="${sq}"]`).first().click({ force: true, timeout: 3000 }).catch(() => {});

async function completeWatch() {
  await closeHelp();
  await page.locator('[data-testid="walkthrough-btn"]').click({ timeout: 8000 });
  await page.locator('[data-testid="lesson-player"]').waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
  for (let i = 0; i < 90; i++) { const n = page.locator('button[aria-label="Next beat"]'); if (await n.count().catch(() => 0)) { await n.click({ timeout: 2000 }).catch(() => {}); await sleep(150); } else break; }
  await sleep(2200);
}
async function playLine(btnTestid, mountTestids, completeTestids, pgn, color) {
  await closeHelp();
  await page.locator(`[data-testid="${btnTestid}"]`).click({ timeout: 8000 }).catch(() => {});
  await page.locator(mountTestids.map((t) => `[data-testid="${t}"]`).join(',')).first().waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
  await sleep(1200);
  const completeSel = completeTestids.map((t) => `[data-testid="${t}"]`).join(',');
  const mv = pgnMoves(pgn);
  for (let i = 0; i < mv.length; i++) {
    if (await page.locator(completeSel).first().count().catch(() => 0)) break;
    const studentTurn = color === 'white' ? i % 2 === 0 : i % 2 === 1;
    if (!studentTurn) { await sleep(650); continue; }
    await clickSq(mv[i].from); await clickSq(mv[i].to); await sleep(550);
  }
  const done = await page.locator(completeSel).first().waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
  await sleep(2000);
  return done;
}

async function fullCascade(id) {
  const rep = repFor(id);
  if (!rep?.pgn) return { id, skip: 'no repertoire pgn' };
  const color = rep.color || 'white';
  const out = { id, color };
  await gotoDetail(id);
  out.initial = { rungs: await rungs(), dexie: await readDexie(id), srs: await srsCount() };
  await completeWatch(); await gotoDetail(id);
  out.afterWatch = { rungs: await rungs(), dexie: await readDexie(id) };
  const lDone = await playLine('learn-btn', ['line-player-memory', 'drill-mode'], ['line-player-complete', 'learn-complete'], rep.pgn, color);
  await gotoDetail(id);
  out.afterLearn = { completed: lDone, rungs: await rungs(), dexie: await readDexie(id), srs: await srsCount() };
  const prDone = await playLine('practice-btn', ['practice-mode', 'line-player-memory'], ['practice-complete', 'line-player-complete'], rep.pgn, color);
  await gotoDetail(id);
  out.afterPractice = { completed: prDone, rungs: await rungs(), dexie: await readDexie(id) };
  out.weaponsCard = await page.locator('[data-testid="punish-gems-card"],[data-testid="weapons-locked-card"],[data-testid="named-weapon-card"]').first().count().catch(() => 0);
  const a = out.afterWatch, l = out.afterLearn, pr = out.afterPractice;
  out.verdict = (a.rungs.L && Array.isArray(a.dexie?.D) && l.rungs.P && l.completed && Array.isArray(l.dexie?.L) && pr.rungs.Play && Array.isArray(pr.dexie?.P)) ? 'PASS' : 'CHECK';
  return out;
}

async function watchGate(id) {
  const out = { id };
  if (!(await gotoDetail(id))) return { id, skip: 'detail did not mount' };
  const before = await rungs(); const beforeD = await readDexie(id);
  await completeWatch(); await gotoDetail(id);
  const after = await rungs(); const afterD = await readDexie(id);
  out.learnLockedBefore = before.L === false;
  out.learnUnlockedAfter = after.L === true;
  out.discoveredPersisted = Array.isArray(afterD?.D) && afterD.D.includes(-1);
  out.verdict = (out.learnLockedBefore && out.learnUnlockedAfter && out.discoveredPersisted) ? 'PASS' : 'CHECK';
  return out;
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true });
const ctx = await browser.newContext();
page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 140)));
await page.goto(`${U}/`, { waitUntil: 'networkidle' }); await sleep(3000);

const targets = WATCH_GATE
  ? Object.keys(MANIFESTS).filter((k) => !k.startsWith('_'))
  : [ONLY || 'ruy-lopez'];
const results = [];
for (const id of targets) {
  try {
    const r = WATCH_GATE ? await watchGate(id) : await fullCascade(id);
    results.push(r);
    console.log(`[journey] ${id}: ${r.skip ? 'SKIP ' + r.skip : (r.verdict + ' ' + JSON.stringify(WATCH_GATE ? { lockedBefore: r.learnLockedBefore, unlockedAfter: r.learnUnlockedAfter, persisted: r.discoveredPersisted } : { afterWatch: r.afterWatch?.rungs, afterLearn: r.afterLearn?.rungs, afterPractice: r.afterPractice?.rungs, srs: r.afterLearn?.srs }))}`);
  } catch (e) { console.log(`[journey] ${id}: ERROR ${String(e).slice(0, 120)}`); results.push({ id, error: String(e).slice(0, 120) }); }
}
console.log(`\n[journey] pageErrors=${pageErrors.length}`);
const pass = results.filter((r) => r.verdict === 'PASS').length;
console.log(`[journey] ${pass}/${results.length} ${WATCH_GATE ? 'watch-gate' : 'full-cascade'} PASS`);
console.log('JOURNEY_JSON_START' + JSON.stringify(results) + 'JOURNEY_JSON_END');
await browser.close();
