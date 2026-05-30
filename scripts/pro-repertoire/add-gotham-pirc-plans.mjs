#!/usr/bin/env node
// GothamChess Pirc Defense (pro-gothamchess-pirc-defense) — plans. Student=BLACK.
// 3 data-anchored plans + keep the existing; delete legacy overview-only plans.
import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/middlegame-plans.json';
const OPENING_ID='pro-gothamchess-pirc-defense';
const STUDENT='b';
const SRC=['book:chess-strategy','https://www.chess.com/openings/Pirc-Defense','https://api.chess.com/pub/player/gothamchess/games/archives','https://en.wikipedia.org/wiki/Pirc_Defence'];
const ORANGE='rgba(255, 165, 0, 0.55)';
const data0=JSON.parse(readFileSync(PATH,'utf8'));
const DELETE_IDS=new Set(data0.filter(p=>p.openingId===OPENING_ID && !(p.playableLines&&p.playableLines[0]&&p.playableLines[0].moves)).map(p=>p.id));
const PLANS=[
  {
    id:'mp-progothamchess-pirc-austrian-c5',
    title:'vs Austrian Attack: …c5 Counter + …Nd4 Centralization',
    overview:"His main plan against the aggressive Austrian Attack (f4). Rather than passively defending, Black strikes the centre with …c5, and after Bb5+ and the central tension, jumps the knight into the dominant …Nd4 square. The trades that follow ease Black's position and leave a solid structure where the fianchettoed Bg7 and the active pieces fully neutralize White's space.",
    pawnBreaks:['…c5 striking the centre','…e5 a central break'],
    pieceManeuvers:['…Nc6-d4 the central knight','…Bf8-g7 the fianchetto','the trades easing the position'],
    strategicThemes:['Counter with …c5','Centralize with …Nd4','Neutralize the Austrian space'],
    endgameTransitions:['The trades reach a comfortable ending'],
    anchor:'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 c5 Bb5+ Nc6 e5',
    cont:['Nd7','d5','Nd4'],
    ann:[
      '…Nd7 — Black retreats the knight, sidestepping the e5-pawn and keeping the structure flexible.',
      'd5 — White grabs space, kicking the c6-knight.',
      '…Nd4 — the knight leaps to the dominant central d4-square, hitting the Nf3 and the Bb5. The trades that follow ease Black’s game; with the Bg7 raking the long diagonal and the active pieces, Black fully neutralizes the Austrian Attack’s space advantage.',
    ],
    cues:['Nd7 — sidestep the e5-pawn','d5 — White grabs space','Nd4 — the dominant central knight'],
  },
  {
    id:'mp-progothamchess-pirc-classical-e5',
    title:'vs Classical: the …e5 Freeing Break',
    overview:"Against the Classical Nf3 setup, his plan is the King's-Indian-style …e5 break. After …Bg7, …O-O, and …Nc6, when White plays d5 the knight reroutes and Black strikes with …e5, challenging the centre and opening the position for the fianchettoed bishop. The …e5 break is the classic Pirc freeing maneuver, equalizing and creating kingside play.",
    pawnBreaks:['…e5 the central freeing break','…f5 a kingside expansion later'],
    pieceManeuvers:['…Bf8-g7 the long-diagonal bishop','…Nb8-c6 the development','…Bc8-e6 after the break'],
    strategicThemes:['Develop the KID-style setup','Break with …e5','Open the position for the bishop'],
    endgameTransitions:['The freed position equalizes'],
    anchor:'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O Nc6 d5 Nb8',
    cont:['Be3','e5','dxe6'],
    ann:[
      'Be3 — White develops the bishop, reinforcing the d4-square.',
      '…e5 — the freeing break! Black challenges the centre, the classic Pirc/King’s-Indian maneuver to open the position.',
      'dxe6 — White takes en passant; after …Bxe6 Black has freed the position, activated the light-squared bishop, and equalized with active piece play. The …e5 break is the heart of the Pirc’s counterplay.',
    ],
    cues:['Be3 — White develops','e5 — the freeing break','dxe6 — open for the bishop, equalize'],
  },
  {
    id:'mp-progothamchess-pirc-150-b5',
    title:'vs 150 Attack: …c6 + …b5 Queenside Counterattack',
    overview:"Against the dangerous 150 Attack (Be3 + f3 + Qd2 + O-O-O), his plan is the standard opposite-side-castling counterattack: …c6 and …b5 expand on the queenside, …Nbd7-b6 supports the …b5-b4 advance, and Black races to open lines against White's king on the queenside. With both sides attacking opposite wings, it becomes a sharp race where Black's …b5-b4 break is fast.",
    pawnBreaks:['…b5-b4 the queenside pawn storm','…c6 supporting …b5'],
    pieceManeuvers:['…Nb8-d7-b6 supporting …b5','…Bc8-b7 the fianchetto','…a5-a4 the pawn storm'],
    strategicThemes:['Expand with …c6 and …b5','Reroute …Nb6 to support …b4','Race to attack White’s king'],
    endgameTransitions:['Keep attacking — opposite castling is a race'],
    anchor:'e4 d6 d4 Nf6 Nc3 g6 Be3 c6 f3 b5 Qd2',
    cont:['Nbd7','g4','Nb6'],
    ann:[
      '…Nbd7 — Black develops the knight, heading for b6 to support the …b5-b4 advance.',
      'g4 — White begins the kingside pawn storm, the standard 150-Attack plan.',
      '…Nb6 — the knight reroutes to b6, supporting the …b5-b4 break and eyeing the c4-square. With …c6 and …b5 already played, Black’s queenside counterattack races against White’s kingside storm — and in these opposite-castling positions, Black’s …b4 break is fast and dangerous.',
    ],
    cues:['Nbd7 — head for b6','g4 — White storms the kingside','Nb6 — support the …b4 break'],
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
