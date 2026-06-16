import { readFileSync } from 'node:fs';
import { Chess } from 'chess.js';
import { spawn } from 'node:child_process';
import { reachesMiddlegame } from '../src/data/variationMiddlegameDepth.shared.mjs';
const SF='/usr/games/stockfish';const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const r=JSON.parse(readFileSync('src/data/repertoire.json','utf8'));const arr=r.openings||r;
function ev(fen,d=20){return new Promise((res)=>{const p=spawn(SF);let b=0,o='';p.stdout.on('data',(x)=>{o+=x;let i;while((i=o.indexOf('\n'))>=0){const ln=o.slice(0,i);o=o.slice(i+1);const m=/score (cp|mate) (-?\d+)/.exec(ln);if(m)b=m[1]==='mate'?(+m[2]>0?1000:-1000):+m[2];if(ln.startsWith('bestmove')){p.kill();res(b)}}});p.stdin.write(`uci\nposition fen ${fen}\ngo depth ${d}\n`)});}
function legal(pgn){const c=new Chess();const u=[];for(const m of pgn.trim().split(/\s+/)){try{const x=c.move(m);u.push(x.from+x.to+(x.promotion||''))}catch{return null}}return {c,u};}
async function pct(u,color,src){const extra=src==='lichess'?'&ratings=1400,1600,1800,2000&speeds=blitz,rapid':'';for(let k=u.length;k>=6;k--){try{const rr=await fetch(`${PROXY}?source=${src}&play=${u.slice(0,k).join(',')}${extra}`);const d=await rr.json();const w=d.white||0,dr=d.draws||0,bl=d.black||0,t=w+dr+bl;await new Promise(z=>setTimeout(z,120));if(t>=(src==='lichess'?30:8)){const sw=color==='white'?w:bl;return{score:(sw+0.5*dr)/t*100,games:t}}}catch{}}return null;}
const ids=process.argv.slice(2);
for(const id of ids){
  const o=arr.find(x=>x.id===id);if(!o){console.log(id+' NOT FOUND');continue;}
  console.log('\n### '+id+' ['+o.color+']');
  for(const v of (o.variations||[])){
    const lg=legal(v.pgn);if(!lg){console.log('  '+v.name+': ILLEGAL');continue;}
    const {c,u}=lg;const stm=c.turn()==='w'?'white':'black';const raw=await ev(c.fen(),20);const se=(stm===o.color?raw:-raw)/100;
    const m=await pct(u,o.color,'masters');const a=await pct(u,o.color,'lichess');
    const good=(se>=-2.0)&&((m&&m.score>=45)||(a&&a.score>=45));
    const plies=v.pgn.trim().split(/\s+/).length;const mg=reachesMiddlegame(v.pgn).pass;
    console.log('  '+v.name+': '+plies+'p mg='+mg+' eval '+(se>=0?'+':'')+se.toFixed(2)+' | M '+(m?m.score.toFixed(0)+'%':'-')+' | club '+(a?a.score.toFixed(0)+'%('+a.games+'g)':'-')+(good?' OK':' <-- CHECK'));
  }
}
console.log('\nDONE');
