import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF='/usr/games/stockfish';
function ev(fen,d=24,ms=15000){return new Promise(r=>{const sf=spawn(SF);let cp=null,bm=null,pv=null;sf.stdout.on('data',x=>{const s=x.toString();for(const ln of s.split('\n')){const m=ln.match(/score (cp|mate) (-?\d+)/);if(m)cp=m[1]==='mate'?(parseInt(m[2])>0?1e5:-1e5):parseInt(m[2]);const p=ln.match(/ pv (.+)/);if(p)pv=p[1].trim();}const b=s.match(/bestmove (\w+)/);if(b){bm=b[1];sf.kill();r({cp,bm,pv})}});sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`);setTimeout(()=>{try{sf.kill()}catch{};r({cp,bm,pv})},ms)})}
function play(ms){const c=new Chess();for(const m of ms)c.move(m);return c;}
function sanPV(fen,pv,n=10){const c=new Chess(fen);const out=[];for(const u of pv.split(' ').slice(0,n)){try{const m=c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});out.push(m.san);}catch{break;}}return out.join(' ');}
const spine=['e4','c5','c3','d5','exd5','Qxd5','d4','cxd4','cxd4','Nc6','Nf3','Bg4','Nc3','Qa5','d5','Ne5','Nxe5','Bxd1','Bb5+','Qxb5','Nxb5'];
const c=play(spine);
console.log('after 11.Nxb5 (Black to move) — the "trap pays off" tabiya:');
console.log('  FEN', c.fen());
const e=await ev(c.fen(),24);
console.log(`  eval (Black persp): ${e.cp}cp  Black-best=${e.bm}`);
console.log('  Black\'s engine line:', sanPV(c.fen(), e.pv||'', 12));
console.log(`  → White persp at this tabiya: ${-e.cp}cp`);
