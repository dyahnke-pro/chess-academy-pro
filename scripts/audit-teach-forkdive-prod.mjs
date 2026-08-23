// FORK DEEP-DIVE CONTINUITY (David 2026-07-31: "the learn lesson stops after
// selecting a line to learn/fork in the road").
//
// The bug: a fork's "Deep dive" tile resolves a canonical opening name from
// the DB and handed it to handleSubmit as if the student had typed it. The
// free-text router re-guessed the intent from its own prose and lost it — a
// 69-char Alapin sub-variation name blew past the 60-char bare-name cap, fell
// through to the brain ("I can't verify that precisely from grounded data
// right now"), and the walkthrough auto-paused behind it.
//
// This audit reproduces the exact tap and asserts the OPPOSITE outcome: a new
// lesson starts. It fails on any of the three dead-end signatures (the brain's
// refusal, the auto-pause banner, a "did you mean…" picker).
//
// Three instruments per G1: Playwright drives the taps, the narration listener
// captures what was spoken, the prod audit-stream is pulled before AND after
// so the delta is exactly this run.
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   node scripts/audit-teach-forkdive-prod.mjs
import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.AUDIT_OPENING || 'alapin';
const SECRET = process.env.AUDIT_STREAM_SECRET ?? '';

// The shapes the dead-end took. Any of them on screen after the tap is a FAIL —
// the student asked for a lesson and got routed to chat / a picker instead.
const DEAD_ENDS = [
  { id: 'brain-refusal', re: /can'?t verify that precisely|can'?t verify which moves are sound/i },
  { id: 'auto-paused', re: /walkthrough is paused\.?\s*tap resume/i },
  { id: 'didyoumean', re: /don'?t have an exact match|did you mean one of these/i },
  // David 2026-08-23: "alapin d5 deep dive redirected me to the Sicilian
  // pickers." A deep-dive whose canonical name resolved to a bare family hit
  // the Tier-1.5 line picker. Its prose is DISTINCT from the fuzzy "did you
  // mean" above, so the audit was green while this exact loop shipped.
  { id: 'family-picker', re: /branches into many lines|pick one to dive in deep/i },
  { id: 'play-picker', re: /splits into several different games/i },
];

const pullStream = async () => {
  if (!SECRET) return [];
  try {
    const res = await fetch(`${BASE}/api/audit-stream?since=${Date.now() - 60 * 60 * 1000}`, {
      headers: { 'x-audit-secret': SECRET },
    });
    return res.ok ? ((await res.json()).entries ?? []) : [];
  } catch { return []; }
};

const listener = await startAuditListener();
const before = await pullStream();
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await blockTtsNetwork(p);   // instrument keeps the request; the provider never sees it
const ttsTexts = [];
p.on('request', (r) => {
  if (r.url().includes('/api/tts')) {
    try { ttsTexts.push(new URL(r.url()).searchParams.get('text') ?? ''); } catch { /* malformed */ }
  }
});
const pageErrors = [];
p.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try {
      const g = p.locator(gate);
      await g.waitFor({ timeout: 8000 });
      await p.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 15000 });
    } catch { /* absent */ }
  }
  try {
    const m = p.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 4000 });
    await p.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* absent */ }
}

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

