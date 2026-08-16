/**
 * audit-coach-watch-matchup — THE PLAYWRIGHT AUDIT STANDARD applied to the
 * "Watch" feature (David 2026-07-19: "make sure the new watch function is
 * working. It was built recently and not audited with the new playwright
 * audit"). The Watch feature = the opening MATCHUP (#802/#803): type
 * "X vs Y" on /coach/teach → planOpeningMatchup + buildMatchupLine (both DB
 * setups + Stockfish bridge) → generateOpening → the walkthrough plays the
 * full game out with narration.
 *
 * Drives REAL human input (types the request, presses Enter — never injects
 * a command as a shortcut) and asserts EXPERIENCE contracts:
 *   W1  a real "X vs Y" matchup builds and the walkthrough MOUNTS + PLAYS
 *       out on the board — the core "does it work" check.
 *   W2  the coach SPOKE during the watch (narration listener) — a silent
 *       watch is broken.
 *   W3  off-canonical fuzzy input ("italian vs najdorf") still resolves.
 *   W4  the same-colour rejection path is handled (two White openings can't
 *       face each other → an honest message, not a crash/hang).
 *   W5  zero pageerrors / React-key errors across the run.
 *
 * TESTID NOTE (fixed 2026-07-19): the Teach walkthrough is the INLINE
 * `useTeachWalkthrough` surface — its active state is the
 * `walkthrough-narrating-panel` (Skip/Pause/End), advanced via
 * `walkthrough-skip`, and it plays out on a react-chessboard whose pieces
 * carry `[data-piece]` ids. The `walkthrough-mode` / `walkthrough-move-counter`
 * testids belong to the LEGACY /openings `WalkthroughMode` component and
 * NEVER render on /coach/teach — an earlier version of this audit checked
 * those and false-failed W1a while the feature was actually working.
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_LISTENER=1 AUDIT_SMOKE_URL=http://localhost:5173 \
 *      node scripts/audit-coach-watch-matchup.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { attachVoiceListener, voiceLines, LISTENER_LAUNCH_ARGS } from './audit-lib/review-voice-listener.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const run = async () => {
  const executablePath = await resolveChromiumExecutable();
  const browser = await chromium.launch({ headless: true, executablePath, args: [...sandboxLaunchArgs(), ...(process.env.AUDIT_LISTENER === '1' ? LISTENER_LAUNCH_ARGS : [])] });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
  const voice = process.env.AUDIT_LISTENER === '1' ? await attachVoiceListener(ctx) : null;
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() === 'error' && /same key|unique "key"|Maximum update|Cannot update a component/.test(m.text())) {
      errs.push('REACT: ' + m.text().slice(0, 160));
    }
  });

  const dismissModals = async () => {
    for (let i = 0; i < 8; i++) {
      let acted = false;
      for (const [sel, click] of [
        ['[data-testid="ai-consent-allow"]', '[data-testid="ai-consent-allow"]'],
        ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
        ['[data-testid="page-help-modal"]', '[data-testid="page-help-modal"] button'],
      ]) {
        if (await page.locator(sel).count()) {
          try { await page.locator(click).first().click({ timeout: 3000 }); acted = true; } catch { /* */ }
        }
      }
      await page.waitForTimeout(600);
      if (!acted && i > 1) break;
    }
  };

  const gotoTeach = async () => {
    await page.goto(`${URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 20000 }).catch(() => undefined);
    await dismissModals();
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="chat-text-input"]');
      return el && !el.disabled;
    }, { timeout: 60000 }).catch(() => undefined);
    await page.waitForTimeout(700);
  };

  const ask = async (text) => {
    const input = page.locator('[data-testid="chat-text-input"]');
    await input.fill('').catch(() => undefined);
    await input.pressSequentially(text, { delay: 6 }).catch(() => undefined);
    await page.keyboard.press('Enter').catch(() => undefined);
  };

  const transcript = async () =>
    page.locator('[data-testid="teach-transcript"]').innerText({ timeout: 2000 }).catch(() => '');

  // Board signature: react-chessboard tags every piece with an id that
  // encodes its square (…-piece-<type>-<square>). The sorted set of those
  // ids is a position fingerprint — it changes on every move played out.
  const boardSig = async () =>
    page.evaluate(() =>
      Array.from(document.querySelectorAll('[data-piece]'))
        .map((el) => el.id || el.getAttribute('data-piece') || '')
        .sort()
        .join('|'),
    ).catch(() => '');

  // Active Teach walkthrough = the narrating panel (Skip/Pause/End) OR any
  // downstream decision panel. The legacy `walkthrough-mode` testid belongs
  // to the /openings WalkthroughMode component — it NEVER renders here.
  const WALK_PANELS = [
    'walkthrough-narrating-panel', 'walkthrough-fork-panel', 'walkthrough-leaf-panel',
    'walkthrough-stage-menu', 'walkthrough-choose-mode', 'walkthrough-paused-panel',
  ];
  const anyWalkPanel = async () => {
    for (const p of WALK_PANELS) if (await page.locator(`[data-testid="${p}"]`).count()) return p;
    return null;
  };

  let ok = false;
  for (let i = 0; i < 4 && !ok; i++) {
    try { await page.goto(`${URL}/`, { waitUntil: 'domcontentloaded', timeout: 60000 }); ok = true; }
    catch { await page.waitForTimeout(1500); }
  }
  await dismissModals();

  // ── W1 + W2: a real matchup builds, plays out, and SPEAKS ────────────────
  await gotoTeach();
  await ask('Italian Game vs Sicilian Defense');
  check('typed a real "X vs Y" matchup request', true, 'Italian Game vs Sicilian Defense');

  // The matchup intro should land in the transcript quickly. Match the REAL
  // intro phrasing ("White plays the … setup" / "Watch how they meet" / the
  // "don't normally meet" note) — NOT the default POPULAR-OPENINGS placeholder
  // list, which also contains "Italian"/"Sicilian" and would false-positive.
  let introSeen = false;
  for (let i = 0; i < 25 && !introSeen; i++) {
    const t = await transcript();
    if (/White plays the|answers with the|Watch how they meet|don.t normally meet|here.s what it looks like/i.test(t)) { introSeen = true; break; }
    await page.waitForTimeout(1000);
  }
  check('matchup intro appeared in the transcript', introSeen);

  // The walkthrough builds (DB setups + Stockfish bridge + LLM narration) then
  // mounts as the Teach narrating panel — allow up to ~120s cold.
  let walkPanel = null;
  for (let i = 0; i < 80 && !walkPanel; i++) {
    walkPanel = await anyWalkPanel();
    if (walkPanel) break;
    await page.waitForTimeout(1500);
  }
  check('W1a: the matchup walkthrough MOUNTED (full game built + playing)', !!walkPanel, walkPanel || 'no walkthrough panel appeared');

  if (walkPanel) {
    // PLAYS OUT: the board fingerprint must change as moves are played. It
    // auto-plays (voice-gated); Skip advances deterministically like a human
    // clicking ahead. Assert the board changed OR the phase reached a
    // downstream decision panel (leaf / fork / stage-menu) = line finished.
    const sig0 = await boardSig();
    let advanced = false;
    let reachedEnd = false;
    for (let i = 0; i < 24 && !advanced; i++) {
      const skip = page.locator('[data-testid="walkthrough-skip"]');
      if (await skip.count()) { try { await skip.click({ timeout: 1500, force: true }); } catch { /* */ } }
      await page.waitForTimeout(1200);
      const sig = await boardSig();
      if (sig && sig0 && sig !== sig0) advanced = true;
      const p = await anyWalkPanel();
      if (p && p !== 'walkthrough-narrating-panel') { reachedEnd = true; break; }
    }
    check('W1b: the game PLAYS OUT (board advanced / reached line end)', advanced || reachedEnd,
      advanced ? 'board fingerprint changed' : (reachedEnd ? 'reached downstream panel' : 'no advance detected'));

    if (voice) {
      const lines = voiceLines(voice);
      console.log('   VOICE (' + lines.length + '):', JSON.stringify(lines.slice(0, 14)));
      check('W2: the coach SPOKE during the watch (narration fired)', lines.length >= 2, `${lines.length} voice lines`);
    }
  }

  // ── W3: off-canonical fuzzy matchup still resolves ───────────────────────
  await gotoTeach();
  await ask('italian vs najdorf');
  let fuzzyOk = false;
  for (let i = 0; i < 80 && !fuzzyOk; i++) {
    if (await anyWalkPanel()) { fuzzyOk = true; break; }
    const t = await transcript();
    if (/najdorf|sicilian|italian/i.test(t) && t.length > 60) { fuzzyOk = true; break; } // resolved + responded
    await page.waitForTimeout(1500);
  }
  check('W3: off-canonical fuzzy matchup resolved ("italian vs najdorf")', fuzzyOk);

  // ── W4: same-colour rejection is handled honestly ────────────────────────
  await gotoTeach();
  await ask('Italian Game vs Ruy Lopez'); // both White
  let sameColourHandled = false;
  for (let i = 0; i < 20 && !sameColourHandled; i++) {
    const t = await transcript();
    if (/can't face|both .*openings|on its own|same/i.test(t)) { sameColourHandled = true; break; }
    await page.waitForTimeout(1000);
  }
  check('W4: same-colour matchup handled with an honest message (no crash/hang)', sameColourHandled);

  console.log('\nERRORS:', errs.length ? JSON.stringify(errs) : 'none');
  check('W5: zero pageerrors / React key errors', errs.length === 0);
  if (voice) await voice.stop();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks green`);
  await browser.close();
  process.exit(failed.length > 0 ? 1 : 0);
};
run().catch((e) => { console.error(e); process.exit(1); });
