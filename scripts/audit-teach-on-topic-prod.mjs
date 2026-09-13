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
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
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
await ctx.addInitScript(muteTtsForAudit);
const page = await ctx.newPage();
// A RELOAD LOOKS EXACTLY LIKE A BOARD BUG (2026-09-13). When a deploy landed
// mid-run the service worker reloaded the page one move into the play-out, and
// the board check below reported "snapped back to the start" — sending a
// session hunting a reset that the continuation never performed. Count main
// frame navigations so the failure can name what actually happened.
let navCount = 0;
page.on('framenavigated', (f) => { if (f === page.mainFrame()) navCount += 1; });

/** What the app actually SPOKE — READ OFF THE APP'S OWN EVENTS, NOT THE WIRE.
 *
 *  🔒 THIS INSTRUMENT USED TO MEASURE ITSELF (2026-09-13). It read the spoken
 *  line out of the `/api/tts` GET while `blockTtsNetwork` fulfilled that route
 *  with a 32-byte silent MPEG frame. That frame is not playable audio, so
 *  voiceService took its self-heal branch ("cached audio playback failed —
 *  refetching"), evicted the clip and asked again — twice, at ~0.1s and again
 *  ~8s later through the deeper fallover. Every line hit the wire two or three
 *  times, and the run reported `no spoken line repeated` FAILED, naming the
 *  lesson intro. There was no such bug: run the same lesson MUTED and the app
 *  emits exactly ONE `voiceService.speakForced` per line. A stale audit that
 *  invents a defect costs more than one that misses it — this one sent a
 *  session hunting a double-intro that the app never spoke.
 *
 *  So: MUTE (no synthesis, no stub, no retry) and read the app's own
 *  `coach-narration-spoken` event, whose `narrationText` carries the FULL line
 *  — the summary field truncates at 40 chars and would silently defeat the
 *  off-topic and directive checks below.
 *
 *  This is what CLAUDE.md §G1 already prefers: "Better still, migrate the
 *  instrument off the wire." */
