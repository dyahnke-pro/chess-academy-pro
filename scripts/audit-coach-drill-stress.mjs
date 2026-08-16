// ADVERSARIAL drill-loop stress — the 48h adaptive-drill feature specifically
// (David 2026-07-04: "hit the coach harder"). Requests mistake-sourced drills,
// hammers the in-place board + hint ladder, hijacks mid-drill, and drains to
// the caught-up/empty-queue fork. Live prod brain via full proxy interception.
import { chromium } from 'playwright';
import { attachProxyInterception } from './audit-lib/proxy-intercept.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const PROD = 'https://chess-academy-pro.vercel.app';
const breaks = [];
let current = 'boot';
const push = (kind, detail) => breaks.push({ input: current, kind, detail: (detail || '').slice(0, 150) });

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
  await ctx.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
await attachProxyInterception(ctx);
const page = await ctx.newPage();
const isReactWarn = (t) => /same key|unique "?key|Each child in a list|Maximum update depth|Cannot update a component|Encountered two children/i.test(t);
page.on('pageerror', (e) => push('pageerror', (e.message || '').split('\n')[0]));
page.on('console', (m) => { const t = m.text(); if (isReactWarn(t)) push('react-warning', t); else if (m.type() === 'error' && !/favicon|Failed to load resource|ERR_|net::|404|the server responded|status of [45]/i.test(t)) push('console-error', t); });

const alive = async () => (await page.evaluate(() => document.querySelector('#root')?.children.length > 0).catch(() => false)) === true;
const inputEnabled = () => page.locator('[data-testid="chat-text-input"]').isEnabled().catch(() => false);
async function send(text) {
  current = text.slice(0, 50);
  for (let i = 0; i < 60 && !(await inputEnabled()); i++) await page.waitForTimeout(1000);
  if (!(await inputEnabled())) { push('stuck-input', `disabled before "${current}"`); return; }
  await page.locator('[data-testid="chat-text-input"]').fill(text).catch(() => null);
  await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => null);
}
// Detect any drill surfacing: an in-place drill panel/board, a routed drill, or
// a coach reply that offered a drill/caught-up state.
async function drillState() {
  const sels = ['[data-testid="drill-mode"]', '[data-testid="drill-progress"]', '[data-testid="walkthrough-drill-active"]', '[data-testid="walkthrough-drill-picker"]', '[data-square="e4"]', '[data-square="e2"]'];
  for (const s of sels) if (await page.locator(s).count()) return s;
  return null;
}
async function mashHints() {
  for (const h of ['hint-btn', 'hint-button', 'from-games-hint', 'calc-hint']) {
    const b = page.locator(`[data-testid="${h}"]`);
    if (await b.count() && await b.isVisible().catch(() => false)) for (let k = 0; k < 4; k++) { await b.click({ force: true, timeout: 1500 }).catch(() => null); await page.waitForTimeout(250); }
  }
}
async function playBoard(bad) {
  // click a couple of squares (a legal-ish and a nonsense move) to stress the drill move handler
  const seqs = bad ? [['a2', 'a3'], ['h7', 'a1']] : [['e2', 'e4'], ['g1', 'f3']];
  for (const [from, to] of seqs) { const f = page.locator(`[data-square="${from}"]`), t = page.locator(`[data-square="${to}"]`); if (await f.count() && await t.count()) { await f.click({ force: true, timeout: 1200 }).catch(() => null); await page.waitForTimeout(150); await t.click({ force: true, timeout: 1200 }).catch(() => null); await page.waitForTimeout(400); } }
}

try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  const bub = page.locator('[data-testid="strength-calibration-bubble"]');
  if (await bub.count()) { await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 4000 }).catch(() => null); await bub.waitFor({ state: 'detached', timeout: 10000 }).catch(() => null); }
  await page.goto(`${PROD}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const consent = page.locator('[data-testid="ai-consent-allow"]'); if (await consent.count()) { await consent.click({ timeout: 5000 }).catch(() => null); await page.waitForTimeout(800); }
  const help = page.locator('[data-testid="page-help-modal"]'); if (await help.count()) { await page.keyboard.press('Escape').catch(() => null); await page.waitForTimeout(400); }

  const REQUESTS = ['drill me on my mistakes', 'give me a drill', 'practice my blunders', 'drill me', 'quiz me on tactics', 'set up a drill on the board', 'test me out', "I'm caught up, next drill", 'drill drill drill', 'harder drill now'];
  for (let cyc = 0; cyc < REQUESTS.length; cyc++) {
    console.log(`  cycle ${cyc + 1}/${REQUESTS.length}: "${REQUESTS[cyc]}" — breaks ${breaks.length}`);
    await send(REQUESTS[cyc]);
    // wait for a reply/panel/drill
    const start = Date.now(); let ds = null;
    while (Date.now() - start < 45000) { await page.waitForTimeout(1200); ds = await drillState(); if (ds) break; const t = await page.locator('[data-testid="teach-transcript"]').innerText().catch(() => ''); if (/caught up|no games|upload|no drills|snag|went wrong/i.test(t)) { if (/snag|went wrong/i.test(t)) push('error-fallback', `on "${current}"`); break; } }
    if (ds) { current = `drill-play(${ds})`; await mashHints(); await playBoard(cyc % 2 === 0); await mashHints();
      // mid-drill hijack: request another drill / switch intent while one is up
      await send(cyc % 2 ? 'switch to the Sicilian instead' : 'give me a different drill'); await page.waitForTimeout(2500); }
    if (!(await alive())) { push('pageerror', `app dead after cycle ${cyc + 1}`); break; }
    await page.waitForTimeout(800);
  }
  // final rapid-fire drill hijack storm
  current = 'drill-storm';
  for (let i = 0; i < 6; i++) { if (await inputEnabled()) { await page.locator('[data-testid="chat-text-input"]').fill('drill').catch(() => null); await page.locator('[data-testid="chat-send-btn"]').click({ force: true }).catch(() => null); } await page.waitForTimeout(400); }
  await page.waitForTimeout(4000);
  if (!(await alive())) push('pageerror', 'app dead after drill-storm');
} catch (e) { push('harness', e.message.split('\n')[0]); }

await browser.close();
const real = breaks.filter((b) => b.kind !== 'harness');
console.log(`\n=== ${real.length} DRILL BREAKS ===`);
const byKind = {}; for (const b of real) byKind[b.kind] = (byKind[b.kind] || 0) + 1;
console.log('by kind:', JSON.stringify(byKind));
for (const b of real.slice(0, 30)) console.log(`  ! [${b.kind}] input="${b.input}" — ${b.detail}`);
process.exit(real.length ? 1 : 0);
