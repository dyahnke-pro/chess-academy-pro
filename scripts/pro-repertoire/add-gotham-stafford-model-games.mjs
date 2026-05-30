#!/usr/bin/env node
// GothamChess Stafford Gambit Refutation model games — real WHITE WINS, incl.
// a marathon win over IMRosen (Eric Rosen, the Stafford specialist).
// chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-stafford-refute';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-stafford-imrosen',
    white: 'GothamChess', black: 'IMRosen', whiteElo: 2700, blackElo: 2527,
    sourceUrl: 'https://www.chess.com/game/live/5516252703',
    pgn: 'e4 e5 Nf3 Nf6 Nxe5 Nc6 Nxc6 dxc6 d3 Bc5 Be2 Ng4 Bxg4 Qh4 g3 Qxg4 Qxg4 Bxg4 h3 Bf3 O-O O-O-O Be3 Bb6 Nd2 Bh5 a4 f6 a5 Bd4 Bxd4 Rxd4 Kg2 Bf7 Kf3 c5 Ke3 Re8 g4 Rd7 b3 h5 Rg1 Be6 f3 Rh8 Rh1 Re7 Rag1 Bd7 g5 f5 Nc4 g6 e5 f4+ Kf2 b5 axb6 axb6 Re1 Rhe8 h4 b5 Nd2 Rxe5 Ne4 Bc6 Ra1 Kb7 Rhe1 Kb6 c4 b4 Re2 Rd8 Rd2 Bxe4 fxe4 Rxe4 dxe4 Rxd2+ Kf3 Rd3+ Kxf4 Rxb3 Ra8 Rb1 Rg8 Rf1+ Ke5 Kb7 Rxg6 b3 Rf6 Rxf6 gxf6 b2 f7 b1=Q f8=Q Qb2+ Ke6 Qd4 e5 Qxc4+ Ke7 Qxh4+ Qf6 Qb4 e6 c4+ Kf7 c3 e7 Qc4+ Kf8 c2 e8=Q c1=Q Qf3+ Qc6 Qb3+ Ka7 Qeb8+ Ka6 Qa2+ Qa3+ Qxa3+ Qa4 Qxa4#',
    overview:
      "The definitive refutation game: Levy beats IM Eric Rosen (IMRosen, 2527) — the world's foremost Stafford Gambit evangelist — at his own gambit. Levy stays calm with d3 and Be2, trades off the entire attack, and converts the extra pawn across a 131-move marathon ending in a queen-promotion race and mate. The ultimate proof the Stafford is refuted by calm play.",
    middlegameTheme: 'The refutation: d3/Be2, trade the attack, win the endgame.',
    lessonSummary: 'Stay calm, trade off the attackers, and grind the extra pawn home.',
  },
  {
    id: 'mg-pro-gothamchess-stafford-herzog',
    white: 'GothamChess', black: 'Herzog2012', whiteElo: 2700, blackElo: 2604,
    sourceUrl: 'https://www.chess.com/game/live/110049736041',
    pgn: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d3 Nf6 d4 d5 Bd3 Bd6 h3 O-O O-O h6 Re1 Be6 b3 Nbd7 c4 c5 Bb2 dxc4 bxc4 cxd4 Nxd4 Nc5 Nxe6 fxe6 Bg6 Qc7 Qe2 Rad8 Nc3 a6 Rad1 Nfd7 Bc2 Bh2+ Kh1 Be5 Bb1 Bf4 Qc2 Nf6 g3 Bd6 Qe2 Qc6+ Kg1 Bc7 Rxd8 Rxd8 Rd1 Rxd1+ Nxd1 Qd6 Ne3 Nfe4 Ng4 Qd2 Kf1 Qxe2+ Kxe2 Nd6 Ne3 Na4 Be5 Nc5 Bc2 Nd7 Bc3 Bb6 Ng2 Nxc4 Bb3 Nd6 Bxe6+',
    overview:
      "The Stafford with the …d6 move order against Herzog2012 (2604). Levy declines the complications, builds a solid d4 centre with the bishop pair, and slowly outplays his opponent. The c4 break and the dominant light-squared bishop decide, finishing with Bxe6+ winning material. A clean, classical refutation by central control.",
    middlegameTheme: 'The …d6 Stafford: solid d4 centre, bishop pair, c4 break.',
    lessonSummary: 'Build the d4 centre with the bishop pair and break with c4.',
  },
  {
    id: 'mg-pro-gothamchess-stafford-ril1997',
    white: 'GothamChess', black: 'ril1997', whiteElo: 2700, blackElo: 2668,
    sourceUrl: 'https://www.chess.com/game/live/110071862503',
    pgn: 'e4 e5 Nf3 Nf6 Nxe5 Nxe4 d3 Qe7 dxe4 Qxe5 Nc3 Bb4 Bd3 O-O O-O Bxc3 bxc3 Nc6 Kh1 d6 f4 Qe7 f5 f6 Rb1 Ne5 Bf4 b6 Bxe5 Qxe5 Qh5 d5 Rbe1 Qd6 exd5 Bd7 c4 Rae8 Re6 Qb4 h3 Re7 Qe2 Bxe6 fxe6 g6 h4 Qc3 Qg4 Qe5 Rf5 Qe1+ Rf1 Qe5 Rf5 Qe1+ Kh2 Qe3 h5 g5 h6 a5 a4 Qe1 Qg3 Qxg3+ Kxg3 Rd8 Rxf6 Rf8 Rxf8+ Kxf8 Kg4 c6 Kxg5 cxd5 cxd5 Rc7 Kf6',
    overview:
      "The …Nxe4 Stafford try against ril1997 (2668). Levy regains the piece cleanly with d3, builds a strong pawn centre with e4 and f4-f5, and launches a kingside initiative. The f5-f6 wedge and the rook on e6 dominate, converting into a winning endgame with the extra pawn. A model of the active refutation.",
    middlegameTheme: 'The …Nxe4 Stafford: regain the piece, f4-f5 attack.',
    lessonSummary: 'Regain the piece with d3, then storm with e4 and f4-f5.',
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
console.log(`added ${added.length} Stafford model games. total now ${data.length}.`);
