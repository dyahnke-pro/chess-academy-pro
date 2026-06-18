import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const data = JSON.parse(readFileSync('/home/user/chess-academy-pro/src/data/course-sublines.json','utf8'));
const src = readFileSync('/home/user/chess-academy-pro/src/data/lessons/sublineNarrationE4Other.ts','utf8');
const OP = process.env.OPENING;
const keyToConst={}; for(const m of src.matchAll(/^\s+'([^']+)':\s*(N\d+),/gm)) keyToConst[m[1]]=m[2];
function hasPast(k,ply){const b=src.match(new RegExp(`const ${k}: SublineNarration = \\{[\\s\\S]*?\\n\\};`))?.[0]||'';const a=[...b.matchAll(/atMove:\s*(\d+)/g)].map(x=>+x[1]);return a.length&&Math.max(...a)>ply;}
const seen=new Set();
for(const v of Object.keys(data[OP]||{})) for(const s of data[OP][v]){
  const key=`${OP}::${v}::${s.triggerMove}@${s.atPly}`; const k=keyToConst[key]; if(!k) continue;
  if(s.moves.length-1-s.atPly<4) continue; if(hasPast(k,s.atPly)) continue; if(seen.has(k)) continue; seen.add(k);
  const c=new Chess(); const sw=s.atPly%2===1; const studentMoves=[];
  s.moves.forEach((mv,i)=>{const r=c.move(mv); if(i>s.atPly && (r.color==='w')===sw) studentMoves.push(`${i}:${mv}(${r.piece.toUpperCase()}${r.from}>${r.to})`);});
  console.log(`${k} dev=${s.triggerMove}@${s.atPly} | ${studentMoves.join('  ')}`);
}
