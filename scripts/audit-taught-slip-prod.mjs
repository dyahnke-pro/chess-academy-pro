// THE COACH WALKS INTO A CURATED TRAP, AND THE STUDENT IS TOLD.
//
// David 2026-08-11: "68 yes!" — let the coach deliberately play a gem's
// inaccuracy so the student has a real punish to find.
//
// 🔒 WHAT THIS HAS TO PROVE, AND WHY NOTHING ELSE CAN. `gem_alert_spoken` had
// never fired once in production, and the reason was not a broken wire: zero of
// 344 gem inaccuracies exist in the openings DB and none is an engine pick, so
// the coach could not stumble into one. The fix makes it deliberate. That means
// the ONLY evidence that matters is a live game where the coach actually plays
// the slip and the student actually hears the callout — a unit test proves the
// lookup, and the lookup was never the thing in doubt.
//
// Driven on the Englund Gambit (1.d4 e5), whose trap line is short enough to
// reach in a handful of moves and which carries real curated gems. If the coach
// never slips here the audit says so plainly rather than passing on silence:
// this whole feature exists because silence read as "working" for months.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const RUN_ID = process.env.AUDIT_RUN_ID || `slip-${Date.now().toString(36)}`;

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

// The app's own audit events are the instrument. `source=taught-slip` is the
// coach choosing the slip; the gem alert is the student being told about it.
// Both are read off the emitted stream rather than inferred from the screen.
const audits = [];
page.on('request', (req) => {
  if (!/audit|posthog|\/a\//.test(req.url())) return;
  const body = req.postData();
  if (body) audits.push(body);
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

/** Play a move by clicking the board, the way a person does. */
async function playMove(from, to) {
  try {
    await page.locator(`[data-square="${from}"]`).click({ force: true, timeout: 8000 });
    await page.waitForTimeout(350);
    await page.locator(`[data-square="${to}"]`).click({ force: true, timeout: 8000 });
    await page.waitForTimeout(5000); // let the coach reply and the beat land
    return true;
  } catch { return false; }
}

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismissGates();
  await dismissGates();

  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  // Black, so the coach is White and is the side that can walk in.
  await box.pressSequentially('Play the Englund Gambit with me as black', { delay: 10 });
  await box.press('Enter');
  await page.waitForTimeout(12000);

  // Resolve a picker if the request opened one — an open picker eats every
  // move that follows.
  try {
    const tile = page.locator('[data-testid^="line-picker-"][data-fullname]').first();
    await tile.waitFor({ timeout: 5000 });
    await tile.click();
    await page.waitForTimeout(6000);
  } catch { /* no picker, already in a game */ }

  const boardUp = await page.locator('[data-square="e7"]').count() > 0;
  record('a playable board is up', boardUp, boardUp ? 'board mounted' : 'no board to play on');

  if (boardUp) {
    // 1...e5 2...Nc6 3...Qe7 — the Englund's trap spine, played as Black.
    const played = [];
    for (const [from, to] of [['e7', 'e5'], ['b8', 'c6'], ['d8', 'e7']]) {
      played.push(await playMove(from, to));
    }
    record('student moves landed', played.filter(Boolean).length >= 2,
      `${played.filter(Boolean).length}/3 moves played`);

    const blob = audits.join(' ');
    const slipped = /taught-slip/.test(blob);
    const alerted = /gem_alert_spoken|GEM ALERT/i.test(blob);

    // Reported honestly either way. The coach only slips when the game reaches
    // a position a gem is filed at, and a short drive may simply not get there
    // — that is not the same as the lane being dead, and the message says so
    // rather than letting a silent run read as a pass.
    record('the coach chose a curated slip', slipped,
      slipped ? 'source=taught-slip observed' : 'no slip this run — no gem position reached, or the lane is inert');
    record('the student was told about it', alerted || !slipped,
      alerted ? 'gem alert fired' : slipped ? 'THE COACH SLIPPED AND SAID NOTHING' : 'n/a — no slip to announce');

    const errors = /pageerror|Uncaught/.test(blob);
    record('no page errors', !errors, errors ? 'errors in the run' : 'clean');
  }
} catch (err) {
  record('the run completed', false, `ERROR ${String(err).slice(0, 200)}`);
}

await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n[posthog] confirm on the durable store:`);
console.log(`  SELECT timestamp, event, properties.summary FROM events`);
console.log(`  WHERE properties.audit_run_id='${RUN_ID}'`);
console.log(`    AND event IN ('coach_opponent_move_source','gem_alert_spoken') ORDER BY timestamp`);
console.log(`\n${passed}/${results.length} checks green`);
process.exit(passed === results.length ? 0 : 1);
