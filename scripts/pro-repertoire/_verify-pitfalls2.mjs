import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
function evalFen(fen,depth=16){return new Promise((res)=>{const p=spawn(SF);let out='';p.stdout.on('data',d=>out+=d);p.on('close',()=>{const ls=out.split('\n').filter(l=>l.includes('score cp')||l.includes('score mate'));const last=ls[ls.length-1]||'';const cp=last.match(/score cp (-?\d+)/);const mate=last.match(/score mate (-?\d+)/);res(mate?(parseInt(mate[1])>0?10000:-10000):(cp?parseInt(cp[1]):0));});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);setTimeout(()=>p.stdin.write('quit\n'),3500);})}
const C=[
['pro-carlsen-ruy-lopez','w','e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6','Nxe5','O-O','After Bxc6 dxc6, grabbing the e5-pawn with Nxe5 loses to ...Qd4 forking the knight and e4; just castle.'],
['pro-carlsen-sicilian','b','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5','Nxe4','e6','Grabbing the e4-pawn with ...Nxe4 loses the queen to Bxd8; play the solid ...e6.'],
['pro-carlsen-kid','b','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5','Nxe4','Nc6','...Nxe4 drops a piece to Nxe4; develop with ...Nc6 and prepare the ...f5 storm.'],
['pro-carlsen-french','b','e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3 Qb6','Qxb2','a6','Grabbing the b2-pawn with ...Qxb2 traps the queen after Na4; keep building with ...a6.'],
['pro-carlsen-open-sicilian','w','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 Ng4','Bd2','Bg5','Retreating to d2 is passive and drops the bishop’s grip; Bg5 keeps the initiative and harasses Black.'],
['pro-carlsen-nimzo','b','d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O e4','Nxe4','d5','Grabbing e4 with ...Nxe4 loses material to Nxe4; strike the centre with ...d5 instead.'],
];
for(const [id,col,setup,wrong,right,why] of C){
  const c=new Chess();let ok=true;for(const m of setup.split(' ')){if(!c.move(m)){console.log(`${id}: bad setup ${m}`);ok=false;break;}}if(!ok)continue;
  const fen=c.fen();const cw=new Chess(fen),cr=new Chess(fen);
  const ow=cw.move(wrong),orr=cr.move(right);
  if(!ow||!orr){console.log(`${id}: illegal ${!ow?wrong:right} @ ${fen}`);continue;}
  const ew=await evalFen(cw.fen()),er=await evalFen(cr.fen());
  const sw=-ew,sr=-er,delta=sr-sw;
  console.log(`${id}: ${right}(${sr}) vs ${wrong}(${sw}) delta=${delta} ${delta>=40?'KEEP':'drop'}\n   fen=${fen}`);
}
