// One-shot builder: add middlegame plans for the Pirc Defence's three
// first-class systems to middlegame-plans.json. The student plays BLACK,
// so each plan teaches BLACK's plan against that White system.
//
// G3-safe: every playable line is a segment of the corresponding
// master-class lesson sequence (already DB-grounded + integrity-tested in
// pircVariations.ts), replayed through chess.js here so SAN/legality is
// the truth. Per-move arrows are the move's own from->to (always valid).
// Refuses to write if any line is illegal or any annotation count is off.
//
// Run: node scripts/add-pirc-middlegame-plans.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const JSON_PATH = 'src/data/middlegame-plans.json';

function fenAfter(sanPrefix) {
  const c = new Chess();
  for (const m of sanPrefix.trim().split(/\s+/)) c.move(m);
  return c.fen();
}

function buildLine(startFen, lineSan, planId) {
  const c = new Chess(startFen);
  const moves = [];
  const arrows = [];
  for (const san of lineSan.trim().split(/\s+/)) {
    const mv = c.move(san);
    if (!mv) throw new Error(`[${planId}] illegal move "${san}" from ${c.fen()}`);
    moves.push(mv.san);
    arrows.push([{ from: mv.from, to: mv.to }]);
  }
  return { moves, arrows };
}

const SPECS = [
  {
    id: 'mp-pircdefence-austrian',
    title: 'Austrian Attack: Race on the Wings',
    prefix: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3 Na6 O-O c5 d5 Nc7',
    lineSan: 'a4 Rb8 Qe1 b6 Qh4',
    lineTitle: 'The Queenside Counter-Race',
    overview:
      "Against the Austrian's huge e4-d4-f4 centre, Black has already struck with ...c5; White locked it with d5, and the battle leaves the centre for the wings. The plan is now symmetrical in spirit and opposite in direction: White lifts the queen to h4 and throws pieces at Black's king, while Black loads the b-file with ...Rb8, ...b6 and ...Bb7 and breaks with ...b5. This is a pure race — Black does not defend passively, Black attacks first on the queenside. Know the move order and play it fast; the slower attacker loses.",
    pawnBreaks: ['...b5 (the queenside lever — the whole plan)', 'White\'s f5 or e5 against the king'],
    pieceManeuvers: ['...Nc7 supporting ...b5', '...Rb8 and ...Bb7 on the b-file', "White's Qe1-h4 to the kingside"],
    strategicThemes: ['Opposite-wing attacks', 'Speed over material', 'The locked centre dictates the wings'],
    endgameTransitions: ['Rare — this is a middlegame decided by the attacks, not an endgame'],
    annotations: [
      "White plays a4 to clamp down on the b5 break — it delays Black's plan but cannot stop it.",
      "The rook swings to b8, loading the b-file behind the coming ...b5 lever.",
      "White's queen sets off on its journey to the kingside, Qe1 heading for h4 and Black's king.",
      "...b6 prepares the bishop's route to b7 and props up the ...b5 advance.",
      "Qh4 declares the attack. The race is on: Black answers with ...b5 and queenside speed, not defence.",
    ],
  },
  {
    id: 'mp-pircdefence-classical',
    title: 'Classical System: The ...e5 Break to Equality',
    prefix: 'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6 a4 Nbd7',
    lineSan: 'h3 e5 dxe5 dxe5 Be3 Qe7 Qd3 Nh5',
    lineTitle: 'Striking the Centre',
    overview:
      "Against White's quiet Classical setup (Nf3, Be2, no pawn storm), Black equalises with a textbook hypermodern plan: ...c6 and ...Nbd7 prepare the central ...e5 break, and once it lands the position simplifies toward dead equality. After the centre opens with ...dxe5, the d-file is Black's to contest, the queen comes to e7 to back the e5-pawn and connect the rooks, and the knight reroutes via h5 toward the f4 outpost. From a cramped, passive-looking start Black reaches a position with active pieces and no weaknesses — exactly what the Classical Pirc promises.",
    pawnBreaks: ['...e5 (the freeing central break)', 'a later ...b5 if White allows it'],
    pieceManeuvers: ['...Nbd7 to support ...e5', '...Qe7 backing e5 + the d-file', '...Nh5 toward the f4 outpost'],
    strategicThemes: ['Hypermodern central counter-strike', 'Open d-file play', 'Knight to the f4 outpost'],
    endgameTransitions: ['The symmetrical e5/e4 structure can simplify into a balanced queenless middlegame'],
    annotations: [
      "White makes luft with h3, a small waiting move before Black strikes.",
      "...e5 — the freeing break, right on cue, challenging d4 head-on at last.",
      "White releases the central tension.",
      "Black recaptures: the d-file is now open and Black holds a firm pawn on e5.",
      "White develops the bishop to e3, eyeing the centre.",
      "...Qe7 backs the e5-pawn, connects the rooks, and eyes the open d-file.",
      "White centralises the queen on d3.",
      "...Nh5 swings the knight toward the f4-square, where it would be a monster — active, equal play.",
    ],
  },
  {
    id: 'mp-pircdefence-150',
    title: '150 Attack: Trade the Bishop, Win the Race',
    prefix: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 O-O f3 c6',
    lineSan: 'Bh6 Bxh6 Qxh6 Qa5',
    lineTitle: 'The Counter-Race Begins',
    overview:
      "The 150 Attack is a blunt, dangerous plan: Be3, Qd2, f3, then Bh6 to trade off Black's great dark-squared defender, castle queenside, and storm the h-pawn at Black's king. Black's antidote is speed on the other wing. The key is the early ...c6, launching ...b5-b4 and freeing the queen. When White trades on h6, Black accepts the slightly airier king and immediately strikes back with ...Qa5 — the queen leaps into the game, eyes the c3-knight, and lends weight to the queenside pawn storm. Whoever's storm lands first wins; Black must not flinch and must not slow down.",
    pawnBreaks: ['...b5-b4 (the queenside storm against the long-castled king)', "White's h4-h5 against Black's king"],
    pieceManeuvers: ['...c6 + ...Qa5 to start the counter', '...b5-b4 hitting the c3 defender', "White's Bh6 trade + h-pawn storm"],
    strategicThemes: ['Opposite-side castling race', 'Trade of the dark-squared bishops', 'Speed over king safety'],
    endgameTransitions: ['Rare — decided by the mutual attacks'],
    annotations: [
      "Bh6 — the point of the system: White offers to trade off Black's key dark-squared defender.",
      "Black allows the trade; theory confirms it is fine because the counterplay arrives in time.",
      "White's queen recaptures on h6, sitting aggressively near Black's king.",
      "...Qa5 — Black strikes first, the queen joining the race, eyeing c3 and backing the ...b5-b4 storm.",
    ],
  },
];

