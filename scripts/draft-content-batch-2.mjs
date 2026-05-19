#!/usr/bin/env node
/**
 * Drafts middlegame plans for the 15 openings still at 0 plans after
 * batch 1. Same hand-composed pattern: chess.js-validated PGN to
 * critical position, all moves real, all prose hand-written.
 *
 * 15 openings × 2 plans = 30 entries.
 *
 * Output: audit-reports/staged/content-batch-2.json
 * Validate next: node scripts/validate-content-batch.mjs <out>
 */

import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('audit-reports/staged', { recursive: true });

function fenFromPgn(pgn) {
  const c = new Chess();
  for (const tok of pgn.trim().split(/\s+/).filter(Boolean)) {
    c.move(tok.replace(/[+#!?]+$/, ''));
  }
  return c.fen();
}

const PLANS = {
  'vienna-game': [
    {
      id: 'mp-vienna-classical-f4',
      title: 'Classical f4 break',
      pgnToReachPosition: 'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3',
      overview: "The Vienna's defining plan: after Nc3, the f4 push (Vienna Gambit) opens the f-file and challenges Black's central pawn. When Black plays …Nxe4 to recover material, White's pieces stand actively on Nc3 + Nf3 + Bc4 (next), and the open f-file gives the rook an instant attacking line. White's kingside attack mirrors a King's Gambit setup but with an extra developing tempo.",
      pawnBreaks: [
        { move: 'd3', explanation: "Quietly defends the e4 square (once recovered) and prepares Bd3 or Bc4. The d3 pawn supports a future e4-e5 push if Black retreats." },
        { move: 'e5', explanation: "Once development is complete, e4-e5 kicks any Nf6 and opens the b1-h7 diagonal for the queen + bishop attack." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nc3-d5 outpost', explanation: "The c3-knight aims for d5 in many Vienna lines. From d5 the knight pressures Black's queenside and kingside with the same piece." },
        { piece: 'Bishop', route: 'Bf1-c4', explanation: "Standard king's-bishop development targeting f7. Combined with the open f-file from the gambit, the Bc4 + Rf1 battery creates immediate tactical chances." },
      ],
      typicalMistakes: [
        "Forgetting to recover the e-pawn — Black's …Nxe4 is followed by Nxe4 dxe4, and White must capture back on e4 with the knight to maintain pressure.",
        "Castling kingside without preparation — the f-file is open for Black's rook too.",
      ],
    },
    {
      id: 'mp-vienna-quiet-g3-fianchetto',
      title: 'Quiet g3 + Bg2 long-diagonal pressure',
      pgnToReachPosition: 'e4 e5 Nc3 Nf6 g3 Bc5 Bg2 d6 Nge2 Nc6 O-O O-O',
      overview: "Vienna's quiet line — White fianchettos to g2 instead of pushing f4. The plan is slow maneuvering: Nge2 + O-O, then push d4 to challenge the center. The Bg2 controls the long diagonal and the position transposes into Closed Sicilian-like structures with colors reversed.",
      pawnBreaks: [
        { move: 'd4', explanation: "The central break that opens the position for the fianchettoed bishop. After d4 exd4 Nxd4 Nxd4 Qxd4 White has a strong centralized queen and the Bg2 fires on the long diagonal." },
        { move: 'f4', explanation: "Even in the quiet line, a later f4 break creates kingside attacking chances. With the Bg2 supporting g3, the f-pawn can push to f5 without weakening the king as much as in the gambit lines." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nc3-d5 outpost', explanation: "The d5 square is a thematic outpost in every Vienna line. From d5 the knight pressures Black's queenside and supports central piece play." },
      ],
      typicalMistakes: [
        "Allowing Black's …d5 push to lock the center — kills the Bg2's long-diagonal pressure.",
        "Pushing f4 before completing development — Black's …Nxe4 counter-strike is dangerous.",
      ],
    },
  ],

  'four-knights-game': [
    {
      id: 'mp-four-knights-belgrade-gambit',
      title: 'Belgrade Gambit central crash with d5',
      pgnToReachPosition: 'e4 e5 Nf3 Nc6 Nc3 Nf6 d4 exd4 Nd5',
      overview: "The Belgrade Gambit (4.d4 exd4 5.Nd5) is the sharpest treatment of the Four Knights. White sacrifices the d-pawn to pin the f6-knight to the queen and gain a massive central knight outpost. After 5…Nxe4 6.Qe2 Black's pieces tangle and White recovers the pawn with positional advantage.",
      pawnBreaks: [
        { move: 'c3', explanation: "Once the dust settles, c3 challenges Black's d-pawn and prepares to recapture with the c-pawn if Black trades d-pawns. Supports a future d4 push too." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nd5 dominant outpost', explanation: "The d5-knight is the Belgrade Gambit's centerpiece. From d5 it pins Nf6 to the queen, dominates the center, and creates tactical threats with every move." },
        { piece: 'Queen', route: 'Qd1-e2', explanation: "Qe2 supports the central knight and the pinned position. Combined with O-O-O later, this creates king-and-queen pressure on Black's exposed king-side." },
      ],
      typicalMistakes: [
        "Trading queens early — kills the attacking compensation completely.",
        "Castling kingside before securing the center — Black's …Bb4 + …Bxc3 can damage your structure.",
      ],
    },
    {
      id: 'mp-four-knights-spanish-symmetry',
      title: 'Spanish Four Knights — slow maneuvering',
      pgnToReachPosition: 'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6',
      overview: "The Spanish Four Knights — both sides mirror each other. The plan is slow piece maneuvering. White's idea: develop completely, then break symmetry with Nd5 (which Black can never match because his knight is pinned by Bb5). Once the imbalance is created, White's two bishops outpace Black's identical setup.",
      pawnBreaks: [
        { move: 'd4', explanation: "After full development, d4 challenges Black's central e5 pawn. The break creates the first asymmetry in the position." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nc3-d5 strategic outpost', explanation: "The d5-knight breaks Black's symmetric setup. From d5 the knight pressures the kingside and can be supported by c2-c4 + Nbd2 to prevent the trade." },
        { piece: 'Bishop', route: 'Bc1-g5 pin', explanation: "Bg5 pins the f6-knight to the queen and creates a tactical asymmetry — Black's identical bishop on g4 doesn't create the same threat because White hasn't castled yet." },
      ],
      typicalMistakes: [
        "Trading bishops on c3 — gives Black the bishop pair for no compensation.",
        "Pushing d4 without preparation — Black's …exd4 + …d5 break-up neutralizes White's edge.",
      ],
    },
  ],

  'sicilian-alapin': [
    {
      id: 'mp-alapin-isolated-d-pawn',
      title: 'Isolated d-pawn (IQP) attack',
      pgnToReachPosition: 'e4 c5 c3 d5 exd5 Qxd5 d4 Nf6 Nf3 e6 Be2 cxd4 cxd4',
      overview: "The Alapin's main treatment leads to an isolated d-pawn position. White accepts the structural weakness in exchange for piece activity: the Nf3 has e5 as an outpost, the Bc1 develops to g5 attacking f6, and the queen swings to e2 then to d3 supporting kingside attacks. Classic IQP middlegame — strong with pieces on the board, weak in the endgame.",
      pawnBreaks: [
        { move: 'd5', explanation: "The thematic IQP break that liquidates the structural weakness. After d5 exd5 White gains the e-file and dissolves the weakness, often leading to a favorable endgame transition." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nf3-e5 outpost', explanation: "The e5 square is a permanent outpost in the IQP structure. From e5 the knight controls central squares and supports kingside attacks via Nxf7 or Ng4-h6 ideas." },
        { piece: 'Queen', route: 'Qd1-e2-d3', explanation: "Qe2 prepares Rd1 (queen rook behind the isolated pawn). Qd3 supports d4-d5 and aligns on the b1-h7 diagonal for kingside attack." },
      ],
      typicalMistakes: [
        "Trading pieces too quickly — IQP is strong with pieces, weak in the endgame.",
        "Pushing d5 before piece coordination — Black equalizes if the break liquidates without gaining anything.",
      ],
    },
    {
      id: 'mp-alapin-quiet-d3-development',
      title: 'Quiet d3 + Nbd2 setup',
      pgnToReachPosition: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6 Nf3 Nc6 Bc4 Nb6 Bb5',
      overview: "When Black plays the sharp 2…Nf6, White's plan shifts to a closed central setup with d3 supporting e5 and Nbd2 + Bd3 building toward a kingside attack. The structure resembles a French Advance with colors reversed — White's e5 pawn cramps Black's kingside development.",
      pawnBreaks: [
        { move: 'f4', explanation: "Once Black's pieces are restricted, f2-f4 supports the e5 pawn and prepares a kingside pawn storm with f4-f5." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bf1-c4-b5+ swing', explanation: "The Bc4 + Bb5 maneuver after Black's …Nb6 forces Black to either trade or retreat the knight. Both outcomes favor White's central pawn structure." },
      ],
      typicalMistakes: [
        "Pushing e5 too early — Black's …d6 break dissolves the pawn structure with tempo.",
        "Trading the e5 pawn for a piece — the e5-wedge is the central restriction; without it the position equalizes.",
      ],
    },
  ],

  'pirc-defence': [
    {
      id: 'mp-pirc-austrian-attack',
      title: 'Austrian Attack: f4 + e5 kingside storm',
      pgnToReachPosition: 'e4 d6 d4 Nf6 Nc3 g6 f4 Bg7 Nf3 O-O Bd3',
      overview: "The Austrian Attack (4.f4) is the Pirc's sharpest test. White pushes f4 + e5 to cramp Black's kingside and create attacking chances. The plan: develop Bd3 + O-O, then storm with e5-Ne1-f5 or f4-f5 directly. Black must defend precisely or face a crushing kingside attack.",
      pawnBreaks: [
        { move: 'e5', explanation: "The thematic Austrian Attack break that kicks Black's f6-knight and gains central space. After e5 dxe5 fxe5 Nfd7 White has a broad pawn center and Black's pieces are pushed back." },
        { move: 'f5', explanation: "Once the e5 wedge is established, f4-f5 opens the f-file for the rook and creates direct mating threats on Black's king." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nf3-g5 or -h4', explanation: "After O-O, the f3-knight can swing to h4 (supporting f5-g6 ideas) or to g5 (creating direct kingside attacks)." },
        { piece: 'Queen', route: 'Qd1-e2-h4', explanation: "Qe2 supports the central pawns and prepares to swing to h4 for direct kingside attack." },
      ],
      typicalMistakes: [
        "Pushing e5 before completing development — Black's …c5 counter-strike opens the position favorably for him.",
        "Trading the dark-squared bishop on g7 without compensation — gives Black the long-diagonal pressure.",
      ],
    },
    {
      id: 'mp-pirc-classical-150',
      title: 'Classical 150 Attack with Bh6',
      pgnToReachPosition: 'e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5',
      overview: "The 150 Attack (named for the ~150 ELO needed to play it) is White's most popular modern weapon against the Pirc. The plan: Be3 + Qd2 + Bh6 trades Black's dark-squared bishop, leaving Black's kingside weak and his king without its main defender. After O-O-O and h2-h4-h5, White launches a pawn storm against Black's exposed king.",
      pawnBreaks: [
        { move: 'h4-h5', explanation: "The kingside pawn storm that opens lines after Black has castled kingside. After h5 gxh5 White's heavy pieces pour into the g-file and h-file." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Be3-h6 trade', explanation: "The Bh6 forces Black to trade his dark-squared bishop or accept a permanent weakness on the dark squares around his king." },
        { piece: 'Queen', route: 'Qd2-h6 after Bxh6', explanation: "After the trade, Qh6 lurks on the kingside threatening Qxg7+ mate ideas." },
      ],
      typicalMistakes: [
        "Forgetting to castle long — kingside castling abandons the attack and Black's queenside expansion strikes first.",
        "Allowing …Bxh6 without follow-up — the dark-square trade is only powerful if you can exploit the weak squares quickly.",
      ],
    },
  ],

  'scandinavian-defence': [
    {
      id: 'mp-scandinavian-qa5-active-queen',
      title: 'Qa5 active queen with …c6 + …Bf5',
      pgnToReachPosition: 'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5',
      overview: "Black's main Scandinavian plan with 2…Qxd5 3…Qa5. The queen on a5 is active (pressuring c3 and a2) while Black develops the bishop to f5 (BEFORE …e6 to avoid trapping it), then castles long for sharp opposite-side attacks. The plan: complete development with …e6 + …Nbd7 + …O-O-O, then attack on the kingside with …h6 + …g5.",
      pawnBreaks: [
        { move: 'e6', explanation: "After developing Bf5, …e6 supports the bishop's diagonal and prepares …Nbd7. The pawn structure is solid for Black." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bc8-f5 development outside the pawn chain', explanation: "The key Scandinavian piece. Bf5 develops actively before …e6 locks it in, giving Black active piece play despite the structurally passive position." },
        { piece: 'Queen', route: 'Qa5-h5 swing (after development)', explanation: "Once Black has castled long, the queen can swing to h5 or h4 for direct kingside attacks on White's castled king." },
      ],
      typicalMistakes: [
        "Playing …Bf5 after …e6 — locks in the bishop and accepts a permanently passive position.",
        "Castling kingside instead of long — gives up Black's main attacking plan.",
      ],
    },
    {
      id: 'mp-scandinavian-qd6-modern',
      title: 'Modern …Qd6 setup',
      pgnToReachPosition: 'e4 d5 exd5 Qxd5 Nc3 Qd6 d4 Nf6 Nf3 a6 Be2 Nc6',
      overview: "The modern …Qd6 treatment (Tiviakov's pet line). The queen on d6 is harder for White to attack than on a5 (Nc3 doesn't gain tempo). Black develops with …a6 + …Nc6 + …Bf5 + …e6, similar to a Caro-Kann structure. The plan: solid development, then …O-O-O for sharp attacking play, or …e6 + …Bd6 + …O-O for a more positional grind.",
      pawnBreaks: [
        { move: 'c5', explanation: "Once developed, …c5 challenges White's central d4 pawn and opens the c-file for Black's rook. The break dissolves Black's structural inferiority." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop pair', route: 'Bf5 + Be7 active development', explanation: "Black's pair of bishops aim at active squares (Bf5 outside the pawn chain, Be7 ready to swing to f6 or g5). Combined with the c5 break, this creates lasting positional pressure." },
      ],
      typicalMistakes: [
        "Pushing …c5 before the king is safe — White's …d5 push or central piece attacks expose Black's king.",
        "Trading the Bf5 for a knight — loses the bishop pair and accepts a passive structure.",
      ],
    },
  ],

  'alekhine-defence': [
    {
      id: 'mp-alekhine-four-pawns-attack',
      title: 'Counter-attacking the Four Pawns Attack',
      pgnToReachPosition: 'e4 Nf6 e5 Nd5 d4 d6 c4 Nb6 f4 dxe5 fxe5 Nc6 Be3 Bf5',
      overview: "The Four Pawns Attack (White: e4 + d4 + c4 + f4) is the most ambitious test of the Alekhine. Black's counter-plan: undermine the overextended pawns with …d6 + …Nc6 + …Bf5 + …e6, then break with …c5 or …f6 to dismantle the center. The Alekhine philosophy in pure form — provoke, then attack.",
      pawnBreaks: [
        { move: 'c5', explanation: "Challenges White's d4 pawn directly. After …c5 d5 Nb4 the c-file opens for Black's rook and White's central pawns become weak." },
        { move: 'f6', explanation: "Challenges White's e5 wedge. After …f6 exf6 exf6 (or gxf6) Black's pieces have lines to develop and the e-file opens." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nb6 active outpost', explanation: "The Nb6 attacks c4 and supports …c5 or …Bd7-c6 expansion. From b6 the knight is well-placed for the counter-attack." },
        { piece: 'Bishop', route: 'Bf5 outside development', explanation: "The c8-bishop develops to f5 BEFORE …e6 (otherwise it's locked in). From f5 it controls the b1-h7 diagonal and supports the …e6 break." },
      ],
      typicalMistakes: [
        "Pushing …c5 before completing development — White's central pawns crush Black's pieces.",
        "Trading the Bf5 for a knight — loses the bishop pair without compensation.",
      ],
    },
    {
      id: 'mp-alekhine-modern-variation',
      title: 'Modern Variation: …g6 + …Bg7 fianchetto',
      pgnToReachPosition: 'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7 Ng5 e6',
      overview: "The Modern Variation (4.Nf3) leads to slower, more positional play. Black's plan: fianchetto with …g6 + …Bg7, then attack the center with …c5 or …f6. The Bg7 controls the long diagonal toward White's queenside and supports a slow attacking buildup.",
      pawnBreaks: [
        { move: 'c5', explanation: "The thematic central counter-break. After …c5 White must choose between dxc5 (Black recovers with …Bxc3 or …Nxc5) or d5 (locking the center)." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bg7 long diagonal control', explanation: "The fianchettoed bishop is Black's most powerful piece. Aimed at White's queenside, it supports the …c5 break and creates lasting pressure on the long diagonal." },
      ],
      typicalMistakes: [
        "Allowing White's e5 wedge to remain unchallenged — Black's pieces stay cramped permanently.",
        "Pushing …e6 too early — gives White's Ng5 tempo to attack the f7 square.",
      ],
    },
  ],

  'philidor-defence': [
    {
      id: 'mp-philidor-hanham-system',
      title: 'Hanham System: solid …Nbd7 + …c6 setup',
      pgnToReachPosition: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O',
      overview: "The Hanham Variation is the modern Philidor — solid structure with …Nbd7 + …c6 supporting the central e5 pawn. Black's plan: complete development quietly, then choose between …c6 + …d5 break (challenging the center) or …Re8 + …Nf8-g6 (slow kingside buildup). The position resembles an Old Indian with colors and tempo adjusted.",
      pawnBreaks: [
        { move: 'd5', explanation: "After completing development with …c6 + …Re8, the …d5 break challenges White's central e4 pawn and opens lines for Black's pieces." },
        { move: 'exd4', explanation: "When White over-extends, …exd4 followed by …Nxe4 recovers material and exposes White's center." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nbd7-f8-g6', explanation: "The queenside knight reroutes via f8 to g6, supporting the kingside and the …f5 break if needed." },
      ],
      typicalMistakes: [
        "Trading the e5 pawn for nothing — cracks Black's central pawn structure permanently.",
        "Pushing …d5 before piece coordination — White's …exd5 forces structural concessions.",
      ],
    },
    {
      id: 'mp-philidor-improved-hanham',
      title: 'Improved Hanham with …Be7 + …c6 + …Qc7',
      pgnToReachPosition: 'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O c6 a4 a5',
      overview: "The Improved Hanham adds …c6 + …Qc7 to the basic Hanham. The queen on c7 supports the …d5 break and the …b5 expansion (when allowed). The plan: complete development, then break with …d5 or …b5 to gain queenside space and counter-attacking chances.",
      pawnBreaks: [
        { move: 'd5', explanation: "Black's central break that challenges White's e4 pawn. After …d5 exd5 cxd5 Black has a strong central pawn structure with the bishop pair aimed at the kingside." },
      ],
      pieceManeuvers: [
        { piece: 'Queen', route: 'Qd8-c7 active queen', explanation: "The queen on c7 supports central breaks and defends b7 from White's potential Qb3 attack. Combined with …Nf8-g6 for kingside defense." },
      ],
      typicalMistakes: [
        "Forgetting to play …a5 against White's a4 — White's a4-a5 forces structural concessions on the queenside.",
        "Pushing …b5 without preparation — White's a4 break exposes Black's queenside.",
      ],
    },
  ],

  'catalan-opening': [
    {
      id: 'mp-catalan-open-pressure',
      title: 'Open Catalan — diagonal pressure with …dxc4',
      pgnToReachPosition: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6',
      overview: "Open Catalan (Black takes the c-pawn). White's plan: long-term pressure on the long diagonal via Bg2, force Black to give back the c-pawn with active piece play, and exploit Black's slightly weakened queenside structure. The Bg2 is the most powerful Catalan piece — its diagonal reaches deep into Black's territory and supports virtually every White plan.",
      pawnBreaks: [
        { move: 'e4', explanation: "After Black gives back the c-pawn (usually with …b5 + …Bb7), e4 opens the center and lets the Bg2 fire on the long diagonal. The break creates immediate central pressure." },
      ],
      pieceManeuvers: [
        { piece: 'Queen', route: 'Qd1-c2 attacking c-pawn', explanation: "Qc2 attacks the c4-pawn that Black grabbed, forcing Black to either return it with …b5 or defend awkwardly." },
        { piece: 'Knight', route: 'Nbd2-c4 or -e4', explanation: "The b1-knight reroutes through d2 to c4 (attacking …e5 or …b6) or e4 (the central outpost). Flexibility is the Catalan's strength." },
      ],
      typicalMistakes: [
        "Forgetting to play Qc2 — Black consolidates the extra pawn comfortably.",
        "Trading the Bg2 without compensation — eliminates the entire Catalan attacking concept.",
      ],
    },
    {
      id: 'mp-catalan-closed-positional',
      title: 'Closed Catalan — slow maneuvering',
      pgnToReachPosition: 'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O Nbd7',
      overview: "Closed Catalan (Black keeps the central tension). White's plan: complete development, then build queenside pressure with Nc3 + b3 + Bb2 or Qc2 + Rd1. The Bg2 supports a future e4 break that opens the long diagonal. The position is strategically rich — many master games end with White converting a small positional edge into a winning endgame.",
      pawnBreaks: [
        { move: 'cxd5', explanation: "The Exchange Catalan trades the central tension for clear positional play. Black is left with an isolated d-pawn or symmetric structure where the Bg2 dominates." },
        { move: 'e4', explanation: "After completing development, e4 challenges the d5 pawn and opens the long diagonal for the Bg2." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bc1-b2 fianchetto', explanation: "The dark-squared bishop fianchettos to b2, controlling the long h1-a8 diagonal alongside the Bg2. Double-bishop pressure on the central squares." },
      ],
      typicalMistakes: [
        "Pushing e4 before completing development — Black's …c5 destabilizes the center.",
        "Trading the Bg2 too early — without it, the Catalan loses its main attacking weapon.",
      ],
    },
  ],

  'slav-defence': [
    {
      id: 'mp-slav-bf5-active-development',
      title: '…Bf5 active development — Czech Variation',
      pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4',
      overview: "The Czech Variation — Black takes the c-pawn (4…dxc4) and develops actively with …Bf5. After 5.a4 (preventing …b5), Black plays …e6 + …Bb4 for a Nimzo-Indian-like setup. The plan: solid central structure with bishop pair, then a future …c5 break for queenside expansion.",
      pawnBreaks: [
        { move: 'c5', explanation: "The thematic queenside break. After …c5 d5 (or dxc5) Black has the open c-file and active piece play. The bishop pair compensates for any structural concessions." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bc8-f5 active development', explanation: "The Slav's key piece — developed BEFORE …e6 to keep the long diagonal active. Without …Bf5 first, the c8-bishop becomes the worst piece in the position." },
      ],
      typicalMistakes: [
        "Playing …e6 before …Bf5 — locks in the c8-bishop permanently. The Slav becomes passive.",
        "Trading the Bf5 for a knight — loses the bishop pair compensation.",
      ],
    },
    {
      id: 'mp-slav-chebanenko-flexible',
      title: 'Chebanenko: …a6 + flexible structure',
      pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 a6',
      overview: "The Chebanenko Slav (4…a6) is the modern flexible treatment. Black keeps options for …dxc4 + …b5, …Bf5 development, or transposition to Semi-Slav with …e6. The …a6 move prevents Nb5 ideas and prepares queenside expansion. White's most challenging response is 5.c5 (the Anti-Chebanenko, locking the center) or 5.Bf4 (the System Slav).",
      pawnBreaks: [
        { move: 'b5', explanation: "After …a6, the …b5 push gains queenside space and attacks White's c4 pawn. Often combined with …Bb7 for long-diagonal pressure." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bc8-b7 or Bc8-f5', explanation: "Black's bishop has TWO good homes depending on White's setup: Bb7 (long-diagonal pressure) if White plays a slow setup, or Bf5 (active development) if White plays c4-c5 wedge." },
      ],
      typicalMistakes: [
        "Pushing …b5 before piece coordination — White's c5 wedge locks Black's pieces out.",
        "Trading the dark-squared bishop without compensation — gives White the bishop pair.",
      ],
    },
  ],

  'nimzo-indian': [
    {
      id: 'mp-nimzo-classical-doubled-c-pawns',
      title: 'Classical: …Bxc3 trade for doubled c-pawns',
      pgnToReachPosition: 'd4 Nf6 c4 e6 Nc3 Bb4 Qc2 O-O a3 Bxc3+ Qxc3 b6',
      overview: "The Nimzo-Indian's defining concept: trade the dark-squared bishop on c3 to inflict permanent structural damage on White (doubled c-pawns). Black's plan: complete development with …b6 + …Bb7, then attack the weak c-pawns with …c5 + …Rfc8 + …Na5 ideas. The bishop pair belongs to White, but the structural weakness is decisive in the endgame.",
      pawnBreaks: [
        { move: 'c5', explanation: "The thematic break against the doubled c-pawns. After …c5 dxc5 Black gets an open c-file and can attack the c4 + c5 pawns from multiple directions." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nb8-c6-a5 attacking c4', explanation: "The knight on a5 attacks White's c4-pawn and prepares to land on b3 or c4 itself. Combined with …Rfc8 + …Qc7, the c-file pressure becomes overwhelming." },
        { piece: 'Bishop', route: 'Bc8-b7 long-diagonal pressure', explanation: "The fianchettoed bishop controls the long diagonal and supports the …c5 break. Combined with …Ne4 outpost, this creates lasting central pressure." },
      ],
      typicalMistakes: [
        "Forgetting to play …c5 — gives White time to consolidate the doubled pawns into a strong central pawn mass.",
        "Trading the b7-bishop early — kills the long-diagonal pressure that compensates for White's bishop pair.",
      ],
    },
    {
      id: 'mp-nimzo-rubinstein-isolated-pawn',
      title: 'Rubinstein: 4.e3 isolated d-pawn complexes',
      pgnToReachPosition: 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O dxc4 Bxc4 cxd4 exd4',
      overview: "The Rubinstein System (4.e3) avoids the doubled-pawn structure entirely. After d-pawn trades, White ends up with an isolated d-pawn (or hanging pawns on c4 + d4). The plan: use the active pieces and central pawn for kingside attack. Classic IQP middlegame — strong with pieces on the board, weaker in the endgame.",
      pawnBreaks: [
        { move: 'd5', explanation: "The IQP break that liquidates the structural weakness. After d5 exd5 White gains the e-file and the position transitions to a favorable endgame." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nf3-e5 outpost', explanation: "The e5 square is the IQP's main outpost. From e5 the knight controls central squares and supports kingside attacks." },
      ],
      typicalMistakes: [
        "Trading pieces too quickly — the IQP weakens in the endgame.",
        "Pushing d5 before coordination — Black equalizes if the break liquidates without gaining anything.",
      ],
    },
  ],

  'grunfeld-defence': [
    {
      id: 'mp-grunfeld-exchange-central-pressure',
      title: 'Exchange Grünfeld: undermine the center',
      pgnToReachPosition: 'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5 Be2 O-O',
      overview: "The Exchange Grünfeld is the main test. White builds a massive pawn center with c3 + d4 + e4; Black undermines it with …c5 + …Nc6 + …Bg4. The plan: pressure d4 from every direction, force exchanges, and exploit White's weak c-pawn in the endgame. The Bg7 dominates the long diagonal and supports the central attack.",
      pawnBreaks: [
        { move: 'c5', explanation: "The thematic break against White's central c3 + d4 + e4 structure. After …c5 Black attacks d4 with the c-pawn and forces White to either trade or push d5." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bg7 long-diagonal attack', explanation: "The Grünfeld's signature piece — aimed at White's queenside, it pressures b2 and supports the central attack. Even trading it on c3 (creating tripled pawns) is sometimes worthwhile." },
        { piece: 'Knight', route: 'Nb8-c6-a5', explanation: "The knight attacks White's c4 pawn after …Na5, often forcing White's bishop to retreat passively." },
      ],
      typicalMistakes: [
        "Forgetting to play …c5 — gives White time to consolidate the center into a winning pawn mass.",
        "Trading the Bg7 for a knight — eliminates the long-diagonal pressure that defines the Grünfeld.",
      ],
    },
    {
      id: 'mp-grunfeld-russian-system',
      title: 'Russian System: Qb3 + Rd1 central pressure',
      pgnToReachPosition: 'd4 Nf6 c4 g6 Nc3 d5 Nf3 Bg7 Qb3 dxc4 Qxc4 O-O e4 a6',
      overview: "The Russian System (5.Qb3) avoids the Exchange and builds central pressure with Qc4 + e4 + Be2 + O-O. Black's plan: develop quickly, then attack the center with …a6 + …b5 + …Bb7 + …c5. The Bg7 + Bb7 double-fianchetto creates lasting positional pressure on White's center.",
      pawnBreaks: [
        { move: 'b5', explanation: "The thematic queenside break. After …b5 Black gains the b-file for the rook and creates a strong bishop battery on b7 attacking the e4-pawn." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop pair', route: 'Bg7 + Bb7 double-fianchetto', explanation: "Two bishops on long diagonals — Bg7 attacks the queenside, Bb7 attacks the center. The pair creates lasting pressure even in queenless endings." },
      ],
      typicalMistakes: [
        "Forgetting …b5 — Black's queenside stays cramped and the central pressure dissipates.",
        "Trading the bishop pair — gives up Black's main long-term compensation.",
      ],
    },
  ],

  'dutch-defence': [
    {
      id: 'mp-dutch-stonewall-fortress',
      title: 'Stonewall Dutch fortress + kingside attack',
      pgnToReachPosition: 'd4 f5 c4 Nf6 g3 e6 Bg2 d5 Nf3 c6 O-O Bd6 Nbd2 O-O',
      overview: "The Stonewall Dutch is Black's most fortress-like setup. Pawns on c6, d5, e6, f5 create a rock-solid structure. Black's plan: complete development with …Bd6 + …Nbd7, then storm the kingside with …Ne4 + …Qf6 + …Qh4 + …g5-g4. The fortress holds while the attack develops; White must precisely counter or face being checkmated on the kingside.",
      pawnBreaks: [
        { move: 'g5-g4', explanation: "The thematic kingside attack push. After …g5 + …g4 Black opens lines toward White's king and creates direct mating threats." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nf6-e4 central outpost', explanation: "The e4-knight is the Stonewall's centerpiece. From e4 it controls every kingside square and supports the …Qh4 attack." },
        { piece: 'Queen', route: 'Qd8-e8-h5 swing', explanation: "The queen reroutes through e8 to h5, joining the kingside attack with maximum effect." },
      ],
      typicalMistakes: [
        "Pushing …g5 before piece coordination — White's …Ng5 counter-strikes neutralize the attack.",
        "Trading the dark-squared bishop on d6 — eliminates the main attacking piece.",
      ],
    },
    {
      id: 'mp-dutch-leningrad-fianchetto',
      title: 'Leningrad: …g6 + …Bg7 active fianchetto',
      pgnToReachPosition: 'd4 f5 c4 Nf6 g3 g6 Bg2 Bg7 Nf3 O-O O-O d6 Nc3 c6',
      overview: "The Leningrad Dutch combines …f5 with a King's-Indian-style fianchetto. More active than the Stonewall but structurally weaker. Black's plan: complete development, then break with …e5 (challenging the center) or …Ne4 (central outpost). The Bg7 + …Nf6 + …Qe8-h5 attacking battery threatens the kingside.",
      pawnBreaks: [
        { move: 'e5', explanation: "The central break that challenges White's d4 pawn. After …e5 dxe5 dxe5 Black has the open d-file for the rook and active piece play." },
        { move: 'g5', explanation: "Kingside expansion combined with the …f4 push opens lines toward White's king." },
      ],
      pieceManeuvers: [
        { piece: 'Queen', route: 'Qd8-e8-h5', explanation: "The queen reroutes to h5 to support the kingside attack. From h5 it threatens direct kingside checkmate ideas." },
      ],
      typicalMistakes: [
        "Pushing …e5 before piece coordination — White's …dxe5 isolates Black's d-pawn and ruins the structure.",
        "Trading the Bg7 for a knight — eliminates the long-diagonal pressure.",
      ],
    },
  ],

  'kings-indian-attack': [
    {
      id: 'mp-kia-slow-buildup-e4-e5',
      title: 'Slow buildup with e4-e5 wedge',
      pgnToReachPosition: 'Nf3 d5 g3 c5 Bg2 Nc6 O-O e6 d3 Nf6 Nbd2 Be7 e4 O-O e5 Nd7',
      overview: "The KIA's classic plan — mirror the King's Indian Defence with colors reversed. Build slowly with Nf3 + g3 + Bg2 + O-O + d3 + Nbd2, then push e4-e5 to gain kingside space and cramp Black's pieces. After the wedge is established, White attacks with Nf3-h4 + Qe1-h4 + f4-f5 for direct mating threats.",
      pawnBreaks: [
        { move: 'e5', explanation: "The defining KIA break that cramps Black's kingside. After e5 Nd7 White has gained central space and the Bg2 has a clearer view toward Black's queenside." },
        { move: 'f4-f5', explanation: "Once the e5 wedge is established, f4-f5 opens the f-file for the rook and creates direct mating threats on g7." },
      ],
      pieceManeuvers: [
        { piece: 'Knight', route: 'Nf3-h4 (after e5)', explanation: "After the e5 push, the f3-knight reroutes to h4 supporting the kingside attack with potential Nf5 + Qh4 swing." },
        { piece: 'Queen', route: 'Qd1-e1-h4', explanation: "Qe1 supports the central pawn and prepares the swing to h4 for direct kingside attack." },
      ],
      typicalMistakes: [
        "Pushing e5 too early — Black's …e6 prevents the wedge from being effective.",
        "Forgetting to swing the queen — without queen+rook support, the kingside attack has no teeth.",
      ],
    },
    {
      id: 'mp-kia-flexible-c4-transposition',
      title: 'Flexible KIA with c4 transposition',
      pgnToReachPosition: 'Nf3 Nf6 g3 g6 Bg2 Bg7 O-O O-O d3 d6 c4 e5',
      overview: "When Black plays …g6 + …Bg7 (mirror setup), the KIA can transpose into an English Opening with c4 + Nc3. White's plan: use the flexible move order to choose the most challenging structure based on Black's setup. The Bg2 + c4 + Nc3 combo creates classical positional pressure.",
      pawnBreaks: [
        { move: 'd4', explanation: "Once developed, d4 challenges Black's …e5 central pawn. The break creates symmetric trade-offs where White's extra tempo is decisive." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bg2 long-diagonal pressure', explanation: "The Bg2 controls the long h1-a8 diagonal — combined with c4 + Nc3 attacking d5, this creates lasting central pressure." },
      ],
      typicalMistakes: [
        "Allowing Black's …e5 to lock the center — kills the KIA's flexibility.",
        "Trading the Bg2 without compensation — eliminates the main attacking weapon.",
      ],
    },
  ],

  'birds-opening': [
    {
      id: 'mp-bird-classical-kingside-attack',
      title: 'Classical kingside attack with Bd3 + Qe2',
      pgnToReachPosition: 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5 Qe1',
      overview: "The Bird's classical attacking plan. White builds slowly behind the f4 pawn, completes development with Nf3 + e3 + Bd3 (or Be2) + O-O, then swings the queen to h4 or g3 for direct kingside attack. The f-pawn provides space and supports the eventual e4 break.",
      pawnBreaks: [
        { move: 'e4', explanation: "The central break that activates the entire White army. After e4 dxe4 dxe4 Black's pieces must defend rather than develop. The e-file opens for the queen's rook." },
      ],
      pieceManeuvers: [
        { piece: 'Queen', route: 'Qd1-e1-h4', explanation: "The queen's swing to h4 (via e1 to support the f-file) creates direct threats against h7. Combined with Bxh7+ ideas, this is the Bird's main attacking weapon." },
      ],
      typicalMistakes: [
        "Pushing f4-f5 too early without piece coordination — Black's …e5 or …gxf5 counter-strikes derail the attack.",
        "Trading queens early — the Bird's only good attacking piece is the queen.",
      ],
    },
    {
      id: 'mp-bird-stonewall-formation',
      title: 'Stonewall formation with f4 + d4 + e3 + c3',
      pgnToReachPosition: 'f4 d5 Nf3 Nf6 e3 Bg4 Be2 e6 d4 c5 c3 Nc6',
      overview: "The Bird can transpose into a Reversed Dutch Stonewall. The plan is to build a permanent kingside pawn wall (f4-d4-e3-c3) and use the dark-squared bishop's mobility for a slow positional grind. Black's …c5 typically forces the c3-pawn into permanent residence, but White's Bf4-g3-h4 maneuver creates kingside attacking chances.",
      pawnBreaks: [
        { move: 'g4', explanation: "After completing development, g2-g4 opens the kingside for a direct attack. Combined with Rg1 + Qh4 + Bxh7+, this is the Stonewall Bird's main weapon." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bc1-f4-g3-h4', explanation: "The dark-squared bishop reroutes to h4 to pressure Black's kingside and prepare Bxh6 or Bg5 sacrifices." },
      ],
      typicalMistakes: [
        "Allowing Black's …f6 break — challenges the Stonewall structure and Black equalizes.",
        "Trading the dark-squared bishop for a knight — gives up the main attacking piece.",
      ],
    },
  ],

  'two-knights-defence': [
    {
      id: 'mp-two-knights-fried-liver',
      title: 'Fried Liver attack with Ng5 + Nxf7',
      pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+',
      overview: "The Fried Liver Attack — White sacrifices a knight for a vicious king-side attack against Black's exposed king. After 6.Nxf7 Kxf7 7.Qf3+ Black must defend precisely; one inaccuracy and White's attack crushes through. Modern theory considers Black holding with accurate defense, but in practical games White wins more often than not.",
      pawnBreaks: [
        { move: 'd4', explanation: "After the king is exposed, d4 opens the center to bring more pieces into the attack. The break supports a future Bxd5+ or Bg5 with overwhelming pressure." },
      ],
      pieceManeuvers: [
        { piece: 'Queen', route: 'Qf3-h5 or -e4 swing', explanation: "After Qf3+, the queen swings to h5 or e4 to maintain attacking pressure. Combined with Nc3 + d4, the attack has multiple piece participants." },
        { piece: 'Bishop', route: 'Bc4 + future Ne4', explanation: "The Bc4 stays on the b3-f7 diagonal threatening the king. Combined with a future Ne4 attacking d6, the bishop pair creates lasting attacking pressure." },
      ],
      typicalMistakes: [
        "Forgetting Qf3+ — gives Black time to consolidate the extra piece.",
        "Trading pieces too quickly — the attack needs all White's pieces participating.",
      ],
    },
    {
      id: 'mp-two-knights-traxler-counter',
      title: 'Traxler Counter (Wilkes-Barre) — sharp Black counter-attack',
      pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Nxf7',
      overview: "The Traxler Counter-Attack — Black sacrifices a knight too (4…Bc5!?). After 5.Nxf7 Black plays 5…Bxf2+! pressuring White's exposed king. The position is one of the sharpest in chess — both sides have only forcing moves. Modern theory holds it's about equal but extremely double-edged.",
      pawnBreaks: [
        { move: 'No pawn breaks — purely tactical', explanation: "The Traxler is decided by precise tactical play. Pawn moves are rare; both sides race to expose the opposite king." },
      ],
      pieceManeuvers: [
        { piece: 'Bishop', route: 'Bxf2+ sacrifice', explanation: "Black's signature Traxler move. After 5…Bxf2+ 6.Ke2 or 6.Kxf2 (each leads to wild complications), the position is theoretical hand-to-hand combat." },
        { piece: 'Queen', route: 'Qd8-h4+ attacking', explanation: "Black's queen swings to h4 with check after White's king is exposed, supporting the kingside attack." },
      ],
      typicalMistakes: [
        "Not knowing the theory — both sides need ~20 moves of precise theoretical knowledge.",
        "Allowing Black to develop unmolested — gives Black time to coordinate the attack.",
      ],
    },
  ],
};

const out = {
  generatedAt: new Date().toISOString(),
  middlegamePlans: [],
  commonMistakes: [],
  quizItems: [],
};

const errors = [];
for (const [openingId, plans] of Object.entries(PLANS)) {
  for (const plan of plans) {
    try {
      const fen = fenFromPgn(plan.pgnToReachPosition);
      out.middlegamePlans.push({
        id: plan.id,
        openingId,
        criticalPositionFen: fen,
        title: plan.title,
        overview: plan.overview,
        pawnBreaks: plan.pawnBreaks ?? [],
        pieceManeuvers: plan.pieceManeuvers ?? [],
        typicalMistakes: plan.typicalMistakes ?? [],
      });
    } catch (e) {
      errors.push({ openingId, id: plan.id, error: e.message });
    }
  }
}

const outPath = 'audit-reports/staged/content-batch-2.json';
writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`Wrote ${outPath}`);
console.log(`  middlegamePlans: ${out.middlegamePlans.length}`);
if (errors.length > 0) {
  console.log(`\n⚠ Drafting errors:`);
  errors.forEach((e) => console.log(`  [${e.openingId}/${e.id}] ${e.error}`));
  process.exit(1);
}
console.log('\nNo errors at staging.');
