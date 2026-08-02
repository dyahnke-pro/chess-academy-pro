// Post-deploy audit for the 2026-08-02 lesson-drift fixes (David's Vienna
// Copycat session). Three contracts, driven the way he drove it:
//
//   1. ON TOPIC — the FIRST move of the lesson must not be narrated with
//      another opening's teaching. His run opened with a Caro-Kann game
//      recounted over 1.e4 ("White played the greedy Qd4… in the Caro-Kann").
//   2. NO REPEATS — no walkthrough node may be narrated twice, and no spoken
//      line may repeat, while the lesson plays forward untouched.
//   3. BOARD HOLDS — tapping "Watch the middlegame and endgame" must leave the
//      board on the lesson's final position, never snap back to move one.
//
// Instruments (G1): Playwright drives, the page's own audit events are captured
// off the network, and the spoken text is read from what the app hands /api/tts.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const LESSON = process.env.AUDIT_LESSON || 'Teach me the Vienna Game Copycat Variation';
// Openings the lesson must never start teaching instead. Deliberately families,
// not sub-lines — a Vienna lesson mentioning "the Italian bishop" is fine.
const OFF_TOPIC = [/caro-?kann/i, /najdorf/i, /french defen[cs]e/i, /gr[uü]nfeld/i, /slav/i, /stonewall/i];

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();

/** Every narration audit the app emitted, and every line it sent to Polly. */
const narrationEntries = [];
const spoken = [];
page.on('request', (req) => {
  const url = req.url();
  try {
    if (url.includes('/api/audit-stream')) {
      const body = req.postData();
      if (!body) return;
      for (const e of JSON.parse(body).events ?? []) {
        if (e.source === 'useTeachWalkthrough.narrateAndAdvance') narrationEntries.push(e.summary ?? '');
      }
    } else if (url.includes('/api/tts')) {
      const body = req.postData();
      if (body) spoken.push(String(JSON.parse(body).text ?? ''));
    }
  } catch { /* a malformed capture must not fail the run */ }
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
    } catch { /* gate absent on this context */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* no help modal */ }
}

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(LESSON, { delay: 12 });
  await box.press('Enter');

  // Let the lesson resolve and play forward on its own — no skipping, so any
  // repeat is the walkthrough's doing and not a tap of mine.
  const deadline = Date.now() + 240_000;
  let sawLeaf = false;
  while (Date.now() < deadline) {
    await page.waitForTimeout(3000);
    if (await page.locator('[data-testid="walkthrough-narrating-panel"]').count() === 0
        && narrationEntries.length === 0) continue;
    if ((await page.locator('body').innerText()).includes('Watch the middlegame and endgame')) { sawLeaf = true; break; }
  }

  // ── 1. ON TOPIC on the first move.
  // The first spoken lines belong to the opening ply; check every line spoken
  // before the second node was narrated.
  const firstNodeLines = spoken.slice(0, Math.max(1, spoken.findIndex((s) => /mirror|copies/i.test(s)) + 1) || spoken.length);
  const drift = firstNodeLines.filter((line) => OFF_TOPIC.some((re) => re.test(line)));
  check('first move stays on the taught opening', drift.length === 0,
    drift.length ? `off-topic line(s): ${drift.map((d) => JSON.stringify(d.slice(0, 90))).join(' | ')}` : `${firstNodeLines.length} opening line(s), none off-topic`);

  // ── 2. NO REPEATS while it plays forward untouched.
  const nodeOf = (summary) => (/path=\[([^\]]*)\]/.exec(summary)?.[1] ?? summary);
  const paths = narrationEntries.map(nodeOf);
  const repeatedNodes = paths.filter((p, i) => paths.indexOf(p) !== i);
  check('no walkthrough node narrated twice', repeatedNodes.length === 0,
    repeatedNodes.length ? `repeated: ${[...new Set(repeatedNodes)].slice(0, 4).join(' / ')}` : `${paths.length} node(s), all distinct`);

  const repeatedLines = spoken.filter((s, i) => s.trim().length > 40 && spoken.indexOf(s) !== i);
  check('no spoken line repeated', repeatedLines.length === 0,
    repeatedLines.length ? `repeated: ${JSON.stringify(repeatedLines[0].slice(0, 80))}` : `${spoken.length} line(s), no repeats`);

  // ── 3. BOARD HOLDS through the continuation hand-off.
  if (!sawLeaf) {
    check('board holds after "Watch the middlegame"', false, 'lesson never reached the leaf prompt in 240s');
  } else {
    const squareCount = async () => page.locator('[data-piece]').count();
    const beforePieces = await squareCount();
    await page.getByText('Watch the middlegame and endgame').first().click();
    await page.waitForTimeout(6000);
    const afterPieces = await squareCount();
    // The starting position is the only 32-piece board a mid-lesson position
    // can snap back to, and the lesson's leaf is well past that.
    const reset = afterPieces === 32 && beforePieces < 32;
    check('board holds after "Watch the middlegame"', !reset,
      `pieces before=${beforePieces} after=${afterPieces}${reset ? ' — board snapped back to the start' : ''}`);
    check('walkthrough released the board', await page.locator('[data-testid="walkthrough-narrating-panel"]').count() === 0,
      'the walkthrough panel must be gone once the continuation owns the board');
  }
} catch (err) {
  check('run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? '✓ PASS' : '✗ FAIL'}: ${r.name} — ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} green`);
process.exit(failed === 0 ? 0 : 1);
