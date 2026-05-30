#!/usr/bin/env node
// Pitfalls for the GothamChess Scandinavian. Student = BLACK (Black to move).
import fs from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/common-mistakes.json';
const KEY='pro-gothamchess-scandinavian';
const SRC=['book:chess-fundamentals','https://www.chess.com/openings/Scandinavian-Defense','https://en.wikipedia.org/wiki/Scandinavian_Defense'];
const PITFALLS=[
  {
    // After 1.e4 d5 2.exd5 Qxd5 3.Nc3 — the queen retreat. Qa5 (best) vs Qd8/Qe5+.
    setup:'e4 d5 exd5 Qxd5 Nc3',
    wrongMove:'Qe5+',
    correctMove:'Qa5',
    explanation:"After 3.Nc3 attacks the queen, the best square is …Qa5! — pinning nothing but staying active, eyeing a5-e1 and supporting a quick …Bf5, …c6, and queenside development. The greedy …Qe5+ invites Be2 and rapid development with tempo against the exposed queen, while …Qd8 is too passive. The Scandinavian's main line runs through …Qa5 — the queen is safe and useful there.",
    shortNarration:'Qa5 — the safe, active queen square',
  },
  {
    // After 2...Nf6 3.d4 Bg4 (modern) — White plays f3. Bf5 vs the wrong retreat.
    setup:'e4 d5 exd5 Nf6 d4 Bg4 f3',
    wrongMove:'Bxf3',
    correctMove:'Bf5',
    explanation:"In the modern …Nf6 Scandinavian, after 5.f3 questions the bishop, the principled move is …Bf5! — keeping the bishop on its strong diagonal and preparing …e6 and …Bxc2 ideas or …Nxd5 recapture. Grabbing with …Bxf3 hands White the bishop pair and a strong centre for nothing. Retreat the bishop to f5 and keep the Scandinavian's piece activity.",
    shortNarration:'Bf5 — keep the bishop active',
  },
  {
    // After 2...Nf6 3.c4 (trying to hold the pawn) — Black must strike. e6 vs passive.
    setup:'e4 d5 exd5 Nf6 c4',
    wrongMove:'Nxd5',
    correctMove:'e6',
    explanation:"When White grabs space with 3.c4 to hold the extra d5-pawn, the strong gambit try is …e6! — striking at the d5-pawn immediately and opening lines for rapid development and a lead in initiative. The routine …Nxd5 isn't possible (the pawn is defended by c4), and passive play lets White consolidate the extra pawn. Hit the centre with …e6 and play the Icelandic-Palme gambit for activity.",
    shortNarration:'e6 — strike the centre, gambit for activity',
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
  if(words>8){console.error('CUE too long ('+words+'w): '+p.shortNarration);failed++;continue;}
  entries.push({fen,wrongMove:p.wrongMove,correctMove:p.correctMove,explanation:p.explanation,shortNarration:p.shortNarration,sources:SRC});
}
if(failed>0){console.error('\n'+failed+' failed — NOT writing.');process.exit(1);}
data[KEY]=entries;
fs.writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('wrote '+entries.length+' pitfalls under "'+KEY+'".');
