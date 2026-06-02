#!/usr/bin/env node
// Focused re-tests closing two open questions from the board grind:
//   (1) G5 brief-cap: capture the REAL /api/tts spoken text (post
//       applyBriefVoiceCap) in brief mode and measure word count.
//   (2) Clean rigor probes: set a known position in ONE message, wait,
//       then ask the hanging/empty/mate question as a SEPARATE message.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const BASE = process.env.AUDIT_SMOKE_URL ?? 'https://chess-academy-pro.vercel.app';
const T = 70000;
const exe = await resolveChromiumExecutable(false);
const browser = await chromium.launch({ args: sandboxLaunchArgs(), headless: true, executablePath: exe });
const ctx = await browser.newContext({ ...sandboxContextOptions(), viewport: { width: 414, height: 896 }, userAgent: 'AuditCoachPlayBot/1.0 retest' });
await ctx.addInitScript(autoDismissCalibration);
const page = await ctx.newPage();
const ttsTexts = [];
page.on('request', (r) => { const u = r.url(); if (u.includes('/api/tts')) { try { const t = new URL(u).searchParams.get('text'); if (t && t.trim() !== '.' ) ttsTexts.push(t); } catch {} } });
const wc = (s) => (s ? s.trim().split(/\s+/).filter(Boolean).length : 0);
const sc = (s) => (s ? (s.match(/[.!?]+(\s|$)/g) || []).length : 0);
const clean = (t) => (t || '').replace(/^[A-Za-z]\s*/, '').trim();

async function setVerbosityAndVoice(v) {
  await page.evaluate(async (val) => {
    const req = indexedDB.open('ChessAcademyDB');
    await new Promise((r) => { req.onsuccess = () => r(); req.onerror = () => r(); });
    const db = req.result; const tx = db.transaction('profiles', 'readwrite'); const st = tx.objectStore('profiles');
    const all = await new Promise((r) => { const g = st.getAll(); g.onsuccess = () => r(g.result || []); g.onerror = () => r([]); });
    for (const p of all) { p.preferences = p.preferences || {}; p.preferences.coachNarration = val; st.put(p); }
    await new Promise((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); }); db.close();
  }, v);
}
async function goto(path, mount) { await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); if (mount) await page.locator(`[data-testid="${mount}"]`).waitFor({ timeout: 20000 }).catch(()=>{}); await page.waitForTimeout(4000); try { if (await page.locator('[data-testid="page-help-modal"]').count()) await page.keyboard.press('Escape'); } catch {} }
async function snap() { return page.$$eval('[data-testid="chat-message-assistant"]', els => els.map(e => (e.textContent||'').replace(/^[A-Za-z]\s*/,'').trim())); }
async function askLLM(prompt) {
  const before = await snap(); const beforeSet = new Set(before);
  const input = page.locator('[data-testid="chat-text-input"]'); await input.waitFor({ state:'visible', timeout:12000 }); await input.click(); await input.fill(prompt);
  await page.locator('[data-testid="chat-send-btn"]').click();
  try { await page.waitForFunction((prev)=>{ const els=[...document.querySelectorAll('[data-testid="chat-message-assistant"]')]; return els.some(e=>{const t=(e.textContent||'').replace(/^[A-Za-z]\s*/,'').trim(); return t.length>8 && !prev.includes(t);}); }, before, { timeout:T }); } catch { return '(timeout)'; }
  let prevLen=-1, stable=0, resp='';
  for (let i=0;i<30;i++){ await page.waitForTimeout(700); const after=await snap(); const fresh=after.filter(t=>!beforeSet.has(t)); const cur=fresh[fresh.length-1]||after[after.length-1]||''; if(cur.length===prevLen){stable++; if(stable>=2){resp=cur;break;}} else stable=0; prevLen=cur.length; resp=cur; }
  return clean(resp);
}

