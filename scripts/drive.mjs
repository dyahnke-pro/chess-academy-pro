// Hand-driver: I steer this call-by-call. Opens ONE page, optionally seeds a
// position by PLAYING moves, then runs each ASK and prints the REAL assistant
// bubble + board delta + URL + any mounted drill/walkthrough — so I read and
// judge each result myself, then decide the next. Not an autopilot.
//   ASKS="q1||q2||q3"  SEED="e4,e5,Nf3"  node scripts/drive.mjs
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
import { readPlacement, sleep } from './audit-lib/board-drive.mjs';

const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const ASKS = (process.env.ASKS || '').split('||').map((s) => s.trim()).filter(Boolean);
const SEED = (process.env.SEED || '').split(',').map((s) => s.trim()).filter(Boolean);
async function dismiss(p) {
  for (const [g, btn] of [['[data-testid="ai-consent-modal"]', '[data-testid="ai-consent-allow"]'],['[data-testid="strength-calibration-bubble"]', '[data-testid="skill-band-intermediate"]']]) { try { const G = p.locator(g); await G.waitFor({ timeout: 8000 }); await p.locator(btn).click(); await G.waitFor({ state: 'detached', timeout: 15000 }); } catch {} }
  try { const m = p.locator('[data-testid="page-help-modal"]'); await m.waitFor({ timeout: 4000 }); await p.keyboard.press('Escape'); await m.waitFor({ state: 'detached', timeout: 5000 }); } catch {}
}
async function askRead(p, q) {
  const box = p.locator('[data-testid="chat-text-input"]');
  const bubble = p.locator('[data-testid="chat-message-assistant"]');
  const beforeN = await bubble.count();
  await box.click(); await box.pressSequentially(q, { delay: 6 }); await box.press('Enter');
  let text = '';
  for (let i = 0; i < 22; i += 1) { await sleep(1300); const n = await bubble.count(); if (n > beforeN) { try { text = (await bubble.first().innerText()).trim(); } catch {} text = text.replace(/^[A-Z]\s*\n+/, '').trim(); if (text.length > 3 && /[.!?→]/.test(text) && i > 1) break; } }
  return text;
}
const pc = (pl) => Object.keys(pl).length;
async function main() {
  const browser = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
  const ctx = await browser.newContext(sandboxContextOptions());
  const p = await ctx.newPage();
  await p.addInitScript(muteTtsForAudit);
  await p.goto(`${BASE}/coach/teach`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await dismiss(p); await dismiss(p);
  await p.locator('[data-testid="chat-text-input"]').waitFor({ timeout: 20000 });
  if (SEED.length) { for (const mv of SEED) { await askRead(p, `play the move ${mv} for me`); await sleep(400); } const pl = await readPlacement(p); console.log(`SEEDED via ${SEED.join(' ')} → pieces=${pc(pl)} e4=${pl.e4||'-'} c4=${pl.c4||'-'} c5=${pl.c5||'-'}`); }
  for (const q of ASKS) {
    const b0 = await readPlacement(p);
    const a = await askRead(p, q);
    await sleep(2500);
    const b1 = await readPlacement(p);
    const wt = await p.locator('[data-testid="walkthrough-skip"], [data-testid="walkthrough-progress"]').count();
    console.log(`\n▶ "${q}"`);
    console.log(`  URL   : ${p.url().replace(BASE, '')}`);
    console.log(`  BUBBLE: ${a ? a.slice(0, 280) : '[NO ASSISTANT BUBBLE]'}`);
    console.log(`  BOARD : ${pc(b0)}→${pc(b1)} changed=${JSON.stringify(b0)!==JSON.stringify(b1)} walkthrough=${wt>0}`);
  }
  await ctx.close(); await browser.close();
}
main().catch((e) => { console.error(e); process.exit(2); });
