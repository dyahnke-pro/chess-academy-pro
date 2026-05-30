#!/usr/bin/env node
// Pitfalls for the GothamChess French. Student = BLACK (Black to move).
import fs from 'node:fs'; import { Chess } from 'chess.js';
const PATH='src/data/common-mistakes.json'; const KEY='pro-gothamchess-french-defense';
const SRC=['book:chess-strategy','https://www.chess.com/openings/French-Defense','https://en.wikipedia.org/wiki/French_Defence'];
const PITFALLS=[
  {
    // After 1.e4 e6 2.d4 d5 3.Nc3 dxe4 4.Nxe4 Nf6 5.Nxf6+ — the recapture. gxf6 (his) vs Qxf6.
    setup:'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+',
    wrongMove:'Qxf6',
    correctMove:'gxf6',
    explanation:"His signature Rubinstein recapture is …gxf6! — accepting doubled f-pawns in exchange for the bishop pair, the open g-file, and a dynamic, aggressive position with …e5 and …O-O-O to follow. The natural …Qxf6 keeps the structure clean but leads to a passive, equal position with no winning chances. The …gxf6 structure is what makes his French a fighting weapon — take with the g-pawn and play for the attack.",
    shortNarration:'gxf6 — the dynamic Rubinstein recapture',
  },
  {
    // After 1.e4 e6 2.d4 d5 3.e5 — the Advance. c5 (strike) vs passive.
    setup:'e4 e6 d4 d5 e5',
    wrongMove:'Ne7',
    correctMove:'c5',
    explanation:"Against the Advance 3.e5, the principled break is …c5! — striking immediately at the base of White's pawn chain (the d4-pawn) to generate queenside counterplay with …Qb6 and …cxd4. Developing passively with …Ne7 first lets White consolidate the big space advantage and play a comfortable game. Hit the chain at its base with …c5 — that's the time-tested French Advance antidote.",
    shortNarration:'c5 — strike the pawn chain base',
  },
  {
    // After 1.e4 e6 2.d4 d5 3.exd5 exd5 — the Exchange. Bd6 (active) vs symmetric.
    setup:'e4 e6 d4 d5 exd5 exd5 Nf3',
    wrongMove:'Nf6',
    correctMove:'Bd6',
    explanation:"In the Exchange French, the way to fight for a win is active development: …Bd6! aims the bishop at h2, prepares …Bg4 to pin, and sets up a kingside attack or opposite-side castling. Routine symmetrical development with …Nf6 first invites a dead-equal, drawish game. Refuse the draw: develop the bishop actively to d6, pin with …Bg4, and create imbalance from the supposedly equal Exchange French.",
    shortNarration:'Bd6 — active development, refuse the draw',
  },
];
const data=JSON.parse(fs.readFileSync(PATH,'utf8'));
let failed=0;const entries=[];
for(const p of PITFALLS){
  const c=new Chess();let ok=true;
  for(const san of p.setup.trim().split(/\s+/)){try{c.move(san);}catch{console.error('SETUP ILLEGAL: '+san);ok=false;break;}}
  if(!ok){failed++;continue;}
  const fen=c.fen();
  for(const mv of [p.wrongMove,p.correctMove]){const probe=new Chess(fen);try{probe.move(mv);}catch{console.error('MOVE ILLEGAL: '+mv);failed++;ok=false;}}
  if(!ok)continue;
  const words=p.shortNarration.replace(/[—–-]/g,' ').split(/\s+/).filter(w=>/[a-z0-9]/i.test(w)).length;
  if(words>8){console.error('CUE too long');failed++;continue;}
  entries.push({fen,wrongMove:p.wrongMove,correctMove:p.correctMove,explanation:p.explanation,shortNarration:p.shortNarration,sources:SRC});
}
if(failed>0){console.error('\n'+failed+' failed — NOT writing.');process.exit(1);}
data[KEY]=entries;fs.writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('wrote '+entries.length+' pitfalls.');