let deepDiveLabel = null;
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // A fresh Playwright context carries no audit secret, so the app posts
  // NOTHING to the prod stream and instrument 2 reads an empty delta that
  // looks like a failure. Seed it, then reload so boot picks it up.
  // Mixed-content: an https page can't post to the http listener, so the
  // local listener only attaches on a localhost run; on prod the same events
  // reach the prod stream instead.
  await p.evaluate(({ url, secret, local }) => {
    try {
      if (local) localStorage.setItem('auditStreamUrl', url);
      // BOTH are required: appAuditor only POSTs when it has a url AND a
      // secret, so seeding the secret alone leaves every CLIENT-side audit
      // (walkthrough, voice, generator) unstreamed while server-side ones
      // still land — which reads as "the app stopped emitting".
      if (secret) {
        localStorage.setItem('auditStreamSecret', secret);
        localStorage.setItem('auditStreamUrl', `${location.origin}/api/audit-stream`);
      }
    } catch { /* storage blocked */ }
  }, { url: listener.url, secret: SECRET, local: BASE.startsWith('http://') }).catch(() => undefined);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await dismiss(); await dismiss();

  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  // pressSequentially, not fill — the React textarea needs real key events or
  // send stays disabled and the message never submits.
  await box.pressSequentially(`teach me the ${ASK}`, { delay: 12 });
  await box.press('Enter');
  record('lesson request submitted', true, `"teach me the ${ASK}"`);

  // Drive to a fork. Deep-dive tiles render on the fork panel, the leaf panel
  // and the branch panel — take whichever appears first.
  const deepDive = p.locator(
    '[data-testid^="walkthrough-fork-deepdive-"], [data-testid^="walkthrough-leaf-deepdive-"]',
  ).first();
  const started = Date.now();
  let reached = false;
  while (Date.now() - started < 300000) {
    if (await deepDive.isVisible().catch(() => false)) { reached = true; break; }
    // Nudge the walk forward without picking a fork branch (which would leave
    // the fork panel and its deep-dive tiles).
    try {
      const skip = p.locator('[data-testid="walkthrough-skip"]').first();
      if (await skip.isVisible({ timeout: 400 })) await skip.click({ force: true });
    } catch { /* nothing to nudge */ }
    await p.waitForTimeout(2000);
  }
  record('a Deep-dive tile is reachable', reached, `${Math.round((Date.now() - started) / 1000)}s`);
  if (!reached) throw new Error('never reached a deep-dive tile');

  deepDiveLabel = (await deepDive.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
  await deepDive.click({ force: true });
  record('Deep-dive tile tapped', true, deepDiveLabel.slice(0, 70));

  // THE ASSERTION. Give the teach tiers their cold-gen budget, then read the
  // page: a lesson must be running, and none of the dead-end signatures may
  // be on screen.
  const tapAt = Date.now();
  let lessonBack = false;
  while (Date.now() - tapAt < 240000 && !lessonBack) {
    await p.waitForTimeout(3000);
    for (const sel of [
      '[data-testid="walkthrough-skip"]',
      '[data-testid="walkthrough-fork-panel"]',
      '[data-testid="walkthrough-leaf-panel"]',
      '[data-testid="walkthrough-progress"]',
    ]) {
      if (await p.locator(sel).first().isVisible().catch(() => false)) { lessonBack = true; break; }
    }
  }
  const body = (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  record('a lesson is running after the tap (not a chat dead-end)', lessonBack,
    `${Math.round((Date.now() - tapAt) / 1000)}s`);
  for (const d of DEAD_ENDS) {
    record(`no "${d.id}" dead-end on screen`, !d.re.test(body),
      d.re.test(body) ? 'FOUND — the tap routed to chat' : '');
  }
  record('the coach spoke during the dive', ttsTexts.length > 0, `${ttsTexts.length} tts request(s)`);
  record('no page errors', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  await writeFile('/tmp/forkdive-body.txt', body.slice(0, 12000)).catch(() => undefined);
} catch (e) {
  record('run completed without throwing', false, String(e).slice(0, 160));
}

// ── THE RETURNING-VISITOR CASE ────────────────────────────────────────────
// The run above deep-dives an opening this context has never seen, so
// `walkthroughDone` is false and the returning-visitor chooser can never fire.
// That is a happy path, and it is why this audit was 11/11 green while the
// tile was broken in David's hands (2026-08-01: "the deep dive main line wasnt
// working for me"). His opening was already COMPLETED, so the tap answered
// with a chooser instead of a lesson — the stream caught `chooser shown for
// "…Lasker Variation" (previously completed)` one second after the deep-dive
// routed. A Deep dive is a TAP on a named line: it must start that lesson.
try {
  // Ask for the SAME opening again. Whatever the first pass completed is now
  // in the "already watched" state, which is exactly the state that broke.
  const box2 = p.locator('[data-testid="chat-text-input"]');
  await box2.waitFor({ timeout: 20000 });
  await box2.click();
  await box2.pressSequentially(`teach me the ${ASK}`, { delay: 12 });
  await box2.press('Enter');

  const dive2 = p.locator(
    '[data-testid^="walkthrough-fork-deepdive-"], [data-testid^="walkthrough-leaf-deepdive-"]',
  ).first();
  const t2 = Date.now();
  let reached2 = false;
  while (Date.now() - t2 < 240000) {
    if (await dive2.isVisible().catch(() => false)) { reached2 = true; break; }
    await p.waitForTimeout(1000);
  }
  if (!reached2) {
    record('returning visitor: a Deep-dive tile is reachable', false, 'never surfaced on the second pass');
  } else {
    await dive2.click({ force: true });
    await p.waitForTimeout(6000);
    // THE ASSERTION. A chooser here means the tap did not start a lesson.
    // The REAL testid, verified in CoachTeachPage (phase === 'choose-mode' →
    // data-testid="walkthrough-choose-mode"). Asserting on a testid that does
    // not exist is worse than no assertion: it can never fail, so it reports
    // coverage the run never had.
    const chooser = await p.locator('[data-testid="walkthrough-choose-mode"]')
      .first().isVisible().catch(() => false);
    record('returning visitor: Deep dive does NOT answer with a chooser', !chooser,
      chooser ? 'chooser intercepted the tap — the lesson never started' : '');
    // And it must actually be teaching, not merely "not a chooser".
    const teaching = await p.locator('[data-testid="walkthrough-skip"], [data-testid="walkthrough-back"], [data-testid^="walkthrough-fork-option-"]')
      .first().isVisible().catch(() => false);
    record('returning visitor: a lesson is running after the tap', teaching,
      teaching ? '' : 'no walkthrough controls on screen');
  }
} catch (err) {
  record('returning visitor: deep dive on a completed opening', false, String(err).slice(0, 120));
}

await b.close();
await listener.stop().catch(() => undefined);

// Instrument 2: the prod stream delta = exactly this run.
const after = await pullStream();
const beforeIds = new Set(before.map((e) => `${e.timestamp}|${e.kind}|${e.summary}`));
const delta = after.filter((e) => !beforeIds.has(`${e.timestamp}|${e.kind}|${e.summary}`));
console.log(`\n  [audit-stream] ${delta.length} new event(s) this run (listener captured ${listener.getCapturedEvents().length})`);
for (const e of delta.filter((e) => /deepDive|surfaceRouting|teachRescue|auto-paused|llm-error|pickFork/i.test(`${e.kind} ${e.source} ${e.summary}`)).slice(-10)) {
  console.log(`    ${e.source} | ${(e.summary ?? '').slice(0, 120)}`);
}
// A stream event proving the tap re-entered TEACH routing rather than the
// brain. The signal is the GENERATOR picking up the deep-dive's own canonical
// name (a cache lookup / fresh generation / background stage gen for it) —
// that only happens on the teach path. Informational when the stream is
// unavailable (no secret in env).
// A sub-variation name is always LONGER than the name the walk started on, so
// a generator event quoting a >60-char opening name is the deep-dive's — and
// >60 is exactly the cap that used to send it to the brain instead.
const routedToTeach = delta.some((e) =>
  /openingGenerator/i.test(e.source ?? '')
  && [...(e.summary ?? '').matchAll(/"([^"]{61,})"/g)].length > 0);
const autoPaused = delta.some((e) => /auto-paused walkthrough/i.test(e.summary ?? ''));
if (delta.length > 0) {
  record('stream shows teach routing after the tap', routedToTeach, routedToTeach ? '' : 'no teach-routing event');
  record('stream shows NO ask-a-question auto-pause', !autoPaused, autoPaused ? 'auto-pause fired' : '');
}

const failed = results.filter((r) => !r.pass);
console.log(`\n── fork deep-dive: ${results.length - failed.length}/${results.length} green ──`);
process.exit(failed.length === 0 ? 0 : 1);
