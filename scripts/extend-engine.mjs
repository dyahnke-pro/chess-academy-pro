// Engine-BEST extender: walk Stockfish's best move (depth per ply) to ~22p,
// report final best-play eval (student POV) + club win%. The TRUTH for
// soundness — unlike club-most-played, which can walk into the opponent's errors.
import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';
const SF='/usr/games/stockfish';const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const r=JSON.parse(readFileSync('src/data/repertoire.json','utf8'));const arr=r.openings||r;
const db=JSON.parse(readFileSync('src/data/openings-lichess.json','utf8'));const dbarr=Array.isArray(db)?db:db.openings||Object.values(db);
function anchor(pgn){const w=pgn.trim().split(/\s+/);let bb=0;for(const o of dbarr){const mv=(o.pgn||o.moves||'').trim().split(/\s+/);let k=0;for(;k<w.length&&k<mv.length;k++){if(mv[k]!==w[k])break;}if(k>bb)bb=k;}return bb;}
function go(fen,d=22){return new Promise(res=>{const p=spawn(SF);let pv='',sc=0,o='';p.stdout.on('data',x=>{o+=x;let i;while((i=o.indexOf('\n'))>=0){const ln=o.slice(0,i);o=o.slice(i+1);let m=/score (cp|mate) (-?\d+)/.exec(ln);if(m)sc=m[1]==='mate'?(+m[2]>0?1000:-1000):+m[2];m=/ pv (.+)$/.exec(ln);if(m)pv=m[1];if(ln.startsWith('bestmove')){p.kill();res({sc,pv})}}});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`)});}
const RATE='&ratings=1400,1600,1800,2000&speeds=blitz,rapid';
async function pct(u,color){for(let k=u.length;k>=6;k--){try{const rr=await fetch(`${PROXY}?source=lichess&play=${u.slice(0,k).join(',')}${RATE}`);const d=await rr.json();const w=d.white||0,dr=d.draws||0,bl=d.black||0,t=w+dr+bl;await new Promise(z=>setTimeout(z,120));if(t>=30){const sw=color==='white'?w:bl;return{score:(sw+0.5*dr)/t*100,games:t}}}catch{}}return null;}
for(const tgt of process.argv.slice(2)){
  const [id,name]=tgt.split('::');const o=arr.find(x=>x.id===id);const v=o.variations.find(x=>x.name===name);
  if(!v){console.log(tgt+' NOTFOUND');continue;}
  const c=new Chess();const u=[];for(const m of v.pgn.trim().split(/\s+/))u.push((()=>{const x=c.move(m);return x.from+x.to+(x.promotion||'')})());
  const line=v.pgn.trim().split(/\s+/);
  // walk engine-best until >=22p
  while(line.length<22){const {pv}=await go(c.fen(),20);if(!pv)break;const first=pv.split(' ')[0];try{const mv=c.move({from:first.slice(0,2),to:first.slice(2,4),promotion:first[4]});u.push(mv.from+mv.to+(mv.promotion||''));line.push(mv.san);}catch{break}}
  const stm=c.turn()==='w'?'white':'black';const fin=await go(c.fen(),24);const se=(stm===o.color?fin.sc:-fin.sc)/100;
  const a=await pct(u,o.color);
  console.log(tgt+' ['+o.color+'] ENG('+line.length+'p) anchor='+anchor(line.join(' '))+' mg='+reachesMiddlegame(line.join(' ')).pass+' eval'+(se>=0?'+':'')+se.toFixed(2)+' club '+(a?a.score.toFixed(0)+'%('+a.games+'g)':'-'));
  console.log('   '+line.join(' '));
}
