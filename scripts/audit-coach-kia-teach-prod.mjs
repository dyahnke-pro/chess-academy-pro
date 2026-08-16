// Post-deploy check for the KIA-teach fix (2026-07-18): on /coach/teach,
// "Teach me the KIA with white pieces" must resolve to King's Indian ATTACK,
// never offer King's Indian Defence lines.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await p.addInitScript(muteTtsForAudit);   // audits never spend TTS money (G1)
async function dismiss(){
  for (const [gate, btn] of [
    ['[data-testid="ai-consent-modal"]','[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]','[data-testid="skill-band-intermediate"]'],
  ]) {
    try { const g=p.locator(gate); await g.waitFor({timeout:8000}); await p.locator(btn).click(); await g.waitFor({state:'detached',timeout:15000}); } catch{}
  }
  try { const m=p.locator('[data-testid="page-help-modal"]'); await m.waitFor({timeout:4000}); await p.keyboard.press('Escape'); await m.waitFor({state:'detached',timeout:5000}); } catch{}
}
let ok=false, detail='';
try {
  await p.goto(`${BASE}/coach/teach`, { waitUntil:'domcontentloaded', timeout:45000 });
  await dismiss(); await dismiss();
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout:20000 });
  await box.click(); await box.pressSequentially('Teach me the KIA with white pieces', { delay: 12 });
  await box.press('Enter');
  for (let i=0;i<25;i++){
    await p.waitForTimeout(2000);
    const body=(await p.locator('body').innerText()).toLowerCase();
    const attack = body.includes("king's indian attack")||body.includes('kings indian attack');
    const defLines = /pick a king'?s indian defen[cs]e line/.test(body)||(body.includes('bayonet')&&body.includes('four pawns')&&body.includes('fianchetto'));
    if (attack || defLines){ ok=attack&&!defLines; detail=`attack=${attack} defLines=${defLines} (t=${(i+1)*2}s)`; break; }
    if (i===24) detail='no KIA/KID signal in 50s';
  }
} catch(e){ detail='ERROR '+String(e).slice(0,140); }
await b.close();
console.log(`${ok?'✓ PASS':'✗ FAIL'}: KIA-teach → Attack — ${detail}`);
process.exit(ok?0:1);
