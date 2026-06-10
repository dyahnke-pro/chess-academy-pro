#!/usr/bin/env node
/**
 * Post-deploy audit — opening PITFALLS surface (common-mistakes + the
 * hand-authored disaster-walkthrough `punishmentLine`s).
 *
 * PHASE A (render, all targets): drive the LIVE prod /openings/<id> page and
 * verify, per opening:
 *   - the page mounts (opening loaded)
 *   - CommonMistakesSection renders (not the empty state) with >=1 pitfall card
 *   - the authored pitfall's narration text is present (board-true on-card copy)
 *   - no console errors / page errors
 *
 * PHASE B (interactive WATCH, the disaster subset): for each opening that got a
 * hand-authored `punishmentLine` this session, expand the matching pitfall card,
 * click its WATCH button, and verify the disaster walkthrough actually mounts
 * (`line-player-demo`) showing the authored title — proving the "I set them up,
 * you knock them down" walkthrough plays end-to-end, not just that data exists.
 *   (G7: this is the INTERACTIVE probe, not a happy-path render-only pass.)
 *
 * Exit 0 = all green; exit 2 = any failure.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
 *      node scripts/audit-pitfalls-prod.mjs
 *   AUDIT_ONLY=italian-game,pro-hikaru-caro-kann  # optional id filter
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const SANDBOX = process.env.AUDIT_SANDBOX === '1';
const ONLY = (process.env.AUDIT_ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean);

// ── PHASE A render targets ──────────────────────────────────────────────────
// [openingId, on-card narration snippet (board-true copy that renders)]
const RENDER = [
  // original session-1 pitfalls
  ['two-knights-defence', 'g5-knight guards f7'],
  ['ruy-lopez', "Noah's Ark Trap"],
  ['birds-opening', "From's Gambit"],
  ['caro-kann', 'smothered mate'],
  ['petrov-defence', 'discovered check'],
  ['philidor-defence', 'keep e5 defended'],
  ['queens-gambit', 'Elephant Trap'],
  ['sicilian-alapin', 'stranded on a5'],
  ['alekhine-defence', 'Chase Variation'],
  ['qga', 'hangs the knight'],
  ['vienna-game', 'blocks the check but forgets'],
  ['trompowsky-attack', 'drops a pawn and the initiative'],
  // session-2 disaster walkthroughs — masterclass / gambits
  ['italian-game', 'Bxf7+ wins a pawn but after Kxf7'],
  ['kings-indian-defence', 'Playing e5 immediately runs into d5'],
  ['english-opening', 'Grabbing the pawn with Nxe5'],
  ['catalan-opening', 'Qxc4 loses the queen to ...bxc4'],
  ['four-knights-game', 'Nxe5 is the Halloween Gambit'],
  ['evans-gambit', 'Grabbing the pawn back with Nxe5'],
  ['sicilian-sveshnikov', 'avoiding the mainline Ndb5'],
  ['benko-gambit', 'loses the central knight for a pawn'],
  ['budapest-gambit', 'trades the central knight too e'],
  ['scotch-gambit', 'Kicking the e4-knight with f3'],
  ['vienna-gambit', 'bishop on c5 eyeing f2'],
  ['smith-morra-gambit', 'Grabbing the b5-pawn with Bxb5'],
  ['marshall-attack', 'Marshall attacker is hunting the wh'],
  // session-2 disaster walkthroughs — pro-rep (every player represented)
  ['pro-naroditsky-caro-kann', 'Reflex says Nf6'],
  ['pro-naroditsky-najdorf', 'After Be3 in the Classical'],
  ['pro-gothamchess-italian', 'In the Evans Gambit after'],
  ['pro-gothamchess-closed-sicilian', 'signature anti-Sicilian is the early'],
  ['pro-hikaru-caro-kann', 'oldest trap in the book'],
  ['pro-hikaru-nimzo-larsen', 'Grabbing the e5-pawn with Bxe5'],
  ['pro-samayraina-kings-gambit', 'Against the Qh4+ check in the Bishop'],
  ['pro-caruana-ruy-lopez', 'it is tempting to grab the paw'],
  ['pro-caruana-italian', 'Greek-gift sacrifice Bxf7+ looks tem'],
  ['pro-carlsen-sicilian', 'Against the Bg5 Najdorf'],
  ['pro-carlsen-kid', 'Indian, never gr'],
  ['pro-aman-anti-caro', 'flashy Qxf7+ is a blunder'],
  ['pro-carlsen-kings-gambit', 'Against the Falkbeer Counter-Gambit'],
];

// ── PHASE B interactive WATCH targets ───────────────────────────────────────
// [openingId, wrongMove (matches the card's strikethrough SAN), authored title,
//  optional annotation snippet to confirm by stepping the demo forward]
const WATCH = [
  ['italian-game', 'Bxf7+', 'Why the Bxf7+ sac just loses a piece'],
  ['catalan-opening', 'Qxc4', 'Why Qxc4 loses the queen'],
  ['scotch-gambit', 'f3', 'Why f3 cracks your own king'],
  ['vienna-gambit', 'd3', 'Why d3 drops the exchange'],
  ['marshall-attack', 'Qxh2+', 'Why ...Qxh2+ throws the queen away'],
  ['pro-hikaru-caro-kann', 'Ngf6', 'Why ...Ngf6 walks into mate'],
  ['pro-naroditsky-najdorf', 'Ng4', 'Why ...Ng4 just drops a piece'],
  ['pro-aman-anti-caro', 'Qxf7+', 'Why Qxf7+ throws the queen away'],
  ['pro-carlsen-kings-gambit', 'fxe5', 'Why fxe5 invites the queen check'],
  ['pro-caruana-ruy-lopez', 'Bxb5', 'Why Bxb5 drops the bishop'],
  // board-true material-claim fixes (2026-06-10) — confirm the corrected
  // annotation text renders live when the demo steps to it.
  ['pro-gothamchess-scandinavian', 'Nxd5', 'Why ...Nxd5 drops a piece', 'a knight for two pawns'],
  ['smith-morra-gambit', 'Bxb5', 'Why Bxb5 loses a piece', 'down a bishop for two pawns'],
];

const exe = await resolveChromiumExecutable();
// Recycle the browser every RECYCLE pages — a long-lived context accumulates
// per-page state and the sandbox headless_shell OOM-crashes around ~20 pages.
const RECYCLE = 8;
let browser = null;
let ctx = null;
let pageCount = 0;
async function freshPage() {
  if (!browser || pageCount % RECYCLE === 0) {
    if (browser) await browser.close().catch(() => {});
    browser = await chromium.launch({ executablePath: exe, headless: true, args: SANDBOX ? sandboxLaunchArgs() : [] });
    ctx = await browser.newContext(SANDBOX ? sandboxContextOptions() : {});
  }
  pageCount++;
  return ctx.newPage();
}

async function dismissOverlays(page) {
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    if (await bubble.count()) {
      await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => {});
      await bubble.waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
    }
  } catch { /* none */ }
  try {
    const modal = page.locator('[data-testid="page-help-modal"]');
    if (await modal.count()) {
      await page.keyboard.press('Escape').catch(() => {});
      await modal.waitFor({ state: 'detached', timeout: 6000 }).catch(() => {});
    }
  } catch { /* none */ }
}

