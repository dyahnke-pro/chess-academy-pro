#!/usr/bin/env node
/**
 * audit-coach-grounding-coverage — the item-#7 COVERAGE instrument for the
 * coach-grounding unification. It answers the one question that gates the ship:
 * "what fraction of coach LLM turns are GROUNDED (LLM only voices computed
 * facts) vs still FREE-LLM (grounded=false)?" — and WHICH intents/questions
 * fall through, so the fall-through rate can be driven toward ~0.
 *
 * How: it drives a coverage battery of real questions through the /coach/teach
 * chat, captures every `coach-llm-call` audit event via the narration-listener
 * sidecar (the app POSTs audits to the listener when auditStreamUrl points at
 * it), then tallies grounded=true vs grounded=false per intent and lists the
 * exact questions that fell through. This is NOT the adversarial break-it loop
 * (that's audit-coach-grounded-loop.mjs) — this MEASURES coverage.
 *
 * Runs against a local dev server built from the feature branch (measures the
 * NEW build's coverage BEFORE the prod ship) or against prod post-deploy:
 *   AUDIT_SANDBOX=1 AUDIT_SMOKE_URL=http://127.0.0.1:8099 \
 *     node scripts/audit-coach-grounding-coverage.mjs
 *
 * Note: `coach-llm-call` is an audit-stream-only event (NOT mirrored to
 * PostHog via AUDIT_EVENT_MAP), so coverage is captured through the live
 * listener during the run, not from durable analytics. `coach-brain-ask-received`
 * IS in PostHog (event `coach_question_asked`) for the real question distribution.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
import { startAuditListener } from './audit-lib/audit-listener.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'http://127.0.0.1:8099';
const ASK_GAP_MS = Number(process.env.AUDIT_ASK_GAP_MS ?? 2600);
const ANSWER_TIMEOUT_MS = Number(process.env.AUDIT_ANSWER_TIMEOUT_MS ?? 60_000);

// The coverage battery — a representative spread across the grounded families
// PLUS deliberate off-taxonomy probes that SHOULD land on the safe grounded
// default (never free-LLM chess). Every entry that produces grounded=false is a
// leak to close.
const BATTERY = [
  // self-knowledge (should be grounded)
  'what are my weaknesses?', "what's my rating?", "what's my best opening?", "what's my weakest opening?",
  'how are my tactics?', 'which phase am I weakest in?', 'how often do I blunder?', "what's due for review?",
  'am I better as White or Black?', "what's my puzzle rating?", 'am I improving?', 'what should I work on?',
  'how do I do against the Sicilian?', 'my record against Magnus', 'was that a good move?', 'rate my last move',
  // openings / theory / pros / concepts / plans (should be grounded)
  'how do you teach the Caro-Kann?', 'what does the Tactics tab do?', 'is voice on?', "what's a fork?",
  'what traps can I play in the Italian?', 'how do masters play the French?', "what's my plan here?",
  'how do I win a rook endgame?',
  // off-taxonomy probes — must NOT free-LLM; land on the safe default
  'is this position winning for me?', 'what should I be thinking about?', 'give me general chess advice',
  'how do I get better at chess?', 'what makes a good move?', 'why did my opponent do that?',
];

const REPORT_DIR = `audit-reports/coach-grounding-coverage-${nowStamp()}`;

function nowStamp() {
  // No Date.now() in workflow-land, but plain node scripts have it.
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function typeAndSend(page, text) {
  const input = page.locator('[data-testid="coach-chat-input"], textarea, input[type="text"]').first();
  await input.waitFor({ state: 'visible', timeout: 15_000 });
  await input.fill(text);
  await input.press('Enter');
}

async function assistantCount(page) {
  return page.evaluate(() => document.querySelectorAll('[data-testid="chat-message-assistant"]').length).catch(() => 0);
}

async function waitForReply(page, preCount, timeout) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if ((await assistantCount(page)) > preCount) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

async function run() {
  const listener = await startAuditListener();
  const exe = await resolveChromiumExecutable(false);
  const browser = await chromium.launch({ headless: true, executablePath: exe, args: sandboxLaunchArgs() });
  const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'AuditGroundingCoverageBot/1.0 (chromium)' });
  await ctx.addInitScript(autoDismissCalibration);
  // Point the app's audit stream at the local listener + auto-grant AI consent.
  // The listener 401s any POST whose x-audit-secret != its own secret, so the
  // app's auditStreamSecret MUST be listener.secret or nothing is captured.
  await ctx.addInitScript(({ streamUrl, streamSecret }) => {
    try {
      localStorage.setItem('auditStreamUrl', streamUrl);
      localStorage.setItem('auditStreamSecret', streamSecret);
    } catch { /* */ }
    const sweep = () => { const a = document.querySelector('[data-testid="ai-consent-allow"]'); if (a instanceof HTMLElement) a.click(); };
    const start = () => { if (!document.body) { setTimeout(start, 50); return; } new MutationObserver(sweep).observe(document.body, { childList: true, subtree: true }); sweep(); };
    start(); setInterval(sweep, 400);
  }, { streamUrl: listener.url, streamSecret: listener.secret });

  const page = await ctx.newPage();
  const pageErrs = [];
  page.on('pageerror', (e) => pageErrs.push(String(e).slice(0, 160)));

  console.log(`[coverage] driving ${BATTERY.length} questions at ${BASE}/coach/teach`);
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.locator('[data-testid="coach-teach-page"]').waitFor({ timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const asked = [];
  for (let i = 0; i < BATTERY.length; i++) {
    const q = BATTERY[i];
    const pre = await assistantCount(page);
    process.stdout.write(`  [${i + 1}/${BATTERY.length}] "${q.slice(0, 48)}" … `);
    try {
      await typeAndSend(page, q);
      const got = await waitForReply(page, pre, ANSWER_TIMEOUT_MS);
      console.log(got ? 'replied' : 'no-reply');
      asked.push({ q, replied: got });
    } catch (e) {
      console.log('send-failed');
      asked.push({ q, replied: false, error: String(e).slice(0, 80) });
    }
    await page.waitForTimeout(ASK_GAP_MS);
  }

  // Give any in-flight audit POSTs a moment to land on the listener.
  await page.waitForTimeout(2500);
  const events = listener.getCapturedEvents();
  await browser.close();
  await listener.stop?.();

  // ── Tally coverage from coach-grounding-coverage events (lane + question) ────
  // Every FALL-THROUGH lane emits one (safe-default-position / safe-default-stock
  // / conversational / general-free-compose), tagged with the question. A turn
  // the ASSEMBLERS answered emits NONE — so assembler-grounded is inferred by
  // absence. `general-free-compose` is THE hole: an intent engaged grounding but
  // no assembler answered and the LLM reasoned freely. Those questions are the
  // assembler gaps to close before the spine free-compose can be deleted.
  const cov = events
    .filter((e) => e.kind === 'coach-grounding-coverage')
    .map((e) => {
      let d = {};
      try { d = typeof e.details === 'string' ? JSON.parse(e.details) : (e.details ?? {}); } catch { /* */ }
      return { lane: d.lane ?? 'unknown', question: d.question ?? null, surface: d.surface ?? '?' };
    });

  const byLane = {};
  for (const c of cov) byLane[c.lane] = (byLane[c.lane] ?? 0) + 1;
  const freeCompose = cov.filter((c) => c.lane === 'general-free-compose');
  const askedCount = asked.length;
  const fellThrough = cov.length; // any coverage event = a fall-through lane
  const assemblerGrounded = Math.max(0, askedCount - fellThrough);
  const holeRate = askedCount > 0 ? freeCompose.length / askedCount : null;

  console.log('\n══════════ COACH GROUNDING COVERAGE ══════════');
  console.log(`questions asked: ${askedCount} | coverage events: ${cov.length}`);
  if (cov.length === 0) {
    console.log('⚠ NO coach-grounding-coverage events captured — either every turn was');
    console.log('  assembler-grounded (great) OR the listener wasn\'t wired (auditStreamUrl).');
    console.log('  Cross-check: if replies came back, the assemblers covered them all.');
  }
  console.log(`\nassembler-grounded (no fall-through event): ~${assemblerGrounded}/${askedCount}`);
  console.log('fall-through lanes:');
  for (const [lane, n] of Object.entries(byLane).sort((a, b) => b[1] - a[1])) {
    const flag = lane === 'general-free-compose' ? '  ← THE HOLE (free-LLM)' : lane.startsWith('safe-default') ? '  (grounded default, safe)' : '';
    console.log(`  ${lane.padEnd(26)} ${String(n).padStart(3)}${flag}`);
  }
  console.log(`\ngeneral-free-compose rate: ${holeRate === null ? 'n/a' : (holeRate * 100).toFixed(1) + '%'}  ← drive to 0 before ripping 3606`);
  if (freeCompose.length) {
    console.log('\nQUESTIONS THAT HIT THE FREE-COMPOSE (build an assembler for each):');
    for (const l of freeCompose.slice(0, 40)) console.log(`  [${l.surface}] ${l.question ?? '(no question captured)'}`);
  }
  if (pageErrs.length) console.log(`\n⚠ ${pageErrs.length} page error(s) during the run — see report.`);

  mkdirSync(REPORT_DIR, { recursive: true });
  const report = { base: BASE, asked, askedCount, coverageEvents: cov, byLane, assemblerGrounded, freeCompose, holeRate, pageErrs };
  writeFileSync(`${REPORT_DIR}/report.json`, JSON.stringify(report, null, 2));
  console.log(`\nreport: ${REPORT_DIR}/report.json`);

  // Non-zero exit when the free-compose hole was hit, so CI / a wrapper can gate.
  if (freeCompose.length > 0) process.exitCode = 1;
}

run().catch((e) => { console.error('[coverage] fatal:', e); process.exit(2); });
