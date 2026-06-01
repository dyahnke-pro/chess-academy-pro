import fs from 'node:fs';
import { Chess } from 'chess.js';
const KEY='rgba(255,214,0,0.88)';
const ARCH='https://api.chess.com/pub/player/magnuscarlsen/games/archives';
const src=(...c)=>['book:chess-fundamentals',...c.map(x=>`concept:${x}`),ARCH];

// each: id, openingId, color, fen, title, overview, theme{kind,move}, moves[], ann[], cue[], concepts[]
const PLANS=[
{id:'mp-procarlsen-opensicilian-storm',openingId:'pro-carlsen-open-sicilian',color:'white',
 fen:'rn1q1rk1/1p2bppp/p2pbn2/4p3/4P3/1NN1BP2/PPPQ2PP/R3KB1R w KQ - 3 10',
 title:'The English-Attack Pawn Storm',overview:"From the English Attack tabiya, White castles long and hurls the g- and h-pawns at Black's king while Black counters on the queenside — a race where White's attack is faster.",
 theme:{kind:'pawnBreaks',move:'g4-g5 kingside pawn storm'},
 moves:['O-O-O','Nbd7','g4','b5','g5','b4','Ne2'],
 ann:["White castles long, connecting the rooks and clearing the path to throw the kingside pawns forward.",
  "Black develops the knight and starts his own counterplay against the white king.",
  "g4 launches the pawn storm, gaining space and preparing to pry open lines toward Black's king.",
  "Black races on the queenside with the b-pawn.",
  "g5 kicks the f6-knight and rips open the g-file in front of Black's king.",
  "Black hits the c3-knight, trying to break White's cover first.",
  "The knight sidesteps to e2, keeping the structure intact while the storm rolls on."],
 cue:['O-O-O — castle into the attack','...Nbd7 — Black develops','g4 — the storm begins','...b5 — the counter-race','g5 — open the g-file','...b4 — hit the knight','Ne2 — sidestep, keep storming'],
 concepts:['att-kingside-storm','pos-space']},

{id:'mp-procarlsen-ruy-knighttour',openingId:'pro-carlsen-ruy-lopez',color:'white',
 fen:'r1bq1rk1/2p1bppp/p2p1n2/n3p3/Pp2P3/1B1P1N2/1PPN1PPP/R1BQR1K1 w - - 2 11',
 title:'The Spanish Knight Tour',overview:"The signature Closed-Ruy manoeuvre: the knight travels d2-f1-g3 to join a kingside build-up while White keeps the bishop pair and a space edge.",
 theme:{kind:'pieceManeuvers',move:'Nd2-f1-g3 Spanish knight tour'},
 moves:['Ba2','c5','Nf1','Nc6','Ng3','g6'],
 ann:["The bishop tucks to a2, staying on the key diagonal but safe from Black's knight.",
  "Black gains queenside space with the c-pawn.",
  "The knight begins its famous Spanish journey, heading for g3.",
  "Black reroutes the knight back toward the centre.",
  "The knight completes the manoeuvre on g3, eyeing f5 and h5 and joining the kingside build-up.",
  "Black covers the f5-square with the g-pawn."],
 cue:['Ba2 — preserve the bishop','...c5 — Black expands','Nf1 — the tour starts','...Nc6 — reroute back','Ng3 — eye f5 and h5','...g6 — cover f5'],
 concepts:['pos-space','pos-bishop-pair']},

{id:'mp-procarlsen-queenspawn-battery',openingId:'pro-carlsen-queens-pawn',color:'white',
 fen:'rnbqk2r/ppp2ppp/8/3p4/1b1PnB2/2N2N2/PP2PPPP/2RQKB1R b Kkq - 3 7',
 title:'The Bishop Battery vs the Isolated Pawn',overview:"White trades into the bishop pair, opens the b-file, and trains the light-squared bishop on the king while pressing the isolated d5-pawn.",
 theme:{kind:'pieceManeuvers',move:'Bf1-d3 battery toward the king'},
 moves:['Nxc3','bxc3','Bd6','Bxd6','Qxd6','e3','O-O','Bd3'],
 ann:["Black trades on c3, doubling White's pawns but handing over the bishop pair.",
  "White recaptures, opening the b-file and keeping a broad centre.",
  "Black offers to trade the dark-squared bishops.",
  "White takes, removing a key defender of Black's kingside.",
  "Black recaptures with the queen.",
  "e3 opens the diagonal for the light-squared bishop.",
  "Black castles to safety.",
  "The bishop reaches d3, training on the b1-h7 diagonal toward Black's king."],
 cue:['...Nxc3 — trade for structure','bxc3 — open the b-file','...Bd6 — offer the trade','Bxd6 — remove the defender','...Qxd6 — recapture','e3 — free the bishop','...O-O — Black castles','Bd3 — aim at the king'],
 concepts:['pos-bishop-pair','pawn-minority-attack']},

{id:'mp-procarlsen-sicilian-qstorm',openingId:'pro-carlsen-sicilian',color:'black',
 fen:'rnb1kb1r/1pq2p1p/p2ppp2/8/3NPP2/2N5/PPP3PP/R2QKB1R w KQkq - 0 9',
 title:'The Najdorf Queenside Avalanche',overview:"With opposite-side castling, Black throws the queenside pawns at White's king, using the open g-file and the bishop pair from the gxf6 structure.",
 theme:{kind:'pawnBreaks',move:'...b5-b4 queenside storm'},
 moves:['Qd2','Nc6','O-O-O','b5','Kb1','b4'],
 ann:["White prepares to castle long; the opposite-side battle is set.",
  "Black develops the knight and challenges the d4-knight.",
  "White castles queenside, straight into Black's coming pawn storm.",
  "The b-pawn launches the queenside avalanche toward White's king.",
  "White tucks the king to b1 for safety.",
  "The b-pawn hits the c3-knight and tears open lines to the white king."],
 cue:['Qd2 — White preps O-O-O','...Nc6 — develop, hit d4','O-O-O — opposite castling','...b5 — the storm rolls','Kb1 — tuck the king','...b4 — rip it open'],
 concepts:['att-kingside-storm','pos-bishop-pair']},

{id:'mp-procarlsen-1e5-chigorin',openingId:'pro-carlsen-1e5',color:'black',
 fen:'r1bq1rk1/4bppp/p2p1n2/npp1p3/3PP3/2P2N1P/PPB2PP1/RNBQR1K1 b - - 0 11',
 title:'The Chigorin Knight Reroute',overview:"The classic Closed-Ruy plan: open the centre, return the knight to c6 to pressure d4, then reroute it via a5 to the c4-outpost.",
 theme:{kind:'pieceManeuvers',move:'...Na5-c4 Chigorin reroute'},
 moves:['exd4','cxd4','Nc6','d5','Na5'],
 ann:["Black opens the centre with the e-pawn.",
  "White builds the broad pawn centre.",
  "The knight returns to c6 to pressure the d4-pawn.",
  "White gains space and chases the knight.",
  "The knight heads for the c4-outpost, the classic Chigorin reroute."],
 cue:['...exd4 — open the centre','cxd4 — the big centre','...Nc6 — pressure d4','d5 — gain space','...Na5 — the c4 outpost'],
 concepts:['pos-outpost','pos-center']},

{id:'mp-procarlsen-kid-f5storm',openingId:'pro-carlsen-kid',color:'black',
 fen:'r1bq1rk1/ppp1npbp/3p1np1/3Pp3/2P1P3/2N5/PP2BPPP/R1BQNRK1 b - - 2 9',
 title:'The Mar del Plata Kingside Storm',overview:"In the locked centre, Black reroutes the knight, plays the ...f5 break, and rolls ...f4 and the kingside pawns at White's king.",
 theme:{kind:'pawnBreaks',move:'...f5-f4 kingside storm'},
 moves:['Nd7','Nd3','f5','f3','f4'],
 ann:["Black reroutes the knight to d7, clearing the f-pawn's path.",
  "White's knight heads for the queenside action.",
  "The f-pawn launches the King's Indian kingside storm.",
  "White braces the centre.",
  "The f-pawn clamps the kingside and opens the attack toward White's king."],
 cue:['...Nd7 — clear the f-pawn','Nd3 — to the queenside','...f5 — the storm begins','f3 — brace the centre','...f4 — clamp and attack'],
 concepts:['att-kingside-storm','pos-space']},

{id:'mp-procarlsen-nimzo-qside',openingId:'pro-carlsen-nimzo',color:'black',
 fen:'rnbq1rk1/pp3ppp/4pn2/2bp4/2P2B2/2N1PN2/PP3PPP/R2QKB1R w KQ - 0 8',
 title:'Queenside Expansion with ...b5',overview:"From the equal QGD structure, Black develops, expands on the queenside with ...a6 and ...b5, and frees his game with active piece play.",
 theme:{kind:'pawnBreaks',move:'...b5 queenside expansion'},
 moves:['Be2','Nc6','O-O','a6','a3','b5'],
 ann:["White develops the bishop and prepares to castle.",
  "Black develops the knight, eyeing the centre.",
  "White castles.",
  "Black prepares queenside expansion with the a-pawn.",
  "White restrains the queenside.",
  "The b-pawn grabs queenside space and frees Black's game."],
 cue:['Be2 — White develops','...Nc6 — develop','O-O — White castles','...a6 — prep ...b5','a3 — restrain','...b5 — grab space'],
 concepts:['pos-space','pos-development']},

{id:'mp-procarlsen-french-qbreak',openingId:'pro-carlsen-french',color:'black',
 fen:'r1bqkb1r/3n1ppp/p1n1p3/1pppP3/3P1P2/2N1BN2/PPPQ2PP/R3KB1R w KQkq - 0 9',
 title:'The Queenside Break with ...c4 and ...b4',overview:"The French counter-attacking plan: clamp the queenside with ...c4, then break with ...b4 against White's king's defenders while White is busy on the kingside.",
 theme:{kind:'pawnBreaks',move:'...b4 queenside break with ...c4'},
 moves:['a3','c4','Be2','Na5','O-O','b4'],
 ann:["White guards against the b4 break for now.",
  "Black clamps the queenside and fixes White's pawns with the c-pawn.",
  "White develops the bishop.",
  "The knight heads for the b3 and c4 squares.",
  "White castles.",
  "The b-pawn breaks open the queenside against the white king's defenders."],
 cue:['a3 — guard against ...b4','...c4 — clamp the queenside','Be2 — White develops','...Na5 — to b3 and c4','O-O — White castles','...b4 — break it open'],
 concepts:['pawn-chain','pos-initiative']},
];

