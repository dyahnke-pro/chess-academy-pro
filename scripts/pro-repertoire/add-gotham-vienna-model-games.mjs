#!/usr/bin/env node
// Marquee GothamChess Vienna model games — his real WHITE WINS, one per main
// line. G9.1: student-side WINS only, hand-authored overviews. Every PGN from
// his chess.com archive, chess.js-validated here.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-vienna';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-vie-soprano-gambit',
    white: 'GothamChess', black: 'Antony-soprano01', whiteElo: 2700, blackElo: 3039,
    sourceUrl: 'https://www.chess.com/game/live/169092161810',
    pgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 f5 d3 Nxc3 bxc3 d4 Qg3 Nc6 Nf3 dxc3 Rb1 Be6 Bg5 Qd7 Rxb7 Bd5 Be2 Nd4 Nxd4 Bxb7 Qh4 h6 Bh5+ Qf7 Bxf7+ Kxf7 e6+ Kg6 Be7 Bxe7 Qxe7 Rad8 Qf7+ Kh7 Nxf5 Rhg8 e7 Rde8 Nxg7 Rxe7+ Qxe7 Rxg7 Qb4 Bxg2 Rg1',
    overview:
      "The Vienna Gambit against the 3039-rated Antony-soprano01. After the …f5 defence, Levy storms with Rb1 down the half-open b-file, sacrifices on b7, and launches a furious attack: Bh5+, e6+, and a knight sacrifice on f5 tear open the king. A textbook demonstration of the gambit's raging initiative against a near-master.",
    middlegameTheme: 'The gambit attack: Rb1, sac on b7, storm the king.',
    lessonSummary: 'Pressure b7 down the open file, sacrifice for the attack, hunt the king.',
  },
  {
    id: 'mg-pro-gothamchess-vie-kovalev-quiet',
    white: 'GothamChess', black: 'vladislavkovalev', whiteElo: 2700, blackElo: 2898,
    sourceUrl: 'https://www.chess.com/game/live/93136298187',
    pgn: 'e4 e5 Nc3 Nc6 Bc4 Nf6 d3 Bc5 f4 d6 Nf3 Bg4 Na4 Nd4 Nxc5 dxc5 O-O O-O fxe5 Nd7 Bf4 b5 Bb3 Qe7 Qd2 Bxf3 gxf3 Nxe5 Bxe5 Qxe5 c3 Nxb3 axb3 Rad8 Qe3 b4 f4 Qd6 Rxa7 bxc3 bxc3 Qxd3 Qxd3 Rxd3 Rxc7 Rxc3 e5 Rd8 Kg2 g6 Rf3 Rd2+ Kg3 Rcc2 f5 Rg2+ Kf4 Rce2 Rc8+ Kg7 f6+ Kh6 Rh3#',
    overview:
      "The quiet Bc4 Vienna against vladislavkovalev (2898). Levy plays the positional Na4xc5 plan to grab the bishop pair, opens the f-file with fxe5, and grinds into a winning rook endgame — finishing with a stunning king-hunt: f5-f6+ drives the king to h6 and Rh3# delivers mate. Proof the quiet Vienna still bites.",
    middlegameTheme: 'The quiet Bc4: Na4xc5, the f-file, a king-hunt mate.',
    lessonSummary: 'Trade the bishop with Na4, open the f-file, and hunt the king down.',
  },
  {
    id: 'mg-pro-gothamchess-vie-lalarttu-nc6',
    white: 'GothamChess', black: 'Lalarttu86', whiteElo: 2700, blackElo: 2830,
    sourceUrl: 'https://www.chess.com/game/live/169236745186',
    pgn: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Qf3 Nc6 Bb5 Nxc3 dxc3 Qh4+ g3 Qe4+ Be3 Qxf3 Nxf3 Bd7 O-O-O Nxe5 Bxd7+ Nxd7 Rxd5 f6 Nd4 O-O-O Bf4 Re8 Nb5 Nb6 Rd3 Na8 Nxa7+ Kb8 Nb5 g5 Bd2 Nb6 Rf1 c6 Nd4 Bc5 Rxf6 Nd5 Rf1 Rhf8 Rdf3 Rxf3 Rxf3 Bxd4 cxd4 Re2 c4 Nb6 b3 Rxh2 a4 h6 Rf7 Nc8 Rd7 Ka7 Be3 Re2 Bd2 Rg2 Rxb7+',
    overview:
      "The …Nc6 defence to the gambit, refuted against Lalarttu86 (2830). Levy plays the exact forcing sequence — Bb5 pin, the Bxd7+/Rxd5 combination winning the central pawn — then converts the resulting endgame with precise rook and knight play, ending with Rxb7+ and a decisive material edge. The engine-precise answer to Black's active queen sorties.",
    middlegameTheme: 'The …Nc6 refutation: Bb5 pin, Bxd7+/Rxd5 wins material.',
    lessonSummary: 'Pin with Bb5, play the Bxd7+/Rxd5 combo, and convert the extra pawn.',
  },
  {
    id: 'mg-pro-gothamchess-vie-revnov-accepted',
    white: 'GothamChess', black: 'Revnov', whiteElo: 2700, blackElo: 2799,
    sourceUrl: 'https://www.chess.com/game/live/52071565499',
    pgn: 'e4 e5 Nc3 Nf6 f4 exf4 e5 Ng8 Nf3 d6 d4 Nc6 Bb5 a6 Ba4 b5 Bb3 dxe5 O-O Nf6 Qe2 Nxd4 Qxe5+ Ne6 Ne4 Bd6 Nxd6+ cxd6 Qf5 O-O Bxe6 fxe6 Qxf4 e5 Qg3 Qb6+ Kh1 Bf5 Nh4 Ne4 Qb3+ Kh8 Be3 Qc6 Rxf5 Rxf5 Nxf5 Rf8 Qe6 Qxc2 Qe7 Nf2+ Bxf2 Qxf5 Bg1 Qf6 Qb7 h5 Qxa6 b4 Qc4 Rb8 Rf1 Qg6 Qd5 e4 Re1 Re8 Qd4 Re5 Qxb4 Qe6 Bd4 Rg5 Qd2 Qg6 Qf2 h4 Qxh4+ Rh5 Qf2 Rg5 h3 Rf5 Qe3 Kg8 Qxe4 Rf1+ Kh2',
    overview:
      "The Vienna Gambit Accepted against Revnov (2799). When Black grabs the pawn with …exf4, Levy stakes out space with e5, develops rapidly, and uses the lead in development to launch a kingside attack. An 89-move battle where the gambit's compensation — time and initiative — proves decisive. The model for the gambit-accepted lines.",
    middlegameTheme: 'The gambit accepted: e5 wedge, rapid development, kingside attack.',
    lessonSummary: 'Against …exf4, cramp with e5, develop fast, and attack the king.',
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
    result: '1-0', year: 2024, event: 'chess.com',
    pgn: g.pgn, sourceUrl: g.sourceUrl, overview: g.overview,
    criticalMoments: [],
    middlegameTheme: g.middlegameTheme, lessonSummary: g.lessonSummary,
    studentSide: 'white',
  });
}

if (failed > 0) { console.error(`\n${failed} game(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added.length} Vienna model games. total now ${data.length}.`);
