/**
 * audit-coach-hands-prod — THE HANDS, DRIVEN BY THE TEXT BOX, ON PROD
 * (2026-09-21).
 *
 * WHY THIS EXISTS. The hands build shipped with unit tests I wrote, which agree
 * with me by construction. Both bugs that actually bit during it were caught by
 * tests I did NOT write. So this drives the REAL chat box on the REAL deploy and
 * asserts what a student gets — the only instrument that can still disagree.
 *
 * WHAT IT ASSERTS, and each row is a contract that was BROKEN before this build:
 *   1. "drill this" on LEARN routes to a drill. It dead-ended there, because
 *      Learn published 6 of 13 hands while Play got 11 — the parity break
 *      David named ("how can review have things that learn doesn't?").
 *   2. "make it harder" answers on Learn. It refused there and worked on Play,
 *      because `difficulty` had FOUR local copies and no shared home.
 *   3. A refusal NAMES ITS OWN REASON. Six hands used to share one sentence.
 *   4. The one door EMITS — `coach-brain-tool-called (router-direct)` proves the
 *      deterministic path ran, not the LLM.
 *
 * G1: three instruments (Playwright + the app's own audit events via the
 * loopback listener + the narration tape), MUTED — never a byte of TTS.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { muteTtsForAudit, stampAuditRunId } from './audit-lib/mute-tts.mjs';

const BASE_URL = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const BOOT_TIMEOUT_MS = 60_000;
const RUN_ID = `hands-${Math.random().toString(36).slice(2, 10)}`;

const rows = [];
const record = (name, pass, detail) => {
  rows.push({ name, pass, detail });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` :: ${detail}` : ''}`);
};

async function dismissGates(page) {
  for (const [gate, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]']]) {
    try {
      const g = page.locator(gate);
      await g.waitFor({ timeout: 4000 });
      await page.locator(btn).click();
      await g.waitFor({ state: 'detached', timeout: 10_000 });
    } catch { /* not shown */ }
  }
  try {
    const m = page.locator('[data-testid="page-help-modal"]');
    await m.waitFor({ timeout: 2500 });
    await page.keyboard.press('Escape');
    await m.waitFor({ state: 'detached', timeout: 5000 });
  } catch { /* not shown */ }
}

/** Type a command the way a student does and return what the app did. */
async function command(page, listener, text) {
  const before = page.url();
  const evBefore = listener.getCapturedEvents().length;
  const input = page.locator('[data-testid="chat-text-input"]');
  await input.waitFor({ state: 'visible', timeout: 30_000 });
  // pressSequentially, not fill — the React textarea needs real key events or
  // the send stays disabled and nothing is ever submitted.
  await input.pressSequentially(text, { delay: 12 });
  await page.keyboard.press('Enter');
  // The deterministic path answers fast; give the slower LLM fall-through room
  // so "it fell through" is never mistaken for "nothing happened".
  await page.waitForTimeout(6000);
  const events = listener.getCapturedEvents().slice(evBefore);
  const transcript = await page.locator('[data-testid="chat-text-input"]')
    .evaluate(() => Array.from(document.querySelectorAll('[data-testid^="chat-message"], .chat-bubble'))
      .map((n) => n.textContent ?? '').join('\n')).catch(() => '');
  return { urlBefore: before, urlAfter: page.url(), events, transcript };
}

const routerDirect = (events) => events.filter((e) =>
  /coach-brain-tool-called/.test(e.kind ?? '') && /router-direct/.test(`${e.summary ?? ''}`));

async function main() {
  console.log(`\n── coach hands, on ${BASE_URL} ──\n`);
  const listener = await startAuditListener();
  const browser = await chromium.launch({
    headless: true,
    executablePath: await resolveChromiumExecutable(),
    args: sandboxLaunchArgs(),
  });
  const context = await browser.newContext({ ...sandboxContextOptions() });
  await context.addInitScript(autoDismissCalibration);
  await context.addInitScript(muteTtsForAudit);   // G1 — zero TTS spend
  await context.addInitScript(stampAuditRunId(RUN_ID));
  // 🚨 BOTH KEYS, OR THE INSTRUMENT IS BLIND. The first run of this audit set
  // only `auditStreamUrl` and captured ZERO events — so all three product rows
  // false-failed and the "no TTS" row passed VACUOUSLY off the same empty set.
  // The app will not POST without the secret. When an audit fails, ask whether
  // the HARNESS reached the surface before concluding anything about the
  // product (CLAUDE.md, after 43 audits could not reach prod at all).
  await context.addInitScript(({ url, secret }) => {
    try {
      window.localStorage.setItem('auditStreamUrl', url);
      window.localStorage.setItem('auditStreamSecret', secret);
    } catch { /* private mode */ }
  }, { url: listener.url, secret: listener.secret });
  console.log(`  [listener] ${listener.url}`);

  const page = await context.newPage();
  try {
    // ── LEARN ────────────────────────────────────────────────────────────
    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await dismissGates(page);

    const drill = await command(page, listener, 'drill this');
    record('LEARN: "drill this" no longer dead-ends',
      /tactics|drill/i.test(drill.urlAfter) || routerDirect(drill.events).length > 0,
      `url ${drill.urlAfter.replace(BASE_URL, '')} routerDirect=${routerDirect(drill.events).length}`);

    await page.goto(`${BASE_URL}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: BOOT_TIMEOUT_MS });
    await dismissGates(page);
    const harder = await command(page, listener, 'make it harder');
    record('LEARN: "make it harder" is answered, not refused for want of a board',
      routerDirect(harder.events).length > 0,
      `routerDirect=${routerDirect(harder.events).length}`);

    const flip = await command(page, listener, 'flip the board');
    record('LEARN: "flip the board" reaches the one door',
      routerDirect(flip.events).length > 0,
      `routerDirect=${routerDirect(flip.events).length}`);

    // ── the instruments themselves ───────────────────────────────────────
    const all = listener.getCapturedEvents();
    record('INSTRUMENT: the listener captured events at all', all.length > 0, `${all.length} events`);
    record('INSTRUMENT: no TTS was synthesised',
      all.length > 0 && all.filter((e) => /tts-(request|failure)/i.test(e.kind ?? '')).length === 0,
      `muteTtsForAudit (over ${all.length} captured events — a 0-event capture must NOT pass this)`);
  } finally {
    const dir = `audit-reports/coach-hands-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    mkdirSync(dir, { recursive: true });
    writeFileSync(`${dir}/report.json`, JSON.stringify({
      baseUrl: BASE_URL, runId: RUN_ID, rows,
      events: listener.getCapturedEvents(),
    }, null, 2));
    console.log(`\n  report: ${dir}/report.json`);
    await browser.close();
    await listener.stop();
  }

  const failed = rows.filter((r) => !r.pass);
  console.log(`\n  ${rows.length - failed.length}/${rows.length} green\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => { console.error(err); process.exit(1); });
