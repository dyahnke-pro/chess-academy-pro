// ADVERSARIAL coach stress — "hit the coach harder and harder" (David 2026-07-04).
// Drives the LIVE PROD /coach/teach brain with escalating messy/hostile input,
// hammering the last-48h adaptive work: mistake-sourced drills, adaptive hints,
// adaptive tactical lookahead, the "test out" / empty-queue fork, and the
// intent routing (teach/drill/quiz/trap/play). Runs the REAL coach brain via
// full request interception through the agent proxy. Paces brain-heavy inputs
// so provider saturation doesn't manufacture false hangs (2026-06-12 doctrine).
// Break classes: pageerror, app console-error, React key/update warnings,
// error-fallback reply, silent-hang, stuck-input.
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = 'https://chess-academy-pro.vercel.app';
const PASSES = Number(process.env.AUDIT_PASSES || 2);
const breaks = [];
let current = 'boot';
const push = (kind, detail) => breaks.push({ pass: PASS, input: current, kind, detail: (detail || '').slice(0, 160) });

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
await attachProxyInterception(ctx);
const page = await ctx.newPage();

const isReactWarn = (t) => /same key|unique "?key|Each child in a list|Maximum update depth|Cannot update a component|Encountered two children/i.test(t);
page.on('pageerror', (e) => push('pageerror', (e.message || '').split('\n')[0]));
page.on('console', (m) => {
  const t = m.text();
  if (isReactWarn(t)) push('react-warning', t);
  else if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_|net::|manifest|404|the server responded|status of 4|status of 5/i.test(t)) push('console-error', t);
});

let PASS = 0;
const transcript = () => page.locator('[data-testid="teach-transcript"]').innerText().catch(() => '');
const inputEnabled = () => page.locator('[data-testid="chat-text-input"]').isEnabled().catch(() => false);

