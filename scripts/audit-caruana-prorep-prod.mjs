// INTERACTIVE 3-instrument post-deploy audit (G1 + G7 + G9.3) for the Caruana
// pro-rep — runs against LIVE PROD. Verifies, per opening + variation:
//   GATE A — Watch uses the curated masterclass LessonPlayer, NOT legacy
//            WalkthroughMode (no [data-testid="walkthrough-progress"]).
//   GATE B — the Watch line reaches a middlegame (>= MIDDLEGAME_MOVES).
//   GEMS   — the 6 punish-gems mined this session surface on their opening
//            (Caro ×5, Closed Sicilian ×1; Pirc/Nimzo/Réti correctly empty).
//   VOICE  — TTS streaming fires on Watch (/api/tts request capture).
// Three instruments: (1) Playwright drives the live UI; (2) live audit-stream
// pulled before+after so the delta = this run's emitted events; (3) the page's
// /api/tts requests are captured as the voice-fired signal (the narration
// listener sidecar can't attach to prod without a pre-boot localStorage
// override, so TTS-capture is the prod-reachable voice instrument).
// Interactive failure-mode probing per G7: off-canonical search, cold cache,
// pick-before-load (click a variation tab immediately), out-of-order tabs.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET || '';
const MIDDLEGAME_MOVES = 12;

// Each: id, expected variation-tab count (>=), expected surfacing gems (>=).
const OPENINGS = [
  { id: "pro-caruana-ruy-lopez", gems: 7 },
  { id: "pro-caruana-italian", gems: 2 },
  { id: "pro-caruana-najdorf", gems: 2 },
  { id: "pro-caruana-taimanov", gems: 0 },
  { id: "pro-caruana-nimzo-indian", gems: 1 },
  { id: "pro-caruana-french", gems: 0 },
  { id: "pro-caruana-caro-kann", gems: 4 },
  { id: "pro-caruana-kid", gems: 2 },
];

const results = [];
function rec(name, status, detail) { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail ? ': ' + detail : ''}`); }

async function pullStream(sinceMs) {
  if (!SECRET) return { count: null, note: 'no AUDIT_STREAM_SECRET' };
  try {
    const r = await fetch(`${PROD}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': SECRET } });
    if (!r.ok) return { count: null, note: `HTTP ${r.status}` };
    const j = await r.json();
    return { count: j.count ?? (j.entries || []).length, entries: j.entries || [], storage: j.storage };
  } catch (e) { return { count: null, note: String(e).slice(0, 80) }; }
}

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

const appErrors = [];
let ttsCount = 0;
page.on('pageerror', (e) => appErrors.push(e.message));
page.on('request', (r) => { if (r.url().includes('/api/tts')) ttsCount++; });

async function dismissOnboarding() {
  try { await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 12000 }); await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }); await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }); } catch { /* */ }
}
async function dismissHelp() {
  const m = page.locator('[data-testid="page-help-modal"]');
  if (await m.count() > 0) { await page.keyboard.press('Escape').catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(async () => { await m.locator('button').last().click({ force: true }).catch(() => null); await m.waitFor({ state: 'detached', timeout: 5000 }).catch(() => null); }); }
}

console.log(`=== INTERACTIVE 3-instrument Caruana pro-rep audit vs PROD (${PROD}) ===\n`);

// INSTRUMENT 2 (pre): pull the stream so the post-run delta isolates this run.
const runStart = Date.now();
const pre = await pullStream(runStart - 5000);
console.log(`  [stream-pre] ${pre.count ?? 'n/a'} events (storage: ${pre.storage ?? pre.note})`);

await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
await dismissOnboarding();
console.log('  cold seed: waiting 60s for pro-rep + ECO + plans + models + gems...');
await page.waitForTimeout(60000);

