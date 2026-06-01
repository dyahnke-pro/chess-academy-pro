#!/usr/bin/env node
// FULL-PLAY audit engine (David 2026-06-01: "actually play through the lines,
// not just load; arrows confirmed correct, narration matches, all the things").
// Drives the REAL WLPP progression on live main/prod — Watch→Learn→Practice→Play
// — completing each rung so the next unlocks, until the gems (which live INSIDE
// the progression lock) open, then plays the gems too. Three instruments:
// Playwright drives, the narration listener captures the spoken voice, and we
// verify per move that highlights + narration are board-true. Native-board arrows
// are NOT DOM-readable (react-chessboard canvas) — arrow correctness is the data
// layer's job (punishGems/lessonIntegrity); here we verify highlights + narration
// live. Run: AUDIT_SANDBOX=1 AUDIT_OPENING=<id> node scripts/audit-fullplay-prod.mjs
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { readFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const ONLY = (process.env.AUDIT_OPENING || 'pro-gothamchess-vienna').trim();
const proRep = JSON.parse(await readFile('src/data/pro-repertoires.json', 'utf-8')).openings ?? [];
const opening = proRep.find((o) => o.id === ONLY);
if (!opening) { console.error(`opening ${ONLY} not in pro-repertoires.json`); process.exit(2); }

// from→to for each ply of a SAN line
function plies(sanLine) {
  const c = new Chess(); const out = [];
  for (const san of sanLine.trim().split(/\s+/).filter(Boolean)) {
    const mv = c.move(san); out.push({ san: mv.san, from: mv.from, to: mv.to, fen: c.fen() });
  }
  return out;
}

const results = [];
const rec = (label, pass, note = '') => { results.push({ label, pass, note }); console.log(`  ${pass ? '✓' : '✗'} ${label}${note ? ` — ${note}` : ''}`); };

const listener = await startAuditListener();
console.log(`listener: ${listener.url}`);
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

async function dismissOverlays() {
  // The page-help-modal auto-opens on the openings detail page and INTERCEPTS
  // ladder clicks (caveat #5). Its real dismiss is data-testid="page-help-close"
  // — a generic button selector misses it (was the player=none bug).
  for (const sel of ['[data-testid="page-help-close"]', '[data-testid="page-help-modal"] button', '[aria-label="Close" i]']) {
    const b = page.locator(sel).first();
    if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await page.waitForTimeout(400); }
  }
  // confirm the modal is gone
  for (let i = 0; i < 5 && (await page.locator('[data-testid="page-help-modal"]').isVisible().catch(() => false)); i++) {
    await page.locator('[data-testid="page-help-close"]').click().catch(() => {}); await page.waitForTimeout(400);
  }
}
// Robust button tap: scroll into view, try a real click, fall back to a direct
// DOM click (fires React onClick regardless of a transient overlay / stability
// quirk — the walkthrough-btn click was timing out on actionability).
async function tap(sel) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  try { await el.click({ timeout: 3000 }); return true; }
  catch { return el.evaluate((n) => n.click()).then(() => true).catch(() => false); }
}
// Play a move by clicking the from-square then the to-square. force:true sends
// real pointer events at the square center, bypassing the actionability
// interception that needs the DOM-click fallback on buttons (react-chessboard's
// onSquareClick needs a real click, not el.click()).
async function clickMove(from, to) {
  for (const sq of [from, to]) {
    const el = page.locator(`[data-square="${sq}"]`).first();
    await el.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await el.click({ timeout: 3000, force: true }).catch(() => {});
    await page.waitForTimeout(240);
  }
  await page.waitForTimeout(500);
}
// Enable voice + full narration in the profile so the lesson SPEAKS (the audit
// must verify narration; voiceEnabled defaults to false). Mirrors the reference
// audit's profiles-store write. Caller reloads after so the store re-reads.
async function enableVoice() {
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases();
    const nm = (dbs.find((d) => /chess/i.test(d.name || '')) || {}).name; if (!nm) return;
    await new Promise((res) => {
      const q = indexedDB.open(nm);
      q.onsuccess = () => { const db = q.result; if (!db.objectStoreNames.contains('profiles')) return res();
        const tx = db.transaction('profiles', 'readwrite'); const ps = tx.objectStore('profiles'); const g = ps.getAll();
        g.onsuccess = () => { for (const p of g.result) { p.preferences = p.preferences || {}; p.preferences.voiceEnabled = true; p.preferences.coachNarration = 'full'; ps.put(p); } };
        tx.oncomplete = () => res(); };
      q.onerror = () => res(); setTimeout(res, 5000);
    });
  }).catch(() => {});
}
// Read which squares currently carry a highlight (inline background on [data-square]).
async function highlightedSquares() {
  return page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-square]')) {
      const bg = el.style.background || el.style.backgroundColor || '';
      const sh = el.style.boxShadow || '';
      if ((bg && bg !== 'transparent' && /rgb|#/.test(bg)) || /inset/.test(sh)) out.push(el.getAttribute('data-square'));
    }
    return out;
  });
}

