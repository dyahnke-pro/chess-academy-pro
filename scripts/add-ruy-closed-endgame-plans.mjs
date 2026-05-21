// Deep-middlegame-into-endgame plans for the three Closed Ruy systems
// (Breyer/Chigorin/Zaitsev) — David 2026-05-21: every variation gets an
// endgame; structures differ, narration carries any overlap. Each is the
// real deep DB line replayed through chess.js (G3), narrated to teach the
// characteristic structure and where it heads in the ending. Breyer +
// Chigorin weave in the Bc2↔Noah's-Ark prophylaxis (the maneuver that
// makes the trap impossible). Zaitsev keeps the bishop on b3 (…Bb7 line),
// so it gets its own structural story — no Bc2 point.
//
// Run: node scripts/add-ruy-closed-endgame-plans.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const JSON_PATH = 'src/data/middlegame-plans.json';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function buildLine(lineSan, ann, planId) {
  const c = new Chess(START);
  const moves = [];
  const arrows = [];
  for (const san of lineSan.trim().split(/\s+/)) {
    const mv = c.move(san);
    if (!mv) throw new Error(`[${planId}] illegal "${san}" from ${c.fen()}`);
    moves.push(mv.san);
    arrows.push([{ from: mv.from, to: mv.to }]);
  }
  if (moves.length !== ann.length) throw new Error(`[${planId}] ${moves.length} moves vs ${ann.length} annotations`);
  return { moves, arrows, finalFen: c.fen() };
}

// annotation helper: sparse map {plyIndex: text} → full array of length n
function ann(n, map) {
  return Array.from({ length: n }, (_, i) => map[i] ?? '');
}

