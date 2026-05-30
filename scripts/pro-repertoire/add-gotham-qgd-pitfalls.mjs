#!/usr/bin/env node
// Pitfalls for the GothamChess QGD. Student = BLACK (Black to move).
import fs from 'node:fs'; import { Chess } from 'chess.js';
const PATH='src/data/common-mistakes.json'; const KEY='pro-gothamchess-qgd';
const SRC=['book:chess-strategy','https://www.chess.com/openings/Queens-Gambit-Declined','https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];
const PITFALLS=[
  {
    // After 1.d4 d5 2.c4 e6 3.Nc3 Nf6 4.Bg5 — the pin. Be7 (solid) vs ...dxc4.
    setup:'d4 d5 c4 e6 Nc3 Nf6 Bg5',
    wrongMove:'dxc4',
    correctMove:'Be7',
    explanation:"In the QGD, the whole point is to keep the centre solid: …Be7! breaks the pin and prepares …O-O and …h6 with a rock-solid structure. Grabbing the pawn with …dxc4 surrenders the centre and invites e4 with a big space advantage for White — that's the Queen's Gambit Accepted, a different opening. The QGD keeps the …d5/…e6 chain intact: develop with …Be7 and stay solid.",
    shortNarration:'Be7 — keep the QGD solid, hold d5',
  },
  {
    // After the Exchange ...Bd6 setup — the freeing break. Re8 (prep ...e5) vs passive.
    setup:'d4 d5 c4 e6 Nc3 a6 cxd5 exd5 Bf4 Nf6 e3 Bd6 Bg3 O-O Bd3',
    wrongMove:'b6',
    correctMove:'Re8',
    explanation:"In the Carlsbad/Exchange structure, Black's freeing plan is …Re8 followed by the …Nbd7-f8-g6 reroute and the …e5 break — the classic antidote to White's minority attack. Playing …b6 weakens the queenside light squares (c6) right where White wants to attack with b4-b5. Don't help the minority attack: play …Re8, reroute the knight, and prepare …e5 to free the position.",
    shortNarration:'Re8 — prepare the freeing …e5 break',
  },
  {
    // After 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4 4.Qc2 — Nimzo. d5 (transpose QGD) vs ...c5.
    setup:'d4 Nf6 c4 e6 Nc3 Bb4 Qc2',
    wrongMove:'Nc6',
    correctMove:'d5',
    explanation:"In the Nimzo-QGD with 4.Qc2, his choice is …d5! — striking the centre and transposing into a favourable QGD structure where the …Bb4 pin and the …d5 chain give Black a comfortable game. The passive …Nc6 blocks the c-pawn and lets White expand with a3 and e4 unchallenged. Strike the centre with …d5 and reach the solid QGD/Nimzo structure he wins with.",
    shortNarration:'d5 — strike the centre, reach the QGD',
  },
];
const data=JSON.parse(fs.readFileSync(PATH,'utf8'));
let failed=0;const entries=[];
for(const p of PITFALLS){
  const c=new Chess();let ok=true;
  for(const san of p.setup.trim().split(/\s+/)){try{c.move(san);}catch{console.error('SETUP ILLEGAL: '+san);ok=false;break;}}
  if(!ok){failed++;continue;}
  const fen=c.fen();
  for(const mv of [p.wrongMove,p.correctMove]){const probe=new Chess(fen);try{probe.move(mv);}catch{console.error('MOVE ILLEGAL: '+mv+' @ '+fen);failed++;ok=false;}}
  if(!ok)continue;
  const words=p.shortNarration.replace(/[—–-]/g,' ').split(/\s+/).filter(w=>/[a-z0-9]/i.test(w)).length;
  if(words>8){console.error('CUE too long');failed++;continue;}
  entries.push({fen,wrongMove:p.wrongMove,correctMove:p.correctMove,explanation:p.explanation,shortNarration:p.shortNarration,sources:SRC});
}
if(failed>0){console.error('\n'+failed+' failed — NOT writing.');process.exit(1);}
data[KEY]=entries;
fs.writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('wrote '+entries.length+' pitfalls.');
