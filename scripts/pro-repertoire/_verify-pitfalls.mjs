import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
function evalFen(fen,depth=16){return new Promise((res)=>{
  const p=spawn(SF);let best=0;let out='';
  p.stdout.on('data',d=>{out+=d;});
  p.on('close',()=>{
    const lines=out.split('\n').filter(l=>l.includes('score cp')||l.includes('score mate'));
    const last=lines[lines.length-1]||'';
    const cp=last.match(/score cp (-?\d+)/);const mate=last.match(/score mate (-?\d+)/);
    if(mate)best=(parseInt(mate[1])>0?10000:-10000); else if(cp)best=parseInt(cp[1]);
    res(best);
  });
  p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);
  setTimeout(()=>{p.stdin.write('quit\n');},4000);
})}
// candidates: [openingId, color, setupSANs, wrongMove, correctMove, why]
const C=[
['pro-carlsen-open-sicilian','w','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5','Nf3','Nb3','Nf3 blocks the f-pawn, killing the f3+g4 English-Attack storm; Nb3 keeps it.'],
['pro-carlsen-ruy-lopez','w','e4 e5 Nf3 Nc6 Bb5 a6','Bxc6','Ba4','Bxc6 surrenders the bishop pair for nothing; Ba4 keeps the pin and the tension.'],
['pro-carlsen-sicilian','b','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5','Nbd7','e6','...Nbd7 allows Bxf6 wrecking Black with no compensation; ...e6 is the main line.'],
['pro-carlsen-1e5','b','e4 e5 Nf3 Nc6 Bb5 Nf6 O-O','Bc5','Nxe4','In the Berlin, ...Bc5 lets White seize the initiative; ...Nxe4 is the point of the defence.'],
['pro-carlsen-kid','b','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5 O-O Nc6 d5','Nb8','Ne7','...Nb8 buries the knight; ...Ne7 reroutes it to g6/f5 for the kingside attack.'],
['pro-carlsen-french','b','e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3','cxd4','Nc6','...cxd4 releases the central tension too early; ...Nc6 keeps the pressure on d4.'],
['pro-carlsen-nimzo','b','d4 Nf6 c4 e6 Nf3 d5 Nc3 Be7 Bf4','dxc4','O-O','...dxc4 hands White the centre for free; castling first keeps the QGD solid.'],
['pro-carlsen-queens-pawn','w','d4 Nf6 c4 e6 Nf3 d5 Nc3 Bb4 cxd5 exd5 Bf4','a3','Rc1','a3 lets Black play ...Bxc3 doubling pawns on a worse square; Rc1 keeps the pressure on the c-file.'],
];
for(const [id,col,setup,wrong,right,why] of C){
  const c=new Chess();for(const m of setup.split(' '))c.move(m);
  const fen=c.fen();
  const cw=new Chess(fen);const okW=cw.move(wrong);const cr=new Chess(fen);const okR=cr.move(right);
  if(!okW||!okR){console.log(`${id}: ILLEGAL ${!okW?wrong:right}`);continue;}
  const ew=await evalFen(cw.fen());const er=await evalFen(cr.fen());
  const sw=-ew, sr=-er; // student perspective (opponent to move after student's move)
  const delta=sr-sw;
  console.log(`${id}: ${right}(${sr}) vs ${wrong}(${sw}) -> delta ${delta}cp ${delta>=40?'KEEP':'drop'}  fen=${fen}`);
}
