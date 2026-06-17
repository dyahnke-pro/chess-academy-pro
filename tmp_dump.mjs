import fs from 'fs';
import { Chess } from 'chess.js';
const d = JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const base = fs.readFileSync('./src/data/lessons/sublineNarration.ts','utf8');
const mine = fs.readFileSync('./src/data/lessons/sublineNarrationE4E5.ts','utf8');
const op = process.argv[2];
const o=d[op]||{};
const seen=new Set();
const byMoves=new Map();
for(const vi of Object.keys(o)) for(const s of o[vi]){
  const key=`${op}::${vi}::${s.triggerMove}@${s.atPly}`;
  if(seen.has(key))continue;seen.add(key);
  if(base.includes(`'${key}'`)||mine.includes(`'${key}'`))continue;
  const ms=s.moves.join(' ');
  if(!byMoves.has(ms))byMoves.set(ms,{keys:[],trig:s.triggerMove,atPly:s.atPly,pct:s.pct,term:s.atPly===s.moves.length-1,moves:s.moves});
  byMoves.get(ms).keys.push(key);
}
const arr=[...byMoves.values()].sort((a,b)=> a.trig<b.trig?-1:a.trig>b.trig?1: b.pct-a.pct);
for(const e of arr){
  const c=new Chess(); for(const m of e.moves)c.move(m);
  const turn=c.turn()==='w'?'W2move':'B2move';
  console.log(`TRIG ${e.trig}@${e.atPly} ${e.pct}% ${e.term?'TERM':'CONT'} ${turn} n=${e.keys.length}`);
  console.log(`   ${e.moves.join(' ')}`);
  console.log(`   ${e.keys.join('  ')}`);
}
console.log('UNIQUE LINES:',arr.length);
