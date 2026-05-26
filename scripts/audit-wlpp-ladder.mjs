#!/usr/bin/env node
/**
 * WLPP full-ladder audit. Unlocks the Watch/Learn/Practice/Play ladder by
 * seeding the opening record's `linesUnlockedAll` (the "I already know this"
 * master key — isLineUnlockedAll opens every rung + weapons) via a RAW
 * indexedDB put, which works on the openings store in-sandbox (the UI-driven
 * markRungComplete write is what stalls; a raw tx from page.evaluate lands —
 * proven by audit-money-loop's favourite write). Then drives every rung and
 * verifies the voice contract:
 *   Watch    = authored prose narration fires (/api/tts).
 *   Learn    = narration fires (cue or full) — NOT silent.
 *   Practice = SILENT (no /api/tts beyond the warmup '.' probe).
 *   Play     = mounts the IN-PAGE opening-play-mode (locked to the line),
 *              NOT a handoff to /coach/play.
 *
 * Scope: AUDIT_OPENING=<id> for one; otherwise every masterclass opening
 * from opening-manifests.json.
 *
 * Usage:
 *   AUDIT_SMOKE_URL=http://localhost:5173 \
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *   node scripts/audit-wlpp-ladder.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable } from './audit-lib/chromium.mjs';
import { readFile } from 'node:fs/promises';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ONLY = (process.env.AUDIT_OPENING || '').trim();
const MANIFESTS = JSON.parse(await readFile('src/data/opening-manifests.json', 'utf-8'));
const OPENINGS = (ONLY ? [ONLY] : Object.keys(MANIFESTS).filter((k) => !k.startsWith('_')));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ttsTextOf = (u) => { const m = u.match(/[?&]text=([^&]+)/); if (!m) return ''; try { return decodeURIComponent(m[1]); } catch { return m[1]; } };
const isWarmup = (t) => !t || t.trim() === '.' || t.trim() === '';

// Seed linesUnlockedAll = [-1, 0..n] on the opening record (unlock the whole
// ladder for the main line + every variation). Returns the post-write read so
// we can confirm the write actually persisted in this sandbox.
function unlockLadder(page, id, varCount) {
  return page.evaluate(({ id, varCount }) => new Promise((resolve) => {
    const lines = [-1];
    for (let i = 0; i < varCount; i++) lines.push(i);
    const open = indexedDB.open('ChessAcademyDB');
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('openings')) { resolve({ ok: false, reason: 'no openings store' }); return; }
      const tx = db.transaction('openings', 'readwrite');
      const st = tx.objectStore('openings');
      const g = st.get(id);
      g.onsuccess = () => {
        const rec = g.result;
        if (!rec) { resolve({ ok: false, reason: 'no record' }); return; }
        rec.linesUnlockedAll = lines;
        st.put(rec);
      };
      tx.oncomplete = () => {
        // read-back
        const tx2 = db.transaction('openings', 'readonly');
        const g2 = tx2.objectStore('openings').get(id);
        g2.onsuccess = () => resolve({ ok: true, persisted: g2.result?.linesUnlockedAll ?? null });
        g2.onerror = () => resolve({ ok: true, persisted: 'read-back-failed' });
      };
      tx.onerror = () => resolve({ ok: false, reason: 'tx error' });
    };
    open.onerror = () => resolve({ ok: false, reason: 'open error' });
  }), { id, varCount });
}

async function closeHelp(page) {
  const modal = page.locator('[data-testid="page-help-modal"]');
  for (let i = 0; i < 4; i++) {
    if (!(await modal.count().catch(() => 0))) return;
    await page.keyboard.press('Escape').catch(() => {});
    await page.locator('[data-testid="page-help-close"]').first().click({ timeout: 1500 }).catch(() => {});
    if (await modal.first().waitFor({ state: 'detached', timeout: 2000 }).then(() => true).catch(() => false)) return;
    await page.locator('[data-testid="page-help-close"]').first().click({ force: true, timeout: 1500 }).catch(() => {});
    await sleep(300);
  }
}

// Drive one rung button, return what mounted + the narration that fired.
// mountTestids: any-of (Learn/Practice can mount the curated PlayableLinePlayer
// `line-player-memory` OR the DrillMode fallback `drill-mode`).
async function driveRung(page, id, btnTestid, mountTestids, tts) {
  const sel = mountTestids.map((t) => `[data-testid="${t}"]`).join(', ');
  let mounted = false;
  // Up to 2 attempts: a click can be swallowed mid-render; re-navigate fresh
  // and retry rather than reporting a false "did not mount".
  for (let attempt = 0; attempt < 2 && !mounted; attempt++) {
    if (attempt > 0) await gotoDetail(page, id);
    tts.length = 0;
    await closeHelp(page);
    await page.locator(`[data-testid="${btnTestid}"]`).click({ timeout: 8000 }).catch(async () => {
      await closeHelp(page);
      await page.locator(`[data-testid="${btnTestid}"]`).click({ force: true, timeout: 4000 }).catch(() => {});
    });
    mounted = await page.locator(sel).first().waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
  }
  // poll up to 12s for the first real narration line
  for (let w = 0; w < 12000 && !tts.some((t) => !isWarmup(t)); w += 600) await sleep(600);
  const prose = [...new Set(tts.filter((t) => !isWarmup(t)))];
  return { mounted, prose };
}

// Re-navigate fresh to the detail view. Reload-on-blank: a full goto on a
// reused page can intermittently serve a blank shell under the Vite dev server
// (HMR artifact; not a prod bug).
async function gotoDetail(page, id) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto(`${URL}/openings/${id}`, { waitUntil: 'domcontentloaded' });
    if (await page.locator('[data-testid="opening-detail"]').waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false)) {
      await closeHelp(page);
      return true;
    }
    await page.waitForTimeout(1000);
  }
  return false;
}

// Open the detail page in a freshly-UNLOCKED state. The unlock seed survives a
// plain reload but gets wiped by driving a prior rung (the dataLoader reconcile
// + the rung's own progress write rewrite the record), so re-seed and reload
// before EVERY rung rather than once up front. Returns the post-reload
// ladder-enabled snapshot.
async function openUnlocked(page, id, varCount) {
  await gotoDetail(page, id);
  await unlockLadder(page, id, varCount);
  await gotoDetail(page, id); // reload so the UI re-reads the unlocked record
  return page.evaluate(() => {
    const st = (t) => { const e = document.querySelector(`[data-testid="${t}"]`); return e ? !(e.disabled || e.getAttribute('aria-disabled') === 'true' || e.getAttribute('data-locked') === 'true') : null; };
    return { watch: st('walkthrough-btn'), learn: st('learn-btn'), practice: st('practice-btn'), play: st('play-btn') };
  });
}

async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const tts = [];
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));
  page.on('request', (r) => { if (/\/api\/tts/.test(r.url())) tts.push(ttsTextOf(r.url())); });

  // boot + seed openings store
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await sleep(3000);

  // Pre-mark every PageHelp surface as "seen" in Dexie meta so the coach-mark
  // modal never auto-opens and intercepts a rung click (it re-opens on each
  // fresh page visit until seen — fighting it per-click races; seeding the
  // flag removes it entirely). Keys: pagehelp-seen-<helpId>.
  await page.evaluate(() => new Promise((res) => {
    const ids = ['opening-detail', 'openings', 'dashboard', 'weaknesses', 'weakness-themes',
      'tactics', 'tactics-setup', 'tactics-profile', 'tactics-mistakes', 'games-import'];
    const o = indexedDB.open('ChessAcademyDB');
    o.onsuccess = () => {
      const db = o.result;
      if (!db.objectStoreNames.contains('meta')) { res(false); return; }
      const tx = db.transaction('meta', 'readwrite');
      const st = tx.objectStore('meta');
      for (const id of ids) st.put({ key: `pagehelp-seen-${id}`, value: '1' });
      tx.oncomplete = () => res(true);
      tx.onerror = () => res(false);
    };
    o.onerror = () => res(false);
  }));

  await page.goto(`${URL}/openings`, { waitUntil: 'networkidle' });
  await sleep(1500);

  const summary = [];
  for (const id of OPENINGS) {
    const row = { id, unlock: null, rungsEnabled: null, watch: null, learn: null, practice: null, play: null, notes: [] };
    try {
      const mounted = await gotoDetail(page, id);
      if (!mounted) { row.notes.push('opening-detail did not mount'); summary.push(row); console.log(`[wlpp] ${id}: detail did not mount`); continue; }
      const varCount = await page.locator('[data-testid^="variation-tab-"]:not([data-testid="variation-tab-main"])').count().catch(() => 0);

      // Each rung re-seeds the unlock + reloads (driving a rung wipes the seed),
      // so every rung starts from a verified-unlocked ladder.
      // WATCH — expect prose (mounts lesson-player)
      let en = await openUnlocked(page, id, varCount);
      row.unlock = en;
      const w = await driveRung(page, id, 'walkthrough-btn', ['lesson-player'], tts);
      row.watch = { mounted: w.mounted, proseLines: w.prose.length, sample: (w.prose[0] || '').slice(0, 80) };

      // LEARN — expect narration (cue/full), NOT silent
      en = await openUnlocked(page, id, varCount);
      const learnUnlocked = en.learn;
      const l = await driveRung(page, id, 'learn-btn', ['line-player-memory', 'drill-mode'], tts);
      row.learn = { unlocked: learnUnlocked, mounted: l.mounted, proseLines: l.prose.length, sample: (l.prose[0] || '').slice(0, 80) };

      // PRACTICE — expect SILENT
      en = await openUnlocked(page, id, varCount);
      const practiceUnlocked = en.practice;
      const pr = await driveRung(page, id, 'practice-btn', ['practice-mode', 'line-player-memory', 'drill-mode'], tts);
      row.practice = { unlocked: practiceUnlocked, mounted: pr.mounted, proseLines: pr.prose.length, silent: pr.prose.length === 0 };

      // PLAY — expect in-page opening-play-mode, NOT /coach/play
      en = await openUnlocked(page, id, varCount);
      const playUnlocked = en.play;
      tts.length = 0;
      await closeHelp(page);
      await page.locator('[data-testid="play-btn"]').click({ timeout: 8000 }).catch(() => {});
      const playMount = await page.locator('[data-testid="opening-play-mode"]').waitFor({ state: 'visible', timeout: 12000 }).then(() => true).catch(() => false);
      row.play = { unlocked: playUnlocked, inPageMount: playMount, url: page.url(), handedOffToCoachPlay: page.url().includes('/coach/play') };

      const ok = learnUnlocked && practiceUnlocked && playUnlocked && w.mounted && l.mounted && l.prose.length > 0 && pr.mounted && pr.prose.length === 0 && playMount && !row.play.handedOffToCoachPlay;
      console.log(`[wlpp] ${id}: unlock(L/P/Play)=${learnUnlocked}/${practiceUnlocked}/${playUnlocked} ` +
        `W=${w.mounted}(${w.prose.length}) L=${l.mounted}(${l.prose.length}) P=${pr.mounted}(silent:${pr.prose.length === 0}) Play=${playMount}(inPage,noHandoff:${!row.play.handedOffToCoachPlay}) => ${ok ? 'PASS' : 'CHECK'}`);
      row.verdict = ok ? 'PASS' : 'CHECK';
    } catch (e) {
      row.notes.push('ERROR: ' + String(e).slice(0, 120));
      console.log(`[wlpp] ${id}: ERROR ${String(e).slice(0, 120)}`);
    }
    summary.push(row);
  }

  console.log(`\n[wlpp] pageErrors=${pageErrors.length}`);
  const pass = summary.filter((r) => r.verdict === 'PASS').length;
  console.log(`[wlpp] DONE — ${pass}/${summary.length} openings full-ladder PASS`);
  await browser.close();
  // emit JSON for parsing
  console.log('WLPP_JSON_START' + JSON.stringify(summary) + 'WLPP_JSON_END');
}
main();
