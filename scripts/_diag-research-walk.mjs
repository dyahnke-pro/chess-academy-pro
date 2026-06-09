#!/usr/bin/env node
// READ-ONLY research driver (no content changes). For each soundness-flagged
// line: walk the DATA spine to a middlegame (most-played master move per ply,
// via the same explorer the build-spine script uses), engine-verify the
// terminus from the STUDENT's perspective, and report the most-played move at
// the OLD break ply. Grounds the "corrected opening -> middlegame" + the
// middlegame-plan anchor FEN. Nothing is authored from memory.
import { Chess } from 'chess.js'; import { spawn } from 'child_process';
const SF='/usr/games/stockfish';
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const COMMON=40, LOWFLOOR=8, MIDGAME_PLY=20;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const g=m=>(m.white||0)+(m.draws||0)+(m.black||0);
const uci=ms=>{const c=new Chess();return ms.map(m=>{const x=c.move(m);return x.from+x.to+(x.promotion??'')})};
async function exp(ms,src){const e=src==='lichess'?'&ratings=2200,2500&speeds=blitz,rapid,classical':'';try{const r=await fetch(`${PROXY}?source=${src}&play=${uci(ms).join(',')}${e}`);return r.ok?r.json():null}catch{return null}}
async function node(ms){let j=await exp(ms,'masters');await sleep(80);let src='masters',tot=j?g(j):0;if(tot<COMMON){const k=await exp(ms,'lichess');await sleep(80);if(k){j=k;src='lichess';tot=g(k)}}return{j,src,tot}}
function ev(fen,depth=20,ms=10000){return new Promise(res=>{const sf=spawn(SF);let cp=null,best=null;sf.stdout.on('data',d=>{const s=d.toString();const m=s.match(/score cp (-?\d+)/g);if(m)cp=parseInt(m[m.length-1].match(/-?\d+/)[0]);const mt=s.match(/score mate (-?\d+)/);if(mt)cp=parseInt(mt[1])>0?10000:-10000;const bm=s.match(/bestmove (\w+)/);if(bm){best=bm[1];sf.kill();res({cp,best})}});sf.stdin.write(`position fen ${fen}\ngo depth ${depth}\n`);setTimeout(()=>{try{sf.kill()}catch{};res({cp,best})},ms)})}

const TARGETS=[
  {label:'Alekhine: Four Pawns', id:'alekhine-defence', student:'b', seed:'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4'},
  {label:'Semi-Slav: Botvinnik', id:'semi-slav', student:'b', seed:'d4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7'},
  {label:'KID: Fianchetto', id:'kings-indian', student:'b', seed:'d4 Nf6 c4 g6 g3 Bg7 Bg2 O-O Nc3 d6 Nf3 Nc6 O-O'},
  {label:'Old Indian (Be2/Czech share spine)', id:'old-indian', student:'b', seed:'d4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7'},
  {label:'Pirc: Austrian Attack', id:'pirc-austrian', student:'b', seed:'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O'},
  {label:'Pirc: Czech', id:'pirc-czech', student:'b', seed:'e4 d6 d4 Nf6 Nc3 c6'},
  {label:'Benoni: Taimanov', id:'benoni', student:'b', seed:'d4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+'},
  {label:'Sicilian Dragon: Chinese/Yugoslav', id:'dragon', student:'b', seed:'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6 O-O-O'},
];

for(const t of TARGETS){
  const line=t.seed.trim().split(/\s+/);
  // mandatory-extend along most-played move until a middlegame is reached
  let guard=0;
  while(line.length<40 && guard++<30){
    const {j,src,tot}=await node(line);
    if(!j||!j.moves?.length) break;
    const top=j.moves[0]; const tg=g(top);
    if(line.length>=MIDGAME_PLY && (tot<COMMON || tg<LOWFLOOR)) break;
    if(tg<LOWFLOOR) break;
    const c=new Chess(); for(const m of line)c.move(m);
    try{c.move(top.san)}catch{break}
    line.push(top.san);
    if(line.length>=MIDGAME_PLY && tg<COMMON){ break; }
  }
  const c=new Chess(); for(const m of line)c.move(m);
  const fen=c.fen();
  const {cp,best}=await ev(fen,20,11000);
  const persp=(c.turn()===t.student)?cp:-cp;
  console.log(`\n### ${t.label}  [student=${t.student}]`);
  console.log(`  DATA spine (${line.length}p, move ${Math.ceil(line.length/2)}): ${line.join(' ')}`);
  console.log(`  terminus eval (student persp, d20): ${persp}cp   reachedMiddlegame=${line.length>=MIDGAME_PLY}`);
  console.log(`  anchor FEN: ${fen}`);
}
console.log('\n[research-walk complete]');