const plans=JSON.parse(fs.readFileSync('src/data/middlegame-plans.json','utf8'));
const byId=new Map(plans.map((p,i)=>[p.id,i]));
let added=0,updated=0;
for(const P of PLANS){
  // build per-move highlights (dest square) by replaying
  const c=new Chess(P.fen); const hl=[]; const ar=[];
  for(const m of P.moves){ const mv=c.move(m); if(!mv){throw new Error(`illegal ${P.id} ${m}`);} hl.push([{square:mv.to,color:KEY}]); ar.push([]); }
  if(P.ann.length!==P.moves.length||P.cue.length!==P.moves.length) throw new Error(`len mismatch ${P.id}`);
  const theme={move:P.theme.move,explanation:P.overview,fen:''};
  const plan={
    id:P.id,openingId:P.openingId,criticalPositionFen:P.fen,title:P.title,
    pawnBreaks:P.theme.kind==='pawnBreaks'?[theme]:[],
    pieceManeuvers:P.theme.kind==='pieceManeuvers'?[theme]:[],
    strategicThemes:[P.overview],endgameTransitions:[],
    playableLines:[{fen:P.fen,moves:P.moves,annotations:P.ann,learnCues:P.cue,arrows:ar,highlights:hl,title:P.title,intro:P.overview,sources:src(...P.concepts)}],
  };
  if(byId.has(P.id)){plans[byId.get(P.id)]=plan;updated++;}else{plans.push(plan);added++;}
}
fs.writeFileSync('src/data/middlegame-plans.json',JSON.stringify(plans,null,2)+'\n');
console.log(`plans +${added} ${updated} updated; total ${plans.length}`);
