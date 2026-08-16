#!/usr/bin/env node
// Focused regression audit for the Practice-rung scope fix (David 2026-06-22:
// "Practice tab of Vienna goes past what W and L teach"). Watch and Learn run
// the curated LessonScript's deepest beat (the Vienna lesson spine = 23 plies);
// Practice used to mount on the full repertoire opening.pgn (44 plies). This
// drives the LIVE app: unlock the ladder, open the main-line Practice rung, and
// assert the move counter total equals the lesson spine (23), NOT 44.
// Run: AUDIT_SANDBOX=1 [AUDIT_SMOKE_URL=...] node scripts/audit-vienna-practice-scope.mjs
import { chromium } from 'playwright';
import { Chess } from 'chess.js';
import { readFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { seedUnlockedOpenings } from './audit-lib/idb-unlock.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OPENING_ID = 'vienna-game';

// Compute the expected lesson-spine ply count from the source (the deepest beat
// in vienna.ts) so the audit stays honest if the lesson is re-authored. This is
// lessonToPlayableLine's logic: the longest beat `moves` array. Beats reference
// either an inline literal (`moves: [...]`) OR a shared spine const built with
// `const NAME = '<sans>'.split(' ')` and used as `moves: NAME` — resolve both.
const lessonSrc = await readFile('src/data/lessons/vienna.ts', 'utf-8');
const constLens = {};
for (const m of lessonSrc.matchAll(/const\s+(\w+)\s*=\s*'([^']*)'\s*\.split\(/g)) {
  constLens[m[1]] = m[2].trim().split(/\s+/).filter(Boolean).length;
}
let spinePlies = 0;
for (const m of lessonSrc.matchAll(/moves:\s*\[([^\]]*)\]/g)) {
  const n = m[1].split(',').map((s) => s.trim()).filter(Boolean).length;
  if (n > spinePlies) spinePlies = n;
}
for (const m of lessonSrc.matchAll(/moves:\s*(\w+)\s*,/g)) {
  const n = constLens[m[1]] ?? 0;
  if (n > spinePlies) spinePlies = n;
}
const rep = JSON.parse(await readFile('src/data/repertoire.json', 'utf-8'));
const list = Array.isArray(rep) ? rep : (rep.openings ?? []);
const fullPlies = list.find((o) => o.id === OPENING_ID).pgn.trim().split(/\s+/).filter(Boolean).length;
console.log(`expected: lesson spine = ${spinePlies} plies; full repertoire pgn = ${fullPlies} plies`);
new Chess(); // sanity: chess.js present

const results = [];
const rec = (label, pass, note = '') => { results.push({ label, pass, note }); console.log(`  ${pass ? '✓' : '✗'} ${label}${note ? ` — ${note}` : ''}`); };

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)));

async function dismissOverlays() {
  for (let i = 0; i < 6; i++) {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.isVisible().catch(() => false)) {
      await page.locator('[data-testid="skill-band-intermediate"]').click().catch(() => {});
      await bubble.waitFor({ state: 'detached', timeout: 12000 }).catch(() => {});
      await page.waitForTimeout(400);
      continue;
    }
    break;
  }
  for (let i = 0; i < 5 && (await page.locator('[data-testid="page-help-modal"]').isVisible().catch(() => false)); i++) {
    await page.locator('[data-testid="page-help-close"]').click().catch(() => {});
    await page.waitForTimeout(400);
  }
}
async function tap(sel) {
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
  try { await el.click({ timeout: 3000 }); return true; }
  catch { return el.evaluate((n) => n.click()).then(() => true).catch(() => false); }
}

try {
  await page.goto(`${URL}/openings/${OPENING_ID}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await dismissOverlays();
  // Let the deferred seed land so the openings store has the vienna-game record.
  await page.waitForTimeout(8000);
  await dismissOverlays();

  const seed = await seedUnlockedOpenings(page, [OPENING_ID]);
  rec('ladder unlocked (seed openings store)', seed.ok, seed.ok ? `updated ${seed.updated}` : seed.reason);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await dismissOverlays();
  await page.waitForTimeout(3000);

  // Open the main-line Practice rung.
  const tapped = await tap('[data-testid="practice-btn"]');
  rec('tapped Practice button', tapped);
  await page.locator('[data-testid="practice-mode"]').waitFor({ timeout: 15000 });
  rec('practice-mode mounted', true);

  // Read the "Move 0 / N" counter — N is expectedMoves.length (the practiced line).
  const counterText = await page.locator('[data-testid="practice-mode"]').getByText(/Move\s+\d+\s+\/\s+\d+/).first().textContent();
  const total = Number((counterText || '').match(/\/\s*(\d+)/)?.[1] ?? -1);
  console.log(`  practice move counter: "${(counterText || '').trim()}" → total ${total}`);
  rec(`Practice teaches lesson spine (${spinePlies}), not full pgn (${fullPlies})`, total === spinePlies, `total=${total}`);
  rec('Practice line is shorter than the 44-ply repertoire pgn', total < fullPlies, `total=${total}`);
} catch (e) {
  rec('audit ran without throwing', false, String(e).slice(0, 160));
} finally {
  rec('no page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
  await browser.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${failed.length === 0 ? 'ALL GREEN' : `${failed.length} FAILED`} — ${results.length} checks`);
process.exit(failed.length === 0 ? 0 : 1);
