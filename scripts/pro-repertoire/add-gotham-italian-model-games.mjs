#!/usr/bin/env node
// Marquee GothamChess Italian model games — his real WHITE WINS, distinct
// opponents across the main lines. G9.1: student-side WINS only, hand-authored
// overviews. Every PGN from his chess.com archive, chess.js-validated here.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-italian';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-italian-petriashvili-giuoco',
    white: 'GothamChess', black: 'Petriashvili02', whiteElo: 2700, blackElo: 2767,
    sourceUrl: 'https://www.chess.com/game/live/10373188699',
    pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d4 Bxd4 Nxd4 Nxd4 Bg5 h6 Bh4 g5 f4 d6 fxg5 Bg4 Bxf7+ Kf8 Qd2 Ne2+ Kh1 Nf4 g6 Kg7 Rxf4 exf4 Qxf4 Bh5 Qf5 Rf8 Nc3 Rxf7 gxf7 Bg6 Qf3 Bh5 Bxf6+',
    overview:
      "The Giuoco Piano against Petriashvili02 (2767). When Black weakens the kingside with …g5, Levy strikes with the Bxf7+ sacrifice, ripping open the king. The f-pawn and the heavy pieces pour in, and the attack ends with Bxf6+ winning decisive material. A sharp demonstration of the Italian's attacking potential.",
    middlegameTheme: 'The Giuoco: Bg5 pin, f4 storm, Bxf7+ sacrifice.',
    lessonSummary: 'Pin with Bg5, storm with f4, and sacrifice on f7 when the king weakens.',
  },
  {
    id: 'mg-pro-gothamchess-italian-khatanbaatar-fpush',
    white: 'GothamChess', black: 'KhatanbaatarBazar', whiteElo: 2700, blackElo: 2717,
    sourceUrl: 'https://www.chess.com/game/live/10474026255',
    pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5 O-O Nf6 d4 Bxd4 Nxd4 Nxd4 Bg5 d6 f4 Qe7 f5 h6 Bh4 Bd7 c3 Nc6 b4 a5 b5 Nb8 a4 Bc8 Na3 Nbd7 Nc2 g5 fxg6 fxg6 Ne3 g5 Nf5 Qh7 Bg3 Nxe4 b6 Nxb6 Bb5+ Bd7 Qh5+ Kd8 Ne3 c6 Rf7 Qg8 Bd3 Nxg3 hxg3 Be8 Raf1 Rc8 Rf8 Kc7 Qh3 Qg7 R8f6 Bd7 Rf7 Qg8 Qh5 Kb8 Nf5 Be8 Ne7 Bxf7 Rxf7 Qe8 Qg6 Rd8 Qf6 Rf8 Bg6 Rxf7 Bxf7 Qd7 Be6 Qc7 Nf5 d5 Nxh6 e4 Nf7 Rf8 Qg7 Qe7 Qe5+ Ka7 Nxg5 Qc5+ Qd4 Qxd4+ cxd4 Nc4 Nf7 e3 Kf1 Rg8 g4 Rg6 Bf5 Rf6 Ng5 Rh6 Nh3 Rh4 Ke2 b6 Nf4 b5 axb5 a4 Nxd5 a3 b6+',
    overview:
      "The exact f4-f5 kingside attack plan in action against KhatanbaatarBazar (2717). Levy pins with Bg5, plays f4 and f5 to clamp e6 and storm the kingside, then opens lines with fxg6 and pours the rooks down the f-file. A long, instructive grind showing the Two Knights middlegame plan all the way to a winning attack.",
    middlegameTheme: 'The f4-f5 plan: clamp e6, storm, invade the f-file.',
    lessonSummary: 'Pin with Bg5, play f4-f5, open the f-file, and attack the king.',
  },
  {
    id: 'mg-pro-gothamchess-italian-zackyy-twoknights',
    white: 'GothamChess', black: 'ZackyyD', whiteElo: 2700, blackElo: 2737,
    sourceUrl: 'https://www.chess.com/game/live/60277343741',
    pgn: 'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5 Bxd5 Qxd5 Nc3 Qa5 Nxe4 Be6 Bg5 Qd5 c3 d3 Qa4 f5 Ng3 Kf7 Bf4 h6 Rad1 Bd6 Re3 Bxf4 Qxf4 Rad8 h4 g6 Qxc7+ Rd7 Qf4 Qc4 Ne5+ Nxe5 Qxe5 Rhd8 h5 f4 hxg6+ Kxg6 Qxe6+ Qxe6 Rxe6+ Kf7 Rxh6 fxg3 Rh7+ Kg6 Rxd7 Rxd7 fxg3 Kg5 Kf2 Kg4 Ke3 Kxg3 Rxd3 Re7+ Kd4+ Kxg2 b4 Kf2 Kc4 Ke2 Rd8 Rc7+ Kb3 Ke3 a4 Ke4 b5 Ke5 Kb4 b6 Rd3 Ke6 c4 Ke5 a5 bxa5+ Kb3 Rxc4 Kxc4',
    overview:
      "The Two Knights with the sharp d4 line against ZackyyD (2737). Levy plays the Max-Lange-style Re1 pin, sacrifices on d5 to expose the black king on f7, and after a complex middlegame converts a winning rook endgame with precise technique. The model for the open, tactical Two Knights treatment.",
    middlegameTheme: 'The Two Knights d4: Re1 pin, Bxd5 to expose the king.',
    lessonSummary: 'Play d4 and Re1, sacrifice on d5 to expose the king, convert the ending.',
  },
  {
    id: 'mg-pro-gothamchess-italian-gummyfox-evans',
    white: 'GothamChess', black: 'GummyFox', whiteElo: 2700, blackElo: 2600,
    sourceUrl: 'https://www.chess.com/game/live/70321501365',
    pgn: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Bd6 Na3 Nf6 Qe2 O-O g4 Nxg4 Rg1 Nf6 d4 exd4 Nb5 Nxe4 Bh6 Re8 Bxg7 Ng5 Rxg5 Rxe2+ Kxe2 Qxg5 Nxg5 Kxg7 Nxd6 cxd6 Rg1 dxc3 Nxf7+ Kf6 Nxd6 Ne5 Ne4+ Kf5 Bd5 h6 Ke3 Ng4+ Kd4 Nxh2 Nxc3 d6 Rg8 Ng4 Ne4 h5 Nxd6+ Kf6 f3 Ne5 Nxc8 h4 Rf8+ Kg7 Rg8+ Kh7',
    overview:
      "The Evans Gambit unleashed against GummyFox (2600). Levy gambits the b-pawn, builds the big centre, and launches a wild attack with g4 and Rg1 down the g-file. The romantic gambit in full flow — sacrifices rain down, the king gets hunted, and White emerges winning. The model for the Evans Gambit's raging initiative.",
    middlegameTheme: 'The Evans: gambit b4, big centre, g-file attack.',
    lessonSummary: 'Gambit the b-pawn, build the centre, and attack down the g-file.',
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
console.log(`added ${added.length} Italian model games. total now ${data.length}.`);
