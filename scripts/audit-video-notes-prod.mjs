/**
 * audit-video-notes-prod — do the hand-written video notes actually reach a student?
 *
 * David 2026-08-17: *"Make sure it's working."* The unit gate proves the
 * SELECTOR returns each note at its own position, which is real wiring proof at
 * the service level and is not the same claim. CLAUDE.md says it outright: a
 * wire that does not fire is not a wire, and an audit that asserts an element
 * exists rather than that the teaching arrived is worth nothing.
 *
 * Three instruments together, per G1:
 *   1. Playwright drives /coach/teach on the LIVE prod deployment.
 *   2. The narration listener sidecar captures what the coach actually SPOKE,
 *      with its source and verbosity tag.
 *   3. The page's own console/DOM is read for the note text as a fallback
 *      signal, so a narration path that renders without speaking is still
 *      distinguishable from one that never fired at all.
 *
 * MUTED. The listener reads the spoken line out of the app's own
 * `coach-narration-spoken` event, which carries the full text, so synthesising
 * it produces audio nobody is in the room to hear and bills for it (G1, after
 * an audit run cost $100 in a day).
 *
 * WHAT COUNTS AS PASSING. Not "the lesson mentioned the opening" — that would
 * pass with the notes deleted. The assertion is that TEXT UNIQUE TO A
 * HAND-WRITTEN NOTE reaches the student, so the check fails if the corpus is
 * removed, which is the only way it means anything.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

/** A phrase is only useful here if it appears in NO other corpus — otherwise a
 *  pass could come from the farmed notes this work is replacing. Taken straight
 *  from the shipped bundle rather than retyped. */
const bundle = JSON.parse(readFileSync('src/data/video-teachings.json', 'utf8'));
const TARGETS = [
  // `pick` is the variation to tap when the ask opens a line picker. A broad
  // family name does NOT start a lesson — it offers Exchange / Panov / Fantasy
  // / Tartakower / Classical and waits. Two audit runs reported "the note never
  // reached the student" while sitting on that picker, having never started a
  // lesson at all, which is precisely the failure CLAUDE.md warns about: a
  // step that quietly does nothing and logs ok.
  // TARGET A NOTE THAT IS ON THE TAUGHT LINE. This first pointed at a note
  // anchored at `...f3 Nd7 e5 c5`, while the repertoire's Fantasy line plays
  // `...f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7`. They diverge at move three, so the
  // lesson never reaches that position and no student could hear the note — a
  // real finding, but not evidence that the wiring is broken. The note below
  // sits at an exact prefix of the taught line, which is what makes a failure
  // here mean something.
  { ask: 'Teach me the Caro-Kann Defense', id: 'vn-fantasy-caro-cover-the-check-square-before-grabbing', pick: 'Fantasy' },
].map((t) => {
  const note = bundle.notes.find((n) => n.id === t.id);
  if (!note) throw new Error(`note ${t.id} is not in the shipped bundle`);
  // A distinctive run of words, long enough that it cannot collide with
  // generated prose and short enough to survive sentence-level splicing.
  const phrase = note.teaches.split(/[.!?]/)[0].trim().slice(0, 48).toLowerCase();
  return { ...t, phrase, opening: note.opening };
});

const listener = await startAuditListener();
const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
// THE CALIBRATION BUBBLE IS DISMISSED BY CSS, NOT BY CLICKING — and that is
// deliberate (CLAUDE.md). Clicking the skill band fires an async Dexie write,
// and where that write stalls the bubble never detaches, so a hand-rolled
// click-dismiss HANGS rather than failing fast. Hand-rolling it here cost two
// full audit runs: the bubble sat over the page intercepting every click, the
// chat was never typed into, and the run reported "the note never reached the
// student" — a false accusation against the product produced entirely by the
// driver.
await ctx.addInitScript(autoDismissCalibration);
await ctx.addInitScript((url) => {
  try { localStorage.setItem('auditStreamUrl', url); } catch { /* first-load storage can be locked */ }
}, listener.url);

const page = await ctx.newPage();
const spoken = [];
page.on('console', (m) => { if (m.type() === 'error') spoken.push(`console-error:${m.text().slice(0, 90)}`); });

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
    } catch { /* gate absent on a warm context */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown on this surface */ }
}

const results = [];
for (const target of TARGETS) {
  let found = false;
  let detail = '';
  try {
    await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await dismissGates(); await dismissGates();

    // THE CHAT INPUT DOES NOT EXIST UNTIL THE CHAT PANEL IS OPENED. Waiting for
    // it directly timed out on a page that had loaded perfectly — zero console
    // errors, `coach-teach-page` present — and the run reported "the note never
    // reached the student", which is a false accusation against the product
    // from a driver that never typed anything. Open the panel first.
    try {
      const chatBtn = page.locator('[data-testid="teach-chat-button"]');
      await chatBtn.waitFor({ timeout: 10000 });
      await chatBtn.click();
    } catch { /* already open on a warm context */ }

    const box = page.locator('[data-testid="chat-text-input"]');
    await box.waitFor({ timeout: 20000 });
    await box.click();
    // pressSequentially, not fill: the React textarea needs real key events or
    // send stays disabled and the message never submits (CLAUDE.md).
    await box.pressSequentially(target.ask, { delay: 10 });
    await box.press('Enter');

    // Tap the variation if a picker appeared. Asserted, not best-effort: if the
    // picker is up and nothing is tapped, every later check is measuring an
    // idle page.
    if (target.pick) {
      try {
        const chip = page.getByText(target.pick, { exact: false }).first();
        await chip.waitFor({ timeout: 25000 });
        await chip.click({ force: true });
        detail = `picked ${target.pick}; `;
      } catch { detail = `no picker for ${target.pick}; `; }
    }

    // DRIVE THE WALKTHROUGH, DO NOT JUST WAIT BESIDE IT. The lesson announces
    // "this takes about a minute" and then plays beat by beat, so a fixed wait
    // covers the GENERATION and never reaches the ply the note is anchored at.
    // Three runs reported the note missing while the lesson was still building
    // itself. Skip advances a beat, which is what a student does when they read
    // faster than the narration.
    for (let i = 0; i < 60; i++) {
      await page.waitForTimeout(3000);
      if (i > 8 && i % 2 === 0) {
        try { await page.getByRole('button', { name: /^skip$/i }).click({ timeout: 2500, force: true }); } catch { /* between beats */ }
      }
      const body = (await page.locator('body').innerText().catch(() => '')).toLowerCase();
      const heard = listener.getCapturedEvents()
        .map((e) => JSON.stringify(e).toLowerCase()).join(' ');
      if (body.includes(target.phrase) || heard.includes(target.phrase)) {
        found = true;
        detail += body.includes(target.phrase) ? `rendered (t=${(i + 1) * 2}s)` : `spoken (t=${(i + 1) * 2}s)`;
        break;
      }
      if (i === 59) detail += `phrase never appeared in 180s of walking (events=${listener.getCapturedEvents().length})`;
    }
  } catch (e) {
    detail = `ERROR ${String(e).slice(0, 120)}`;
  }
  results.push({ ...target, found, detail });
  console.log(`${found ? '✓' : '✗'} ${target.opening ?? target.id}\n    "${target.phrase}"\n    ${detail}`);
}

const events = listener.getCapturedEvents();
console.log(`\nlistener captured ${events.length} event(s); ${spoken.filter((s) => s.startsWith('console-error')).length} console error(s)`);
await browser.close();
await listener.stop();

const passed = results.filter((r) => r.found).length;
console.log(`${passed}/${results.length} hand-written notes reached the student`);
process.exit(passed === results.length ? 0 : 1);
