#!/usr/bin/env node
// GothamChess French Defense (pro-gothamchess-french-defense) — plans.
// Student = BLACK (main weapon, 1596 games / 946 wins). 4 data-anchored plans,
// deleting legacy overview-only plans. Theme gate needs a BLACK move on a goal.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/middlegame-plans.json';
const OPENING_ID='pro-gothamchess-french-defense';
const STUDENT='b';
const SRC=['book:chess-strategy','https://www.chess.com/openings/French-Defense','https://api.chess.com/pub/player/gothamchess/games/archives','https://en.wikipedia.org/wiki/French_Defence'];
const ORANGE='rgba(255, 165, 0, 0.55)';
const data0=JSON.parse(readFileSync(PATH,'utf8'));
const DELETE_IDS=new Set(data0.filter(p=>p.openingId===OPENING_ID && !(p.playableLines&&p.playableLines[0]&&p.playableLines[0].moves)).map(p=>p.id));
const PLANS=[
  {
    id:'mp-progothamchess-french-rubinstein-qxd4',
    title:'Rubinstein: …gxf6 + …e5 + …Qxd4 + …O-O-O Attack',
    overview:"His signature aggressive Rubinstein across 330 games. Black takes …dxe4 and recaptures …gxf6, accepting doubled f-pawns in exchange for the bishop pair and the open g-file. Then …e5 and …Bg4 trade off a knight, …Qxd4 grabs the centre pawn, and …O-O-O castles queenside for a kingside attack down the g-file. A dynamic, double-edged French where Black plays for the win.",
    pawnBreaks:['…e5 the central break','the open g-file from …gxf6'],
    pieceManeuvers:['…Bc8-g4xf3 trading a knight','…Qd8xd4 grabbing the centre pawn','…O-O-O queenside castling'],
    strategicThemes:['Take the bishop pair and the g-file','Break with …e5','Grab …Qxd4 and castle queenside for the attack'],
    endgameTransitions:['The bishop pair compensates the doubled pawns'],
    anchor:'e4 e6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 Bg2 Bg4 h3 Bxf3 Bxf3',
    cont:['Qxd4','Qe2','O-O-O'],
    ann:[
      '…Qxd4 — Black grabs the central d4-pawn, the point of the …e5 and …Bxf3 sequence.',
      'Qe2 — White develops the queen, eyeing the e-file and Black’s slightly loose king.',
      '…O-O-O — Black castles queenside, connecting the rooks and committing to a kingside attack down the open g-file. With the bishop pair, the extra centre pawn, and the open g-file, Black has a dynamic, double-edged game with real winning chances — exactly what the aggressive Rubinstein is built for.',
    ],
    cues:['Qxd4 — grab the centre pawn','Qe2 — White develops','O-O-O — castle queenside, attack the g-file'],
  },
  {
    id:'mp-progothamchess-french-tarrasch-b5gambit',
    title:'vs Tarrasch: the …Nb4 + …b5 Gambit',
    overview:"Against the Tarrasch Nd2, his 231-game plan is the sharp …Nb4 and …b5 gambit. After …e5 and d5 close the centre, the knight jumps to b4, and when White checks Qa4+, Black gambits with …b5! to deflect the queen and open lines for rapid development and attack. A swashbuckling pawn sacrifice that fits his aggressive style — Black plays for the initiative, not equality.",
    pawnBreaks:['…b5 the gambit deflection','…c6 challenging the d5-pawn'],
    pieceManeuvers:['…Nc6-b4 the active knight','…Bc8-f5 the developing bishop','the lead in development for the pawn'],
    strategicThemes:['Jump …Nb4 to the active square','Gambit …b5 to deflect the queen','Open lines for the attack'],
    endgameTransitions:['Keep attacking — the development lead is the compensation'],
    anchor:'e4 e6 d4 d5 Nd2 dxe4 Nxe4 Nf6 Nxf6+ gxf6 Nf3 Nc6 g3 e5 d5 Nb4 c4 Bf5 Qa4+',
    cont:['b5','Qxb5+','c6'],
    ann:[
      '…b5 — the gambit! Black sacrifices the pawn to deflect the white queen and open lines for a rapid attack.',
      'Qxb5+ — White takes the bait, but the queen is now exposed and offside.',
      '…c6 — Black hits the d5-pawn and gains time on the white queen, opening the position for the bishops and rooks. The pawn sacrifice has bought a powerful initiative and a lead in development — the swashbuckling French at its sharpest.',
    ],
    cues:['b5 — the gambit deflection','Qxb5+ — White grabs the pawn','c6 — hit d5, gain time, attack'],
  },
  {
    id:'mp-progothamchess-french-advance-counter',
    title:'vs Advance: …c5 + …Qb6 + …cxd4 Counterplay',
    overview:"Against the Advance 3.e5, his 177-game plan is the classical French counterattack: …c5 strikes the base of White's pawn chain, …Qb6 pressures the d4-pawn and the b2-square, and …cxd4 opens the c-file. With …Rc8 and the queen pressuring the queenside, Black generates active counterplay against White's space — the time-tested antidote to the French Advance.",
    pawnBreaks:['…c5 striking the pawn chain','…cxd4 opening the c-file'],
    pieceManeuvers:['…Qd8-b6 pressuring d4 and b2','…Ra8-c8 the c-file rook','…Bc8-d7-b5 the bishop reroute'],
    strategicThemes:['Strike the chain base with …c5','Pressure d4 with …Qb6','Open the c-file with …cxd4'],
    endgameTransitions:['The queenside pressure carries into the ending'],
    anchor:'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 O-O Bd7 Re1',
    cont:['Rc8','Nbd2','dxc3'],
    ann:[
      '…Rc8 — Black brings the rook to the half-open c-file, adding to the queenside pressure.',
      'Nbd2 — White develops the knight, defending and preparing to recapture.',
      '…dxc3 — Black opens the c-file by capturing on c3, increasing the pressure on White’s queenside and the b2-pawn. With the queen on b6, the rook on c8, and the open c-file, Black has the classical French Advance counterplay — active piece play against White’s space.',
    ],
    cues:['Rc8 — the c-file rook','Nbd2 — White develops','dxc3 — open the c-file, pressure b2'],
  },
  {
    id:'mp-progothamchess-french-exchange-develop',
    title:'vs Exchange: Active …Bd6 + …Bg4 + …Nc6 Development',
    overview:"Against the Exchange exd5, his 141-game plan refuses the drawish reputation: Black develops actively with …Bd6, …Bg4 pinning, …Ne7-c6, and …Qd7, aiming for a kingside attack with …f5 or opposite-side castling. By placing the pieces aggressively rather than symmetrically, Black creates imbalance and winning chances from the supposedly equal Exchange French.",
    pawnBreaks:['…f5 a kingside expansion later','the symmetrical IQP-free centre'],
    pieceManeuvers:['…Bf8-d6 the active bishop','…Bc8-g4 the pin','…Ng8-e7-c6 the knight development'],
    strategicThemes:['Develop actively, not symmetrically','Pin with …Bg4','Aim for …f5 and a kingside attack'],
    endgameTransitions:['The active pieces create winning chances'],
    anchor:'e4 e6 d4 d5 exd5 exd5 Nf3 Bd6 Bd3 Bg4 O-O Ne7 Re1',
    cont:['Nc6','c3','Qd7'],
    ann:[
      '…Nc6 — Black develops the knight to its active square, eyeing d4 and the centre.',
      'c3 — White solidifies the centre.',
      '…Qd7 — Black connects the pieces and eyes a queen swing to the kingside or queenside castling for an attack. By developing aggressively rather than symmetrically, Black creates imbalance and real winning chances from the Exchange French — refusing the draw.',
    ],
    cues:['Nc6 — develop actively','c3 — White solidifies','Qd7 — connect, aim for the attack'],
  },
];
const data=data0.filter(p=>!DELETE_IDS.has(p.id));
const deleted=data0.length-data.length;
const existing=new Set(data.map(p=>p.id));
let failed=0;const added=[];
for(const p of PLANS){
  const c=new Chess();let ok=true;
  for(const san of p.anchor.trim().split(/\s+/)){try{c.move(san);}catch{console.error('ANCHOR ILLEGAL '+p.id+': '+san);ok=false;break;}}
  if(!ok){failed++;continue;}
  const critFen=c.fen();const probe=new Chess(critFen);const moveInfo=[];
  for(const san of p.cont){let mv;try{mv=probe.move(san);}catch{console.error('CONT ILLEGAL '+p.id+': '+san);ok=false;break;}moveInfo.push({to:mv.to,color:mv.color});}
  if(!ok){failed++;continue;}
  if(p.cont.length!==p.ann.length||p.cont.length!==p.cues.length){console.error('LENGTH '+p.id);failed++;continue;}
  const SQ=/([a-h][1-8])/g;const COND=/\b(only|if|else|avoid|keep|restrain|passed|once|when|unless|never|don'?t|patient|flawless|sound|respect|balance|small|long-term|matters|later)\b/i;
  const goals=new Set();
  for(const pb of p.pawnBreaks)if(!COND.test(pb))(pb.match(SQ)||[]).forEach(q=>goals.add(q));
  for(const pm of p.pieceManeuvers)(pm.match(SQ)||[]).forEach(q=>goals.add(q));
  const demo=moveInfo.some(mi=>mi.color===STUDENT&&goals.has(mi.to));
  if(!demo){console.error('THEME-EMPTY '+p.id+': goals {'+[...goals].join(',')+'}; b tos='+moveInfo.filter(m=>m.color===STUDENT).map(m=>m.to).join(','));failed++;continue;}
  const PROMISE=/\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
  if(PROMISE.test(p.ann[p.ann.length-1])){console.error('PROMISE-ENDING '+p.id);failed++;continue;}
  if(existing.has(p.id))continue;
  added.push({id:p.id,openingId:OPENING_ID,criticalPositionFen:critFen,title:p.title,overview:p.overview,pawnBreaks:p.pawnBreaks,pieceManeuvers:p.pieceManeuvers,strategicThemes:p.strategicThemes,endgameTransitions:p.endgameTransitions,playableLines:[{fen:critFen,moves:p.cont,annotations:p.ann,arrows:p.cont.map(()=>[]),highlights:moveInfo.map(mi=>[{square:mi.to,color:ORANGE}]),learnCues:p.cues,title:p.title,intro:p.overview,sources:SRC}]});
}
if(failed>0){console.error('\n'+failed+' failed — NOT writing.');process.exit(1);}
data.push(...added);
writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('deleted '+deleted+' legacy, added '+added.length+' new. total now '+data.length+'.');
