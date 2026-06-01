import fs from 'node:fs';import { Chess } from 'chess.js';
const KEY='rgba(255,214,0,0.88)';const ARCH='https://api.chess.com/pub/player/magnuscarlsen/games/archives';
const src=(...c)=>['book:chess-fundamentals',...c.map(x=>`concept:${x}`),ARCH];
const EG=[
{id:'mp-procarlsen-ruy-endgame',openingId:'pro-carlsen-ruy-lopez',color:'white',
 fen:'1rb1r1k1/2p2pp1/p2p3p/3P4/2PP4/8/P2R1PPP/2R3NK b - - 0 25',
 title:'Converting the Queenside Majority (vs Aronian)',
 overview:"From a Closed Ruy where Carlsen beat Aronian, the win flows from the c4-c5 passed-pawn push — the queenside majority rolls while the knight reroutes to support it.",
 theme:{kind:'pawnBreaks',move:'c4-c5 passed-pawn push'},
 moves:['a5','h3','Rb4','Nf3','Bf5','c5'],
 ann:["Black grabs queenside space with the a-pawn.","White makes luft for the king.","Black's rook pressures the c4-pawn.","The knight reroutes toward the centre and kingside.","Black activates the bishop.","c5 rolls the passed pawn — the heart of White's winning plan in the queenside majority."],
 cue:['...a5 — queenside space','h3 — make luft','...Rb4 — pressure c4','Nf3 — reroute','...Bf5 — activate','c5 — push the passer'],
 concepts:['pos-space','pawn-minority-attack']},
{id:'mp-procarlsen-1e5-endgame',openingId:'pro-carlsen-1e5',color:'black',
 fen:'7k/6P1/4p3/r3n3/8/2P3p1/6PN/4R2K b - - 0 52',
 title:'The Active Rook in the Rook Endgame (vs Firouzja)',
 overview:"A textbook rook-endgame conversion: round up the advanced g-pawn, centralise the knight, and swing the rook behind White's lines to win the c3-pawn. Activity is everything.",
 theme:{kind:'pieceManeuvers',move:'...Ra1-c1 active rook wins c3'},
 moves:['Kxg7','Nf1','Nd3','Rxe6','Ra1','Kg1','Rc1'],
 ann:["Black rounds up the advanced g-pawn.","White's knight returns.","The knight centralises, hitting the c-pawn and shielding the king.","White grabs a pawn back.","The rook swings behind White's lines.","White's king steps up.","The rook lands on c1 behind the c3-pawn — the active rook is the whole point of the rook endgame."],
 cue:['Kxg7 — win the g-pawn','Nf1 — knight back','...Nd3 — centralise','Rxe6 — White grabs one','...Ra1 — swing behind','Kg1 — king up','...Rc1 — the active rook'],
 concepts:['pos-initiative','pos-space']},
{id:'mp-procarlsen-queenspawn-endgame',openingId:'pro-carlsen-queens-pawn',color:'white',
 fen:'1B1b2k1/3N1pp1/2b1p2p/pN1p2nn/Pp1P4/4PPP1/1P2B1K1/8 w - - 0 34',
 title:'Dominant Knights on the Outposts (vs Firouzja)',
 overview:"A minor-piece endgame won by superior knights: one leaps to the e5-outpost, the other to d6, and the f4 advance fixes the kingside while the knights dominate Black's pieces.",
 theme:{kind:'pieceManeuvers',move:'Ne5 and Nd6 dominant outposts'},
 moves:['Ne5','Be8','f4','f6','Nd6','Bxa4'],
 ann:["The knight leaps to the e5-outpost, dominating the centre.","Black retreats the bishop.","f4 gains kingside space and supports the knights.","Black challenges the centre.","The second knight jumps to the d6-outpost, a monster deep in Black's camp.","Black grabs a pawn, but the dominant knights decide the game."],
 cue:['Ne5 — the e5 outpost','...Be8 — retreat','f4 — gain space','...f6 — challenge','Nd6 — the monster outpost','...Bxa4 — too late'],
 concepts:['pos-outpost','pos-space']},
{id:'mp-procarlsen-nimzo-endgame',openingId:'pro-carlsen-nimzo',color:'black',
 fen:'6rk/1p5p/1np1Np2/p2p4/P2P2PK/4PR2/8/8 b - - 0 44',
 title:'King Activity in the Knight Endgame (vs Polish_fighter3000)',
 overview:"A knight endgame won by the active king: reroute the knight, target White's advanced knight with the rook, and march the king up the board — the active king is decisive.",
 theme:{kind:'pieceManeuvers',move:'...Kf7-g6 active king march'},
 moves:['Nd7','Kh5','Re8','Nf4','Kg7','Kh4','Kf7','Nh5','Kg6'],
 ann:["The knight reroutes to a better square.","White's king tries to advance.","The rook attacks the e6-knight.","White defends the knight.","Black's king marches up.","White's king retreats.","The king keeps advancing.","White probes with the knight.","The king reaches g6 — the active king is decisive in the knight endgame."],
 cue:['...Nd7 — reroute','Kh5 — White advances','...Re8 — hit the knight','Nf4 — defend','...Kg7 — march up','Kh4 — retreat','...Kf7 — keep coming','Nh5 — probe','...Kg6 — the active king'],
 concepts:['pos-initiative','pos-space']},
];
const plans=JSON.parse(fs.readFileSync('src/data/middlegame-plans.json','utf8'));
const byId=new Map(plans.map((p,i)=>[p.id,i]));
let added=0;
for(const P of EG){
  const c=new Chess(P.fen);const hl=[],ar=[];
  for(const m of P.moves){const mv=c.move(m);if(!mv)throw new Error(`illegal ${P.id} ${m}`);hl.push([{square:mv.to,color:KEY}]);ar.push([]);}
  if(P.ann.length!==P.moves.length||P.cue.length!==P.moves.length)throw new Error(`len ${P.id}`);
  const theme={move:P.theme.move,explanation:P.overview,fen:''};
  const plan={id:P.id,openingId:P.openingId,criticalPositionFen:P.fen,title:P.title,
    pawnBreaks:P.theme.kind==='pawnBreaks'?[theme]:[],pieceManeuvers:P.theme.kind==='pieceManeuvers'?[theme]:[],
    strategicThemes:[P.overview],endgameTransitions:[],
    playableLines:[{fen:P.fen,moves:P.moves,annotations:P.ann,learnCues:P.cue,arrows:ar,highlights:hl,title:P.title,intro:P.overview,sources:src(...P.concepts)}]};
  if(byId.has(P.id))plans[byId.get(P.id)]=plan;else{plans.push(plan);added++;}
}
fs.writeFileSync('src/data/middlegame-plans.json',JSON.stringify(plans,null,2)+'\n');
console.log('endgame plans +'+added);
