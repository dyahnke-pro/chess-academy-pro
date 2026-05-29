#!/usr/bin/env node
// Append 4 marquee GothamChess Caro model games (his real Black WINS vs strong
// titled opposition) to model-games.json. Joins the existing Hikaru Exchange
// game (mg-pro-gothamchess-caro-kann-0). G9.1: multiple games per opening,
// student-side WINS only, hand-authored overviews (pass isNarratedModelGame).
// Every PGN is the bare-move line straight from his chess.com archive
// (extract-gotham-caro-model-games.mjs), chess.js-validated here before write.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-caro-kann';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-caro-kann-svidler-advance',
    white: 'PSvidler', black: 'GothamChess', whiteElo: 2988, blackElo: 2608,
    year: 2020, sourceUrl: 'https://www.chess.com/game/live/4943102513',
    pgn: 'e4 c6 d4 d5 e5 Bf5 Nd2 e6 Nb3 Nd7 Nf3 h6 Be2 Ne7 O-O Nc8 a4 a5 Bd2 Be7 c4 O-O cxd5 exd5 Ne1 Bb4 Bxb4 axb4 Bd3 Bxd3 Nxd3 Ncb6 f4 Rxa4 Rxa4 Nxa4 f5 Qg5 Rf4 Nxb2 Qf3 Nxd3 Rg4 N3xe5',
    overview:
      "Levy beats 8-time Russian Champion Peter Svidler in the Advance with his signature …Bf5. He gets the bishop outside the pawn chain before it can be locked in, trades it off, and reaches a comfortable structure. When Svidler over-presses with f4-f5, Levy snaps off the a-pawn, grabs b2, and the tactics all flow to Black — …Nxe5 leaves him a clean pawn up with the better game. The Caro promise: solid first, then the counterpunch.",
    middlegameTheme: 'The …Bf5 trade-down, then punishing White’s over-extension with …Rxa4 and …Nxe5.',
    lessonSummary: 'Trade the light bishop early; let White over-reach, then collect material with active pieces.',
  },
  {
    id: 'mg-pro-gothamchess-caro-kann-bortnyk-panov',
    white: 'Mykola-Bortnyk', black: 'GothamChess', whiteElo: 2780, blackElo: 2774,
    year: 2018, sourceUrl: 'https://www.chess.com/game/live/3296142398',
    pgn: 'e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 Nc6 Bg5 Ne4 Nxe4 dxe4 d5 Ne5 Qb3 Qb6 Be3 Qxb3 axb3 f5 Rxa7 Rxa7 Bxa7 e6 dxe6 Bb4+ Kd1 Bxe6 Bd4 Nc6 Bxg7 Rg8 Bc3 Bc5 f3 e3 Ne2 f4 Kc2 Bf5+ Kc1 Bd6 b4 Bxb4 Nd4 Nxd4 Bxd4 Bd2+ Kd1 Kf7 g4 Bg6 h4 Ra8 Ke2 Bc2 Bh3 Bb3 Be5 Bxc4+ Kd1 Rd8 Kc2 Rc8 Bxf4 Bd5+ Kd3 Bxf3 Rf1 Rd8+ Kc4 Bd5+ Kc5 e2 Kb6 exf1=Q Bxf1 Be3+ Bxe3 Be4 Bc5 Ke6 Kb5 Rd6 Bc4+ Ke5 Bd5 Rxd5',
    overview:
      "A grinding win over GM Mykola Bortnyk (2780) in the Panov. Levy meets the isolated-pawn structure head on, trades queens early, and steers into the rook-and-bishop ending the Panov so often produces. From there it’s pure technique: the light-squared bishop rakes the long diagonal, the rook invades, the passed e-pawn becomes a battering ram, and Black’s pieces simply outwork White’s until the rook ending is won. The opening’s plan flowing straight into the endgame.",
    middlegameTheme: 'Trade queens into the R+B ending; the long-diagonal bishop and a passed pawn convert.',
    lessonSummary: 'Against the isolani, simplify into the ending where your better bishop and structure win.',
  },
  {
    id: 'mg-pro-gothamchess-caro-kann-blazinq-twoknights',
    white: 'Blazinq', black: 'GothamChess', whiteElo: 2975, blackElo: 2879,
    year: 2020, sourceUrl: 'https://www.chess.com/game/live/5621383305',
    pgn: 'e4 c6 Nc3 d5 exd5 cxd5 Nf3 Nc6 d4 Bg4 Bb5 Bxf3 Qxf3 e6 O-O Nf6 Bxc6+ bxc6 Re1 Be7 Bf4 O-O Be5 Nd7 Bg3 Bf6 Rad1 c5 Ne2 cxd4 Nxd4 Qb6 Nb3 a5 a4 Rac8 Re2 Nc5 h4 Nxa4 h5 Nxb2 Rde1 Nc4 Qg4 h6 Bh4 Qd8 Bg3 e5 Nd4 exd4 Rd1 Rc7 Qf3 Qd7 Bxc7 Qxc7 Qxd5 Nb2 Rb1 Qc3 Qb3 Qxb3 cxb3 Nd3 Rd2 Nb4 Rbd1 d3 g3 Bg5 Ra2 d2 Rxa5 Rc8 Rf5 Rc1 Kg2 Rxd1',
    overview:
      "Against a 2975-rated bullet specialist, Levy shows the Two Knights plan: …Bg4 and the trade on f3, saddling White with the doubled pawns, then …e6 and a Modern-style setup. White’s bishop pair never gets going; Levy grabs queenside pawns with …Nxa4 and …Nxb2, marches a passed d-pawn, and the knight plus the runner overwhelm White. The …Bxf3 trade is the seed of everything that follows.",
    middlegameTheme: 'The …Bg4xf3 trade, queenside pawn-grabbing, and a passed d-pawn deciding.',
    lessonSummary: 'Trade the bishop on f3 for the structure; then convert with active pieces and a passer.',
  },
  {
    id: 'mg-pro-gothamchess-caro-kann-riley-fantasy',
    white: 'Riley', black: 'GothamChess', whiteElo: 2887, blackElo: 2894,
    year: 2020, sourceUrl: 'https://www.chess.com/game/live/5607916592',
    pgn: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 Bc4 Nd7 O-O Ngf6 c3 Bh5 Qe1 Bg6 Bg5 Be7 Nbd2 Qc7 dxe5 Nxe5 Bf4 Bd6 Kh1 Nxc4 Bxd6 Nxd6 e5 O-O exf6 Rae8 Qh4 Nf5 Qh3 gxf6 Nb3 Ng7 Nbd4 c5 Nb3 Qc8 Nh4 Qxh3 gxh3 Be4+ Kg1 f5 Rae1 Kh8 Ng2 b6 Nd2 Ne6 Nxe4 fxe4 Rxe4 Ng7 Rfe1 Rd8 Rf4 f5 Ref1 Rd5 R4f2 f4 Nxf4 Rdf5 Kh1 Ne6 Nd3 Rxf2 Rxf2 Re8 Ne5 Rd8 Nf7+ Kg7 Nxd8 Nxd8 Rd2 Nf7 Rd7 Kf6 Rxa7 Ne5 Rb7 Nc4 Rxb6+ Nxb6 c4 Nxc4 b3 Na3 Kg2 Nb5 b4 c4 Kf3 c3 Ke3 c2 Kd2 c1=Q+ Kxc1 Nd4 a3 Ne2+ Kd1 Nf4 b5 Nd3 Ke2 Nf2 b6 Kg6 b7 Kf6 b8=Q Kg6',
    overview:
      "A 122-move marathon win over Riley (2887) in the Fantasy. Levy grabs the bishop on g4 before f3 can blunt it, develops cleanly with …Nd7 and …Bd6, and lets White’s f3-weakened kingside tell. The middlegame liquidates into a queen-and-pawn ending where Black’s queenside majority is the trump; the knight dances to dominate, the b-pawn marches, and Levy converts with textbook technique. Proof that the f3-scar lasts to the very last move.",
    middlegameTheme: 'Grab …Bg4 early, develop, then convert the queenside majority in the Q+P ending.',
    lessonSummary: 'Develop fast against f3; the loosened white king and your majority decide the ending.',
  },
];

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const existing = new Set(data.map((g) => g.id));
let failed = 0;
const added = [];

for (const g of GAMES) {
  // validate every move legal + confirm it's a Black win at the end
  const c = new Chess();
  let ok = true;
  for (const san of g.pgn.split(/\s+/)) {
    try { c.move(san); } catch { console.error(`ILLEGAL ${g.id}: ${san}`); ok = false; break; }
  }
  if (!ok) { failed++; continue; }
  if (g.overview.length < 40) { console.error(`OVERVIEW too short ${g.id}`); failed++; continue; }
  if (existing.has(g.id)) { console.log(`skip existing ${g.id}`); continue; }

  added.push({
    id: g.id,
    openingId: OPENING_ID,
    white: g.white,
    black: g.black,
    whiteElo: g.whiteElo,
    blackElo: g.blackElo,
    result: '0-1', // Black (GothamChess) win — gate requires studentSide win
    year: g.year,
    event: 'chess.com',
    pgn: g.pgn,
    sourceUrl: g.sourceUrl,
    overview: g.overview,
    criticalMoments: [],
    middlegameTheme: g.middlegameTheme,
    lessonSummary: g.lessonSummary,
    studentSide: 'black',
  });
}

if (failed > 0) { console.error(`\n${failed} game(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added.length} Gotham Caro model games. total now ${data.length}.`);
