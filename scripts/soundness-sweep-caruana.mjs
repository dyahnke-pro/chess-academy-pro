#!/usr/bin/env node
// Soundness sweep: engine-eval the FINAL position of every masterclass lesson
// (main + variations) from the student's perspective, flag any where the
// student is clearly worse (< -1.0) — the hidden-dubious defects like the
// Philidor Antoshin (looked "dead-level", was -1.58). Run: node scripts/soundness-sweep.mjs
import { Chess } from 'chess.js'; import { spawn } from 'child_process';
import { build } from 'esbuild'; import { tmpdir } from 'os'; import { join } from 'path';
const SF='/usr/games/stockfish';
function ev(fen){return new Promise(res=>{const sf=spawn(SF);let cp=null;sf.stdout.on('data',d=>{const s=d.toString();const m=s.match(/score cp (-?\d+)/g);if(m)cp=parseInt(m[m.length-1].match(/-?\d+/)[0]);const mt=s.match(/score mate (-?\d+)/);if(mt)cp=parseInt(mt[1])>0?10000:-10000;if(/bestmove/.test(s)){sf.kill();res(cp);}});sf.stdin.write(`position fen ${fen}\ngo depth 18\n`);setTimeout(()=>{try{sf.kill()}catch{};res(cp)},12000);});}
const o=join(tmpdir(),`lb-${Date.now()}.mjs`);
await build({entryPoints:['src/data/lessons/index.ts'],bundle:true,format:'esm',platform:'node',outfile:o,loader:{'.json':'json'},logLevel:'error'});
const {getAllLessonScripts}=await import(o);
const lessons=getAllLessonScripts().filter(x=>!!x.key.startsWith("pro-caruana")); // masterclass only
const rows=[];
for(const {key,lesson} of lessons){
  let bt=lesson.beats[0];for(const x of lesson.beats)if(x.moves.length>bt.moves.length)bt=x;
  const c=new Chess();let ok=true;for(const m of bt.moves){try{c.move(m)}catch{ok=false;break}}
  if(!ok)continue;
  const cp=await ev(c.fen());
  const student=(lesson.orientation==='black')?'b':'w';
  const persp=c.turn()===student?cp:-cp;
  rows.push({key,student,cp:persp,plies:bt.moves.length});
}
rows.sort((a,b)=>a.cp-b.cp);
console.log('\n=== WORST FOR STUDENT (genuine soundness defects if < -100) ===');
for(const r of rows.slice(0,18))console.log(`  ${r.student} ${String(r.cp).padStart(5)}cp  (${r.plies}p)  ${r.key}`);
const bad=rows.filter(r=>r.cp<-100);
console.log(`\n${bad.length} lessons leave the student worse than -1.0 (candidates to fix/verify).`);
