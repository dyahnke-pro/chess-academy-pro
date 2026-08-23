// REPRO of David's exact 2026-08-23 flow: "teach me the alapin, then when the
// lesson was over a deep dive picker popped up." The lesson is driven to
// COMPLETION (pick a fork branch to continue, reach the leaf), THEN the
// leaf-panel deep-dive tiles are tapped — the path the fork-panel audits never
// exercised. A family/play picker after the tap is a FAIL.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { blockTtsNetwork } from './audit-lib/block-tts-network.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASK = process.env.AUDIT_OPENING || 'alapin';
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
const rec = (n, pass, d) => { results.push({ n, pass }); console.log(`  ${pass ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); };

async function dismiss() {
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]'],
  ]) { try { const g = p.locator(gate); await g.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await g.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* absent */ } }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* absent */ }
}

try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(); await dismiss();
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout: 20000 }); await box.click();
  await box.pressSequentially(`teach me the ${ASK}`, { delay: 10 }); await box.press('Enter');

  // Drive to the LEAF: skip narration; at any fork, CONTINUE down a branch
  // (fork-option), never the deep-dive; stop when the leaf panel shows.
  const started = Date.now();
  let atLeaf = false;
  while (Date.now() - started < 300000) {
    if (await p.locator('[data-testid="walkthrough-leaf-panel"]').isVisible().catch(() => false)) { atLeaf = true; break; }
    const fork = p.locator('[data-testid="walkthrough-fork-option-0"]');
    if (await fork.isVisible().catch(() => false)) { await fork.click({ force: true }); await p.waitForTimeout(1500); continue; }
    const skip = p.locator('[data-testid="walkthrough-skip"]').first();
    if (await skip.isVisible({ timeout: 400 }).catch(() => false)) { await skip.click({ force: true }); }
    await p.waitForTimeout(1500);
  }
  rec('reached the leaf panel (lesson over)', atLeaf, `${Math.round((Date.now() - started) / 1000)}s`);
  if (!atLeaf) throw new Error('never reached the leaf');

  // Enumerate the leaf deep-dive tiles, then tap the FIRST — David's exact
  // single action ("a deep dive picker popped up"). Re-driving the lesson per
  // tile is flaky (a deep-dive lands in a nested lesson that is hard to drive
  // back from) and adds nothing: the routing guard is identical for every
  // tile, so one tap proves the contract. The tap must start a lesson, never
  // a family/play picker.
  const tilesLoc = p.locator('[data-testid^="walkthrough-leaf-deepdive-"]');
  const n = await tilesLoc.count();
  const labels = [];
  for (let i = 0; i < n; i += 1) labels.push((await tilesLoc.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim());
  rec('leaf offers deep-dive tiles', n > 0, `${n}: ${labels.join(' | ')}`);

  if (n > 0) {
    const label = labels[0];
    await tilesLoc.first().click({ force: true });
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
    rec(`leaf tile "${label}" → starts a lesson (not a picker)`, outcome === 'lesson', outcome === 'lesson' ? '' : `GOT: ${outcome}`);
  }
} catch (e) {
  rec('run completed without throwing', false, String(e).slice(0, 160));
}
await b.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n── leaf deep-dive: ${results.length - failed.length}/${results.length} green ──`);
process.exit(failed.length === 0 ? 0 : 1);
