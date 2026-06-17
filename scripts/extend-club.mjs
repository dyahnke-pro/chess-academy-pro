import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';
const SF='/usr/games/stockfish';const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const r=JSON.parse(readFileSync('src/data/repertoire.json','utf8'));const arr=r.openings||r;
const db=JSON.parse(readFileSync('src/data/openings-lichess.json','utf8'));const dbarr=Array.isArray(db)?db:db.openings||Object.values(db);
function anchor(pgn){const w=pgn.trim().split(/\s+/);let bb=0;for(const o of dbarr){const mv=(o.pgn||o.moves||'').trim().split(/\s+/);let k=0;for(;k<w.length&&k<mv.length;k++){if(mv[k]!==w[k])break;}if(k>bb)bb=k;}return bb;}
function ev(fen,d=20){return new Promise((res)=>{const p=spawn(SF);let b=0,o='';p.stdout.on('data',(x)=>{o+=x;let i;while((i=o.indexOf('\n'))>=0){const ln=o.slice(0,i);o=o.slice(i+1);const m=/score (cp|mate) (-?\d+)/.exec(ln);if(m)b=m[1]==='mate'?(+m[2]>0?1000:-1000):+m[2];if(ln.startsWith('bestmove')){p.kill();res(b)}}});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`)});}
const RATE='&ratings=1400,1600,1800,2000&speeds=blitz,rapid';
async function topClub(uci){try{const r=await fetch(`${PROXY}?source=lichess&play=${uci.join(',')}${RATE}`);const d=await r.json();return d.moves||[]}catch{return[]}}
async function pct(u,color){for(let k=u.length;k>=6;k--){try{const rr=await fetch(`${PROXY}?source=lichess&play=${u.slice(0,k).join(',')}${RATE}`);const d=await rr.json();const w=d.white||0,dr=d.draws||0,bl=d.black||0,t=w+dr+bl;await new Promise(z=>setTimeout(z,140));if(t>=30){const sw=color==='white'?w:bl;return{score:(sw+0.5*dr)/t*100,games:t}}}catch{}}return null;}
const TARGETS=process.argv.slice(2);
for(const tgt of TARGETS){
  const [id,name]=tgt.split('::');const o=arr.find(x=>x.id===id);const v=o.variations.find(x=>x.name===name);
  if(!v){console.log(tgt+' NOTFOUND');continue;}
  const start=v.pgn.trim().split(/\s+/);const c=new Chess();const u=[];for(const m of start)u.push((()=>{const x=c.move(m);return x.from+x.to+(x.promotion||'')})());
  const line=[...start];
  while(line.length<22){const ms=await topClub(u);await new Promise(z=>setTimeout(z,160));if(!ms.length)break;const t=ms.slice().sort((a,b)=>(b.white+b.draws+b.black)-(a.white+a.draws+a.black))[0];const tot=t.white+t.draws+t.black;if(tot<30)break;try{const rr=c.move(t.san);u.push(rr.from+rr.to+(rr.promotion||''));line.push(t.san);}catch{break}}
  const stm=c.turn()==='w'?'white':'black';const raw=await ev(c.fen(),20);const se=(stm===o.color?raw:-raw)/100;
  const a=await pct(u,o.color);
  console.log(tgt+' ['+o.color+'] EXT('+line.length+'p) anchor='+anchor(line.join(' '))+' mg='+reachesMiddlegame(line.join(' ')).pass+' eval'+(se>=0?'+':'')+se.toFixed(2)+' club '+(a?a.score.toFixed(0)+'%('+a.games+'g)':'-'));
  console.log('   '+line.join(' '));
}
