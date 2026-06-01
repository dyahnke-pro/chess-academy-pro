import fs from 'node:fs';
import { Chess } from 'chess.js';
const wins=JSON.parse(fs.readFileSync('data/sources/magnuscarlsen-model-wins.json','utf8'));
const bare=(pgn)=>{const i=pgn.search(/\n\n/);if(i<0)return pgn;let b=pgn.slice(i).replace(/\{[^}]*\}/g,'');let p;do{p=b;b=b.replace(/\([^()]*\)/g,'')}while(b!==p);return b.replace(/\b\d+\.+\s*/g,'').replace(/\s*(?:1-0|0-1|1\/2-1\/2|\*)\s*$/,'').replace(/\s+/g,' ').trim();};
const side={'pro-carlsen-ruy-lopez':'w','pro-carlsen-1e5':'b','pro-carlsen-queens-pawn':'w','pro-carlsen-nimzo':'b','pro-carlsen-french':'b'};
for(const [id,sc] of Object.entries(side)){
  const list=wins[id]||[];
  let best=null;
  for(const w of list){
    const ms=bare(w.pgn).split(' ');
    const c=new Chess();let transPly=-1;
    for(let i=0;i<ms.length;i++){ if(!c.move(ms[i])){break;}
      // queens off + ply>=24
      const b=c.board().flat().filter(Boolean);
      const q=b.filter(p=>p.type==='q').length;
      if(q===0 && i>=24 && transPly<0){ transPly=i; }
    }
    if(transPly>0 && ms.length-transPly>=8){ best={w,ms,transPly}; break; }
  }
  if(!best){console.log(`${id}: no clean queenless endgame in top wins`);continue;}
  const {w,ms,transPly}=best;
  const c=new Chess();for(let i=0;i<=transPly;i++)c.move(ms[i]);
  const fen=c.fen();
  const tail=[];const land=[];
  for(let i=transPly+1;i<Math.min(transPly+13,ms.length);i++){const mv=c.move(ms[i]);tail.push(ms[i]);if(mv.color===sc)land.push(ms[i]+'->'+mv.to);}
  console.log(`\n### ${id} vs ${w.opp}(${w.oppElo}) transPly=${transPly} totalPlies=${ms.length}`);
  console.log('  TRANSITION FEN:',fen);
  console.log('  TAIL:',tail.join(' '));
  console.log('  STUDENT LANDS:',land.join(' '));
}
