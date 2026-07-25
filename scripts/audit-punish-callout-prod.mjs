#!/usr/bin/env node
/**
 * MANUAL / EXPLORATORY prod-play harness for the live punish-callout + Show-the-
 * line + break-book on the Learn Play rung (OpeningPlayMode). David 2026-07-24:
 * "run the audit yourself, not a bot, so you can push buttons."
 *
 * Drives prod BY HAND via the gated __playMove hook: dismiss consent/calibration
 * /help -> unlock the ladder -> Play -> set Easy -> play quiet legal moves,
 * watching each student turn for [data-testid="punish-callout"]; on a hit it
 * clicks show-the-line and verifies the reveal.
 *
 * NOTE: the callout fires on a SINGLE clear tactical shot (opponent hangs one
 * piece), which is opportunistic in bot play — so this is an exploratory driver,
 * NOT a deterministic gate. The DETERMINISTIC wiring proof is the component test
 * src/components/Openings/OpeningPlayMode.punishCallout.test.tsx (mocks a winning
 * single-shot -> asserts banner + withheld move + show-the-line reveal + voice).
 *
 * Run: AUDIT_SANDBOX=1 AUDIT_PROXY=$HTTPS_PROXY OP=caro-kann MYCOLOR=b \
 *      node scripts/audit-punish-callout-prod.mjs
 */
import { Chess } from 'chess.js';
import { resolveChromiumExecutable, sandboxLaunchArgs, sandboxContextOptions } from './audit-lib/chromium.mjs';
const URL='https://chess-academy-pro.vercel.app'; const OPENING=process.env.OP||'caro-kann';
const MYCOLOR=process.env.MYCOLOR||'b'; // caro-kann student = black
const SECRET=process.env.AUDIT_STREAM_SECRET||'';
const pull=async s=>{try{const r=await fetch(`${URL}/api/audit-stream?since=${s}`,{headers:{'x-audit-secret':SECRET}});const j=await r.json();return j.entries||j.events||[];}catch{return[];}};
const t0=Date.now();
const browser=await chromium.launch({executablePath:await resolveChromiumExecutable(),args:sandboxLaunchArgs()});
const page=await (await browser.newContext(sandboxContextOptions())).newPage();
const errs=[];page.on('pageerror',e=>errs.push('PAGEERROR: '+e.message));page.on('console',m=>{if(m.type()==='error'){const x=m.text();if(!/Download the React|favicon|ERR_|Manifest/.test(x))errs.push('CONSOLE: '+x.slice(0,160));}});
const D=async(t,l)=>{try{await page.locator(`[data-testid="${t}"]`).first().click({timeout:8000});console.log('  ✓',l);await page.waitForTimeout(1000);return true;}catch{console.log('  ·',l,'(none)');return false;}};
const PMAP={wP:'P',wN:'N',wB:'B',wR:'R',wQ:'Q',wK:'K',bP:'p',bN:'n',bB:'b',bR:'r',bQ:'q',bK:'k'};
async function buildFen(turn){const m=await page.evaluate(()=>{const o={};for(const el of document.querySelectorAll('[data-square]')){const pc=el.querySelector('[data-piece]');if(pc)o[el.getAttribute('data-square')]=pc.getAttribute('data-piece');}return o;});
  const rows=[];for(let r=8;r>=1;r--){let e=0,row='';for(const f of 'abcdefgh'){const p=m[f+r];if(p){if(e){row+=e;e=0;}row+=PMAP[p]||'';}else e++;}if(e)row+=e;rows.push(row);}return rows.join('/')+` ${turn} - - 0 1`;}
const recent=[];
async function playSmart(){const fen=await buildFen(MYCOLOR);let g;try{g=new Chess(fen);}catch{return{err:'badfen',fen};}
  const moves=g.moves({verbose:true});if(!moves.length)return{err:'nomoves',fen};
  const val={p:1,n:3,b:3,r:5,q:9,k:0};
  // QUIET play: develop pieces, castle; only take a capture that wins material for FREE (>=+3 net) so we don't
  // instantly resolve every tactic — we want the weak opponent to hang ONE piece and the callout to flag it.
  const score=mv=>{let s=0;const gain=mv.captured?val[mv.captured]-val[g.get(mv.from).type]:0;if(mv.captured&&gain>=3)s+=20+gain;else if(mv.captured)s-=5;if(mv.san==='O-O'||mv.san==='O-O-O')s+=8;if(/[nb]/.test(mv.piece)&&/[3-6]/.test(mv.to[1])&&mv.from[1]!=mv.to[1])s+=4;if(mv.piece==='p'&&['d','e','c'].includes(mv.to[0]))s+=2;if(recent.includes(mv.san))s-=10;return s;};
  moves.sort((a,b)=>score(b)-score(a));const mv=moves[0]; recent.push(mv.san); if(recent.length>4)recent.shift();
  const ok=await page.evaluate(({f,t,p})=>{if(typeof window.__playMove==='function'){window.__playMove(f,t);return true;}return false;},{f:mv.from,t:mv.to,p:mv.promotion});
  return{ok,san:mv.san,cap:mv.captured||null,fen};}

