// Two GENUINE Ruy endgames, hand-narrated, born from the actual
// structures (David 2026-05-21). Not generic lessons: each is the real
// opening line — every move established theory, replayed through
// chess.js — carried into the characteristic ending, with my narration
// teaching the endgame point at the moment the structure forms.
//   - Exchange: White's healthy KINGSIDE 4-v-3 majority makes a passer;
//     Black's doubled c-pawns make none (Fischer's point).
//   - Berlin:  the queenless endgame after Qxd8+ Kxd8 — bishop pair vs
//     White's e5-pawn, kingside majority, and safer structure.
//
// Run: node scripts/add-ruy-endgame-plans.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { Chess } from 'chess.js';

const JSON_PATH = 'src/data/middlegame-plans.json';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function buildLine(lineSan, planId) {
  const c = new Chess(START);
  const moves = [];
  const arrows = [];
  for (const san of lineSan.trim().split(/\s+/)) {
    const mv = c.move(san);
    if (!mv) throw new Error(`[${planId}] illegal "${san}" from ${c.fen()}`);
    moves.push(mv.san);
    arrows.push([{ from: mv.from, to: mv.to }]);
  }
  return { moves, arrows, finalFen: c.fen() };
}

const SPECS = [
  {
    id: 'mp-ruylopez-exchange-endgame',
    title: 'Endgame: The Kingside Majority',
    lineSan: 'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4 Nxd4',
    lineTitle: "Fischer's Structural Endgame",
    overview:
      "The Exchange isn't really about the opening — it's about the ending. By trading on c6 and doubling Black's c-pawns, White earns a healthy kingside pawn majority that manufactures a passed pawn, while Black's crippled queenside makes nothing. Watch the structure form, then play it out — this is Fischer's whole reason for the line.",
    annotations: [
      '',
      '',
      '',
      '',
      'The Spanish bishop eyes c6 — the knight that holds e5 in place.',
      'Black pokes the bishop: the Morphy move.',
      'The Exchange. White gives up the bishop pair on purpose — the point is structural, and it lasts all the way into the endgame.',
      "The forced recapture doubles Black's c-pawns: four queenside pawns on three files. They can never make a passed pawn.",
      '',
      'Black shores up e5.',
      'White challenges the centre, steering toward the trade that defines the ending.',
      '',
      "Now read the pawns. White's kingside — e, f, g, h — is a clean four against three: that majority makes a passed pawn. Black's extra pawn is the doubled c, and it makes nothing. Trade every piece and White wins the king-and-pawn ending. This is why Fischer played the Exchange.",
    ],
    pawnBreaks: [
      { move: 'f4 / g4 / h4 — the kingside roll', explanation: 'Advance the healthy kingside majority to manufacture the passed pawn.' },
      { move: 'e5', explanation: 'The central thrust that fixes the structure and frees the majority to roll.' },
    ],
    pieceManeuvers: [
      { piece: 'King', route: 'centralise toward the kingside', explanation: 'In a king-and-pawn ending the king is a fighting piece — march it up to escort the passer.' },
    ],
    strategicThemes: [
      "White's kingside 4-v-3 makes a passer; Black's doubled c-pawns make none — that single asymmetry is the whole game.",
      'Trade pieces, not pawns: every exchange drags the position toward the winning king-and-pawn ending.',
      "Black's compensation is the bishop pair and activity — keep things closed enough that structure outweighs it.",
    ],
    endgameTransitions: [
      "The pure king-and-pawn ending is winning for White: the kingside majority queens a pawn while Black's queenside cannot.",
      'Even with one pair of rooks left on, the outside passed pawn tends to decide in White\'s favour.',
    ],
  },
  {
    id: 'mp-ruylopez-berlin-endgame',
    title: 'The Berlin Endgame',
    lineSan: 'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5 Nf5 Qxd8+ Kxd8',
    lineTitle: "The Queenless Wall",
    overview:
      "After the queens come off on move eight, the Berlin becomes a queenless middlegame that has frustrated the strongest players alive. Black holds the bishop pair but a king stuck in the centre and doubled c-pawns; White owns the e5-pawn, a healthy kingside majority, and the safer structure. Watch the tabiya arise, then learn to press it — patiently, the way Kramnik did against Kasparov.",
    annotations: [
      '',
      '',
      '',
      '',
      '',
      'The Berlin Defence — Black ignores the bishop and hits e4.',
      'White castles and offers the pawn.',
      'Black takes it: the Open Berlin.',
      'White strikes the centre rather than chase the pawn back.',
      "The knight drops back to hit the bishop and douse White's initiative.",
      "The same structural blow as the Exchange — White doubles Black's c-pawns.",
      '',
      '',
      'The knight heads for d4 or e3.',
      'The queens come off with check —',
      "— and Black recaptures with the king, losing the right to castle. This is the Berlin endgame: Black has the bishop pair, but White owns the e5-pawn, a healthy kingside majority, and the safer king. A queenless grind where White presses for the long haul.",
    ],
    pawnBreaks: [
      { move: 'f4 — support the wedge', explanation: 'Buttress and expand the e5-pawn and the kingside majority.' },
      { move: 'g4 — kick the f5-knight', explanation: 'Gain space and challenge the well-placed knight when the time is right.' },
    ],
    pieceManeuvers: [
      { piece: 'Knight', route: 'Nb1-c3-e4', explanation: 'Reroute the queen-knight to reinforce e5 and eye the d6 and f6 holes.' },
      { piece: 'Rook', route: 'Rf1-d1+', explanation: "Seize the open d-file with check, harassing Black's uncastled king." },
    ],
    strategicThemes: [
      "White's trumps are the e5-pawn, the kingside majority, and Black's stranded king — not material.",
      'Restrain the bishop pair by keeping the position half-closed; open it only when your structure tells.',
      'Patience: the Berlin is pressed (or held) over forty quiet moves, not won by a knockout.',
    ],
    endgameTransitions: [
      "Black's bishop pair fights White's structure — the kingside majority is the long-term winning try.",
      "Fix and blockade the doubled c-pawns and White's healthy majority becomes the decisive factor.",
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
    const { moves, arrows, finalFen } = buildLine(spec.lineSan, spec.id);
    if (moves.length !== spec.annotations.length) {
      throw new Error(`[${spec.id}] ${moves.length} moves but ${spec.annotations.length} annotations`);
    }
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
      playableLines: [
        { fen: START, moves, annotations: spec.annotations, arrows, title: spec.lineTitle },
      ],
    });
    added.push(spec.id);
    console.log(`[add]  ${spec.id} — ${moves.length} plies → ${finalFen}`);
  }

  if (added.length > 0) {
    writeFileSync(JSON_PATH, JSON.stringify(plans, null, 2) + '\n');
    console.log(`\nWrote ${added.length}: ${added.join(', ')} | total plans: ${plans.length}`);
  } else {
    console.log('\nNothing to add.');
  }
}

main();
