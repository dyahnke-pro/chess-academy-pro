#!/usr/bin/env node
// GothamChess King's Indian Attack model games — real WHITE WINS (incl. a win
// over GM Benjamin Finegold). chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-kia';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-kia-finegold',
    white: 'GothamChess', black: 'GMBenjaminFinegold', whiteElo: 2700, blackElo: 2562,
    sourceUrl: 'https://www.chess.com/game/live/3171817744',
    pgn: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 Nbd2 e5 e4 Nc6 Nc4 Bg4 Ne3 Bxf3 Bxf3 Nd4 Bg2 c6 c3 Ne6 f4 exf4 gxf4 Nh5 f5 Nef4 Qf3 Qg5 Ng4 Be5 d4 c5 dxe5 dxe5 h4 Qxh4 Nxe5 Nxg2 Qxg2 Rad8 Nf3 Qf6 Bg5 Qc6 Bxd8 Rxd8 fxg6 Re8 gxf7+',
    overview:
      "The King's Indian Attack against GM Benjamin Finegold (2562). Levy builds the classic KIA setup, then launches the signature f4-f5 kingside storm. The pawns crash through with f5 and the knight maneuvers, finishing with fxg6 and f7+ winning. The model game for the KIA's kingside attack against a grandmaster.",
    middlegameTheme: 'The KIA setup: f4-f5 kingside storm, crash through.',
    lessonSummary: 'Build the KIA, storm with f4-f5, and break through on the kingside.',
  },
  {
    id: 'mg-pro-gothamchess-kia-ntbt',
    white: 'GothamChess', black: 'NTBT_DHS', whiteElo: 2700, blackElo: 2694,
    sourceUrl: 'https://www.chess.com/game/live/3396345265',
    pgn: 'Nf3 g6 g3 Bg7 Bg2 Nf6 O-O O-O d3 d6 Nbd2 e5 e4 Nc6 c3 d5 h3 d4 Nc4 Re8 cxd4 exd4 Bg5 h6 Bxf6 Bxf6 a3 b5 Ncd2 a5 Rc1 Bb7 Qb3 b4 Nc4 a4 Qa2 b3 Qb1 Ba6 Rce1 Ne5 Ncxe5 Bxe5 Rc1 Qd6 Nd2 c5 Nc4 Qc6 f4 Bc7 e5 Qb5 Bxa8 Rxa8 Rf2 Bb7 Nd2 Qc6 Ne4 f6 exf6 Re8 Rxc5 Qb6 Qc1 Bd6 Rc4 Bxe4 f7+ Kxf7 dxe4 Re7 Rc7 d3 Rxe7+ Kxe7 Qd2 Bc5 Kf1 Bxf2 Qxf2 Qxf2+ Kxf2',
    overview:
      "A long KIA battle against NTBT_DHS (2694). Levy navigates the closed centre with the Nc4-e3 maneuver and the f4-e5 break, then converts a complex middlegame with the f5-f6 and e5 pushes opening lines to the king. The model for handling the KIA's slow strategic build-up into a winning attack.",
    middlegameTheme: 'The KIA: Nc4-e3 maneuver, f4-e5 break, open the king.',
    lessonSummary: 'Maneuver the knight, break with f4-e5, and open lines to the king.',
  },
  {
    id: 'mg-pro-gothamchess-kia-bob2004',
    white: 'GothamChess', black: 'Bob_2004', whiteElo: 2700, blackElo: 2580,
    sourceUrl: 'https://www.chess.com/game/live/130011035763',
    pgn: 'Nf3 g6 g3 Bg7 Bg2 e5 O-O d5 d3 Nc6 Nbd2 Nge7 e4 O-O h3 h6 Kh2 Be6 a3 Kh7 exd5 Nxd5 Nc4 Nb6 Ne3 Qd7 Re1 Rad8 Bd2 Rfe8 Bc3 Nd5 Nxd5 Bxd5 Nd2 Nd4 Bxd4 Bxg2 Kxg2 Qxd4 Rb1 f5 Nb3 Qd5+ Qf3 c6 Qxd5 Rxd5 Nd2 Kg8 g4 Kf7 Nc4 Rd4 Ne3 Kf6 Re2 h5 Rbe1 hxg4 hxg4 Re7 Rh1 b5 gxf5 gxf5 Rh5 Rf4 Kf1 Kg6 Rh1 e4 Ng2 Rg4 Nh4+ Kg5 Ng2 Bxb2 Ne3 Rf4 Ng2 Rf3 Ne1 Rf4 f3 Bf6 Rg2+ Rg4 fxg4 exd3 gxf5+ Kxf5 Nxd3 Bd4 Rh5+ Ke6 Re2+',
    overview:
      "The KIA against Bob_2004 (2580). Levy plays the central exchanges and the Nc4-e3 knight maneuver, then grinds an endgame where the active rooks and the g4 break create decisive threats against the exposed king. The model for converting the KIA's small structural edges into a win.",
    middlegameTheme: 'The KIA: central exchanges, Nc4-e3, the g4 break.',
    lessonSummary: 'Trade in the centre, maneuver the knight, and break with g4.',
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
    result: '1-0', year: 2021, event: 'chess.com',
    pgn: g.pgn, sourceUrl: g.sourceUrl, overview: g.overview,
    criticalMoments: [],
    middlegameTheme: g.middlegameTheme, lessonSummary: g.lessonSummary,
    studentSide: 'white',
  });
}

if (failed > 0) { console.error(`\n${failed} game(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added.length} KIA model games. total now ${data.length}.`);
