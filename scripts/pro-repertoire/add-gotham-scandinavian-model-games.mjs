#!/usr/bin/env node
// GothamChess Scandinavian model games — his real BLACK WINS (studentSide=black,
// result 0-1) vs strong opponents. chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';
const PATH='src/data/model-games.json';
const OPENING_ID='pro-gothamchess-scandinavian';
const GAMES=[
  {
    id: "mg-pro-gothamchess-scand-jefferyx-qa5", white: "jefferyx", whiteElo: 3158, black: "GothamChess", blackElo: 2700,
    sourceUrl: "https://www.chess.com/game/live/158003852091",
    pgn: "e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Bd2 Bg4 f3 Bd7 Bc4 Qb6 Nge2 e6 O-O a6 Kh1 Be7 Be3 Qa5 a3 O-O b4 Qb6 Qd2 Qc6 Bb3 Nd5 Nxd5 exd5 Nf4 Be6 Rac1 b5 Rfe1 Nd7 c3 Nb6 Nxe6 Qxe6 Bg5 Bxg5 Qxg5 Qd6 Qe7 Rad8 Kg1 g6 Re5 Rd7 Qxd6 Rxd6 Rce1 Kg7 R1e3 Rfd8 h4 h6 g4 Nc4 Bxc4 dxc4 Kf2 R8d7 Kg3 Rd8 g5 hxg5 hxg5 Rd5 Rxd5 Rxd5 Re5 Rd8 Rc5 Re8 Kf2 Rh8 Kg3 Rh1 Rxc7 Ra1 d5 Rxa3 d6 Rxc3 d7 Rd3 Kf4 c3 Ke4 Rd1 Rxc3 Rxd7 Ra3 Rd6 Ke5 Rc6 Kd5 Rc4 Rxa6 Rxb4 Rf6 Rb1 Kc5 b4 Kc4 b3 Kc3 b2 Kc2 Rg1 Kxb2 Rxg5 Rf4 Rc5 Kb3 f5 Kb4 Rc8 Rd4 Kh6 f4 Kh5 Rd1 Rc6 Rg1 Re6 Kc3 Re3+ Kd2 Rf3 Rh1+ Kg4 Rg1+ Rg3 Rf1 Rg2+ Ke3 Rg3+ Ke2 Rg2+ Ke3 Kg3 Rf3+ Kh4 Rf1 Rg3+ Kf2 Rh3 Ke2 Kh5 Rg1 Kh6 Kf2 Kg7 Kg2 Ra3 Kf2 Kf6 Re1 Ra2+ Kf3 Ra4 Kf2 Ra3 Rc1 Ra2+ Kf3 Ra6 Kf2 Rd6 Kf3 Rd3+ Kf2 Rd4 Ke3 Re4+",
    overview: "The main Qa5 Scandinavian against the 3158-rated jefferyx. Levy plays the rock-solid …Bg4/…e6 setup, neutralizes White’s initiative, and grinds a 180-move rook endgame to victory against an elite opponent. The model for the patient, structurally-sound Qa5 main line.",
    middlegameTheme: "The Qa5 main line: solid setup, neutralize, grind the endgame.", lessonSummary: "Play the solid …Bg4/…e6 setup and grind the rook ending.",
  },
  {
    id: "mg-pro-gothamchess-scand-yeahboi-nf6bg4", white: "yeahboiyyyy", whiteElo: 2974, black: "GothamChess", blackElo: 2700,
    sourceUrl: "https://www.chess.com/game/live/168527899368",
    pgn: "e4 d5 exd5 Nf6 d4 Bg4 Nf3 Qxd5 Nc3 Qh5 Be2 e6 h3 Bd6 Be3 Nc6 Qd2 O-O-O O-O-O Bxf3 Bxf3 Qg6 Bxc6 bxc6 Qe2 Kd7 Qf3 Nd5 Ne4 Rb8 Nc5+ Ke7 h4 h6 h5 Qf5 Qe2 Bxc5 dxc5 Rhd8 c4 Nb4 Rxd8 Nxa2+ Kd2 Rxd8+ Bd4 Rxd4+ Ke3",
    overview: "The modern 2…Nf6 Scandinavian against yeahboiyyyy (2974). Levy develops …Bg4 and …Qh5, castles queenside, and launches a kingside attack, winning material with a series of tactics ending …Rxd4+. The model for the aggressive modern Scandinavian with opposite-side castling.",
    middlegameTheme: "The modern …Nf6: …Bg4/…Qh5, O-O-O, kingside attack.", lessonSummary: "Develop …Bg4/…Qh5, castle queenside, and attack the king.",
  },
  {
    id: "mg-pro-gothamchess-scand-barcenilla-nf6nc3", white: "GM_Barcenilla", whiteElo: 2863, black: "GothamChess", blackElo: 2700,
    sourceUrl: "https://www.chess.com/game/live/68089949687",
    pgn: "e4 d5 exd5 Nf6 Nc3 Bg4 Nf3 Bxf3 Be2 Bxe2 Qxe2 c6 O-O cxd5 d4 e6 Bf4 Be7 Rad1 O-O Rfe1 Bd6 Bg5 Nbd7 h3 h6 Bc1 a6 g4 Rc8 g5 Nh7 gxh6 gxh6 Bxh6 Kh8 Bxf8 Qxf8 Kh1 Qh6 Qf3 Ng5 Qe3 Rg8 Rg1 Nf6 Ne2 Qh5 Rg2 Nxh3 Rxg8+ Nxg8 Kg2 Qg4+ Kf1 Nf6 Ke1 Ne4 f3 Bg3+ Kf1 Bf4 Nxf4 Ng3+ Ke1 Qxf4 Qxf4 Nxf4 Kd2 Nf5 c3 Kg7 Rg1+ Kf6 Kc2 Ng6 Rh1 Ke7 Rh8 Nxh8 b4 f6 a4 e5 b5 exd4 a5 axb5 cxd4 Nxd4+ Kc3 Nc6 a6 bxa6",
    overview: "Against GM Rogelio Barcenilla (2863) in the Nc3 line. Levy trades pieces with …Bg4xf3, reaches a solid structure, then outplays the grandmaster in complications, winning material and converting with the extra piece. A statement win over a GM with the solid Scandinavian.",
    middlegameTheme: "The Nc3 line: …Bxf3 trade, solid structure, outplay in complications.", lessonSummary: "Trade with …Bxf3, stay solid, and outplay in the middlegame.",
  },
  {
    id: "mg-pro-gothamchess-scand-dogsofwar-bb5", white: "dogsofwar", whiteElo: 3036, black: "GothamChess", blackElo: 2700,
    sourceUrl: "https://www.chess.com/game/live/62096944447",
    pgn: "e4 d5 exd5 Nf6 Bb5+ Nbd7 c4 a6 Ba4 b5 cxb5 Nxd5 d4 N7b6 bxa6+ Nxa4 Qxa4+ Bd7 Qc4 e6 Ne2 Nb6 Qc2 Rxa6 O-O Bd6 Bf4 O-O Nbc3 Qa8 b3 Bc6 f3 Rd8 Rfd1 Qa7 a4 Nd5 Bxd6 Ne3 Qc1 Nxd1 Bc5 Nxc3 Nxc3 Qb8 b4 Ra8 b5 Bd5 a5 Bc4 Qb2 Qb7 Qb4 Bd3 a6 Qc8 Rd1 Bg6 Ra1 Bd3 Rd1 Bg6 Qa5 Qd7 a7 Qc8 h4 Qb7 Kf2 h6 Ra1 e5 d5 e4 fxe4 Qc8 Re1 Qg4 Kg1 Qg3 Bf2 Qd3 Rd1 Qc2 Re1 Bh5 Qxc7 Rdc8 Qb7 Qxc3 b6 Qc2 Qxa8 Rxa8 b7 Rf8 b8=Q Qa2 Qb7 Bg4 Bd4 Qd2 Bf2 Qf4 Qb6 Bf3 Qe3 Qg4 Qxf3 Qc8 Qg3 Qa8 Qh3 f5 Qf3 Rf7 e5 Qf8 e6 Rf6 e7 Rf7 d6 Qe8 Qd5 Qd7 Qe6 Qxe6 d7 Kh7 Rxe6 Rf6",
    overview: "Against the Bb5+ line and the 3036-rated dogsofwar. Levy expands with …a6/…b5, grabs the bishop pair, and navigates a wild tactical battle with queens and passed pawns to victory. The model for meeting the Bb5+ check with dynamic queenside play.",
    middlegameTheme: "The Bb5+ line: …a6/…b5 expansion, bishop pair, dynamic play.", lessonSummary: "Block with …Nbd7, expand …a6/…b5, and play dynamically.",
  },
];
const data=JSON.parse(fs.readFileSync(PATH,'utf8'));
const existing=new Set(data.map(g=>g.id));
let failed=0;const added=[];
for(const g of GAMES){
  const c=new Chess();let ok=true;
  for(const san of g.pgn.split(/\s+/)){try{c.move(san);}catch{console.error('ILLEGAL '+g.id+': '+san);ok=false;break;}}
  if(!ok){failed++;continue;}
  if(g.overview.length<40){console.error('OVERVIEW short '+g.id);failed++;continue;}
  if(existing.has(g.id))continue;
  added.push({id:g.id,openingId:OPENING_ID,white:g.white,black:g.black,whiteElo:g.whiteElo,blackElo:g.blackElo,result:'0-1',year:2023,event:'chess.com',pgn:g.pgn,sourceUrl:g.sourceUrl,overview:g.overview,criticalMoments:[],middlegameTheme:g.middlegameTheme,lessonSummary:g.lessonSummary,studentSide:'black'});
}
if(failed>0){console.error('\n'+failed+' failed — NOT writing.');process.exit(1);}
data.push(...added);
fs.writeFileSync(PATH,JSON.stringify(data,null,2)+'\n');
console.log('added '+added.length+' Scandinavian model games. total now '+data.length+'.');
