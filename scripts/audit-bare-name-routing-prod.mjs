#!/usr/bin/env node
/**
 * audit-bare-name-routing-prod
 * ----------------------------
 * A real user's "Did I have any good moves" was taken as an OPENING NAME on
 * /coach/teach and pushed through the full pipeline — registry, cache, then a
 * ~60s LLM generation (`opening-cache-miss: "Did I have any good moves" ->
 * fresh generation`, prod 2026-09-02). The bare-name guard was `length <= 60 &&
 * !includes('?')`, while its own comment claimed sentences were excluded by
 * "a verb, > 60 chars, or end with ?/." — two thirds never implemented.
 *
 * This drives the REAL surface and asserts on the app's OWN audit events:
 *
 *   BN1  the question does NOT emit `opening-cache-miss` for its own text
 *        (that event IS the defect's signature — a generation being burned)
 *   BN2  the reply is not an opening picker ("did you mean one of these?")
 *   BN3  a genuine bare NAME still routes as an opening — the guard must not
 *        have over-reached, which is the real risk in a discriminator like this
 *
 * BN3 is what stops this passing for the wrong reason: a guard that rejected
 * everything would satisfy BN1 and BN2 and break the feature.
 *
 * AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY node scripts/audit-bare-name-routing-prod.mjs
 */
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const QUESTION = 'Did I have any good moves';
const REAL_NAME = 'The Vienna';

const events = [];
const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(muteTtsForAudit);
const page = await ctx.newPage();

// Capture the app's own audit POSTs locally — no secret needed.
await page.route('**/api/audit-stream**', async (route) => {
  const req = route.request();
  if (req.method() === 'POST') {
    try {
      const parsed = JSON.parse(req.postData() || '');
      for (const e of (Array.isArray(parsed) ? parsed : parsed.events || [parsed])) events.push(e);
    } catch { /* ignore */ }
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
});

const results = [];
const record = (id, pass, detail) => {
  results.push({ id, pass, detail });
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id} — ${detail}`);
};

async function dismissGates() {
  try {
    const bubble = page.locator('[data-testid="strength-calibration-bubble"]');
    await bubble.waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('[data-testid="skill-band-intermediate"]').click();
    await bubble.waitFor({ state: 'detached', timeout: 15_000 });
  } catch { /* none */ }
  try {
    const consent = page.locator('[data-testid="ai-consent-modal"]');
    await consent.waitFor({ state: 'visible', timeout: 8000 });
    await page.locator('[data-testid="ai-consent-allow"]').click();
    await consent.waitFor({ state: 'detached', timeout: 10_000 });
  } catch { /* none */ }
}

/** Type through the REAL textarea. `fill` leaves the send button disabled —
 *  the React input needs genuine key events. */
async function ask(text) {
  const box = page.locator('textarea').first();
  await box.waitFor({ state: 'visible', timeout: 20_000 });
  await box.click();
  await box.pressSequentially(text, { delay: 12 });
  await page.keyboard.press('Enter');
}

try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await dismissGates();

  // ── The question that used to burn a generation ──────────────────────────
  const mark = events.length;
  await ask(QUESTION);
  await page.waitForTimeout(30_000); // generous: a REGRESSION would start a ~60s gen

  const after = events.slice(mark);
  const cacheMiss = after.filter(
    (e) => e?.kind === 'opening-cache-miss' && String(e?.summary ?? '').includes('Did I have any good moves'),
  );
  record('BN1 no generation burned', cacheMiss.length === 0,
    cacheMiss.length === 0
      ? 'no opening-cache-miss for the question text'
      : `opening-cache-miss fired: ${String(cacheMiss[0].summary).slice(0, 120)}`);

  const body = (await page.locator('body').innerText()).toLowerCase();
  const picker = /did you mean|exact opening mapped/.test(body);
  record('BN2 not routed to the opening picker', !picker,
    picker ? 'reply offered an opening picker' : 'no picker offered');

  // ── BN3: a real bare NAME must still route ───────────────────────────────
  // Without this the audit would pass for a guard that rejects everything.
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await dismissGates();
  const mark2 = events.length;
  await ask(REAL_NAME);
  await page.waitForTimeout(25_000);
  const after2 = events.slice(mark2);
  const routed = after2.some((e) =>
    ['opening-cache-miss', 'coach-surface-migrated', 'walkthrough-started', 'opening-cache-hit'].includes(String(e?.kind))
    || /vienna/i.test(String(e?.summary ?? '')));
  record('BN3 a real opening name still routes', routed,
    routed ? `"${REAL_NAME}" entered the opening pipeline` : `"${REAL_NAME}" no longer routes — the guard OVER-REACHED`);
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} green`);
  if (failed.length) process.exitCode = 1;
}
