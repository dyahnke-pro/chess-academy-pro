// STEERABLE COACH DRIVER — I drive this by hand (David 2026-09-02: "You do the
// audit yourself! Full play audit!"). Loads ONE surface/position and asks the
// questions I pass, SEQUENTIALLY in a single live session (real play, in-
// context), waiting like a human (up to ~60s, one app-timeout retry). Prints
// each full answer + latency. I read each answer and judge accuracy myself; the
// script scores nothing. Muted (G1).
//
// Usage:
//   AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY \
//   AUDIT_URL='/coach/play?fen=<fen>&side=white' \
//   AUDIT_QS='is this winning?|how many moves to mate?|what is my plan?' \
//   node scripts/audit-drive.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const PATH = process.env.AUDIT_URL || '/coach/play?fen=' + encodeURIComponent('4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1') + '&side=white';
const QS = (process.env.AUDIT_QS || 'is this winning?').split('|').map((s) => s.trim()).filter(Boolean);
const GAP = Number(process.env.AUDIT_GAP || 3000); // human gap between questions
const RUN_ID = `drive-${Date.now().toString(36)}`;
const TRANSIENT = /coach is taking too long|try again in a moment|taking longer than expected|please try again/;

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch { /* private */ } }, RUN_ID);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [g, b] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) {
    try { const G = page.locator(g); await G.waitFor({ timeout: 8000 }); await page.locator(b).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch { /* not shown */ }
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch { /* not shown */ }
}
async function openChatIfPlay() {
  const input = page.locator('[data-testid="chat-text-input"]');
  if (await input.isVisible().catch(() => false)) return;
  try { await page.locator('[data-testid="play-chat-button"]').click({ timeout: 6000 }); } catch { /* teach page: input already there */ }
  await input.waitFor({ timeout: 10000 }).catch(() => {});
}
async function askOnce(q) {
  const box = page.locator('[data-testid="chat-text-input"]'); await box.waitFor({ timeout: 15000 });
  const msgs = page.locator('[data-testid="chat-message-assistant"]');
  const c0 = await msgs.count();
  const t0 = Date.now();
  await box.click(); await box.pressSequentially(q, { delay: 5 }); await box.press('Enter');
  for (let i = 0; i < 45; i++) { // wait up to ~63s like a patient human
    await page.waitForTimeout(1400);
    const n = await msgs.count();
    if (n > c0) {
      const t = (await msgs.nth(n - 1).innerText().catch(() => '')).trim();
      if (t.length > 12) { await page.waitForTimeout(1000); return { text: (await msgs.nth((await msgs.count()) - 1).innerText().catch(() => t)).trim().replace(/^c\s+/, ''), ms: Date.now() - t0 }; }
    }
  }
  return { text: '(no response in 63s)', ms: Date.now() - t0 };
}

console.log(`\nDRIVING: ${BASE}${PATH}\n${'='.repeat(60)}`);
await page.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await dismissGates();
await openChatIfPlay();
await page.waitForTimeout(1500);

for (const q of QS) {
  let r = await askOnce(q);
  if (TRANSIENT.test(r.text)) { // one patient retry, like a human tapping again
    console.log(`   (app timeout after ${(r.ms/1000).toFixed(1)}s — asking again)`);
    await page.waitForTimeout(3000);
    r = await askOnce(q);
  }
  console.log(`\nQ: ${q}`);
  console.log(`A (${(r.ms/1000).toFixed(1)}s): ${r.text}`);
  await page.waitForTimeout(GAP);
}
console.log(`\n${'='.repeat(60)}\ndone.`);
await browser.close();
process.exit(0);
