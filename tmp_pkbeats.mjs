import fs from 'fs';
import { Chess } from 'chess.js';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
function movesOf(k){const mm=/^(.+)::(\d+)::(.+)@(\d+)$/.exec(k);const[,op,vi,t,p]=mm;return (d[op]?.[vi]||[]).find(x=>x.triggerMove===t&&x.atPly===Number(p))||null;}
// key -> beat
const B = JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let bad=0;
for(const [key,b] of Object.entries(B)){
  const s=movesOf(key); if(!s){console.log('NOKEY',key);bad++;continue;}
  if(b.at>=s.moves.length){console.log('PLYOOR',key,b.at,s.moves.length);bad++;continue;}
  if(b.exp && s.moves[b.at]!==b.exp){console.log('MISMATCH',key,'idx',b.at,'is',s.moves[b.at],'exp',b.exp);bad++;continue;}
  const c=new Chess(); for(let i=0;i<=b.at;i++) c.move(s.moves[i]);
  for(const a of (b.ar||[])) if(!c.get(a[0])){console.log('EMPTYARROW',key,a[0]);bad++;}
  if(b.short && b.short.trim().split(/\s+/).length>8){console.log('SHORT>8',key,b.short);bad++;}
}
console.log(bad?`${bad} PROBLEMS`:'VERIFIED OK');
