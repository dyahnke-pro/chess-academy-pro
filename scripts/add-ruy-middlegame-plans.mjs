// One-shot builder: add distinct-battle-plan middlegame plans for the
// Ruy Lopez variations to middlegame-plans.json. The two existing
// ruy-lopez plans (mp-ruylopez-d4 / -f4) cover the Closed main line;
// these add the variations whose middlegame is genuinely different —
// Marshall (attack for a pawn), Berlin (queenless endgame), Open (piece
// activity vs light squares), Exchange (structural endgame).
//
// G3-safe: every playable line is a segment of the corresponding
// master-class lesson sequence (already DB-grounded + integrity-tested),
// replayed through chess.js here so SAN/legality is the truth. Per-move
// arrows are derived from chess.js from/to (always valid). The script
// refuses to write if any line is illegal or any annotation count is off.
//
// Run: node scripts/add-ruy-middlegame-plans.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const JSON_PATH = 'src/data/middlegame-plans.json';

/** Replay a space-separated SAN prefix, return the FEN reached. */
function fenAfter(sanPrefix) {
  const c = new Chess();
  for (const m of sanPrefix.trim().split(/\s+/)) c.move(m);
  return c.fen();
}

/**
 * Validate a line from startFen, returning { moves, arrows } where each
 * move's arrow is its own from->to. Throws on any illegal move.
 */
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
    id: 'mp-ruylopez-marshall',
    title: 'Marshall Attack: A Pawn for the Initiative',
    prefix:
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d5 exd5 Nxd5 Nxe5 Nxe5 Rxe5 c6',
    lineSan: 'd4 Bd6 Re1 Qh4 g3 Qh3 Be3 Bg4 Qd3',
    lineTitle: 'The Attack Crashes In',
    overview:
      "The Marshall is the great exception to the Ruy Lopez's patience. Black sacrifices the e5-pawn with ...d5 to blow the centre open and pour every piece at White's king. White is a clean pawn up and must defend with absolute precision: the queen swings to h3, the bishop to d6, the rooks to the e-file, and a single inaccuracy is fatal. The plan for Black is not to regain the pawn but to keep a permanent, paralysing initiative; the plan for White is to return the pawn at the right moment, blunt the attack with g3 and Be3-Qd3, and emerge a pawn up in a calmer position.",
    annotations: [
      "White returns part of the structure with tempo, but the pawn count still favours him — the real story is Black's coming initiative.",
      "Black aims the bishop at the kingside, joining the attack with tempo against h2.",
      "White's rook steps back to e1 to defend the back ranks against the gathering storm.",
      "The queen leaps to h4 — the classic Marshall lift — threatening to land on h3 beside White's king.",
      "White blunts the immediate mating ideas with g3, accepting a permanent light-square weakening.",
      "The queen settles on h3, glued to White's king and eyeing g2 — the heart of the attack.",
      "White develops with tempo and prepares Qd3, returning the pawn for coordinated defence.",
      "Black's last piece joins in; the bishop on g4 rakes the back rank and ties White down.",
      "White centralizes the queen to defend g3 and contest the light squares — the Marshall's bargain is struck.",
    ],
    pawnBreaks: [
      { move: 'd2-d4', explanation: "White's d4 returns part of the gambit material to free the position and blunt Black's piece pressure, blocking the d6-bishop's diagonal toward h2." },
      { move: 'c6-c5', explanation: "Black's thematic lever to open lines and activate the b7-bishop and rooks against White's centre once the attack is rolling." },
    ],
    pieceManeuvers: [
      { piece: 'Queen', route: 'Qd8-h4-h3', explanation: 'The signature Marshall queen lift. From h3 the queen pins White to the defence of g2 and the light squares around the king, the focal point of the whole attack.' },
      { piece: 'Bishop', route: 'Bf8-d6 and Bc8-g4', explanation: "Both bishops swing to the kingside — d6 toward h2, g4 raking the back rank — so every minor piece points at White's king." },
      { piece: 'Rook', route: 'Rf8-e8 / Ra8-e8', explanation: 'A rook drops onto the e-file behind the action, adding a heavy piece to the attack and contesting the only open file.' },
    ],
    strategicThemes: [
      "Black's compensation is the initiative, not the pawn — every piece reaches an attacking post before White can untangle, and the threat of ...Qh3 with mating ideas around g2 is permanent.",
      "White's defensive plan is concrete: g3 to stop the immediate mate, Be3 and Qd3 to return the pawn and trade attackers, then consolidate a pawn up.",
      "The light squares around White's king (g2, f3, h3) are the battleground; once g3 is played they become permanent holes Black's pieces target.",
      "Practical danger outweighs the engine evaluation — White must find a string of only-moves, which is why so many strong players avoid the Marshall with the Anti-Marshall a4.",
    ],
    endgameTransitions: [
      'If White survives the attack and trades the heavy pieces, the extra pawn decides — the Marshall is all-or-nothing for Black, with little to fall back on if the initiative fizzles.',
      "When Black regains the pawn but enters an endgame, the bishop pair and active rooks usually hold the balance rather than win, so Black keeps queens on to press.",
    ],
  },
  {
    id: 'mp-ruylopez-berlin',
    title: 'Berlin Endgame: Majority vs the Bishop Pair',
    prefix: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
    lineSan: 'h3 Ke8 Nc3 h5 Bf4 Be7 Rad1 Be6',
    lineTitle: 'The Queenless Middlegame',
    overview:
      "The Berlin's queenless middlegame is one of the most important structures in modern chess — Kramnik used it to dethrone Kasparov. The queens are off and Black's king has lost castling, but Black owns the bishop pair and a structure that will not crack. White's only winning try is to convert the clean kingside pawn majority into a passed pawn; Black blockades on f5, walks the king to safety, contests the open d-file, and aims to prove the majority can never advance. It is decided square by square, not by force.",
    annotations: [
      "White makes luft and prepares g4 — advancing the kingside majority is the only path to a win.",
      "Black's king walks toward e8, beginning the slow reorganization the Berlin demands.",
      "White develops to pressure the awkward king and contest the central light squares.",
      "A key prophylactic move: h5 stops g4 and keeps the f5-knight planted on its outpost.",
      "White's bishop eyes the queenside and the c7-square, probing Black's loose pawns.",
      "Black unbundles; the dark-squared bishop frees the king and connects the rooks.",
      "White seizes the open d-file, the natural artery for pressure in this endgame.",
      "Black's bishop reaches e6, activating the bishop pair and shoring up the light squares.",
    ],
    pawnBreaks: [
      { move: 'g2-g4', explanation: "White's central winning idea: roll the kingside majority. Black's ...h5 is the standard antidote, freezing g4 and securing the f5-outpost." },
      { move: 'f2-f4-f5', explanation: 'A slower majority advance, gaining space and challenging the blockading knight — but it concedes squares and must be timed carefully.' },
    ],
    pieceManeuvers: [
      { piece: 'King', route: 'Kd8-e8-(f7)', explanation: 'The Berlin king is a fighting piece — it walks to e8 and onward, sheltering on the kingside and supporting the pawns in the endgame.' },
      { piece: 'Knight', route: 'Nf5 blockade', explanation: "Black's knight on f5 is the soul of the defence: it blockades the kingside majority and cannot easily be dislodged once ...h5 is in." },
      { piece: 'Bishop', route: 'Bc8-e6 / Bf8-e7-(d6)', explanation: "The bishop pair fans out to the long diagonals, the source of Black's counterplay and the reason the majority is so hard to push." },
    ],
    strategicThemes: [
      "White's only structural trump is the clean four-vs-three kingside majority that can one day make a passed pawn; the entire game is whether it can ever safely advance.",
      "Black's bishop pair and the f5-knight blockade are the counterweight — long diagonals plus a frozen majority usually add up to a fortress at the top level.",
      'The open d-file is the main artery: whoever controls it dictates where the heavy pieces operate.',
      "Black's doubled c-pawns are the long-term weakness White probes, but they also shield the king and control central squares.",
    ],
    endgameTransitions: [
      'This IS the endgame — the Berlin reaches a queenless middlegame by move sixteen, so technique is everything from the start.',
      'If White trades into a pure pawn ending the majority can win, so Black keeps minor pieces on to leverage the bishops against the structure.',
    ],
  },
  {
    id: 'mp-ruylopez-open',
    title: 'Open Ruy: Piece Activity vs the Light Squares',
    prefix: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6',
    lineSan: 'Nbd2 Nc5 c3 d4 Ng5 dxc3 Nxe6 fxe6',
    lineTitle: 'Activity Meets the Targets',
    overview:
      "The Open Variation is the Ruy turned inside out: instead of the patient main line, Black grabs e4 and plays for fast piece activity and a race. The defining structure is Black's d5-pawn screened by the e6-bishop, anchoring an active knight. White leans on the b3-bishop's pressure against e6 and the loose light squares to prove the pawn-grab was premature, often trading on e6 to open the f-file in front of Black's king. The battle is Black's activity against White's concrete targets.",
    annotations: [
      "White reroutes the knight toward the kingside and prepares to challenge Black's active pieces.",
      "Black's knight swings to c5, hitting the b3-bishop and eyeing the e4 and d3 squares.",
      "White bolsters the centre and clamps the d4-square before Black can use it.",
      "Black grabs space with d4, gaining a protected outpost and cramping White.",
      "White's knight jumps to g5 to trade off Black's prized e6-bishop, guardian of the light squares.",
      "Black grabs the c3-pawn, accepting open lines in return — the Open Ruy's permanent imbalance.",
      "White trades on e6, eliminating the strong bishop and exposing Black's king.",
      "Black recaptures, opening the f-file but accepting weak, isolated e-pawns — activity against structure.",
    ],
    pawnBreaks: [
      { move: 'd5-d4', explanation: "Black's thematic space-grab: the d4-pawn cramps White and grants a protected outpost, the backbone of Black's active setup." },
      { move: 'c2-c3', explanation: 'White undermines the d4-pawn and fights for the central dark squares before Black can entrench.' },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Ne4-c5', explanation: "The e4-knight retreats to its ideal square c5, hitting the b3-bishop and supporting Black's queenside and centre." },
      { piece: 'Bishop', route: 'Bb3 vs e6', explanation: "White's light-squared bishop is the star: from b3 it pressures e6 and f7, often combining with Ng5 to trade off Black's defender of the light squares." },
      { piece: 'Knight', route: 'Nb1-d2-(g5)', explanation: 'White develops the queen-knight toward the kingside, eyeing the g5-jump that wins the e6-bishop and cracks open the f-file.' },
    ],
    strategicThemes: [
      "Black plays for activity and a race, not material — every piece reaches an aggressive post quickly, and the d4-pawn cramps White.",
      "White targets the light squares around e6 and f7 that Black's setup leaves loose, especially once the e6-bishop is traded.",
      'Opening the f-file in front of Black\'s often-uncastled king is a recurring White theme after Nxe6 fxe6.',
      "The imbalance is permanent: Black's piece activity and centre against White's structural targets — whoever's trumps speak first wins.",
    ],
    endgameTransitions: [
      "If the pieces come off, Black's broken e6/e-pawns and light-square holes become a lasting endgame liability for Black.",
      "When Black keeps the initiative alive, the active knight on c5 and the d4-pawn can carry the middlegame before structure matters.",
    ],
  },
  {
    id: 'mp-ruylopez-exchange',
    title: 'Exchange Ruy: The Structural Endgame',
    prefix: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4',
    lineSan: 'c5 Nb3 Qxd1 Rxd1 Bg4 f3 Be6 Nc3',
    lineTitle: 'Majority vs Bishops',
    overview:
      "Fischer's favourite way to play the Ruy: White trades on c6 on purpose, surrendering the bishop pair to inflict doubled c-pawns. The result is a clean four-vs-three kingside majority that can make a passed pawn, against a black queenside crippled by the doubled pawns that never can. White steers toward an endgame — even inviting the queens off — and grinds. Black's compensation is real: the two bishops and a broad pawn centre give active middlegame play. The fight is a race between Black's bishops and White's superior structure.",
    annotations: [
      "Black grabs central space and prevents White's knight from settling, leaning on the bishop pair.",
      "White retreats the knight, content to head for an endgame where his structure tells.",
      "Black invites the queen trade; even queenless, the bishops give real activity.",
      "White recaptures with the rook, taking the open d-file into the endgame.",
      "Black's bishop swings to g4, raking the back rank and pressuring f3.",
      "White challenges the bishop and prepares to advance the kingside majority — the whole point of the Exchange.",
      "Black's bishop reroutes to e6, holding the light squares and eyeing White's queenside.",
      "White completes development; the long technical fight begins — majority versus the two bishops.",
    ],
    pawnBreaks: [
      { move: 'f3 then e4-f4-g4', explanation: "White's winning plan is to mobilize the healthy kingside majority; f3 supports e4 and prepares the pawn storm that can manufacture a passed pawn." },
      { move: 'c6-c5', explanation: "Black gains central space and frees the bishops, using the doubled c-pawns dynamically before they become a static endgame weakness." },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nd4-b3', explanation: 'White retreats the knight to b3, sidestepping ...c5 and steering toward the endgame where the pure structure decides.' },
      { piece: 'Bishop', route: 'Bc8-g4-e6', explanation: "Black's light-squared bishop is the most active piece — it pressures f3 from g4, then reroutes to e6 to hold the light squares and probe the queenside." },
      { piece: 'King', route: 'Kg1-f2-e3', explanation: 'In the queenless endgame the white king marches to the centre to support the kingside majority and add a piece to the advance.' },
    ],
    strategicThemes: [
      "White's entire game rests on one fact: a clean kingside majority that can make a passed pawn versus a black queenside crippled by doubled c-pawns that cannot.",
      "Black's compensation is the bishop pair and a broad centre — dynamic factors that must tell before the board empties and structure dominates.",
      'White happily trades pieces and even queens to reach the ending where the structural edge is decisive; Black avoids mass exchanges to keep the bishops biting.',
      "It is the photographic negative of the Marshall — no sacrifice, no attack, just the accumulation and conversion of one small, lasting advantage.",
    ],
    endgameTransitions: [
      "The Exchange aims directly at the endgame: trade down, march the kingside majority, make a passed pawn, win. This is the structure's whole purpose.",
      "If Black activates the bishops and opens the position before White consolidates, the bishop pair can hold or even seize the initiative — so White trades patiently.",
    ],
  },
];

