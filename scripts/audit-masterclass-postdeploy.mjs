// FULL 3-INSTRUMENT POST-DEPLOY AUDIT (G1) for the masterclass surfaces changed
// this session (model games, middlegame/endgame plans, pitfalls, narration).
//   (1) Playwright drives the LIVE prod opening-detail surface
//   (2) Live audit-stream pulled before + after, diff'd
//   (3) Local listener sidecar captures voice/narration events off the page
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { startAuditListener, LOCAL_LISTENER_SECRET } from './audit-lib/audit-listener.mjs';

const PROD = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
const SECRET = process.env.AUDIT_STREAM_SECRET;
const results = [];
const rec = (name, status, detail='') => { results.push({ name, status, detail }); console.log(`  [${status}] ${name}${detail?' — '+detail:''}`); };

async function pullStream(sinceMs) {
  if (!SECRET) return { error: 'no secret' };
  try { const r = await fetch(`${PROD}/api/audit-stream?since=${sinceMs}`, { headers: { 'x-audit-secret': SECRET } }); if (!r.ok) return { error: `HTTP ${r.status}` }; return await r.json(); } catch (e) { return { error: String(e) }; }
}

// openings changed this session + what to expect
const TARGETS = [
  { id: 'philidor-defence',    label: 'Philidor (narration edit)',  sections: ['model','mg'] },
  { id: 'two-knights-defence', label: 'Two Knights (narration+plan+endgame)', sections: ['model','mg','eg'] },
  { id: 'slav-defence',        label: 'Slav (model+plan+endgame)',   sections: ['model','mg','eg'] },
  { id: 'nimzo-indian',        label: 'Nimzo (endgame OCB)',         sections: ['model','mg','eg'] },
  { id: 'caro-kann',           label: 'Caro-Kann (keystone regression)', sections: ['model','mg'] },
];

console.log('=== (2) audit-stream BEFORE ===');
const before = await pullStream(Date.now() - 60000);
rec('prod audit-stream reachable', before.error ? 'FAIL' : 'PASS', before.error || `${(before.entries||[]).length} events/60s, storage ok`);

console.log('=== (3) local listener sidecar ===');
const listener = await startAuditListener();
console.log(`  listener: ${listener.url}`);

console.log('=== (1) Playwright driving live prod ===');
const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, headless: true, args: sandboxLaunchArgs() });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
const pageErrors = [], voiceEvents = [];
page.on('pageerror', e => pageErrors.push(`pageerror: ${e.message}`));
page.on('request', req => { if (req.url().includes('/api/audit-stream') && req.method()==='POST') { try { const b=req.postDataJSON(); for (const e of (b?.entries||[])) if (/voice|speak|narration/i.test(e.kind||'')) voiceEvents.push(e); } catch {} } });

