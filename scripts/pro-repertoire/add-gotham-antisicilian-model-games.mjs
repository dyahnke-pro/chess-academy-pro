#!/usr/bin/env node
// GothamChess Anti-Sicilian Rossolimo model games — his real WHITE Bb5 WINS.
// Thin corpus; the 2 strongest-opponent wins (his Rossolimo opponents skew
// lower since the Wing Gambit is his main anti-Sicilian). chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-anti-sicilian';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-antisic-josiwales-g6',
    white: 'GothamChess', black: 'josiwales', whiteElo: 2700, blackElo: 2459,
    sourceUrl: 'https://www.chess.com/game/live/2997752947',
    pgn: 'e4 c5 Nf3 Nc6 Bb5 g6 Bxc6 bxc6 O-O Bg7 c3 Nh6 d4 cxd4 cxd4 d5 Nc3 dxe4 Nxe4 Nf5 Qa4 O-O Bf4 Nxd4 Nxd4 Qxd4 Qxd4 Bxd4 Rac1 Bf5 Nc3 e5 Be3 Rab8 b3 c5 Na4 Rbc8 Nxc5 Rfd8 h3 Bxe3 fxe3 Rd2 Rf2 Rcd8 e4 Bc8 Rc2 Rd1+ Kh2 f5 g3 fxe4 Nxe4 Bb7 Nf6+ Kh8 g4 R8d3 Rg2 Bxg2 Rc8+ Kg7 g5 Bd5 Rc7+ Bf7 Rxa7 h6 h4 hxg5 hxg5 R1d2+ Kg1 Rg3+ Kf1 Rxg5 Ne8+ Kf8 Nc7 Rd7 Ra8+ Kg7 Nb5 e4 Nc3 Rf5+ Ke2 Rc7 Nxe4 Rc2+ Kd3 Rh2 Nd6 Rh3+ Kd4 Rf6 Ke5 Re6+ Kd5 Rh5+ Kc6 Rd5 Rd8 Re8 Nxe8+ Bxe8+ Rxe8 Rd3 Re7+ Kh6 Re4 Rc3+ Kd5 Rc2 Rh4+ Kg5 a4 Ra2 Rc4',
    overview:
      "The Rossolimo against the …g6 fianchetto and josiwales (2459). Levy plays his trademark Bxc6 doubling, the c3-d4 central break, and reaches a favourable structure with the healthier pawns. A 121-move technical battle where the superior pawn structure and active rooks grind out the win. The model for the …g6 Rossolimo method.",
    middlegameTheme: 'The …g6 Rossolimo: Bxc6 doubling, c3-d4 break, grind the structure.',
    lessonSummary: 'Trade Bxc6, break with c3-d4, and convert the better pawn structure.',
  },
  {
    id: 'mg-pro-gothamchess-antisic-delorean-nf6',
    white: 'GothamChess', black: 'HopInTheDelorean', whiteElo: 2700, blackElo: 1592,
    sourceUrl: 'https://www.chess.com/game/live/3524935439',
    pgn: 'e4 c5 Nf3 Nc6 Bb5 Nf6 Bxc6 bxc6 d3 d6 h3 g6 Nc3 Bg7 O-O O-O e5 Nd7 exd6 exd6 Bf4 Nf6 Qd2 Re8 Rae1 Be6 b3 a5 a4 Nd5 Nxd5 Bxd5 Rxe8+ Qxe8 Bxd6 Bxf3 gxf3 Qd7 Bxc5 Qxh3 Qf4 Re8 Qg4 Qh6 Be3 g5 Bxg5 Qg6 Bd2 Qf6 Re1 Rxe1+ Bxe1 Qa1 Qc8+ Bf8 Qe8 Qc1 Qe2 Bb4 Kf1 Bxe1 Qxe1 Qxc2 Qe8+ Kg7 Qe5+ Kg8 Qxa5 Qxd3+ Ke1 Qxb3 Qd8+ Kg7 a5 Qe6+ Kf1 c5 Qb6 Qc4+ Kg2 Qd4 a6 c4 Qxd4+',
    overview:
      "The Rossolimo against the …Nf6 line, showing the e5 space-grab plan against HopInTheDelorean. Levy trades Bxc6, plays the e5 break to open the position, wins the d6-pawn, and converts the resulting material and structural edge into a winning queen endgame with the passed a-pawn. A clean demonstration of the e5 Rossolimo plan.",
    middlegameTheme: 'The …Nf6 Rossolimo: Bxc6, the e5 break, win the d6-pawn.',
    lessonSummary: 'Trade Bxc6, break with e5, and collect the weak d6-pawn.',
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
console.log(`added ${added.length} Anti-Sicilian model games. total now ${data.length}.`);
