import { Chess } from 'chess.js'; import { spawn } from 'child_process';
import { build } from 'esbuild'; import { tmpdir } from 'os'; import { join } from 'path';
const SF='/usr/games/stockfish';
function ev(fen,d=24,ms=14000){return new Promise(r=>{const sf=spawn(SF);let cp=null;sf.stdout.on('data',x=>{const s=x.toString();const m=s.match(/score cp (-?\d+)/g);if(m)cp=parseInt(m[m.length-1].match(/-?\d+/)[0]);const mt=s.match(/score mate (-?\d+)/);if(mt)cp=parseInt(mt[1])>0?100000:-100000;if(/bestmove/.test(s)){sf.kill();r(cp)}});sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`);setTimeout(()=>{try{sf.kill()}catch{};r(cp)},ms)})}
const o=join(tmpdir(),`pl-${Date.now()}.mjs`);
await build({entryPoints:['src/data/lessons/index.ts'],bundle:true,format:'esm',platform:'node',outfile:o,loader:{'.json':'json'},logLevel:'error'});
const {getAllLessonScripts}=await import(o);
const pirc=getAllLessonScripts().filter(x=>x.key.toLowerCase().includes('pirc'));
for(const {key,lesson} of pirc){
  let bt=lesson.beats[0]; for(const x of lesson.beats) if(x.moves.length>bt.moves.length) bt=x;
  const c=new Chess(); let ok=true; for(const m of bt.moves){try{c.move(m)}catch{ok=false;break}}
  if(!ok){console.log(`  ${key}: ILLEGAL`);continue;}
  const cp=await ev(c.fen());
  const persp=c.turn()===(lesson.orientation==='black'?'b':'w')?cp:-cp;
  console.log(`  ${String(persp).padStart(6)}cp  (${bt.moves.length}p, mv${Math.ceil(bt.moves.length/2)})  ${key.replace('pirc-defence','').replace('::','')}  | ${bt.moves.join(' ')}`);
}
console.log('[pirc-eval done]');
