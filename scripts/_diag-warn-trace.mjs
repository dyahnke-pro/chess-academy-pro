import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF='/usr/games/stockfish';
function mpv(fen,d,n,ms=9000){return new Promise(r=>{const sf=spawn(SF);const m=new Map();sf.stdout.on('data',x=>{for(const l of x.toString().split('\n')){const a=l.match(/ multipv (\d+) /),b=l.match(/score (cp|mate) (-?\d+)/),p=l.match(/ pv (.+)/);if(a&&b&&p)m.set(+a[1],{cp:b[1]==='mate'?(+b[2]>0?1e5:-1e5):+b[2],pv:p[1].trim()});}if(/bestmove/.test(x.toString())){sf.kill();fin();}});let f=0;const fin=()=>{if(f)return;f=1;const o=[...m.entries()].sort((a,b)=>a[0]-b[0]).map(([,v])=>{const c=new Chess(fen);const u=v.pv.split(' ')[0];let s=u;try{s=c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]}).san}catch{}return{san:s,cp:v.cp};});r(o);};sf.stdin.write(`setoption name MultiPV value ${n}\nposition fen ${fen}\ngo depth ${d}\n`);setTimeout(fin,ms);});}
const c=new Chess(); for(const m of ['e4','e5','Nf3','Nc6','Bc4','Nf6','Ng5','Nxe4'])c.move(m);
console.log('node:', c.fen());
console.log('side to move:', c.turn(), '(w=White=student/victim in warning mode)');
const d=await mpv(c.fen(),16,5);
console.log('moves at this node (multipv, side-to-move perspective):');
for(const m of d) console.log(`   ${m.san}: ${m.cp}cp`);
