#!/usr/bin/env node
// GothamChess Caro Advance (White) model games — real WHITE WINS vs strong
// opponents (incl. Vidit). chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-caro-advance-white';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-caroadv-vidit-bf5',
    white: 'GothamChess', black: 'ViditYT', whiteElo: 2700, blackElo: 3026,
    sourceUrl: 'https://www.chess.com/game/live/5739205530',
    pgn: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Bxd3 Qxd3 Qa6 e6 Qxd3 exf7+ Kxf7 cxd3 Nh6 Nc3 Nd7 Nf3 Nf5 O-O-O g6 Ne2 Bg7 Rde1 Rae8 Rh3 Rhf8 Bd2 Kg8 Bc3 Kh7 Ng5+ Kg8 Ne6 Rf6 Ng5 Nf8 Nf4 e6 g3 Nd6 Rhh1 Nf7 Nf3 Bh6 Bd2 Kg7 Re2 Nd6 Rhe1 Kf7 Ng5+ Bxg5 hxg5 Rf5 Re5 Nb5 Bc3 Rxe5 Rxe5 Nc7 Re1 Nb5 Rh1 Nd6 g4 hxg4 Rh4 Nf5 Rxg4 Nh7 Rg1 Nf8 Rh1 b6 Ne2 c5 Bd2 cxd4 Kd1 Rc8 f4 e5 fxe5 Kg8 e6 Nxe6 Nf4 Rd8 Nxe6 Re8 Nf4 Ne3+ Bxe3 dxe3 Nxg6 Rf8 Rh8+ Kg7 Rxf8 Kxg6 Re8 Kxg5 Rxe3 Kf4 Re8 d4 Re1 Kf3 Kd2',
    overview:
      "The Advance Caro against GM Vidit (ViditYT, 3026). Levy plays the h4-Bg5 main line, sacrifices the e-pawn with e6 to disrupt the king, then grinds a long endgame where the better structure and active pieces wear down a 3000-rated grandmaster. The model for the aggressive Advance against …Bf5.",
    middlegameTheme: 'The h4-Bg5 main line: e6 disruption, grind the endgame.',
    lessonSummary: 'Play h4-Bg5, disrupt with e6, and convert the better structure.',
  },
  {
    id: 'mg-pro-gothamchess-caroadv-julio-qxd4',
    white: 'GothamChess', black: 'Juliodiaz_2002', whiteElo: 2700, blackElo: 2901,
    sourceUrl: 'https://www.chess.com/game/live/168620169188',
    pgn: 'e4 c6 d4 d5 e5 Bf5 h4 h5 Bg5 Qb6 Bd3 Qxd4 Nf3 Qg4 Bxf5 Qxf5 O-O Qd7 e6 Qxe6 Re1 Qd7 Ne5 Qd8 Qd3 Nd7 Ng6 Nc5 Qe3 fxg6 Qxc5 Nf6 Nc3 Kf7 Qe3 Qd7 Rad1 e6 Qf3 Bb4 Ne4 Bxe1 Nxf6 Bxf2+ Qxf2 gxf6 Qxf6+ Ke8 Qxh8+',
    overview:
      "Punishing the …Qxd4 pawn-grab against Juliodiaz_2002 (2901). When Black greedily takes the d4-pawn, Levy develops with tempo (Nf3, Bxf5), sacrifices with e6 and Ng6 to expose the king, and finishes with a crushing attack ending Qxf6+ and Qxh8+. The model for refuting the greedy queen sortie.",
    middlegameTheme: 'Punishing …Qxd4: Nf3/Bxf5 with tempo, then e6/Ng6 attack.',
    lessonSummary: 'Against …Qxd4, develop with tempo and sacrifice to expose the king.',
  },
  {
    id: 'mg-pro-gothamchess-caroadv-norwegian-c5',
    white: 'GothamChess', black: 'youngnorwegianguy', whiteElo: 2700, blackElo: 2913,
    sourceUrl: 'https://www.chess.com/game/live/68175165359',
    pgn: 'e4 c6 d4 d5 e5 c5 dxc5 Nc6 f4 e6 Be3 d4 Bf2 Bxc5 Nd2 Be7 Ngf3 Nh6 a3 Ng4 Qe2 Nxf2 Qxf2 O-O Bd3 Qc7 Ne4 f6 exf6 Bxf6 Qg3 Be7 Ne5 Nxe5 fxe5 Qa5+ Ke2 Qb6 Raf1 Bd7 Nf6+ Bxf6 exf6 Rf7 Qh4 g6 Qh6 Qc6 Rf2 e5 Bxg6 hxg6 Qxg6+ Kh8 Kd2 Rh7 Rhf1 Be8 Qg5 Qd7 Qxe5 Bf7 Kc1 Rd8 Qc5 Qd6 Qxa7 Qd5 Qb6 d3 Rd2 Qd6 Qxd6 Rxd6 h3 Bg6 cxd3 Rf7 Rf3 Bh5 Rf5 Bg6 Rf4 Rdxf6 Rxf6 Rxf6 g4 Rf1+ Kc2 Rf7 Kc3 Rc7+ Kd4 Rd7+ Ke3 Re7+ Kf4 Rf7+ Kg5 Bh7 h4 Rg7+ Kf4 Rf7+ Kg3 Re7 Rf2 Re3+ Rf3 Rxf3+ Kxf3 Bxd3 Kf4 Bc2 Ke5 Bb3 Kd4 Bf7 g5 Bg6 Kc3 Bf7 Kd4 Bh5 Ke5 Kg7 b4 Kg6 a4 Bg4 b5 Bd7 a5 Bc8 b6 Kh5 Kd6 Kxh4 Kc7 Kxg5 Kxc8',
    overview:
      "Against the …c5 break and youngnorwegianguy (2913), Levy grabs the pawn with dxc5, plays the f4 attacking setup, and launches a kingside assault with Qg3-h4-h6 and the Bxg6 sacrifice. A 141-move battle where the f6-wedge and active pieces decide, converting a complex king-and-pawn ending. The model for the …c5 line.",
    middlegameTheme: 'The …c5 line: dxc5, f4 setup, Bxg6 kingside attack.',
    lessonSummary: 'Grab the pawn with dxc5, set up f4, and attack with Bxg6.',
  },
  {
    id: 'mg-pro-gothamchess-caroadv-jelena-h6',
    white: 'GothamChess', black: 'JelenaKarleusa-SO-18', whiteElo: 2700, blackElo: 2735,
    sourceUrl: 'https://www.chess.com/game/live/4525590521',
    pgn: 'e4 c6 d4 d5 e5 Bf5 h4 h6 g4 Bd7 c4 dxc4 Bxc4 e6 Nc3 c5 d5 exd5 Qxd5 Qe7 Qxb7 Bc6 Qc8+ Qd8 Bxf7+ Ke7 Qe6#',
    overview:
      "A 27-move miniature in the …h6 line against JelenaKarleusa-SO-18 (2735). Levy grabs space with g4, breaks with c4 and d5, then unleashes a devastating attack: Qxb7, Bxf7+, and Qe6# — a picture-perfect mate. The model for punishing the …h6 sideline with the g4-c4-d5 space-grab.",
    middlegameTheme: 'The …h6 line: g4 space, c4-d5 break, mating attack.',
    lessonSummary: 'Against …h6, grab space with g4, break c4-d5, and mate.',
  },
];

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const existing = new Set(data.map((g) => g.id));
let failed = 0;
const added = [];

for (const g of GAMES) {
  const c = new Chess();
  let ok = true;
  for (const san of g.pgn.split(/\s+/)) {
    try { c.move(san); } catch { console.error(`ILLEGAL ${g.id}: ${san}`); ok = false; break; }
  }
  if (!ok) { failed++; continue; }
  if (g.overview.length < 40) { console.error(`OVERVIEW short ${g.id}`); failed++; continue; }
  if (existing.has(g.id)) { console.log(`skip existing ${g.id}`); continue; }

  added.push({
    id: g.id, openingId: OPENING_ID,
    white: g.white, black: g.black, whiteElo: g.whiteElo, blackElo: g.blackElo,
    result: '1-0', year: 2023, event: 'chess.com',
    pgn: g.pgn, sourceUrl: g.sourceUrl, overview: g.overview,
    criticalMoments: [],
    middlegameTheme: g.middlegameTheme, lessonSummary: g.lessonSummary,
    studentSide: 'white',
  });
}

if (failed > 0) { console.error(`\n${failed} game(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added.length} Caro-Advance model games. total now ${data.length}.`);
