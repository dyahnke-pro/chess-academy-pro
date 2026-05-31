// 3-instrument audit — FIXED wiring. The audit-stream config hydrates at BOOT
// (loadAuditStreamConfig reads localStorage before the baked fallback), so we
// must set localStorage via addInitScript BEFORE the page loads. Then the live
// app streams every audit (voice-speak-invoked, navigation, etc.) to our local
// listener, and we verify the Watch narration actually FIRES.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET;
const TARGETS = ['caro-kann', 'philidor-defence', 'two-knights-defence', 'slav-defence'];

const pull = async (since) => { if (!SECRET) return {error:'no secret'}; try { const r = await fetch(`${PROD}/api/audit-stream?since=${since}`,{headers:{'x-audit-secret':SECRET}}); return r.ok ? await r.json() : {error:`HTTP ${r.status}`}; } catch(e){ return {error:String(e)}; } };

console.log('=== (3) listener sidecar ===');
const listener = await startAuditListener();
console.log('  listener:', listener.url);

console.log('=== (2) audit-stream BEFORE ===');
const before = await pull(Date.now() - 60000);
console.log('  ', before.error ? `ERROR ${before.error}` : `${(before.entries||[]).length} prod events/60s`);

console.log('=== (1) Playwright (config injected pre-boot) ===');
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: [...sandboxLaunchArgs(), '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
// CRITICAL: set the audit-stream config BEFORE any app script runs, so
// loadAuditStreamConfig() picks it up at boot and streams to our listener.
await page.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch {}
}, { url: listener.url, secret: LOCAL_LISTENER_SECRET });

const pageErrors = [];
const streamed = []; // every audit POST body the app sends to our listener
page.on('pageerror', e => pageErrors.push(e.message));
page.on('request', req => {
  if (req.method() === 'POST' && req.url().includes(listener.url.replace(/^https?:\/\//,''))) {
    try { const b = req.postDataJSON(); const evs = Array.isArray(b) ? b : (b?.events ?? [b]); for (const e of evs) streamed.push(e); } catch {}
  }
});

const runStart = Date.now();
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(()=>{});
await page.waitForTimeout(3000);
if (await page.locator('[data-testid="strength-calibration-bubble"]').count() > 0) {
  await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(()=>{});
  await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state:'detached', timeout: 15000 }).catch(()=>{});
}
process.stdout.write('  seeding');
for (let i=0;i<14;i++){ await page.waitForTimeout(5000); process.stdout.write('.');
  const n = await page.evaluate(async()=>{try{const q=indexedDB.open('ChessAcademyDB');const db=await new Promise((r,j)=>{q.onsuccess=()=>r(q.result);q.onerror=()=>j();});if(!db.objectStoreNames.contains('middlegamePlans'))return 0;const tx=db.transaction('middlegamePlans','readonly');const a=await new Promise((r,j)=>{const g=tx.objectStore('middlegamePlans').getAll();g.onsuccess=()=>r(g.result);g.onerror=()=>j();});return a.length;}catch{return 0;}});
  if (n>200) break;
}
console.log(' seeded');
const cfgState = await page.evaluate(() => ({ ls: localStorage.getItem('auditStreamUrl') })); // migration removes it after boot read
console.log('  post-boot localStorage auditStreamUrl (removed after migration = good):', cfgState.ls);

const out = [];
for (const id of TARGETS) {
  const evBefore = streamed.length, ttsBefore = ttsCalls.length;
  await page.goto(`${PROD}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2500);
  await page.locator('[data-testid="page-help-modal"] button, [aria-label="Close"]').first().click({ timeout: 2000 }).catch(()=>{});
  const w = page.getByRole('button', { name: /^watch$/i }).first();
  let mounted = false;
  if (await w.count() > 0) {
    await w.click({ timeout: 6000 }).catch(()=>{});
    await page.waitForTimeout(2000);
    mounted = (await page.locator('[data-square]').count() > 0) && (await page.locator('[data-testid="walkthrough-progress"],[data-testid="walkthrough-mode"]').count() === 0);
    const playBtn = page.locator('[aria-label*="play" i], [data-testid*="play"]').first();
    if (await playBtn.count() > 0) await playBtn.click({ timeout: 2000 }).catch(()=>{});
    await page.waitForTimeout(10000); // let the narration speak
  }
  const captured = streamed.slice(evBefore);
  const voice = captured.filter(e => /voice|speak|narration/i.test(e.kind||''));
  const tts = ttsCalls.length - ttsBefore;
  out.push({ id, mounted, tts, voice: voice.length, stream: captured.length });
  console.log(`  ${id}: lessonMounted=${mounted} ttsCalls=${tts} (voice synthesising) | auditStream voice=${voice.length} total=${captured.length}`);
}

console.log('\n=== (2) audit-stream AFTER (prod delta) ===');
const after = await pull(runStart);
console.log('  ', after.error ? `ERROR ${after.error}` : `${(after.entries||[]).length} prod events this run`);
console.log('  pageErrors:', pageErrors.length);

const totalVoice = out.reduce((a,o)=>a+o.voice,0);
const totalStream = out.reduce((a,o)=>a+o.total,0);
console.log(`\n=== RESULT: ${totalStream} streamed events captured by listener, ${totalVoice} voice/narration events across ${TARGETS.length} openings ===`);
console.log(totalVoice>0 ? 'NARRATION CONFIRMED FIRING via the listener ✓' : 'NO voice events — investigate (autoplay/audio-unlock or stream config)');
await browser.close();
await listener.stop?.();
process.exit(0);
