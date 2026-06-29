#!/usr/bin/env node
/* check-lesson-main-lines — does each LESSON spine (main + variation) follow the
 * DATA's main line? Walks every lesson's deepest spine against the live masters
 * explorer, book-anchored (the opening's named prefix is exempt), and flags the
 * first RARE divergence: our move is a thin sideline (< ALT_SHARE) while a much-
 * more-popular master move exists. This is the gap that let the Vienna Gambit
 * lesson teach a Qf3/f5/Nc6 sideline as "the main line." (David 2026-06-29.) */
const fs=require('fs'),path=require('path');
const {Chess}=require('chess.js');
const DATA=path.resolve(__dirname,'..','..','src','data');
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const FLOOR=30, ALT_SHARE=0.15;
const cache=fs.existsSync(path.join(DATA,'main-line-cache.json'))?JSON.parse(fs.readFileSync(path.join(DATA,'main-line-cache.json'),'utf8')):{};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ECO=JSON.parse(fs.readFileSync(path.join(DATA,'openings-lichess.json'),'utf8')).map(e=>(e.pgn||'').trim().split(/\s+/)).filter(a=>a.length);
function bookLen(sans){let best=0;for(const p of ECO){if(p.length<=best||p.length>sans.length)continue;let ok=true;for(let i=0;i<p.length;i++)if(p[i]!==sans[i]){ok=false;break;}if(ok)best=p.length;}return best;}
async function expl(uci){const k=uci.join(',');if(k in cache)return cache[k];for(let a=0;a<4;a++){try{const r=await fetch(`${PROXY}?source=masters&play=${k}`);if(r.status===429){await sleep(1500*(a+1));continue;}if(!r.ok){cache[k]=null;return null;}const j=await r.json();const moves=(j.moves||[]).map(m=>({san:m.san,g:m.white+m.draws+m.black}));const total=moves.reduce((s,m)=>s+m.g,0);cache[k]={total,moves};await sleep(120);return cache[k];}catch{await sleep(700);}}return null;}
// enumerate lesson spines: per lesson file, the deepest moves literal per distinct opening-prefix
function spines(){
  const dir=path.join(DATA,'lessons');const out=[];
  for(const f of fs.readdirSync(dir).filter(x=>x.endsWith('.ts')&&!x.endsWith('.test.ts')&&!/^pro/i.test(x)&&!/trap/i.test(x))){
    const t=fs.readFileSync(path.join(dir,f),'utf8');
    // group moves literals by their title block; take the deepest per title
    const lits=[...t.matchAll(/moves:\s*["']([^"']+)["']/g)].map(m=>m[1].trim());
    const byPrefix={};for(const p of lits){const key=p.split(/\s+/).slice(0,6).join(' ');if(!byPrefix[key]||p.length>byPrefix[key].length)byPrefix[key]=p;}
    for(const p of Object.values(byPrefix)){if(p.split(/\s+/).length>=8)out.push({file:f,pgn:p});}
  }
  return out;
}
(async()=>{
  const all=spines();const ONLY=process.argv[2];
  const lines=ONLY?all.filter(l=>l.file.toLowerCase().includes(ONLY.toLowerCase())):all;
  console.log(`Checking ${lines.length} lesson spines vs masters main line…\n`);
  const flagged=[];
  for(const l of lines){
    const sans=l.pgn.split(/\s+/);const book=bookLen(sans);const c=new Chess();const uci=[];let div=null;
    for(let i=0;i<sans.length;i++){const ours=sans[i];
      if(i<book){const mv=c.move(ours);uci.push(mv.from+mv.to+(mv.promotion||''));continue;}
      const pos=await expl(uci);if(!pos||pos.total<FLOOR)break;
      const top=pos.moves[0];const mine=pos.moves.find(m=>m.san===ours);
      if(!mine){div={ply:i+1,ours,top:top.san,share:0,topg:top.g};break;}
      if(mine.san!==top.san){const share=mine.g/pos.total;if(share<ALT_SHARE&&top.g>=2*mine.g){div={ply:i+1,ours,top:top.san,share,topg:top.g,ourg:mine.g};break;}}
      const mv=c.move(ours);uci.push(mv.from+mv.to+(mv.promotion||''));
    }
    if(div)flagged.push({file:l.file,div,pgn:l.pgn});
    fs.writeFileSync(path.join(DATA,'main-line-cache.json'),JSON.stringify(cache));
  }
  console.log(`FLAGGED ${flagged.length}/${lines.length} lesson spines diverge to a thin sideline from the data main line:\n`);
  flagged.sort((a,b)=>a.div.ply-b.div.ply);
  for(const f of flagged) console.log(`  ${f.file} :: ply ${f.div.ply} our ${f.div.ours} ${f.div.share?((f.div.share*100).toFixed(0)+'%'):'NOT-IN-DB'} vs main ${f.div.top} (${f.div.topg}g)`);
})().catch(e=>{console.error(e);process.exit(1);});
