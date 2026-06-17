import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
const plans=JSON.parse(readFileSync('src/data/middlegame-plans.json','utf8'));
function go(fen,d=18){return new Promise(res=>{const p=spawn(SF);let sc=0,bm='',o='';p.stdout.on('data',x=>{o+=x;let i;while((i=o.indexOf('\n'))>=0){const ln=o.slice(0,i);o=o.slice(i+1);let m=/score (cp|mate) (-?\d+)/.exec(ln);if(m)sc=m[1]==='mate'?(+m[2]>0?100000:-100000):+m[2];m=/^bestmove (\S+)/.exec(ln);if(m){bm=m[1];p.kill();res({sc,bm})}}});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`)});}
const arr=Array.isArray(plans)?plans:plans.plans||Object.values(plans);
const bad={};
for(const plan of arr){
  const pl=(plan.playableLines||[])[0]; if(!pl||!pl.fen||!pl.moves) continue;
  const c=new Chess(pl.fen);
  for(let i=0;i<pl.moves.length;i++){
    const fen=c.fen();const before=await go(fen,16);
    let mv; try{mv=c.move(pl.moves[i])}catch{break}
    const after=await go(c.fen(),16); // opponent to move now; after.sc is opp POV
    const playedFromMover = -after.sc; // mover POV after their move
    const loss = before.sc - playedFromMover; // best(mover) - played(mover)
    if(loss>120){ (bad[plan.openingId]=bad[plan.openingId]||[]).push(`${plan.id} move ${i+1} ${mv.san} -${loss}cp`); }
  }
}
const ids=Object.keys(bad);
if(!ids.length){console.log('No plan moves lose >120cp.');}
for(const id of ids){console.log('### '+id);for(const x of bad[id])console.log('   '+x);}
