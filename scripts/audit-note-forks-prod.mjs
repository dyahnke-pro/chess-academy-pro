// Post-deploy audit for the 2026-08-18 note forks.
//
// 🚨 EXPECTED RED UNTIL THE FORKS HAVE LESSONS. The branches this drives are in
// the shipped data but are NOT offered by any surface: `buildVariationTabs`
// gates both the openings tabs and this picker on a variation having its own
// `LessonScript`, and the forks do not have one yet (see
// docs/plans/2026-08-18-note-forks.md). The picker checks below therefore fail
// on purpose — they are the standing proof that the wiring is still owed, and
// they go green the day the lessons are authored. Do NOT "fix" them by
// loosening the selector.
//
// THE CLAIM UNDER TEST is not "the variation exists" and not "the note is in the
// bundle" — both were already true of notes no student could hear. It is that
// asking to be taught a forked line reaches the new branch AND the coach speaks
// the hand-written note anchored on it. That is delivery, and delivery is the
// only thing the fork was built to buy.
//
// The in-process gate (`videoNoteSplice.test.ts`) proves the same chain in two
// seconds and cannot be lied to by a driver. This proves it in the app people
// actually open, which is the half a unit test can never cover: the branch is
// in the shipped data, the picker offers it, and the walkthrough narrates it.
//
// THREE INSTRUMENTS (G1). Playwright drives; the /api/tts request text is what
// the coach SPOKE; the narration listener sidecar carries the app's own audit
// events. Every assertion proves it had data before it may pass — a check that
// cannot fail reports coverage it does not have.
//
// MUTED. `blockTtsNetwork` is used rather than `muteTtsForAudit` on purpose:
// the spoken text is read out of the /api/tts URL, so muting would blind the
// instrument and the audit would report silence in exactly the place it is
// watching. Playwright fires `request` before consulting the route handler, so
// the text is still captured while the provider never sees a byte.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const BUDGET_MS = Number(process.env.AUDIT_LESSON_BUDGET_MS ?? 420_000);

/** One row per fork worth driving: what to ask for, which line to tap, and a
 *  phrase that only the hand-written note anchored on that branch contains. */
const FORKS = [
  { ask: 'Scandinavian Defence', pick: 'Bb5', phrase: /stands between the queen/i,
    note: 'vn-scandi-modern-bb5-check-costs-the-recapture' },
  { ask: 'Caro-Kann Defence', pick: 'e6', phrase: /pins the knight against the king/i,
    note: 'vn-fantasy-e6-swap-for-the-knight-that-holds-it-together' },
];

const listener = await startAuditListener();
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());

const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); };

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
    } catch { /* gate absent on this context */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* no help modal */ }
}

for (const fork of FORKS) {
  const page = await ctx.newPage();
  await blockTtsNetwork(page);
  const spoken = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.includes('/api/tts')) return;
    try {
      const text = new URL(url).searchParams.get('text');
      if (text && text.trim() !== '.') spoken.push(text);  // '.' is the warmup probe
    } catch { /* a malformed URL must not fail the run */ }
  });

  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.evaluate(([url, secret]) => {
      localStorage.setItem('auditStreamUrl', url);
      localStorage.setItem('auditStreamSecret', secret);
    }, [listener.url, LOCAL_LISTENER_SECRET]);

    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissGates(page); await dismissGates(page);

    const box = page.locator('[data-testid="chat-text-input"]');
    await box.waitFor({ timeout: 20000 });
    await box.click();
    // pressSequentially, not fill: the React textarea needs real key events or
    // send stays disabled and the message never submits.
    await box.pressSequentially(fork.ask, { delay: 12 });
    await box.press('Enter');

    // A family name opens the LINE PICKER. Tapping a line is the whole point —
    // an audit that skips it sits on the picker while every later step silently
    // no-ops, which is the false-coverage failure this repo has hit before.
    let picked = false;
    try {
      const picker = page.locator('[data-testid="line-picker"]');
      await picker.waitFor({ timeout: 90_000 });
      const tile = page.locator(`[data-testid^="line-picker-"][data-fullname*="${fork.pick}"]`).first();
      await tile.waitFor({ timeout: 15_000 });
      await tile.click();
      await picker.waitFor({ state: 'detached', timeout: 25_000 });
      picked = true;
    } catch (err) {
      check(`${fork.ask}: the forked line is offered and tapped`, false, String(err).slice(0, 160));
    }
    if (picked) check(`${fork.ask}: the forked line is offered and tapped`, true, `picked a line matching "${fork.pick}"`);

    // Let it play. Voice-gated narration is slow, and that IS the wait a student
    // sits through — stop as soon as the note has been spoken.
    const deadline = Date.now() + BUDGET_MS;
    while (Date.now() < deadline) {
      if (spoken.some((line) => fork.phrase.test(line))) break;
      await page.waitForTimeout(4000);
    }

    check(`${fork.ask}: the coach actually spoke`, spoken.length >= 2, `${spoken.length} spoken line(s)`);
    const hit = spoken.find((line) => fork.phrase.test(line));
    check(`${fork.ask}: speaks the hand-written note (${fork.note})`, Boolean(hit),
      hit ? JSON.stringify(hit.slice(0, 120)) : `no spoken line matched ${fork.phrase}`);
  } catch (err) {
    check(`${fork.ask}: run completed`, false, String(err).slice(0, 200));
  } finally {
    await page.close();
  }
}

const events = listener.getCapturedEvents();
check('narration listener captured the app\'s own events', events.length > 0, `${events.length} audit event(s)`);

// REPORT BEFORE TEARDOWN. Printing after cleanup means a teardown that throws —
// as this one did, on a method the listener does not have — discards a run that
// had already finished every check, and the audit reads as a failure of the
// product rather than of its own last two lines.
console.log('\n── note-fork audit ─────────────────────────────');
for (const r of results) console.log(`  ${r.pass ? '✓' : '✗'} ${r.name}\n      ${r.detail}`);
const failed = results.filter((r) => !r.pass);
console.log(`\n  ${results.length - failed.length}/${results.length} green`);

try { await browser.close(); } catch { /* teardown must not change the verdict */ }
try { await listener.stop(); } catch { /* ditto */ }
process.exit(failed.length ? 1 : 0);
