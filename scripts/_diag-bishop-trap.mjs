import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF='/usr/games/stockfish';
function ev(fen,d=24,ms=15000){return new Promise(r=>{const sf=spawn(SF);let cp=null,bm=null,pv=null;sf.stdout.on('data',x=>{const s=x.toString();for(const ln of s.split('\n')){const m=ln.match(/score (cp|mate) (-?\d+)/);if(m)cp=m[1]==='mate'?(parseInt(m[2])>0?1e5:-1e5):parseInt(m[2]);const p=ln.match(/ pv (.+)/);if(p)pv=p[1].trim();}const b=s.match(/bestmove (\w+)/);if(b){bm=b[1];sf.kill();r({cp,bm,pv})}});sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`);setTimeout(()=>{try{sf.kill()}catch{};r({cp,bm,pv})},ms)})}
function line(mv){const c=new Chess();const ok=[];for(const m of mv){try{c.move(m);ok.push(m);}catch{console.log(`  ILLEGAL "${m}" ply ${ok.length+1}; legal: ${c.moves().slice(0,16).join(' ')}`);return null;}}return c;}
function sanPV(fen,pv,n=10){const c=new Chess(fen);const o=[];for(const u of (pv||'').split(' ').slice(0,n)){try{o.push(c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}).san);}catch{break;}}return o.join(' ');}

// CORRECTED Branch A: 3...Nxe4 4.dxe5 then 5.Qd5 fork
console.log('=== corrected Branch A (3...Nxe4 4.dxe5 ...Nc6 5.Qd5) ===');
for(const b4 of ['Nc6','d5','Bc5','d6']){
  const c=line(['e4','e5','Bc4','Nf6','d4','Nxe4','dxe5',b4,'Qd5']);
  if(!c)continue;
  const e=await ev(c.fen(),24);
  const w=c.turn()==='w'?e.cp:-e.cp;
  console.log(`  4...${b4} 5.Qd5 → White ${w}cp | Black-best ${e.bm} | def: ${sanPV(c.fen(),e.pv,7)}`);
}
