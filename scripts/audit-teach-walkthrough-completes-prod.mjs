#!/usr/bin/env node
/**
 * audit-teach-walkthrough-completes — a taught line must REACH ITS END.
 *
 * David 2026-08-20: *"We need to extend the copy cat into the middle game and
 * get the watch middle and endgame working."* The Vienna Copycat narrates a few
 * nodes on /coach/teach and then sits in the `narrating` phase forever — no
 * error, no advance, no leaf, so no "Watch the middlegame and endgame" chip.
 *
 * WHAT THIS AUDIT EXISTS TO STOP A SESSION BELIEVING. Three plausible causes
 * were each measured and killed, and every one of them looked right first:
 *   - "it is slow"          — identical stop at a 600s and a 1500s budget.
 *   - "the TTS mock hangs"  — `blockTtsNetwork` fulfils a 32-byte silent frame
 *                             that may never fire `ended`, and auto-advance is
 *                             voice-promise gated. But `muteTtsForAudit`, which
 *                             RESOLVES the promise on a text-proportional
 *                             delay, stalls identically. Not the instrument.
 *   - "the narration is missing" — the Copycat's hand-written coverage was
 *                             5/15 plies with a seven-ply hole from ply 8-14;
 *                             filling it to 12/15 changed nothing. Content and
 *                             stall are two different bugs.
 *
 * WHAT THE EVIDENCE ACTUALLY SHOWS. One walkthrough makes ~5 calls to
 * `/api/llm/deepseek/chat/completions` and a call to `/api/lichess-explorer`
 * that came back 429. So the lesson depends on a runtime LLM round-trip and a
 * rate-limited explorer read — which is the thing that must not be true:
 * walkthrough teachings are baked, hand-written, or computed, never generated
 * at runtime. A lesson that cannot finish without the network is the defect;
 * the silence is only how it presents.
 *
 * So this asserts the CONTRACT (the walk ends) and records the DIAGNOSIS (which
 * network calls a walkthrough made), because the second is what tells the next
 * session whether the architecture regressed again.
 *
 * Usage:
 *   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
 *   node scripts/audit-teach-walkthrough-completes-prod.mjs ["Vienna Game"] [Copycat]
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';

const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const OPENING = process.argv[2] ?? 'Vienna Game';
const VARIATION = process.argv[3] ?? 'Copycat';
const BUDGET_MS = Number(process.env.AUDIT_BUDGET_MS ?? 540_000);

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(false), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(autoDismissCalibration);
// MUTE, never block: the mute resolves the speak promise, so a stall measured
// under it is the app's and not the harness's.
await ctx.addInitScript(muteTtsForAudit);
const page = await ctx.newPage();

const api = new Map(), bad = [], errs = [];
page.on('response', (r) => {
  const u = r.url();
  if (/\/api\//.test(u)) {
    const k = `${u.split('?')[0].replace(BASE, '')} -> ${r.status()}`;
    api.set(k, (api.get(k) ?? 0) + 1);
  }
  if (r.status() >= 400) bad.push(`${r.status()} ${u.slice(0, 110)}`);
});
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });

let picked = false, reached = false, elapsed = 0;
try {
  await page.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  try { await page.locator('[data-testid="ai-consent-allow"]').click({ timeout: 8_000 }); } catch { /* consent already given */ }
  const box = page.locator('textarea').first();
  await box.waitFor({ timeout: 30_000 });
  // pressSequentially, not fill: the React textarea needs real key events or
  // send stays disabled and the message never submits.
  await box.pressSequentially(OPENING, { delay: 25 });
  await page.keyboard.press('Enter');
  try {
    const tile = page.getByText(new RegExp(VARIATION, 'i')).first();
    await tile.waitFor({ timeout: 120_000 });
    await tile.click();
    picked = true;
  } catch { /* no picker tile — the lesson may start on the main line */ }

  const step = 45_000;
  for (elapsed = step; elapsed <= BUDGET_MS; elapsed += step) {
    await page.waitForTimeout(step);
    const leaf = await page.locator('[data-testid="walkthrough-leaf-panel"]').count();
    const body = await page.locator('body').innerText().catch(() => '');
    if (leaf > 0 || /Watch the middlegame and endgame/i.test(body)) { reached = true; break; }
  }
} finally {
  const report = {
    base: BASE, opening: OPENING, variation: VARIATION,
    pickedVariationTile: picked, reachedLeaf: reached, waitedMs: Math.min(elapsed, BUDGET_MS),
    llmCallsDuringWalkthrough: [...api.entries()].filter(([k]) => /llm|deepseek|anthropic/i.test(k)),
    apiCalls: Object.fromEntries(api), nonOk: [...new Set(bad)].slice(0, 20), consoleErrors: [...new Set(errs)].slice(0, 20),
  };
  const dir = `audit-reports/teach-walkthrough-completes-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2));
  console.log(`[walkthrough-completes] ${OPENING} / ${VARIATION}`);
  console.log(`  picked tile      : ${picked}`);
  console.log(`  reached the leaf : ${reached}`);
  for (const [k, n] of [...api.entries()].sort()) console.log(`  ${String(n).padStart(4)}x ${k}`);
  if (report.llmCallsDuringWalkthrough.length) {
    console.log('  🚨 the walkthrough called an LLM at runtime — teachings must be baked, hand-written, or computed');
  }
  console.log(`  report: ${dir}/report.json`);
  console.log(reached ? '  RESULT: PASS' : '  RESULT: FAIL — the walk never ended');
  await browser.close();
  process.exit(reached ? 0 : 1);
}
