import fs from 'node:fs';
import { Chess } from 'chess.js';
const KEY='rgba(255,214,0,0.88)';
const ARCH='https://api.chess.com/pub/player/magnuscarlsen/games/archives';
const src=(...c)=>['book:chess-fundamentals',...c.map(x=>`concept:${x}`),ARCH];
// spec: id, openingId, varName(exact), fen, moves, ann, cue, theme{kind,move}, break?, concepts, title, overview
const V=[
{id:'mp-carlsen-opensic-classical',openingId:'pro-carlsen-open-sicilian',varName:'Classical Bc4',
 fen:'r1bq1rk1/pp2bppp/2nppn2/2p5/4P3/1BPP1N2/PP3PPP/RNBQ1RK1 w - - 1 8',
 title:'The d4 Central Break',
 overview:"In the Classical Bc4 Open Sicilian, Carlsen backs the e4-pawn with the rook, then strikes with the thematic d4 break — opening the centre for his better-placed pieces while the knight reroutes via d2.",
 theme:{kind:'pieceManeuvers',move:'Re1, d4 and Nbd2 — back the centre, break, reroute the knight'},
 moves:['Re1','b5','d4','Bb7','Nbd2'],
 ann:["The rook lifts to the open e-file, backing the e4-pawn before the central break.","Black expands on the queenside.","The thematic central break — d4 opens lines for White's harmoniously placed pieces.","Black develops the bishop to the long diagonal.","The knight reroutes toward f1 and g3, eyeing the kingside and the d5-square."],
 cue:['Re1 — back the centre','…b5 — Black expands','d4 — central break','…Bb7 — long diagonal','Nbd2 — reroute the knight'],
 concepts:['pos-center','pos-space']},
{id:'mp-carlsen-ruy-italian',openingId:'pro-carlsen-ruy-lopez',varName:'Italian Bc4',
 fen:'r1bqk2r/1pp2ppp/2np1n2/p1b1p3/2B1P3/2PP1N2/PP3PPP/RNBQ1RK1 w kq - 0 7',
 title:'The Giuoco Pianissimo Build',
 overview:"In the Italian, Carlsen plays the slow build: the rook to e1, the prophylactic h3 to stop the …Bg4 pin, then the classic Nbd2-f1-g3 reroute toward the kingside and d5.",
 theme:{kind:'pieceManeuvers',move:'Re1, h3 and Nbd2 — the slow Italian build and knight reroute'},
 moves:['Re1','O-O','h3','h6','Nbd2','Ba7'],
 ann:["The rook backs the e4-pawn on the open file.","Black castles to safety.","The key prophylactic move — h3 makes luft and rules out the …Bg4 pin.","Black mirrors with h6.","The knight begins the classic reroute toward f1 and g3, heading for the kingside and d5.","Black tucks the bishop back to a7, keeping the diagonal."],
 cue:['Re1 — back the centre','…O-O — castle','h3 — stop …Bg4','…h6 — mirror','Nbd2 — start the reroute','…Ba7 — keep the diagonal'],
 concepts:['pos-prophylaxis','pos-center']},
{id:'mp-carlsen-ruy-fourknights',openingId:'pro-carlsen-ruy-lopez',varName:'Four Knights Nc3',
 fen:'r1bq1rk1/p1p2ppp/5n2/3p4/1b6/2NB4/PPP2PPP/R1BQ1RK1 w - - 2 10',
 title:'Harmonious Piece Play',
 overview:"In the symmetrical Four Knights, Carlsen relies on harmonious piece play: h3 for luft, the queen to f3, the bishop to f4 offering to trade Black's good bishop, and the rooks to the centre.",
 theme:{kind:'pieceManeuvers',move:'Qf3, Bf4 and Rfe1 — harmonious development, trading into the better minor pieces'},
 moves:['h3','c6','Qf3','h6','Bf4','Bd6','Rfe1','Rb8'],
 ann:["A useful luft move, controlling g4.","Black shores up the centre.","The queen takes an active post, eyeing the kingside.","Black makes his own luft.","The bishop develops with tempo, offering to trade Black's well-placed dark bishop.","Black declines and holds the diagonal.","The last piece joins — every White unit is harmonised.","Black contests the b-file."],
 cue:['h3 — luft','…c6 — shore up','Qf3 — active queen','…h6 — luft','Bf4 — offer the trade','…Bd6 — hold','Rfe1 — finish development','…Rb8 — contest the b-file'],
 concepts:['pos-piece-activity','pos-center']},
{id:'mp-carlsen-qp-kid',openingId:'pro-carlsen-queens-pawn',varName:"vs King's Indian g6",
 fen:'rnbq1rk1/ppp2pbp/3p1np1/4p3/2PPP3/2N2N2/PP2BPPP/R1BQ1RK1 b - - 1 7',
 title:'Queenside Space and the b4 Push',
 overview:"Against the King's Indian, Carlsen grabs the centre with d5 and storms the queenside — the b4 push (the bayonet idea) attacks where White holds the space, opening the b-file for the rooks.",
 theme:{kind:'pawnBreaks',move:'d5 and b4 — White grabs queenside space and pushes the bayonet'},
 moves:['Nc6','d5','Ne7','b4','a5','bxa5'],
 ann:["Black develops the knight, pressing d4.","White seizes space and kicks the knight, planting the central wedge.","The knight reroutes toward the kingside, the King's-Indian plan.","The queenside storm begins — White attacks where he has the space.","Black strikes back at the pawn chain.","Opening the b-file for White's rooks."],
 cue:['…Nc6 — press d4','d5 — central wedge','…Ne7 — reroute','b4 — the bayonet','…a5 — strike back','bxa5 — open the b-file'],
 concepts:['pos-space','pawn-minority-attack']},
{id:'mp-carlsen-qp-catalan',openingId:'pro-carlsen-queens-pawn',varName:'Catalan g3',
 fen:'rnbq1rk1/1pp1bppp/p3pn2/8/2QP4/5NP1/PP2PPBP/RNB2RK1 b - - 0 8',
 title:'Catalan Pressure on the Long Diagonal',
 overview:"In the Open Catalan, Black holds the c-pawn with …b5; Carlsen recaptures the initiative by regrouping the queen to c2 and developing the bishop to d2, keeping the long-diagonal pressure that defines the Catalan.",
 theme:{kind:'pieceManeuvers',move:'Qc2 and Bd2 — regroup the queen, the bishop eyes the long dark diagonal'},
 moves:['b5','Qc2','Bb7','Bd2','Be4','Qc1'],
 ann:["Black grabs space and tries to keep the extra pawn.","The queen drops to c2, eyeing the long diagonal and preparing a4 to undermine b5.","Black contests the diagonal.","The bishop heads for a5 or c3, the long-diagonal partner.","Black challenges the queen.","The queen sidesteps the hit, staying flexible."],
 cue:['…b5 — hold the pawn','Qc2 — eye the diagonal','…Bb7 — contest it','Bd2 — long-diagonal plan','…Be4 — challenge','Qc1 — sidestep'],
 concepts:['pos-piece-activity','pos-initiative']},
{id:'mp-carlsen-sic-opennc6',openingId:'pro-carlsen-sicilian',varName:'Open vs ...Nc6',
 fen:'r1bqk2r/5ppp/p1np1b2/1p1Np3/4P3/N7/PPP2PPP/R2QKB1R w KQkq - 0 11',
 title:'Trading Down in the Sveshnikov',
 overview:"In this Sveshnikov-style Open Sicilian, Black eases the cramp by trading the dark-squared bishops with …Bg5, reroutes the knight via e7 toward d5, castles, and opens the b-file for queenside counterplay.",
 theme:{kind:'pieceManeuvers',move:'…Bg5 and …Ne7 — trade the dark bishops, reroute the knight to d5'},
 moves:['c3','Bg5','Nc2','Ne7','Ncb4','O-O','a4','bxa4'],
 ann:["White supports the d5-outpost.","Black offers to trade the dark-squared bishops, easing the cramped position.","White reroutes the knight.","The knight heads toward d5 or g6, challenging the outpost.","White probes the queenside.","Black tucks the king away.","White strikes at b5.","Black opens the b-file for counterplay."],
 cue:['c3 — hold d5','…Bg5 — trade bishops','Nc2 — reroute','…Ne7 — toward d5','Ncb4 — probe','…O-O — safety','a4 — strike b5','…bxa4 — open the b-file'],
 concepts:['pos-piece-activity','pos-initiative']},
{id:'mp-carlsen-1e5-antimarshall',openingId:'pro-carlsen-1e5',varName:'vs Anti-Marshall d3',
 fen:'r1bq1rk1/2p1bppp/p2p1n2/np2p3/4P3/2PP1N2/PPB2PPP/RNBQR1K1 b - - 2 10',
 title:'The …c5 Chigorin Break',
 overview:"Against the Anti-Marshall d3, Carlsen builds the classic Chigorin setup: …c5 grabs queenside space behind the closed centre, the knight comes to c6, and …Re8 backs the e5-pawn and the central tension.",
 theme:{kind:'pawnBreaks',move:'…c5 — the Chigorin queenside expansion behind the closed centre'},
 break:{kind:'pieceManeuvers',move:'…Nc6 and …Re8 — develop and back the centre'},
 moves:['c5','Nbd2','Nc6','Nf1','h6','h3','Re8'],
 ann:["Black gains queenside space — the classic Chigorin setup behind the closed centre.","White reroutes the knight toward g3.","The knight develops to its natural square, eyeing d4.","White continues the reroute.","Black makes luft and controls g5.","White mirrors.","The rook backs the e5-pawn and the central tension."],
 cue:['…c5 — Chigorin space','Nbd2 — reroute','…Nc6 — eye d4','Nf1 — reroute','…h6 — luft','h3 — mirror','…Re8 — back the centre'],
 concepts:['pos-space','pos-center']},
{id:'mp-carlsen-nimzo-catalan',openingId:'pro-carlsen-nimzo',varName:'vs Catalan g3',
 fen:'rnbq1rk1/1pp1bppp/p3pn2/8/2pP4/5NP1/PPQ1PPBP/RNB2RK1 w - - 0 8',
 title:'Holding the Pawn with …b5',
 overview:"In the Open Catalan, Black grabs queenside space with …b5 to defend the extra pawn, fianchettoes the bishop to b7 against White's centre, and develops …Bd6 to aim at the kingside — a harmonious, combative setup.",
 theme:{kind:'pieceManeuvers',move:'…Bb7 and …Bd6 — the bishops eye White’s centre and kingside'},
 break:{kind:'pawnBreaks',move:'…b5 — grab space and defend the extra c-pawn'},
 moves:['Qxc4','b5','Qc2','Bb7','Bd2','Bd6'],
 ann:["White regains the gambit pawn.","Black grabs queenside space and prepares to defend.","The queen eyes the long diagonal.","The bishop takes the long diagonal, pressuring e4 and the centre.","White develops the bishop.","The second bishop aims at White's kingside, completing a harmonious setup."],
 cue:['Qxc4 — regain the pawn','…b5 — grab space','Qc2 — eye the diagonal','…Bb7 — pressure e4','Bd2 — develop','…Bd6 — aim at the king'],
 concepts:['pos-piece-activity','pos-space']},
{id:'mp-carlsen-french-advance',openingId:'pro-carlsen-french',varName:'vs Advance e5',
 fen:'r2qkb1r/pp1b1ppp/2n1p3/3pPn2/3P4/N4N2/PP2BPPP/R1BQK2R w KQkq - 3 9',
 title:'The …f6 Break vs the Advance',
 overview:"Against the French Advance, Carlsen completes development and strikes the pawn chain at its head with …f6 — recapturing toward the centre opens the position for Black's pieces, with the rook swinging to the half-open c-file.",
 theme:{kind:'pawnBreaks',move:'…f6 — strike the e5-chain at its head'},
 break:{kind:'pieceManeuvers',move:'…Rc8 — the rook takes the half-open c-file'},
 moves:['Nc2','Be7','O-O','O-O','Bd3','f6','Bxf5','exf5','Re1','Rc8'],
 ann:["White repositions the knight.","Black develops and prepares to castle.","White castles.","Black tucks the king away.","White redeploys the bishop.","The thematic break — Black strikes the head of White's pawn chain.","White trades on f5.","Recapturing toward the centre, opening the e-file and freeing the position.","White contests the e-file.","The rook takes the half-open c-file for queenside pressure."],
 cue:['Nc2 — reposition','…Be7 — develop','O-O — castle','…O-O — safety','Bd3 — redeploy','…f6 — strike the chain','Bxf5 — trade','…exf5 — open lines','Re1 — contest the e-file','…Rc8 — the c-file'],
 concepts:['pos-center','pos-piece-activity']},
];

