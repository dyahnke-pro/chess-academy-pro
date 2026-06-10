import { Chess } from 'chess.js'; import { spawn } from 'child_process'; import { readFileSync, writeFileSync } from 'fs';
const SF='/usr/games/stockfish';
function best(fen,d=18,ms=6000){return new Promise(r=>{const sf=spawn(SF);let bm=null,cp=null;sf.stdout.on('data',x=>{for(const l of x.toString().split('\n')){const m=l.match(/score (cp|mate) (-?\d+)/);if(m)cp=m[1]==='mate'?(+m[2]>0?100000:-100000):+m[2];const b=l.match(/^bestmove (\w+)/);if(b){bm=b[1];sf.kill();r({bm,cp});}}});sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`);setTimeout(()=>{try{sf.kill()}catch{};r({bm,cp})},ms)})}
const cm=JSON.parse(readFileSync('src/data/common-mistakes.json','utf8'));
const ONLY=(process.env.ONLY||'').split(',').filter(Boolean);
const out={};
for(const [oid,arr] of Object.entries(cm)){
  if(ONLY.length && !ONLY.includes(oid)) continue;
  for(let i=0;i<arr.length;i++){
    const e=arr[i]; if(e.punishmentLine) continue;            // already has one
    const c=new Chess(e.fen); let mv; try{mv=c.move(e.wrongMove)}catch{continue}
    const facts=[{san:mv.san,from:mv.from,to:mv.to,cap:!!mv.captured,check:c.inCheck(),piece:mv.piece}];
    const moves=[e.wrongMove];
    // play engine best for both sides until decisive or ~5 punishment plies
    for(let ply=0;ply<5;ply++){
      const {bm,cp}=await best(c.fen(),16,5000); if(!bm)break;
      let m; try{m=c.move({from:bm.slice(0,2),to:bm.slice(2,4),promotion:bm[4]})}catch{break}
      moves.push(m.san); facts.push({san:m.san,from:m.from,to:m.to,cap:!!m.captured,check:c.inCheck(),piece:m.piece,cp});
      if(Math.abs(cp)>=100000) break;                          // mate found
      if(ply>=2 && Math.abs(cp)>=250) break;                   // decisive enough
    }
    (out[oid]=out[oid]||[]).push({idx:i,fen:e.fen,wrongMove:e.wrongMove,correctMove:e.correctMove,moves,facts});
  }
}
writeFileSync('/tmp/punish-scaffold.json',JSON.stringify(out,null,1));
let tot=0; for(const a of Object.values(out)) tot+=a.length;
console.log(`scaffold: ${tot} pitfalls needing punishmentLines across ${Object.keys(out).length} openings -> /tmp/punish-scaffold.json`);
