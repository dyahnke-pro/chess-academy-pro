import { Chess } from 'chess.js';import { spawn } from 'node:child_process';
const SF='/usr/games/stockfish';
function ev(fen,depth=18){return new Promise((res)=>{const p=spawn(SF);let out='';p.stdout.on('data',d=>out+=d);p.on('close',()=>{const ls=out.split('\n').filter(l=>l.includes('score cp')||l.includes('score mate'));const last=ls[ls.length-1]||'';const cp=last.match(/score cp (-?\d+)/);const mate=last.match(/score mate (-?\d+)/);const bm=out.match(/bestmove (\w+)/);res({cp:mate?(parseInt(mate[1])>0?10000:-10000):(cp?parseInt(cp[1]):0),bm:bm?bm[1]:null});});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${depth}\n`);setTimeout(()=>p.stdin.write('quit\n'),4500);})}
// [openingId, studentColor, line-up-to-opponent-slip (ends with opponent's bad move)]
// We eval from student's side after the opponent's slip; if student is winning (>=+180cp), it's a real trap.
const C=[
['pro-carlsen-open-sicilian','w','e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 Ng6 d4 cxd4 Nxd4 Nxd4 Qxd4 Nf4'], // ...Nf4? loose knight
['pro-carlsen-ruy-lopez','w','e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d6 h3 Na5 Bc2 c5 d4 Qc7 Nbd2 cxd4 cxd4 Nc6 Nb3 Nb4'],
['pro-carlsen-sicilian','b','e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Bg5 e6 f4 Qc7 Qf3 Nbd7 O-O-O b5 g4 b4 Nce2 e5 Nf5 g6'],
['pro-carlsen-1e5','b','e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5'], // Fried Liver decline test from Black side
['pro-carlsen-kid','b','d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Be2 O-O Nf3 e5 dxe5 dxe5 Qxd8 Rxd8 Nxe5 Nxe4'], // ...Nxe4 fork tactic
];
for(const [id,col,line] of C){
  const c=new Chess();let ok=true;for(const m of line.split(' ')){if(!c.move(m)){console.log(`${id}: ILLEGAL ${m}`);ok=false;break;}}if(!ok)continue;
  const {cp,bm}=await ev(c.fen());
  const studentEval=col==='w'?(c.turn()==='w'?cp:-cp):(c.turn()==='b'?cp:-cp);
  console.log(`${id}: studentEval=${studentEval} (turn=${c.turn()}, raw=${cp}, best=${bm}) ${studentEval>=180?'TRAP-CANDIDATE':'weak'}\n   fen=${c.fen()}`);
}