await page.goto(`${URL}/openings/${OPENING}`,{waitUntil:'domcontentloaded',timeout:60000});
await D('ai-consent-allow','consent');
await page.evaluate(async()=>{try{localStorage.setItem('auditMoveHook','1');}catch{}const dbs=await indexedDB.databases();const nm=(dbs.find(d=>/chess/i.test(d.name||''))||{}).name;if(!nm)return;await new Promise(res=>{const q=indexedDB.open(nm);q.onsuccess=()=>{const db=q.result;if(!db.objectStoreNames.contains('profiles'))return res();const tx=db.transaction('profiles','readwrite');const ps=tx.objectStore('profiles');const g=ps.getAll();g.onsuccess=()=>{for(const p of g.result){p.preferences=p.preferences||{};p.preferences.voiceEnabled=true;p.preferences.coachNarration='full';p.rating=800;ps.put(p);}};tx.oncomplete=()=>res();};q.onerror=()=>res();setTimeout(res,5000);});}).catch(()=>{});
console.log('seeded; reload');await page.reload({waitUntil:'domcontentloaded'});await page.waitForTimeout(2500);
await D('ai-consent-allow','consent2');await D('skill-band-intermediate','calib');await page.waitForTimeout(1000);await D('page-help-close','help');await page.waitForTimeout(1500);
const ub=page.locator('[data-testid="unlock-all-btn"]').first();try{await ub.scrollIntoViewIfNeeded({timeout:8000});await ub.click({force:true,timeout:8000});await page.waitForTimeout(1200);}catch{}
await D('weapons-unlock-all-btn','weapons');await page.waitForTimeout(2000);
if(!(await page.locator('[data-testid="play-btn"]').isEnabled().catch(()=>false))){console.log('PLAY LOCKED — abort');await browser.close();process.exit(3);}
await page.locator('[data-testid="play-btn"]').scrollIntoViewIfNeeded().catch(()=>{});await page.locator('[data-testid="play-btn"]').click();await page.waitForTimeout(4000);
if(!(await page.locator('[data-testid="opening-play-mode"]').count())){console.log('NOT IN PLAY — abort');await browser.close();process.exit(3);}
await D('difficulty-easy','easy');await page.waitForTimeout(1500);
console.log('IN PLAY. hook ready:',await page.evaluate(()=>typeof window.__playMove==='function'));
let tested=false,cofired=0;
try{ for(let i=0;i<32 && !tested;i++){
  await page.waitForTimeout(4500); // let opponent reply + the depth-12 eval LAND before checking the callout
  if(await page.locator('[data-testid="punish-callout"]').count()){cofired++;const txt=await page.locator('[data-testid="punish-callout-text"]').innerText().catch(()=>'');console.log(`  🎯 CALLOUT: "${txt}"`);
    if(await page.locator('[data-testid="show-the-line"]').count()){await page.locator('[data-testid="show-the-line"]').click();await page.waitForTimeout(1500);const rev=await page.locator('[data-testid="punish-callout-text"]').innerText().catch(()=>'');const arr=await page.evaluate(()=>document.querySelectorAll('svg line,svg [marker-end],[class*="arrow"]').length);console.log(`  ✓ SHOW-THE-LINE → "${rev}" | arrow els:${arr}`);tested=true;break;}}
  const r=await playSmart();
  if(r.ok)console.log(`  ply${i}: ${MYCOLOR} ${r.san}${r.cap?' x'+r.cap:''}`);else{await page.waitForTimeout(1800);/*not my turn/illegal → wait*/}
}
} catch(e){ console.log('  (play loop ended:',String(e).slice(0,60),')'); }
const ev=await pull(t0).catch(()=>[]);const J=e=>JSON.stringify(e);
console.log('=== STREAM ===','break-book:',ev.filter(e=>/break-book/i.test(J(e))).length,'| punishCallout:',ev.filter(e=>/punishCallout|punish callout/i.test(J(e))).length,'| narration:',ev.filter(e=>/narration-spoken|voice-speak/i.test(J(e))).length,'| total:',ev.length);
console.log('=== RESULT ===','callout DOM fired:',cofired,'| show-the-line tested:',tested);
console.log('ERRORS:',errs.length?('\n  '+errs.join('\n  ')):'none');
await browser.close();
