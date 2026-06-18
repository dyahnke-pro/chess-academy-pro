import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const src=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
// consts with beats already
const bc=new Set(); const bl=src.split(/const ([A-Z_][A-Z0-9_]*): SublineNarration = \{/);
for(let i=1;i<bl.length;i+=2){ if(/\n  beats:/.test(bl[i+1].split("\n};")[0])) bc.add(bl[i]); }
const re=/^\s*'([^']+)':\s*([A-Z_][A-Z0-9_]*),/gm;
const keyConst={}; let m; while((m=re.exec(src))){ keyConst[m[1]]=m[2]; }
function movesOf(k){const mm=/^(.+)::(\d+)::(.+)@(\d+)$/.exec(k);const[,op,vi,t,p]=mm;return (d[op]?.[vi]||[]).find(x=>x.triggerMove===t&&x.atPly===Number(p))||null;}
const perOp={}; const arraysByOp={};
for(const [key,cst] of Object.entries(keyConst)){
  if(bc.has(cst)) continue; // already beated
  const op=key.split('::')[0];
  const s=movesOf(key); if(!s) continue;
  perOp[op]=perOp[op]||{keys:0,arrs:new Set()};
  perOp[op].keys++; perOp[op].arrs.add(s.moves.join(' '));
}
let tk=0,ta=0;
for(const [op,v] of Object.entries(perOp)){ console.log(`${op}: ${v.keys} keys, ${v.arrs.size} distinct positions`); tk+=v.keys; ta+=v.arrs.size; }
console.log(`\nTOTAL: ${tk} un-beated keys, ${ta} distinct positions to author`);