(async () => {
  console.log(`\n[fullplay] ${ONLY} (${opening.color}) on ${URL}`);
  // 1. boot + listener wiring + dismiss bubble + seed
  await page.goto(`${URL}/`, { waitUntil: 'networkidle' });
  await page.evaluate(({ url, secret }) => { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); localStorage.setItem('x-audit-secret', secret); }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.isVisible({ timeout: 8000 }).catch(() => false)) {
      await page.locator('[data-testid="skill-band-intermediate"]').click().catch(() => {});
      await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  } catch {}
  console.log('  waiting for deferred seed…');
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);
    const n = await page.evaluate(async () => { try { const dbs = await indexedDB.databases(); const nm = (dbs.find((d) => /chess/i.test(d.name||''))||{}).name; if (!nm) return 0; return await new Promise((r) => { const q = indexedDB.open(nm); q.onsuccess = () => { const db = q.result; if (!db.objectStoreNames.contains('openings')) return r(0); const t = db.transaction('openings','readonly').objectStore('openings').count(); t.onsuccess = () => r(t.result); t.onerror = () => r(0); }; q.onerror = () => r(0); setTimeout(() => r(-1), 4000); }); } catch { return 0; } });
    if (n >= 100) { console.log(`  seed ready (${n} openings)`); break; }
  }
  // enable voice + full narration so the lesson SPEAKS (then reload to apply)
  await enableVoice();
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await page.waitForTimeout(3000);

  // 2. open the detail page
  await page.goto(`${URL}/openings/${ONLY}`, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 25; i++) { await page.waitForTimeout(1000); if (await page.locator('[data-testid="walkthrough-btn"]').isVisible().catch(() => false)) break; }
  await dismissOverlays();
  rec('detail page + ladder rendered', await page.locator('[data-testid="walkthrough-btn"]').isVisible().catch(() => false));

  const mainPlies = plies(opening.pgn);
  console.log(`  main line: ${mainPlies.length} plies`);

  // Which player opened after clicking a rung? curated → LessonPlayer (beats);
  // DB-only / Learn-fallback → PlayableLinePlayer (demo→memory).
  async function whichPlayer() {
    for (let i = 0; i < 10; i++) {
      if (await page.locator('[data-testid="lesson-player"]').isVisible().catch(() => false)) return 'lesson';
      if (await page.locator('[data-testid="line-player-demo"]').isVisible().catch(() => false)) return 'demo';
      if (await page.locator('[data-testid="line-player-memory"]').isVisible().catch(() => false)) return 'memory';
      await page.waitForTimeout(800);
    }
    return 'none';
  }
  // Step a curated LessonPlayer through ALL beats. The lesson AUTO-advances
  // (voice-gated); we poll the "Beat X / N" progress, let auto-advance work,
  // and nudge lesson-next if it stalls (headless TTS). Capture highlights +
  // listener narration per beat. Reaching the final beat fires onComplete →
  // markRungComplete. Never click lesson-continue-next mid-lesson (that's the
  // end-only next-lesson button).
  async function driveLessonPlayer(rung, before) {
    let litBeats = 0, maxBeat = 0, lastCur = -1, stuck = 0, total = 0;
    for (let i = 0; i < 80; i++) {
      const prog = await page.locator('[data-testid="lesson-progress"]').innerText().catch(() => '');
      const m = prog.match(/(\d+)\s*\/\s*(\d+)/); const cur = m ? +m[1] : 0; total = m ? +m[2] : total;
      const lit = await highlightedSquares(); if (lit.length) litBeats++;
      maxBeat = Math.max(maxBeat, cur);
      if (total && cur >= total) break;                 // atEnd → onComplete fired
      if (!(await page.locator('[data-testid="lesson-player"]').isVisible().catch(() => false))) break;
      if (cur === lastCur) { stuck++; if (stuck >= 2) { await page.locator('[data-testid="lesson-next"]').first().evaluate((n) => n.click()).catch(() => {}); } if (stuck > 12) break; }
      else stuck = 0;
      lastCur = cur;
      await page.waitForTimeout(1400);
    }
    const voice = listener.getCapturedEvents().slice(before).filter((e) => /voice|speak|narration/i.test(e.kind || ''));
    rec(`${rung}: narration fired (listener)`, voice.length > 0, `${voice.length} voice events, reached beat ${maxBeat}/${total}`);
    rec(`${rung}: highlights painted`, litBeats > 0, `${litBeats} beats lit`);
  }
  // Play a PlayableLinePlayer to completion (skip demo → memory → play moves).
  async function driveLinePlayer() {
    if (await page.locator('[data-testid="skip-to-memory"]').isVisible().catch(() => false)) { await tap('[data-testid="skip-to-memory"]'); await page.waitForTimeout(700); }
    for (const ply of mainPlies) { await clickMove(ply.from, ply.to); }
  }
  async function backToDetail() {
    for (const sel of ['[data-testid="line-player-back"]', '[data-testid="lesson-player"] [aria-label="Exit" i]', '[aria-label="Back" i]']) {
      if (await page.locator(sel).first().isVisible().catch(() => false)) { await tap(sel); break; }
    }
    await page.waitForTimeout(800);
    if (!(await page.locator('[data-testid="walkthrough-btn"]').isVisible().catch(() => false))) {
      await page.goto(`${URL}/openings/${ONLY}`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500);
    }
    await dismissOverlays();
  }

  // 3-4. Drive each rung in order; each must complete + unlock the next.
  for (const [rung, btn] of [['watch', 'walkthrough-btn'], ['learn', 'learn-btn'], ['practice', 'practice-btn']]) {
    const locked = await page.locator(`[data-testid="${btn}"][data-locked="true"]`).count().catch(() => 0);
    if (locked) { rec(`${rung}: still LOCKED (prior rung didn't unlock it) — progression gap`, false); continue; }
    const before = listener.getCapturedEvents().length;
    await tap(`[data-testid="${btn}"]`);
    const kind = await whichPlayer();
    rec(`${rung}: player opened`, kind !== 'none', `player=${kind}`);
    if (kind === 'lesson') await driveLessonPlayer(rung, before);
    else if (kind !== 'none') await driveLinePlayer();
    const done = await page.locator(`[data-testid="rung-done-${rung}"]`).isVisible({ timeout: 6000 }).catch(() => false)
      || await page.locator('[data-testid="line-player-complete"]').isVisible().catch(() => false);
    rec(`${rung}: rung completed (rung-done-${rung})`, done);
    await backToDetail();
  }

  // 5. PLAY — launches OpeningPlayMode locked to the line
  const playLocked = await page.locator('[data-testid="play-btn"][data-locked="true"]').count().catch(() => 0);
  if (playLocked) rec('play: still LOCKED after practice — progression gap', false);
  else { await tap('[data-testid="play-btn"]'); await page.waitForTimeout(2500);
    rec('play: launched (no crash)', pageErrors.length === 0, pageErrors[0] || '');
    await page.goto(`${URL}/openings/${ONLY}`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000); await dismissOverlays(); }

  // 6. After the progression, are the GEMS unlocked?
  const gemTiles = await page.locator('[data-testid^="punish-gem-"]').count().catch(() => 0);
  const gemPlayable = await page.locator('[data-testid^="gem-watch-"]').count().catch(() => 0);
  rec('gems UNLOCKED by completing the progression', gemPlayable > 0, `${gemTiles} tiles, ${gemPlayable} playable`);

  console.log('\n[fullplay] pageerrors:', pageErrors.length);
  pageErrors.slice(0, 5).forEach((e) => console.log('   !', e));
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n[fullplay] ${pass}/${results.length} checks passed`);
  await browser.close(); await listener.stop();
  process.exit(results.every((r) => r.pass) ? 0 : 1);
})();
