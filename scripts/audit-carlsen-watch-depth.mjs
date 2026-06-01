import { chromium } from 'playwright';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
const BASE = process.env.AUDIT_SMOKE_URL || 'http://localhost:5173';
const MIDDLEGAME_MOVES = 12;
const OPENINGS = ['pro-carlsen-open-sicilian','pro-carlsen-ruy-lopez','pro-carlsen-queens-pawn','pro-carlsen-sicilian','pro-carlsen-1e5','pro-carlsen-nimzo','pro-carlsen-kid','pro-carlsen-french'];
const results=[];
const rec=(n,s,d)=>{results.push({n,s,d});console.log(`  [${s}] ${n}${d?': '+d:''}`);};
const browser=await chromium.launch({executablePath:await resolveChromiumExecutable(),headless:true,args:sandboxLaunchArgs()});
const ctx=await browser.newContext(sandboxContextOptions());const page=await ctx.newPage();
async function dismissOnboarding(){try{await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({timeout:12000});await page.locator('[data-testid="skill-band-intermediate"]').click({timeout:5000});await page.locator('[data-testid="strength-calibration-bubble"]').waitFor({state:'detached',timeout:15000});}catch{}}
async function dismissHelp(){const m=page.locator('[data-testid="page-help-modal"]');if(await m.count()>0){await page.keyboard.press('Escape').catch(()=>null);await m.waitFor({state:'detached',timeout:5000}).catch(()=>null);}}
console.log(`=== Carlsen Watch-depth audit vs ${BASE} ===\n`);
await page.goto(`${BASE}/`,{waitUntil:'domcontentloaded',timeout:30000});
await dismissOnboarding();
console.log('  waiting 55s for seed...');await page.waitForTimeout(55000);
let legacy=0,short=0;
for(const id of OPENINGS){
  const s=id.replace('pro-carlsen-','');
  for(const route of [`${BASE}/openings/pro/carlsen/${id}`,`${BASE}/openings/${id}`]){
    await page.goto(route,{waitUntil:'networkidle',timeout:25000}).catch(()=>null);
    await page.waitForTimeout(2500);await dismissHelp();
    if(await page.locator('button:has-text("Watch"),[data-testid*="watch"]').count()>0)break;
  }
  let clicked=false;
  for(const sel of ['button:has-text("Watch")','[data-testid*="watch"]']){const el=page.locator(sel).first();if(await el.count()>0&&await el.isVisible().catch(()=>false)){await el.click().catch(()=>null);clicked=true;break;}}
  if(!clicked){rec(`${s}: Watch button`,'WARN','not found');continue;}
  await page.waitForTimeout(2500);await dismissHelp();
  const isLegacy=await page.locator('[data-testid="walkthrough-progress"],[data-testid="walkthrough-back"]').count()>0;
  const bodyTxt=await page.evaluate(()=>document.body.innerText).catch(()=>'');
  const m=bodyTxt.match(/Move\s+\d+\s*\/\s*(\d+)/i);const tot=m?parseInt(m[1],10):null;
  if(isLegacy){legacy++;rec(`${s}: curated LessonPlayer (not legacy)`,'FAIL',`legacy${tot?', '+tot+' moves':''}`);}
  else rec(`${s}: curated LessonPlayer (Gate A)`,'PASS');
  if(tot!==null&&tot<MIDDLEGAME_MOVES){short++;rec(`${s}: reaches middlegame`,'FAIL',`only ${tot}`);}
  await page.locator('[data-testid="walkthrough-back"]').click({timeout:3000}).catch(()=>page.goBack().catch(()=>null));
  await page.waitForTimeout(800);
}
await browser.close();
const pass=results.filter(r=>r.s==='PASS').length,fail=results.filter(r=>r.s==='FAIL').length,warn=results.filter(r=>r.s==='WARN').length;
console.log(`\n=== RESULT: ${pass} passed, ${fail} failed, ${warn} warnings (legacy ${legacy}/8, short ${short}/8) ===`);
process.exit(fail>0?1:0);
