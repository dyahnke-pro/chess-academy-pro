// THE LINE PICKER RANKS BY WHAT PEOPLE AT YOUR LEVEL ACTUALLY PLAY.
//
// David 2026-08-11 handed this one over: "I leave you to build the line/leaf
// picker. Ok for you to take charge on that." The picker used to rank by how
// many DB entries share a sub-name — which measures how finely theory has
// SUBDIVIDED a line, not how often anyone plays it — so a heavily-catalogued
// sideline could sit above a real main line while the top tile silently claimed
// "this is what people play".
//
// 🔒 WHY IT NEEDS ITS OWN AUDIT. The ranking pass only runs when a variation
// PICKER OPENS, and not one existing audit ever opens one: they drive moves and
// check routing. So the picker could be completely inert on prod and every
// suite would stay green — the exact shape of the four dead lanes found this
// week, and of the plan lane that was classified correctly and reached a branch
// it could never enter.
//
// The pass is also deliberately fail-soft: rate-limited, offline, circuit-open
// or an explorer miss all leave the tiles in their original order. That is
// correct behaviour AND it is indistinguishable from "never wired", which is
// precisely why the observation has to be made on the live build rather than
// inferred from a mocked unit test.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `picker-${Date.now().toString(36)}`;

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit); // never spend TTS money to audit (G1)
await ctx.addInitScript((id) => {
  try { localStorage.setItem('auditRunId', id); } catch { /* private mode */ }
}, RUN_ID);
const page = await ctx.newPage();

// Watch the network directly. The tile caption proves the pass produced a
// number; this proves it asked the RIGHT question — an unbanded request would
// sample players up to 2500 for a 1200 student and look identical on screen.
const explorerCalls = [];
page.on('request', (req) => {
  const url = req.url();
  if (url.includes('lichess-explorer')) explorerCalls.push(url);
});

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
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates();
  await dismissGates();

  // A FAMILY, not a line. "Teach me the Sicilian" is exactly the ask that opens
  // the picker: the Sicilian is a dozen different games sharing three moves, so
  // choosing among them is the first real decision.
  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially('Teach me the Sicilian Defense', { delay: 10 });
  await box.press('Enter');

  const tiles = page.locator('[data-testid^="line-picker-"]');
  let opened = false;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1500);
    if ((await tiles.count()) > 1) { opened = true; break; }
  }
  record('the variation picker opens on a family request', opened,
    opened ? `${await tiles.count()} tiles` : 'no picker in 45s');

  if (opened) {
    // The ranking is ASYNC by design — tiles render immediately in taxonomy
    // order and re-rank only when the games answer. So give it room, and read
    // the ORDER before and after to see whether anything actually happened.
    const orderBefore = await tiles.allInnerTexts();
    await page.waitForTimeout(9000);
    const after = await tiles.allInnerTexts();

    const banded = explorerCalls.filter((u) => /ratings=/.test(u));
    record('the picker asked the explorer for a RATING BAND', banded.length > 0,
      banded.length > 0
        ? decodeURIComponent(banded[0]).replace(/^.*?(ratings=[^&]*).*$/, '$1')
        : `${explorerCalls.length} explorer call(s), none banded`);

    // The caption is the visible proof a real number reached the tile. Absent
    // captions are LEGITIMATE — a thin sample gets none on purpose — so this is
    // reported either way rather than failed blind.
    const captioned = after.filter((t) => /% at your level|under 0\.1%/.test(t));
    record('a tile shows real game share at the student\'s level', captioned.length > 0,
      captioned.length > 0
        ? `${captioned.length}/${after.length} tiles captioned`
        : 'no captions — explorer miss, thin sample, or the pass never ran');

    // Tiles must never VANISH or duplicate when the re-rank lands. Losing an
    // option to a background pass would be worse than the ordering it fixes.
    record('re-ranking never loses or duplicates a tile',
      after.length === orderBefore.length && new Set(after).size === new Set(orderBefore).size,
      `${orderBefore.length} before, ${after.length} after`);

    // And the picker still WORKS: a tile has to start its lesson.
    await tiles.first().click();
    await page.waitForTimeout(6000);
    const gone = (await tiles.count()) === 0;
    record('picking a line still starts the lesson', gone,
      gone ? 'picker closed' : 'picker still open after clicking a tile');
  }
} catch (err) {
  record('the run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n[explorer] ${explorerCalls.length} explorer request(s) observed`);
console.log(`\n${passed}/${results.length} checks green`);
process.exit(passed === results.length ? 0 : 1);
