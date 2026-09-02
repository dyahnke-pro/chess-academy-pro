// DIAGNOSTIC: dump the FULL chat transcript after each question so I can tell
// the chat ANSWER apart from an ambient position-narration bubble. Not committed.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const PATH = process.env.AUDIT_URL || '/coach/play?fen=' + encodeURIComponent('4k3/8/8/8/8/8/3Q4/4K3 w - - 0 1') + '&side=white';
const QS = (process.env.AUDIT_QS || 'is this a draw?|whose turn is it?|what color am I playing?').split('|').map((s) => s.trim()).filter(Boolean);

const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
await ctx.addInitScript(muteTtsForAudit);
await ctx.addInitScript((id) => { try { localStorage.setItem('auditRunId', id); } catch {} }, `dump-${Date.now().toString(36)}`);
const page = await ctx.newPage();

async function dismissGates() {
  for (const [g, b] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) {
    try { const G = page.locator(g); await G.waitFor({ timeout: 8000 }); await page.locator(b).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch {}
  }
  try { const m = page.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await page.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

console.log(`DUMP: ${BASE}${PATH}`);
await page.goto(`${BASE}${PATH}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await dismissGates();
try { await page.locator('[data-testid="play-chat-button"]').click({ timeout: 6000 }); } catch {}
const box = page.locator('[data-testid="chat-text-input"]');
await box.waitFor({ timeout: 10000 }).catch(() => {});
await page.waitForTimeout(6000);

async function dumpAssistants(label) {
  const msgs = page.locator('[data-testid="chat-message-assistant"]');
  const n = await msgs.count();
  console.log(`\n--- ${label}: ${n} assistant msg(s) ---`);
  for (let i = 0; i < n; i++) {
    const t = (await msgs.nth(i).innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
    console.log(`  [${i}] ${t.slice(0, 180)}`);
  }
}

await dumpAssistants('after mount');
for (const q of QS) {
  const before = await page.locator('[data-testid="chat-message-assistant"]').count();
  await box.click(); await box.pressSequentially(q, { delay: 5 }); await box.press('Enter');
  for (let i = 0; i < 45; i++) { await page.waitForTimeout(1400); if (await page.locator('[data-testid="chat-message-assistant"]').count() > before) { await page.waitForTimeout(1500); break; } }
  console.log(`\n===== Q: ${q} (was ${before} msgs) =====`);
  await dumpAssistants('after answer');
  await page.waitForTimeout(2000);
}
await browser.close();
process.exit(0);
