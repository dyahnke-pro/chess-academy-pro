#!/usr/bin/env node
// READ-ONLY: from each corrected spine terminus, walk ~12 more plies of the
// most-played master move to reveal the DATA-DRIVEN middlegame plan (pawn
// breaks + piece maneuvers the games actually play). Grounds Gate-C plan
// themes — nothing authored from memory.
import { Chess } from 'chess.js'; import { spawn } from 'child_process';
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const g=m=>(m.white||0)+(m.draws||0)+(m.black||0);
const uci=ms=>{const c=new Chess();return ms.map(m=>{const x=c.move(m);return x.from+x.to+(x.promotion??'')})};
async function exp(ms,src){const e=src==='lichess'?'&ratings=2200,2500&speeds=blitz,rapid,classical':'';try{const r=await fetch(`${PROXY}?source=${src}&play=${uci(ms).join(',')}${e}`);return r.ok?r.json():null}catch{return null}}
async function node(ms){let j=await exp(ms,'masters');await sleep(80);let src='masters',tot=j?g(j):0;if(tot<25){const k=await exp(ms,'lichess');await sleep(80);if(k){j=k;src='lichess';tot=g(k)}}return{j,src,tot}}

const SPINES={
 'Alekhine Four Pawns':'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5 Nc3 e6 Nf3 Be7 Be2 O-O O-O f6 exf6 Bxf6 Qd2 Qe7 Rad1 Rad8 Qc1 h6',
 'Semi-Slav Botvinnik':'d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7 g3 Bb7 Bg2 Qb6 exf6 O-O-O O-O c5 d5 b4 Na4 Qb5 a3 Nb8 axb4 cxb4 Qg4 Bxd5 Rfc1 Nc6',
 'KID Fianchetto':'d4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nc6 O-O a6 h3 Rb8 e4 b5 e5 dxe5 dxe5 Qxd1 Rxd1 Nd7 e6 fxe6 cxb5 axb5 Bf4 Nde5',
 'Old Indian':'d4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4 Be7 Be2 O-O O-O c6 Re1 a6 Bf1 b5 a3 Bb7 Bg5',
 'Pirc Austrian':'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Bg4 Bc4 Nc7 h3 Bxf3 Qxf3 a6 a4 b6 Qd3 Qc8',
 'Benoni Taimanov':'d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O Nb4 Re1 a6 Bf1 Re8 h3 f5 Bd2',
 'Dragon (d5 main)':'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O d5 exd5 Nxd5 Nxc6 bxc6 Bd4 e5 Bc5 Be6 Ne4 Re8 h4 h6 g4 Qc7 g5 h5 Bc4 Red8 Qf2 Nf4 Bxe6 Nxe6',
};

for(const [label,seed] of Object.entries(SPINES)){
  const line=seed.trim().split(/\s+/);
  const cont=[];
  for(let i=0;i<12;i++){
    const {j,tot}=await node(line);
    if(!j||!j.moves?.length) break;
    const top=j.moves[0]; if(g(top)<6) break;
    const c=new Chess(); for(const m of line)c.move(m); let mv; try{mv=c.move(top.san)}catch{break}
    cont.push(`${mv.color}:${top.san}(${g(top)})`); line.push(top.san);
  }
  console.log(`\n### ${label}`);
  console.log(`  data continuation from anchor: ${cont.join(' ')}`);
}
console.log('\n[plan-walk complete]');