function main() {
  const plans = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  const existing = new Set(plans.map((p) => p.id));
  const added = [];

  for (const spec of SPECS) {
    if (existing.has(spec.id)) {
      console.log(`[skip] ${spec.id} already present`);
      continue;
    }
    const startFen = fenAfter(spec.prefix);
    const { moves, arrows } = buildLine(startFen, spec.lineSan, spec.id);
    if (moves.length !== spec.annotations.length) {
      throw new Error(`[${spec.id}] ${moves.length} moves but ${spec.annotations.length} annotations`);
    }
    const plan = {
      id: spec.id,
      openingId: 'ruy-lopez',
      criticalPositionFen: startFen,
      title: spec.title,
      overview: spec.overview,
      pawnBreaks: spec.pawnBreaks.map((pb) => ({ ...pb, fen: startFen })),
      pieceManeuvers: spec.pieceManeuvers,
      strategicThemes: spec.strategicThemes,
      endgameTransitions: spec.endgameTransitions,
      playableLines: [
        { fen: startFen, moves, annotations: spec.annotations, arrows, title: spec.lineTitle },
      ],
    };
    plans.push(plan);
    added.push(spec.id);
    console.log(`[add]  ${spec.id} — line ${moves.length} plies from ${startFen}`);
  }

  if (added.length > 0) {
    writeFileSync(JSON_PATH, JSON.stringify(plans, null, 2) + '\n');
    console.log(`\nWrote ${added.length} new plan(s): ${added.join(', ')}`);
    console.log(`Total plans: ${plans.length}`);
  } else {
    console.log('\nNothing to add.');
  }
}

main();
