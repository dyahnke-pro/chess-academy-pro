// REPRO: tap EVERY deep-dive tile (fork panel + leaf/sibling panel), not just
// the first, and FAIL on the family line-picker prose — the shape David hit
// ("alapin d5 deep dive redirected me to the Sicilian pickers"). The existing
// audit only taps the first tile and only checks the "did you mean" picker, so
// it stays green while a tile that resolves to a bare family name bounces to the
// Tier 1.5 family picker.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.AUDIT_OPENING || 'alapin';

// Any of these on screen after a deep-dive tap = the tap did NOT start a lesson.
const DEAD_ENDS = [
  { id: 'family-picker', re: /branches into many lines|pick one to dive in deep/i },
  { id: 'play-picker', re: /splits into several different games/i },
  { id: 'didyoumean', re: /don'?t have an exact match|did you mean one of these/i },
  { id: 'brain-refusal', re: /can'?t verify that precisely|can'?t verify which moves are sound/i },
];

const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await blockTtsNetwork(p);
const results = [];
const rec = (name, pass, detail) => { results.push({ name, pass }); console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); };

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* absent */ }
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* absent */ }
}

async function typeTeach(text) {
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 });
  await box.click();
  await box.pressSequentially(text, { delay: 10 });
  await box.press('Enter');
}

async function collectDeepDiveTiles() {
  // Enumerate every deep-dive tile currently on screen with its label.
  const loc = p.locator('[data-testid^="walkthrough-fork-deepdive-"], [data-testid^="walkthrough-leaf-deepdive-"]');
  const n = await loc.count();
  const tiles = [];
  for (let i = 0; i < n; i += 1) {
    const el = loc.nth(i);
    tiles.push({ testid: await el.getAttribute('data-testid'), label: (await el.innerText().catch(() => '')).replace(/\s+/g, ' ').trim() });
  }
  return tiles;
}

async function driveToDeepDives(maxMs = 300000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const tiles = await collectDeepDiveTiles();
    if (tiles.length > 0) return tiles;
    try { const skip = p.locator('[data-testid="walkthrough-skip"]').first(); if (await skip.isVisible({ timeout: 400 })) await skip.click({ force: true }); } catch { /* nothing */ }
    await p.waitForTimeout(2000);
  }
  return [];
}

try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();
  await typeTeach(`teach me the ${ASK}`);

  const tiles = await driveToDeepDives();
  rec('deep-dive tiles reachable', tiles.length > 0, `${tiles.length} tile(s): ${tiles.map((t) => t.label).join(' | ')}`);

  // Tap each tile in turn. After each, re-ask for the opening to get back to the
  // deep-dive panel and tap the NEXT tile. (Tapping consumes the panel.)
  for (let i = 0; i < tiles.length; i += 1) {
    // Re-reach the deep-dive panel each iteration.
    if (i > 0) {
      await typeTeach(`teach me the ${ASK}`);
      const again = await driveToDeepDives(180000);
      if (again.length <= i) { rec(`re-reach panel for tile #${i}`, false, 'panel did not re-surface'); break; }
    }
    const fresh = await collectDeepDiveTiles();
    const target = fresh[i] ?? fresh[fresh.length - 1];
    if (!target) { rec(`tile #${i} present`, false); continue; }
    await p.locator(`[data-testid="${target.testid}"]`).click({ force: true });

    // Wait for the outcome: either a lesson runs, or a dead-end prose appears.
    const tapAt = Date.now();
    let outcome = 'pending';
    while (Date.now() - tapAt < 200000 && outcome === 'pending') {
      await p.waitForTimeout(2500);
      const body = (await p.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
      const hit = DEAD_ENDS.find((d) => d.re.test(body));
      if (hit) { outcome = hit.id; break; }
      for (const sel of ['[data-testid="walkthrough-skip"]', '[data-testid="walkthrough-fork-panel"]', '[data-testid="walkthrough-leaf-panel"]', '[data-testid="walkthrough-progress"]']) {
        if (await p.locator(sel).first().isVisible().catch(() => false)) { outcome = 'lesson'; break; }
      }
    }
    rec(`tile "${target.label}" → starts a lesson (not a picker/dead-end)`, outcome === 'lesson', outcome === 'lesson' ? '' : `GOT: ${outcome}`);
    // Dismiss any picker so the next iteration starts clean.
    try { const d = p.locator('[data-testid="line-picker-dismiss"]'); if (await d.isVisible({ timeout: 800 })) await d.click(); } catch { /* none */ }
  }
} catch (e) {
  rec('run completed without throwing', false, String(e).slice(0, 160));
}

await b.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n── forkdive-all: ${results.length - failed.length}/${results.length} green ──`);
process.exit(failed.length === 0 ? 0 : 1);
