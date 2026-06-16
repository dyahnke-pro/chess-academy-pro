// Course-line ACCURACY audit — these are SOLD as solid recommendations, so every
// line must be legal + not losing for the student. Checks every main line, every
// variation, and EVERY subline across all course openings: (a) chess.js legality,
// (b) Stockfish eval at the terminus from the student's perspective. Flags illegal
// lines and any non-gambit line worse than -1.0 (the soundness bar). Gambits are
// exempt from the soundness flag (a sacrifice is honestly negative).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
const root=new URL('..',import.meta.url).pathname;
const sublines=JSON.parse(readFileSync(root+'src/data/course-sublines.json','utf8'));
const anti=JSON.parse(readFileSync(root+'src/data/anti-openings.json','utf8'));
const gj=JSON.parse(readFileSync(root+'src/data/gambits.json','utf8'));
const gambits=Array.isArray(gj)?gj:gj.openings||[];
const rep=JSON.parse(readFileSync(root+'src/data/repertoire.json','utf8'));
const repArr=Array.isArray(rep)?rep:rep.openings||Object.values(rep);
const colorOf={}, gambitOf={};
for(const o of repArr){ if(o&&o.id){colorOf[o.id]=o.color; gambitOf[o.id]=!!o.isGambit;} }
for(const o of anti){ colorOf[o.id]=o.color; gambitOf[o.id]=false; }
for(const o of gambits){ colorOf[o.id]=o.color; gambitOf[o.id]=true; }
function sans(pgn){const t=pgn.trim().split(/\s+/).map(x=>x.replace(/^\d+\.(\.\.)?/,'')).filter(x=>x&&!/^\d+\.?$/.test(x));const c=new Chess();const o=[];for(const m of t){try{o.push(c.move(m).san);}catch{return null;}}return o;}
function evalFen(fen,depth=14){return new Promise(res=>{const p=spawn(SF);let b=0,o='';p.stdout.on('data',d=>{o+=d;let i;while((i=o.indexOf('\n'))>=0){const ln=o.slice(0,i);o=o.slice(i+1);const m=/score (cp|mate) (-?\d+)/.exec(ln);if(m)b=m[1]==='mate'?(+m[2]>0?1000:-1000):+m[2];if(ln.startsWith('bestmove')){p.kill();res(b);}}});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);});}
// collect lines
const lines=[];
for(const o of [...repArr,...anti,...gambits]){ if(!o||!o.id||!colorOf[o.id])continue; if(o.pgn)lines.push({id:o.id,kind:'main',label:'main',moves:sans(o.pgn),raw:o.pgn}); for(const v of (o.variations||[]))lines.push({id:o.id,kind:'var',label:v.name,moves:sans(v.pgn),raw:v.pgn}); }
for(const [id,perVar] of Object.entries(sublines)) for(const subs of Object.values(perVar)) for(const s of subs) lines.push({id,kind:'sub',label:s.name,moves:s.moves,raw:s.moves.join(' ')});
console.log(`auditing ${lines.length} lines…`);
const illegal=[], losing=[];
let done=0;
for(const L of lines){
  done++;
  if(done%400===0)console.log(`  ${done}/${lines.length}`);
  const color=colorOf[L.id];
  if(!L.moves){ illegal.push({...L}); continue; }
  const c=new Chess(); let ok=true;
  for(const m of L.moves){ try{c.move(m);}catch{ok=false;break;} }
  if(!ok){ illegal.push({...L}); continue; }
  const stm=c.turn()==='w'?'white':'black';
  const raw=await evalFen(c.fen());
  const se=(stm===color?raw:-raw)/100;
  if(se < -1.0 && !gambitOf[L.id]) losing.push({id:L.id,kind:L.kind,label:L.label,eval:se,line:L.raw});
}
losing.sort((a,b)=>a.eval-b.eval);
const dir=`audit-reports/course-line-accuracy-${new Date().toISOString().replace(/[:.]/g,'-')}`;
mkdirSync(dir,{recursive:true});
writeFileSync(`${dir}/report.json`,JSON.stringify({total:lines.length,illegal,losing},null,2));
console.log(`\n=== COURSE LINE ACCURACY ===`);
console.log(`total lines: ${lines.length}`);
console.log(`ILLEGAL: ${illegal.length}`);
for(const x of illegal.slice(0,20))console.log(`  ! ${x.id} [${x.kind}] ${x.label}: ${x.raw}`);
console.log(`LOSING (student < -1.0, non-gambit): ${losing.length}`);
for(const x of losing.slice(0,30))console.log(`  ✗ ${x.id} [${x.kind}] ${x.label}  ${x.eval.toFixed(2)}  ${x.line}`);
console.log(`\nreport: ${dir}/report.json`);
