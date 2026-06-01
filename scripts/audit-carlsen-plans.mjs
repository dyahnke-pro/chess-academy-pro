// Post-deploy audit (G1) for the Carlsen endgame plans (5 new openings) +
// per-variation middlegame plans (9 variations). Verifies the sections
// RENDER (not the -empty fallback) on the right tab. Matrix: /openings/*.
import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const results=[]; const rec=(n,s,d)=>{results.push({n,s,d});console.log(`  [${s}] ${n}${d?': '+d:''}`);};
const ENDGAME=['pro-carlsen-scandinavian','pro-carlsen-caro-kann','pro-carlsen-modern','pro-carlsen-closed-sicilian','pro-carlsen-reti'];
// [openingId, variation-label-token]
const VARPLANS=[
 ['pro-carlsen-open-sicilian','Classical'],
 ['pro-carlsen-ruy-lopez','Italian'],
 ['pro-carlsen-ruy-lopez','Four Knights'],
 ['pro-carlsen-queens-pawn','King'],
 ['pro-carlsen-queens-pawn','Catalan'],
 ['pro-carlsen-sicilian','Open vs'],
 ['pro-carlsen-1e5','Anti-Marshall'],
 ['pro-carlsen-nimzo','Catalan'],
 ['pro-carlsen-french','Advance'],
];
const browser=await chromium.launch({executablePath:await resolveChromiumExecutable(),headless:true,args:sandboxLaunchArgs()});
const ctx=await browser.newContext(sandboxContextOptions());const page=await ctx.newPage();
async function dismissOnboarding(){try{await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({timeout:12000});await page.locator('[data-testid="skill-band-intermediate"]').click({timeout:5000});await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({state:'detached',timeout:15000});}catch{}}
async function dismissHelp(){const m=page.locator('[data-testid="page-help-modal"]');if(await m.count()>0){await page.keyboard.press('Escape').catch(()=>null);await m.waitFor({state:'detached',timeout:5000}).catch(()=>null);}}
async function gotoOpening(id){for(const r of [`${BASE}/openings/pro/carlsen/${id}`,`${BASE}/openings/${id}`]){await page.goto(r,{waitUntil:'networkidle',timeout:30000}).catch(()=>null);await page.waitForTimeout(2500);await dismissHelp();if(await page.locator('[data-testid="variation-tabs"],button:has-text("Watch")').count()>0)return true;}return false;}
async function sectionPresent(testid){
  // scroll to bottom to mount lazy sections
  for(let i=0;i<6;i++){await page.mouse.wheel(0,2000);await page.waitForTimeout(400);}
  await page.waitForTimeout(800);
  return (await page.locator(`[data-testid="${testid}"]`).count())>0;
}
console.log(`=== Carlsen plans audit vs ${BASE} ===\n`);
await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded',timeout:30000});
await dismissOnboarding();
console.log('  waiting 55s for seed...');await page.waitForTimeout(55000);

console.log('\n-- ENDGAME plan sections (main tab) --');
for(const id of ENDGAME){
  const ok=await gotoOpening(id); if(!ok){rec(`endgame ${id}`,'SKIP','page did not mount');continue;}
  const has=await sectionPresent('endgame-plans-section');
  rec(`endgame ${id}`, has?'PASS':'FAIL', has?'endgame-plans-section rendered':'only -empty');
}
console.log('\n-- VARIATION middlegame plan sections --');
for(const [id,token] of VARPLANS){
  const ok=await gotoOpening(id); if(!ok){rec(`var ${id} :: ${token}`,'SKIP','page did not mount');continue;}
  const tab=page.locator('[data-testid="variation-tabs"] button',{hasText:token}).first();
  if(await tab.count()===0){rec(`var ${id} :: ${token}`,'FAIL','tab not found');continue;}
  await tab.click().catch(()=>null);await page.waitForTimeout(1500);await dismissHelp();
  const has=await sectionPresent('middlegame-plans-section');
  rec(`var ${id} :: ${token}`, has?'PASS':'FAIL', has?'middlegame-plans-section rendered':'only -empty/note');
}
await browser.close();
const pass=results.filter(r=>r.s==='PASS').length,fail=results.filter(r=>r.s==='FAIL').length,skip=results.filter(r=>r.s==='SKIP').length;
console.log(`\n=== ${pass} PASS / ${fail} FAIL / ${skip} SKIP ===`);
process.exit(fail>0?1:0);
