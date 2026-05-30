#!/usr/bin/env node
// GothamChess Closed Sicilian (Nc3) model games — real WHITE WINS vs strong
// opponents. chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-closed-sicilian';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-closedsic-sergoy-e6',
    white: 'GothamChess', black: 'sergoy', whiteElo: 2700, blackElo: 2987,
    sourceUrl: 'https://www.chess.com/game/live/90693673123',
    pgn: 'e4 c5 Nc3 e6 d4 cxd4 Qxd4 Nc6 Qd3 Nf6 Bf4 d5 O-O-O d4 Nb5 e5 Bxe5 Nxe5 Qg3 Qe7 Rxd4 Bg4 Nd6+ Qxd6 Rxd6 Bxd6 Bb5+ Kf8 f4 Nh5 Qb3 Nxf4 Nf3 Be6 Qc3 Nxf3 Qxf3 Ng6 g3 Ke7 Ba4 Ne5 Qe3 Nc4 Qg5+ Kf8 Bb3 Rc8 Rd1 Be7 Qb5 b6 Qa6 g6 Rd4 Bg5+ Kb1 Nd2+ Rxd2 Bxd2 Bxe6 Rd8 Bd5 Bg5 Qxa7 Be7 a4 h5 h4 Rd6 Qc7 Rd8 Ka2 Rd6 c3 Rd8 b4 Rd6 Kb3 Rd8 Qxb6 Kg7 Qb7 Rhe8 a5 Rb8 Qc7 Rbc8 Qd7 Rcd8 Qa7 Kf8 a6',
    overview:
      "The Nc3 Sicilian against sergoy (2987). Levy plays the rapid d4-Qxd4 and O-O-O attack, sacrifices with Nb5 and Bxe5 to open lines, and after a sharp tactical battle converts a winning endgame with the queenside passed pawns. Beating a near-3000 opponent with the aggressive Open-Sicilian-with-early-queen approach.",
    middlegameTheme: 'The vs …e6 line: O-O-O, Nb5/Bxe5 sacrifices, win the ending.',
    lessonSummary: 'Castle queenside, sacrifice to open lines, and convert the passers.',
  },
  {
    id: 'mg-pro-gothamchess-closedsic-tran-d6',
    white: 'GothamChess', black: 'TranJMinh', whiteElo: 2700, blackElo: 2860,
    sourceUrl: 'https://www.chess.com/game/live/80666493089',
    pgn: 'e4 c5 Nc3 d6 d4 cxd4 Qxd4 Nc6 Qd2 g6 b3 Bg7 Bb2 Nf6 O-O-O O-O f3 a5 a4 Nb4 Kb1 Be6 Nge2 Rc8 Nd4 Nd7 h4 Nc5 h5 Qb6 Bb5 Bd7 g4 Bxb5 Ndxb5 Rfe8 hxg6 fxg6 Qh2 h6 Qd2 Nd7 Rxh6 Ne5 Rh3 Rc5 g5 Rec8 f4 Nc4 bxc4 Rxc4 Qe2',
    overview:
      "The opposite-side-castling attack against TranJMinh (2860). Levy sets up the classic O-O-O + Bb2 + f3 formation, then storms with h4-h5 and g4-g5 against Black's king. The Rxh6 sacrifice rips open the kingside, and the heavy pieces pour in. The model game for the …d6 opposite-castle attack.",
    middlegameTheme: 'The …d6 attack: O-O-O, h4-h5-g4-g5 storm, Rxh6 sacrifice.',
    lessonSummary: 'Castle queenside, storm with h4-g4, and sacrifice on h6.',
  },
  {
    id: 'mg-pro-gothamchess-closedsic-roberto-g6',
    white: 'GothamChess', black: 'RobertoJBM', whiteElo: 2700, blackElo: 2796,
    sourceUrl: 'https://www.chess.com/game/live/80319623733',
    pgn: 'e4 c5 Nc3 g6 d4 cxd4 Qxd4 Nf6 Nf3 Nc6 Qd3 Bg7 Nd5 O-O c3 d6 Bg5 Nxd5 exd5 Ne5 Nxe5 Bxe5 h4 Bf5 Qe3 Re8 Bd3 Bxd3 Qxd3 Qa5 h5 e6 hxg6 hxg6 O-O-O Rac8 Kb1 exd5 Qh3 d4 Qh7+ Kf8 cxd4 Bg7 Bh6 Qf5+ Ka1 Qf6 Qh8+',
    overview:
      "Against the …g6 fianchetto and RobertoJBM (2796), Levy plays the Nd5 outpost and the h4-h5 storm. After the central exchanges, the h-file opens with hxg6, and White's queen and bishop deliver a devastating attack ending Qh7+ and Qh8+. The model for the …g6 line with the Nd5 + h4 storm.",
    middlegameTheme: 'The …g6 line: Nd5 outpost, h4-h5 storm, Qh7+/Qh8+.',
    lessonSummary: 'Plant Nd5, storm h4-h5, open the h-file, and attack the king.',
  },
  {
    id: 'mg-pro-gothamchess-closedsic-uchihovich-bb5',
    white: 'GothamChess', black: 'Uchihovich', whiteElo: 2700, blackElo: 2825,
    sourceUrl: 'https://www.chess.com/game/live/71013385315',
    pgn: 'e4 c5 Nc3 Nc6 Bb5 Nd4 Nf3 a6 Bc4 b5 Bd5 Ra7 Nxd4 cxd4 Bxf7+ Kxf7 Qh5+ g6 Qd5+ e6 Qxd4 Bg7 Qxa7 Nf6 O-O Rf8 d3 Kg8 Bf4 d5 Be5 Rf7 Qd4',
    overview:
      "The Bb5 line punished against Uchihovich (2825). When Black over-extends with …a6 and …b5, Levy unleashes the Bxf7+ sacrifice: after Kxf7, the queen checks rain down with Qh5+ and Qd5+, and Qxa7 wins a whole rook. A sharp demonstration of punishing Black's loose queenside play in the Bb5 Sicilian.",
    middlegameTheme: 'The Bb5 line: punish …a6/…b5 with the Bxf7+ sacrifice.',
    lessonSummary: 'When Black over-extends, sacrifice Bxf7+ and win material with checks.',
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
console.log(`added ${added.length} Closed Sicilian model games. total now ${data.length}.`);
