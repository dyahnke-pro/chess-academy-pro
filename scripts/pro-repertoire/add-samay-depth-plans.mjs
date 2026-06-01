#!/usr/bin/env node
// Add main middlegame plans for Samay's rebuilt openings (data-grounded breaks
// from samay-middlegame-patterns.mjs). Each demonstrates the thematic break the
// data supports; board-verified, two-register, lead-the-eye highlights.
import fs from 'node:fs';
import { Chess } from 'chess.js';

const PATH = 'src/data/middlegame-plans.json';
const ORANGE = 'rgba(255, 165, 0, 0.55)';
const GREEN = 'rgba(40,185,95,0.92)';
const ARCH = 'https://api.chess.com/pub/player/samayraina/games/archives';

function hl(fen, moves) {
  const c = new Chess();
  return moves.map((m) => { const mv = c.move.bind(c); const r = mv(m); return [{ square: r.from, color: ORANGE }, { square: r.to, color: ORANGE }]; });
}
function hlFrom(fen, moves) {
  const c = new Chess(fen);
  return moves.map((m) => { const r = c.move(m); return [{ square: r.from, color: ORANGE }, { square: r.to, color: ORANGE }]; });
}

const PLANS = [
  {
    id: 'mp-prosamaysicb-d5break',
    openingId: 'pro-samayraina-sicilian-black',
    fen: 'r1bq1rk1/p2pbppp/2p2n2/4p3/2B1P3/2N5/PPP2PPP/R1BQ1RK1 w - - 6 9',
    title: 'Kalashnikov — the …d5 break (his data plan)',
    overview: "In Samay's Kalashnikov the whole point of the …Nc6/…e5 + …bxc6 centre is the …d5 break — it appears in 12% of his middlegames and scores 54%. Castle FIRST (so the king is safe), then strike: …d5 uncoils Black's pawn front, opens the position, and the pawn rolls to d4 to cramp White's knight.",
    pawnBreaks: ['d5 — the central break frees the position', 'd4 — roll the pawn and cramp the knight'],
    pieceManeuvers: [],
    strategicThemes: ['Big pawn centre after castling', 'Open with …d5, push to …d4'],
    endgameTransitions: ['A protected …d4 wedge and space into the ending'],
    moves: ['Re1', 'd5', 'exd5', 'cxd5', 'Bb3', 'd4'],
    annotations: [
      'White centralises the rook on the e-file, eyeing e5.',
      '…d5! Now that Black is safely castled, the central break is perfectly timed — the pawn front uncoils and the position opens.',
      "exd5 — White captures, but Black's pieces are ready to flood the open lines.",
      '…cxd5 — recapture; the c-file opens toward White\'s queenside and Black has a mobile centre.',
      "White retreats the bishop off the d5-pawn's path.",
      "…d4! The pawn rolls on, cramping White's knight and seizing space. Black's central majority and harmonious pieces give the freer, more pleasant game.",
    ],
    learnCues: ['Re1 — eye the e-file', '…d5 — break, safely castled', 'exd5 — lines open', '…cxd5 — mobile centre', 'Bb3 — retreat the bishop', '…d4 — roll on, cramp the knight'],
    arrowKeys: [[1, 'd7', 'd5'], [5, 'd5', 'd4']],
    sources: ['https://www.chess.com/openings/Sicilian-Defense-Kalashnikov-Variation', ARCH, 'concept:pos-center'],
  },
  {
    id: 'mp-prosamayopene5-d5break',
    openingId: 'pro-samayraina-open-e5',
    fen: 'r1bq1rk1/bpp2ppp/p1np1n2/4p3/P1B1P3/2PP1N2/1P3PPP/RNBQR1K1 w - - 1 9',
    title: 'Pianissimo — …Ne7-g6 and the …d5 break',
    overview: "In the Giuoco Pianissimo Black simply matches White's slow improvements and prepares the freeing …d5. The knight reroutes …Ne7-g6 to press f4 and h4 and support the break; when White commits with d4, …d5 strikes back in the centre and Black is fully equal with active pieces.",
    pawnBreaks: ['d5 — the freeing central break'],
    pieceManeuvers: ['Ne7 then Ng6 — reroute the knight to the kingside'],
    strategicThemes: ['Slow Pianissimo maneuvering', 'Counter in the centre with …d5'],
    endgameTransitions: ['Symmetrical structure, equal chances into the ending'],
    moves: ['h3', 'Ne7', 'Nbd2', 'Ng6', 'd4', 'd5'],
    annotations: [
      'White makes luft with h3 in the slow Pianissimo maneuvering.',
      '…Ne7 — the knight reroutes off c6, heading for g6 where it eyes f4 and h4.',
      'White develops the queenside knight toward f1-g3, mirroring the build-up.',
      '…Ng6 — the knight lands on its dream square, pressuring f4 and backing the break.',
      'White finally challenges the centre with d4.',
      '…d5! The freeing break — Black strikes back in the centre with everything ready. Equal, dynamic, and full of play.',
    ],
    learnCues: ['h3 — Pianissimo luft', '…Ne7 — reroute the knight', 'Nbd2 — slow build-up', '…Ng6 — the dream square', 'd4 — White challenges', '…d5 — strike back!'],
    arrowKeys: [[3, 'e7', 'g6'], [5, 'd6', 'd5']],
    sources: ['https://www.chess.com/openings/Italian-Game-Giuoco-Pianissimo', ARCH, 'concept:pos-center'],
  },
  {
    id: 'mp-prosamaykg-centralbreak',
    openingId: 'pro-samayraina-kings-gambit',
    fen: 'r2qkb1r/ppp2ppp/2np1n2/8/2BPPBb1/2N2N2/PPP3PP/R2QK2R b KQkq - 2 7',
    title: "King's Gambit — castle long and break with d5",
    overview: "Samay's King's Gambit attack: connect the rooks with Qd2, castle queenside, and then blow the centre open with d5 while White's pieces are the more active. The half-open f-file, the bishop on c4 aimed at f7, and the central rollers combine into a direct attack — the romantic King's-Gambit dream.",
    pawnBreaks: ['d5 — blow open the centre'],
    pieceManeuvers: ['O-O-O — castle into the attack'],
    strategicThemes: ['Opposite-side castling race', 'Central rollers + f-file pressure'],
    endgameTransitions: ['If the attack stalls, the gambit pawn tells — keep the initiative'],
    moves: ['h6', 'Qd2', 'Qd7', 'O-O-O', 'O-O-O', 'd5'],
    annotations: [
      '…h6 covers g5; the kingside tension simmers.',
      'Qd2 — connecting the rooks and pointing the queen toward the kingside, ready to castle long.',
      '…Qd7 — Black prepares to castle queenside in turn.',
      'O-O-O — Samay castles into the attack, the rook landing behind the centre on the d-file.',
      '…O-O-O — Black castles long too; the race is symmetrical for now.',
      'd5! The central break blows the position open while White\'s pieces are the more active — the King\'s-Gambit initiative crashes through in the centre.',
    ],
    learnCues: ['…h6 — cover g5', 'Qd2 — connect, eye the kingside', '…Qd7 — Black mirrors', 'O-O-O — castle into the attack', '…O-O-O — symmetrical race', 'd5 — blow open the centre!'],
    arrowKeys: [[5, 'd4', 'd5']],
    sources: ['https://www.chess.com/openings/Kings-Gambit', ARCH, 'concept:att-kingside-storm'],
  },
];

