// Post-deploy audit for the hand-written VIDEO NOTES (2026-08-17).
//
// The notes are read off the lesson video, written by hand against that board,
// and merged into the primary teaching corpus. Every check that they SELECT
// runs in vitest against the local corpus — which proves the data and the
// selector agree, and proves nothing at all about the deployed app. Between the
// two sits a build: a static import that must survive chunking, and a bundle
// that must actually reach the browser.
//
// So this asks the only questions vitest cannot:
//
//   1. DID THE DATA SHIP — the deployed bundle contains the note ids. If a
//      chunking change ever drops the import, every note goes silent in prod
//      while every local gate stays green.
//   2. DOES THE APP SELECT ONE — the running app, on a real board, returns a
//      video note through its own retrieval.
//   3. DID THE COACH SPEAK IT — the narration listener hears it, and the audit
//      stream records it. Silence where a note should speak is the failure this
//      whole branch exists to remove, and only the listener catches it.
//
// THREE INSTRUMENTS (G1): Playwright drives, the listener sidecar captures the
// voice, and the app's own audit events come back through it. Every assertion
// proves it had data before it may pass — a check that cannot fail reports
// coverage it does not have.
//
// TTS IS MUTED (G1). The listener reads the spoken line out of the app's own
// `coach-narration-spoken` event, which carries the full text, so synthesising
// it would bill for audio nobody is in the room to hear.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const bundle = JSON.parse(readFileSync('src/data/video-teachings.json', 'utf8'));
const NOTE_IDS = bundle.notes.map((n) => n.id);

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` :: ${detail}` : ''}`);
};

// ── 1. DID THE DATA SHIP ────────────────────────────────────────────────────
const html = await (await fetch(`${BASE}/?cb=${Date.now()}`)).text();
const assets = [...html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.js/g)].map((m) => m[0]);
record('prod serves a bundle', assets.length > 0, `${assets.length} chunks`);

let found = null;
for (const a of assets) {
  const js = await (await fetch(`${BASE}${a}`)).text();
  const hits = NOTE_IDS.filter((id) => js.includes(id));
  if (hits.length) { found = { asset: a, hits: hits.length }; break; }
}
record('the video notes are IN the deployed bundle', Boolean(found),
  found ? `${found.hits}/${NOTE_IDS.length} ids in ${found.asset}` : 'no chunk contained any note id');

// ── 2 + 3. DOES THE APP SELECT ONE, AND SPEAK IT ────────────────────────────
const listener = await startAuditListener();
const browser = await chromium.launch({
  executablePath: await resolveChromiumExecutable(),
  args: sandboxLaunchArgs(),
});
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);      // never spend TTS money to audit
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();

try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  // BOTH keys, before anything mounts. Omitting the secret leaves the app
  // unable to POST and the sidecar silent — which reads exactly like "the coach
  // said nothing", the one conclusion this audit must never reach by accident.
  await page.evaluate(([url, secret]) => {
    localStorage.setItem('auditStreamUrl', url);
    localStorage.setItem('auditStreamSecret', secret);
  }, [listener.url, LOCAL_LISTENER_SECRET]);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

  // Selection is exercised through the SURFACE, not by importing the service:
  // a production bundle has no source modules to import, so a probe that tried
  // would always report "unavailable" and prove nothing. Drive a lesson on an
  // opening these notes cover and watch what the coach actually says.
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForTimeout(8_000);
  const consent = page.locator('[data-testid="ai-consent-allow"]');
  if (await consent.count()) await consent.first().click({ timeout: 10_000 }).catch(() => {});

  const box = page.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 60_000 });
  await box.click();
  // pressSequentially, never fill — the React textarea needs real key events or
  // the send button stays disabled and the message is never submitted.
  await box.pressSequentially('Teach me the Alapin Sicilian', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(90_000);

  const all = listener.getCapturedEvents();
  const voice = listener.eventsOfKind((e) => /narration|speak|spoken|voice/i.test(e.kind ?? ''));
  record('the audit-stream sidecar captured events', all.length > 0,
    `${all.length} events :: ${JSON.stringify(listener.countByKind()).slice(0, 220)}`);
  record('the coach SPOKE during the lesson', voice.length > 0,
    `${voice.length} voice/narration events`);

  // WHICH NOTE GROUNDED A LINE IS NOT KNOWABLE FROM HERE, and saying so is the
  // point. A note is GROUNDING — the model phrases it rather than reciting it —
  // so scanning the spoken text for the note's own words finds nothing even
  // when the note did its job. The audit stream carries no note id either
  // (`coach-narration-spoken` records the line, not its source).
  //
  // So the split of evidence is: prod proves the notes SHIPPED and the coach
  // SPEAKS; `videoNotesSpeak.test.ts` proves every note is SELECTED by the real
  // selector at its own position. Neither half is claimed to be the other. If
  // the stream ever gains a note id, this is where the last link belongs.
  const narrated = listener.eventsOfKind('coach-narration-spoken');
  console.log(`\n${narrated.length} narration events; note attribution is not emitted by the stream (see comment).`);
  writeFileSync('audit-reports/video-notes-spoken.txt',
    all.map((e) => JSON.stringify(e)).join('\n').slice(0, 200000));

  mkdirSync('audit-reports', { recursive: true });
  writeFileSync('audit-reports/video-notes-prod.json',
    JSON.stringify({ base: BASE, results, byKind: listener.countByKind(), events: all.length }, null, 1));
} finally {
  await browser.close();
  await listener.stop();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