const plans = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const byId = new Set(plans.map((p) => p.id));
let added = 0;

for (const s of SPECS) {
  const criticalPositionFen = fenAfter(s.prefix);
  const { moves, arrows } = buildLine(criticalPositionFen, s.lineSan, s.id);
  if (moves.length !== s.annotations.length) {
    throw new Error(`[${s.id}] ${moves.length} moves but ${s.annotations.length} annotations`);
  }
  const plan = {
    id: s.id,
    openingId: 'pirc-defence',
    criticalPositionFen,
    title: s.title,
    overview: s.overview,
    pawnBreaks: s.pawnBreaks,
    pieceManeuvers: s.pieceManeuvers,
    strategicThemes: s.strategicThemes,
    endgameTransitions: s.endgameTransitions,
    playableLines: [
      { fen: criticalPositionFen, moves, annotations: s.annotations, arrows, title: s.lineTitle },
    ],
  };
  const idx = plans.findIndex((p) => p.id === s.id);
  if (idx >= 0) { plans[idx] = plan; }
  else { plans.push(plan); byId.add(s.id); added++; }
}

writeFileSync(JSON_PATH, JSON.stringify(plans, null, 2) + '\n');
console.log(`Pirc middlegame plans: ${added} added / ${SPECS.length} total. File now has ${plans.length} plans.`);
for (const s of SPECS) console.log(`  ${s.id}: ${fenAfter(s.prefix)}`);