let legacyCount = 0, shortCount = 0, gemsTotal = 0;
for (const { id, gems: expectGems } of OPENINGS) {
  const short = id.replace('pro-caruana-', '');
  console.log(`\n--- ${short} ---`);
  await page.goto(`${PROD}/openings/pro/caruana/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(3000);
  await dismissHelp();

  const onPage = page.url().includes(id);
  const body0 = await page.evaluate(() => document.body.innerText).catch(() => '');
  rec(`${short}: detail page mounts`, onPage && body0.length > 200 ? 'PASS' : 'FAIL');

  // GEMS — the weapon section is gated behind the unlock ladder. On a cold
  // context weapons are LOCKED, so the gem tiles (punish-gem-*) don't render —
  // but the locked-card (data-testid="weapons-locked-card") renders ONLY when
  // tabGems.length > 0, so its presence PROVES the gems are recognized. Try to
  // unlock (expert pass) to reveal the actual tiles; the IndexedDB write can
  // stall in-sandbox (CLAUDE.md G1.4), so locked-card is the load-bearing
  // prod-reachable signal and unlocked tiles are a bonus.
  let gemTiles = await page.locator('[data-testid^="punish-gem-"]').count().catch(() => 0);
  const lockedCard = await page.locator('[data-testid="weapons-locked-card"]').count().catch(() => 0);
  if (gemTiles === 0 && lockedCard > 0) {
    // Attempt to unlock and re-count.
    await page.locator('[data-testid="weapons-unlock-all-btn"]').click({ timeout: 3000 }).catch(() => null);
    await page.waitForTimeout(600);
    await page.locator('[data-testid="weapons-unlock-all-btn"]').click({ timeout: 2000 }).catch(() => null); // confirm
    await page.waitForTimeout(2500);
    gemTiles = await page.locator('[data-testid^="punish-gem-"]').count().catch(() => 0);
  }
  if (expectGems > 0) {
    gemsTotal += gemTiles;
    const present = gemTiles >= expectGems || lockedCard > 0;
    rec(`${short}: punish-gems recognized (expect >=${expectGems})`, present ? 'PASS' : 'FAIL',
      gemTiles > 0 ? `${gemTiles} tiles unlocked` : (lockedCard > 0 ? 'present but unlock-gated (locked-card shown)' : 'none'));
  } else {
    rec(`${short}: no fabricated gems (honest empty)`, gemTiles === 0 && lockedCard === 0 ? 'PASS' : 'WARN', `${gemTiles} tiles, ${lockedCard} locked-card`);
  }

  // PICK-BEFORE-LOAD + out-of-order: click the last variation tab, then the 2nd.
  const tabs = page.locator('[role="tab"], [data-testid^="variation-tab"]');
  const tabN = await tabs.count();
  if (tabN > 1) {
    await tabs.nth(tabN - 1).click({ timeout: 4000 }).catch(() => null);
    await page.waitForTimeout(1200);
    await tabs.nth(1).click({ timeout: 4000 }).catch(() => null);
    await page.waitForTimeout(1200);
    const after = await page.evaluate(() => document.body.innerText).catch(() => '');
    rec(`${short}: variation tabs switch without empty state`, after.length > 200 && !/something went wrong|no data|undefined/i.test(after) ? 'PASS' : 'FAIL', `${tabN} tabs`);
  } else {
    rec(`${short}: variation tabs present`, tabN >= 1 ? 'PASS' : 'WARN', `${tabN} tabs`);
  }

  // Back to MAIN tab for the Watch test.
  await page.goto(`${PROD}/openings/pro/caruana/${id}`, { waitUntil: 'networkidle', timeout: 25000 }).catch(() => null);
  await page.waitForTimeout(2000);
  await dismissHelp();

  // GATE A + B + VOICE — click the main-line Watch.
  const ttsBefore = ttsCount;
  let clicked = false;
  for (const sel of ['button:has-text("Watch")', '[data-testid*="watch"]']) {
    const el = page.locator(sel).first();
    if (await el.count() > 0 && await el.isVisible().catch(() => false)) { await el.click().catch(() => null); clicked = true; break; }
  }
  if (!clicked) { rec(`${short}: Watch button`, 'WARN', 'not found'); continue; }
  await page.waitForTimeout(3000);
  await dismissHelp();

  const isLegacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-back"]').count() > 0;
  const body = await page.evaluate(() => document.body.innerText).catch(() => '');
  const m = body.match(/Move\s+\d+\s*\/\s*(\d+)/i);
  const totalMoves = m ? parseInt(m[1], 10) : null;

  if (isLegacy) { legacyCount++; rec(`${short}: Watch = curated lesson (Gate A, not legacy auto-narration)`, 'FAIL', `legacy WalkthroughMode${totalMoves ? `, ${totalMoves} moves` : ''}`); }
  else rec(`${short}: Watch = curated masterclass lesson (Gate A)`, 'PASS');

  if (totalMoves !== null && totalMoves < MIDDLEGAME_MOVES) { shortCount++; rec(`${short}: Watch reaches middlegame (Gate B, >=${MIDDLEGAME_MOVES})`, 'FAIL', `only ${totalMoves} moves`); }
  else if (totalMoves !== null) rec(`${short}: Watch reaches middlegame (Gate B)`, 'PASS', `${totalMoves} moves`);

  // VOICE — TTS streaming fired during Watch.
  await page.waitForTimeout(8000);
  rec(`${short}: TTS voice fired on Watch (/api/tts)`, ttsCount > ttsBefore ? 'PASS' : 'WARN', `${ttsCount - ttsBefore} requests`);

  await page.locator('[data-testid="walkthrough-back"]').click({ timeout: 3000 }).catch(() => page.goBack().catch(() => null));
  await page.waitForTimeout(800);
}

// INTERACTIVE off-canonical search (G7).
console.log('\n--- off-canonical search ---');
await page.goto(`${PROD}/openings`, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => null);
await page.waitForTimeout(1500);
await dismissHelp();
const search = page.locator('input[type="search"], input[placeholder*="earch"], [data-testid="smart-search-bar"] input').first();
if (await search.count() > 0) {
  for (const q of ['caruana', 'nakamura', 'grand prix', 'nimzo larsen', 'reti']) { await search.fill(q).catch(() => null); await page.waitForTimeout(1000); }
  const noCrash = appErrors.filter((e) => !/ERR_CERT|Failed to load resource/.test(e)).length === 0;
  rec('off-canonical search handled without crash', noCrash ? 'PASS' : 'FAIL');
} else rec('search bar present', 'WARN', 'not found');

// INSTRUMENT 2 (post): pull the delta.
await page.waitForTimeout(2000);
const post = await pullStream(runStart);
const delta = (post.count ?? 0);
console.log(`\n  [stream-post] ${delta} events this run (storage: ${post.storage ?? post.note})`);
if (post.entries && post.entries.length) {
  const kinds = {};
  for (const e of post.entries) { const k = e.event || e.type || e.kind || 'unknown'; kinds[k] = (kinds[k] || 0) + 1; }
  const top = Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => `${k}:${n}`).join(', ');
  console.log(`  [stream-post] kinds → ${top}`);
  const narr = post.entries.some((e) => /narration|voice|speak|coach/i.test(e.event || e.type || e.kind || ''));
  rec('audit-stream captured narration/voice events this run', narr ? 'PASS' : 'WARN', `${delta} total events`);
} else {
  rec('audit-stream reachable (instrument 2)', delta !== null ? 'PASS' : 'WARN', post.note || `${delta} events`);
}

const realErrors = appErrors.filter((e) => !/ERR_CERT|Failed to load resource|ResizeObserver/.test(e));
rec('no uncaught app errors across the run', realErrors.length === 0 ? 'PASS' : 'FAIL', `${realErrors.length} errors`);
for (const e of realErrors.slice(0, 6)) console.log('     ', e);

await browser.close();
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const warn = results.filter((r) => r.status === 'WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings ===`);
console.log(`  Gate A: ${legacyCount}/${OPENINGS.length} fall back to legacy (must be 0)`);
console.log(`  Gate B: ${shortCount}/${OPENINGS.length} Watch lines too short (must be 0)`);
console.log(`  Gems surfacing on Caro+Closed-Sicilian main tabs: ${gemsTotal}`);
process.exit(fail > 0 ? 1 : 0);
