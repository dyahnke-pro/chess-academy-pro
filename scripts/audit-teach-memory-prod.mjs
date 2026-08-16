// TEACHING-MEMORY AUDIBLE PROOF (David 2026-07-31: "last time we went over
// X, today we add Y — MEMORY!!"). Drives TWO visits in ONE browser context:
// visit 1 walks "teach me X" to the leaf (skip-clicking), visit 2 re-asks and
// must SPEAK the ledger recap ("Last time we covered …. Today we add …").
//
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_SMOKE_URL=https://chess-academy-pro.vercel.app \
//   [AUDIT_OPENING="grand prix attack"] node scripts/audit-teach-memory-prod.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.AUDIT_OPENING || 'grand prix attack';

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await blockTtsNetwork(p);   // instrument keeps the request; the provider never sees it
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

/** Skip-click the walkthrough to its leaf; done when the leaf panel shows. */
async function driveToLeaf(budgetMs) {
  const started = Date.now();
  while (Date.now() - started < budgetMs) {
    if (await p.locator('[data-testid="walkthrough-leaf-panel"]').isVisible().catch(() => false)) return true;
    // Nudge whatever affordance is up: skip, a fork's first tile, continue.
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

let verdict = '';
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();

  // ── Visit 1: walk to the leaf so the ledger records the layer. ──
  await ask(`teach me the ${ASK}`);
  const reachedLeaf = await driveToLeaf(240000);
  if (!reachedLeaf) throw new Error('visit 1 never reached the leaf — ledger cannot record');
  await p.waitForTimeout(3000); // leaf effect commits the visit

  // ── Visit 2: re-ask; the recap must SPEAK. ──
  const ttsBefore = ttsTexts.length;
  await ask(`teach me the ${ASK}`);
  const started = Date.now();
  let recapSpoken = null;
  while (Date.now() - started < 120000 && !recapSpoken) {
    await p.waitForTimeout(2000);
    for (const t of ttsTexts.slice(ttsBefore)) {
      if (clean(t).includes('last time we covered')) { recapSpoken = t; break; }
    }
  }
  if (!recapSpoken) throw new Error(`visit 2 spoke no recap (tts delta: ${ttsTexts.slice(ttsBefore).map((t) => t.slice(0, 60)).join(' | ').slice(0, 300)})`);
  verdict = `✓ PASS: teaching memory speaks on revisit — "${recapSpoken.slice(0, 140)}"`;
} catch (e) {
  verdict = `✗ FAIL: ${String(e).slice(0, 300)}`;
}
await b.close();
console.log(verdict);
process.exit(verdict.startsWith('✓') ? 0 : 1);