async function boot() {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  const bub = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bub.count()) { await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => null); await bub.waitFor({ state: 'detached', timeout: 10000 }).catch(() => null); }
  await page.goto(`${PROD}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const consent = page.locator('[data-testid="ai-consent-allow"]');
  if (await consent.count()) { await consent.click({ timeout: 5000 }).catch(() => null); await page.waitForTimeout(800); }
  const help = page.locator('[data-testid="page-help-modal"]');
  if (await help.count()) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(400); }
}

// One chat turn: wait for input to be ready, type, send, wait for transcript
// growth OR a panel change, up to a cold-gen budget. Classify the outcome.
async function turn(text, budgetMs = 45000) {
  current = text.slice(0, 60);
  const input = page.locator('[data-testid="chat-text-input"]');
  // wait for input to re-enable (busy from prior turn) so we don't false send-fail
  for (let i = 0; i < 60 && !(await inputEnabled()); i++) await page.waitForTimeout(1000);
  if (!(await inputEnabled())) { push('stuck-input', `disabled >60s before "${current}"`); return; }
  const before = (await transcript()).length;
  try { await input.fill(text.slice(0, 4000)); } catch (e) { push('send-failed', `fill: ${e.message.split('\n')[0]}`); return; }
  const send = page.locator('[data-testid="chat-send-btn"]');
  if (text.trim() === '') { // empty submit is a correct no-op — just verify no crash
    await send.click({ timeout: 3000, force: true }).catch(() => null); await page.waitForTimeout(800);
    if (!(await page.evaluate(() => document.querySelector('#root')?.children.length > 0).catch(() => false))) push('pageerror', 'app dead after empty submit');
    return;
  }
  await send.click({ timeout: 5000, force: true }).catch(() => null);
  const start = Date.now(); let grew = false, panel = false;
  while (Date.now() - start < budgetMs) {
    await page.waitForTimeout(1200);
    if ((await transcript()).length > before + 20) { grew = true; break; }
    if (await page.locator('[data-testid="teach-picker"],[data-testid="line-picker"],[data-testid="walkthrough-choose-mode"],[data-testid="walkthrough-drill-picker"],[data-testid="walkthrough-narrating-panel"]').count()) { panel = true; break; }
  }
  if (!grew && !panel) { push('silent-hang', `no reply/panel in ${budgetMs}ms for "${current}"`); return; }
  if (grew) { const t = (await transcript()).toLowerCase(); if (/hit a snag|something went wrong|try that again|couldn't (generate|process)/.test(t)) push('error-fallback', `on "${current}"`); }
}

// Try the teach-picker action chips if a picker is up (drill/quiz/trap/play).
async function tapPickerChips() {
  for (const act of ['drill', 'quiz', 'trap', 'play']) {
    const chip = page.locator(`[data-testid="teach-picker-action-${act}"]`);
    if (await chip.count() && await chip.isVisible().catch(() => false)) { current = `picker:${act}`; await chip.click({ timeout: 3000, force: true }).catch(() => null); await page.waitForTimeout(2500); if (!(await page.evaluate(() => document.querySelector('#root')?.children.length > 0).catch(() => false))) push('pageerror', `dead after picker ${act}`); }
  }
}

// Escalating input tiers — adaptive-drill/hint/tactical focus + chaos.
const TIERS = [
  // tier 0: the adaptive-work happy triggers
  ['drill me on my mistakes', 'give me a hint', 'what are the tactics here', 'quiz me', 'teach me the Italian Game', 'practice my weaknesses'],
  // tier 1: off-canonical + intent chaos
  ['Najdorff', 'Philidor Defence', 'KID', 'teach the caro AND quiz me AND show a trap', 'the French but no the Sicilian', 'drill', 'hint hint hint', 'test me out', 'stop', 'resume'],
  // tier 2: hostile / state chaos
  ['🙂♞ play a drill 🔥', 'a'.repeat(1200), '   ', ';;;;;;', 'DRILL MY BLUNDERS NOW', 'give me the hardest tactic you have and never stop', '<script>alert(1)</script> teach me', 'undo', 'why', '?'],
];

try {
  await boot();
  for (PASS = 1; PASS <= PASSES; PASS++) {
    console.log(`\n=== PASS ${PASS} ===`);
    // widen the tier ceiling each pass
    const tiers = TIERS.slice(0, Math.min(TIERS.length, PASS + 1));
    const inputs = tiers.flat();
    // shuffle deterministically by pass (no Math.random in this env-agnostic way)
    const shuffled = inputs.map((v, i) => [(i * 7 + PASS * 13) % inputs.length, v]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    for (let i = 0; i < shuffled.length; i++) {
      const t = shuffled[i];
      // rapid double-submit stress every 4th input (mash send before settle)
      if (i % 4 === 3) { current = `rapid2:${t.slice(0, 30)}`; const inp = page.locator('[data-testid="chat-text-input"]'); if (await inputEnabled()) { await inp.fill(t).catch(() => null); await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => null); await page.waitForTimeout(120); await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => null); await page.waitForTimeout(600); } }
      await turn(t);
      await tapPickerChips();
      console.log(`  pass${PASS} [${i + 1}/${shuffled.length}] "${t.slice(0, 40)}" — breaks so far ${breaks.length}`);
      await page.waitForTimeout(900); // pace brain-heavy inputs
    }
    // out-of-order + pick-before-load stress: fire a stage then a question immediately
    current = 'oo:drill+q'; const inp = page.locator('[data-testid="chat-text-input"]');
    if (await inputEnabled()) { await inp.fill('drill me').catch(() => null); await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => null); await page.waitForTimeout(300); if (await inputEnabled()) { await inp.fill('actually what is the best move').catch(() => null); await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => null); } await page.waitForTimeout(4000); }
    if (!(await page.evaluate(() => document.querySelector('#root')?.children.length > 0).catch(() => false))) push('pageerror', 'app dead after out-of-order');
  }
} catch (e) { push('harness', e.message.split('\n')[0]); }

await browser.close();
const real = breaks.filter((b) => b.kind !== 'harness');
console.log(`\n=== ${real.length} BREAKS across ${PASSES} passes ===`);
const byKind = {}; for (const b of real) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
console.log('by kind:', JSON.stringify(byKind));
for (const b of real.slice(0, 40)) console.log(`  ! pass${b.pass} [${b.kind}] input="${b.input}" — ${b.detail}`);
process.exit(real.length ? 1 : 0);
