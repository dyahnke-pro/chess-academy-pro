#!/usr/bin/env node
/**
 * Post-deploy audit — opening PITFALLS surface (common-mistakes).
 * For each opening whose pitfalls I authored this session, drive the LIVE prod
 * /openings/<id> page and verify:
 *   - the page mounts (opening loaded)
 *   - CommonMistakesSection renders (not the empty state) with >=1 pitfall card
 *   - the specific authored pitfall's narration text is present (board-true copy)
 *   - no console errors / page errors
 * Exit 0 = all green; exit 2 = any failure.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *      node scripts/audit-pitfalls-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const SANDBOX = process.env.AUDIT_SANDBOX === '1';

// opening id -> a unique narration snippet from the pitfall(s) I authored
const TARGETS = [
  ['two-knights-defence', 'g5-knight guards f7'],   // 4...Nxe4 pitfall (B)
  ['ruy-lopez', "Noah's Ark Trap"],
  ['birds-opening', "From's Gambit"],
  ['caro-kann', 'smothered mate'],
  ['petrov-defence', 'discovered check'],
  ['philidor-defence', 'keep e5 defended'],
  ['queens-gambit', 'Elephant Trap'],
  ['sicilian-alapin', 'stranded on a5'],
  ['alekhine-defence', 'Chase Variation'],
  ['qga', 'hangs the knight'],
  ['vienna-game', 'won the knight on c3'],
  ['trompowsky-attack', 'drops a pawn and the initiative'],
];

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: SANDBOX ? sandboxLaunchArgs() : [] });
const ctx = await browser.newContext(SANDBOX ? sandboxContextOptions() : {});

async function dismissOverlays(page) {
  // strength-calibration bubble (fresh context)
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.count()) {
      await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => {});
      await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  } catch { /* none */ }
  // page-help modal
  try {
    const modal = page.locator('[data-testid="page-help-modal"]');
    if (await modal.count()) {
      await page.keyboard.press('Escape').catch(() => {});
      await modal.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
    }
  } catch { /* none */ }
}

const results = [];
for (const [id, snippet] of TARGETS) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 120)));
  const r = { id, mounted: false, section: false, cards: 0, snippet: false, errs: 0, note: '' };
  try {
    await page.goto(`${BASE}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissOverlays(page);
    // wait for opening to load (deferred seed can take a while on cold context)
    await page.waitForSelector('[data-testid="common-mistakes-section"], [data-testid="common-mistakes-empty"]', { timeout: 75000 });
    await dismissOverlays(page);
    r.mounted = true;
    r.section = (await page.locator('[data-testid="common-mistakes-section"]').count()) > 0;
    r.cards = await page.locator('[data-testid^="mistake-"]').filter({ hasNot: page.locator('[data-testid^="mistake-toggle-"]') }).count()
              || await page.locator('[data-testid^="mistake-"]').count();
    // expand all pitfall cards so the explanation text renders
    const toggles = page.locator('[data-testid^="mistake-toggle-"]');
    const n = await toggles.count();
    for (let i = 0; i < n; i++) { await toggles.nth(i).click({ timeout: 3000 }).catch(() => {}); }
    const txt = await page.locator('body').innerText();
    r.snippet = txt.includes(snippet);
    r.errs = errs.length;
    if (!r.section) r.note = 'no common-mistakes-section (empty state?)';
    else if (!r.snippet) r.note = `snippet "${snippet}" not found`;
  } catch (e) {
    r.note = 'EXC ' + String(e).slice(0, 90);
  }
  results.push(r);
  const ok = r.mounted && r.section && r.snippet && r.errs === 0;
  console.log(`${ok ? '✓' : '✗'} ${id.padEnd(22)} mounted=${r.mounted} section=${r.section} cards=${r.cards} snippet=${r.snippet} consoleErrs=${r.errs} ${r.note}`);
  await page.close();
}
await browser.close();
const pass = results.filter((r) => r.mounted && r.section && r.snippet && r.errs === 0).length;
console.log(`\n=== PITFALLS POST-DEPLOY AUDIT: ${pass}/${results.length} green (base ${BASE}) ===`);
process.exit(pass === results.length ? 0 : 2);