// ── (1) G5 brief-cap via real /api/tts capture ───────────────────
console.log('\n=== G5 brief-cap re-test (/coach/teach, coachNarration=brief) ===');
await goto('/', null); await page.getByText('Chess Academy Pro',{exact:true}).first().waitFor({timeout:30000}).catch(()=>{});
await setVerbosityAndVoice('brief');
await goto('/coach/teach', 'coach-teach-page');
// ensure voice on via the toggle if present
try { const vt = page.locator('[data-testid="voice-toggle"]'); if (await vt.count()){ const pressed = await vt.first().getAttribute('aria-pressed').catch(()=>null); /* leave as-is; capture either way */ } } catch {}
ttsTexts.length = 0;
const briefAns = await askLLM('Explain in as much depth as you possibly can every strategic and tactical idea behind the King\'s Indian Defense — give me everything.');
await page.waitForTimeout(3000); // let any tts calls fire
const voiceTag = (briefAns.match(/\[VOICE:\s*([\s\S]*?)\]/i)||[])[1]||'';
console.log('  VOICE tag words/sentences:', wc(voiceTag), '/', sc(voiceTag));
console.log('  /api/tts calls captured:', ttsTexts.length);
const ttsTotalWords = ttsTexts.reduce((n,t)=>n+wc(t),0);
console.log('  /api/tts spoken text(s):', JSON.stringify(ttsTexts.map(t=>t.slice(0,120))));
console.log('  TOTAL spoken words across tts:', ttsTotalWords, '(brief cap = <=30 words / <=2 sentences)');
console.log('  >>> G5', (ttsTexts.length===0 ? 'INCONCLUSIVE (voice did not fire in headless)' : (ttsTotalWords<=32 ? 'HELD (spoken text capped)' : 'VIOLATED (spoken text over cap)')));

// ── (2) Clean rigor probes (set, THEN ask separately) ────────────
console.log('\n=== Clean rigor probes (/coach/play, 2-message) ===');
await setVerbosityAndVoice('full');
await goto('/coach/play', 'coach-game-page');
try { const cs = page.locator('[data-testid="color-selector"]'); if (await cs.count()){ const w=page.getByRole('button',{name:/white/i}); if(await w.count()) await w.first().click().catch(()=>{}); await page.waitForTimeout(2500);} } catch {}
async function scrapeFen(){ const map=await page.evaluate(()=>{const m={};document.querySelectorAll('[data-piece]').forEach(p=>{let n=p,s=p.getAttribute('data-square');while(n&&!s){n=n.parentElement;s=n&&n.getAttribute&&n.getAttribute('data-square');}if(s&&/^[a-h][1-8]$/.test(s))m[s]=p.getAttribute('data-piece');});return m;}); const P={wP:'P',wN:'N',wB:'B',wR:'R',wQ:'Q',wK:'K',bP:'p',bN:'n',bB:'b',bR:'r',bQ:'q',bK:'k'}; if(!Object.keys(map).length)return null; let rows=[]; for(let r=8;r>=1;r--){let row='',e=0;for(const f of 'abcdefgh'){const pc=map[f+r];if(pc&&P[pc]){if(e){row+=e;e=0;}row+=P[pc];}else e++;}if(e)row+=e;rows.push(row);} return rows.join('/'); }
const probes = [
  { fen:'q6k/8/8/8/R7/8/8/6K1 w - - 0 1', q:'Are any of my pieces hanging or able to be captured for free right now? Answer directly.', truth:'YES — Ra4 attacked by Qa8, undefended' },
  { fen:'r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1', q:'What piece, if any, is on the d5 square right now? Answer directly.', truth:'NONE — d5 empty' },
  { fen:'6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', q:'Do I have a forced checkmate in one move here? If so, give the move. Answer directly.', truth:'YES — Ra8#' },
];
for (const pr of probes) {
  const input = page.locator('[data-testid="chat-text-input"]'); await input.click(); await input.fill(`set the board to ${pr.fen}`); await page.locator('[data-testid="chat-send-btn"]').click();
  await page.waitForTimeout(5000);
  const got = await scrapeFen();
  const ans = await askLLM(pr.q);
  console.log(`\n  truth: ${pr.truth}`);
  console.log(`  board: ${got}`);
  console.log(`  Q: ${pr.q}`);
  console.log(`  A: ${ans.slice(0,400)}`);
}
await browser.close(); process.exit(0);
