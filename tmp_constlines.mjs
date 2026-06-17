import fs from 'fs';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const src=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
// parse mapping lines: 'key': CONST,
const re=/^\s*'([^']+)':\s*([A-Z_][A-Z0-9_]*),/gm;
const constKeys={}; let m;
while((m=re.exec(src))){ (constKeys[m[2]] ??= []).push(m[1]); }
function movesOf(key){
  const mm=/^(.+)::(\d+)::(.+)@(\d+)$/.exec(key); const [,op,vi,trig,ply]=mm;
  const list=d[op]?.[vi]??[]; const s=list.find(x=>x.triggerMove===trig&&x.atPly===Number(ply));
  return s?{moves:s.moves.join(' '),atPly:s.atPly,len:s.moves.length}:null;
}
const single=[], multi=[];
for(const [cst,keys] of Object.entries(constKeys)){
  const arrs=new Set(), plies=new Set();
  for(const k of keys){ const mo=movesOf(k); if(mo){arrs.add(mo.moves);plies.add(mo.atPly);} }
  const rec={cst, nKeys:keys.length, nArr:arrs.size, plies:[...plies], sampleMoves:[...arrs][0], sampleLen:movesOf(keys[0])?.len};
  if(arrs.size===1) single.push(rec); else multi.push(rec);
}
console.log('=== SINGLE-ARRAY consts (clean beat target):',single.length,'===');
for(const r of single) console.log(`${r.cst}  ply=${r.plies[0]} len=${r.sampleLen}  [${r.sampleMoves}]`);
console.log('\n=== MULTI-ARRAY consts:',multi.length,'===');
for(const r of multi) console.log(`${r.cst}  nArr=${r.nArr} plies=[${r.plies.join(',')}] keys=${r.nKeys}`);
