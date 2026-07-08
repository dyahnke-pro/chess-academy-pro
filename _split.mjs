import { Chess } from 'chess.js';
import fs from 'fs';
import { makeEval } from './scripts/_engine-eval.mjs';
const fam=process.argv[2];
const d=JSON.parse(fs.readFileSync('./src/data/course-sublines.json','utf8'));
const gp=d[fam];
const src=fs.readFileSync('./src/data/lessons/sublineNarrationD4Flank.ts','utf8');
const reg={};
const re=new RegExp(fam.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"::(\\d+)::([^']+)': ([A-Za-z0-9_]+),","g");
for(const m of src.matchAll(re)) reg[m[1]+':'+m[2]]=m[3];
const byMoves=new Map();
for(const vi of Object.keys(gp))for(const s of gp[vi]){const key=vi+':'+s.triggerMove+'@'+s.atPly;const c=reg[key];const mk=s.moves.join(' ');if(!byMoves.has(mk))byMoves.set(mk,{moves:s.moves,pct:s.pct,old:new Set(),keys:[]});const g=byMoves.get(mk);if(c)g.old.add(c);g.keys.push(key);}
const E=makeEval(1000);let i=0;
for(const [mk,g] of byMoves){const c=new Chess();for(const m of g.moves)c.move(m);const r=await E.eval(c.fen());const stm=c.fen().split(' ')[1];const w=r.mate!=null?(r.mate>0?9999:-9999):(stm==='w'?r.cp:-r.cp);console.log('#'+(i++)+' old=['+[...g.old].join(',')+'] pct='+g.pct+' wPOV='+(w/100).toFixed(2)+' keys='+g.keys.join('|'));console.log('   '+g.moves.join(' '));}
E.quit();
