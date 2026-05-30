#!/usr/bin/env node
// Marquee GothamChess Ponziani model games — real WHITE WINS, distinct
// opponents. G9.1: wins only, hand-authored overviews. chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-ponziani';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-ponziani-aryantari-main',
    white: 'GothamChess', black: 'AryanTari', whiteElo: 2700, blackElo: 2908,
    sourceUrl: 'https://www.chess.com/game/live/100999372447',
    pgn: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 exd4 e5 Nd5 Qb3 Nb6 cxd4 d6 Bb5 Be6 Qc2 Qd7 O-O a6 Bxc6 Qxc6 Qxc6+ bxc6 Bf4 Nd5 Bg3 h6 Rc1 Kd7 Nbd2 Be7 Nc4 a5 Nfd2 Bf5 Ne3 Nxe3 fxe3 Rhb8 b3 a4 Kf2 Be6 bxa4 Rxa4 Rc2 Rba8 Ne4 Bf5 Kf3 d5 Nc5+ Bxc5 Rxc5 Be4+ Kg4 Rxa2 Rf1 Bg6 Kh3 Re2 Rf3 Raa2 Rc1 Rxg2 Rc3 Rgb2 Kg4 Rc2 Rb3 Ke6 Rb7 Bd3 Rf4 Bg6 Rxc7 Ra3 Bh4 Bf5+ Rxf5 Rg2+ Kh3 Kxf5 Kxg2 Rxe3 Bf2 Re2 Rxf7+ Kg6 Rf3 Re4 Rg3+ Kf7 Kf3 g5 Rg4 Rxg4 Kxg4 Kg6 h4 h5+ Kf3 Kf5 hxg5 Kxg5 Be3+ Kf5 Bf2 c5 dxc5 Kxe5 Ke2 Ke6 Kd3 Kd7 Kd4 Ke6 Bg3',
    overview:
      "The headline Ponziani game: Levy beats GM Aryan Tari (2908) with his pet opening. The exact Qb3 + Bb5 main-line plan, trading into a favourable endgame where the extra space and the better minor pieces grind down a top grandmaster across 119 moves. Proof the Ponziani is a serious weapon even at the highest level.",
    middlegameTheme: 'The main line: Qb3 + Bb5, trade into a winning endgame.',
    lessonSummary: 'Play Qb3 and Bb5, then convert the structural edge in the ending.',
  },
  {
    id: 'mg-pro-gothamchess-ponziani-seochesspie-nxe4',
    white: 'GothamChess', black: 'Seochesspie', whiteElo: 2700, blackElo: 2854,
    sourceUrl: 'https://www.chess.com/game/live/110045539653',
    pgn: 'e4 e5 Nf3 Nc6 c3 Nf6 d4 Nxe4 d5 Ne7 Nxe5 Ng6 Qd4 Nxe5 Qxe4 Qe7 Be2 Ng6 Qd3 Qf6 O-O Bd6 Nd2 O-O Ne4 Qe7 Nxd6 Qxd6 Qd4 c5 Qd1 b6 f4 Bb7 c4 f5 g3 Qf6 Rb1 Rae8 Bd3 d6 b3 Qd4+ Rf2 Re7 Bb2 Qe3 Kg2 Rfe8 Qc2 Bc8 Rf3 Qe2+ Bxe2 Rxe2+ Qxe2 Rxe2+ Rf2 Re8 Bc3 Kf7 Re1 Rxe1 Bxe1 Nf8 Bc3 Nd7 Re2 Nf8 h3 Ng6 Kf3 Bd7 g4 fxg4+ hxg4 b5 f5 Nf8 Ba5 bxc4 bxc4 Bc8 Bc7 Ba6 Re4 Nd7 Bxd6 Nb6 Re7+ Kf6 Rxa7 Bxc4 Be7+ Kf7 Bxc5+',
    overview:
      "Against the 4…Nxe4 try and Seochesspie (2854), Levy recovers the pawn with the d5/Nxe5 sequence, reaches a slightly better middlegame, and outplays his opponent in a long technical grind. The dark-squared bishop and the queenside majority decide, finishing by mopping up the queenside pawns. Patient Ponziani technique.",
    middlegameTheme: 'The 4…Nxe4 line: recover the pawn, grind the better minor piece.',
    lessonSummary: 'Against 4…Nxe4, regain the pawn with d5/Nxe5 and grind the ending.',
  },
  {
    id: 'mg-pro-gothamchess-ponziani-chess123-qa4',
    white: 'GothamChess', black: 'chess123456s', whiteElo: 2700, blackElo: 2892,
    sourceUrl: 'https://www.chess.com/game/live/169183551298',
    pgn: 'e4 e5 Nf3 Nc6 c3 d5 Qa4 f6 Bb5 Ne7 d4 dxe4 Nfd2 exd4 Nxe4 Qd5 Nbd2 a6 Bc4 Qh5 Be2 Bg4 f3 Bd7 O-O Qg6 Bd3 Ne5 Nd6+ cxd6 Bxg6+ N7xg6 Qxd4 Bc6 Ne4 d5 Nc5 b6 Ne6 Bd6 Qxb6 Kd7 Nc5+ Ke7 Nb3 Rhb8 Qe3 Kf7 Nd4 Bd7 b3 Ne7 Bb2 Bc5 Kh1 Nf5 Qd2 Nd6 Rae1',
    overview:
      "Against the 3…d5 counter and chess123456s (2892), Levy plays the Qa4 pin line, sacrifices a knight on d6 to expose the queen, then wins material with Bxg6+ and Qxd4. The knight tour Ne4-c5-e6 dominates, and White emerges with a decisive material and positional advantage. A sharp demonstration of the Qa4 antidote.",
    middlegameTheme: 'The 3…d5 Qa4 line: Nd6 sacrifice, win with Bxg6+.',
    lessonSummary: 'Against 3…d5, pin with Qa4 and find the Nd6/Bxg6+ tactic.',
  },
  {
    id: 'mg-pro-gothamchess-ponziani-stollen-d5',
    white: 'GothamChess', black: 'stollenmonster', whiteElo: 2700, blackElo: 2880,
    sourceUrl: 'https://www.chess.com/game/live/99166501765',
    pgn: 'e4 e5 Nf3 Nc6 c3 d5 Qa4 Bd7 exd5 Nd4 Qd1 Nxf3+ Qxf3 Nf6 Bc4 Bc5 d3 h6 Be3 Qe7 Nd2 O-O h3 Rae8 O-O c6 Ne4 Nxe4 dxe4 Kh8 Rad1 f5 exf5 Bxf5 Qg3 Bd6 dxc6 bxc6 Rfe1 Rf6 Qh4 Qc7 Bd3 e4 Bc2 Rg6 Qh5 Rf8 Kh1 Bf4 Bc5 Rg5 Qh4 Re8 Be3 Bxe3 Rxe3 Bg6 Rde1 Rf8 Bxe4 Bxe4 Rxe4 Qb8 R4e2 Kh7 b3 Qb5 Qe4+ Kh8 c4 Qa5 Qc2 Rgf5 f3 Qd8 Qe4 Rf4 Qe3 Qh4 Qxa7 Rxf3 Qe7 Rf1+ Rxf1 Rxf1+ Kh2 Qf4+ g3 Rf2+ Rxf2 Qxf2+ Kh1 Qf1+ Kh2 Qf2+ Kh1 Qxg3 Qe8+ Kh7 Qe4+ g6 Qg2 Qe1+ Kh2 Qe5+ Kg1 Qe1+ Qf1 Qe3+ Kg2 Qg5+ Kh1 Qd2 Qf7+ Kh8 Qf6+ Kh7 Qf7+ Kh8 Qxg6 Qd1+ Qg1 Qd3 Qg2 Qd1+ Kh2 Qd6+ Kg1 Qd1+ Qf1 Qd2 Qf6+ Kh7 Qxc6 Qxa2 Qd7+ Kg6 Qd3+ Kg7 Qc3+ Kh7 c5 Qb1+ Kf2 Qf5+ Ke1 Qe4+ Kd2 Qg2+ Kc1 Qf1+ Kb2 Kg8 Qc4+',
    overview:
      "A 155-move marathon against the 3…d5 line and stollenmonster (2880). Levy reaches a better structure, wins the exchange, and survives a fierce queen-endgame counterattack to convert the extra material. A testament to Ponziani endgame technique under maximum pressure against a strong opponent.",
    middlegameTheme: 'The 3…d5 line: win the exchange, convert under pressure.',
    lessonSummary: 'Against 3…d5, build the better structure and grind out the win.',
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
console.log(`added ${added.length} Ponziani model games. total now ${data.length}.`);
