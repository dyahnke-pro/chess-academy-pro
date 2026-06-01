import fs from 'node:fs';
import { Chess } from 'chess.js';
const KEY='rgba(255,214,0,0.88)';
const ARCH='https://api.chess.com/pub/player/magnuscarlsen/games/archives';
const src=(...c)=>['book:chess-fundamentals',...c.map(x=>`concept:${x}`),ARCH];
const EG=[
{id:'mp-carlsen-scandinavian-endgame',openingId:'pro-carlsen-scandinavian',
 fen:'8/1p3pk1/4p3/2p5/P1P5/6P1/1r6/4R1K1 b - - 0 44',
 title:'The Active Rook in the Rook Ending (vs Firouzja)',
 overview:"From a 3…Qd6 Scandinavian where Carlsen beat Firouzja, the win is a model rook ending: the rook takes its most active square, snaps the loose queenside pawns, and shepherds the connected b- and c-pawns from behind.",
 theme:{kind:'pieceManeuvers',move:'…Rb4, …Rxa4 and …Rxc4 — the active rook rounds up the queenside'},
 moves:['Rb4','Re4','Rxa4','Kf2','b5','Kf3','Rxc4','Re5'],
 ann:["The rook swings to the fourth rank, attacking the a4- and c4-pawns at once — in a rook ending the rook belongs on its most active square, hunting targets.","White's rook tries to shelter the pawns.","Black snaps the a-pawn; the active rook collects material while staying behind the runners.","White's king hurries over.","The connected queenside pawns start to roll, supported from behind by the rook.","White centralises the king.","A second pawn falls, and Black's b- and c-pawns are a mobile, supported pair.","White attacks the c5-pawn, but the rook behind the runners keeps them safe."],
 cue:['…Rb4 — most active square','Re4 — shelter','…Rxa4 — grab the pawn','Kf2 — king hurries','…b5 — pawns roll','Kf3 — centralise','…Rxc4 — second pawn','Re5 — rook behind runners'],
 concepts:['pos-initiative','pos-space']},
{id:'mp-carlsen-caro-endgame',openingId:'pro-carlsen-caro-kann',
 fen:'3N2k1/p2R2bp/4rpp1/3p4/6p1/8/P4P1P/6K1 b - - 1 29',
 title:'Converting the Extra Pawns (vs Firouzja)',
 overview:"From an Advance Caro-Kann with …Bf5 where Carlsen beat Firouzja, the technique is pure conversion: the rook takes its most active post, then the extra kingside pawns roll forward as a phalanx with the bishop guarding their path.",
 theme:{kind:'pieceManeuvers',move:'…Re6-a6, the rook to the open a-file'},
 break:{kind:'pawnBreaks',move:'…f5 then …h5, the kingside majority advances'},
 moves:['Ra6','Rxd5','f5','Rd7','h5','Nf7','h4','Ng5','Bf6'],
 ann:["The rook swings to the open a-file and the sixth rank, the most active post — activity first, before cashing in the extra pawns.","White grabs the d-pawn back, but Black keeps the bishop and the kingside majority.","Black's extra kingside pawns begin to advance, gaining space and a future passed pawn.","White's rook stays busy on the seventh.","The pawns roll forward as a phalanx, the bishop guarding their path.","White's knight repositions to blockade.","The passed pawn advances; every tempo counts in the race.","White's knight hops to a blockading square.","The bishop covers g5 and supports the runners — Black's pieces work as a unit."],
 cue:['…Ra6 — most active rook','Rxd5 — White takes back','…f5 — majority rolls','Rd7 — seventh rank','…h5 — phalanx','Nf7 — blockade','…h4 — advance','Ng5 — blockade','…Bf6 — bishop guards'],
 concepts:['pos-space','pos-initiative']},
{id:'mp-carlsen-modern-endgame',openingId:'pro-carlsen-modern',
 fen:'2r2r2/p3ppk1/8/1p2Pp1p/3p1P1P/3P1P2/PP6/2R2RK1 b - - 0 26',
 title:'The Protected Passed Pawn (vs Erigaisi)',
 overview:"From a Modern where Carlsen beat Erigaisi, the d4-pawn is a protected passed pawn — the long-term trump. Black shores up the centre, opens a second front with the queenside majority, and keeps the rooks active around the runner.",
 theme:{kind:'pieceManeuvers',move:'…Rf8-g8, contesting the open g-file'},
 break:{kind:'pawnBreaks',move:'…a5, the queenside majority'},
 moves:['e6','Kf2','a5','Rg1+','Kh6','Ke2','Rg8','Rxc8'],
 ann:["Black shores up the centre and frees the king; the d4-pawn is a protected passed pawn, the long-term trump of the position.","White's king heads for the centre.","The queenside majority advances — a second front to stretch White's defence.","White checks along the g-file.","The king sidesteps and tucks away safely.","White centralises toward the d-pawn.","Black contests the open g-file, the rooks staying active.","White trades a pair of rooks, but the passed d-pawn and the queenside majority remain."],
 cue:['…e6 — protected passer','Kf2 — king to centre','…a5 — second front','Rg1+ — check','…Kh6 — tuck away','Ke2 — centralise','…Rg8 — contest g-file','Rxc8 — trade rooks'],
 concepts:['pos-space','pos-initiative']},
{id:'mp-carlsen-closedsic-endgame',openingId:'pro-carlsen-closed-sicilian',
 fen:'5k2/5p2/2b1p1p1/2r4p/2PR1PP1/1B5P/2P2K2/8 w - - 0 36',
 title:'King March in the Minor-Piece Ending (vs DenLaz)',
 overview:"From a Grand Prix f4 Closed Sicilian where Carlsen converted an extra pawn, the king leads: with same-coloured bishops and a clean extra pawn, White centralises the king and marches it to the queenside where the extra pawn lives.",
 theme:{kind:'pieceManeuvers',move:'Kf2-e3-d4-c3, the king marches to the queenside'},
 moves:['Ke3','hxg4','hxg4','Ke7','Rd1','g5','Kd4','Kd6','Kc3+'],
 ann:["The king steps toward the centre — in the endgame the king is a fighting piece, and the extra pawn means it should lead.","Black trades on g4.","White recaptures, keeping the healthy extra pawn and a clean structure.","Black's king tries to come across.","The rook takes the open file behind the action.","Black fixes the kingside.","The king strides into the centre, heading for the queenside.","Black's king bars the way.","The king sidesteps toward b4 and the extra queenside pawn."],
 cue:['Ke3 — king is a fighter','…hxg4 — trade','hxg4 — keep the extra pawn','…Ke7 — king across','Rd1 — open file','…g5 — fix','Kd4 — stride in','…Kd6 — bar the way','Kc3+ — toward b4'],
 concepts:['pos-space','pos-initiative']},
{id:'mp-carlsen-reti-endgame',openingId:'pro-carlsen-reti',
 fen:'3r4/1p6/4k1pp/P4p2/2R5/6PP/5PK1/8 w - - 0 40',
 title:'Rook Behind the Passed Pawn (vs Firouzja)',
 overview:"From a KIA Réti where Carlsen beat Firouzja, two endgame laws decide it: the rook goes behind the passed a-pawn, and the king marches up the board. White creates a second front on the kingside and centralises the king on e5.",
 theme:{kind:'pieceManeuvers',move:'Rc4-b4-b6 behind the a-pawn, and Kg2-f3-f4-e5 the king strides up'},
 moves:['Rb4','Rd7','Rb6+','Kf7','h4','h5','Kf3','Kg7','Kf4','Kf7','Ke5'],
 ann:["The rook drops behind the passed a-pawn — Tarrasch's rule: rooks belong behind passed pawns, pushing them and staying mobile.","Black's rook swings to the seventh for counterplay.","The rook checks and cuts the king off, clearing the path for the a-pawn.","Black's king retreats.","White opens a second front on the kingside — two weaknesses are harder to defend than one.","Black tries to fix the pawns.","The king begins its march up the board.","Black shuffles.","The king keeps advancing — activity is everything in rook endings.","Black waits.","The king reaches its dominant central post on e5, the hub for both the passed a-pawn and the kingside front."],
 cue:['Rb4 — behind the passer','…Rd7 — seventh rank','Rb6+ — cut the king','…Kf7 — retreat','h4 — second front','…h5 — fix','Kf3 — march up','…Kg7 — shuffle','Kf4 — keep coming','…Kf7 — wait','Ke5 — dominant centre'],
 concepts:['pos-initiative','pos-space']},
];

