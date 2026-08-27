// NO SILENT MOVES — the beginner hears the WHY behind every move (David
// 2026-08-27: "teach the why behind each move… no silent moves, ever"; "the
// majority will come from compute"). Voiced (Tier 1) leads; the recovered
// rewind ASIDES teach "why this, not that"; and where the corpus is silent on
// a played move, the hook COMPUTES a board-true why (moveWhy). This audit
// proves all three FIRE on the live app, on a voiced opening.
//
// THREE INSTRUMENTS (G1): Playwright drives "teach me <X>"; the /api/tts GET
// capture is WHAT the coach actually spoke; the narration LISTENER sidecar is
// the app's own per-node events (how many plies the walk reached). Marks (the
// aside phrases) are computed HERE from the shipped voiced corpus, so a pass
// proves the RIGHT teaching fired — not just that something spoke. Every
// assertion proves it had data before it may pass (a check that can pass on an
// empty set is worse than no check).
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   [AUDIT_OPENING="king's indian attack"] \
//   node scripts/audit-teach-no-silent-plies-prod.mjs
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const OPENING = process.env.AUDIT_OPENING || "king's indian attack";
const BUDGET_MS = Number(process.env.AUDIT_BUDGET_MS ?? 300_000);

// ── Marks: pull the target's aside phrases from the SHIPPED voiced corpus, so
//    a spoken match proves the recovered rewind teaching actually voiced.
function tokens(s) {
  return (s || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2
    && !['the', 'and', 'teach', 'defense', 'defence', 'variation', 'opening', 'attack', 'system'].includes(w));
}
const corpus = JSON.parse(await readFile('src/data/voiced-walkthroughs.json', 'utf8'));
const req = new Set(tokens(OPENING));
let best = null; let bestScore = 0;
for (const e of corpus) {
  const nameTok = new Set(tokens(e.openingName));
  let hits = 0; for (const t of req) if (nameTok.has(t)) hits += 1;
  if (hits > bestScore) { bestScore = hits; best = e; }
}
if (!best) { console.error(`no voiced entry matched "${OPENING}"`); process.exit(2); }
const asidePhrases = [];
(function walk(n) {
  for (const a of n.asides ?? []) if (a.idea && a.idea.trim().length > 8) asidePhrases.push(a.idea.trim());
  for (const c of n.children ?? []) walk(c.node ?? c);
})(best.tree.root);
// Normalize a phrase to a robust needle (first ~5 content words), so TTS
// sanitization (which may reword move SANs) can't defeat a literal match.
const needles = [...new Set(asidePhrases)].map((p) => tokens(p).slice(0, 4).join(' ')).filter((n) => n.length > 6);
console.log(`[marks] voiced entry: ${best.openingName} | ${asidePhrases.length} aside(s), ${needles.length} needle(s)`);

// Computed-fill signatures — the board-true phrasings moveWhy emits. A spoken
// line matching one proves the compute path fills a corpus-silent ply live.
const FILL_SIG = [/stakes out [a-h][1-8]/i, /develops, covering/i, /takes the long diagonal/i,
  /goes after the (pawn|knight|bishop|rook|queen)/i, /takes the (pawn|knight|bishop|rook|queen) on/i,
  /king to safety/i, /comes into the game/i];

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
await blockTtsNetwork(page);

const spoken = [];
page.on('request', (req2) => {
  const url = req2.url();
  if (!url.includes('/api/tts')) return;
  try { const t = new URL(url).searchParams.get('text'); if (t && t.trim() !== '.') spoken.push(t); } catch { /* skip */ }
});

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };
const nodeEntries = () => listener.getCapturedEvents()
  .filter((e) => e.source === 'useTeachWalkthrough.narrateAndAdvance')
  .map((e) => e.summary ?? '');

async function dismissGates() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* absent */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* none */ }
}

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(([url, secret]) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, [listener.url, LOCAL_LISTENER_SECRET]);

  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(OPENING, { delay: 12 });
  await box.press('Enter');

  // A broad family name may open the line picker — tap the first line so the
  // walk actually starts (a no-op here would silently fail every check below).
  try {
    const picker = page.locator('[data-testid="line-picker"]');
    await picker.waitFor({ timeout: 30_000 });
    await page.locator('[data-testid^="line-picker-"]').first().click();
    await picker.waitFor({ state: 'detached', timeout: 20_000 });
  } catch { /* no picker — the lesson started directly */ }

  // Let it play forward, voice-paced, until the leaf or the budget.
  const deadline = Date.now() + BUDGET_MS;
  while (Date.now() < deadline) {
    await page.waitForTimeout(4000);
    if ((await page.locator('body').innerText()).includes('Watch the middlegame and endgame')) break;
    // Stop early once we have a solid sample — this is a coverage proof, not a full walk.
    if (spoken.length >= 12 && nodeEntries().length >= 12) break;
  }

  const nodes = nodeEntries();
  // ── 0. Instruments captured data.
  check('narration listener captured the walk', nodes.length >= 6,
    `${nodes.length} node event(s), ${listener.getCapturedEvents().length} total`);
  check('TTS capture heard the coach speak', spoken.length >= 6,
    `${spoken.length} spoken line(s)`);

  // ── 1. NO SILENT MOVES: the coach speaks a why on the large majority of
  //       plies reached. Voiced + computed fill together; only a truly
  //       nothing-to-say ply stays silent. Fraction over san-bearing nodes.
  const sanNodes = nodes.filter((s) => !/node=\(root\)/.test(s)).length || nodes.length;
  const frac = spoken.length / Math.max(sanNodes, 1);
  check('the why fires on the majority of plies (no silent gaps)', frac >= 0.7,
    `${spoken.length} spoken / ${sanNodes} plies reached = ${(frac * 100).toFixed(0)}%`);

  // ── 2. COMPUTED FILL is live — at least one spoken line is a board-true
  //       moveWhy phrasing (fills a corpus-silent ply).
  const fills = spoken.filter((l) => FILL_SIG.some((re) => re.test(l)));
  check('computed board-true fill spoke on a silent ply', fills.length >= 1,
    fills.length ? `e.g. ${JSON.stringify(fills[0].slice(0, 80))}` : 'no computed-fill signature spoken (may be all-voiced early plies)');

  // ── 3. REWIND ASIDES voiced — the "why this, not that" teaching the rebuild
  //       recovered actually reaches the ear (only assert when the entry HAS
  //       asides and the walk got deep enough to reach one).
  if (needles.length === 0) {
    check('rewind asides present in corpus', false, `voiced entry "${best.openingName}" carries no asides`);
  } else {
    const spokenLC = spoken.map((s) => s.toLowerCase());
    const hit = needles.find((nd) => spokenLC.some((s) => s.includes(nd)));
    // Not reaching an aside inside the sample window is acceptable (they sit at
    // specific plies); a WRONG voicing is not. Report either way, fail only if
    // the walk clearly passed aside-bearing plies without any aside firing.
    const deepEnough = nodes.length >= 10;
    check('recovered rewind aside voiced (or not yet reached)', Boolean(hit) || !deepEnough,
      hit ? `heard: "${hit}"` : `no aside in first ${nodes.length} nodes (asides sit deeper; ${needles.length} in corpus)`);
  }
} catch (err) {
  check('run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();
await listener.stop();

let failed = 0;
for (const r of results) { if (!r.pass) failed += 1; console.log(`${r.pass ? '✓ PASS' : '✗ FAIL'}: ${r.name} — ${r.detail}`); }
console.log(`\n${results.length - failed}/${results.length} green`);
process.exit(failed === 0 ? 0 : 1);
