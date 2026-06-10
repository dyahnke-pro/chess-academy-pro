#!/usr/bin/env node
// PROTOTYPE swindle detector v2. KEY FIX: model the HUMAN with the amateur
// explorer + move-naturalness, NOT shallow Stockfish (too strong — it finds the
// refutation even at depth 7). A swindle = the move a HUMAN naturally plays
// (capture the checker / recapture / highest explorer freq) loses big, while the
// only ESCAPE is a hard/rare/"weird" move (king-walk, backward retreat, low freq).
import { Chess } from 'chess.js';
import { spawn } from 'child_process';
const SF = process.env.STOCKFISH_PATH || '/usr/games/stockfish';
const PROXY = 'https://chess-academy-pro.vercel.app/api/lichess-explorer';
const RATINGS = process.env.RATINGS || '1600,1800,2000';

function multipv(fen, depth, n=10, ms=16000){return new Promise((res)=>{const sf=spawn(SF);const map=new Map();sf.stdout.on('data',(d)=>{for(const ln of d.toString().split('\n')){const mp=ln.match(/ multipv (\d+) /),sc=ln.match(/score (cp|mate) (-?\d+)/),pv=ln.match(/ pv (\w+)/);if(mp&&sc&&pv){const cp=sc[1]==='mate'?(parseInt(sc[2])>0?1e5:-1e5):parseInt(sc[2]);map.set(parseInt(mp[1]),{uci:pv[1],cp});}}if(/bestmove/.test(d.toString())){sf.kill();fin();}});let done=false;const fin=()=>{if(done)return;done=true;const out=[...map.entries()].sort((a,b)=>a[0]-b[0]).map(([,v])=>{const c=new Chess(fen);let san=v.uci;try{san=c.move({from:v.uci.slice(0,2),to:v.uci.slice(2,4),promotion:v.uci[4]}).san;}catch{}return{uci:v.uci,san,cp:v.cp};});res(out);};sf.stdin.write(`setoption name MultiPV value ${n}\nposition fen ${fen}\ngo depth ${depth}\n`);setTimeout(fin,ms);});}
const uciOf=(fen,ms)=>{const c=new Chess(fen);return ms.map(m=>{const x=c.move(m);return x.from+x.to+(x.promotion??'');});};
async function explorer(fen){ // most-played human moves at this node (amateur band)
  try{const c=new Chess(fen);const hist=c.history({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));
    // rebuild uci path from startpos
    const g=new Chess();const path=[];const moves=new Chess(fen).history();
    // simpler: use FEN directly via play param not supported; query by replaying SAN from start
    return null; // explorer-by-fen not available; caller passes move path
  }catch{return null;}}
async function explorerByPath(sanMoves){try{const u=uciOf(new Chess().fen?undefined:undefined)||[];}catch{}
  try{const c=new Chess();const uci=sanMoves.map(m=>{const x=c.move(m);return x.from+x.to+(x.promotion??'');});
    const r=await fetch(`${PROXY}?source=lichess&ratings=${RATINGS}&speeds=blitz,rapid,classical&play=${uci.join(',')}`);
    if(!r.ok)return null;const j=await r.json();const tot=(j.white||0)+(j.draws||0)+(j.black||0);
    return {tot,moves:(j.moves||[]).map(m=>({san:m.san,games:(m.white||0)+(m.draws||0)+(m.black||0),pct:tot?((m.white||0)+(m.draws||0)+(m.black||0))/tot:0}))};
  }catch{return null;}}
const isWeird=(fen,san)=>{ if(/^K/.test(san))return true; // king move = unnatural under pressure
  return false;};
const naturalUnderCheck=(c,san)=>{ // when in check, capturing the checker or a central block is "natural"
  return /x/.test(san); };

async function analyzeNode(sanPath, label){
  const c=new Chess(); for(const m of sanPath)c.move(m); const fen=c.fen();
  const inCheck=c.inCheck();
  const deep=await multipv(fen,24,10);
  if(!deep.length){console.log(`\n=== ${label} ===\n  (no eval)`);return null;}
  const escape=deep[0], deep2=deep[1];
  const deepMap=new Map(deep.map(m=>[m.san,m.cp]));
  const exp=await explorerByPath(sanPath);
  // HUMAN MODEL: top explorer move if data; else most-natural (a capture, esp. of the checker)
  let humanMove=null, humanWhy='';
  if(exp&&exp.tot>=20&&exp.moves.length){ humanMove=exp.moves[0].san; humanWhy=`explorer ${(exp.moves[0].pct*100).toFixed(0)}% (${exp.moves[0].games}g)`; }
  if(!humanMove){ const cap=deep.find(m=>/x/.test(m.san)&&m.san!==escape.san)||deep.find(m=>m.san!==escape.san); if(cap){humanMove=cap.san;humanWhy='most-natural (capture)';} }
  const humanCp=humanMove?deepMap.get(humanMove):null;
  const escapeHard = (deep2?(escape.cp-deep2.cp)>=120:true) || isWeird(fen,escape.san) || (exp&&exp.moves?.find(m=>m.san===escape.san)?.pct<0.15);
  const escapeRareFreq = exp?.moves?.find(m=>m.san===escape.san)?.pct;
  const swindle = humanMove && humanMove!==escape.san && humanCp!=null && (escape.cp-humanCp)>=150 && escapeHard;
  console.log(`\n=== ${label} ===`);
  console.log(`  inCheck=${inCheck}  escape(deep-best)=${escape.san} ${escape.cp}cp ${isWeird(fen,escape.san)?'[king/weird]':''} ${escapeRareFreq!=null?`(humans play it ${(escapeRareFreq*100).toFixed(0)}%)`:'(no explorer data)'}`);
  console.log(`  2nd-best deep: ${deep2?`${deep2.san} ${deep2.cp}cp (gap ${escape.cp-deep2.cp})`:'—'}`);
  console.log(`  HUMAN likely plays: ${humanMove?`${humanMove} → deep ${humanCp}cp  [${humanWhy}]`:'—'}`);
  console.log(`  >>> SWINDLE NODE: ${swindle?`YES — bait ${humanMove} (${humanCp}cp) loses ${escape.cp-humanCp}cp vs escape ${escape.san}`:'no'}`);
  return {swindle};
}
const A=['e4','c5','c3','d5','exd5','Qxd5','d4','cxd4','cxd4','Nc6','Nf3','Bg4','Nc3','Qa5','d5','Ne5','Nxe5','Bxd1','Bb5+'];
const B=['e4','e5','Bc4','Nf6','d4','Nxe4','dxe5','Nc6','Qd5'];
await analyzeNode(A,'Alapin: after 10.Bb5+ (Black) — escape …Kd8, bait …Qxb5');
await analyzeNode(B,'Bishop: after 5.Qd5 (Black) — escape …Ng5');
