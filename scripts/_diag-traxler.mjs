import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF='/usr/games/stockfish';
function ev(fen,d=24,ms=14000){return new Promise(r=>{const sf=spawn(SF);let cp=null,bm=null,pv=null;sf.stdout.on('data',x=>{const s=x.toString();for(const ln of s.split('\n')){const m=ln.match(/score (cp|mate) (-?\d+)/);if(m)cp=m[1]==='mate'?(parseInt(m[2])>0?1e5:-1e5):parseInt(m[2]);const p=ln.match(/ pv (.+)/);if(p)pv=p[1].trim();}const b=s.match(/bestmove (\w+)/);if(b){bm=b[1];sf.kill();r({cp,bm,pv})}});sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`);setTimeout(()=>{try{sf.kill()}catch{};r({cp,bm,pv})},ms)})}
function P(ms){const c=new Chess();for(const m of ms)c.move(m);return c;}
function sanPV(fen,pv,n=8){const c=new Chess(fen);const o=[];for(const u of (pv||'').split(' ').slice(0,n)){try{o.push(c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}).san)}catch{break}}return o.join(' ');}
const trax=['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','Bc5'];
const c=P(trax); console.log('Traxler (4...Bc5), White to move:');
const e=await ev(c.fen(),24); console.log(`  engine best for White: ${e.bm} (${e.cp}cp) | ${sanPV(c.fen(),e.pv,8)}`);
// the GREEDY trap line: 5.Nxf7 Bxf2+ 6.Kxf2  vs the safe 6.Kf1
for(const line of [
  ['Nxf7','Bxf2+','Kxf2'], ['Nxf7','Bxf2+','Kf1'],
  ['Bxf7+','Ke7','Bb3'], ['Bxf7+','Ke7','Bd5'], ['d4','exd4','Nxf7'],
]){
  const cc=P([...trax,...line]); const ee=await ev(cc.fen(),22);
  const persp = cc.turn()==='w'? ee.cp : -ee.cp; // White perspective
  console.log(`  5.${line[0]} ${line[1]||''} ${line[2]||''} → White ${persp}cp | ${sanPV(cc.fen(),ee.pv,7)}`);
}
