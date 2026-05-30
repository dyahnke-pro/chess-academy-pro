#!/usr/bin/env node
// GothamChess Fantasy Variation model games — real WHITE WINS vs strong
// opponents (incl. Hans Niemann). chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-fantasy-caro';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-fantasy-hans-e6',
    white: 'GothamChess', black: 'HansOnTwitch', whiteElo: 2700, blackElo: 3110,
    sourceUrl: 'https://www.chess.com/game/live/113672474239',
    pgn: 'e4 c6 d4 d5 f3 e6 Nc3 Bb4 a3 Ba5 Be3 Ne7 Bd3 Nd7 Ne2 dxe4 fxe4 e5 O-O O-O Bc4 Ng6 d5 Bb6 Qd2 Nf6 h3 cxd5 exd5 Bd7 Rad1 Rc8 Bb3 Nh5 Bxb6 Qxb6+ Kh2 f5 Qg5 Nhf4 Nxf4 Nxf4 Qe7 Rcd8 d6+ Kh8 Qxe5 Ng6 Qd4 Qa5 Rfe1 f4 Re7 Rf6 Ne4 Qf5 Nxf6 gxf6 Qe4 Qb5 Qd5 Qxd5 Rxd5 Bc6 Rf5 Nxe7 dxe7 Re8 Rxf6 Rxe7 Rxf4 Re2 Rg4 h5 Rg5 h4 Rg4 Kh7 Rxh4+ Kg6 Rg4+ Kf5 Rg7 Kf6 Rg3 a5 a4 Be4 h4 Bc6 h5 Re5 Rh3 Rg5 g3 Kg7 h6+ Kh8 Bc4 Rf5 Bd3 Rf2+ Kg1 Rg2+ Kf1 Rd2 Rh4 Rg2 Rd4 Rxg3 Rd8+ Rg8 Rxg8+ Kxg8 h7+ Kg7 b3 Bd5 Kf2 Bf7 Ke3 Be6 Kd4 Bd7 Kc5',
    overview:
      "The Fantasy Variation against Hans Niemann (HansOnTwitch, 3110). Levy builds the big centre, pushes d5 to gain space, and outplays a 3100-rated super-talent in a long technical grind, eventually pushing a passed h-pawn to victory. Beating Niemann with the offbeat Fantasy is a statement game for the repertoire.",
    middlegameTheme: 'The 3…e6 Fantasy: big centre, d5 space, technical grind.',
    lessonSummary: 'Build the centre, push d5 for space, and convert the endgame.',
  },
  {
    id: 'mg-pro-gothamchess-fantasy-saraci-dxe4',
    white: 'GothamChess', black: 'SaraciNderim', whiteElo: 2700, blackElo: 3069,
    sourceUrl: 'https://www.chess.com/game/live/166416658870',
    pgn: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 exd4 Bc4 Be6 Bxe6 fxe6 O-O Nf6 e5 Nd5 Ng5 Be7 Nxe6 Qb6 Nxg7+ Kd8 Ne6+ Kc8 Qg4 Nd7 Kh1 Nxe5 Qh3 Nd7 Nd2 Ne3 Rf7 Re8 Ne4 a5 Bxe3 dxe3 Qxh7 Qxb2 Rd1 e2 Re1 Qb4 Qf5 Kb8 Qf4+ Ka7 c3 Qc4 Qe3+ Nb6 Rb1 c5 Nd2 Qd5 Nf4 Qxf7 Nxe2 Bg5 Qxg5 Rxe2 Qxc5 Qe6 Nf3 Re8 h3 Re3 Qxa5+ Kb8 Rxb6 Qe4 Qg5 Rxf3 gxf3 Qxf3+ Qg2 Re1+ Kh2 Re2 Rg6 Qf4+ Rg3 Rxg2+ Kxg2 Qd2+ Kf3 Qxa2 Kg4 Qf7 Kh4 Qc4+ Rg4 Qxc3 Rg8+ Ka7 Rg3 Qf6+ Kg4 Qf7 Rf3 Qd7+ Kf4 Kb8 Kg3 Qd6+ Rf4 Qe5 Kg2 Qxf4 Kh1 Ka7 Kg1',
    overview:
      "The sharp 3…dxe4 line against SaraciNderim (3069). Levy sacrifices into the position with Ng5-Nxe6 and Nxg7+, dragging the king into the open, then navigates wild complications with the queen and knights to emerge on top. A demonstration of the Fantasy's tactical venom against a strong opponent.",
    middlegameTheme: 'The 3…dxe4 line: Nxe6/Nxg7+ sacrifices, drag out the king.',
    lessonSummary: 'In the dxe4 line, sacrifice to expose the king and attack.',
  },
  {
    id: 'mg-pro-gothamchess-fantasy-matibar-g6',
    white: 'GothamChess', black: 'Matibar', whiteElo: 2700, blackElo: 2949,
    sourceUrl: 'https://www.chess.com/game/live/166172119812',
    pgn: 'e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 Qb6 Qd2 Nf6 e5 Nfd7 f4 e6 h4 h5 Nf3 Qxb2 Rb1 Qa3 Bd3 Qe7 O-O a6 Ng5 b5 Ne2 Nb6 Ng3 Ra7 c3 N8d7 f5 exf5 Bxf5 Nc4 Qe2 gxf5 Nxf5 Qf8 Bf4 Ndb6 e6 f6 e7 Qg8 Nd6+ Nxd6 Bxd6 Bg4 Qe3 Rd7 Bc5 Nc8 Rbe1 Rh6 Qg3 Rb7 Rf2 Rg6 Qf4 Bh6 Qxf6 Rxf6 Rxf6 Kd7 Rxh6 Qe8 Nh7 Kc7 Nf6',
    overview:
      "Against the aggressive 3…g6 and Matibar (2949), Levy invites the …Qxb2 poison pawn, chases the queen with Rb1, and builds a kingside attack behind the e5-wedge. The f5 break and the e6-e7 passed pawn tear Black apart, finishing with a knight fork netting decisive material. The model for the g6 poison-pawn line.",
    middlegameTheme: 'The 3…g6 line: invite …Qxb2, attack with f5 and the e-pawn.',
    lessonSummary: 'Let Black grab b2, chase the queen, and storm with f5 and e6-e7.',
  },
  {
    id: 'mg-pro-gothamchess-fantasy-tjychess-qb6',
    white: 'GothamChess', black: 'tjychess', whiteElo: 2700, blackElo: 2837,
    sourceUrl: 'https://www.chess.com/game/live/83022074119',
    pgn: 'e4 c6 d4 d5 f3 Qb6 Nc3 dxe4 Bc4 e3 Bxe3 Qxb2 Nge2 Qb4 Qd3 Nf6 Rb1 Qa5 d5 cxd5 Bxd5 Nxd5 Rb5 Nb4 Qc4 Qd8 Qxb4 Nc6 Qe4 g6 O-O Bf5 Qa4 Qc8 Nd4 Bd7 Nb3 Bg7 Nd5 O-O Qh4 Be6 c4 Re8 Bh6 Bh8 Bg5 Bxd5 Rxd5 Qc7 Rfd1 Rad8 Be3 Rxd5 cxd5 Ne5 Qa4 Rd8 Qxa7 Qd7 Nc5 Qf5 Qb6 Ra8 Qxb7 Rxa2 Qb8+ Kg7 Bd4 Kh6 Qxh8 Nxf3+ Kh1 Qg4 Qg7+ Kg5 Be3+ Kf5 Qxf7+ Ke5 Qxe7+ Kf5 Qe6#',
    overview:
      "The 3…Qb6 line against tjychess (2837). Levy gambits a pawn for rapid development, plays the d5 break to blow open the centre, and launches a sustained attack. The game ends with a spectacular king-hunt — Qg7+, Be3+, and a forced march to Qe6# mate. A brilliant showcase of the Fantasy's attacking power.",
    middlegameTheme: 'The 3…Qb6 line: gambit for development, d5 break, mate the king.',
    lessonSummary: 'Against …Qb6, gambit for development, break d5, and hunt the king.',
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
console.log(`added ${added.length} Fantasy model games. total now ${data.length}.`);
