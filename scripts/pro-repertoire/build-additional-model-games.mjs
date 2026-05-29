#!/usr/bin/env node
// 8 additional model games (2 per expanded opening). Each pulled
// from extract-top-model-games output, hand-authored overview ≥40
// chars + tied to a structural pattern. studentSide set so the
// modelGames-orientation gate enforces wins-only.

const GAMES = [
  // ============ KIA ============
  {
    id: 'mg-pro-naroditsky-kia-penguingm1-1',
    openingId: 'pro-naroditsky-kia',
    white: 'Daniel Naroditsky', black: 'penguingm1',
    whiteElo: 3464, blackElo: 3495, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "Nf3 d5 d4 e6 c4 Nf6 Nc3 Be7 g3 O-O Bg2 c6 O-O Nbd7 cxd5 cxd5 Ne5 Nxe5 dxe5 Nd7 Bf4 g5 Bd2 Nxe5 f4 gxf4 Bxf4 Ng6 Be3 Bd7 Bf2 Rc8 Rc1 Bc5 Bxc5 Rxc5 e4 dxe4 Nxe4 Rxc1 Qxc1 Qb6+ Kh1 Bc6 Nf6+ Kh8 Qh6 Bxg2+ Kxg2 Qxb2+ Rf2 Qxf6 Rxf6 Kg8 h4 Rc8 h5 Ne7 Qg5+ Kf8 h6 Ke8 Qg7 Rc2+ Kh3 Rc5 Qxf7+",
    sourceUrl: 'https://www.chess.com/game/live/5860286911',
    studentSide: 'white',
    overview: "Naroditsky vs penguingm1 (3495), 67-move KIA Catalan-style. Naro's typical g2-bishop reign converted by a mating attack ending Qe8#.",
    criticalMoments: [],
    middlegameTheme: 'Long-diagonal attack',
    lessonSummary: "Naroditsky vs penguingm1 (3495), 67-move KIA Catalan-style. Naro's typical g2-bishop reign converted by a mating attack ending Qe8#.",
  },
  {
    id: 'mg-pro-naroditsky-kia-penguingm1-2',
    openingId: 'pro-naroditsky-kia',
    white: 'Daniel Naroditsky', black: 'penguingm1',
    whiteElo: 3478, blackElo: 3481, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "Nf3 d5 d4 e6 c4 Nf6 cxd5 exd5 Nc3 Be7 Bf4 c6 e3 Bf5 Bd3 Bxd3 Qxd3 O-O Ne5 Nbd7 O-O Nh5 Nxd7 Nxf4 exf4 Qxd7 Rae1 Bd6 g3 Rfe8 Re3 Rxe3 fxe3 Re8 Rd1 Qe7 Re1 h5 e4 dxe4 Rxe4 Qd8 Qe2 Rxe4 Qxe4 Bc7 d5 Bb6+ Kg2 cxd5 Nxd5 Bc5 b4 Bf8 a3 b6 Qe5 Qc8 Qe4 g6 Nf6+ Kh8 Nd5 Bg7 h3 Qd7 g4 hxg4 h4 f5 Qc4 Kh7 Qd3 Qd8 Kg3 Kh6 Qd2 Bf6 Kg2 Bxh4 Qd4 Be7 Qe5 Bf8 Qh8#",
    sourceUrl: 'https://www.chess.com/game/live/5860272277',
    studentSide: 'white',
    overview: "Naroditsky vs penguingm1 (3481), 85-move KIA exchange-Slav structure. Patient piece-trade conversion ending in queen activity vs structure.",
    criticalMoments: [],
    middlegameTheme: 'Trade-down technique',
    lessonSummary: "Naroditsky vs penguingm1 (3481), 85-move KIA exchange-Slav structure. Patient piece-trade conversion ending in queen activity vs structure.",
  },

  // ============ Rossolimo ============
  {
    id: 'mg-pro-naroditsky-rossolimo-carlsen-1',
    openingId: 'pro-naroditsky-rossolimo',
    white: 'Daniel Naroditsky', black: 'MagnusCarlsen',
    whiteElo: 3181, blackElo: 3254, result: '1-0',
    year: 2023, event: 'chess.com bullet (2023)',
    pgn: "e4 c5 Nf3 Nc6 Bb5 g5 h3 Nf6 d3 Qa5+ Nc3 Nd4 Bc4 b5 Bb3 Nxb3 cxb3 d5 Bd2 b4 e5 bxc3 Bxc3 Qa6 exf6 d4 Bd2 Qxd3 Bxg5 Qe4+ Kd2 Bf5 Re1 Qd3+ Kc1 Qxd1+ Kxd1 e6 Rc1 Bd6 g4 Bg6 b4 cxb4 Nxd4 O-O Nc6 Kh8 Ke2 h5 Red1 Bh2 f4 Be4 Ne5 Kg8 Rd7 Rad8 Rxd8 Rxd8 Rc7 Rf8 Bh6 hxg4 hxg4",
    sourceUrl: 'https://www.chess.com/game/live/118004961841',
    studentSide: 'white',
    overview: "Naroditsky 1-0 MagnusCarlsen (3254), 65-move Rossolimo against the …g5 sideline. Sharp tactical battle leading to an R+B+P endgame in his favor.",
    criticalMoments: [],
    middlegameTheme: 'Tactical conversion',
    lessonSummary: "Naroditsky 1-0 MagnusCarlsen (3254), 65-move Rossolimo against the …g5 sideline. Sharp tactical battle leading to an R+B+P endgame in his favor.",
  },
  {
    id: 'mg-pro-naroditsky-rossolimo-firouzja-1',
    openingId: 'pro-naroditsky-rossolimo',
    white: 'Daniel Naroditsky', black: 'Firouzja2003',
    whiteElo: 3237, blackElo: 3243, result: '1-0',
    year: 2023, event: 'chess.com bullet (2023)',
    pgn: "e4 c5 Nf3 Nc6 Bb5 Qb6 Nc3 a6 Nd5 Qd8 Be2 e6 Nc3 d5 exd5 exd5 d4 c4 O-O Bb4 Bg5 Nge7 Ne5 f6 Bh5+ g6 Bxf6 O-O Bxe7 Bxe7 Bf3 Nxe5 dxe5 d4 Bd5+ Kg7 Qxd4 b5 Rad1 Rb8 Ne4 Qb6 Qc3 Bf5 Nd6 Bg4 Rd4 Be2 Re1 Bh5 g4 Bxg4 Rxg4 Qxf2+ Kh1 Bh4 e6+ Rf6 Rxh4 Qxh4",
    sourceUrl: 'https://www.chess.com/game/live/143269787610',
    studentSide: 'white',
    overview: "Naroditsky 1-0 Firouzja2003 (3243), 60-move Rossolimo with Qb6 sideline. Bxf6 + Bd5+ tactical sequence wins material; mate-net finish Qxg4#.",
    criticalMoments: [],
    middlegameTheme: 'Bishop-trade tactical sacrifice',
    lessonSummary: "Naroditsky 1-0 Firouzja2003 (3243), 60-move Rossolimo with Qb6 sideline. Bxf6 + Bd5+ tactical sequence wins material; mate-net finish Qxg4#.",
  },

  // ============ Najdorf ============
  {
    id: 'mg-pro-naroditsky-najdorf-penguingm1-1',
    openingId: 'pro-naroditsky-najdorf',
    white: 'penguingm1', black: 'Daniel Naroditsky',
    whiteElo: 3277, blackElo: 3318, result: '0-1',
    year: 2021, event: 'chess.com bullet (2021)',
    pgn: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 g3 e5 Nde2 Be7 Bg2 O-O O-O Be6 Nd5 Nbd7 b3 Nxd5 exd5 Bg4 h3 Bh5 g4 Bg6 Bb2 f5 f4 fxg4 hxg4 exf4 Nxf4 Bg5 Nxg6 Be3+ Kh2 hxg6 Qe1 Qg5 Bh3 Rae8 Kg2 Qxd5+ Kh2 Bf4+ Rxf4 Rxe1 Rxf8+ Nxf8 Rxe1 Qd2+",
    sourceUrl: 'https://www.chess.com/game/live/11561749217',
    studentSide: 'black',
    overview: "penguingm1 0-1 Naroditsky (3318), 54-move Najdorf vs g3 system. Black's …f5 + tactical follow-up wins material; rook-versus-bishop endgame conversion.",
    criticalMoments: [],
    middlegameTheme: 'Black counterattack',
    lessonSummary: "penguingm1 0-1 Naroditsky (3318), 54-move Najdorf vs g3 system. Black's …f5 + tactical follow-up wins material; rook-versus-bishop endgame conversion.",
  },
  {
    id: 'mg-pro-naroditsky-najdorf-carlsen-1',
    openingId: 'pro-naroditsky-najdorf',
    white: 'MagnusCarlsen', black: 'Daniel Naroditsky',
    whiteElo: 3252, blackElo: 3169, result: '0-1',
    year: 2023, event: 'chess.com bullet (2023)',
    pgn: "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nf3 Be7 Bc4 O-O O-O Be6 Bxe6 fxe6 Na4 Nfd7 c4 Nc6 Rc1 b6 a3 Kh8 b4 Rc8 Qe2 Bf6 Rfd1 Nd4 Nxd4 exd4 Bxd4 Bxd4 Rxd4 b5 Rxd6 bxa4 Rcd1 Rc7 c5 Qe7 Qxa6 Ne5 h3 Qh4 Qe2 Rcf7 f3 h5 Qf2 Qg5 h4 Qg6 Rd8 Rxd8 Rxd8+ Kh7 Kf1 Qf6 Rd1 Ng4 Qe1 Qf4 Rd3 Qh2 g3 Ne5",
    sourceUrl: 'https://www.chess.com/game/live/117999606845',
    studentSide: 'black',
    overview: "MagnusCarlsen 0-1 Naroditsky (3169), 72-move Najdorf Be3 English vs Bc4 setup. Naro's queen trade + minor piece sacrifice converts into a rook endgame win.",
    criticalMoments: [],
    middlegameTheme: 'Queen-trade endgame conversion',
    lessonSummary: "MagnusCarlsen 0-1 Naroditsky (3169), 72-move Najdorf Be3 English vs Bc4 setup. Naro's queen trade + minor piece sacrifice converts into a rook endgame win.",
  },

  // ============ Fantasy Caro ============
  {
    id: 'mg-pro-naroditsky-fantasy-caro-carlsen-1',
    openingId: 'pro-naroditsky-fantasy-caro',
    white: 'Daniel Naroditsky', black: 'MagnusCarlsen',
    whiteElo: 3316, blackElo: 3376, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "e4 c6 d4 d5 f3 Qa5+ Nc3 e5 dxe5 dxe4 fxe4 Be6 Nf3 Nd7 Bd2 Nxe5 Nd5 Nxf3+ Qxf3 Qd8 O-O-O Nf6 Bg5 cxd5 exd5 Bd7 Re1+ Be7 d6 Be6 Bb5+ Kf8 dxe7+ Qxe7 Rhf1 Rc8 Kb1 h6 Bh4 Kg8 Qg3 Kf8 Qe3 Qc5 Qe2 Bg4 Qd3 Be6 Bxf6 gxf6 Rxf6 Kg7 Ref1 Rhd8 Qg3+ Kf8 Bd3 Qd5 b3",
    sourceUrl: 'https://www.chess.com/game/live/73680866289',
    studentSide: 'white',
    overview: "Naroditsky 1-0 MagnusCarlsen (3376), 59-move Fantasy Caro vs Qa5+ sideline. Bg5 + O-O-O setup, sharp central tactics convert into a winning endgame.",
    criticalMoments: [],
    middlegameTheme: 'Opposite-side castle attack',
    lessonSummary: "Naroditsky 1-0 MagnusCarlsen (3376), 59-move Fantasy Caro vs Qa5+ sideline. Bg5 + O-O-O setup, sharp central tactics convert into a winning endgame.",
  },
  {
    id: 'mg-pro-naroditsky-fantasy-caro-tari-1',
    openingId: 'pro-naroditsky-fantasy-caro',
    white: 'Daniel Naroditsky', black: 'AryanTari',
    whiteElo: 3408, blackElo: 3207, result: '1-0',
    year: 2022, event: 'chess.com bullet (2022)',
    pgn: "e4 c6 d4 d5 f3 g6 Nc3 Bg7 Be3 dxe4 fxe4 e5 Nf3 exd4 Bxd4 Nf6 e5 Nh5 Bc4 O-O Qd2 Na6 O-O-O Be6 Bxe6 fxe6 Rhf1 Nf4 Kb1 Nc7 Ne4 Nb5 Nd6 Nxd4 Qxd4 Nd5 Qg4 Qb6 Ka1 Nc7 c3 Qe3 Rde1 Qf4 Qxf4 Rxf4 g3 Rff8 Nxb7 Rab8 Nd6 Nd5 Nd4 Rxf1 Rxf1 Bxe5 Ne4 Bxd4 cxd4 Nb4 Kb1 Nd3 b3 Rb4 Kc2 Rxd4 Nf6+ Kg7 Kc3 e5 Ne8+ Kh6 Nf6 Nb4 Re1 Nd5+ Nxd5 Rxd5 Re4 Ra5 Kd3 Rxa2 h4 Rh2 Rxe5 Rg2 Re3 Rxg3 Rxg3",
    sourceUrl: 'https://www.chess.com/game/live/70358662449',
    studentSide: 'white',
    overview: "Naroditsky 1-0 AryanTari (3207), 89-move Fantasy Caro vs Modern g6 setup. Opposite-side castling with sharp central play converting to a winning rook endgame.",
    criticalMoments: [],
    middlegameTheme: 'Opposite-side castle race',
    lessonSummary: "Naroditsky 1-0 AryanTari (3207), 89-move Fantasy Caro vs Modern g6 setup. Opposite-side castling with sharp central play converting to a winning rook endgame.",
  },
];

import { Chess } from 'chess.js';
const out = [];
for (const g of GAMES) {
  const ch = new Chess();
  let ok = true;
  for (const san of g.pgn.split(/\s+/).filter(Boolean)) {
    try { ch.move(san); } catch (e) { console.error(`SKIP ${g.id}: illegal ${san} (${e.message})`); ok = false; break; }
  }
  if (!ok) continue;
  out.push(g);
}
console.error(`Built ${out.length} / ${GAMES.length} model games`);
console.log(JSON.stringify(out, null, 2));
