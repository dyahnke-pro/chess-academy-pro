// Adds middlegame plans for the three Closed Ruy sub-systems that lacked
// one — Breyer, Chigorin, Zaitsev — so all 7 variation tabs have a plan.
// Same G3-safe pattern as add-ruy-middlegame-plans.mjs: the playable
// line is a segment of the integrity-tested master-class beat lesson,
// replayed through chess.js (legality is the truth); per-move arrows
// derive from chess.js from/to. Refuses to write on any illegal move.
//
// Run: node scripts/add-ruy-closed-middlegame-plans.mjs

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
    id: 'mp-ruylopez-breyer',
    title: 'Breyer: The Knight Reroute',
    prefix:
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8',
    lineSan: 'Ng3 g6 a4 c5 d5 c4 Bg5',
    lineTitle: 'Locking the Centre, Storming the Wings',
    overview:
      "The Breyer is the Closed Ruy at its most refined. Black's startling Nb8 sends the knight home to reroute to d7, where it supports e5 and frees the b7-bishop's long diagonal. Both sides complete a slow, harmonious build-up — White with Nbd2-f1-g3 eyeing f5, Black with the Bb7/Bf8 fianchetto-style regrouping — before the centre clarifies. White probes the queenside with a4 while Black strikes with c5; once White locks with d5, the game splits into two-winged manoeuvring where understanding outweighs memorisation. Spassky, Karpov and Kasparov all leaned on it in title matches.",
    annotations: [
      "The knight completes its journey to g3, eyeing the f5- and h5-squares — the point of the whole reroute.",
      "Black fianchettoes the bishop's shelter and prepares ...Bg7, the harmonious Breyer regrouping.",
      "White probes the queenside, the standard lever to open a second front before Black is fully coordinated.",
      "Black meets the flank thrust with the central counter, contesting d4 and gaining queenside space.",
      "White locks the centre with d5, defining the structure: now it's a two-winged manoeuvring battle.",
      "Black clamps the queenside with c4, fixing White's pawns and securing the c5-square for a piece.",
      "White's bishop pins the f6-knight, beginning the kingside regroup toward an f5 break.",
    ],
    pawnBreaks: [
      { move: 'a2-a4', explanation: "White's standard queenside lever — pressure b5 to open a file before Black completes the regroup." },
      { move: 'c5 then c4', explanation: "Black's central counter and queenside clamp — fix White's pawns and claim the c5 outpost." },
      { move: 'f2-f4', explanation: 'After the kingside pieces are in place, f4 is the thematic break to open lines toward Black\'s king.' },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nb8-d7', explanation: "The signature Breyer reroute: the knight goes home to d7, propping up e5 and unblocking the b7-bishop." },
      { piece: 'Knight', route: 'Nb1-d2-f1-g3', explanation: "White's queen-knight takes the long road to g3, aiming for the f5-outpost — the engine of White's kingside play." },
      { piece: 'Bishop', route: 'Bf8-g7', explanation: 'Black refianchettoes the dark-squared bishop, reinforcing e5 and the long diagonal.' },
    ],
    strategicThemes: [
      'The reroute buys harmony: every black piece reaches an ideal square before the centre opens, which is why the Breyer is so solid.',
      "With the centre locked by d5, the game becomes two-winged manoeuvring — White presses the kingside with Ng3/f4, Black the queenside with ...c4 and minority play.",
      "The f5-outpost is White's dream square; Black spends real energy preventing Ng3-f5 or making it harmless.",
      'Patience over force: the Breyer rewards deep positional understanding, not memorised tactics.',
    ],
    endgameTransitions: [
      "Mass exchanges down the half-open files often reach a balanced ending where Black's sound structure holds comfortably — the Breyer is a drawing weapon at the top precisely because the endgames are solid.",
      'If White over-presses the kingside and trades into a queenside-majority ending, Black\'s ...c4 clamp can become the more dangerous trump.',
    ],
  },
  {
    id: 'mp-ruylopez-chigorin',
    title: 'Chigorin: Queenside Expansion',
    prefix: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7',
    lineSan: 'Nbd2 Nc6 d5 Nd8 Nf1',
    lineTitle: 'The Knight Tour and the Locked Centre',
    overview:
      "For decades the Chigorin WAS the main line of the Ruy Lopez — the tabiya through which world titles were fought. Black settles accounts with the Spanish bishop immediately: ...Na5 hits it, ...c5 grabs queenside space, and ...Qc7 props up e5. White retreats the bishop to c2, builds the c3/d4 centre, and when Black completes the structure White locks it with d5. The play then revolves around the manoeuvring duel — White's knight tours toward the kingside, Black reroutes the offside a5-knight back into the game and expands on the queenside.",
    annotations: [
      "White develops the queen-knight toward f1-g3, beginning the standard kingside regroup.",
      "Black brings the offside knight back from a5 toward the centre — the Chigorin's perennial regrouping problem.",
      "White locks the centre with d5, gaining space and defining a two-winged manoeuvring battle.",
      "Black's knight steps to d8, heading for e6 or f7 to pressure White's space and the kingside.",
      "White's knight reaches f1 en route to g3, lining up the f5-outpost and a kingside build-up.",
    ],
    pawnBreaks: [
      { move: 'c2-c3 then d2-d4', explanation: "White's classical centre — build c3/d4 to meet ...c5 and create the option of locking with d5 or capturing on e5." },
      { move: 'c7-c5', explanation: "Black's queenside space-grab that defines the Chigorin, claiming room and hitting White's centre." },
      { move: 'f2-f4', explanation: 'Once the kingside pieces arrive, f4 is the break that opens the f-file toward Black\'s king.' },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nc6-a5-c6/b7', explanation: "Black's knight hits the Spanish bishop on a5, then must reroute back into play — the Chigorin's signature (and its main practical headache)." },
      { piece: 'Knight', route: 'Nb1-d2-f1-g3', explanation: "White's queen-knight tours to g3, eyeing f5 — the heart of the kingside attack." },
      { piece: 'Queen', route: 'Qd8-c7', explanation: 'The queen settles on c7, defending e5 and supporting the ...c5 break and queenside expansion.' },
    ],
    strategicThemes: [
      "It's bedrock theory, not a sideline: the Chigorin sends the knight forward to a5 to challenge the bishop, where the Breyer reroutes it backward — same spine, different answer to the bishop question.",
      'With the centre locked by d5 the battle is two-winged: White attacks on the kingside via Ng3/f4-f5, Black expands on the queenside.',
      "Black's a5-knight is the structural theme — getting it back into the game efficiently often decides who stands better.",
      'Space and the f5-outpost are White\'s assets; Black\'s queenside majority and piece activity are the counterweight.',
    ],
    endgameTransitions: [
      "If White's kingside attack is neutralised, the game frequently simplifies into a queenside-majority ending where Black's space tells.",
      'Trading into a knight ending often favours whoever solved the offside-knight problem first — coordination converts.',
    ],
  },
  {
    id: 'mp-ruylopez-zaitsev',
    title: 'Zaitsev: Tension and the Ra3 Lift',
    prefix:
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Bb7 d4 Re8 Nbd2 Bf8 a4 h6 Bc2',
    lineSan: 'exd4 cxd4 Nb4 Bb1 c5 d5 Nd7 Ra3',
    lineTitle: 'The Rook Swings to the Kingside',
    overview:
      "The Zaitsev was Karpov's lifelong main weapon, fed to him by the trainer it's named for, and it carried the highest-stakes matches in history. Black commits the bishop early to b7 and the rook to e8, holding the centre at maximum tension. The play turns concrete fast: Black releases the tension with ...exd4, jumps the knight to b4 to harass the c2-bishop, and strikes with ...c5. White clamps with d5 and unveils the signature idea — the rook lift Ra3, swinging across the third rank toward the kingside. A tense, theory-heavy battle where a single tempo decides the evaluation.",
    annotations: [
      "Black releases the central tension, opening the position before White completes the build-up.",
      "White recaptures, accepting an isolated-leaning d4-pawn in return for central space and open lines.",
      "Black's knight leaps to b4 to harass the c2-bishop and fight for the central light squares.",
      "White tucks the bishop back to b1, keeping the b1-h7 diagonal alive for a future kingside attack.",
      "Black strikes with c5, challenging d4 and claiming queenside space — the critical Zaitsev tension.",
      "White clamps with d5, fixing the centre and freeing the third rank for the rook lift.",
      "Black's knight reroutes to d7, heading for the strong c5/e5 squares behind the locked centre.",
      "Ra3 — the signature Zaitsev rook lift, swinging the rook across the third rank toward Black's king.",
    ],
    pawnBreaks: [
      { move: 'exd4 then c5', explanation: "Black's two-step in the centre: release the tension, then strike with c5 to challenge d4 and grab queenside space." },
      { move: 'd4-d5', explanation: "White's clamp — lock the centre, gain space, and crucially free the third rank for Ra3." },
      { move: 'f2-f4 / g2-g4', explanation: "After Ra3 swings over, White's kingside pawns can join the attack against Black's king." },
    ],
    pieceManeuvers: [
      { piece: 'Rook', route: 'Ra1-a3-g3', explanation: "The signature Zaitsev rook lift: once d5 frees the third rank, Ra3 swings toward the kingside to spearhead the attack." },
      { piece: 'Knight', route: 'Nc6-b4 then Nf6-d7', explanation: "Black's knights reposition — ...Nb4 harasses the bishop, ...Nd7 heads for the c5/e5 outposts behind the locked centre." },
      { piece: 'Bishop', route: 'Bc2-b1', explanation: 'White retreats the bishop to b1, preserving the deadly b1-h7 diagonal for the kingside assault.' },
    ],
    strategicThemes: [
      "The Zaitsev is precision under fire: the early ...Bb7/...Re8 hold maximum central tension, and a single tempo can flip the evaluation — a line to know cold, not dabble in.",
      'After d5 the position locks and the Ra3 lift defines White\'s play — the rook joins a kingside attack the other Closed systems can\'t generate as fast.',
      "Black's counterplay is the queenside majority and the active knights on c5/e5; the race is attack-versus-counterattack.",
      'Where the Breyer is patience and the Chigorin is queenside space, the Zaitsev is the sharpest, most concrete of the Closed Ruy systems.',
    ],
    endgameTransitions: [
      "If White's kingside attack burns out, the d4-d5 structure can leave a slightly loose centre that Black targets in the ending.",
      'Simplifying with the c5/e5 knight outposts intact usually favours Black; White must make the attack count before the heavy pieces come off.',
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
    plans.push({
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
    });
    added.push(spec.id);
    console.log(`[add]  ${spec.id} — line ${moves.length} plies`);
  }

  if (added.length > 0) {
    writeFileSync(JSON_PATH, JSON.stringify(plans, null, 2) + '\n');
    console.log(`\nWrote ${added.length}: ${added.join(', ')} | total plans: ${plans.length}`);
  } else {
    console.log('\nNothing to add.');
  }
}

main();
