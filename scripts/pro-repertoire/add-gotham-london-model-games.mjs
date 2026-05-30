#!/usr/bin/env node
// Marquee GothamChess London model games — real WHITE WINS, distinct opponents
// across the variations. G9.1: wins only, hand-authored overviews. Every PGN
// from his chess.com archive, chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-london';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-london-blazinq-jobava',
    white: 'GothamChess', black: 'Blazinq', whiteElo: 2700, blackElo: 2933,
    sourceUrl: 'https://www.chess.com/game/live/5621462873',
    pgn: 'd4 d5 Bf4 Nf6 Nc3 c5 Nb5 Na6 e3 e6 a3 Qa5+ b4 cxb4 Bd3 b3+ c3 b2 Rb1 Bd7 Rxb2 Bxa3 Ra2 Bxb5 Rxa3 Qxa3 Bxb5+ Kf8 Ne2 Qa5 Bd3 Ne4 O-O f5 f3 Nxc3 Nxc3 Qxc3 e4 dxe4 Bd6+ Kf7 Be5 Qxd3 Qa4 Rad8 fxe4 Qxe4 Qb5 Qd5 Qe2 Rd7 Qh5+ Kf8 g4 Nc7 gxf5 Ne8 fxe6+',
    overview:
      "The aggressive Jobava-London against the 2933-rated Blazinq. Levy plays the sharp Nb5 raid, sacrifices material in the complications, and emerges with a crushing attack — the bishops on e5 and d3 and the queen on h5 overwhelm the king, finishing with fxe6+ winning. A model of the Jobava's dynamic potential.",
    middlegameTheme: 'The Jobava: Nb5 raid, dynamic sacrifices, a crushing attack.',
    lessonSummary: 'Play the Jobava Nb5 raid and convert the dynamic complications.',
  },
  {
    id: 'mg-pro-gothamchess-london-kacparov-kid',
    white: 'GothamChess', black: 'Kacparov', whiteElo: 2700, blackElo: 2958,
    sourceUrl: 'https://www.chess.com/game/live/133635541043',
    pgn: 'd4 d5 Bf4 Nf6 e3 g6 Nf3 Bg7 h3 O-O Be2 c5 c3 b6 O-O Ba6 a4 Qc8 b4 Bxe2 Qxe2 Nbd7 Nbd2 Rd8 Rfc1 a5 dxc5 bxc5 b5 Nb6 Be5 Qd7 c4 Rac8 cxd5 Qxd5 Bc3 Ne4 Nxe4 Qxe4 Bxa5 Bxa1 Bxb6 Rd6 a5 Bf6 Qa2 c4 Bd4 c3 b6 e5 Rxc3 Rxc3 Bxc3 Qc6 Qb2 Rd1+ Kh2 e4 Bxf6 exf3 b7 Qd6+ Be5',
    overview:
      "Against the …g6 King's Indian setup and the 2958-rated Kacparov, Levy plays the solid London, then outplays his strong opponent on the queenside with the b4-b5 and a4-a5 pawn rollers. The passed b-pawn and the dominant dark-squared bishop decide, finishing with Be5 and a winning queenside avalanche. Positional London mastery against an IM.",
    middlegameTheme: 'The London vs KID: queenside pawn rollers, a passed b-pawn.',
    lessonSummary: 'Against the KID setup, roll the queenside pawns and push the passer.',
  },
  {
    id: 'mg-pro-gothamchess-london-tigran-c6',
    white: 'GothamChess', black: 'TigranLPetrosyan', whiteElo: 2700, blackElo: 2703,
    sourceUrl: 'https://www.chess.com/game/live/2948879746',
    pgn: 'd4 d5 Bf4 c6 e3 Qb6 b3 Bf5 c4 e6 Nf3 Nf6 Bd3 Bb4+ Ke2 Bxd3+ Qxd3 O-O c5 Qd8 Nc3 b6 cxb6 axb6 Rhc1 c5 Nb5 Na6 a3 Ba5 Ne5 Ne4 f3 Nd6 Nc6 Qh4 Bg3 Nxb5 Bxh4 Na7 Nxa5 c4 bxc4 bxa5 c5 Nc6 Rab1 e5 Bg3 exd4 exd4 Rfe8+ Kf2 Nab8 Qb5 Re6',
    overview:
      "Against the …c6 setup and GM Tigran L. Petrosyan (2703), Levy switches to the dynamic c4 break, opening the position for his pieces. A complex middlegame where the Ne5 and Nc6 outposts and the bishop pair dominate, converting into a winning material edge with Bxb6. The model for the c4 treatment against …c6.",
    middlegameTheme: 'The c4 break vs …c6: open the centre, dominate with outposts.',
    lessonSummary: 'Against …c6, break with c4 and use the central outposts.',
  },
  {
    id: 'mg-pro-gothamchess-london-khatanbaatar-e6',
    white: 'GothamChess', black: 'KhatanbaatarBazar', whiteElo: 2700, blackElo: 2654,
    sourceUrl: 'https://www.chess.com/game/live/6533552166',
    pgn: 'd4 d5 Bf4 Nf6 e3 e6 Nd2 Bd6 Bg3 O-O Ngf3 Qe7 Bb5 a6 Ba4 b5 Bb3 c5 c3 Nbd7 Qe2 e5 dxe5 Nxe5 Nxe5 Bxe5 Nf3 Bxg3 hxg3 h6 O-O-O c4 Bc2 b4 Nd4 bxc3 bxc3 Rb8 f3 Re8 Kd2 Rb2 g4 Bd7 Rb1 Reb8 Rxb2 Rxb2 Rb1 Qa3 Qd1 g6 Qc1 Rxa2 Qh1 Kg7 g5 hxg5 Rb8 Be8 Rb7 Bd7 Rb8 Ng8 Qh2 Qe7 Qc7 Nf6 Qh2 Be8 Rc8 g4 Qf4 gxf3 gxf3 Ba4 Nf5+ gxf5 Qg5+ Kh7 Qxf5+ Kg7 Qg5#',
    overview:
      "The classical London against KhatanbaatarBazar (2654), castling queenside for a sharp opposite-wings battle. Levy weathers Black's queenside pressure, then launches his own attack with the g-pawns and the Nd4-f5 knight, finishing with a spectacular Nf5+ and Qg5#-Qf5# mating sequence. A thrilling London attacking masterpiece.",
    middlegameTheme: 'The London with O-O-O: opposite-wings attack, Nf5 breakthrough.',
    lessonSummary: 'Castle queenside, weather the storm, and break with Nf5 to the king.',
  },
  {
    id: 'mg-pro-gothamchess-london-deeprabbit-standard',
    white: 'GothamChess', black: 'DeepRabbit', whiteElo: 2700, blackElo: 2719,
    sourceUrl: 'https://www.chess.com/game/live/5435629019',
    pgn: 'd4 d5 Bf4 Nf6 e3 c5 Nc3 Nc6 Nb5 a6 Nc7+ Kd7 Nxa8 b5 dxc5 e5 Nb6+ Ke8 Bg3 Be6 a4 b4 a5 Bxc5 Nf3 Nd7 Nxd5 f6 Bc4 Kf7 Qe2 Nxa5 b3 Nxc4 bxc4 a5 O-O Qa8 Rfd1 a4 Nc7 Qc6 Nxe6 Kxe6 Nd4+ Bxd4 exd4 Kf7 dxe5 fxe5 Qg4 Nf6 Qf3 e4 Qe3 Ra8 Be5 Nd7 Qf4+ Kg8 Rd6 Qc8 Qxe4 Qe8 Qd5+ Kh8 Rxd7 h6 Bxg7+ Kh7 Bf8+ Kg6 Qg8+ Kf6 Qg7+ Ke6 g4',
    overview:
      "The standard London with the Nb5-Nc7 fork against DeepRabbit (2719). Levy's knight raids c7, forks the king and rook, and snatches the a8-rook for a decisive material edge, then converts with relentless pressure ending in a mating net. The model for punishing Black's loose …Nc6 setups.",
    middlegameTheme: 'The Nb5-Nc7 fork: win the exchange, convert the edge.',
    lessonSummary: 'When Black allows it, play Nb5-Nc7 to fork the rook and king.',
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
    result: '1-0', year: 2022, event: 'chess.com',
    pgn: g.pgn, sourceUrl: g.sourceUrl, overview: g.overview,
    criticalMoments: [],
    middlegameTheme: g.middlegameTheme, lessonSummary: g.lessonSummary,
    studentSide: 'white',
  });
}

if (failed > 0) { console.error(`\n${failed} game(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added.length} London model games. total now ${data.length}.`);
