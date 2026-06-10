import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF='/usr/games/stockfish';
function ev(fen,d=24,ms=14000){return new Promise(r=>{const sf=spawn(SF);let cp=null,bm=null,pv=null;sf.stdout.on('data',x=>{const s=x.toString();for(const ln of s.split('\n')){const m=ln.match(/score (cp|mate) (-?\d+)/);if(m)cp=m[1]==='mate'?(parseInt(m[2])>0?100000:-100000):parseInt(m[2]);const p=ln.match(/ pv (.+)/);if(p)pv=p[1].trim();}const b=s.match(/bestmove (\w+)/);if(b){bm=b[1];sf.kill();r({cp,bm,pv})}});sf.stdin.write(`position fen ${fen}\ngo depth ${d}\n`);setTimeout(()=>{try{sf.kill()}catch{};r({cp,bm,pv})},ms)})}
const base=['e4','c5','c3','d5','exd5','Qxd5','d4','cxd4','cxd4','Nc6','Nf3','Bg4','Nc3','Qa5','d5','Ne5'];
const c=new Chess(); for(const m of base)c.move(m);
console.log('position after 8...Ne5 (White to move):');
console.log('  FEN:', c.fen());
const e0=await ev(c.fen(),24);
console.log(`  engine eval (White persp): ${e0.cp}cp  best=${e0.bm}  PV: ${e0.pv}`);
// force the queen-sac: Nxe5 and walk Stockfish's best for both sides
const t=new Chess(c.fen());
try{ t.move('Nxe5'); }catch(e){ console.log('  Nxe5 illegal?!'); }
console.log('\nafter 9.Nxe5 (the queen sac), Black to move:');
console.log('  FEN:', t.fen());
const e1=await ev(t.fen(),24);
console.log(`  engine eval (Black persp): ${e1.cp}cp  Black-best=${e1.bm}  PV: ${e1.pv}`);
// follow the PV a few plies to show the material outcome
const w=new Chess(t.fen()); let san=[];
for(const u of (e1.pv||'').split(' ').slice(0,8)){ try{const m=w.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}); san.push(m.san);}catch{break;} }
console.log('  forced continuation (engine best both sides):', san.join(' '));
const ef=await ev(w.fen(),22);
console.log(`  eval at end of that line (side-to-move ${w.turn()}): ${ef.cp}cp`);
