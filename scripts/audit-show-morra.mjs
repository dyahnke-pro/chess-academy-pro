// Drive the live coach: (1) a matchup "X vs Y", (2) "teach me the Smith-Morra".
// Capture the ACTUAL spoken narration text off the app's own
// coach-narration-spoken events (TTS muted — no synth bill).
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { muteTtsForAudit } from './audit-lib/mute-tts.mjs';
const BASE = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const b = await chromium.launch({ executablePath: await resolveChromiumExecutable(), args: sandboxLaunchArgs() });
const ctx = await b.newContext(sandboxContextOptions());
const p = await ctx.newPage();
await p.addInitScript(muteTtsForAudit);

const spoken = [];
p.on('request', (r) => {
  try {
    const d = r.postData(); if (!d) return;
    if (!d.includes('coach-narration-spoken') && !d.includes('narration')) return;
    // audit events post JSON; pull any text-ish field
    const j = JSON.parse(d);
    const evs = Array.isArray(j) ? j : (j.events || [j]);
    for (const e of evs) {
      const t = e?.text || e?.detail?.text || e?.payload?.text || e?.data?.text || e?.spokenText;
      const src = e?.source || e?.detail?.source || e?.event || e?.type || '';
      if (t && String(t).trim().length > 3 && /narration|spoke|speak|voice/i.test(JSON.stringify(e))) spoken.push({ src, t: String(t).trim() });
    }
  } catch {}
});

async function dismiss(){
  for (const [g,btn] of [
    ['[data-testid="ai-consent-modal"]','[data-testid="ai-consent-allow"]'],
    ['[data-testid="strength-calibration-bubble"]','[data-testid="skill-band-intermediate"]'],
  ]) { try { const el=p.locator(g); await el.waitFor({timeout:8000}); await p.locator(btn).click(); await el.waitFor({state:'detached',timeout:15000}); } catch{} }
  try { const m=p.locator('[data-testid="page-help-modal"]'); await m.waitFor({timeout:4000}); await p.keyboard.press('Escape'); } catch{}
}

async function panelText(){
  for (const sel of ['[data-testid="walkthrough-narrating-panel"]','[data-testid="memory-move-narration"]','[data-testid="lesson-narration"]']) {
    try { const el=p.locator(sel).first(); if (await el.count()) { const t=(await el.innerText()).trim(); if (t) return t; } } catch {}
  }
  return '';
}

async function runFlow(label, req){
  console.log(`\n============================================================`);
  console.log(`FLOW: ${label}  —  typed: "${req}"`);
  console.log(`============================================================`);
  spoken.length = 0;
  await p.goto(`${BASE}/coach/teach`, { waitUntil:'domcontentloaded', timeout:45000 });
  await dismiss(); await dismiss();
  const box = p.locator('[data-testid="chat-text-input"]');
  await box.waitFor({ timeout:20000 });
  await box.click(); await box.pressSequentially(req, { delay: 10 });
  await box.press('Enter');
  // capture the coach's chat ACK
  await p.waitForTimeout(3500);
  let ack='';
  try { ack = (await p.locator('[data-testid="chat-message"], .coach-message, [data-role="assistant"]').last().innerText()).trim(); } catch {}
  // wait for walkthrough to start, then step through capturing panel narration
  const beats = [];
  const seen = new Set();
  for (let i=0;i<26;i++){
    await p.waitForTimeout(1400);
    const pt = await panelText();
    if (pt && !seen.has(pt)) { seen.add(pt); beats.push(pt); }
    // advance one beat if a skip/next control exists
    const skip = p.locator('[data-testid="walkthrough-skip"], [data-testid="lesson-next"], [data-testid="walkthrough-next"]').first();
    try { if (await skip.count()) await skip.click({ timeout: 1500, force:true }); } catch {}
    if (beats.length >= 12) break;
  }
  console.log(`\n-- coach chat reply --\n${ack || '(none captured)'}`);
  console.log(`\n-- narration beats shown on board (${beats.length}) --`);
  beats.forEach((t,i)=>console.log(`  [${i+1}] ${t.replace(/\s+/g,' ').slice(0,320)}`));
  console.log(`\n-- coach-narration-spoken events (${spoken.length}) --`);
  spoken.slice(0,14).forEach((s,i)=>console.log(`  [${i+1}] (${s.src}) ${s.t.replace(/\s+/g,' ').slice(0,320)}`));
}

try {
  await runFlow('MATCHUP', process.env.MORRA_MATCHUP || 'Ruy Lopez vs Sicilian Defense');
  await runFlow('TEACH MORRA', 'Teach me the Smith-Morra Gambit');
} catch(e){ console.log('ERROR', String(e).slice(0,300)); }
await b.close();
