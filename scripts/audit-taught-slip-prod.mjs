// THE COACH WALKS INTO A CURATED TRAP — ON EASY, AND NOT ON HARD.
//
// David 2026-08-11: "68 yes!" — let the coach deliberately play a gem's
// inaccuracy so the student has a real punish to find. Then: "Also add the gem
// slip adaptivity into play. Again based off of elo and easy/med/hard settings.
// Intermediate should only get them on easy... Advanced players should never
// get them." And on how it arrives: "But not in the picker form. Keep it
// silent."
//
// 🔒 WHAT THIS HAS TO PROVE, AND WHY NOTHING ELSE CAN. `gem_alert_spoken` had
// never fired once in production, and the reason was not a broken wire: zero of
// 344 gem inaccuracies exist in the openings DB and none is an engine pick, so
// the coach could not stumble into one. The fix makes it deliberate — which
// means the only evidence that counts is a live game where the coach actually
// plays the slip. A unit test proves the lookup, and the lookup was never the
// thing in doubt.
//
// ── WHY THIS SCRIPT WAS REWRITTEN ────────────────────────────────────────────
//
// The first version drove three scripted replies (the Englund) and reported
// "no slip this run — no gem position reached, or the lane is inert". That
// sentence is doing a lot of honest work, and it was the instrument's fault:
// the Englund carries NO gem at all, and a fixed reply list cannot steer the
// coach anywhere in the first place, since half the moves to a gem position are
// the COACH's. The run could never have passed. This is the sixth instrument
// error of the session against a comparable number of real defects, which is
// why the rule now is to suspect the instrument first.
//
// So the position is SEEDED instead of navigated to. `/coach/play?fen=` puts
// the coach on a real gem board with the move, and the very next thing it plays
// is either the slip or it is not — no luck, no scripted opening, no ambiguity.
//
// ── AND IT IS AN A/B, NOT A SINGLE OBSERVATION ───────────────────────────────
//
// The same board is driven twice: once on EASY (an intermediate student should
// meet the trap) and once on HARD (they never should). One run proves the lane
// fires; two prove it is GATED, which is the half a "did it fire" check can
// never see — a lane that fires unconditionally passes exactly the same test.
//
// The seeded board is the Stafford Gambit after 1.e4 e5 2.Nf3 Nf6 3.Nxe5 Nc6.
// Nxf7 — the "oh no, my queen" walk-in — is a curated, engine-verified gem AND
// sits in the live amateur explorer's top moves for the 1000-1400 band, which
// matters: since the slip is filtered against what real players at the
// student's level actually play, a gem the band never plays would correctly
// produce silence and look like a failure.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `slip-${Date.now().toString(36)}`;

/** Stafford Gambit, White to move. A curated gem sits exactly here. */
const GEM_FEN = 'r1bqkb1r/pppp1ppp/2n2n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R w KQkq - 1 4';
const GEM_SLIP = 'Nxf7';

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});

async function dismissGates(page) {
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

/**
 * Seed the gem board at one difficulty and report what the coach played.
 *
 * The move is read from the app's OWN `coach-turn-checkpoint` audit entry
 * rather than off the screen — the same instrument the full-game audit
 * standard uses, and the only one that gives the SAN unambiguously.
 */
async function runOnce(difficulty) {
  const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit); // never spend TTS money to audit (G1)
  await ctx.addInitScript((id) => {
    try { localStorage.setItem('auditRunId', id); } catch { /* private mode */ }
  }, `${RUN_ID}-${difficulty}`);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));

  const url = `${BASE}/coach/play?side=black&difficulty=${difficulty}`
    + `&fen=${encodeURIComponent(GEM_FEN)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates(page);
  await dismissGates(page);

  // The coach has the move on a seeded board, so it moves on its own. Poll its
  // own audit log until a move is committed or the budget runs out.
  let played = null;
  let source = null;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const entries = await page.evaluate(async () => {
      const a = window.__AUDIT__;
      if (!a || typeof a.dump !== 'function') return [];
      try { return await a.dump(); } catch { return []; }
    }).catch(() => []);
    for (const e of entries) {
      const s = typeof e?.summary === 'string' ? e.summary : '';
      if (!source && s.includes('source=taught-slip')) source = s;
      if (!played && e?.kind === 'coach-turn-checkpoint' && s.startsWith('move-committed san=')) {
        played = /san=(\S+)/.exec(s)?.[1] ?? null;
      }
    }
    if (played) break;
  }
  await ctx.close();
  return { played, source, pageErrors };
}

try {
  // ── EASY: an intermediate student SHOULD meet the trap ──────────────────
  const easy = await runOnce('easy');
  record('the coach moves at all on the seeded gem board', Boolean(easy.played),
    easy.played ? `played ${easy.played}` : 'no move committed in 60s');
  record(`on EASY the coach walks into the curated slip (${GEM_SLIP})`,
    easy.played === GEM_SLIP,
    easy.played === GEM_SLIP ? 'the trap was played on purpose'
      : `played ${easy.played ?? 'nothing'} instead`);
  record('the slip is reported as a taught slip, not as an engine pick',
    Boolean(easy.source),
    easy.source ? easy.source.slice(0, 150) : 'no source=taught-slip audit event');
  // The band read is the amateur-DB tie-in David asked for. It is allowed to
  // be absent — offline, rate-limited, circuit-open all leave the curated gem
  // eligible on its own merits — so this reports rather than fails.
  console.log(`   ↳ band: ${/bandConfirmed=true/.test(easy.source ?? '')
    ? 'confirmed against the student\'s rating band'
    : 'not consulted this run (explorer miss/timeout — gem stands alone)'}`);

  // ── HARD: the same student on the same board must NOT be handed it ──────
  const hard = await runOnce('hard');
  record('on HARD the coach does NOT hand over the trap',
    hard.played !== null && hard.played !== GEM_SLIP,
    hard.played === GEM_SLIP ? 'THE MATRIX IS NOT GATING — hard was handed the slip'
      : `played ${hard.played ?? 'nothing'}`);
  record('no taught-slip event on HARD', !hard.source,
    hard.source ? `slip fired on hard: ${hard.source.slice(0, 120)}` : 'silent, as it should be');

  const errs = [...easy.pageErrors, ...hard.pageErrors];
  record('no page errors', errs.length === 0, errs.length ? errs[0] : 'clean');
} catch (err) {
  record('the run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n[posthog] confirm on the durable store:`);
console.log(`  SELECT timestamp, event, properties.summary FROM events`);
console.log(`  WHERE properties.audit_run_id LIKE '${RUN_ID}%'`);
console.log(`    AND event IN ('coach_opponent_move_source','coach_turn_checkpoint') ORDER BY timestamp`);
console.log(`\n${passed}/${results.length} checks green`);
process.exit(passed === results.length ? 0 : 1);
