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
  {
    id: 'mp-pircdefence-byrne',
    title: 'Byrne Variation: Race the Opposite-Side King',
    prefix: 'e4 d6 d4 Nf6 Nc3 g6 Bg5 Bg7 Qd2 O-O O-O-O c6',
    lineSan: 'f4 b5 e5 b4 exf6 bxc3 Qxc3 exf6 Bh4 d5',
    lineTitle: 'Both Storms Crash In',
    overview:
      "White has chosen Bg5 and the committal O-O-O — once the kings sit on opposite wings, the game is a foot-race of pawn storms and the faster attacker wins. Black does not defend; Black attacks. The plan is ...c6 and ...b5-b4 straight at White's queenside king, met by White's own f4-e5 thrust. Black willingly trades the f6-knight to crack White's queenside cover, and the hammer is ...d5 — ripping the centre open so the g7-bishop and the heavy pieces pour toward c3. Know the move order cold; a single slow tempo loses the race.",
    pawnBreaks: ['...b5-b4 (the storm at the long-castled king)', "White's f4-e5 at Black's king"],
    pieceManeuvers: ['...c6 + ...b5-b4 lever', 'sac the f6-knight to open lines', '...d5 to open the centre toward c3'],
    strategicThemes: ['Opposite-side castling race', 'Speed over material', 'Open lines to the enemy king'],
    endgameTransitions: ['Rare — decided by the mutual attacks'],
    annotations: [
      'White throws f4, beginning the kingside storm.',
      '...b5 — Black’s storm answers on the queenside, straight at White’s king.',
      'White pushes e5, lunging at the f6-knight.',
      '...b4 attacks the c3-knight that shields White’s king — every tempo is gold.',
      'White grabs the f6-knight.',
      '...bxc3 smashes the knight shielding the queenside king.',
      'White recaptures on c3 with the queen.',
      '...exf6 opens the centre, taking back the pawn.',
      'White keeps the bishop with Bh4.',
      '...d5 — the hammer blow: the centre rips open toward c3 and Black’s attack is very real.',
    ],
  },
  {
    id: 'mp-pircdefence-lion',
    title: 'Lion Variation: The Philidor-Style Coil',
    prefix: 'e4 d6 d4 Nf6 Nc3 e5 Nf3 Nbd7 Bc4 Be7 O-O O-O a4 c6',
    lineSan: 'Re1 Qc7 h3 b6 Bg5 Bb7 dxe5 Nxe5',
    lineTitle: 'Coiled and Comfortable',
    overview:
      "The Lion skips the fianchetto and plays ...e5 at once, steering into a solid Philidor-like structure that sidesteps a mountain of Austrian theory. Black builds maximum flexibility — ...Nbd7 backing e5, ...Be7, ...c6 — then coils on the queenside with ...b6 and ...Bb7, eyeing the long light-squared diagonal at White's king, with the queen on c7. When White releases with dxe5, the knight recaptures and lands proudly in the centre on e5. From a modest start Black reaches a sound, harmonious position with active, well-placed pieces.",
    pawnBreaks: ['...e5 (already played — the Philidor break)', 'a later ...b5 or ...d5 when prepared'],
    pieceManeuvers: ['...Nbd7 supporting e5', '...Bb7 + ...Qc7 battery on the long diagonal', '...Nxe5 centralised'],
    strategicThemes: ['Philidor-style flexibility', 'The long light-squared diagonal', 'Central knight outpost on e5'],
    endgameTransitions: ['The symmetrical e5/e4 structure can simplify into a balanced ending'],
    annotations: [
      'White centralises the rook on e1.',
      '...Qc7 lines the queen up behind the centre and the long diagonal.',
      'White makes luft with h3.',
      '...b6 opens the bishop’s road to b7.',
      'White tries the Bg5 pin.',
      '...Bb7 — calm: the bishop eyes the long diagonal straight at White’s king.',
      'White releases the central tension.',
      '...Nxe5 recaptures and lands a proud knight in the centre — Black is comfortable and active.',
    ],
  },
  {
    id: 'mp-pircdefence-fianchetto',
    title: 'Fianchetto System: Win the Kingside with ...f5',
    prefix: 'e4 d6 d4 Nf6 Nc3 g6 g3 Bg7 Bg2 O-O Nge2 e5 O-O Nc6 d5 Ne7',
    lineSan: 'a4 Nd7 Be3 f5',
    lineTitle: 'The ...f5 Break',
    overview:
      "Against White's quietest, most positional try — g3 and Bg2 — Black plays for the centre and for space. The strike is ...e5 and ...Nc6 to pressure d4; when White clamps with d5, the locked centre tells Black exactly where to play. The knight reroutes from c6 to e7 toward the magnificent f5 blockade square, and the whole plan crowns with the ...f5 break, gaining kingside space and opening lines for the g7-bishop and the rooks on the f-file. Whoever lands f5 first owns the kingside — make it Black.",
    pawnBreaks: ['...f5 (the kingside break — the whole plan)', "guard against White's own f4/f5"],
    pieceManeuvers: ['...Nc6-e7 toward the f5 outpost', '...Nd7 regroup', '...f5 opening the f-file'],
    strategicThemes: ['Closed-centre, play on the wing', 'Knight to the f5 blockade', 'Kingside space + open f-file'],
    endgameTransitions: ['Locked-centre manoeuvring may persist deep into the game'],
    annotations: [
      'White expands with a4 on the queenside.',
      '...Nd7 regroups the knight, clearing the f-pawn’s path.',
      'White develops the bishop to e3.',
      '...f5 — Black’s thematic kingside break in the locked Fianchetto: space, the long diagonal, and the f-file open up. Equal, double-edged play.',
    ],
  },
  {
    id: 'mp-pircdefence-czech',
    title: 'Czech Defence: Compact, Then Strike ...e5',
    prefix: 'e4 d6 d4 Nf6 Nc3 c6 f4 Qa5 Bd3 e5 Nf3 Bg4',
    lineSan: 'Be3 Nbd7 O-O Be7 h3 Bxf3 Qxf3 O-O Ne2 c5 dxe5 dxe5',
    lineTitle: 'A Sound, Harmonious Game',
    overview:
      "The Czech swaps the fianchetto for a low, compact ...c6 setup, sidestepping the sharpest Austrian lines. The clever ...Qa5 pins the c3-knight and freezes the centre, preparing the direct ...e5 challenge; ...Bg4 then pins the f3-knight so d4's defender is tied down. Black finishes development, trades the bishop for the knight to loosen White's grip, and strikes again with ...c5. When the centre finally resolves with dxe5 dxe5, Black has a sound, harmonious position with no weaknesses — exactly what the Czech promises.",
    pawnBreaks: ['...e5 (the central challenge)', '...c5 (the second strike)'],
    pieceManeuvers: ['...Qa5 pinning c3', '...Bg4xf3 to loosen d4', '...Nbd7 + ...Be7 development'],
    strategicThemes: ['Compact ...c6 structure', 'Pin pressure on the centre', 'Direct central challenge over the fianchetto'],
    endgameTransitions: ['The open d-file after ...dxe5 can lead to a balanced ending'],
    annotations: [
      'White develops the bishop to e3.',
      '...Nbd7 completes the knight development, backing e5.',
      'White castles.',
      '...Be7 — modest and solid.',
      'White asks the bishop with h3.',
      '...Bxf3 trades to loosen White’s grip on the centre.',
      'White recaptures with the queen.',
      '...O-O — Black is safe and developed.',
      'White reroutes the knight to e2.',
      '...c5 strikes the centre a second time.',
      'White releases the tension.',
      '...dxe5 — the centre resolves; Black is sound and harmonious, no weaknesses.',
    ],
  },
  {
    id: 'mp-pircdefence-austrian-e5',
    title: 'Austrian: Meet an Early e5 with ...c5',
    prefix: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O e5',
    lineSan: 'Nfd7 Be2 c5',
    lineTitle: 'Undermine the Overextended Centre',
    overview:
      "In the Austrian, White sometimes lunges e5 immediately, attacking the f6-knight and trying to bulldoze the centre forward. But a pawn that advances no longer defends what it left behind. The accurate retreat is ...Nfd7 — inward, not to the rim — keeping the knight active and still pressing e5. Then the refutation of the rush: ...c5, striking the base that holds White's whole pawn chain together. Once the support under d4 is hit, the grand centre wobbles. Black meets brute force with a precise central counter-punch — the hypermodern idea distilled.",
    pawnBreaks: ['...c5 (hit the base of the chain)', "later ...cxd4 / ...f6 to dissolve the centre"],
    pieceManeuvers: ['...Nfd7 active retreat', '...c5 undermining d4', '...Nc6/...Qb6 piling on d4'],
    strategicThemes: ['Undermine, don’t blockade', 'Punish overextension', 'Hypermodern central counter-strike'],
    endgameTransitions: ['If the centre dissolves, an open-ish middlegame with even chances'],
    annotations: [
      '...Nfd7 — the accurate retreat: inward and active, still eyeing e5, not the passive rim.',
      'White supports with Be2.',
      '...c5 — the refutation: it hits the base of the chain and the overextended centre starts to wobble.',
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
