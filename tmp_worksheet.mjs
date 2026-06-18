import fs from 'fs';
import { Chess } from 'chess.js';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const src=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const bc=new Set(); const bl=src.split(/const ([A-Z_][A-Z0-9_]*): SublineNarration = \{/);
for(let i=1;i<bl.length;i+=2){ if(/\n  beats:/.test(bl[i+1].split("\n};")[0])) bc.add(bl[i]); }
const re=/^\s*'([^']+)':\s*([A-Z_][A-Z0-9_]*),/gm;
const keyConst={}; let m; while((m=re.exec(src))){ keyConst[m[1]]=m[2]; }
function movesOf(k){const mm=/^(.+)::(\d+)::(.+)@(\d+)$/.exec(k);const[,op,vi,t,p]=mm;return (d[op]?.[vi]||[]).find(x=>x.triggerMove===t&&x.atPly===Number(p))||null;}
const op=process.argv[2];
const byArr={};
for(const [key,cst] of Object.entries(keyConst)){
  if(bc.has(cst)||key.split('::')[0]!==op) continue;
  const s=movesOf(key); if(!s) continue;
  const sig=s.moves.join(' ');
  (byArr[sig]=byArr[sig]||{keys:[],cst,s}).keys.push(key);
}
for(const [sig,e] of Object.entries(byArr)){
  const s=e.s; const c=new Chess(); let last;
  for(let i=0;i<=s.atPly;i++) last=c.move(s.moves[i]);
  const stu=c.turn();
  const mine=[]; for(const row of c.board()) for(const sq of row) if(sq&&sq.color===stu&&sq.type!=='p') mine.push(`${sq.type}@${sq.square}`);
  const term = s.atPly===s.moves.length-1;
  console.log(`@${s.atPly} ${s.triggerMove}${last.captured?' x'+last.captured:''}${last.san.includes('+')?' CHECK':''} dest=${last.to} ${term?'TERM':'cont(len'+s.moves.length+')'} stu=${stu==='w'?'W':'B'} ${e.cst}`);
  console.log(`   ${sig}`);
  console.log(`   stuPieces: ${mine.join(' ')}`);
  console.log(`   keys: ${e.keys.join(' ')}`);
}
console.log('positions:',Object.keys(byArr).length);
