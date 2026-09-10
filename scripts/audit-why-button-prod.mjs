// Hand-driver for the play-surface "Why?" button (David 2026-09-10: "make sure
// the why chain is tied into the why button"). Loads /coach/play, taps Why?,
// reads the COMPUTED answer (injected chat bubble) + the spoken line, and I
// judge whether it leads with real teaching / carries a grounded reason.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { sleep } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';

async function dismiss(p) {
  for (const [g, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'], ['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) {
    try { const G = p.locator(g); await G.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch {}
  }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}

async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  const p = await ctx.newPage();
  const spoken = [];
  await p.exposeFunction('__auditSpoke', (t) => spoken.push(t));
  await p.addInitScript(muteTtsForAudit);
  await p.addInitScript(() => { window.addEventListener('coach-narration-spoken', (e) => { try { window.__auditSpoke(String(e.detail?.text || '').slice(0, 260)); } catch {} }); });
  await p.goto(`${BASE}/coach/play`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(p); await dismiss(p);

  const why = p.locator('[data-testid="why-button"]');
  try { await why.waitFor({ timeout: 20000 }); } catch { console.log('  why-button never appeared'); await ctx.close(); await browser.close(); return; }
  console.log('▶ Tapping Why? on /coach/play');

  const bubble = p.locator('[data-testid="chat-message-assistant"]');
  const card = p.locator('[data-testid="why-answer-card"]');
  const before = await bubble.count();
  await why.click();

  let answer = '';
  for (let i = 0; i < 25; i += 1) {
    await sleep(1200);
    if (await bubble.count() > before) { try { answer = (await bubble.last().innerText()).trim(); } catch {} }
    if (!answer && await card.count() > 0) { try { answer = (await card.first().innerText()).trim(); } catch {} }
    if (answer.length > 20) break;
  }
  console.log(`  ANSWER: ${answer.slice(0, 400) || '[NOTHING]'}`);
  console.log(`  GROUNDED (has ' — ' reason): ${/—/.test(answer)}`);
  await sleep(1200);
  console.log(`  SPOKEN (${spoken.length}): ${spoken.slice(0, 3).join(' | ').slice(0, 300)}`);

  await ctx.close(); await browser.close();
}
main().catch((e) => { console.error(e); process.exit(2); });
