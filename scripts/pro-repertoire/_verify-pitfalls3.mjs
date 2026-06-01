import { Chess } from 'chess.js';import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
function evalFen(fen,depth=16){return new Promise((res)=>{const p=spawn(SF);let out='';p.stdout.on('data',d=>out+=d);p.on('close',()=>{const ls=out.split('\n').filter(l=>l.includes('score cp')||l.includes('score mate'));const last=ls[ls.length-1]||'';const cp=last.match(/score cp (-?\d+)/);const mate=last.match(/score mate (-?\d+)/);res(mate?(parseInt(mate[1])>0?10000:-10000):(cp?parseInt(cp[1]):0));});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);setTimeout(()=>p.stdin.write('quit\n'),3500);})}
const C=[
['pro-carlsen-open-sicilian','w','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 Ng4','Bd2','Bg5','Retreating to d2 is passive; Bg5 keeps the bishop active and harasses Black.'],
['pro-carlsen-kid','b','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5 O-O','Nxe4','Nc6','...Nxe4 drops a piece to Nxe4; develop with ...Nc6 toward the ...f5 storm.'],
['pro-carlsen-nimzo','b','d4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O e4','Nxe4','d5','...Nxe4 loses material to Nxe4; strike the centre with ...d5.'],
['pro-carlsen-1e5','b','e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4','Nf6','Nd6','Retreating ...Nf6 lets White play dxe5 with a strong centre; ...Nd6 is the Berlin point, hitting the bishop.'],
['pro-carlsen-queens-pawn','w','d4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 cxd5 exd5 Bf4 O-O','Nxd5','e3','Grabbing the d5-pawn with Nxd5 loses to ...Nxd5 and ...Bxd2/...Qa5 tricks; calmly play e3.'],
];
for(const [id,col,setup,wrong,right] of C){
  const c=new Chess();let ok=true;for(const m of setup.split(' ')){if(!c.move(m)){console.log(`${id}: bad setup ${m}`);ok=false;break;}}if(!ok)continue;
  const fen=c.fen();const cw=new Chess(fen),cr=new Chess(fen);const ow=cw.move(wrong),orr=cr.move(right);
  if(!ow||!orr){console.log(`${id}: illegal ${!ow?wrong:right}`);continue;}
  const ew=await evalFen(cw.fen()),er=await evalFen(cr.fen());const sw=-ew,sr=-er,delta=sr-sw;
  console.log(`${id}: ${right}(${sr}) vs ${wrong}(${sw}) delta=${delta} ${delta>=40?'KEEP':'drop'}  fen=${fen}`);
}
