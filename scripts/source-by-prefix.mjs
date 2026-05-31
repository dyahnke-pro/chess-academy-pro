#!/usr/bin/env node
// Source a real student-side-win game following a given SAN prefix (for
// opening MAIN-line plans where variations[0] isn't the pill line).
// Run: node scripts/source-by-prefix.mjs <openingId> <studentColor> "<san prefix>"
import { Chess } from 'chess.js';
const PROXY='https://chess-academy-pro.vercel.app/api/lichess-explorer';
const EXPORT='https://chess-academy-pro.vercel.app/api/lichess-game-export';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uci=(ms)=>{const c=new Chess();const o=[];for(const m of ms){let mv;try{mv=c.move(m);}catch{break;}if(!mv)break;o.push(mv.from+mv.to+(mv.promotion||''));}return o;};
const commonLen=(a,b)=>{let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;return i;};
const openingId=process.argv[2], studentColor=process.argv[3];
const prefix=process.argv[4].trim().split(/\s+/);
const wantWin=studentColor==='white'?'white':'black';
const seedLen=Math.min(prefix.length,16);
const seedUci=uci(prefix).slice(0,seedLen);
async function get(url){for(let i=0;i<5;i++){try{return await fetch(url).then(r=>r.text());}catch{await sleep(1500*(i+1));}}return null;}
const j=await fetch(`${PROXY}?source=masters&play=${seedUci.join(',')}`).then(r=>r.json()).catch(()=>null);
if(!j){console.error('explorer fail');process.exit(1);}
const cand=(j.topGames||[]).concat(j.recentGames||[]).filter(g=>g.id&&g.winner===wantWin);
const idPrefix=uci(prefix).slice(0,seedLen);
let chosen=null;
for(const g of cand){ await sleep(120);
  const pgn=await get(`${EXPORT}?id=${g.id}`); if(!pgn) continue;
  const c=new Chess(); try{c.loadPgn(pgn);}catch{continue;}
  const gu=uci(c.history());
  if(commonLen(gu,idPrefix)!==idPrefix.length) continue;
  const W=(pgn.match(/\[White "([^"]+)"\]/)||[])[1], B=(pgn.match(/\[Black "([^"]+)"\]/)||[])[1];
  const we=parseInt((pgn.match(/\[WhiteElo "(\d+)"\]/)||[])[1]||'0',10), be=parseInt((pgn.match(/\[BlackElo "(\d+)"\]/)||[])[1]||'0',10);
  const opp=studentColor==='white'?be:we;
  if(!chosen||opp>chosen.opp){ chosen={id:g.id,W,B,we,be,opp,res:g.winner==='white'?'1-0':'0-1',plies:c.history().length}; }
}
if(!chosen){ console.log('NO real student-win game follows this prefix'); process.exit(0); }
console.log(`CHOSEN ${chosen.id} ${chosen.W}(${chosen.we})-${chosen.B}(${chosen.be}) ${chosen.res} ${chosen.plies}plies`);
