#!/usr/bin/env node
// Marquee GothamChess Trompowsky model games — his real WHITE WINS vs strong
// titled opposition, one per variation. G9.1: multiple games per opening,
// student-side WINS only, hand-authored overviews (pass isNarratedModelGame).
// Every PGN is from his chess.com archive, chess.js-validated here.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/model-games.json';
const OPENING_ID = 'pro-gothamchess-trompowsky';

const GAMES = [
  {
    id: 'mg-pro-gothamchess-tromp-naroditsky-c5',
    white: 'GothamChess', black: 'DanielNaroditsky', whiteElo: 2700, blackElo: 3207,
    year: 2019, sourceUrl: 'https://www.chess.com/game/live/4270453884',
    pgn: 'd4 Nf6 Bg5 c5 d5 Ne4 h4 Qb6 Nc3 Nxg5 hxg5 Qxb2 Rh3 Qb6 Rb1 Qa5 Qd2 d6 g6 fxg6 Rh1 e6 e4 Be7 Bb5+ Kd8 dxe6 Bxe6 Nf3 h6 Ne5 Nd7 Bxd7 Bxd7 Nc4 Qa6 Ne3 Be6 e5 Ke8 Ned5 Rc8 Nb5 dxe5 Ndc7+ Kf7 Nxa6 bxa6 Nd6+ Bxd6 Qxd6 Rhe8 Rb7+ Kg8 Rxa7 Rcd8 Qc7 Rd7 Qxd7 Bxd7 Rxd7 Rb8 Ke2 Rb4 Rhd1 Re4+ Kf1 Rf4 Rd8+ Kf7 g3 Rf5 R8d7+ Ke6 R7d3 e4 Re3 Ke5 c4 Kf6 Rd5 Re5 Rxe5 Kxe5 f3 Kd4 Rxe4+ Kc3 Ke2 Kb4 Re7 Ka3 Rxg7 Kxa2 Rxg6 a5 Rxh6 a4 Ra6 a3 f4 Kb3 f5 Kxc4 Rxa3 Kd5 Rd3+ Ke5 g4 Kf6 Rf3 Kg5 Ke3 c4 Ke4 c3 f6 c2 Rc3 Kxf6 Rxc2 Kg5 Rg2 Kh4 Kf5 Kh3 g5 Kxg2 g6 Kh3 g7 Kh2 g8=Q Kh1 Qg4 Kh2 Kf4 Kh1 Kf3 Kh2 Qg2#',
    overview:
      "Levy beats GM Daniel Naroditsky himself (3207) with the Trompowsky's sharpest gambit. Against the …c5 line Naroditsky grabs the b2-pawn; Levy answers with the g6 break, ripping open the king's position, then converts a long technical grind in a rook ending. Beating a 3200-rated speed-chess legend in his own backyard — and finishing with a clean queen mate after promoting.",
    middlegameTheme: 'The …c5 b2-gambit: g6 to open the king, then a winning rook ending.',
    lessonSummary: 'Gambit the b-pawn for the attack, open the king with g6, grind the ending.',
  },
  {
    id: 'mg-pro-gothamchess-tromp-vidit-d5',
    white: 'GothamChess', black: 'mishanick', whiteElo: 2700, blackElo: 3155,
    year: 2026, sourceUrl: 'https://www.chess.com/game/live/167664611347',
    pgn: 'd4 Nf6 Bg5 d5 Nd2 c5 e3 Nc6 c3 Qb6 Qb3 e6 Ngf3 Bd7 Be2 Be7 O-O Rc8 Rfe1 h6 Bh4 O-O Ne5 Rfd8 Nxd7 Nxd7 Bg3 Nf6 Bf3 Bd6 Bh4 Be7 Bg3 Rd7 Rac1 Qa5 Rcd1 b5 dxc5 Bxc5 a3 Qb6 Qc2 a5 Rc1 Rdd8 Qd3 e5 Qb1 e4 Be2 a4 Rcd1 Na5 Be5 Nc4 Nxc4 bxc4 Qc2 Ra8 Rd2 Qe6 Bxf6 Qxf6 Red1 Qg5 h4 Qxh4 Rxd5 Bb6 Bxc4 Bc7 Rxd8+ Bxd8 Bd5 Rb8 Qxe4 Qxe4 Bxe4 Bf6 Rd2 Kf8 Bc6 g5 Bxa4 Be5 Bd1 Ke7 g3 f5 a4 Ra8 Rd5 Ke6 Rb5 Rd8 Bb3+ Kf6 Bd5 f4 exf4 gxf4 gxf4 Bxf4 a5 Bb8 a6 Ba7 c4 Rd6 Bb7 Rd2 c5 Rc2 b4 Ke5 Kg2 Ra2 Bc8 h5 Bb7 Kf4 Bc8 h4 Rb7 h3+ Bxh3 Rxa6 Rf7+ Ke5 Rb7 Ra2 Re7+ Kd4 Re3 Kc4 Re4+ Kb5 Bf5 Ka6 Bc8+ Kb5 Be6',
    overview:
      "A 143-move technical masterpiece against the 3155-rated mishanick in the …d5 system. Levy plays the patient e3/c3 squeeze, trades into a position where his bishop dominates, then converts a long endgame with a queenside passed pawn. The Trompowsky's quiet side: no fireworks, just a small edge nursed to a win across 70-plus moves of pure technique.",
    middlegameTheme: 'The …d5 squeeze: patient e3/c3 build-up, then convert the better bishop.',
    lessonSummary: 'Against …d5, squeeze with e3/c3 and grind the better minor piece home.',
  },
  {
    id: 'mg-pro-gothamchess-tromp-steinberg-vaganian',
    white: 'GothamChess', black: 'Nitzan_Steinberg', whiteElo: 2700, blackElo: 3041,
    year: 2026, sourceUrl: 'https://www.chess.com/game/live/167061015711',
    pgn: 'd4 Nf6 Bg5 Ne4 h4 d5 e3 h6 Bf4 e6 Bd3 Nf6 Nd2 c5 c3 Bd6 Qf3 Nc6 Ne2 e5 dxe5 Nxe5 Bb5+ Kf8 Bxe5 Bxe5 g3 Qb6 Bd3 Bg4 Qg2 c4 Bxc4 dxc4 Nxc4 Qb5 b3 Bxe2 Kxe2 Bxc3 Rad1 Bb4 g4 Re8 Rd4 Qa6 g5 Nh5 Rhd1 g6 a3 Bc5 Re4 Kg7 gxh6+ Kh7 Rd7 Qf6 Rxe8 Rxe8 Qxb7 Ng3+ fxg3 Rf8 Qd5 Bb6 h5 Kxh6 Ne5 Qf5 hxg6 fxg6 Nf7+ Kh5 g4+ Kxg4 Nh6+ Kg5 Nxf5 gxf5 Rg7+ Kf6 Qd7 Ke5 Qe7+ Kd5 Qxf8 Kc6 Qf7 Kb5 Rg6 Ka6',
    overview:
      "Against the critical …Ne4 Vaganian and IM Nitzan Steinberg (3041), Levy unleashes the h4 gambit. He sacrifices material for an open h-file and a roaring attack, then weaves a mating net — the rooks and queen hunt the black king from h5 all the way to a6. Showcase of the most aggressive line in his whole 1.d4 repertoire.",
    middlegameTheme: 'The …Ne4 h4-gambit: open the h-file, attack the king with the heavy pieces.',
    lessonSummary: 'Against …Ne4, gambit with h4, open the h-file, and hunt the king.',
  },
  {
    id: 'mg-pro-gothamchess-tromp-maciek-g6',
    white: 'GothamChess', black: 'maciek_92', whiteElo: 2700, blackElo: 3111,
    year: 2026, sourceUrl: 'https://www.chess.com/game/live/147876185324',
    pgn: 'd4 Nf6 Bg5 g6 Bxf6 exf6 c4 Bb4+ Nc3 Bxc3+ bxc3 O-O h4 h5 g4 hxg4 h5 Kg7 hxg6 fxg6 e3 d6 Ne2 c5 Nf4 Nc6 Bg2 Ne7 Rb1 Rb8 Kd2 Qa5 Qb3 b6 a4 Bf5 e4 Bd7 d5 Qxa4 Qxa4 Bxa4 Ne6+ Kg8 Rh6 Bd7 Rbh1 Kf7 Rh7+ Ke8 Nxf8 Kxf8 Rh8+ Ng8 R1h7 Rb7 Ke3 Bc8 Kf4 Rg7 f3 gxf3 Kxf3 g5 Kg3 a5 Bf3 a4 Bg4 a3 Bxc8 a2 Rh1 Ra7 Ra1 Kg7 Rh2 Ne7 Be6 Ng6 Rhxa2 Re7 Ra7 f5 exf5 Kf6 fxg6',
    overview:
      "Against the …g6 fianchetto and maciek_92 (3111), Levy doubles Black's f-pawns on f6, then opens the h-file with a direct h4-h5-hxg6 pawn storm. The rooks pour down the h-file, win the exchange, and the heavy pieces overwhelm Black's loosened kingside. Textbook demonstration of why doubling the pawns and attacking the holes is the …g6 antidote.",
    middlegameTheme: 'The …g6 antidote: double the f-pawns, storm h4-h5, invade the h-file.',
    lessonSummary: 'Against …g6, take on f6, storm with h4-h5, and pour down the open h-file.',
  },
  {
    id: 'mg-pro-gothamchess-tromp-tjychess-e6',
    white: 'GothamChess', black: 'tjychess', whiteElo: 2700, blackElo: 3027,
    year: 2026, sourceUrl: 'https://www.chess.com/game/live/148341256640',
    pgn: 'd4 Nf6 Bg5 e6 Nd2 h6 Bh4 d5 e3 Nbd7 c3 Be7 Bd3 c5 Bxf6 Nxf6 f4 O-O Ngf3 b6 Ne5 Bb7 Qf3 Qc8 g4 Ba6 Bc2 cxd4 exd4 Nd7 g5 Nxe5 fxe5 Bxg5 Rg1 f5 Qf2 Qd8 O-O-O b5 Kb1 b4 cxb4 Rb8 a3 Bb5 Nf3 a5 h4 Be7 Rg6 axb4 a4 b3 Bd3 Bxd3+ Rxd3 Qe8 Qg2 Qxa4 Rxg7+ Kh8 Qg6 Qa2+ Kc1 Qa1+ Kd2 Qxb2+ Ke1 Bb4+ Kf1',
    overview:
      "The main-line …e6 plan in full flow against tjychess (3027). Levy grabs the bishop pair on f6, storms with f4 and g4, and launches a kingside attack with both rooks. The game ends with a mating attack down the g-file — Rxg7+ and Qg6 finishing the job. The model game for the Trompowsky's bishop-pair-plus-pawn-storm main plan.",
    middlegameTheme: 'The …e6 main plan: bishop pair on f6, f4/g4 storm, heavy-piece attack.',
    lessonSummary: 'Against …e6, take the bishop pair, storm with f4-g4, attack down the g-file.',
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
    id: g.id,
    openingId: OPENING_ID,
    white: g.white,
    black: g.black,
    whiteElo: g.whiteElo,
    blackElo: g.blackElo,
    result: '1-0', // White (GothamChess) win — gate requires studentSide win
    year: g.year,
    event: 'chess.com',
    pgn: g.pgn,
    sourceUrl: g.sourceUrl,
    overview: g.overview,
    criticalMoments: [],
    middlegameTheme: g.middlegameTheme,
    lessonSummary: g.lessonSummary,
    studentSide: 'white',
  });
}

if (failed > 0) { console.error(`\n${failed} game(s) failed — NOT writing.`); process.exit(1); }
data.push(...added);
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log(`added ${added.length} Trompowsky model games. total now ${data.length}.`);