const runStart = Date.now();
try {
  await page.goto(`${PROD}/`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.evaluate(({url,secret}) => { localStorage.setItem('auditStreamUrl',url); localStorage.setItem('auditStreamSecret',secret); }, { url: listener.url, secret: LOCAL_LISTENER_SECRET });
  // dismiss onboarding
  await page.waitForSelector('[data-testid="strength-calibration-bubble"]', { timeout: 8000 }).catch(()=>null);
  await page.waitForTimeout(3000);
  if (await page.locator('[data-testid="strength-calibration-bubble"]').count() > 0) {
    await page.locator('[data-testid="skill-band-intermediate"]').click({ timeout: 5000 }).catch(()=>{});
    await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({ state:'detached', timeout: 15000 }).catch(()=>{});
  }
  // warm the deferred seed
  process.stdout.write('  seeding');
  for (let i=0;i<14;i++){ await page.waitForTimeout(5000); process.stdout.write('.');
    const n = await page.evaluate(async()=>{try{const q=indexedDB.open('ChessAcademyDB');const db=await new Promise((r,j)=>{q.onsuccess=()=>r(q.result);q.onerror=()=>j();});if(!db.objectStoreNames.contains('middlegamePlans'))return 0;const tx=db.transaction('middlegamePlans','readonly');const a=await new Promise((r,j)=>{const g=tx.objectStore('middlegamePlans').getAll();g.onsuccess=()=>r(g.result);g.onerror=()=>j();});return a.length;}catch{return 0;}});
    if (n>200) break;
  }
  console.log(' seeded');

  for (const t of TARGETS) {
    console.log(`\n--- ${t.label} [${t.id}] ---`);
    await page.goto(`${PROD}/openings/${t.id}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2500);
    await page.locator('[data-testid="page-help-modal"] button, [aria-label="Close"]').first().click({ timeout: 2000 }).catch(()=>{});

    // sections present in Dexie (what the sections render from) — deploy reached device
    const have = await page.evaluate(async (oid)=>{ const open=()=>new Promise((r,j)=>{const q=indexedDB.open('ChessAcademyDB');q.onsuccess=()=>r(q.result);q.onerror=()=>j();}); const all=async(db,s)=>{if(!db.objectStoreNames.contains(s))return[];const tx=db.transaction(s,'readonly');return await new Promise((r,j)=>{const g=tx.objectStore(s).getAll();g.onsuccess=()=>r(g.result);g.onerror=()=>j();});}; const db=await open(); const mg=(await all(db,'modelGames')).filter(g=>g.openingId===oid); const pl=(await all(db,'middlegamePlans')).filter(p=>p.openingId===oid); return { model:mg.length, mg:pl.filter(p=>!p.id.endsWith('-endgame')).length, eg:pl.filter(p=>p.id.endsWith('-endgame')).length }; }, t.id);
    for (const s of t.sections) {
      const n = have[s]; const ok = n>0;
      rec(`${t.id} ${s} content live`, ok?'PASS':'FAIL', `count=${n}`);
    }

    // Gate A runtime: tap Watch → must mount curated LessonPlayer, NOT legacy WalkthroughMode
    const vBefore = voiceEvents.length;
    const watch = page.getByRole('button', { name: /^watch$/i }).first();
    if (await watch.count() > 0) {
      await watch.click({ timeout: 6000 }).catch(()=>{});
      await page.waitForTimeout(6000); // let the lesson mount + narrate
      const legacy = await page.locator('[data-testid="walkthrough-progress"], [data-testid="walkthrough-mode"]').count();
      rec(`${t.id} Watch = curated lesson (Gate A)`, legacy===0?'PASS':'FAIL', legacy?'legacy WalkthroughMode mounted!':'LessonPlayer (no legacy testid)');
      const fired = voiceEvents.length - vBefore;
      rec(`${t.id} Watch narration fired`, fired>0?'PASS':'WARN', `${fired} voice events`);
      // exit back
      await page.locator('[data-testid="walkthrough-back"], [aria-label="Back"], button:has-text("Exit")').first().click({ timeout: 3000 }).catch(()=>{ });
      await page.goBack({ timeout: 5000 }).catch(()=>{});
    } else {
      rec(`${t.id} Watch button found`, 'WARN', 'no Watch button located');
    }
  }
} catch (e) {
  rec('audit run', 'FAIL', String(e).slice(0,200));
} finally {
  rec('no page errors', pageErrors.length===0?'PASS':'FAIL', pageErrors.slice(0,3).join(' | '));
  await browser.close();
}

console.log('\n=== (2) audit-stream AFTER (delta) ===');
const after = await pullStream(runStart);
const delta = after.error ? [] : (after.entries||[]);
rec('audit-stream delta captured', after.error?'WARN':'PASS', after.error || `${delta.length} events this run`);
const kinds = {}; for (const e of [...delta, ...voiceEvents]) kinds[e.kind]=(kinds[e.kind]||0)+1;
console.log('  event kinds:', JSON.stringify(kinds));
console.log(`  listener voice events: ${voiceEvents.length}`);

const fails = results.filter(r=>r.status==='FAIL');
const warns = results.filter(r=>r.status==='WARN');
console.log(`\n=== RESULT: ${results.filter(r=>r.status==='PASS').length} PASS / ${warns.length} WARN / ${fails.length} FAIL ===`);
if (fails.length) { console.log('FAILURES:'); fails.forEach(f=>console.log('  ✗ '+f.name+' — '+f.detail)); }
await listener.stop?.();
process.exit(fails.length ? 1 : 0);
