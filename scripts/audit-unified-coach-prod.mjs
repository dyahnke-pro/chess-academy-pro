// Comprehensive audit of the UNIFIED COACH personalization (David 2026-09-08:
// "make sure your audit tests all new functions of the coach"). Every function
// built across Phases 1/1b/2/3/5 is INERT until the student has a weakness
// profile — a fresh audit game triggers none of them. So this audit SEEDS a
// real weakness profile into IndexedDB (3 open fork holes + 2 pin holes), then
// drives the surface the way a returning student would and proves each new wire
// FIRES with real output on screen and in the voice:
//
//   1. The weakness SPINE → the custom-lesson PICKER opening phrase names the
//      seeded holes (P5). Proof the aggregated profile reaches the surface.
//   2. The picker CHIPS render (full-lesson + per-hole).
//   3. Tapping a hole builds the lesson: the coach TEACHES the concept (grounded
//      corpus prose) and DRILLS the student's OWN flubbed position.
//   4. The seeded own-position is real + solvable (the correct move is accepted).
//
// THREE INSTRUMENTS (G1): Playwright drives; the /api/tts GET capture + the
// narration-listener sidecar prove the coach actually SPOKE. Every check that
// could pass on an empty set first proves it had data (the false-coverage rule).
//
// Live-play-only functions (positionFacts weakness re-rank, speakDeepestLookahead's
// honest tag, the review recurrence recap) fire mid-game / in review against a
// matching position; they are covered by unit tests (weaknessSignal.test.ts,
// positionFacts, coachFeatureService) and are NOT force-driven here — this audit
// proves the shared spine→surface path they all ride, via the picker.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';
import { seedWeaknessProfile, SEED_FORK_FEN } from './audit-lib/seed-weakness-profile.mjs';
import { readPlacement } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
await blockTtsNetwork(page);

const spoken = [];
page.on('request', (req) => {
  const url = req.url();
  if (!url.includes('/api/tts')) return;
  try { const t = new URL(url).searchParams.get('text'); if (t && t.trim() !== '.') spoken.push(t); } catch { /* ignore */ }
});

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };

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
    } catch { /* gate absent */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* no help modal */ }
}

try {
  // Point the app's audit stream at the sidecar before anything mounts.
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate(([url, secret]) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, [listener.url, LOCAL_LISTENER_SECRET]);

  // First visit to /coach/teach: dismiss gates, then SEED the weakness profile.
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();
  const seed = await seedWeaknessProfile(page);
  check('seed a weakness profile into IndexedDB', seed.ok === true, JSON.stringify(seed));
  if (!seed.ok) throw new Error('cannot seed — the rest cannot run');

  // Reload so the kickoff opener reads the seeded profile and states the picker.
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(); await dismissGates();

  // ── 1. The picker opening phrase names the seeded holes (spine → surface).
  const chipsBox = page.locator('[data-testid="coach-choice-chips"]');
  let pickerBody = '';
  try {
    await chipsBox.waitFor({ timeout: 60000 });
    // Give the async opener a moment to finish appending the spoken picker line.
    await page.waitForTimeout(2500);
    pickerBody = (await page.locator('body').innerText()).toLowerCase();
  } catch { /* handled by the checks below */ }
  check('picker opening phrase names the seeded holes',
    pickerBody.includes('forks') && pickerBody.includes('pins'),
    `forks=${pickerBody.includes('forks')} pins=${pickerBody.includes('pins')}`);

  // ── 2. The picker chips render (full-lesson + per-hole).
  const fullChip = page.locator('[data-choice="Build my full lesson"]');
  const forkChip = page.locator('[data-choice^="Lesson on"]').first();
  const haveFull = await fullChip.count() > 0;
  const haveHole = await forkChip.count() > 0;
  check('picker renders full-lesson + per-hole chips', haveFull && haveHole,
    `fullChip=${haveFull} holeChip=${haveHole}`);

  // ── 0. The voice instruments captured the picker (no false coverage).
  check('coach SPOKE the picker (TTS + listener)',
    spoken.length >= 1 && listener.getCapturedEvents().length >= 1,
    `${spoken.length} spoken line(s), ${listener.getCapturedEvents().length} audit event(s)`);

  // ── 3. Tapping a hole builds the lesson: teach the concept, then drill the
  //       student's OWN position.
  if (haveHole) {
    const chosen = await forkChip.getAttribute('data-choice');
    await forkChip.click();
    // The lesson teaches the concept then mounts the drill (prompt from
    // mistakePuzzleToDrill: "You missed the best move here").
    let taught = false, drillMounted = false, positionRight = false;
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(2000);
      const body = (await page.locator('body').innerText()).toLowerCase();
      if (body.includes('overlook forks') || body.includes('two targets at once')) taught = true;
      if (body.includes('you missed the best move here')) drillMounted = true;
      const placement = await readPlacement(page);
      if (placement.d5 === 'wN') positionRight = true;
      if (taught && drillMounted && positionRight) break;
    }
    check('a picked hole teaches its concept (grounded)', taught,
      `chip="${chosen}" — concept behavior spoken/shown`);
    check('the lesson drills the student\'s OWN position', drillMounted && positionRight,
      `drillPrompt=${drillMounted} forkPositionLoaded=${positionRight} (fen ${SEED_FORK_FEN})`);

    // ── 4. The seeded own-position is real + solvable: the correct move Nc7+ is
    //       ACCEPTED (a rejected move always produces the wrong-move nudge+undo).
    if (drillMounted && positionRight) {
      await page.locator('[data-square="d5"]').first().click({ timeout: 8000, force: true });
      await page.waitForTimeout(250);
      await page.locator('[data-square="c7"]').first().click({ timeout: 8000, force: true });
      await page.waitForTimeout(4500);
      const after = (await page.locator('body').innerText()).toLowerCase();
      const rejected = after.includes('not the strongest') || after.includes('take another look') || after.includes("still not it");
      check('the correct move (Nc7+) is accepted on the own-position drill', !rejected,
        rejected ? 'coach rejected a legal correct move' : 'move accepted (no wrong-move nudge)');
    }
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
