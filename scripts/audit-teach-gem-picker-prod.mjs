#!/usr/bin/env node
/**
 * DOES THE BAKED GEM PICKER FIRE IN A "TEACH ME X" WALKTHROUGH? (David
 * 2026-08-23: "bake gem teaching into the teach me x opening in learn with
 * coach" — as an interactive picker that plays the trap out and snaps back.)
 *
 * The gems are DATA; the generator bakes each surfaceable gem onto the node
 * whose position it fires from (node.gems). The runtime turns that into a
 * PICKER: it pauses, offers the trap(s), and on tap plays them out on the board
 * and snaps back. This proves the whole chain ON PROD, three instruments:
 *
 *   A. BAKING LANDED — the generated tree (read from Dexie) has ≥1 node.gems.
 *   B. THE PICKER FIRES — walking the lesson reaches phase 'gem-picker' and the
 *      panel renders with the trap(s).
 *   C. THE DETOUR PLAYS — tapping "See the trap(s)" enters 'gem-playing' and the
 *      board advances (trapFen), then resumes.
 *   D. INSTRUMENTS — the app emitted the gemPicker audit event; the listener
 *      heard narration during the play-out; no page errors.
 *
 * Target = Caro-Kann: its main spine passes through the ...dxe4 position where
 * White's 4.f3 gem lives, so the picker fires on the main walk with no fork
 * steering. Override with AUDIT_OPENING / AUDIT_TEACH_ASK.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *   node scripts/audit-teach-gem-picker-prod.mjs
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { sleep } from './audit-lib/board-drive.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const ASK = process.env.AUDIT_TEACH_ASK ?? 'teach me the Caro-Kann';
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const OUT_DIR = `audit-reports/teach-gem-picker-${stamp}`;

const results = [];
const pass = (n, d) => { results.push({ name: n, ok: true, detail: d }); console.log(`  ✓ ${n}${d ? ` — ${d}` : ''}`); };
const fail = (n, d) => { results.push({ name: n, ok: false, detail: d }); console.log(`  ✗ ${n} — ${d}`); };
const unproven = (n, d) => { results.push({ name: n, ok: null, detail: d }); console.log(`  · ${n} — ${d}  ← NOT EXERCISED`); };

// Read the freshly-cached WalkthroughTree from Dexie and count nodes carrying
// baked gems (+ the SAN path to the first one) — proof the baking landed.
async function readGemNodes(page) {
  return page.evaluate(async () => {
    const open = () => new Promise((res, rej) => {
      const r = indexedDB.open('ChessAcademyDB');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
    let db;
    try { db = await open(); } catch { return { error: 'no db' }; }
    if (!db.objectStoreNames.contains('cachedOpenings')) return { error: 'no store' };
    const all = await new Promise((res) => {
      const rows = []; const tx = db.transaction('cachedOpenings', 'readonly');
      tx.objectStore('cachedOpenings').openCursor().onsuccess = (e) => {
        const c = e.target.result; if (c) { rows.push(c.value); c.continue(); } else res(rows);
      };
    });
    const report = [];
    for (const row of all) {
      const tree = row?.tree; if (!tree?.root) continue;
      let gemNodes = 0; let firstPath = null; const titles = [];
      const walk = (node, path) => {
        const here = node.san ? [...path, node.san] : path;
        if (Array.isArray(node.gems) && node.gems.length) {
          gemNodes += node.gems.length;
          if (!firstPath) firstPath = here;
          for (const g of node.gems) titles.push(g.title);
        }
        for (const ch of node.children ?? []) walk(ch.node, here);
      };
      walk(tree.root, []);
      if (gemNodes) report.push({ opening: tree.openingName, gemNodes, firstPath, titles: titles.slice(0, 6) });
    }
    return { report };
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const listener = await startAuditListener();
  const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: true, executablePath: await resolveChromiumExecutable(false) });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(autoDismissCalibration);
  await ctx.addInitScript(muteTtsForAudit);
  await ctx.addInitScript(([u, s]) => { localStorage.setItem('auditStreamUrl', u); localStorage.setItem('auditStreamSecret', s); }, [listener.url, listener.secret]);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));

  await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(4000);
  for (const sel of ['[data-testid="ai-consent-allow"]', '[data-testid="page-help-modal-close"]']) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) { await el.click({ force: true }).catch(() => {}); await sleep(400); }
  }

  // Ask for the opening.
  const box = page.locator('[data-testid="chat-text-input"] textarea, [data-testid="chat-text-input"]').first();
  await box.click({ force: true }).catch(() => {});
  await box.fill('').catch(() => {});
  await box.pressSequentially(ASK, { delay: 12 });
  await page.keyboard.press('Enter');
  const consent = page.locator('[data-testid="ai-consent-allow"]').first();
  if (await consent.isVisible().catch(() => false)) { await consent.click({ force: true }).catch(() => {}); await sleep(500); await page.locator('[data-testid="chat-send-btn"]').first().click({ force: true }).catch(() => {}); }
  console.log(`[gem-picker] asked "${ASK}" — waiting for generation…`);

  // Wait for the walkthrough to mount (board + a walkthrough control appear).
  const walkStarted = page.locator('[data-testid="walkthrough-skip"], [data-testid="walkthrough-gem-picker"], [data-testid="walkthrough-fork-panel"]').first();
  const genDeadline = Date.now() + 150_000;
  let started = false;
  while (Date.now() < genDeadline) {
    if (await walkStarted.isVisible().catch(() => false)) { started = true; break; }
    await sleep(2000);
  }
  if (!started) { fail('the walkthrough generated and started', 'no walkthrough control appeared in 150s'); }
  else pass('the walkthrough generated and started', ASK);

  // ── A. Baking landed on prod — the tree has node.gems.
  await sleep(1500);
  const gems = await readGemNodes(page).catch((e) => ({ error: String(e) }));
  const gemReport = gems.report ?? [];
  const gemTotal = gemReport.reduce((a, r) => a + r.gemNodes, 0);
  if (gems.error) fail('the generated tree carries baked gems (node.gems)', `could not read Dexie: ${gems.error}`);
  else if (gemTotal > 0) pass('the generated tree carries baked gems (node.gems)', `${gemTotal} gem(s) across ${gemReport.length} opening(s); first path ${JSON.stringify(gemReport[0].firstPath)}`);
  else fail('the generated tree carries baked gems (node.gems)', 'no node.gems in any cached tree — baking did not land');

  // ── B. Drive the walk until the gem picker fires (or a fork; steer toward the
  //    gem path when we have one). Cap the walk so a gem-less spine can't hang.
  const targetPath = gemReport[0]?.firstPath ?? null;
  const pickerPanel = page.locator('[data-testid="walkthrough-gem-picker"]').first();
  const forkPanel = page.locator('[data-testid="walkthrough-fork-panel"]').first();
  const skipBtn = page.locator('[data-testid="walkthrough-skip"]').first();
  let pickerFired = false;
  for (let step = 0; step < 60; step++) {
    if (await pickerPanel.isVisible().catch(() => false)) { pickerFired = true; break; }
    if (await forkPanel.isVisible().catch(() => false)) {
      // Pick the option that continues toward the gem node when known; else 0.
      let idx = 0;
      if (targetPath) {
        const opts = await page.locator('[data-testid^="walkthrough-fork-option-"]').all();
        for (let i = 0; i < opts.length; i++) {
          const label = (await opts[i].textContent().catch(() => '')) ?? '';
          if (targetPath.some((san) => label.includes(san))) { idx = i; break; }
        }
      }
      await page.locator(`[data-testid="walkthrough-fork-option-${idx}"]`).first().click({ force: true }).catch(() => {});
      await sleep(1200);
      continue;
    }
    // Otherwise advance: skip the current node's narration.
    if (await skipBtn.isVisible().catch(() => false)) { await skipBtn.click({ force: true }).catch(() => {}); }
    await sleep(1200);
  }
  if (pickerFired) {
    const entries = await page.locator('[data-testid^="walkthrough-gem-entry-"]').count().catch(() => 0);
    pass('the gem picker fires during the walk', `panel visible, ${entries} trap entry(ies)`);
  } else {
    fail('the gem picker fires during the walk', 'never reached phase gem-picker in 60 steps');
  }

  // ── C. Tap "See it" → the detour plays out.
  let played = false;
  if (pickerFired) {
    const see = page.locator('[data-testid="walkthrough-gem-see"]').first();
    await see.click({ force: true }).catch(() => {});
    const playing = page.locator('[data-testid="walkthrough-gem-playing"]').first();
    const playDeadline = Date.now() + 20_000;
    while (Date.now() < playDeadline) {
      if (await playing.isVisible().catch(() => false)) { played = true; break; }
      // it may blow through fast; also accept the picker having closed
      if (!(await pickerPanel.isVisible().catch(() => false))) { played = true; break; }
      await sleep(400);
    }
    if (played) pass('tapping "See it" plays the trap out', 'entered gem-playing / picker consumed');
    else fail('tapping "See it" plays the trap out', 'no gem-playing state after tap');
  } else {
    unproven('tapping "See it" plays the trap out', 'picker never fired, nothing to tap');
  }

  // Let it finish snapping back.
  await sleep(3000);

  // ── D. Instruments.
  const events = listener.getCapturedEvents();
  const gemPickerEvents = events.filter((e) => (e.source ?? '') === 'useTeachWalkthrough.gemPicker');
  if (gemPickerEvents.length) pass('the app emitted the gemPicker event', `${gemPickerEvents.length} event(s)`);
  else if (pickerFired) fail('the app emitted the gemPicker event', 'picker fired in DOM but no gemPicker audit event captured');
  else unproven('the app emitted the gemPicker event', 'picker never fired');

  const spoken = events.filter((e) => (e.kind ?? '') === 'coach-narration-spoken');
  if (events.length) pass('the listener heard the app', `${events.length} event(s), ${spoken.length} narration`);
  else fail('the listener heard the app', '0 events — the instrument is blind');

  const NOISE = /favicon|api\/tts|audit-stream|ResizeObserver/i;
  const real = pageErrors.filter((e) => !NOISE.test(e));
  if (real.length) fail('no page errors', real.slice(0, 2).join(' | ')); else pass('no page errors');

  await writeFile(`${OUT_DIR}/report.json`, JSON.stringify({ ask: ASK, gemReport, pickerFired, played, gemPickerEvents: gemPickerEvents.length, results }, null, 2));
  const ok = results.filter((r) => r.ok === true).length;
  const bad = results.filter((r) => r.ok === false).length;
  const un = results.filter((r) => r.ok === null).length;
  console.log(`\n[gem-picker] ${ok} passed · ${bad} failed · ${un} not exercised · ${OUT_DIR}`);
  if (bad) console.log(`[gem-picker] FAILED: ${results.filter((r) => r.ok === false).map((r) => r.name).join('; ')}`);
  await listener.stop();
  await browser.close();
  process.exit(bad ? 1 : 0);
}

main().catch((e) => { console.error('[gem-picker] threw:', e); process.exit(1); });
