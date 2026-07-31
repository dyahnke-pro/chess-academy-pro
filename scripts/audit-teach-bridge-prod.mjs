// BAKED COMPARATIVE-BRIDGE AUDIBLE PROOF (David 2026-07-31: "narration that
// explains similarities and differences between what was already learned vs
// what is new"). Drives TWO visits in ONE context: visit 1 walks the opening
// to the leaf (ledger records the visit); visit 2 restarts, and at the
// spine-terminus fork picks the SIDELINE — the baked bridge must SPEAK
// (asserted on a distinctive fragment of the baked prose, not the computed
// v1 template).
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   node scripts/audit-teach-bridge-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.AUDIT_OPENING || 'taimanov';
// A stable fragment of the BAKED bridge (src/data/walkthrough-narrations.json
// → taimanov bridges.Nb5.text) that the computed v1 template never says.
const BRIDGE_MARK = process.env.AUDIT_BRIDGE_MARK || 'different beast';
const SIDELINE = process.env.AUDIT_SIDELINE || /Nb5|Gary/i;

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
const ttsTexts = [];
p.on('request', (r) => {
  if (r.url().includes('/api/tts')) {
    try { ttsTexts.push(new URL(r.url()).searchParams.get('text') ?? ''); } catch { /* malformed */ }
  }
});

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* absent */ }
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* absent */ }
}

const clean = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

async function ask(text) {
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(text, { delay: 12 });
  await box.press('Enter');
}

/** Drive to the leaf (visit 1) — first fork tile is fine, no bridge fires
 *  on a fresh ledger. */
async function driveToLeaf(budgetMs) {
  const started = Date.now();
  while (Date.now() - started < budgetMs) {
    if (await p.locator('[data-testid="walkthrough-leaf-panel"]').isVisible().catch(() => false)) return true;
    for (const sel of [
      '[data-testid="walkthrough-skip"]',
      '[data-testid="walkthrough-fork-panel"] button',
      'button:has-text("Continue")',
    ]) {
      try {
        const el = p.locator(sel).first();
        if (await el.isVisible({ timeout: 300 })) { await el.click({ force: true }); break; }
      } catch { /* try next */ }
    }
    await p.waitForTimeout(1500);
  }
  return p.locator('[data-testid="walkthrough-leaf-panel"]').isVisible().catch(() => false);
}

/** Visit 2: skip to the fork, then pick the SIDELINE tile. */
async function driveToForkAndPickSideline(budgetMs) {
  const started = Date.now();
  while (Date.now() - started < budgetMs) {
    const panel = p.locator('[data-testid="walkthrough-fork-panel"]');
    if (await panel.isVisible().catch(() => false)) {
      const tiles = panel.locator('button');
      const n = await tiles.count();
      for (let i = 0; i < n; i += 1) {
        const label = (await tiles.nth(i).innerText().catch(() => '')) ?? '';
        if (SIDELINE.test(label)) { await tiles.nth(i).click({ force: true }); return label.replace(/\s+/g, ' ').trim(); }
      }
      return null; // fork shown but no sideline tile matched
    }
    // Not at the fork yet — skip forward, and take the "Today's lesson" /
    // restart affordance the returning-visitor chooser offers.
    for (const sel of [
      '[data-testid="walkthrough-choose-next-layer"]',
      '[data-testid="walkthrough-skip"]',
      'button:has-text("Continue")',
    ]) {
      try {
        const el = p.locator(sel).first();
        if (await el.isVisible({ timeout: 300 })) { await el.click({ force: true }); break; }
      } catch { /* try next */ }
    }
    await p.waitForTimeout(1500);
  }
  return null;
}

let verdict = '';
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();

  // ── Visit 1: record the ledger visit. ──
  await ask(`teach me the ${ASK}`);
  if (!(await driveToLeaf(240000))) throw new Error('visit 1 never reached the leaf — ledger cannot record');
  await p.waitForTimeout(3000);

  // ── Visit 2: re-ask, drive to the fork, pick the sideline. ──
  const ttsBefore = ttsTexts.length;
  await ask(`teach me the ${ASK}`);
  const picked = await driveToForkAndPickSideline(240000);
  if (!picked) throw new Error('visit 2 never surfaced a sideline tile at the fork');
  console.log(`[probe] sideline picked: "${picked}" — listening for the baked bridge…`);
  const started = Date.now();
  let heard = null;
  while (Date.now() - started < 90000 && !heard) {
    await p.waitForTimeout(2000);
    for (const t of ttsTexts.slice(ttsBefore)) {
      if (clean(t).includes(clean(BRIDGE_MARK))) { heard = t; break; }
    }
  }
  if (!heard) {
    const delta = ttsTexts.slice(ttsBefore).map((t) => t.slice(0, 70)).join(' | ');
    throw new Error(`baked bridge never spoke (mark "${BRIDGE_MARK}"). tts delta: ${delta.slice(0, 400)}`);
  }
  verdict = `✓ PASS: baked comparative bridge speaks on the sideline pick — "${heard.slice(0, 140)}"`;
} catch (e) {
  verdict = `✗ FAIL: ${String(e).slice(0, 400)}`;
}
await b.close();
console.log(verdict);
process.exit(verdict.startsWith('✓') ? 0 : 1);
