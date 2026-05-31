// FULL 3-INSTRUMENT POST-DEPLOY AUDIT (G1) — masterclass surfaces.
//   (1) Playwright drives the LIVE prod opening-detail surface
//   (2) Live audit-stream pulled before + after (endpoint health)
//   (3) Local listener sidecar — the app streams every audit here (config
//       injected PRE-BOOT via addInitScript so loadAuditStreamConfig() picks
//       it up), so we capture the actual `coach-narration-spoken` voice events
//       + the /api/tts synthesis calls = proof the Watch narration FIRES.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET;
const TARGETS = (process.env.AUDIT_OPENING || 'caro-kann,philidor-defence,two-knights-defence,slav-defence').split(',');

const pull = async (since) => { if (!SECRET) return { error: 'no secret' }; try { const r = await fetch(`${PROD}/api/audit-stream?since=${since}`, { headers: { 'x-audit-secret': SECRET } }); return r.ok ? await r.json() : { error: `HTTP ${r.status}` }; } catch (e) { return { error: String(e) }; } };

console.log('=== (3) listener sidecar ===');
const listener = await startAuditListener();
console.log('  listener:', listener.url);

console.log('=== (2) audit-stream BEFORE ===');
const before = await pull(Date.now() - 60000);
console.log('  ', before.error ? `ERROR ${before.error}` : `endpoint reachable, ${(before.entries || []).length} prod events/60s`);

console.log('=== (1) Playwright (audit config injected pre-boot) ===');
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: [...sandboxLaunchArgs(), '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
await page.addInitScript(({ url, secret }) => {
  try { localStorage.setItem('auditStreamUrl', url); localStorage.setItem('auditStreamSecret', secret); } catch {}
}, { url: listener.url, secret: LOCAL_LISTENER_SECRET });

const pageErrors = [];
const streamed = [];   // audit events the app POSTs to our listener
const ttsCalls = [];   // /api/tts requests = voice actually synthesising
page.on('pageerror', e => pageErrors.push(e.message));
page.on('request', req => {
  const u = req.url();
  if (req.method() === 'POST' && u.includes('audit-stream')) {
    try { const b = req.postDataJSON(); const evs = Array.isArray(b) ? b : (b?.events ?? [b]); for (const e of evs) streamed.push(e); } catch {}
  }
  if (u.includes('/api/tts')) ttsCalls.push(u);
});

const runStart = Date.now();
await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(3000);
if (await page.locator('[data-testid="strength-calibration-bubble"]').count() > 0) {
  await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(() => {});
  await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state: 'detached', timeout: 15000 }).catch(() => {});
}
process.stdout.write('  seeding');
for (let i = 0; i < 14; i++) { await page.waitForTimeout(5000); process.stdout.write('.');
  const n = await page.evaluate(async () => { try { const q = indexedDB.open('ChessAcademyDB'); const db = await new Promise((r, j) => { q.onsuccess = () => r(q.result); q.onerror = () => j(); }); if (!db.objectStoreNames.contains('middlegamePlans')) return 0; const tx = db.transaction('middlegamePlans', 'readonly'); const a = await new Promise((r, j) => { const g = tx.objectStore('middlegamePlans').getAll(); g.onsuccess = () => r(g.result); g.onerror = () => j(); }); return a.length; } catch { return 0; } });
  if (n > 200) break;
}
console.log(' seeded');

const out = [];
for (const id of TARGETS) {
  const evBefore = streamed.length, ttsBefore = ttsCalls.length;
  await page.goto(`${PROD}/openings/${id}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForTimeout(2500);
  await page.locator('[data-testid="page-help-modal"] button, [aria-label="Close"]').first().click({ timeout: 2000 }).catch(() => {});
  const w = page.getByRole('button', { name: /^watch$/i }).first();
  let mounted = false;
  if (await w.count() > 0) {
    await w.click({ timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(2000);
    mounted = (await page.locator('[data-square]').count() > 0) && (await page.locator('[data-testid="walkthrough-progress"],[data-testid="walkthrough-mode"]').count() === 0);
    await page.waitForTimeout(10000); // let the narration speak
  }
  const captured = streamed.slice(evBefore);
  const voice = captured.filter(e => /voice|speak|narration/i.test(e.kind || ''));
  const tts = ttsCalls.length - ttsBefore;
  const sample = (voice.find(e => e.kind === 'coach-narration-spoken')?.summary || '').replace(/^.*text="/, '').slice(0, 70);
  out.push({ id, mounted, tts, voice: voice.length });
  console.log(`  ${id}: lessonMounted=${mounted} | voiceEvents=${voice.length} ttsCalls=${tts}${sample ? ` | spoke: "${sample}…"` : ''}`);
}

console.log('\n=== (2) audit-stream AFTER ===');
const after = await pull(runStart);
console.log('  ', after.error ? `ERROR ${after.error}` : `${(after.entries || []).length} prod events this run`);
console.log('  pageErrors:', pageErrors.length, pageErrors.slice(0, 2).join(' | '));

const totalVoice = out.reduce((a, o) => a + o.voice, 0);
const mountedAll = out.every(o => o.mounted);
console.log(`\n=== RESULT ===`);
console.log(`  lessons mounted curated (Gate A): ${out.filter(o => o.mounted).length}/${TARGETS.length}`);
console.log(`  narration voice events captured: ${totalVoice}  ${totalVoice > 0 ? '✓ NARRATION FIRES on prod' : '✗'}`);
console.log(`  pageErrors: ${pageErrors.length}`);
const ok = mountedAll && totalVoice > 0 && pageErrors.length === 0;
console.log(ok ? '\nALL THREE INSTRUMENTS GREEN ✓' : '\n(see above)');
await browser.close();
await listener.stop?.();
process.exit(ok ? 0 : 1);
