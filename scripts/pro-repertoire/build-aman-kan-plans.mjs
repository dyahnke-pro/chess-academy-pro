#!/usr/bin/env node
// Sicilian Kan middlegame plans for Aman into middlegame-plans.json.
// criticalPositionFen = the variation lesson terminus (Gate C); playableLines[0]
// = real rep-game continuation; lead-the-eye arrows (non-pawn only) + orange
// dest highlights. Self-verifies every move is legal. Idempotent.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const ID = 'pro-aman-sicilian-kan';
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const VIS = 'rgba(40,185,95,0.92)';
const SRC = ['concept:pos-development', 'book:sicilian', 'https://www.chess.com/openings/Sicilian-Defense-Kan-Variation'];

function lineFrom(fen, moves, annotations, learnCues, arrowSpec) {
  const c = new Chess(fen); const arrows = []; const highlights = [];
  for (let i = 0; i < moves.length; i++) {
    const mv = c.move(moves[i]); // throws if illegal
    highlights.push([{ square: mv.to, color: ORANGE }]);
    arrows.push(arrowSpec[i] ? [{ from: arrowSpec[i][0], to: arrowSpec[i][1], color: VIS }] : []);
  }
  return { fen, moves, annotations, learnCues, arrows, highlights, sources: SRC };
}

