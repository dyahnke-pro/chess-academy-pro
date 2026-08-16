// Post-deploy audit for the 2026-08-02 lesson-drift fixes (David's Vienna
// Copycat session). Three contracts, driven the way he drove it:
//
//   1. ON TOPIC — the opening plies must not be narrated with another
//      opening's teaching. His run opened with a Caro-Kann game recounted over
//      1.e4 ("White played the greedy Qd4… in the Caro-Kann, ...Nc6").
//   2. NO REPEATS — no node narrated twice and no line spoken twice while the
//      lesson plays forward untouched.
//   3. BOARD HOLDS — tapping "Watch the middlegame and endgame" must leave the
//      board where the lesson ended, never snap back to move one.
//
// THREE INSTRUMENTS (G1). Playwright drives; the narration LISTENER sidecar
// captures what the app actually spoke; the app's own audit events come back
// through that same sidecar. The first version of this script sniffed POST
// bodies for both and captured NOTHING — /api/tts is a GET with the text in the
// query string — so all three of its checks passed on empty sets. A check that
// cannot fail is worse than no check: it reports coverage it does not have.
// Every assertion below therefore proves it had data before it may pass.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const LESSON = process.env.AUDIT_LESSON || 'Vienna Game';
const VARIATION = process.env.AUDIT_VARIATION || 'Copycat';
// Families the lesson must never start teaching instead. Families, not
// sub-lines — a Vienna lesson mentioning "the Italian bishop" is fine.
const OFF_TOPIC = [/caro-?kann/i, /najdorf/i, /french defen[cs]e/i, /gr[uü]nfeld/i, /stonewall/i, /king'?s indian/i];
const LESSON_BUDGET_MS = Number(process.env.AUDIT_LESSON_BUDGET_MS ?? 600_000);

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
  await blockTtsNetwork(page);   // instrument keeps the request; the provider never sees it

/** What the app actually SPOKE. /api/tts is a GET; the text is in the query. */
const spoken = [];
page.on('request', (req) => {
  const url = req.url();
  if (!url.includes('/api/tts')) return;
  try {
    const text = new URL(url).searchParams.get('text');
    if (text && text.trim() !== '.') spoken.push(text); // '.' is the warmup probe
  } catch { /* a malformed URL must not fail the run */ }
});

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };
const narrationEntries = () => listener.getCapturedEvents()
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
    } catch { /* gate absent on this context */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* no help modal */ }
}

try {
  // Point the app's audit stream at the sidecar BEFORE anything mounts, so the
  // walkthrough's own events are captured from the first ply.
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
  await box.pressSequentially(LESSON, { delay: 12 });
  await box.press('Enter');

  // A broad family name opens the LINE PICKER — a real user taps a line, and an
  // audit that doesn't is stuck on the picker while every later step silently
  // no-ops (the false-coverage failure mode this repo has hit before).
  try {
    const picker = page.locator('[data-testid="line-picker"]');
    await picker.waitFor({ timeout: 60_000 });
    const tile = page.locator(`[data-testid^="line-picker-"][data-fullname*="${VARIATION}"]`).first();
    await tile.waitFor({ timeout: 10_000 });
    // The tile must name its move — the picker contract shipped with this fix.
    const tileText = await tile.innerText();
    check('picker tile names the line\'s key move', /\d+\.(\.\.)?[A-Za-z]/.test(tileText),
      `tile text: ${JSON.stringify(tileText.replace(/\s+/g, ' ').slice(0, 80))}`);
    await tile.click();
    await picker.waitFor({ state: 'detached', timeout: 20_000 });
  } catch (err) {
    check('line picker reached and a variation picked', false, String(err).slice(0, 140));
  }

  // Let the lesson play forward on its own — no skipping, so any repeat is the
  // walkthrough's doing and not a tap of mine. Voice-gated narration is slow;
  // that IS the user's experience.
  const deadline = Date.now() + LESSON_BUDGET_MS;
  let sawLeaf = false;
  while (Date.now() < deadline) {
    await page.waitForTimeout(4000);
    if ((await page.locator('body').innerText()).includes('Watch the middlegame and endgame')) { sawLeaf = true; break; }
  }

  const paths = narrationEntries().map((s) => /path=\[([^\]]*)\]/.exec(s)?.[1] ?? s);

  // ── 0. The instruments actually captured something. Without this the three
  //       checks below can pass on empty sets, which is how the first version
  //       of this script reported 3/4 green while testing nothing.
  check('narration listener captured the lesson', paths.length >= 4,
    `${paths.length} narrated node(s), ${listener.getCapturedEvents().length} audit event(s) total`);
  check('TTS capture saw the coach speak', spoken.length >= 4,
    `${spoken.length} spoken line(s)`);

  // ── 1. ON TOPIC across the opening plies.
  const drift = spoken.filter((line) => OFF_TOPIC.some((re) => re.test(line)));
  check('lesson never teaches another opening', drift.length === 0,
    drift.length ? `off-topic: ${drift.map((d) => JSON.stringify(d.slice(0, 90))).join(' | ')}` : `${spoken.length} line(s) checked, none off-topic`);

  // ── 1b. and never reads its own prompt aloud.
  const directive = spoken.filter((l) => /GROUNDED FACTS|voice ONLY these|GEM ALERT \(/i.test(l));
  check('coach never speaks its own directives', directive.length === 0,
    directive.length ? JSON.stringify(directive[0].slice(0, 90)) : 'no directive text spoken');

  // ── 2. NO REPEATS while it plays forward untouched.
  const repeatedNodes = paths.filter((p, i) => paths.indexOf(p) !== i);
  check('no walkthrough node narrated twice', repeatedNodes.length === 0,
    repeatedNodes.length ? `repeated: ${[...new Set(repeatedNodes)].slice(0, 4).join(' / ')}` : `${paths.length} node(s), all distinct`);

  const repeatedLines = spoken.filter((s, i) => s.trim().length > 40 && spoken.indexOf(s) !== i);
  check('no spoken line repeated', repeatedLines.length === 0,
    repeatedLines.length ? `repeated: ${JSON.stringify(repeatedLines[0].slice(0, 80))}` : `${spoken.length} line(s), no repeats`);

  // ── 3. BOARD HOLDS through the continuation hand-off.
  if (!sawLeaf) {
    check('board holds after "Watch the middlegame"', false,
      `lesson never reached the leaf prompt in ${Math.round(LESSON_BUDGET_MS / 1000)}s (${paths.length} nodes narrated)`);
  } else {
    const pieces = async () => page.locator('[data-piece]').count();
    const before = await pieces();
    await page.getByText('Watch the middlegame and endgame').first().click();
    await page.waitForTimeout(8000);
    const after = await pieces();
    // 32 pieces is the starting position, and the lesson's leaf is well past it.
    const reset = after === 32 && before < 32;
    check('board holds after "Watch the middlegame"', !reset,
      `pieces before=${before} after=${after}${reset ? ' — snapped back to the start' : ''}`);
    check('walkthrough released the board', await page.locator('[data-testid="walkthrough-narrating-panel"]').count() === 0,
      'the walkthrough panel must be gone once the continuation owns the board');
  }
} catch (err) {
  check('run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();
await listener.stop();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? '✓ PASS' : '✗ FAIL'}: ${r.name} — ${r.detail}`);
}
console.log(`\n${results.length - failed}/${results.length} green`);
process.exit(failed === 0 ? 0 : 1);