function build(spec){
  const c=new Chess(spec.fen);const arrows=[],highlights=[];
  for(const m of spec.moves){const mv=c.move(m);if(!mv)throw new Error(spec.id+' illegal '+m+' @ '+c.fen());arrows.push([]);highlights.push([{square:mv.to,color:KEY}]);}
  if(spec.moves.length!==spec.ann.length||spec.moves.length!==spec.cue.length)throw new Error(spec.id+' len '+spec.moves.length+'/'+spec.ann.length+'/'+spec.cue.length);
  const pawnBreaks=[],pieceManeuvers=[];
  (spec.theme.kind==='pawnBreaks'?pawnBreaks:pieceManeuvers).push({move:spec.theme.move,explanation:spec.overview,fen:''});
  if(spec.break)(spec.break.kind==='pawnBreaks'?pawnBreaks:pieceManeuvers).push({move:spec.break.move,explanation:spec.overview,fen:''});
  return {id:spec.id,openingId:spec.openingId,criticalPositionFen:spec.fen,title:spec.title,pawnBreaks,pieceManeuvers,strategicThemes:[spec.overview],endgameTransitions:[],
    playableLines:[{fen:spec.fen,moves:spec.moves,annotations:spec.ann,learnCues:spec.cue,arrows,highlights,title:spec.title,intro:spec.overview,sources:src(...spec.concepts)}]};
}
// verify varNames exist exactly in pro-repertoires.json
const pr=JSON.parse(fs.readFileSync('src/data/pro-repertoires.json','utf8'));
const opens=(pr.openings||pr);
for(const spec of V){const o=opens.find(x=>x.id===spec.openingId);const names=(o.variations||[]).map(v=>v.name);if(!names.includes(spec.varName))throw new Error('VAR NAME MISMATCH '+spec.openingId+' :: "'+spec.varName+'" not in ['+names.join(' | ')+']');}
const path='src/data/middlegame-plans.json';
const plans=JSON.parse(fs.readFileSync(path,'utf8'));
const ids=new Set(V.map(v=>v.id));
let kept=plans.filter(p=>!ids.has(p.id));
for(const spec of V)kept.push(build(spec));
fs.writeFileSync(path,JSON.stringify(kept,null,2)+'\n');
// emit resolver keys
console.log('OK wrote '+V.length+' variation plans. total='+kept.length);
const byOpen={};for(const v of V){(byOpen[v.openingId]=byOpen[v.openingId]||[]).push([v.varName.toLowerCase(),v.id]);}
console.log(JSON.stringify(byOpen,null,2));
