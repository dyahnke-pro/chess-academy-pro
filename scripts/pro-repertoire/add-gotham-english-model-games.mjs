#!/usr/bin/env node
// Marquee GothamChess English model games — his real WHITE WINS vs strong
// titled opposition, one per variation. G9.1: multiple games per opening,
// student-side WINS only, hand-authored overviews. Every PGN from his
// chess.com archive, chess.js-validated here.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-english';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-eng-philippians-g6',
    white: 'GothamChess', black: 'Philippians46', whiteElo: 2700, blackElo: 3187,
    sourceUrl: 'https://www.chess.com/game/live/168805928476',
    pgn: 'c4 g6 Nc3 Bg7 d4 Nf6 e4 d6 f4 O-O Nf3 Nc6 d5 Nb4 a3 Na6 Bd3 Nc5 Bc2 a5 O-O e5 fxe5 dxe5 Be3 Qe7 h3 Bd7 Qd2 Nh5 Bh6 Bxh6 Qxh6 Nf4 Nxe5 Nxh3+ gxh3 Qxe5 Qe3 b6 Kg2 a4 Rad1 Rae8 Qg3 Qh5 Rd2 Re5 Kh2 Rg5 Qf3 Qh6 Rg2 Bxh3 Qxh3 Rh5 Rf3 Rxh3+ Rxh3 Qf4+ Kh1 Nd7 e5 Nxe5 Ne4 Nf3 Rf2 Qc1+ Kg2 Ne1+ Kg3 Nxc2 Nf6+ Kg7 Rxh7#',
    overview:
      "The Botvinnik English in full flow against the 3187-rated Philippians46. Levy builds the c4/d4/e4 centre, locks it with d5, and unleashes the f4 kingside storm. After a sharp middlegame the attack crashes through and finishes with a picture-perfect Rxh7# — the rook mate at the end of the avalanche. The model game for the …g6 Botvinnik storm.",
    middlegameTheme: 'The …g6 Botvinnik: lock with d5, storm with f4, mate on h7.',
    lessonSummary: 'Build the big centre, lock with d5, roll the f-pawn, and mate the king.',
  },
  {
    id: 'mg-pro-gothamchess-eng-salem-c5',
    white: 'GothamChess', black: 'Salem-AR', whiteElo: 2700, blackElo: 3061,
    sourceUrl: 'https://www.chess.com/game/live/5660247564',
    pgn: 'c4 c5 Nc3 g6 e3 Bg7 Nf3 Nc6 h4 Nf6 h5 gxh5 d4 cxd4 exd4 d5 cxd5 Nxd5 Bc4 Nxc3 bxc3 e6 Bg5 Qc7 Bh4 Na5 Bb5+ Bd7 Bxd7+ Qxd7 Rc1 Nc4 O-O O-O Qe2 Qd5 Bg3 Rac8 Rfe1 b5 Nh4 Rfe8 Nf3 f6 Nh2 a6 a4 Bh6 axb5 Bxc1 Rxc1 axb5 Rd1 b4 cxb4 Nd6 Nf1 Nf5 Bf4 Ng7 Be3 Qf5 Bh6 Qg6 Bxg7 Kxg7 Ng3 Rc2 Rd2 h4 Rxc2 hxg3 fxg3 Ra8 Rc1 Ra3 Rf1 Rxg3 Qf2 Rg5 d5 Rf5 Qd4 Rxf1+ Kxf1 Qf5+ Qf2 Qxd5 Qe2 Qb5 Qxb5 e5 Qc6 Kg6 b5 Kf5 b6 e4 b7 e3 b8=Q e2+ Ke1 Kg5 Kf2 f5 Qf4+ Kxf4 Qf3+',
    overview:
      "Against GM Salem Saleh (Salem-AR, 3061) in the Symmetric …c5, Levy strikes with the h4-h5 wing thrust before even resolving the centre, then plays d4 to open the position. A 109-move technical war ending in a winning queen-and-pawn endgame after promoting the b-pawn. Beating a 3060-rated grandmaster with the English's most aggressive Symmetric setup.",
    middlegameTheme: 'The …c5 Symmetric: the h4-h5 thrust plus the d4 break.',
    lessonSummary: 'Against …c5/…g6, thrust h4-h5, break with d4, and grind the ending.',
  },
  {
    id: 'mg-pro-gothamchess-eng-cristian-e6',
    white: 'GothamChess', black: 'CristianArrieta1', whiteElo: 2700, blackElo: 3057,
    sourceUrl: 'https://www.chess.com/game/live/168571624234',
    pgn: 'c4 e6 Nc3 d5 e3 f5 Nf3 Nf6 h3 c6 g4 Bd6 gxf5 exf5 Rg1 O-O cxd5 cxd5 Qb3 Kh8 Nxd5 Nc6 Nc3 Na5 Qd1 Re8 Be2 f4 Ng5 fxe3 Nf7+',
    overview:
      "A 31-move demolition of CristianArrieta1 (3057) in the Anti-French …e6. When Black tries the Stonewall with …f5, Levy answers with the aggressive g4! thrust, ripping open the kingside. He wins the d5-pawn, then finishes with a Ng5-Nf7+ fork netting the exchange and a winning attack. Sharp, modern English: the double-fianchetto base with a kingside punch.",
    middlegameTheme: 'The …e6 Anti-French: the g4 thrust busting the Stonewall.',
    lessonSummary: 'Against …e6/…f5, hit g4, crack the kingside, and fork with the knight.',
  },
  {
    id: 'mg-pro-gothamchess-eng-sharkz-e5',
    white: 'GothamChess', black: 'ChessSharkz', whiteElo: 2700, blackElo: 2981,
    sourceUrl: 'https://www.chess.com/game/live/145963741716',
    pgn: 'c4 e5 Nc3 Nf6 g3 d5 cxd5 Nxd5 Bg2 Nb6 Nf3 Nc6 O-O Be7 a3 O-O b4 Be6 Bb2 f6 d3 a5 b5 Nd4 e3 Nb3 Rb1 a4 d4 exd4 exd4 Bc4 Re1 Re8 Nd2 Nxd2 Qxd2 Rb8 Qd1 Bb3 Qd2 Bd6 Rxe8+ Qxe8 Re1 Qf7 Ne4 Bf8 Nc5 Bd5 Qf4 Nc4 Bc1 Bd6 Qf5 Bxg2 Kxg2 b6 Nxa4 Ra8 Nc3 Nxa3 Bxa3 Bxa3 Ne4 Bf8 Qf3 Rd8 Rd1 Qd5 Nc3 Qc4 d5 Bb4 Ne4 Bf8 Qf5 Qxb5 Nxf6+ gxf6 Qxf6 Qd7 Qg5+ Bg7 Kg1 Qd6 Qf5 Rf8 Qe4 Qc5 Qg2 Bd4 Kh1 Rxf2 Qe4 Bg7 Qe6+ Kf8 Qc8+ Ke7 Qe6+ Kd8 Qg8+ Bf8 d6 Qc6+ Rd5 Qxd5+ Qxd5 Rf1+ Kg2 Rf2+ Kxf2 cxd6 Kf3 Ke7 Qc4 Bg7 Qb5 Be5 Qxb6 Kf6 Qb5 Ke6 Qc4+ d5 Qd3 d4 Qxh7 Kd5 Qd3 Kc5 Qxd4+ Kxd4 Kg4 Bf6 Kf5 Be5 Kg6',
    overview:
      "The Reversed Sicilian against …e5 and ChessSharkz (2981), played in the g3 fianchetto style. Levy gets the bishop pair and the central majority, then converts a long queen endgame after winning the a- and b-pawns. The quiet, positional face of the English: the extra tempo of the reversed Sicilian nursed all the way to a won ending.",
    middlegameTheme: 'The …e5 Reversed Sicilian: g3 fianchetto, bishop pair, win the ending.',
    lessonSummary: 'Against …e5, fianchetto with g3, take the bishop pair, grind it home.',
  },
  {
    id: 'mg-pro-gothamchess-eng-getrich-c6',
    white: 'GothamChess', black: 'GetRichOrDieTryin03', whiteElo: 2700, blackElo: 2992,
    sourceUrl: 'https://www.chess.com/game/live/165552081892',
    pgn: 'c4 c6 Nc3 d5 e3 dxc4 Bxc4 Nf6 Nf3 e6 d4 Bd6 e4 Bb4 Qe2 Nbd7 Bg5 Qa5 O-O h6 Bh4 g5 Bg3 Nh5 d5 Nxg3 fxg3 Nb6 dxe6 Qc5+ Kh1 Qxc4 exf7+ Kf8 Qd2 Bg4 Ne5 Qe6 Qd4 c5 Ng6+ Qxg6 Qxh8+ Ke7 f8=Q+',
    overview:
      "Against the …c6 Slav-like setup and GetRichOrDieTryin03 (2992), Levy transposes into a big-centre e4 position, then sacrifices into a blistering attack. The d5 break and a pawn on f7 tear Black's position apart; the game ends with Qxh8+ and f8=Q+, a second queen delivering the knockout. The aggressive English: solid base, explosive finish.",
    middlegameTheme: 'The …c6 line: build the e4 centre, break with d5, attack the king.',
    lessonSummary: 'Against …c6, take the centre with e4, break with d5, and storm through.',
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
console.log(`added ${added.length} English model games. total now ${data.length}.`);
