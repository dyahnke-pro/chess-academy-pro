import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
import { autoDismissCalibration } from './audit-lib/auto-dismiss.mjs';
const BASE='https://chess-academy-pro.vercel.app';
const log=(s)=>console.log(s);
const exe=await resolveChromiumExecutable(false);
const br=await chromium.launch({headless:true,executablePath:exe,args:sandboxLaunchArgs()});
const ctx=await br.newContext({...sandboxContextOptions(),viewport:{width:414,height:896}});
await ctx.addInitScript(autoDismissCalibration);
const page=await ctx.newPage();
page.on('console',(m)=>{const t=m.text(); if(t.includes('GameAnalysis')||t.includes('Stockfish')||t.includes('analysis')||m.type()==='error') log(`  [${m.type()}] ${t.slice(0,180)}`);});
page.on('pageerror',(e)=>log(`  [pageerror] ${e.message.slice(0,180)}`));
const idb=(fn)=>page.evaluate(fn);

log('\n===== ANALYZE TRACE — lichess/german11 =====\n');
await page.goto(`${BASE}/games/import`,{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(1500);
await page.locator('[data-testid="platform-lichess"]').click().catch(()=>{});
await page.locator('[data-testid="username-input"]').fill('german11');
await page.locator('[data-testid="import-btn"]').click();
for(let i=0;i<40;i++){await page.waitForTimeout(2000); if(await page.locator('[data-testid="import-result"],[data-testid="import-stats"]').count())break;}
// check prefs username saved
const prefs=await idb(()=>new Promise((res)=>{const r=indexedDB.open('ChessAcademyDB');r.onsuccess=()=>{const db=r.result;const tx=db.transaction('profiles','readonly').objectStore('profiles').getAll();tx.onsuccess=()=>{const p=tx.result?.[0];res({lichess:p?.preferences?.lichessUsername,chesscom:p?.preferences?.chessComUsername});};tx.onerror=()=>res('err');};r.onerror=()=>res('open-err');}));
log(`imported. prefs.lichessUsername=${JSON.stringify(prefs)}`);

await page.goto(`${BASE}/weaknesses`,{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForTimeout(5000);
await page.locator('[data-testid="analyze-games-cta"]').first().click().catch((e)=>log('cta click err '+e.message));
log('clicked Analyze. capturing logs…');
for(const t of [20,40,70,100,140]){
  await page.waitForTimeout((t-[0,20,40,70,100][[20,40,70,100,140].indexOf(t)])*1000);
  const counts=await idb(()=>new Promise((res)=>{const r=indexedDB.open('ChessAcademyDB');r.onsuccess=()=>{const db=r.result;const out={};let pend=0;const get=(s,filt)=>{pend++;const st=db.transaction(s,'readonly').objectStore(s);const c=st.getAll();c.onsuccess=()=>{const arr=c.result||[];out[s]= s==='games'? `${arr.length} (analyzed:${arr.filter(g=>g.fullyAnalyzed).length}, withAnn:${arr.filter(g=>g.annotations&&g.annotations.length).length})` : arr.length; if(--pend===0)res(out);};c.onerror=()=>{if(--pend===0)res(out);};};get('games');get('mistakePuzzles');get('classifiedTactics');};r.onerror=()=>res('open-err');}));
  log(`  t+${t}s: ${JSON.stringify(counts)}`);
  if(typeof counts==='object'&&counts.mistakePuzzles>0){log('  ✓ mistakes populating');break;}
}
log('\n===== END =====');
await br.close();
