#!/usr/bin/env node
// GothamChess Milner-Barry Gambit model games — real WHITE WINS vs strong
// opponents, all showing the gambit attack. chess.js-validated.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-milner-barry';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-mb-c63amg-attack',
    white: 'GothamChess', black: 'c63_amg', whiteElo: 2700, blackElo: 2862,
    sourceUrl: 'https://www.chess.com/game/live/74360656363',
    pgn: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 Bd7 dxc5 Bxc5 O-O a5 Nbd2 a4 b4 axb3 Nxb3 Ba3 Bxa3 Rxa3 Qc1 Ra4 Qg5 Nge7 Qxg7 Rg8 Qxh7 Rag4 g3 Nf5 Bxf5 exf5 Nbd4 Ne7 Rab1 Qc7 Rfe1 f4 Qd3 fxg3 hxg3 Be6 Nb5 Qc5 Nd6+ Kf8 Nd4 Nc6 Nxe6+ fxe6 Qf3+ Kg7 Qxg4+ Kh8 Qh5+ Kg7 Qf7+ Kh8 Kg2',
    overview:
      "The Milner-Barry attack against the 2862-rated c63_amg. Levy grabs the g7- and h7-pawns with the queen, then weaves a mating net with the knights and queen against the exposed king. A spectacular demonstration of the gambit's raging initiative — the pawn sacrifice transformed into a crushing kingside attack against a near-master.",
    middlegameTheme: 'The gambit attack: Qxg7/Qxh7, mate the exposed king.',
    lessonSummary: 'Sacrifice for the initiative and hunt the king with the heavy pieces.',
  },
  {
    id: 'mg-pro-gothamchess-mb-lothar-fstorm',
    white: 'GothamChess', black: 'Lothar_Phantom', whiteElo: 2700, blackElo: 2715,
    sourceUrl: 'https://www.chess.com/game/live/75054170149',
    pgn: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 O-O Bd7 cxd4 Nxd4 Nbd2 Nxf3+ Nxf3 Bb5 Be3 Qa6 Bxb5+ Qxb5 a4 Qd7 Nd4 Ne7 f4 Nc6 f5 Nxd4 Bxd4 exf5 Qd3 Rc8 Rxf5 Bc5 Rg5 O-O Rxg7+ Kxg7 e6+',
    overview:
      "The f4-f5 kingside storm in its purest form against Lothar_Phantom (2715). Levy plays the gambit, develops with tempo, then rolls f4-f5 to crack open the king. The finish is brilliant: Rxg7+! Kxg7 e6+ — a discovered attack that wins the queen. The model for the Milner-Barry's f-pawn storm.",
    middlegameTheme: 'The f4-f5 storm: crack the king, Rxg7+ discovery.',
    lessonSummary: 'Storm with f4-f5 and find the Rxg7+ breakthrough.',
  },
  {
    id: 'mg-pro-gothamchess-mb-emilio-bxh7',
    white: 'GothamChess', black: 'Emilio_Profili', whiteElo: 2700, blackElo: 2713,
    sourceUrl: 'https://www.chess.com/game/live/71446593013',
    pgn: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Bd3 cxd4 cxd4 Bd7 O-O Nxd4 Nbd2 Rc8 Nxd4 Qxd4 Nf3 Qb6 h4 Bc5 Rb1 Qb4 a3 Qg4 b4 Bb6 a4 Ne7 a5 Bd8 Be3 a6 b5 axb5 Bxb5 Nc6 a6 bxa6 Bxa6 Rb8 Be2 Rxb1 Qxb1 Qb4 Qc2 O-O Rb1 Qe4 Bd3 Qg4 Bxh7+ Kh8 Rb7 Be8 Qc5 Be7 Rxe7 Kxh7 Rc7 Kg8 Bc1 Nb4 Ba3 Nd3 Qxf8+ Kh7 Qxe8 Nf4 Ng5+ Kh6 Nxf7+ Kg6 Nh6+',
    overview:
      "A long Milner-Barry grind against Emilio_Profili (2713), showing the gambit's positional side. Levy regains the initiative on the queenside with a3-b4-a5, opens lines, then finishes with the classic Bxh7+ Greek-gift sacrifice and a knight-and-queen mating attack. Proof the gambit's compensation lasts deep into the middlegame.",
    middlegameTheme: 'The gambit initiative: queenside play, then Bxh7+ Greek gift.',
    lessonSummary: 'Keep the initiative, open lines, and find the Bxh7+ sacrifice.',
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
console.log(`added ${added.length} Milner-Barry model games. total now ${data.length}.`);
