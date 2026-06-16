// Per-move WHY reference for the lines WE chose (anti-openings + gambits).
// For every move: DB frequency (is it the main move, what %), engine eval from
// the student's perspective (soundness double-check), and the move type. Grounded
// (G3/G0): facts computed in code — the authoring brief for narration later.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
const root=new URL('..',import.meta.url).pathname;
const db=JSON.parse(readFileSync(root+'public/data/openings-masters-db.json','utf8')).positions;
const anti=JSON.parse(readFileSync(root+'src/data/anti-openings.json','utf8'));
const gj=JSON.parse(readFileSync(root+'src/data/gambits.json','utf8'));
const gambits=Array.isArray(gj)?gj:gj.openings||[];
const key=f=>f.split(' ').slice(0,4).join(' ');
const movesAt=f=>db[key(f)]||[];
function sans(pgn){const t=pgn.trim().split(/\s+/).map(x=>x.replace(/^\d+\.(\.\.)?/,'')).filter(x=>x&&!/^\d+\.?$/.test(x));const c=new Chess();const o=[];for(const m of t){try{o.push(c.move(m).san);}catch{return null;}}return o;}
function evalFen(fen,depth=14){return new Promise(res=>{const p=spawn(SF);let b=0,o='';p.stdout.on('data',d=>{o+=d;let i;while((i=o.indexOf('\n'))>=0){const ln=o.slice(0,i);o=o.slice(i+1);const m=/score (cp|mate) (-?\d+)/.exec(ln);if(m)b=m[1]==='mate'?(+m[2]>0?1000:-1000):+m[2];if(ln.startsWith('bestmove')){p.kill();res(b);}}});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);});}
function moveType(san){ if(san.startsWith('O-O-O'))return 'castles queenside'; if(san.startsWith('O-O'))return 'castles kingside'; const chk=san.includes('#')?'checkmate':san.includes('+')?'with check':''; const cap=san.includes('x')?'capture':''; let base; if(/^[NBRQK]/.test(san)){const pc={N:'knight',B:'bishop',R:'rook',Q:'queen',K:'king'}[san[0]]; const to=san.replace(/[+#]/,'').slice(-2); base=`${pc} to ${to}`;} else {const to=san.replace(/[+#]/,'').slice(0,2); base=`pawn to ${to}`;} return [base,cap,chk].filter(Boolean).join(', '); }
async function lineRows(pgn,color){const s=sans(pgn);if(!s)return null;const c=new Chess();const rows=[];for(let i=0;i<s.length;i++){const fenBefore=c.fen();const ms=movesAt(fenBefore).slice().sort((a,b)=>b.games-a.games);const tot=ms.reduce((a,m)=>a+m.games,0)||1;const me=ms.find(m=>m.san===s[i]);const pct=me?Math.round(me.games/tot*100):0;const rank=me?ms.findIndex(m=>m.san===s[i])+1:0;c.move(s[i]);const stm=c.turn()==='w'?'white':'black';const raw=await evalFen(c.fen());const se=(stm===color?raw:-raw)/100;const side=((i%2===0)===(color==='white'))?'you':'opp';const freq=me?(rank===1?`main move (${pct}%)`:`${pct}% (#${rank})`):'off-book';rows.push({n:i+1,san:s[i],side,freq,ev:se,type:moveType(s[i])});}return rows;}
let md=`# Course line WHY reference — anti-openings + gambits\n\n_Generated ${new Date().toISOString().slice(0,10)}. Per move: DB frequency (is it the main move?), engine eval from the student's perspective (+ = good for you), and move type. Grounded facts = the authoring brief for narration._\n`;
async function section(o,color){
  md+=`\n## ${o.name}  \`${o.id}\`  (${color})\n`;
  const mainRows=await lineRows(o.pgn,color);
  md+=`\n**Main line:** \`${o.pgn}\`\n\n| # | move | side | frequency | eval(you) | type |\n|--|--|--|--|--|--|\n`;
  for(const r of (mainRows||[]))md+=`| ${r.n} | ${r.san} | ${r.side} | ${r.freq} | ${r.ev>=0?'+':''}${r.ev.toFixed(2)} | ${r.type} |\n`;
  for(const v of (o.variations||[])){const vr=await lineRows(v.pgn,color);md+=`\n**Variation — ${v.name}:** \`${v.pgn}\`\n\n| # | move | side | frequency | eval(you) | type |\n|--|--|--|--|--|--|\n`;for(const r of (vr||[]))md+=`| ${r.n} | ${r.san} | ${r.side} | ${r.freq} | ${r.ev>=0?'+':''}${r.ev.toFixed(2)} | ${r.type} |\n`;}
}
md+=`\n# ANTI-OPENINGS\n`;
for(const o of anti)await section(o,o.color);
md+=`\n# GAMBITS\n`;
for(const o of gambits)await section(o,o.color);
writeFileSync(root+'docs/plans/2026-06-16-course-line-why-reference.md',md);
console.log('wrote docs/plans/2026-06-16-course-line-why-reference.md ('+md.length+' chars)');
