import fs from 'node:fs';import { Chess } from 'chess.js';
const KEY='rgba(255,214,0,0.88)';const ARCH='https://api.chess.com/pub/player/magnuscarlsen/games/archives';
const src=(...c)=>['book:chess-fundamentals',...c.map(x=>`concept:${x}`),ARCH];
const EG=[
{id:'mp-carlsen-opensic-endgame',openingId:'pro-carlsen-open-sicilian',
 fen:'r5k1/pB3p1p/4b1p1/8/6P1/P1R4P/1P3P2/1K6 b - - 0 28',
 title:'Rook on the Seventh + the Extra Pawn (vs Firouzja)',
 overview:"From an Open Sicilian where Carlsen converted an extra pawn, the technique is textbook: the rook seizes the seventh rank, the kingside majority rolls with f4 and g4, and patient play converts the extra pawn.",
 theme:{kind:'pieceManeuvers',move:'Rc3-c7 the rook to the seventh, then f4 and g4 roll the kingside majority'},
 moves:['Rb8','Rc7','Kg7','f4','h5','Bf3','hxg4','hxg4','Rb3','Rc3'],
 ann:["Black contests the open file.","White's rook seizes the seventh rank — the most active post, tying Black to defence.","Black's king steps up.","White rolls the kingside majority; the extra pawn begins to tell.","Black expands in reply.","The bishop covers the long diagonal and guards g4.","Black trades on g4.","Recapturing keeps White's pawns connected and mobile.","Black checks from behind.","White holds everything and keeps the extra pawn — patient technique converts."],
 cue:['Rb8 — Black contests','Rc7 — rook to the seventh','Kg7 — king up','f4 — roll the majority','h5 — Black expands','Bf3 — cover the diagonal','hxg4 — Black trades','hxg4 — keep them connected','Rb3 — Black checks','Rc3 — hold the edge'],
 concepts:['pos-initiative','pos-space']},
{id:'mp-carlsen-sicilian-endgame',openingId:'pro-carlsen-sicilian',
 fen:'6k1/1p3p1p/6p1/6P1/2R4P/5K2/5P2/6r1 b - - 0 37',
 title:'The Rook Behind the Passed Pawn (vs Parhamov)',
 overview:"From a Sicilian where Carlsen ground out an extra pawn, the rook goes behind its passed b-pawn — Tarrasch's rule — and the queenside runner rolls while the rook stays active.",
 theme:{kind:'pieceManeuvers',move:'…Rg1-b1-b4 the rook swings behind the b-pawn, then …b5 rolls the queenside passer'},
 moves:['Rb1','Rc8+','Kg7','Rc7','Rb4','Kg3','b5','f3','Rb1','Rc8'],
 ann:["Black's rook swings behind its passed b-pawn — rooks belong behind passers.","White checks to gain a tempo.","The king steps up to shepherd the pawn.","White's rook reaches the seventh.","The rook attacks the h4-pawn and stays active behind the runner.","White's king sidesteps.","The passed b-pawn rolls, supported from behind.","White makes luft.","The rook keeps its post behind the pawn.","White's rook shuffles, powerless to stop the queenside roll."],
 cue:['…Rb1 — behind the passer','Rc8+ — White checks','…Kg7 — king up','Rc7 — seventh rank','…Rb4 — active rook','Kg3 — sidestep','…b5 — roll the passer','f3 — luft','…Rb1 — hold the post','Rc8 — White is helpless'],
 concepts:['pos-initiative','pos-space']},
{id:'mp-carlsen-kid-endgame',openingId:'pro-carlsen-kid',
 fen:'1r6/7R/8/2p2pk1/8/8/7P/6K1 w - - 0 39',
 title:'The Passed Pawn in the Rook Ending (vs Njal)',
 overview:"From a King's Indian where Carlsen reached an extra-pawn rook ending, the plan is pure technique: check to activate the rook, then march the passed c-pawn with the rook supporting from behind.",
 theme:{kind:'pawnBreaks',move:'…c5-c4 the passed c-pawn marches up the board'},
 break:{kind:'pieceManeuvers',move:'…Rb1-b3-c3 the rook supports the passer with checks'},
 moves:['Rc7','Rb1+','Kf2','Rb2+','Kf3','Rb3+','Kf2','Rc3','Kg2','c4'],
 ann:["White's rook attacks from behind.","Black checks to gain time and activate the rook.","White's king steps back.","Another check, nudging the king further.","White's king advances.","The rook keeps checking, never passive.","White retreats again.","The rook swings in front to shepherd the c-pawn.","White's king sidesteps.","The passed c-pawn advances, rolling toward promotion."],
 cue:['Rc7 — White attacks','…Rb1+ — activate with check','Kf2 — king back','…Rb2+ — nudge again','Kf3 — king up','…Rb3+ — keep checking','Kf2 — retreat','…Rc3 — shepherd the pawn','Kg2 — sidestep','…c4 — roll the passer'],
 concepts:['pos-initiative','pos-space']},
{id:'mp-carlsen-french-endgame',openingId:'pro-carlsen-french',
 fen:'r7/5k2/1p1b3p/6p1/1pPp1p2/3K1N1P/P4PP1/R7 w - - 0 29',
 title:'The Passed d-Pawn Decides (vs Nakamura)',
 overview:"From a French where Carlsen beat Nakamura, the protected passed d-pawn is the trump: the bishop and king escort it forward until it forces White to surrender the knight, and the rook swings in active.",
 theme:{kind:'pawnBreaks',move:'…d4-d3 then …d2, the passed d-pawn marches to the seventh'},
 break:{kind:'pieceManeuvers',move:'…Ra8-e8 the rook swings to the open e-file'},
 moves:['Nd2','Bc5','Nb3','Kf6','Ke4','d3','f3','d2','Nxd2','Re8'],
 ann:["White's knight tries to blockade.","Black's bishop eyes the knight and clears the pawn's path.","White's knight retreats.","The king marches up to support the passer.","White centralises.","The passed d-pawn lunges forward.","White props the centre.","The pawn reaches the seventh, forcing White to give up the knight for it.","White surrenders the knight.","The rook swings to the open e-file — activity is decisive."],
 cue:['Nd2 — White blockades','…Bc5 — clear the path','Nb3 — retreat','…Kf6 — king up','Ke4 — centralise','…d3 — the pawn lunges','f3 — prop the centre','…d2 — reach the seventh','Nxd2 — White gives the knight','…Re8 — active rook'],
 concepts:['pos-initiative','pos-space']},
];
function build(spec){const c=new Chess(spec.fen);const arrows=[],highlights=[];for(const m of spec.moves){const mv=c.move(m);if(!mv)throw new Error(spec.id+' illegal '+m+' @ '+c.fen());arrows.push([]);highlights.push([{square:mv.to,color:KEY}]);}
  if(spec.moves.length!==spec.ann.length||spec.moves.length!==spec.cue.length)throw new Error(spec.id+' len');
  const pawnBreaks=[],pieceManeuvers=[];(spec.theme.kind==='pawnBreaks'?pawnBreaks:pieceManeuvers).push({move:spec.theme.move,explanation:spec.overview,fen:''});
  if(spec.break)(spec.break.kind==='pawnBreaks'?pawnBreaks:pieceManeuvers).push({move:spec.break.move,explanation:spec.overview,fen:''});
  return {id:spec.id,openingId:spec.openingId,criticalPositionFen:spec.fen,title:spec.title,pawnBreaks,pieceManeuvers,strategicThemes:[spec.overview],endgameTransitions:[],playableLines:[{fen:spec.fen,moves:spec.moves,annotations:spec.ann,learnCues:spec.cue,arrows,highlights,title:spec.title,intro:spec.overview,sources:src(...spec.concepts)}]};}
const path='src/data/middlegame-plans.json';const plans=JSON.parse(fs.readFileSync(path,'utf8'));
const ids=new Set(EG.map(e=>e.id));let kept=plans.filter(p=>!ids.has(p.id));for(const s of EG)kept.push(build(s));
fs.writeFileSync(path,JSON.stringify(kept,null,2)+'\n');console.log('wrote '+EG.length+' endgame plans, total='+kept.length);
