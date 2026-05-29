#!/usr/bin/env node
import { Chess } from 'chess.js';

const GAMES = [
  // Alekhine
  {
    id: 'mg-pro-naroditsky-alekhine-philippians-1',
    openingId: 'pro-naroditsky-alekhine',
    white: 'Philippians46', black: 'Daniel Naroditsky',
    whiteElo: 3462, blackElo: 3000, result: '0-1',
    year: 2024, event: 'chess.com bullet (2024)',
    pgn: "e4 Nf6 e5 Nd5 d4 Nb6 Nf3 d6 Bc4 dxe5 Bb5+ c6 Nxe5 cxb5 Qf3 Be6 Qxb7 Bd5 Nc6 Bxc6 Qxc6+ Nxc6 Nc3 Nxd4 Nxb5 Ne2 Kxe2 Qd7 Nc3 Qe6+ Be3 Nc4 Ke1 Nxe3 Ne2 Nxc2+ Kd2 Nxa1 Nd4 Qd6 Ke3 Qxd4+ Kxd4 Rd8+ Ke3 Nc2+ Kf3 Nd4+ Kg3 Ne6 Kh3 Nf4+ Kg3 Ng6 Kf3 Ne5+ Kg3 Nd7 Kh3 f6 g3 e6 Kg2 Ne5 Kh3 Ng6 Kg2 Nf4+ Kf3 Rd5",
    sourceUrl: 'https://www.chess.com/game/live/136582792543',
    studentSide: 'black',
    overview: "Philippians46 0-1 Naroditsky, 70-move Alekhine vs Bc4 system. Naro's …Nb6 + tactical ...cxb5 + Nxd4 sequence wins clean material; positional grind to victory.",
    criticalMoments: [],
    middlegameTheme: 'Black tactical takeover',
    lessonSummary: "Philippians46 0-1 Naroditsky, 70-move Alekhine vs Bc4 system. Naro's …Nb6 + tactical ...cxb5 + Nxd4 sequence wins clean material; positional grind to victory.",
  },
  {
    id: 'mg-pro-naroditsky-alekhine-firouzja-1',
    openingId: 'pro-naroditsky-alekhine',
    white: 'Firouzja2003', black: 'Daniel Naroditsky',
    whiteElo: 3392, blackElo: 3000, result: '0-1',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "e4 Nf6 Nc3 e5 Bc4 Bc5 d3 d6 Nf3 Be6 O-O Nc6 Bxe6 fxe6 Be3 Bb6 Bxb6 axb6 Re1 O-O d4 exd4 Nxd4 Nxd4 Qxd4 d5 exd5 exd5 Rad1 c5 Qe5 d4 Qe6+ Kh8 Ne4 Nxe4 Rxe4 Qg5 g3 Rf6 Qe8+ Rf8 Qe6 h6 Qe7 Qxe7 Rxe7 Rxa2 Rb1 Rb8 Re6 b5 Rb6 b4 Rb5 b6 Kf1 Ra5 Ke2 Rxb5 Kd3 Ra5 Kc4 Rba8",
    sourceUrl: 'https://www.chess.com/game/live/5873074787',
    studentSide: 'black',
    overview: "Firouzja2003 0-1 Naroditsky, 64-move Alekhine vs Italian-style Nc3 + Bc4. Naro's central pawn duo + active rooks ends in a winning R+P endgame.",
    criticalMoments: [],
    middlegameTheme: 'Central pawns + active rooks',
    lessonSummary: "Firouzja2003 0-1 Naroditsky, 64-move Alekhine vs Italian-style Nc3 + Bc4. Naro's central pawn duo + active rooks ends in a winning R+P endgame.",
  },

  // Jobava London
  {
    id: 'mg-pro-naroditsky-jobava-penguingm1-1',
    openingId: 'pro-naroditsky-jobava-london',
    white: 'Daniel Naroditsky', black: 'penguingm1',
    whiteElo: 3300, blackElo: 3480, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "d4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6 Nf3 O-O Bxd6 cxd6 Bd3 a6 e4 dxe4 Nxe4 b6 Qe2 Bb7 O-O-O Nxe4 Bxe4 Bxe4 Qxe4 Nd7 h4 Rc8 Kb1 Nf6 Qd3 b5 g4 Nd5 Ng5 g6 Qd2 Qe7 h5 h6 Ne4 g5 Rhe1 Rc7 c3 Rfc8 Ng3 b4 cxb4 Qd7 Rc1 Qb5 a3 a5 bxa5 Qb3 Ne4 Rb8 Nf6+ Nxf6 Rxc7 Nd5 Rcc1 Kg7 Re3 Qa4 Rf3 Rb5 Qc2 Qxa5 Rxf7+ Kxf7 Qh7+ Ke8 Rc8+ Qd8 Qg8+ Kd7 Qxd8#",
    sourceUrl: 'https://www.chess.com/game/live/5859859959',
    studentSide: 'white',
    overview: "Naroditsky 1-0 penguingm1 (3480), 79-move Jobava London vs Bd6 trade setup. Opposite-side castling AND piece reroute wins the kingside attack, finishes Qxd8#.",
    criticalMoments: [],
    middlegameTheme: 'Opposite-side castle attack',
    lessonSummary: "Naroditsky 1-0 penguingm1 (3480), 79-move Jobava London vs Bd6 trade setup. Opposite-side castling AND piece reroute wins the kingside attack, finishes Qxd8#.",
  },
  {
    id: 'mg-pro-naroditsky-jobava-penguingm1-2',
    openingId: 'pro-naroditsky-jobava-london',
    white: 'Daniel Naroditsky', black: 'penguingm1',
    whiteElo: 3300, blackElo: 3453, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "d4 d5 Nc3 e6 Bf4 Nf6 e3 Bd6 Nf3 O-O Bd3 a6 O-O b5 Bg5 Bb7 Ne5 Nbd7 f4 c5 Nxd7 Qxd7 Bxf6 gxf6 Qg4+ Kh8 Qh4 f5 Qf6+ Kg8 Rf3 Rfc8 Rg3+ Kf8 Rg7 Qe7 Qh6 Ke8 Qxh7 cxd4 exd4 Bxf4 Re1 Qf6 Bxf5 Rc6 Nxd5 Qxd4+ Kh1 Qxd5 Qg8+ Kd7 Qxf7+ Kd6 Qe7#",
    sourceUrl: 'https://www.chess.com/game/live/5859472049',
    studentSide: 'white',
    overview: "Naroditsky 1-0 penguingm1 (3453), 55-move Jobava London vs Bd6 + Bg5 trade. Sharp kingside attack with sacs + queen-and-bishop coordination ends Qe7#.",
    criticalMoments: [],
    middlegameTheme: 'Kingside attack',
    lessonSummary: "Naroditsky 1-0 penguingm1 (3453), 55-move Jobava London vs Bd6 + Bg5 trade. Sharp kingside attack with sacs + queen-and-bishop coordination ends Qe7#.",
  },

  // Ruy Lopez
  {
    id: 'mg-pro-naroditsky-ruy-penguingm1-1',
    openingId: 'pro-naroditsky-ruy-lopez',
    white: 'Daniel Naroditsky', black: 'penguingm1',
    whiteElo: 3300, blackElo: 3474, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "e4 e5 Nf3 Nc6 Bb5 g6 c3 Bg7 d4 exd4 cxd4 a6 Ba4 b5 Bc2 d6 O-O Bg4 h3 Bxf3 Qxf3 Nxd4 Qd1 Ne7 Nc3 O-O Bg5 h6 Bh4 g5 Bg3 c5 Rc1 Qd7 Bb1 Rae8 Ne2 f5 Nxd4 Bxd4 Qh5 Kg7 exf5 Nxf5 Bh2 Qf7 Qg4 Re6 Rcd1 Rf6 Kh1 Ne3 Qe4 Re8 Qh7+ Kf8 Qxf7+ Kxf7 fxe3 Rxe3 Bxd6 Rxf1+ Rxf1+ Ke6 Bf8 c4 Bxh6 Re5 Bg7 Rd5 Re1+ Kd6 Bxd4 Rxd4 Bc2 Kc5 Rd1 Rf4 Kg1 Rf8 g3 a5 Kg2 a4 h4 a3 g4 axb2 h5 Kb4 h6 Kc3 Bb1 b4 h7 b3 axb3 Kxb3 Rh1 Rh8 Rh3+ c3 Kf2 Rf8+ Ke2 Re8+ Kf2 Rf8+ Kg2 Rh8 Rf3 Kb4 Kf2 Kb3 Re3 Rf8+ Ke2 Rd8 Rd3 Re8+ Re3 Rf8 Re7 Rh8 Rb7+ Kc4 Rc7+ Kd4 Rd7+ Kc4 Bd3+ Kb3 Rb7+ Ka3 Kd1 Rd8 Kc2 Rxd3 Kxd3 c2 Kxc2 b1=Q+ Rxb1",
    sourceUrl: 'https://www.chess.com/game/live/5859021320',
    studentSide: 'white',
    overview: "Naroditsky 1-0 penguingm1 (3474), 143-move Ruy Lopez vs ...g6 sideline. Marathon endgame with two bishops + rook conversion; deep technique decides.",
    criticalMoments: [],
    middlegameTheme: 'Long-grind endgame',
    lessonSummary: "Naroditsky 1-0 penguingm1 (3474), 143-move Ruy Lopez vs ...g6 sideline. Marathon endgame with two bishops + rook conversion; deep technique decides.",
  },
  {
    id: 'mg-pro-naroditsky-ruy-penguingm1-2',
    openingId: 'pro-naroditsky-ruy-lopez',
    white: 'Daniel Naroditsky', black: 'penguingm1',
    whiteElo: 3300, blackElo: 3468, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 d4 Nxd4 Nxd4 exd4 c3 dxc3 Nxc3 O-O Bg5 Bb7 Rc1 h6 Bh4 Re8 Bg3 Bf8 a4 Nxe4 Qf3 d5 Nxe4 bxa4 Ba2 Bb4 Nc3 Qd7 Rxe8+ Rxe8 Bxd5 Bxc3 Bxb7 Bxb2 Rd1 Qe7 h3 a3 Bd5 Rd8 Bxf7+ Kh8 Rxd8+ Qxd8 Ba2 Qf6 Qa8+ Kh7 Bb1+ g6 Qb7 Qb6 Qd5 Bg7 Ba2 c5 Qg8#",
    sourceUrl: 'https://www.chess.com/game/live/5858867761',
    studentSide: 'white',
    overview: "Naroditsky 1-0 penguingm1 (3468), 69-move Ruy Lopez closed mainline. Bxf7+ sacrifice + queen battery wins; ends with Qg8# mate.",
    criticalMoments: [],
    middlegameTheme: 'Bxf7+ sacrifice',
    lessonSummary: "Naroditsky 1-0 penguingm1 (3468), 69-move Ruy Lopez closed mainline. Bxf7+ sacrifice + queen battery wins; ends with Qg8# mate.",
  },
];

const out = [];
for (const g of GAMES) {
  const ch = new Chess();
  let ok = true;
  for (const san of g.pgn.split(/\s+/).filter(Boolean)) {
    try { ch.move(san); } catch (e) { console.error(`SKIP ${g.id}: illegal ${san}`); ok = false; break; }
  }
  if (!ok) continue;
  out.push(g);
}
console.error(`Built ${out.length} / ${GAMES.length} model games`);
console.log(JSON.stringify(out, null, 2));
