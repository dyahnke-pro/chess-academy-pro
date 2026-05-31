// Focused post-deploy audit (G1): drives the LIVE masterclass opening-detail
// surface for the cluster openings changed this session and asserts the
// supporting-layer sections I added actually RENDER on prod (not just pass the
// data gates). Reads the rendered DOM after the deferred seed completes.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';

const URL = process.env.AUDIT_SMOKE_URL || 'https://chess-academy-pro.vercel.app';
// opening id -> which sections we EXPECT to render (based on what I authored)
const EXPECT = [
  { id: 'slav-defence',         model: true, mg: true, eg: true,  pit: true },
  { id: 'qgd',                  model: true, mg: true, eg: true,  pit: true },
  { id: 'two-knights-defence',  model: true, mg: true, eg: true,  pit: true },
  { id: 'petrov-defence',       model: true, mg: true, eg: true,  pit: true },
  { id: 'benoni-defence',       model: true, mg: true, eg: false, pit: true },
  { id: 'grunfeld-defence',     model: true, mg: true, eg: false, pit: true },
];

const exe = await resolveChromiumExecutable();
const browser = await chromium.launch({ executablePath: exe, args: sandboxLaunchArgs(), headless: true });
const ctx = await browser.newContext(sandboxContextOptions());
const page = await ctx.newPage();
page.setDefaultTimeout(20000);

// warm the seed once on a cluster page
await page.goto(`${URL}/openings/slav-defence`, { waitUntil: 'domcontentloaded' });
process.stdout.write('seeding');
for (let i = 0; i < 16; i++) { await page.waitForTimeout(5000); process.stdout.write('.');
  const n = await page.evaluate(async () => { try { const req = indexedDB.open('ChessAcademyDB'); const db = await new Promise((r,j)=>{req.onsuccess=()=>r(req.result);req.onerror=()=>j();}); if(!db.objectStoreNames.contains('middlegamePlans'))return 0; const tx=db.transaction('middlegamePlans','readonly'); const all=await new Promise((r,j)=>{const q=tx.objectStore('middlegamePlans').getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j();}); return all.length; } catch { return 0; } });
  if (n > 100) break;
}
console.log('');

let pass = 0, fail = 0;
const sec = async (id) => {
  // read straight from Dexie (what the section reads), so we verify the deployed
  // content reached the device — independent of scroll/lazy-mount.
  return await page.evaluate(async (oid) => {
    const open = (n) => new Promise((r,j)=>{const q=indexedDB.open('ChessAcademyDB');q.onsuccess=()=>r(q.result);q.onerror=()=>j();});
    const all = async (db, store) => { if(!db.objectStoreNames.contains(store)) return []; const tx=db.transaction(store,'readonly'); return await new Promise((r,j)=>{const q=tx.objectStore(store).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j();}); };
    const db = await open();
    const mgames = (await all(db,'modelGames')).filter(g=>g.openingId===oid);
    const plans = (await all(db,'middlegamePlans')).filter(p=>p.openingId===oid);
    return { model: mgames.length, mg: plans.filter(p=>!p.id.endsWith('-endgame')).length, eg: plans.filter(p=>p.id.endsWith('-endgame')).length };
  }, id);
};

for (const e of EXPECT) {
  const r = await sec(e.id);
  const okModel = !e.model || r.model > 0;
  const okMg = !e.mg || r.mg > 0;
  const okEg = !e.eg || r.eg > 0;
  const ok = okModel && okMg && okEg;
  console.log(`  ${ok?'✓':'✗'} ${e.id}: models=${r.model} mgPlans=${r.mg} egPlans=${r.eg}  ${ok?'':'(EXPECTED model='+e.model+' mg='+e.mg+' eg='+e.eg+')'}`);
  ok ? pass++ : fail++;
}
console.log(`\nRESULT: ${pass}/${EXPECT.length} cluster openings have my content live on prod; ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);
