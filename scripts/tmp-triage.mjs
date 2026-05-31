import fs from 'node:fs'; import { Chess } from 'chess.js';
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const plans=JSON.parse(fs.readFileSync('src/data/middlegame-plans.json','utf8'));
const rep=JSON.parse(fs.readFileSync('src/data/repertoire.json','utf8'));
const colorOf={}; for(const o of (Array.isArray(rep)?rep:[])) if(o.id) colorOf[o.id]=o.color;
const short=[];
for(const pl of plans){
  if((pl.openingId||'').startsWith('pro-')||(pl.id||'').startsWith('mp-progothamchess')||(pl.id||'').startsWith('mp-pronaro')) continue;
  const l=(pl.playableLines||[])[0]; if(!l) continue;
  if((l.moves||[]).length<8) short.push({id:pl.id,openingId:pl.openingId,need:8-(l.moves||[]).length,line:l});
}
const rows=[];
for(const s of short){
  await sleep(90);
  const c=new Chess(s.line.fen||plans.find(p=>p.id===s.id).criticalPositionFen);
  let ok=true; for(const m of s.line.moves){ try{c.move(m);}catch{ok=false;break;} }
  if(!ok){ rows.push(`${s.id}\tBAD-FEN`); continue; }
  // walk most-played masters moves up to `need` plies, require >=20 games each
  const added=[]; let stop='';
  for(let i=0;i<s.need;i++){
    const j=await fetch(`${PROXY}?source=masters&fen=${encodeURIComponent(c.fen())}`).then(r=>r.json()).catch(()=>null);
    const top=j&&j.moves&&j.moves[0]; const g=top?top.white+top.black+top.draws:0;
    if(!top||g<20){ stop=`no-data@+${added.length}(${top?top.san+'/'+g:'none'})`; break; }
    c.move(top.san); added.push(top.san+'/'+g); await sleep(90);
  }
  const status= added.length>=s.need ? 'EXTENDABLE' : (added.length>0?'PARTIAL':'LEAVE-OR-MODELGAME');
  rows.push(`${s.id}\tneed+${s.need}\t${status}\tadded:[${added.join(' ')}]\t${stop}`);
}
fs.writeFileSync('/tmp/triage.txt', rows.join('\n'));
const ext=rows.filter(r=>r.includes('\tEXTENDABLE\t')).length;
const part=rows.filter(r=>r.includes('\tPARTIAL\t')).length;
const leave=rows.filter(r=>r.includes('LEAVE-OR-MODELGAME')).length;
console.log(`triaged ${rows.length}: EXTENDABLE ${ext}, PARTIAL ${part}, LEAVE-OR-MODELGAME ${leave}`);
