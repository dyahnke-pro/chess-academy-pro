import fs from 'fs';
import { Chess } from 'chess.js';
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const src=fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const re=/^\s*'([^']+)':\s*([A-Z_][A-Z0-9_]*),/gm;
const constKeys={}; let m; while((m=re.exec(src))){ (constKeys[m[2]] ??= []).push(m[1]); }
function movesOf(key){const mm=/^(.+)::(\d+)::(.+)@(\d+)$/.exec(key);const[,op,vi,trig,ply]=mm;const list=d[op]?.[vi]??[];const s=list.find(x=>x.triggerMove===trig&&x.atPly===Number(ply));return s||null;}
const already=new Set(['RUY_STEINITZ','RUY_SCHLIEMANN_W','TK_SCOTCH','TK_FOUR_KNIGHTS','TK_RUY','FK_G6']);
for(const [cst,keys] of Object.entries(constKeys)){
  const arrs=new Set(keys.map(k=>movesOf(k)?.moves.join(' ')));
  if(arrs.size!==1) continue;
  if(already.has(cst)) continue;
  const s=movesOf(keys[0]); const c=new Chess();
  for(let i=0;i<=s.atPly;i++) c.move(s.moves[i]);
  const stu=c.turn(); // side to respond = student
  const mine=[]; for(const row of c.board()) for(const sq of row) if(sq&&sq.color===stu&&sq.type!=='p') mine.push(`${sq.type}@${sq.square}`);
  console.log(`${cst}  dev=${s.triggerMove}@${s.atPly} student=${stu==='w'?'White':'Black'}  pieces:${mine.join(' ')}`);
}
