#!/usr/bin/env node
// GothamChess QGD (pro-gothamchess-qgd) — plans. Student = BLACK. Theory-heavy;
// 2 data/theory-anchored plans + keep the existing classical, delete legacy
// overview-only plans. Theme gate needs a BLACK move on a declared goal square.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/middlegame-plans.json';
const OPENING_ID='pro-gothamchess-qgd';
const STUDENT='b';
const SRC=['book:chess-strategy','https://www.chess.com/openings/Queens-Gambit-Declined','https://api.chess.com/pub/player/gothamchess/games/archives','https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];
const ORANGE='rgba(255, 165, 0, 0.55)';
const data0=JSON.parse(readFileSync(PATH,'utf8'));
const DELETE_IDS=new Set(data0.filter(p=>p.openingId===OPENING_ID && !(p.playableLines&&p.playableLines[0]&&p.playableLines[0].moves)).map(p=>p.id));
const PLANS=[
  {
    id:'mp-progothamchess-qgd-carlsbad-e5',
    title:'QGD Carlsbad: …Nbd7-f8-g6 + the …e5 Break',
    overview:"His main QGD plan against the Exchange/Carlsbad structure. After the symmetrical …Bd6 trade and …O-O, Black reroutes the knight Nbd7-f8-g6 toward the kingside and prepares the freeing …e5 break — the classic defense to White's minority attack. With the rook on e8 supporting …e5 and the pieces harmoniously placed, Black equalizes and seizes the initiative in the centre.",
    pawnBreaks:['…e6-e5 the freeing break','…c6 solidifying'],
    pieceManeuvers:['…Nb8-d7-f8-g6 the kingside reroute','…Rf8-e8 supporting …e5','…Bc8-f5 the active bishop'],
    strategicThemes:['Reroute …Nd7-f8-g6','Support …e5 with …Re8','Break free with …e5'],
    endgameTransitions:['The freed position equalizes into the ending'],
    anchor:'d4 d5 c4 e6 Nc3 a6 cxd5 exd5 Bf4 Nf6 e3 Bd6 Bg3 O-O Bd3',
    cont:['Re8','Nge2','Nbd7'],
    ann:[
      '…Re8 — Black places the rook on e8, supporting the coming …e5 freeing break.',
      'Nge2 — White develops the knight, completing the setup.',
      '…Nbd7 — Black starts the classic reroute: the knight heads for f8 and g6, eyeing the kingside and clearing the way for …e5. With the rook on e8 and the pieces harmonious, Black frees the position and equalizes against the Carlsbad structure.',
    ],
    cues:['Re8 — support …e5','Nge2 — White develops','Nbd7 — reroute toward g6 and …e5'],
  },
  {
    id:'mp-progothamchess-qgd-tartakower-b6',
    title:'QGD Tartakower: …b6 + …Bb7 Fianchetto',
    overview:"Against the Nf3+Bg5 lines, his plan is the rock-solid Tartakower: after …h6 and …Bxf6, Black plays …b6 and fianchettoes the light-squared bishop on b7, training it on the long diagonal and the e4-square. Combined with …c5 to challenge the centre, Black reaches a harmonious, well-tested setup where the bishop pair and the solid structure give full equality and winning chances.",
    pawnBreaks:['…c5 challenging the centre','…b6 preparing the fianchetto'],
    pieceManeuvers:['…b6 + …Bc8-b7 the fianchetto','the bishop pair after …Bxf6','…c5 freeing the position'],
    strategicThemes:['Fianchetto with …b6 and …Bb7','Use the bishop pair','Challenge the centre with …c5'],
    endgameTransitions:['The bishop pair favours Black into the ending'],
    anchor:'d4 d5 c4 e6 Nf3 Nf6 Nc3 Be7 Bg5 h6 Bxf6 Bxf6',
    cont:['Qc2','b6','Rd1','Bb7'],
    ann:[
      'Qc2 — White centralizes the queen, preparing to develop and contest the centre.',
      '…b6 — Black prepares the fianchetto, opening the long diagonal for the light-squared bishop.',
      'Rd1 — White brings the rook to the central file.',
      '…Bb7 — the bishop completes the Tartakower setup, training on the long diagonal and the e4-square. With the bishop pair and a solid structure, Black is fully equal, set to challenge the centre with …c5. The Tartakower is one of the most reliable defenses to the Queen’s Gambit.',
    ],
    cues:['Qc2 — White centralizes','b6 — prepare the fianchetto','Rd1 — White centralizes the rook','Bb7 — complete the Tartakower'],
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
  if(!demo){console.error('THEME-EMPTY '+p.id+': goals {'+[...goals].join(',')+'}; '+STUDENT+' tos='+moveInfo.filter(m=>m.color===STUDENT).map(m=>m.to).join(','));failed++;continue;}
  const PROMISE=/\b(ready for|ready to|prepares? to|preparing to|will follow|is ready|planning to|intends? to|swinging to|aims? to|looking to|poised|about to|coming next|next comes|to follow)\b/i;
  if(PROMISE.test(p.ann[p.ann.length-1])){console.error('PROMISE-ENDING '+p.id);failed++;continue;}
  if(existing.has(p.id))continue;
  added.push({id:p.id,openingId:OPENING_ID,criticalPositionFen:critFen,title:p.title,overview:p.overview,pawnBreaks:p.pawnBreaks,pieceManeuvers:p.pieceManeuvers,strategicThemes:p.strategicThemes,endgameTransitions:p.endgameTransitions,playableLines:[{fen:critFen,moves:p.cont,annotations:p.ann,arrows:p.cont.map(()=>[]),highlights:moveInfo.map(mi=>[{square:mi.to,color:ORANGE}]),learnCues:p.cues,title:p.title,intro:p.overview,sources:SRC}]});
}
if(failed>0){console.error('\n'+failed+' failed — NOT writing.');process.exit(1);}
data.push(...added);
writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('deleted '+deleted+' legacy, added '+added.length+' new. total now '+data.length+'.');