const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const byId = new Map(data.map((p, i) => [p.id, i]));
for (const p of PLANS) {
  const c = new Chess(p.fen);
  for (const m of p.moves) { if (!c.move(m)) throw new Error(`${p.id}: illegal ${m}`); }
  if (p.annotations.length !== p.moves.length || p.learnCues.length !== p.moves.length) throw new Error(`${p.id}: length mismatch`);
  const arrows = p.moves.map(() => []);
  for (const [i, from, to] of (p.arrowKeys || [])) arrows[i] = [{ from, to, color: GREEN }];
  const plan = {
    id: p.id, openingId: p.openingId, criticalPositionFen: p.fen, title: p.title, overview: p.overview,
    pawnBreaks: p.pawnBreaks, pieceManeuvers: p.pieceManeuvers, strategicThemes: p.strategicThemes, endgameTransitions: p.endgameTransitions,
    playableLines: [{ fen: p.fen, moves: p.moves, annotations: p.annotations, arrows, highlights: hlFrom(p.fen, p.moves), learnCues: p.learnCues, title: p.title, intro: p.overview, sources: p.sources }],
  };
  if (byId.has(p.id)) { data[byId.get(p.id)] = plan; console.log('updated', p.id); }
  else { data.push(plan); console.log('added', p.id); }
}
fs.writeFileSync(PATH, JSON.stringify(data, null, 2) + '\n');
console.log('total plans:', data.length);