async function loadOpening(page, id) {
  await page.goto(`${BASE}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissOverlays(page);
  await page.waitForSelector('[data-testid="common-mistakes-section"], [data-testid="common-mistakes-empty"]', { timeout: 120000 });
  await dismissOverlays(page);
}

// ── PHASE A ──────────────────────────────────────────────────────────────────
const renderResults = [];
for (const [id, snippet] of RENDER) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  const page = await freshPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 120)));
  const r = { id, mounted: false, section: false, cards: 0, snippet: false, errs: 0, note: '' };
  try {
    await loadOpening(page, id);
    r.mounted = true;
    r.section = (await page.locator('[data-testid="common-mistakes-section"]').count()) > 0;
    r.cards = await page.locator('[data-testid^="mistake-"]').filter({ hasNot: page.locator('[data-testid^="mistake-toggle-"]') }).count()
              || await page.locator('[data-testid^="mistake-"]').count();
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
  renderResults.push(r);
  const ok = r.mounted && r.section && r.snippet && r.errs === 0;
  console.log(`A ${ok ? '✓' : '✗'} ${id.padEnd(32)} mounted=${r.mounted} section=${r.section} cards=${r.cards} snippet=${r.snippet} errs=${r.errs} ${r.note}`);
  await page.close();
}

// ── PHASE B ──────────────────────────────────────────────────────────────────
const watchResults = [];
for (const [id, wrongMove, title, annSnippet] of WATCH) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  const page = await freshPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', (e) => errs.push('PAGEERROR ' + String(e).slice(0, 120)));
  const r = { id, wrongMove, demo: false, titleSeen: false, annSeen: !annSnippet, errs: 0, note: '' };
  try {
    await loadOpening(page, id);
    // find the card index whose strikethrough SAN == wrongMove
    const toggles = page.locator('[data-testid^="mistake-toggle-"]');
    const n = await toggles.count();
    let idx = -1;
    for (let i = 0; i < n; i++) {
      const t = (await toggles.nth(i).innerText()).replace(/\s+/g, ' ');
      // strikethrough wrongMove appears before the → arrow
      if (t.split('→')[0].includes(wrongMove)) { idx = i; break; }
    }
    if (idx < 0) { r.note = `no card for wrongMove ${wrongMove}`; }
    else {
      await toggles.nth(idx).click({ timeout: 4000 }).catch(() => {});
      const watchBtn = page.locator(`[data-testid="pitfall-watch-${idx}"]`);
      await watchBtn.waitFor({ state: 'visible', timeout: 8000 });
      await watchBtn.click({ timeout: 4000 });
      await page.waitForSelector('[data-testid="line-player-demo"]', { timeout: 15000 });
      r.demo = true;
      let txt = await page.locator('body').innerText();
      r.titleSeen = txt.includes(title);
      if (!r.titleSeen) r.note = `title "${title}" not shown`;
      // step the demo forward to surface the corrected annotation text
      if (annSnippet) {
        for (let step = 0; step < 8 && !r.annSeen; step++) {
          txt = await page.locator('body').innerText();
          if (txt.includes(annSnippet)) { r.annSeen = true; break; }
          await page.locator('[data-testid="lesson-next"]').click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
        if (!r.annSeen) r.note += ` | annotation "${annSnippet}" not shown`;
      }
    }
    r.errs = errs.length;
  } catch (e) {
    r.note = 'EXC ' + String(e).slice(0, 90);
  }
  watchResults.push(r);
  const ok = r.demo && r.titleSeen && r.annSeen && r.errs === 0;
  console.log(`B ${ok ? '✓' : '✗'} ${id.padEnd(28)} ${wrongMove.padEnd(7)} demo=${r.demo} title=${r.titleSeen} ann=${r.annSeen} errs=${r.errs} ${r.note}`);
  await page.close();
}

if (browser) await browser.close().catch(() => {});
const aPass = renderResults.filter((r) => r.mounted && r.section && r.snippet && r.errs === 0).length;
const bPass = watchResults.filter((r) => r.demo && r.titleSeen && r.annSeen && r.errs === 0).length;
console.log(`\n=== PITFALLS POST-DEPLOY AUDIT ===`);
console.log(`  PHASE A (render):        ${aPass}/${renderResults.length} green`);
console.log(`  PHASE B (watch interact): ${bPass}/${watchResults.length} green`);
console.log(`  base: ${BASE}`);
const allGreen = aPass === renderResults.length && bPass === watchResults.length;
process.exit(allGreen ? 0 : 2);