const PLANS = [
  { id: 'mp-proamansiciliankan-open', openingId: ID,
    criticalPositionFen: 'r1b1kb1r/2qn1ppp/p2ppn2/1p6/3NPP2/2NB4/PPP3PP/R1BQ1R1K w kq - 0 10',
    title: 'Queenside Expansion into a Kingside Storm',
    overview: "After …b5, Black completes with …Bb7 on the long diagonal and — with White committed on the kingside — rolls the h-pawn …h5-h4-h3 straight at the castled king. You expand where you are strong and attack where the enemy king sits.",
    pawnBreaks: ['...h5-h4-h3 kingside pawn storm'],
    pieceManeuvers: [{ piece: 'bishop', route: '...Bb7 long diagonal', explanation: 'The light bishop lands on b7, raking the long diagonal at e4 and the white king.' }],
    strategicThemes: ['Queenside space with …b5 and …Bb7, then a direct …h5-h4-h3 pawn storm against the king'],
    endgameTransitions: [],
    moves: ['Qe2', 'Bb7', 'Bd2', 'h5', 'Rae1', 'h4', 'Rf3', 'h3'],
    annotations: ['White centralises the queen.', '…Bb7 takes the long diagonal, eyeing e4.', 'White redeploys the bishop.', '…h5 begins the kingside roll.', 'White stacks on the e-file.', '…h4 storms forward, gaining space.', 'White lifts the rook to defend.', '…h3 cracks open the white king’s shelter.'],
    learnCues: ['Qe2 — centralise', '…Bb7 — long diagonal', 'Bd2 — redeploy', '…h5 — start the roll', 'Rae1 — stack e-file', '…h4 — storm forward', 'Rf3 — defend', '…h3 — crack the shelter'],
    arrowSpec: [null, ['c8', 'b7'], null, null, null, null, null, null] },
  { id: 'mp-proamansiciliankan-taimanov', openingId: ID,
    criticalPositionFen: 'r1b1k2r/1pqp1ppp/p1n1pn2/8/1b1NP3/2N1B3/PPP1BPPP/R2Q1RK1 w kq - 4 9',
    title: 'The …Bb4 Pin and the …Nxe4 / …f5 Strike',
    overview: "With the dark bishop pinning on b4 and pressure already on e4, Black castles and breaks. When White drifts, …Nxe4 grabs the centre and …f5 props the knight and opens the f-file — turning the pin into concrete central play.",
    pawnBreaks: ['...f5 central break'],
    pieceManeuvers: [{ piece: 'knight', route: '...Nxe4 central strike', explanation: 'The knight captures on e4, the strike the …Bb4 pin set up.' }],
    strategicThemes: ['Convert the …Bb4 pin into a central break with …Nxe4 and …f5'],
    endgameTransitions: [],
    moves: ['Na4', 'O-O', 'c4', 'Be7', 'c5', 'Nxe4', 'Rc1', 'f5'],
    annotations: ['White swings the knight to a4.', '…O-O tucks the king away safely.', 'White grabs queenside space.', '…Be7 retreats, keeping the bishop.', 'White pushes on.', '…Nxe4 strikes the centre — the pin pays off.', 'White contests the c-file.', '…f5 props the knight and opens the f-file.'],
    learnCues: ['Na4 — swing out', '…O-O — king safe', 'c4 — grab space', '…Be7 — keep bishop', 'c5 — push on', '…Nxe4 — central strike', 'Rc1 — contest c-file', '…f5 — prop and open'],
    arrowSpec: [null, null, null, ['b4', 'e7'], null, ['f6', 'e4'], null, null] },
  { id: 'mp-proamansiciliankan-maroczy', openingId: ID,
    criticalPositionFen: 'r3kb1r/1bqn1ppp/pp1ppn2/8/2PNP3/2N1BP2/PP1QB1PP/R4RK1 b kq - 2 11',
    title: 'Hedgehog Pressure on the c-file',
    overview: "In the hedgehog against the Maróczy, Black coils up and pressures the bind. …Rc8 loads the half-open c-file behind the queen, and when White expands with a4-a5, …bxa5 opens lines so the queenside pieces spring to life.",
    pawnBreaks: ['...bxa5 opens the b-file'],
    pieceManeuvers: [{ piece: 'rook', route: '...Rc8 c-file pressure', explanation: 'The rook swings to c8, loading the half-open c-file against the bind.' }],
    strategicThemes: ['Load the c-file with …Rc8 and break the bind with …bxa5'],
    endgameTransitions: [],
    moves: ['Rc8', 'a4', 'Be7', 'a5', 'bxa5', 'Nb3', 'Rb8', 'Nxa5'],
    annotations: ['…Rc8 loads the half-open c-file.', 'White probes with a4.', '…Be7 completes development.', 'White lunges a5 to fix the queenside.', '…bxa5 opens the b-file for counterplay.', 'White recaptures with the knight.', '…Rb8 swings to the open b-file.', 'White grabs the a5-pawn.'],
    learnCues: ['…Rc8 — load c-file', 'a4 — probe', '…Be7 — develop', 'a5 — fix queenside', '…bxa5 — open the b-file', 'Nb3 — recapture', '…Rb8 — swing over', 'Nxa5 — grab pawn'],
    arrowSpec: [['a8', 'c8'], null, ['f8', 'e7'], null, null, null, ['b7', 'b8'], null] },
  { id: 'mp-proamansiciliankan-alapin', openingId: ID,
    criticalPositionFen: 'r3kb1r/pp1qpppp/1nn5/8/3p4/NQP2N2/PP3PPP/R1BR2K1 b kq - 2 12',
    title: 'The …e5 Central Break',
    overview: "Having equalized against the Alapin, Black grabs the centre. …e5 stakes out space, …cxd4 clears it, and the dark bishop swings to c5 — Black’s pieces flow into active posts with full equality.",
    pawnBreaks: ['...e5 central break'],
    pieceManeuvers: [{ piece: 'bishop', route: '...Bc5 active diagonal', explanation: 'The bishop develops to c5, eyeing the f2-square and the centre.' }],
    strategicThemes: ['Seize the centre with …e5 and activate the bishop on c5'],
    endgameTransitions: [],
    moves: ['e5', 'cxd4', 'exd4', 'Nb5', 'Bc5', 'Re1+', 'Be7', 'Bf4'],
    annotations: ['…e5 stakes out the centre.', 'White trades on d4.', '…exd4 recaptures, opening lines.', 'White jumps the knight to b5.', '…Bc5 develops with tempo on the centre.', 'White checks on the e-file.', '…Be7 blocks, untangling smoothly.', 'White develops the bishop.'],
    learnCues: ['…e5 — seize centre', 'cxd4 — trade', '…exd4 — open lines', 'Nb5 — jump out', '…Bc5 — develop active', 'Re1+ — check', '…Be7 — block, untangle', 'Bf4 — develop'],
    arrowSpec: [null, null, null, null, ['f8', 'c5'], null, ['f8', 'e7'], null] },
];

const path = 'src/data/middlegame-plans.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));
const kept = data.filter((p) => p.openingId !== ID);
for (const P of PLANS) {
  const { moves, annotations, learnCues, arrowSpec, ...meta } = P;
  kept.push({ ...meta, playableLines: [lineFrom(meta.criticalPositionFen, moves, annotations, learnCues, arrowSpec)] });
}
fs.writeFileSync(path, JSON.stringify(kept, null, 2) + '\n');
console.log(`middlegame-plans: wrote ${PLANS.length} Kan plans (all moves legal)`);
