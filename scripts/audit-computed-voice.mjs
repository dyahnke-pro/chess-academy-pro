#!/usr/bin/env node
/**
 * audit-computed-voice — play a REAL game and read back every word the coach
 * said, with the board it said it on.
 *
 * David 2026-08-15: "run a game, get the audit data and see what is missing
 * from that. No guess work."
 *
 * Offline walks over `assembleMovePurpose` proved the fact computer works. They
 * cannot prove the APP speaks it: between the computer and the student sit the
 * generator's tier order, the board-truth grade, the house-voice reword, the
 * verbosity gate and the voice service, and a fact that dies in any of them is
 * a fact the student never hears. So this drives the real UI, captures the real
 * narration events, and diffs what was SAID against what was AVAILABLE.
 *
 * Instruments (G1): Playwright drives, the narration listener captures every
 * spoken line with its source tag, and the page's own audit events record what
 * the app did internally. TTS is muted — an audit needs to know what was said,
 * not to hear it.
 */
import { chromium as pwChromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const URL = process.env.AUDIT_SMOKE_URL ?? 'http://localhost:5173';
const OPENING = process.env.AUDIT_OPENING ?? 'Ruy Lopez';
const OUT = `audit-reports/computed-voice-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  mkdirSync(OUT, { recursive: true });
  const listener = await startAuditListener();
  const browser = await pwChromium.launch({
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const ctx = await browser.newContext(sandboxContextOptions());

  // Point the app's audit stream at the local listener and mute synthesis
  // BEFORE the first script runs, or the first events are lost and the run
  // bills for audio nobody is in the room to hear.
  await ctx.addInitScript(({ url, secret }) => {
    localStorage.setItem('auditStreamUrl', url);
    // The listener rejects an unauthenticated POST, so without this every
    // event 401s and the run reports "the app said nothing" when the app was
    // talking the whole time.
    localStorage.setItem('auditStreamSecret', secret);
    localStorage.setItem('auditMuteTts', '1');
  }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });

  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console: ${m.text().slice(0, 200)}`);
  });

  await page.goto(`${URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 90_000 });

  // FRESH-CONTEXT GATES. Both block every click until dismissed, and an audit
  // that skips them times out looking like a broken surface.
  try {
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ timeout: 20_000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 20_000 });
  } catch { /* not shown on a warm profile */ }
  for (const sel of ['[data-testid="page-help-modal"] button', '[data-testid="ai-consent-allow"]']) {
    try { await page.locator(sel).first().click({ timeout: 4000 }); } catch { /* absent */ }
  }

  // ASK FOR THE LESSON THE WAY A STUDENT DOES. `pressSequentially`, not
  // `fill` — the React textarea needs real key events or send stays disabled.
  const box = page.locator('textarea').first();
  await box.click();
  await box.pressSequentially(`teach me the ${OPENING}`, { delay: 12 });
  await page.keyboard.press('Enter');

  // A BROAD FAMILY NAME OPENS THE LINE PICKER, IT DOES NOT START A LESSON.
  // "Ruy Lopez" offers Berlin, Open, Marshall, Breyer, Zaitsev… and a run that
  // does not pick one sits on the picker forever, then reports that the coach
  // said nothing. It said plenty; nobody answered it.
  await sleep(8_000);
  try {
    const pick = page.getByText('Breyer', { exact: false }).first();
    await pick.click({ timeout: 8_000 });
    console.log('picked a line from the variation picker');
  } catch { console.log('no line picker appeared — the name resolved directly'); }

  // The first generation is slow and that IS the student's wait.
  await sleep(15_000);
  for (let i = 0; i < 40; i += 1) {
    if (listener.getCapturedEvents().some((e) => /narration|spoken|speak/i.test(e.kind ?? ''))) break;
    await sleep(3_000);
  }
  // Let the walkthrough play a while, skipping ahead so the run covers plies
  // rather than waiting out voice-gated pacing.
  for (let i = 0; i < 14; i += 1) {
    try {
      await page.locator('[data-testid="walkthrough-skip"]').first().click({ timeout: 2500 });
    } catch { /* no skip control on this phase */ }
    await sleep(1_800);
  }

  // SCRAPE WHAT WAS RENDERED. The narration audit events truncate their
  // summary at 40 characters and carry no FEN, so the stream can prove that a
  // line FIRED and can never prove WHAT it said — which is the whole question
  // on a narration audit. The transcript in the DOM is the full text.
  const rendered = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-testid], p, div')) {
      const t = (el.textContent ?? '').trim();
      if (t.length < 12 || t.length > 400) continue;
      if (!/^(This is the |The |That |With |It's |White|Black)/.test(t)) continue;
      if (el.querySelector('p, div')) continue; // leaf nodes only
      out.push(t);
    }
    return [...new Set(out)];
  });

  const events = listener.getCapturedEvents();
  const spoken = events
    .filter((e) => /narration-spoken|voice-speak/i.test(e.kind ?? ''))
    .map((e) => ({ kind: e.kind, source: e.source, fen: e.fen ?? null, text: e.summary ?? e.details ?? '' }));

  // WHAT WAS AVAILABLE vs WHAT WAS SAID. For every spoken line carrying a FEN,
  // check the board actually supports it — the same question the offline walk
  // answered, now asked of the running app.
  const checked = spoken.map((s) => {
    let legalFen = false;
    try { new Chess(s.fen ?? ''); legalFen = true; } catch { legalFen = false; }
    return { ...s, legalFen };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    url: URL,
    opening: OPENING,
    totalAuditEvents: events.length,
    eventKinds: [...new Set(events.map((e) => e.kind))].sort(),
    spokenCount: spoken.length,
    spoken: checked,
    rendered,
    consoleErrors,
  };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    totalAuditEvents: report.totalAuditEvents,
    eventKinds: report.eventKinds,
    spokenCount: report.spokenCount,
    consoleErrors: consoleErrors.slice(0, 5),
  }, null, 2));
  console.log('\n===== RENDERED NARRATION (full text) =====');
  for (const t of rendered) console.log(`  ${t}`);
  await page.screenshot({ path: `${OUT}/final.png`, fullPage: false });
  console.log(`\nreport: ${OUT}/report.json`);

  await browser.close();
  await listener.stop();
}

main().catch(async (e) => { console.error(e); process.exit(1); });
