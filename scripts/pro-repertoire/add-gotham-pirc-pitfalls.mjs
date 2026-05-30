#!/usr/bin/env node
// Pitfalls for the GothamChess Pirc. Student = BLACK (Black to move).
import fs from 'node:fs'; import { Chess } from 'chess.js';
const PATH='src/data/common-mistakes.json'; const KEY='pro-gothamchess-pirc-defense';
const SRC=['book:chess-strategy','https://www.chess.com/openings/Pirc-Defense','https://en.wikipedia.org/wiki/Pirc_Defence'];
const PITFALLS=[
  {
    // After the Austrian Attack 1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.f4 Bg7 5.Nf3 — the counter. c5 vs passive O-O.
    setup:'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3',
    wrongMove:'O-O',
    correctMove:'c5',
    explanation:"Against the aggressive Austrian Attack, the principled counter is …c5! — striking the centre immediately before White completes the kingside build-up. Castling passively with …O-O invites White's e5 and a crushing kingside pawn storm (f4-f5) against the king. Hit the centre first with …c5: it challenges d4, opens lines for counterplay, and stops White from getting a free attack. Counterattack, don't sit and defend.",
    shortNarration:'c5 — counter the centre, not passive O-O',
  },
  {
    // After the 150 Attack 1.e4 d6 2.d4 Nf6 3.Nc3 g6 4.Be3 — the queenside plan. c6 vs ...O-O.
    setup:'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 f3 c6 Qd2',
    wrongMove:'O-O',
    correctMove:'b5',
    explanation:"Against the 150 Attack (Be3 + f3 + Qd2 + O-O-O aiming for a kingside mate), castling kingside with …O-O walks straight into White's attack with h4-h5 and the Bh6 trade. The right plan is the immediate …b5! — striking out on the queenside, preparing …b4 to counterattack White's king on the queenside, where White intends to castle. In these opposite-side races, strike first on the queenside with …b5 and …b4 — don't castle into the storm.",
    shortNarration:'b5 — counter on the queenside, not O-O',
  },
  {
    // After 1.e4 d6 2.d4 Nf6 3.Nc3 — the Pirc move order. g6 (his) vs ...e5.
    setup:'e4 d6 d4 Nf6 Nc3',
    wrongMove:'e5',
    correctMove:'g6',
    explanation:"The Pirc's whole idea is the kingside fianchetto: …g6! preparing …Bg7 to train the bishop on the long diagonal and pressure White's centre from afar. The premature …e5 opens the centre while Black is underdeveloped — after dxe5 dxe5 Qxd8+ Kxd8 Black loses castling rights for nothing. Stay true to the Pirc setup: …g6, …Bg7, …O-O, and counterattack the centre with …c5 or …e5 only when ready.",
    shortNarration:'g6 — the Pirc fianchetto setup',
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
  if(words>8){console.error('CUE too long: '+p.shortNarration);failed++;continue;}
  entries.push({fen,wrongMove:p.wrongMove,correctMove:p.correctMove,explanation:p.explanation,shortNarration:p.shortNarration,sources:SRC});
}
if(failed>0){console.error('\n'+failed+' failed — NOT writing.');process.exit(1);}
data[KEY]=entries;fs.writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('wrote '+entries.length+' pitfalls.');