function build(spec){
  const c=new Chess(spec.fen);
  const arrows=[],highlights=[];
  for(const m of spec.moves){ const mv=c.move(m); if(!mv) throw new Error(spec.id+' illegal '+m+' at '+c.fen()); arrows.push([]); highlights.push([{square:mv.to,color:KEY}]); }
  if(spec.moves.length!==spec.ann.length||spec.moves.length!==spec.cue.length) throw new Error(spec.id+' length mismatch '+spec.moves.length+'/'+spec.ann.length+'/'+spec.cue.length);
  const pawnBreaks=[], pieceManeuvers=[];
  const themeArr = spec.theme.kind==='pawnBreaks'?pawnBreaks:pieceManeuvers;
  themeArr.push({move:spec.theme.move, explanation:spec.overview, fen:''});
  if(spec.break){ const ba = spec.break.kind==='pawnBreaks'?pawnBreaks:pieceManeuvers; ba.push({move:spec.break.move, explanation:spec.overview, fen:''}); }
  return {
    id:spec.id, openingId:spec.openingId, criticalPositionFen:spec.fen, title:spec.title,
    pawnBreaks, pieceManeuvers, strategicThemes:[spec.overview], endgameTransitions:[],
    playableLines:[{ fen:spec.fen, moves:spec.moves, annotations:spec.ann, learnCues:spec.cue,
      arrows, highlights, title:spec.title, intro:spec.overview, sources:src(...spec.concepts) }],
  };
}

const path='src/data/middlegame-plans.json';
const plans=JSON.parse(fs.readFileSync(path,'utf8'));
const ids=new Set(EG.map(e=>e.id));
let kept=plans.filter(p=>!ids.has(p.id));
const removed=plans.length-kept.length;
for(const spec of EG) kept.push(build(spec));
fs.writeFileSync(path, JSON.stringify(kept,null,2)+'\n');
console.log(`OK: removed ${removed} existing, wrote ${EG.length} endgame plans. total=${kept.length}`);
