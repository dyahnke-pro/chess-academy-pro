#!/usr/bin/env node
// Aman second middlegame plans for the 5 openings that had only 1 — each from a
// DIFFERENT real model game (a 2nd variation tab), continuation verified legal.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';

function srcFor(id) {
  if (id.includes('ruy')) return ['book:ruy-lopez', 'concept:pos-development', 'https://www.chess.com/openings/Ruy-Lopez-Opening'];
  if (id.includes('opensic')) return ['book:sicilian', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Najdorf-Variation'];
  if (id.includes('ross')) return ['book:sicilian-rossolimo', 'concept:pos-development', 'https://www.chess.com/openings/Sicilian-Defense-Rossolimo-Variation'];
  if (id.includes('french')) return ['book:french-defence', 'concept:pos-development', 'https://www.chess.com/openings/French-Defense'];
  return ['book:caro-kann', 'concept:pos-development', 'https://www.chess.com/openings/Caro-Kann-Defense-Two-Knights-Attack'];
}

const PLANS = [
  {
    id: 'mp-proamanruy-berlin', openingId: 'pro-aman-ruy-lopez',
    title: 'Anti-Berlin — Trade the Bishops, Press the Pawns',
    overview: "In the d3 anti-Berlin, White trades on c6 to give Black doubled pawns, then swaps the dark bishops and presses the weakened structure. The lasting pawn-structure edge is the whole point of the quiet line.",
    fen: 'r1bq1rk1/1pp2ppp/p1np1n2/1Bb1p3/4P3/2PP1N1P/PP3PP1/RNBQ1RK1 w - - 0 8',
    tail: ['Bxc6', 'bxc6', 'Re1', 'Ba7', 'Be3', 'Bxe3', 'Rxe3', 'c5'],
    ann: ['Bxc6 gives Black doubled pawns.', '…bxc6 recaptures.', 'Re1 backs the centre.', '…Ba7 tucks the bishop.', 'Be3 offers the trade.', '…Bxe3 takes.', 'Rxe3 recaptures, eyeing the d-file.', '…c5 frees the doubled pawn.'],
    cues: ['Bxc6 — doubled pawns', '…bxc6 — recapture', 'Re1 — back the centre', '…Ba7 — tuck away', 'Be3 — offer trade', '…Bxe3 — take', 'Rxe3 — recapture', '…c5 — free the pawn'],
    pawnBreaks: [], maneuver: { piece: 'bishop', route: 'Bc1-e3 trade the dark bishops', explanation: 'The bishop comes to e3 to trade off Black’s active dark-squared bishop.' },
    theme: 'Trade on c6 and e3 to leave Black with a weak pawn structure', arrowIdx: { 4: ['c1', 'e3'] },
  },
  {
    id: 'mp-proamanopensic-dragon', openingId: 'pro-aman-open-sicilian',
    title: 'Yugoslav Attack — Open the Centre and Hunt the King',
    overview: "Against the Dragon, White meets the …d5 counter by opening the centre on favourable terms — trading on c6 and d5, then aiming the bishop at f7 while the attack rolls. The Yugoslav's central control feeds the kingside assault.",
    fen: 'r1bq1rk1/pp2ppbp/2n2np1/3p4/3NP3/2N1BP2/PPPQ2PP/2KR1B1R w - - 0 10',
    tail: ['Qe1', 'e5', 'Nxc6', 'bxc6', 'exd5', 'cxd5', 'Bc4', 'd4'],
    ann: ['Qe1 sidesteps and prepares.', '…e5 grabs the centre.', 'Nxc6 trades to damage the structure.', '…bxc6 recaptures, doubling pawns.', 'exd5 opens the centre.', '…cxd5 recaptures.', 'Bc4 aims at d5 and f7.', '…d4 pushes the passer.'],
    cues: ['Qe1 — sidestep', '…e5 — grab centre', 'Nxc6 — trade', '…bxc6 — doubled', 'exd5 — open centre', '…cxd5 — recapture', 'Bc4 — aim at f7', '…d4 — push'],
    pawnBreaks: [], maneuver: { piece: 'bishop', route: 'Be3-c4 toward f7', explanation: 'The bishop swings to c4, raking the a2-g8 diagonal at Black’s king.' },
    theme: 'Open the centre with Nxc6/exd5 and aim the bishop at f7', arrowIdx: { 2: ['d4', 'c6'], 6: ['f1', 'c4'] },
  },
  {
    id: 'mp-proamanross-e6', openingId: 'pro-aman-rossolimo',
    title: 'Rossolimo vs …e6 — Build the Big Centre',
    overview: "Against the …e6 setup White builds a classical d4 centre and develops with tempo, centralising the knight after the trade. The space edge gives a comfortable, pressing game.",
    fen: 'r1bqk2r/1p2bppp/p1n1pn2/2p5/3P4/4BN2/PPP2PPP/RN1QRBK1 w kq - 3 10',
    tail: ['c4', 'O-O', 'Nc3', 'cxd4', 'Nxd4', 'Ne5', 'Bf4', 'Ng6'],
    ann: ['c4 grabs queenside space.', '…O-O tucks the king away.', 'Nc3 develops to the centre.', '…cxd4 trades.', 'Nxd4 recaptures, centralising.', '…Ne5 jumps in.', 'Bf4 hits the knight.', '…Ng6 retreats.'],
    cues: ['c4 — grab space', '…O-O — king safe', 'Nc3 — develop', '…cxd4 — trade', 'Nxd4 — centralise', '…Ne5 — jump in', 'Bf4 — hit the knight', '…Ng6 — retreat'],
    pawnBreaks: ['c4 queenside space'], maneuver: { piece: 'knight', route: 'Nb1-c3 to the centre', explanation: 'The knight develops to c3, supporting the broad centre.' },
    theme: 'Expand with c4 and build the classical d4 centre', arrowIdx: { 2: ['b1', 'c3'], 6: ['e3', 'f4'] },
  },
  {
    id: 'mp-proamanfrench-classical', openingId: 'pro-aman-french-white',
    title: 'French Classical — Fianchetto and Press the Broken Pawns',
    overview: "After Bg5xf6 shatters Black's kingside, White fianchettoes the bishop to g2, castles, and centralises the queen — the long diagonal rakes the weakened pawns. A clean, lasting structural edge.",
    fen: 'rnbqk2r/1pp1bp1p/p3p3/5p2/3P4/2N2N2/PPP2PPP/R2QKB1R w KQkq - 0 9',
    tail: ['g3', 'b5', 'Bg2', 'Bb7', 'O-O', 'O-O', 'Qe2', 'Nd7'],
    ann: ['g3 prepares the fianchetto.', '…b5 grabs queenside space.', 'Bg2 takes the long diagonal.', '…Bb7 mirrors.', 'O-O tucks the king away.', '…O-O Black castles.', 'Qe2 centralises, eyeing the kingside.', '…Nd7 develops.'],
    cues: ['g3 — prepare fianchetto', '…b5 — grab space', 'Bg2 — long diagonal', '…Bb7 — mirror', 'O-O — king safe', '…O-O — Black castles', 'Qe2 — centralise', '…Nd7 — develop'],
    pawnBreaks: [], maneuver: { piece: 'bishop', route: 'Bf1-g2 long diagonal', explanation: 'The bishop fianchettoes to g2, raking Black’s shattered kingside.' },
    theme: 'Fianchetto to g2 and centralise the queen against the broken pawns', arrowIdx: { 2: ['f1', 'g2'] },
  },
  {
    id: 'mp-proamananticaro-dxe4', openingId: 'pro-aman-anti-caro',
    title: 'Two Knights vs …dxe4 — Knight on e5 and the Bind',
    overview: "When Black trades …dxe4, White centralises the queen, plants the knight on e5, and builds the d4 centre — a clean positional bind. The active pieces and space leave Black passive.",
    fen: 'r1bqkb1r/pp3ppp/2p1pn2/4N3/2B1Q3/8/PPPP1PPP/R1B1K2R w KQkq - 0 9',
    tail: ['Qe2', 'Bd6', 'd4', 'O-O', 'O-O', 'Qc7', 'Bf4', 'Nd5'],
    ann: ['Qe2 keeps the queen flexible.', '…Bd6 develops, hitting e5.', 'd4 builds the big centre.', '…O-O tucks the king away.', 'O-O White castles.', '…Qc7 pressures e5.', 'Bf4 defends and develops.', '…Nd5 centralises.'],
    cues: ['Qe2 — flexible', '…Bd6 — hit e5', 'd4 — big centre', '…O-O — king safe', 'O-O — castle', '…Qc7 — pressure e5', 'Bf4 — defend', '…Nd5 — centralise'],
    pawnBreaks: ['d4 central break'], maneuver: { piece: 'bishop', route: 'Bc1-f4 defends e5', explanation: 'The bishop comes to f4 to defend the strong e5-knight and develop.' },
    theme: 'Plant the knight on e5 and build the d4 centre', arrowIdx: { 6: ['c1', 'f4'] },
  },
];

function build(P) {
  const SRC = srcFor(P.id);
  const c = new Chess(P.fen);
  const arrows = []; const highlights = [];
  for (let i = 0; i < P.tail.length; i++) {
    const mv = c.move(P.tail[i]);
    highlights.push([{ square: mv.to, color: ORANGE }]);
    const spec = P.arrowIdx[i];
    arrows.push(spec ? [{ from: spec[0], to: spec[1], color: VIS }] : []);
  }
  return {
    id: P.id, openingId: P.openingId, criticalPositionFen: P.fen, title: P.title, overview: P.overview,
    pawnBreaks: P.pawnBreaks, pieceManeuvers: [P.maneuver], strategicThemes: [P.theme], endgameTransitions: [],
    playableLines: [{ fen: P.fen, moves: P.tail, annotations: P.ann, learnCues: P.cues, arrows, highlights, sources: SRC }],
  };
}

const path = 'src/data/middlegame-plans.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const ids = new Set(PLANS.map((p) => p.id));
const kept = data.filter((p) => !ids.has(p.id));
for (const P of PLANS) kept.push(build(P));
fs.writeFileSync(path, JSON.stringify(kept, null, 2) + '\n');
console.log(`2nd plans: wrote ${PLANS.length} (all legal)`);
