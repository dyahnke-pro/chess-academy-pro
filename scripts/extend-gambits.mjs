import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';
const SF='/usr/games/stockfish';const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const r=JSON.parse(readFileSync('src/data/repertoire.json','utf8'));const arr=r.openings||r;
function ev(fen,d=22){return new Promise((res)=>{const p=spawn(SF);let b=0,o='';p.stdout.on('data',(x)=>{o+=x;let i;while((i=o.indexOf('\n'))>=0){const ln=o.slice(0,i);o=o.slice(i+1);const m=/score (cp|mate) (-?\d+)/.exec(ln);if(m)b=m[1]==='mate'?(+m[2]>0?1000:-1000):+m[2];if(ln.startsWith('bestmove')){p.kill();res(b)}}});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`)});}
async function top(uci){try{const r=await fetch(`${PROXY}?source=masters&play=${uci.join(',')}`);const d=await r.json();return d.moves||[]}catch{return[]}}
function uciOf(sans){const c=new Chess();const u=[];for(const m of sans)u.push((()=>{const r=c.move(m);return r.from+r.to+(r.promotion||'')})());return {c,u};}
async function pct(u,color){const extra='&ratings=1400,1600,1800,2000&speeds=blitz,rapid';for(let k=u.length;k>=6;k--){try{const rr=await fetch(`${PROXY}?source=lichess&play=${u.slice(0,k).join(',')}${extra}`);const d=await rr.json();const w=d.white||0,dr=d.draws||0,bl=d.black||0,t=w+dr+bl;await new Promise(z=>setTimeout(z,150));if(t>=30){const sw=color==='white'?w:bl;return{score:(sw+0.5*dr)/t*100,games:t}}}catch{}}return null;}
const TARGETS=process.argv.slice(2); // "id::name" pairs
for(const tgt of TARGETS){
  const [id,name]=tgt.split('::');const o=arr.find(x=>x.id===id);const v=o.variations.find(x=>x.name===name);
  if(!v){console.log(tgt+' NOTFOUND');continue;}
  const start=v.pgn.trim().split(/\s+/);const {c,u}=uciOf(start);const line=[...start];
  while(line.length<22){const ms=await top(u);await new Promise(z=>setTimeout(z,200));if(!ms.length)break;const t=ms.slice().sort((a,b)=>(b.white+b.draws+b.black)-(a.white+a.draws+a.black))[0];const tot=t.white+t.draws+t.black;if(tot<8)break;try{const rr=c.move(t.san);u.push(rr.from+rr.to+(rr.promotion||''));line.push(t.san);}catch{break}}
  const stm=c.turn()==='w'?'white':'black';const raw=await ev(c.fen(),22);const se=(stm===o.color?raw:-raw)/100;
  const a=await pct(u,o.color);
  console.log(tgt+' ['+o.color+']\\n  EXT('+line.length+'p) mg='+reachesMiddlegame(line.join(' ')).pass+' eval '+(se>=0?'+':'')+se.toFixed(2)+' club '+(a?a.score.toFixed(0)+'%('+a.games+'g)':'-')+'\\n  '+line.join(' '));
}
console.log('DONE');
