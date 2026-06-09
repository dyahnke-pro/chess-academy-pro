#!/usr/bin/env node
// READ-ONLY experiment: is the gem miner's depth-18 grade sound, or does a
// high-depth search walk gems back below the soundness floor? Re-grade each
// shipped gem at HIGH depth at the quiet end of its own playLine, compare to
// the stored engineCp (the depth-18 grade). Report: mean |Δ|, tier flips, and
// — the real signal — gems that DROP BELOW +0.5 (would no longer ship).
import { Chess } from 'chess.js'; import { spawn } from 'child_process';
const SF='/usr/games/stockfish';
const DEEP = Number(process.env.DEEP ?? 28);
const ONLY = process.env.ONLY; // 'positional' | 'confirmed' | undefined(all)
const LIMIT = Number(process.env.LIMIT ?? 0);
function ev(fen,depth,ms){return new Promise(res=>{const sf=spawn(SF);let cp=null;sf.stdout.on('data',d=>{const s=d.toString();const m=s.match(/score cp (-?\d+)/g);if(m)cp=parseInt(m[m.length-1].match(/-?\d+/)[0]);const mt=s.match(/score mate (-?\d+)/);if(mt)cp=parseInt(mt[1])>0?100000:-100000;if(/bestmove/.test(s)){sf.kill();res(cp);}});sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);setTimeout(()=>{try{sf.kill()}catch{};res(cp)},ms);});}

const g=JSON.parse((await import('fs')).readFileSync('src/data/punish-gems.json','utf8'));
let gems=Array.isArray(g)?g:(g.gems||Object.values(g));
if(ONLY) gems=gems.filter(x=>x.tier===ONLY);
if(LIMIT) gems=gems.slice(0,LIMIT);

let nBelow=0, nFlipDown=0, deltas=[], details=[];
let i=0;
for(const gem of gems){
  i++;
  const moves=(gem.playLine||'').trim().split(/\s+/).filter(Boolean);
  if(moves.length<3) continue;
  // student = color that plays `punish` (the move right after the inaccuracy)
  const pre=new Chess(); let ok=true;
  for(const m of (gem.lineMoves||'').trim().split(/\s+/).filter(Boolean)){try{pre.move(m)}catch{ok=false}}
  const student = pre.turn()==='w' ? 'b' : 'w'; // side-to-move after spine = opponent (plays inaccuracy)
  const c=new Chess(); ok=true; for(const m of moves){try{c.move(m)}catch{ok=false;break}}
  if(!ok) continue;
  const cp=await ev(c.fen(), DEEP, 20000);
  if(cp==null) continue;
  const deep = c.turn()===student ? cp : -cp; // student perspective
  const stored = gem.engineCp;
  const d = deep - stored;
  deltas.push(d);
  const belowFloor = deep < 50;
  const flipDown = gem.tier==='confirmed' && deep < 100;
  if(belowFloor) nBelow++;
  if(flipDown) nFlipDown++;
  if(belowFloor || Math.abs(d)>=80) details.push(`  ${belowFloor?'⛔BELOW':'Δ'} ${gem.openingId} | ${gem.lineMoves} ${gem.inaccuracy}->${gem.punish} | stored ${stored}cp(${gem.tier}) deep${DEEP} ${deep}cp (Δ${d>=0?'+':''}${d})`);
  if(i%10===0) process.stderr.write(`[${i}/${gems.length}]\n`);
}
deltas.sort((a,b)=>a-b);
const mean = deltas.reduce((a,b)=>a+b,0)/(deltas.length||1);
const absMean = deltas.reduce((a,b)=>a+Math.abs(b),0)/(deltas.length||1);
console.log(`\n=== gem depth re-grade: ${gems.length} gems${ONLY?` (${ONLY})`:''}, stored=d18 vs deep=d${DEEP} ===`);
console.log(`graded: ${deltas.length}`);
console.log(`mean Δ (deep-stored): ${mean.toFixed(0)}cp | mean |Δ|: ${absMean.toFixed(0)}cp | worst drop: ${deltas[0]}cp | best jump: ${deltas[deltas.length-1]}cp`);
console.log(`⛔ gems that DROP BELOW +0.5 at d${DEEP} (would no longer ship): ${nBelow}  (${(100*nBelow/(deltas.length||1)).toFixed(1)}%)`);
console.log(`tier-flip confirmed→(< +1.0) at d${DEEP}: ${nFlipDown}  (${(100*nFlipDown/(deltas.length||1)).toFixed(1)}%)`);
console.log(`\n--- notable (below-floor or |Δ|≥80cp) ---`);
console.log(details.slice(0,60).join('\n'));
console.log('\n[gem-depth complete]');
