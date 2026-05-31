#!/usr/bin/env node
// For every short (<8-ply) masterclass middlegame plan, check whether a model
// game of the SAME opening passes through the plan's exact end position; if so,
// emit the real next moves (up to enough to reach 8 plies) so the plan can be
// extended along that real game. David 2026-05-30: middlegame plans come from
// the games that actually reached the position. Writes /tmp/cont.txt.
import fs from 'node:fs'; import { Chess } from 'chess.js';
const plans=JSON.parse(fs.readFileSync('src/data/middlegame-plans.json','utf8'));
const games=JSON.parse(fs.readFileSync('src/data/model-games.json','utf8'));
const gamesByOpening={};
for(const g of games){ (gamesByOpening[g.openingId]=gamesByOpening[g.openingId]||[]).push(g); }
const rows=[];
for(const pl of plans){
  if((pl.openingId||'').startsWith('pro-')||(pl.id||'').startsWith('mp-progothamchess')||(pl.id||'').startsWith('mp-pronaro')) continue;
  const l=(pl.playableLines||[])[0]; if(!l||(l.moves||[]).length>=8) continue;
  // compute the plan's end board (FEN piece placement only)
  let endBoard=null;
  try{ const c=new Chess(l.fen); for(const m of l.moves) c.move(m); endBoard=c.fen().split(' ').slice(0,2).join(' '); }catch{ rows.push(`${pl.id}\tBAD-FEN`); continue; }
  const need=8-l.moves.length;
  let found=null;
  for(const g of (gamesByOpening[pl.openingId]||[])){
    const c=new Chess(); const hist=g.pgn.trim().split(/\s+/); let ok=true;
    for(let i=0;i<hist.length;i++){
      try{ c.move(hist[i]); }catch{ ok=false; break; }
      if(c.fen().split(' ').slice(0,2).join(' ')===endBoard){
        // collect next `need` real moves
        const next=hist.slice(i+1, i+1+need);
        if(next.length>=need){ found={game:g.id, variation:g.variation, atPly:i+1, next}; }
        break;
      }
    }
    if(found) break;
  }
  if(found) rows.push(`${pl.id}\tCONT via ${found.game} (${found.variation})\tnext: ${found.next.join(' ')}`);
  else rows.push(`${pl.id}\tNO-CONT (need+${need})`);
}
fs.writeFileSync('/tmp/cont.txt', rows.join('\n'));
const yes=rows.filter(r=>r.includes('\tCONT ')).length;
console.log(`checked ${rows.length}: ${yes} have a model-game continuation through the plan end`);