const spokenLines = () => listener.getCapturedEvents()
  .filter((e) => e.kind === 'coach-narration-spoken' && typeof e.narrationText === 'string')
  .map((e) => e.narrationText.trim())
  .filter((t) => t && t !== '.');

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
  // 🔒 TWO SHAPES OF CHOICE, AND THIS AUDIT USED TO KNOW ONLY ONE (2026-09-12).
  // Waiting solely on [data-testid="line-picker"] made this script report 4/8
  // against a perfectly healthy surface: the Vienna offers its choice as the
  // WALKTHROUGH FORK BAR (walkthrough-fork-option-N — "Knight to f3" / "Knight
  // to c3"), the 60s wait for a picker that never renders timed out, the lesson
  // sat unadvanced at 2 narrated nodes, and every downstream check then failed
  // for that one reason — including "no spoken line repeated", which only saw
  // the intro twice. Driving the fork by hand narrates 13 distinct nodes to
  // depth 14 with voice firing throughout and zero errors. Accept EITHER shape.
  let choiceMade = false;
  try {
    const picker = page.locator('[data-testid="line-picker"]');
    const fork = page.locator('[data-testid^="walkthrough-fork-option-"]');
    await Promise.race([
      picker.waitFor({ timeout: 90_000 }),
      fork.first().waitFor({ timeout: 90_000 }),
    ]);

    if (await picker.count()) {
      const tile = page.locator(`[data-testid^="line-picker-"][data-fullname*="${VARIATION}"]`).first();
      await tile.waitFor({ timeout: 10_000 });
      // The tile must name its move — the picker contract shipped with this fix.
      const tileText = await tile.innerText();
      check('picker tile names the line\'s key move', /\d+\.(\.\.)?[A-Za-z]/.test(tileText),
        `tile text: ${JSON.stringify(tileText.replace(/\s+/g, ' ').slice(0, 80))}`);
      await tile.click();
      await picker.waitFor({ state: 'detached', timeout: 20_000 });
      choiceMade = true;
    } else {
      // The fork bar names each branch by its move, spoken-register.
      const label = (await fork.first().innerText()).replace(/\s+/g, ' ').trim();
      check('fork option names its move', /[a-h][1-8]|knight|bishop|rook|queen|king|pawn/i.test(label),
        `fork label: ${JSON.stringify(label.slice(0, 80))}`);
      await fork.first().click({ force: true });
      choiceMade = true;
    }
  } catch (err) {
    check('a line choice was offered and taken', false, String(err).slice(0, 140));
  }
  check('a line choice was offered and taken', choiceMade, choiceMade ? 'lesson advanced past the branch' : 'never got past the branch');

  // Let the lesson play forward on its own — no skipping, so any repeat is the
  // walkthrough's doing and not a tap of mine. Voice-gated narration is slow;
  // that IS the user's experience.
  const deadline = Date.now() + LESSON_BUDGET_MS;
  let sawLeaf = false;
  while (Date.now() < deadline) {
    await page.waitForTimeout(4000);
    if ((await page.locator('body').innerText()).includes('Watch the middlegame and endgame')) { sawLeaf = true; break; }
  }

  const spoken = spokenLines();
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
  // WHEN a line repeats matters more than THAT it repeats: an immediate echo is
  // an instrument retry, a late one is the lesson genuinely saying it again.
  const repeatWhen = [...new Set(repeatedLines)].map((line) => {
    const at = spoken.map((s, i) => (s === line ? i : -1)).filter((i) => i >= 0);
    return `${JSON.stringify(line.slice(0, 60))} spoken at index ${at.join(',')} of ${spoken.length}`;
  });
  check('no spoken line repeated', repeatedLines.length === 0,
    repeatedLines.length ? repeatWhen.join(' | ') : `${spoken.length} line(s), no repeats`);

  // ── 3. BOARD HOLDS through the continuation hand-off.
  if (!sawLeaf) {
    check('board holds after "Watch the middlegame"', false,
      `lesson never reached the leaf prompt in ${Math.round(LESSON_BUDGET_MS / 1000)}s (${paths.length} nodes narrated)`);
  } else {
    const pieces = async () => page.locator('[data-piece]').count();
    const before = await pieces();
    const navsBefore = navCount;
    await page.getByText('Watch the middlegame and endgame').first().click();

    // ── THE PLAY-OUT HOLDS THE DEPLOY RELOAD. Deterministic — it reads the
    //    real flag index.html polls, so it needs no deploy to land to fail.
    //    The lesson's own hold drops the moment `walkthrough.stop()` runs, and
    //    for one build that was the last hold standing: a `controllerchange`
    //    that had been deferred all lesson fired one move into the middlegame,
    //    reloading the page and putting 32 pieces back on the board.
    await page.waitForTimeout(2500);
    const heldDuringPlayOut = await page.evaluate(() => window.__HOLD_SW_RELOAD__ === true);
    check('play-out holds the service-worker reload', heldDuringPlayOut,
      heldDuringPlayOut
        ? 'window.__HOLD_SW_RELOAD__ is up while the middlegame plays'
        : 'the hold dropped at the lesson→play-out hand-off — a deploy will wipe the board mid-narration');

    await page.waitForTimeout(5500);
    const after = await pieces();
    const reloaded = navCount > navsBefore;
    check('the page did not reload under the play-out', !reloaded,
      reloaded
        ? `${navCount - navsBefore} navigation(s) after the tap — a deploy landed and the reload was not held`
        : 'no navigation after the tap');
    // 32 pieces is the starting position, and the lesson's leaf is well past it.
    //
    // AN EMPTY BOARD USED TO PASS THIS CHECK (2026-09-13). Under the old
    // blocked-TTS instrument a run reported "pieces before=13 after=0" and went
    // GREEN: `reset` only asked whether the board had snapped back to 32, so
    // every other wrong answer — including the board rendering NOTHING —
    // satisfied it. A board with no pieces is not a board that held.
    const vanished = after < 2;
    const reset = (after === 32 && before < 32) || vanished;
    check('board holds after "Watch the middlegame"', !reset,
      `pieces before=${before} after=${after}`
      + (vanished ? ' — the board rendered NOTHING'
        : reset ? (reloaded ? ' — the PAGE RELOADED (not a board reset): see the two checks above'
                            : ' — snapped back to the start')
        : ''));
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