const SPECS = [
  {
    id: 'mp-ruylopez-breyer-endgame',
    title: 'Breyer: From Reroute to Endgame',
    lineSan:
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 c5',
    lineTitle: 'The Reroute, the Prophylaxis, the Plan',
    overview:
      "The Breyer is patience with a destination. Black's knight retreats all the way home to reroute through d7; White completes a harmonious build-up and — crucially — tucks the bishop to c2. Watch the structure lock, then understand where it's headed: a two-winged battle whose endgame favours White's kingside space.",
    annMap: {
      17: "The Breyer's calling card — the knight retreats all the way home, to reroute through d7 and free the b7-bishop's long diagonal.",
      22: "And the quiet move that does double duty: Bc2. It develops toward the kingside AND tucks the bishop safely off b3 — sidestepping the Noah's Ark trap forever. The cage Black dreams of can never close. That single piece of prophylaxis is the whole reason the closed main lines retreat this bishop.",
      23: "Black grabs queenside space and the centre locks. Now look past the middlegame: trade the heavy pieces and White's kingside space plus the f5-square are the trumps that decide the ending. The Breyer is patience that cashes out in the endgame.",
    },
    pawnBreaks: [
      { move: 'd4-d5 / f2-f4', explanation: 'Lock the centre with d5, then expand on the kingside with f4 — the space that wins the ending.' },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nb8-d7', explanation: 'The Breyer reroute — home and back out to d7, propping e5 and freeing the b7-bishop.' },
      { piece: 'Bishop', route: 'Bb3-c2', explanation: "Prophylaxis: off b3 so Noah's Ark can never spring, and onto the b1-h7 diagonal for the kingside.", },
    ],
    strategicThemes: [
      "Bc2 makes the Noah's Ark trap structurally impossible — the maneuver IS the defence.",
      'Two-winged play: White presses the kingside (f5, the space), Black the queenside.',
      "The endgame is the Breyer's pay-off — White's space and the f5-outpost convert when the pieces come off.",
    ],
    endgameTransitions: [
      "Trade into a heavy-piece or minor-piece ending and White's kingside space and the f5-square become decisive.",
      "Black's queenside majority is the counter-trump; whoever's structure is sounder when the queens vanish wins.",
    ],
  },
  {
    id: 'mp-ruylopez-chigorin-endgame',
    title: 'Chigorin: Queenside Space into the Ending',
    lineSan:
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Bd7 Nf1 Rfe8 Ne3 g6',
    lineTitle: 'The Knight Hits, the Bishop Hides, the Space Tells',
    overview:
      "For decades the Chigorin WAS the main line. Black's ...Na5 hits the Spanish bishop, ...c5 claims queenside space, and White retreats to c2 — both answering the knight and dodging the Noah's Ark trap. The knight tours to e3 hunting d5/f5. Where it's all heading: a queenside-minority versus central-space ending.",
    annMap: {
      17: "The Chigorin's signature — ...Na5 jumps at the b3-bishop and demands it move.",
      18: "Bc2 — and it is not merely a retreat. It answers the knight AND tucks the bishop off b3, so the Noah's Ark trap can never spring. Prophylaxis and development in a single move.",
      26: "The knight completes its tour to e3, eyeing the d5- and f5-outposts — the squares the whole middlegame revolves around.",
      27: "Black blunts the knight with g6. Now the shape of the ending is set: Black's queenside minority pawns press, White's central space and the d5/f5 squares answer. Trade down and that space is the deciding word.",
    },
    pawnBreaks: [
      { move: 'd4 then d5', explanation: 'Build the centre and clamp with d5, fixing the structure for the two-winged ending.' },
      { move: 'a4 (later)', explanation: 'Probe the queenside to fix Black\'s majority before the endgame.' },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nc6-a5', explanation: 'Hits the b3-bishop — the Chigorin\'s defining idea (and the reason White must retreat it).' },
      { piece: 'Bishop', route: 'Bb3-c2', explanation: "Answers ...Na5 and dodges Noah's Ark in one — the maneuver is the trap's antidote.", },
      { piece: 'Knight', route: 'Nb1-d2-f1-e3', explanation: 'The long tour to e3, hunting the d5 and f5 outposts.' },
    ],
    strategicThemes: [
      "Bc2 is forced AND prophylactic — it parries ...Na5 and erases the Noah's Ark trap together.",
      "Black's queenside minority versus White's central space — that imbalance carries into the ending.",
      "The d5/f5 outposts are the prize; owning them in the endgame usually decides it.",
    ],
    endgameTransitions: [
      "A queenside-minority-vs-central-space ending: White's space and outposts tell as pieces come off.",
      "If Black's minority attack stalls, White's healthier centre converts the endgame.",
    ],
  },
  {
    id: 'mp-ruylopez-zaitsev-endgame',
    title: 'Zaitsev: Tension into Technique',
    lineSan:
      'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Bb7 d4 Re8 Nbd2 Bf8 a3 h6',
    lineTitle: 'Maximum Tension, then the Better Structure',
    overview:
      "Karpov's lifelong weapon. Black commits the bishop to b7 and the rook to e8, holding the centre at maximum tension — and here the bishop stays on b3, because the ...Bb7 setup never goes for the Noah's Ark. White plays the quiet a3 and waits; whichever way the tension breaks, the resulting structure favours White's technique.",
    annMap: {
      17: "The Zaitsev — Black commits the bishop to b7 and the rook to e8, holding the centre at maximum tension. Note the bishop stays on b3: the ...Bb7 plan never targets it, so there's no Noah's Ark to dodge here.",
      22: "a3 — quiet prophylaxis, taking the b4-square from Black's pieces before the centre resolves.",
      23: "The tension will break with d5 or ...exd4. Either way the position simplifies toward an ending where White's central space and the bishop pair are the lasting edge. Zaitsev is razor theory that, played accurately, drifts into White's favour in the endgame.",
    },
    pawnBreaks: [
      { move: 'd4-d5', explanation: 'Clamp the centre and define the structure for the technical phase.' },
      { move: 'a3 then a4', explanation: 'Restrain and then pressure the queenside before trading down.' },
    ],
    pieceManeuvers: [
      { piece: 'Rook', route: 'Re8 (and Ra1-a-file later)', explanation: "Black's ...Re8 backs the centre; White's a-file play targets the queenside in the ending." },
      { piece: 'Bishop', route: 'Be7-f8', explanation: "Black's regroup to f8 reinforces the king; White keeps the bishop pair as the long-term trump." },
    ],
    strategicThemes: [
      'Hold the central tension; the side that resolves it on better terms owns the ending.',
      "Here the bishop stays on b3 — the ...Bb7 setup never threatens Noah's Ark, so no retreat is needed.",
      'White\'s bishop pair and central space are the technical trumps when the position simplifies.',
    ],
    endgameTransitions: [
      'Once the tension breaks, an ending with the bishop pair and more space tends to favour White.',
      'Precise move-order is everything — a single tempo decides whether the simplification helps or hurts.',
    ],
  },
];

function main() {
  const plans = JSON.parse(readFileSync(JSON_PATH, 'utf-8'));
  const existing = new Set(plans.map((p) => p.id));
  const added = [];
  for (const spec of SPECS) {
    if (existing.has(spec.id)) {
      console.log(`[skip] ${spec.id}`);
      continue;
    }
    const plies = spec.lineSan.trim().split(/\s+/).length;
    const annotations = ann(plies, spec.annMap);
    const { moves, arrows, finalFen } = buildLine(spec.lineSan, annotations, spec.id);
    plans.push({
      id: spec.id,
      openingId: 'ruy-lopez',
      criticalPositionFen: finalFen,
      title: spec.title,
      overview: spec.overview,
      pawnBreaks: spec.pawnBreaks.map((pb) => ({ ...pb, fen: finalFen })),
      pieceManeuvers: spec.pieceManeuvers,
      strategicThemes: spec.strategicThemes,
      endgameTransitions: spec.endgameTransitions,
      playableLines: [{ fen: START, moves, annotations, arrows, title: spec.lineTitle }],
    });
    added.push(spec.id);
    console.log(`[add]  ${spec.id} — ${moves.length} plies → ${finalFen}`);
  }
  if (added.length > 0) {
    writeFileSync(JSON_PATH, JSON.stringify(plans, null, 2) + '\n');
    console.log(`\nWrote ${added.length}: ${added.join(', ')} | total: ${plans.length}`);
  } else console.log('\nNothing to add.');
}

main();
