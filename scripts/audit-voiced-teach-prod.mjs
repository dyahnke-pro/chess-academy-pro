// Post-deploy check (2026-08-24): on /coach/teach, "Teach me the Caro-Kann"
// must launch the VOICED walkthrough (our-words DNA corpus) — instantly (no
// LLM generation wait) and in the in-place walkthrough player, not a "did you
// mean" picker or a generation spinner. The voiced tree's intro carries the
// unique phrase "watch the ideas as the moves play out".
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const REQ = process.env.AUDIT_TEACH_REQ || 'Teach me the Caro-Kann';
const EXPECT = (process.env.AUDIT_TEACH_EXPECT || 'caro').toLowerCase();
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const p = await (await b.newContext(sandboxContextOptions())).newPage();
await p.addInitScript(muteTtsForAudit);
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
  await box.click(); await box.pressSequentially(REQ, { delay: 12 });
  await box.press('Enter');
  const t0 = Date.now();
  for (let i=0;i<20;i++){
    await p.waitForTimeout(1500);
    const body=(await p.locator('body').innerText()).toLowerCase();
    // launched = the in-place walkthrough runtime is running (the curated
    // LessonPlayer, NOT the legacy WalkthroughMode which shows walkthrough-progress).
    const running = await p.locator('[data-testid="walkthrough-narrating-panel"], [data-testid="walkthrough-skip"]').count() > 0;
    const legacy = await p.locator('[data-testid="walkthrough-progress"]').count() > 0;
    const named = body.includes(EXPECT);
    const bounced = body.includes('did you mean') || body.includes('/coach/session/walkthrough') || legacy;
    if ((named && running) || bounced){
      const secs = Math.round((Date.now()-t0)/1000);
      ok = named && running && !bounced;
      detail = `named=${named} walkthroughRunning=${running} bounced=${bounced} legacyMode=${legacy} (t=${secs}s)`;
      break;
    }
    if (i===19) detail='no voiced-walkthrough signal in 30s';
  }
} catch(e){ detail='ERROR '+String(e).slice(0,160); }
await b.close();
console.log(`${ok?'✓ PASS':'✗ FAIL'}: "${REQ}" → voiced walkthrough — ${detail}`);
process.exit(ok?0:1);
