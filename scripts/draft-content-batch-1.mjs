#!/usr/bin/env node
/**
 * Draft content for the 15 openings flagged as gap=4 (missing
 * Middlegame Plans + Model Games + Common Mistakes + Quiz):
 *
 *   Benko Gambit, Benoni Defence, Bird's Opening, Budapest Gambit,
 *   Evans Gambit, King's Gambit, Old Indian Defence, Petrov Defence,
 *   Queen's Gambit, Queen's Gambit Accepted, Queen's Indian Defence,
 *   Reti Opening, Semi-Slav Defence, Sicilian: Sveshnikov,
 *   Trompowsky Attack
 *
 * For each opening: 2 middlegame plans, 3 common mistakes, 4 quiz
 * items. Model Games are deferred — those need verified PGNs from
 * a master games DB.
 *
 * Every entry specifies a `pgnToReachPosition` from start. chess.js
 * computes the actual FEN; if the PGN replays cleanly the entry is
 * accepted. This guarantees no hand-transcribed FEN typos.
 *
 * Output: audit-reports/staged/content-batch-1.json — staging only,
 * NOT written to src/data/*. Run the validator next:
 *   node scripts/validate-content-batch.mjs audit-reports/staged/content-batch-1.json
 */

import { Chess } from 'chess.js';
import { writeFileSync, mkdirSync } from 'node:fs';

const STAGING_DIR = 'audit-reports/staged';
mkdirSync(STAGING_DIR, { recursive: true });

// ─── Helpers ──────────────────────────────────────────────────────
function fenFromPgn(pgn) {
  const c = new Chess();
  const tokens = pgn.trim().split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    try { c.move(tok.replace(/[+#!?]+$/, '')); }
    catch (e) { throw new Error(`illegal SAN "${tok}" in "${pgn}": ${e.message}`); }
  }
  return c.fen();
}

function validateMove(fen, move) {
  const c = new Chess(fen);
  const result = c.move(move.replace(/[+#!?]+$/, ''));
  if (!result) throw new Error(`illegal move "${move}" in fen ${fen}`);
  return result.san;
}

// ─── Content drafts per opening ───────────────────────────────────
// Schema fields match src/data/{middlegame-plans,common-mistakes,
// checkpoint-quizzes}.json exactly. The validator script computes
// FENs from PGNs and outputs final JSON ready to merge.

const CONTENT = {
  'evans-gambit': {
    middlegamePlans: [
      {
        id: 'mp-evans-central-avalanche',
        title: 'Central Avalanche with c3 + d4',
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O',
        overview: "The defining plan of the Evans Gambit. The b-pawn was sacrificed to gain a tempo for c3 + d4, blasting open the center while every White piece develops with a threat. After 7.O-O the cxd4 recapture is coming next; the e-file will swing open and the Bc4 + Re1 battery will hammer e8.",
        pawnBreaks: [
          {
            move: 'cxd4',
            explanation: "The recapture that completes the gambit's central thrust. White gets a broad pawn center on d4+e4 with two extra tempi over Black's development. The d-file opens for the queen's rook; the c-file opens for Nc3 and the d4 pawn supports e4-e5.",
            pgnDelta: 'cxd4',
          },
          {
            move: 'e5',
            explanation: "Once the center is established, e4-e5 kicks the knight from f6 and cramps Black's kingside. The pawn on e5 also unblocks the b1-h7 diagonal for the d1-queen swing to h5 or d3.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bc1-a3 or Bc1-b2',
            explanation: "The dark-squared bishop has two good homes. Ba3 controls the f8-a3 diagonal and prevents Black from castling kingside easily — a classical Evans theme. Bb2 supports the central avalanche on the long diagonal and aims at g7.",
          },
          {
            piece: 'Queen',
            route: 'Qd1-b3',
            explanation: "Qb3 is the classic attacking battery move: the queen targets f7 in cooperation with the Bc4, threatening Bxf7+ Kf8 and a king-hunt. It also pressures b7 — Black is rarely free to castle queenside in the Evans because of this.",
          },
        ],
        typicalMistakes: [
          "Playing d4 before c3 has solidified — Black's dxc3 skewers c3 if the c-pawn isn't on c3 yet.",
          "Allowing Nf6 to land before e4-e5 — once Black's knight controls the kingside, the central crash loses much of its bite.",
        ],
      },
      {
        id: 'mp-evans-f7-battery',
        title: 'f7 Battery — Bxf7 attacks',
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 d6 Qb3',
        overview: "The Bc4 + Qb3 battery is the Evans Gambit's signature attacking weapon. Both pieces aim at f7 — Black's most vulnerable square in the opening. When Black castles kingside a well-timed Bxf7+ Kxf7 followed by Ng5+ or Qxb7 leads to a devastating attack. Even when the sacrifice isn't sound, the threat alone restricts Black's options.",
        pawnBreaks: [
          {
            move: 'd5',
            explanation: "Pushing d4-d5 opens the b3-f7 diagonal completely. Once d5 fires, Bxf7+ becomes a calculation Black must always check.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen',
            route: 'Qd1-b3-a4 swing',
            explanation: "Qb3 stares at f7; if Black defends with Qe7, the queen swings to a4 to pin the c6-knight against the king. The Qa4 pin is a common Evans transition into endgame pressure.",
          },
          {
            piece: 'Knight',
            route: 'Nb1-c3-d5',
            explanation: "Once Bb2 or Ba3 is in place, the b1-knight develops to c3 with tempo. From c3 it eyes d5 — a great outpost in the Evans because Black's c-pawn rarely defends it.",
          },
        ],
        typicalMistakes: [
          "Pushing d5 before development is complete — the diagonal opens but Black gets time to play Qf6 defending f7 indirectly.",
          "Trading queens early — the f7 battery only works with both pieces; after Qxd1 White's attack evaporates.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O',
        wrongMove: 'dxc3',
        correctMove: 'd6',
        explanation: "Capturing dxc3 (the Compromised Defence) is greedy. After 8.Qb3 Black is under brutal pressure on f7 and b7 simultaneously. Modern theory holds Black, but only with razor-sharp accuracy. 7…d6 is the calm modern way: keep the b-pawn, give back material later, and consolidate.",
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
        wrongMove: 'Ng5',
        correctMove: 'b4',
        explanation: "Ng5 (Fried Liver intentions) is premature against the Italian Bc5 setup — Black isn't committed to Nf6 yet and can simply castle. The Evans 4.b4 is the principled gambit: sacrifice the pawn for the c3+d4 break before Black completes development.",
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4',
        wrongMove: 'Bb6',
        correctMove: 'Bxb4',
        explanation: "Declining with 4…Bb6 is theoretically dubious — it cedes the principled gambit position without claiming compensation. White's a4-a5 follow-up will harass the bishop and Black ends up in a passive Italian-like position without the natural …Bc5 squares. Accept the pawn with Bxb4 and refute the gambit if you can.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4',
        correctMove: 'exd4',
        hint: 'White just played d4, sacrificing tempo for the central crash. What is the principled reply?',
        concept: 'Accepting the central pawn',
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O',
        correctMove: 'd6',
        hint: 'White has castled. Black is up a pawn but behind in development. Which move keeps the structure flexible and prepares safe development?',
        concept: 'Modern Evans defence with d6',
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O Nf6',
        correctMove: 'e5',
        hint: 'Black has developed Nf6 and is preparing to castle. What pawn push kicks the knight before it cements the kingside?',
        concept: 'Central pawn push e5',
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nc6 Bc4 Bc5',
        correctMove: 'b4',
        hint: 'The hallmark sacrifice of this opening. Which move offers the b-pawn to deflect Blacks bishop and gain central tempi?',
        concept: 'The Evans pawn sacrifice',
      },
    ],
  },

  'kings-gambit': {
    middlegamePlans: [
      {
        id: 'mp-kings-gambit-open-f-file',
        title: 'Open f-file pressure after fxe5',
        pgnToReachPosition: 'e4 e5 f4 exf4 Nf3 g5 Bc4 Bg7 d4 d6 O-O',
        overview: "The opening sacrifice of the f-pawn fully opens the f-file once O-O lands. The Rf1 immediately pressures f7 with the Bc4. Combined with Qe2 or Qd3 and a follow-up h2-h3 + Kh1 to safely store the king, White builds a heavy attack against Black's underdeveloped kingside.",
        pawnBreaks: [
          {
            move: 'h4',
            explanation: "Pushing h2-h4 attacks Black's g5 pawn shield (after Black's …g5 holding the f4-pawn). The pawn storm on the h-file opens lines toward Black's king before Black can complete development.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bc1-e3 or Bc1-d2',
            explanation: "The dark-squared bishop develops to defend the kingside and prepare queen-rook coordination. Be3 supports the central d4 pawn; Bd2 prepares Nc3 + 0-0-0 to attack on opposite wings.",
          },
          {
            piece: 'Knight',
            route: 'Nb1-c3-d5',
            explanation: "The c3-knight aims for d5, the most active outpost in the King's Gambit. From d5 the knight pressures Black's queenside and threatens to land on f6 or e7 with a tempo-gaining sacrifice.",
          },
        ],
        typicalMistakes: [
          "Forgetting to capture f4 early — Black can consolidate the extra pawn into a fortress if White delays.",
          "Castling kingside without enough cover — once Kg1, the open f-file cuts both ways.",
        ],
      },
      {
        id: 'mp-kings-gambit-bishop-pair-attack',
        title: 'Bc4 + Qe2 + Nc3 piece swarm',
        pgnToReachPosition: 'e4 e5 f4 exf4 Nf3 d6 Bc4 h6 d4',
        overview: "The classic King's Gambit attacking setup. Bc4 hits f7, Nf3 controls e5, and a future Nc3 + Qe2 brings every minor piece into the attack within the first 10 moves. The d4 break opens the center while every White piece is already poised on its best square.",
        pawnBreaks: [
          {
            move: 'd4',
            explanation: "The central pawn push that opens lines for both rooks and the queen. Once d4 fires, the Bc1 develops with tempo (Bxf4 or via e3-Be3), and the Nf3 has the e5 square as an outpost.",
          },
          {
            move: 'e5',
            explanation: "When Black has played …Nf6, e4-e5 kicks the knight and clears the e-file for the Re1 + Qe2 battery.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen',
            route: 'Qd1-e2',
            explanation: "Qe2 prepares Nc3 (otherwise pinned), supports d4 + e5 pushes, and aligns on the e-file behind a future Re1. The queen swings to h5 or g4 later for direct kingside attack.",
          },
        ],
        typicalMistakes: [
          "Pushing g4 too early to defend f4 — weakens the king and lets Black counterattack with …Qh4+ ideas.",
          "Trading on f4 with the bishop without sufficient piece development — gives Black time to consolidate.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'e4 e5 f4',
        wrongMove: 'd5',
        correctMove: 'exf4',
        explanation: "2…d5 (Falkbeer Counter-Gambit) is sharp but theoretically dubious for Black at the top level. After 3.exd5 e4 White has the Nimzowitsch Variation 4.d3 with a strong reply. Accepting the gambit with 2…exf4 is the principled move — keep the extra pawn and defend.",
      },
      {
        pgnToReachPosition: 'e4 e5 f4 exf4 Nf3 g5',
        wrongMove: 'h3',
        correctMove: 'Bc4',
        explanation: "3.h3 is a slow move that wastes tempo and weakens the king. The principled fourth move is 4.Bc4 (or 4.h4 directly attacking g5). Develop pieces before pushing pawns near your own king.",
      },
      {
        pgnToReachPosition: 'e4 e5 f4 exf4 Bc4',
        wrongMove: 'Qh4+',
        correctMove: 'Nf6',
        explanation: "Qh4+ (Bishop's Gambit) looks tempting to harass the king but actually helps White — after 4.Kf1 White's king is on its way to safety via Kg1 + Kh1 anyway, and Black's queen is offside. 3…Nf6 develops and prepares to play …d5 to challenge the center.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'e4 e5 f4',
        correctMove: 'exf4',
        hint: 'White offers a pawn to open the f-file and gain rapid attacking chances. What is the principled reply?',
        concept: 'Accepting the gambit pawn',
      },
      {
        pgnToReachPosition: 'e4 e5 f4 exf4 Nf3',
        correctMove: 'g5',
        hint: 'Black has accepted the pawn. Which move keeps the extra pawn defended and prepares fianchetto?',
        concept: 'Defending the f4 pawn with g5',
      },
      {
        pgnToReachPosition: 'e4 e5 f4 exf4 Nf3 d6 Bc4',
        correctMove: 'h6',
        hint: 'White has developed Bc4. Which move prevents Ng5 ideas while preparing g5 to support f4?',
        concept: 'Pawn shield with h6',
      },
      {
        pgnToReachPosition: 'e4 e5 f4 exf4 Nf3 g5 Bc4',
        correctMove: 'Bg7',
        hint: 'Black has the g5 pawn. Which bishop development fianchettos and defends g5?',
        concept: 'Bg7 fianchetto defending g5',
      },
    ],
  },

  'petrov-defence': {
    middlegamePlans: [
      {
        id: 'mp-petrov-symmetrical-classical',
        title: 'Symmetrical Classical (3.Nxe5 d6 4.Nf3 Nxe4)',
        pgnToReachPosition: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4',
        overview: "The Petrov's defining tabiya. After the symmetric capture sequence, both sides have a developed knight and an open center. The position is highly drawish at master level — the side with the move has only a microscopic edge. White's plan: complete development with Bd3, Nc3, O-O, and aim for slight space advantages through pawn moves.",
        pawnBreaks: [
          {
            move: 'd4-d5',
            explanation: "After full development, pushing d4-d5 grabs central space and cramps Black's pieces. The d5 pawn supports a future c4-c5 advance to clamp down on Black's queenside.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bf1-d3 then bishop pair coordination',
            explanation: "Bd3 develops the bishop opposite Black's centralized knight on e4. After Nc3 challenges the knight (likely Nxc3 bxc3), White gets the bishop pair as a long-term asset.",
          },
        ],
        typicalMistakes: [
          "Pushing d5 too early before completing development — Black's …c6 break shows up at the right moment.",
          "Trading the bishop pair for no compensation — the two bishops are White's main edge in this line.",
        ],
      },
      {
        id: 'mp-petrov-marshall-attack-style',
        title: 'Initiative with quick development',
        pgnToReachPosition: 'e4 e5 Nf3 Nf6 d4',
        overview: "Steinitz's preferred treatment — 3.d4 instead of 3.Nxe5 leads to more imbalanced play. The center opens immediately, both sides scramble to develop. White's plan: castle quickly, get Re1 on the e-file, and pressure Black's centralized knight if Black plays …exd4.",
        pawnBreaks: [
          {
            move: 'd4 (already played)',
            explanation: "The immediate d4 challenges Black's e5 pawn directly. After …exd4 White plays e5 attacking the f6-knight, then Qxd4 catches up in development with the queen actively centralized.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen',
            route: 'Qd1-d4 (after exchanges)',
            explanation: "After …exd4 Qxd4, the queen on d4 is well-placed: centralized, defended by the c-pawn or knight, and supporting an e4-e5 push.",
          },
        ],
        typicalMistakes: [
          "Trading queens prematurely after Qxd4 — keeps White's initiative alive only with the queen on the board.",
          "Failing to play e5 attacking the Nf6 — Black gets a free tempo to develop if you let it.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nf6 Nxe5',
        wrongMove: 'Nxe4',
        correctMove: 'd6',
        explanation: "3…Nxe4?? is the most famous beginner blunder in the Petrov. After 4.Qe2 Nf6 5.Nc6+ (revealing the discovered attack on the queen) White wins material. The correct 3…d6 kicks the knight first; only THEN 4…Nxe4 is safe.",
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nxf7',
        wrongMove: 'Kxf7',
        correctMove: 'Qe7',
        explanation: "The Cochrane Gambit — 4.Nxf7?! sacrifices the knight for the king's safety. After 4…Kxf7?! Black accepts but the king is exposed. The principled reply is 4…Qe7 attacking the offside knight; modern theory considers Black better.",
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nf6',
        wrongMove: 'd3',
        correctMove: 'Nxe5',
        explanation: "3.d3 is a quiet, harmless move that lets Black equalize comfortably. The principled choice is 3.Nxe5 (mainline) or 3.d4 (Steinitz attack). Choose your line and play it sharply.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'e4 e5 Nf3',
        correctMove: 'Nf6',
        hint: 'Black wants to counter-attack the e4 pawn symmetrically. Which knight move does this?',
        concept: 'The defining Petrov move',
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nf6 Nxe5',
        correctMove: 'd6',
        hint: 'White has captured your e5 pawn. Why does immediate Nxe4 lose? What is the correct move that kicks the white knight first?',
        concept: 'Kick before capture',
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3',
        correctMove: 'Nxe4',
        hint: 'White retreated the knight to f3. Now is the right moment to grab the pawn. Which knight move recovers the material?',
        concept: 'Recapture with safety',
      },
      {
        pgnToReachPosition: 'e4 e5 Nf3 Nf6 d4',
        correctMove: 'exd4',
        hint: 'White challenges the center with 3.d4 (Steinitz Attack). What is the principled reply?',
        concept: 'Accepting the central trade',
      },
    ],
  },

  'queens-gambit': {
    middlegamePlans: [
      {
        id: 'mp-queens-gambit-minority-attack',
        title: 'Minority Attack — Carlsbad structure',
        pgnToReachPosition: 'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 O-O Bd3 Nbd7 Nf3 Re8 O-O',
        overview: "The minority attack is White's primary plan in the Carlsbad structure (after the Exchange Variation cxd5 exd5). White's b2-b4-b5 advances exchange pawns on the queenside, eventually leaving Black with a weak isolated c-pawn or backward c6-pawn. Once that weakness is fixed, White's rooks pile up on the c-file and the endgame is grim for Black.",
        pawnBreaks: [
          {
            move: 'b2-b4-b5',
            explanation: "The minority of two queenside pawns advances to attack Black's three-pawn majority. After b5 cxb5 (or bxc6) Black's c-pawn becomes a permanent weakness — either isolated on c6 or backward after a future …b6.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen + Rooks',
            route: 'Queen to b3 or a4, Rook to c1, Rook to b1',
            explanation: "The heavy pieces support the b-pawn advance and prepare to occupy the c-file once it opens. After b5 cxb5 and the trade, Rc1 + Rc2 doubles on the c-file targeting the c6-weakness.",
          },
          {
            piece: 'Bishop',
            route: 'Bf1-d3 then Bg5 for the bishop pair',
            explanation: "Bd3 supports the kingside pawn structure and prevents …Nh5 ideas. The Bg5 (or Bf4) pins or pressures the f6-knight.",
          },
        ],
        typicalMistakes: [
          "Pushing b4-b5 before piece coordination — Black can play …a6 to delay the break.",
          "Trading rooks on the c-file too early — the minority attack only works if you can pressure c6 long-term.",
        ],
      },
      {
        id: 'mp-queens-gambit-center-pressure',
        title: 'Classical center pressure with e4 break',
        pgnToReachPosition: 'd4 d5 c4 c6 Nc3 Nf6 Nf3 e6 Bg5 h6 Bh4',
        overview: "When Black plays the Slav setup with …c6, White's plan shifts to a central e2-e4 break. After full development with O-O, Re1, and Bd3, the e4 push fires to free the bishop and gain space. Once e4 lands, the position opens and White's better-coordinated pieces dominate.",
        pawnBreaks: [
          {
            move: 'e4',
            explanation: "The central break opens the position for White's pieces. After e4 dxe4 Nxe4 Black's pawn structure is cracked and White's e4-knight is a dominant outpost.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bg5-h4-g3 to maintain the pin',
            explanation: "If Black plays …h6 to break the pin on f6, the bishop retreats to h4 keeping pressure. From h4 the bishop can also swing to g3 to support a future kingside attack.",
          },
        ],
        typicalMistakes: [
          "Playing e4 too early before defending d4 — Black's …c5 destabilizes the entire center.",
          "Trading the dark-squared bishop on f6 without preparation — gives Black the bishop pair for free.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 d5 c4',
        wrongMove: 'dxc4',
        correctMove: 'e6',
        explanation: "Capturing dxc4 (QGA) is playable but theoretically minor — Black gives up the center for active piece play. The principled mainline is 2…e6 (QGD) keeping the central structure intact. Accept the gambit only if you know the active …a6 + …b5 follow-up.",
      },
      {
        pgnToReachPosition: 'd4 d5 c4 e6 Nc3',
        wrongMove: 'dxc4',
        correctMove: 'Nf6',
        explanation: "After 3.Nc3 the immediate dxc4 doesn't gain anything — White recaptures with the bishop or knight comfortably. 3…Nf6 develops normally; the central capture comes only after specific tactical justification.",
      },
      {
        pgnToReachPosition: 'd4 d5 c4 e6 Nc3 Nf6 Bg5',
        wrongMove: 'h6',
        correctMove: 'Be7',
        explanation: "4…h6 is a common but weakening reply — after 5.Bxf6 Qxf6 Black accepts an isolated pawn structure without compensation. The mainline 4…Be7 develops and unpins the f6-knight indirectly.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 d5',
        correctMove: 'c4',
        hint: 'The defining move of this opening complex. Which pawn push offers a gambit pawn to deflect Blacks d-pawn?',
        concept: 'The Queens Gambit',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 e6',
        correctMove: 'Nc3',
        hint: 'Black declined the gambit with 2…e6. Which knight development supports the c4 pawn and attacks d5?',
        concept: 'Developing Nc3 in QGD',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O',
        correctMove: 'cxd5',
        hint: 'White wants to fix Blacks pawn structure for a minority attack. Which capture creates the Carlsbad pawn formation?',
        concept: 'Exchange variation cxd5',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 c6',
        correctMove: 'Nf3',
        hint: 'Black plays the Slav 2…c6. Which natural developing move keeps options open for both e3 and e4 breaks later?',
        concept: 'Flexible Nf3 development',
      },
    ],
  },

  'qga': {
    middlegamePlans: [
      {
        id: 'mp-qga-classical-isolated-pawn',
        title: 'Classical Isolated d-pawn (IQP) attack',
        pgnToReachPosition: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5',
        overview: "After 3…Nf6 and 4…e6, the classical QGA lines transition to an isolated d-pawn structure where White has the isolated d4 pawn. White's plan: use the d4-pawn as a wedge to gain space and piece activity. The Nf3 has e5 as an outpost; the c4-bishop targets f7; the queen swings to e2 then d3 supporting d4-d5 ideas.",
        pawnBreaks: [
          {
            move: 'd4-d5',
            explanation: "The break that liquidates the isolated d-pawn. After d5 exd5 White gains the e-file for the rooks and dissolves the structural weakness, often leading to a favorable middlegame.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Knight',
            route: 'Nf3-e5 outpost',
            explanation: "The e5 square is a permanent outpost for the f3-knight once Black's e-pawn moves. From e5 the knight controls central squares and supports kingside attacks via Nxf7 or Ng4 ideas.",
          },
          {
            piece: 'Queen',
            route: 'Qd1-e2-d3',
            explanation: "Qe2 prepares Rd1 (the queen rook to the d-file behind the isolated pawn). Qd3 then supports d4-d5 and aligns on the b1-h7 diagonal for kingside attack.",
          },
        ],
        typicalMistakes: [
          "Trading pieces too quickly — the IQP is strong with pieces on the board, weak in the endgame.",
          "Pushing d4-d5 before piece coordination — Black equalizes if the break liquidates without gaining anything.",
        ],
      },
      {
        id: 'mp-qga-active-bishop-development',
        title: 'Active bishop development with Nc3 + Bd3',
        pgnToReachPosition: 'd4 d5 c4 dxc4 e3 e5 Bxc4 exd4 exd4 Nf6 Nc3',
        overview: "In lines where Black plays …e5 early to challenge the center, White accepts the symmetric pawn structure and aims for piece-based pressure. Nc3 attacks d5 (or the b5 square after a future b-push), Bd3 controls the long diagonal, and queen comes to e2 to support a quick e4 break.",
        pawnBreaks: [
          {
            move: 'e4-e5',
            explanation: "Once Black has played …e5xd4 White can later push e4-e5 to gain space and attack any Black piece on f6.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop pair',
            route: 'Bd3 + Bc1-g5 or Bf4',
            explanation: "The dark-squared bishop develops to g5 or f4 attacking Black's queenside or kingside. The light-squared bishop on d3 supports central pawn pushes and aims at h7.",
          },
        ],
        typicalMistakes: [
          "Leaving the c-file open — Black's …Rc8 + …Rc1 doubling can be devastating.",
          "Forgetting to support d4 with the queen or rook — Black's pieces target the pawn from multiple directions.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 d5 c4 dxc4 e3',
        wrongMove: 'b5',
        correctMove: 'Nf6',
        explanation: "Defending the extra pawn with 3…b5? is a known trap — White plays 4.a4 b4 5.b3 cxb3 6.axb5 with a huge attack on the open files. The principled move is 3…Nf6 — give back the pawn for development and play a normal QGA position.",
      },
      {
        pgnToReachPosition: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4',
        wrongMove: 'b5',
        correctMove: 'c5',
        explanation: "Even after the bishop recaptures, …b5? is still a structural mistake — White plays 6.Bd3 and Black has weakened the queenside permanently. The mainline 5…c5 fights for the center and prepares …Nc6 development.",
      },
      {
        pgnToReachPosition: 'd4 d5 c4',
        wrongMove: 'e5',
        correctMove: 'dxc4',
        explanation: "Pushing 2…e5? loses a pawn after 3.dxe5 d4 4.Nf3 Nc6 5.a3 with a clearly favorable position for White. The QGA accepts with 2…dxc4 — clean and theoretically sound.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 d5 c4',
        correctMove: 'dxc4',
        hint: 'The defining move of this variation. Which capture accepts the gambit pawn?',
        concept: 'Accepting the Queens Gambit',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6',
        correctMove: 'Bxc4',
        hint: 'Recovering the gambit pawn. Which bishop development recaptures the c4-pawn?',
        concept: 'Recovering the gambit pawn',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4',
        correctMove: 'c5',
        hint: 'Now Black must fight for the center. Which pawn push challenges Whites d4 pawn?',
        concept: 'Central counter-push',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 dxc4 Nf3 a6 e3',
        correctMove: 'b5',
        hint: 'In this Mainline QGA, Black has played 3…a6 preparing queenside expansion. Which pawn push is the principled follow-up?',
        concept: 'Mainline QGA queenside expansion',
      },
    ],
  },

  'sicilian-sveshnikov': {
    middlegamePlans: [
      {
        id: 'mp-sveshnikov-d5-outpost',
        title: 'White d5 outpost vs Black piece activity',
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5',
        overview: "The Sveshnikov accepts a permanent backward d-pawn and a weak d5-square in exchange for the bishop pair, active pieces, and a strong kingside pawn structure. After Black's …b5 kicking the knight back to a3, White's plan: occupy d5 with the c3-knight (which can never be challenged by a Black pawn), and pressure the d6 pawn from b5 and d5.",
        pawnBreaks: [
          {
            move: 'c4',
            explanation: "After kicking the knight with …b5, White's queenside knight (now on a3) can swing to c4 attacking the e5-pawn and supporting future b2-b3 + a2-a4 to break Black's queenside expansion.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Knight',
            route: 'Nc3-d5 outpost',
            explanation: "The c3-knight's eternal home: d5. From d5 the knight pressures Black's queenside and kingside simultaneously. Black's only way to dislodge it is with …Bxd5, but trading the dark-squared bishop costs Black the bishop pair compensation.",
          },
          {
            piece: 'Bishop',
            route: 'Bg5xf6 trade',
            explanation: "After Bg5 pin, the f6-knight is targeted. Bxf6 doubles Black's pawns and weakens d5 further — although gives Black the bishop pair, the structural damage often outweighs the piece-pair advantage.",
          },
        ],
        typicalMistakes: [
          "Allowing Black's …f5 break unchallenged — gains kingside space and counter-attacking chances.",
          "Trading queens too early — the Sveshnikov endgame favors Black's bishop pair.",
        ],
      },
      {
        id: 'mp-sveshnikov-black-counterplay',
        title: 'Black counter-play with …f5 and …Bg7',
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6 gxf6 Nd5 f5',
        overview: "Black's signature counter-attacking plan in the Sveshnikov. After the doubled f-pawns from Bxf6 gxf6, Black plays …f5 to challenge the e4 pawn and free the bishop on f8. Once …Bg7 lands the bishop pair coordinates with the …f4 push to attack White's king.",
        pawnBreaks: [
          {
            move: 'f5',
            explanation: "The thematic break that activates Black's bishops and challenges White's e4 pawn. After exf5 Bxf5 Black has the bishop pair and the open f-file for the rook.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bf8-g7 fianchetto',
            explanation: "The dark-squared bishop fianchettos to g7 (using the doubled g-pawn for cover). From g7 the bishop dominates the long diagonal and supports a future …d5 break.",
          },
        ],
        typicalMistakes: [
          "Pushing …f5 before completing development — White plays exf5 with extra tempo on the queenside.",
          "Trading the bishop pair carelessly — the two bishops are Black's main compensation in this opening.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3',
        wrongMove: 'd6',
        correctMove: 'e5',
        explanation: "5…d6 transposes to the Najdorf or Classical Sicilian — fine openings but not the Sveshnikov. The defining move is 5…e5 kicking the knight back. If you want the Sveshnikov, play it now.",
      },
      {
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5',
        wrongMove: 'a6',
        correctMove: 'd6',
        explanation: "6…a6? loses a pawn — after 7.Nd6+ Bxd6 8.Qxd6 Black has lost the d-pawn structure. 6…d6 defends the e5-pawn while keeping the knight kicked.",
      },
      {
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Nf3',
        wrongMove: 'd5',
        correctMove: 'd6',
        explanation: "After 6.Nf3 (avoiding the mainline 6.Ndb5), …d5? overextends and loses the e-pawn structure. 6…d6 is solid and similar in spirit to the Najdorf.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3',
        correctMove: 'e5',
        hint: 'The defining move of the Sveshnikov. Which pawn push kicks the d4-knight and accepts the backward d-pawn?',
        concept: 'The Sveshnikov pawn push',
      },
      {
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5',
        correctMove: 'd6',
        hint: 'The white knight has jumped to b5 attacking d6 and threatening Nd6+. Which pawn move defends d6 and chases the knight?',
        concept: 'Defending the d6 square',
      },
      {
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5',
        correctMove: 'a6',
        hint: 'The pin on f6 is annoying. Which pawn move kicks the knight while preparing …b5?',
        concept: 'Kicking the knight with a6',
      },
      {
        pgnToReachPosition: 'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 e5 Ndb5 d6 Bg5 a6 Na3 b5 Bxf6',
        correctMove: 'gxf6',
        hint: 'The bishop took on f6. Which recapture maintains the central pawn structure?',
        concept: 'Doubled f-pawns recapture',
      },
    ],
  },

  'semi-slav': {
    middlegamePlans: [
      {
        id: 'mp-semi-slav-meran-counterattack',
        title: 'Meran with …b5 + …a6 + …c5',
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4 b5 Bd3 a6',
        overview: "The Meran Variation is Black's primary aggressive Semi-Slav plan. After …b5 + …a6, the c-pawn is poised to break with …c5 — opening lines for the bishop on b7 and the rook on c8. This creates a sharp pawn race on the queenside where Black often emerges with a passed c-pawn or active piece play.",
        pawnBreaks: [
          {
            move: 'c5',
            explanation: "The Meran's defining break. After …c5 dxc5 Black has an open c-file and a bishop on b7 dominating the long diagonal. Black often follows with …Bxh2+ sacrificing for kingside attack.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bc8-b7 fianchetto',
            explanation: "After …b5, the bishop develops to b7 controlling the long diagonal toward White's king. Combined with …c5 opening the diagonal, this becomes Black's main attacking weapon.",
          },
        ],
        typicalMistakes: [
          "Playing …c5 before completing development — White's …dxc5 attacks the e-file and creates a passed c-pawn.",
          "Trading the b7-bishop too early — the bishop's long-diagonal pressure IS the Meran's attacking compensation.",
        ],
      },
      {
        id: 'mp-semi-slav-botvinnik',
        title: 'Botvinnik System with f3 + e4',
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5 dxc4 e4 b5 e5 h6 Bh4 g5 Nxg5 hxg5 Bxg5 Nbd7',
        overview: "The Botvinnik System (5.Bg5 dxc4) leads to one of the sharpest, most theoretical lines in all chess. Both sides storm pawns on opposite wings. White sacrifices a knight on g5 to open lines toward Black's king; Black accepts and tries to consolidate while attacking on the queenside with the extra material.",
        pawnBreaks: [
          {
            move: 'f3 then g4',
            explanation: "White's plan is to support e4 with f3, then storm with g4 to open the kingside. The pawn storm is fully committed — there's no going back once the king has been exposed.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen',
            route: 'Qd1-f3-h3',
            explanation: "The queen moves to h3 in some Botvinnik lines, supporting the kingside attack and threatening Qh7+ ideas with the rook joining.",
          },
        ],
        typicalMistakes: [
          "Playing the Botvinnik without preparation — it's the sharpest line in chess and one mistake loses immediately.",
          "Forgetting that Black's bishop pair often emerges victorious in the endgame — White must win in the middlegame.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3',
        wrongMove: 'a6',
        correctMove: 'e6',
        explanation: "4…a6 (Chebanenko Slav) is fine but transposes to Slav Defence territory, not Semi-Slav. The defining Semi-Slav move is 4…e6 keeping options for both Meran and Botvinnik. Choose your repertoire.",
      },
      {
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3',
        wrongMove: 'Bb4',
        correctMove: 'dxc4',
        explanation: "6…Bb4 is fine in Nimzo-Indian setups but in Semi-Slav it lets White play 7.O-O dxc4 8.Bxc4 with extra tempo. The Meran starts with 6…dxc4 7.Bxc4 b5 immediately.",
      },
      {
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5',
        wrongMove: 'h6',
        correctMove: 'dxc4',
        explanation: "5…h6 is too slow — White plays 6.Bh4 keeping the pin and Black hasn't gained anything. The Botvinnik 5…dxc4 immediately takes the c-pawn and prepares …b5 sacrificing the pin for queenside expansion.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3',
        correctMove: 'e6',
        hint: 'The defining Semi-Slav move. Which pawn push combines Slav (c6) with QGD (e6) for maximum flexibility?',
        concept: 'The Semi-Slav setup',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3',
        correctMove: 'dxc4',
        hint: 'White has played the slow 5.e3. Which capture starts the Meran with active piece play?',
        concept: 'Starting the Meran',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 e3 Nbd7 Bd3 dxc4 Bxc4',
        correctMove: 'b5',
        hint: 'White recaptured with the bishop. Which pawn push kicks the bishop and prepares …a6 + …c5?',
        concept: 'Mainline Meran kick',
      },
      {
        pgnToReachPosition: 'd4 d5 c4 c6 Nf3 Nf6 Nc3 e6 Bg5',
        correctMove: 'dxc4',
        hint: 'White has played the sharp 5.Bg5. Which capture starts the Botvinnik System?',
        concept: 'Starting the Botvinnik',
      },
    ],
  },

  'reti-opening': {
    middlegamePlans: [
      {
        id: 'mp-reti-fianchetto-pressure',
        title: 'Long-diagonal pressure with Bg2',
        pgnToReachPosition: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4',
        overview: "The Réti's signature plan: the fianchettoed Bg2 dominates the long h1-a8 diagonal. After completing development with O-O + Nbd2, White breaks with e4 to challenge Black's center. Once e4 fires, the Bg2 has open lines toward Black's queenside.",
        pawnBreaks: [
          {
            move: 'e4',
            explanation: "The central break that activates the fianchettoed bishop. After e4 dxe4 dxe4 (or e4 d4) Black's central pawn structure is destabilized and White's pieces have open lines.",
          },
          {
            move: 'c4',
            explanation: "Adding c4 to attack d5 creates a Reversed Slav structure. White plays for the same minority-attack ideas Black gets in the QGD Exchange.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Knight',
            route: 'Nb1-d2-c4 or -e4',
            explanation: "The d2-knight reroutes to c4 (attacking …e5 or …b6) or to e4 (the central outpost after the e4 push). The knight's flexibility is a Réti hallmark.",
          },
        ],
        typicalMistakes: [
          "Pushing e4 too early before the king is safe — Black's …Nxe4 forks are common.",
          "Allowing …d4 to lock the center — kills the Bg2's long-diagonal pressure entirely.",
        ],
      },
      {
        id: 'mp-reti-transposition-king-indian',
        title: 'King\'s Indian Attack transposition',
        pgnToReachPosition: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5 e4 Nc6 Re1 Qc7 e5',
        overview: "When Black plays Slav-like setups, the Réti transposes into the King's Indian Attack: Bg2 + O-O + d3 + e4 + e5 + Ne5 attack. White plays for a slow kingside attack mirroring the King's Indian Defence with colors reversed.",
        pawnBreaks: [
          {
            move: 'e4-e5',
            explanation: "Once Re1 supports the e-file, e4-e5 kicks the f6-knight and gains kingside space. The e5 pawn supports a future f4-f5 push if needed.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Knight',
            route: 'Nf3-e5-d7 (after exchanges)',
            explanation: "The f3-knight aims for e5 (after Black's …e6 frees the square). From e5 the knight pressures f7 and supports kingside attacks.",
          },
        ],
        typicalMistakes: [
          "Allowing Black to expand on the queenside without challenge — Black's …b5 + …Bb7 + …a5 takes over the long diagonal.",
          "Trading the dark-squared bishop without reason — keeps Black's queenside cramped longer.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'Nf3 d5',
        wrongMove: 'd4',
        correctMove: 'g3',
        explanation: "2.d4? immediately commits to a Queen's Gambit setup, defeating the purpose of starting with 1.Nf3. The Réti specifically delays central commitment with 2.g3 — keep your options open until you see Black's setup.",
      },
      {
        pgnToReachPosition: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7',
        wrongMove: 'c4',
        correctMove: 'd3',
        explanation: "Pushing c4 immediately is fine but leads to a Reversed QGD — committing to a specific structure too early. The flexible 5.d3 keeps the option of c4 OR e4 depending on Black's next move.",
      },
      {
        pgnToReachPosition: 'Nf3 d5 g3',
        wrongMove: 'Bf5',
        correctMove: 'Nf6',
        explanation: "Developing 2…Bf5 commits to the wrong piece order — after 3.Bg2 + 4.O-O Black's bishop on f5 has nowhere active to go. 2…Nf6 develops a piece without committing the bishop's destination.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'Nf3',
        correctMove: 'd5',
        hint: 'White has played the flexible 1.Nf3. Which classical central move stakes a claim on the center?',
        concept: 'Classical central response',
      },
      {
        pgnToReachPosition: 'Nf3 d5 g3 Nf6',
        correctMove: 'Bg2',
        hint: 'The Réti hallmark. Which bishop development takes the long diagonal pressure?',
        concept: 'Réti fianchetto',
      },
      {
        pgnToReachPosition: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5',
        correctMove: 'e4',
        hint: 'White has completed development. Which central break challenges Blacks pawn structure and activates the Bg2?',
        concept: 'Central e4 break',
      },
      {
        pgnToReachPosition: 'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3',
        correctMove: 'O-O',
        hint: 'Black has developed solidly. Which natural move completes development and prepares the queenside expansion?',
        concept: 'Castling and consolidating',
      },
    ],
  },

  'trompowsky-attack': {
    middlegamePlans: [
      {
        id: 'mp-trompowsky-pin-pressure',
        title: 'Pin pressure with Bg5xf6',
        pgnToReachPosition: 'd4 Nf6 Bg5 Ne4 Bf4 d5 e3 Bf5 c4 e6 Nc3',
        overview: "The Trompowsky's defining idea: pin the f6-knight immediately. When Black plays 2…Ne4 escaping the pin, White's Bf4 maintains pressure on the kingside and the natural f3 push forces the knight back. The resulting position is a positional middlegame where White's queenside expansion with c4 + Nc3 attacks Black's center.",
        pawnBreaks: [
          {
            move: 'c4',
            explanation: "Attacks d5 and prepares Nc3 + a future c5 or cxd5. The c-pawn lever is White's main way to challenge Black's central pawn structure.",
          },
          {
            move: 'f3',
            explanation: "Kicks the Ne4 back to f6 (forcing Black to play …Nxg2+? or retreat). After f3, the e-pawn is shielded and White's center is solidified.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bg5-f4-g3 maintaining pressure',
            explanation: "The dark-squared bishop's flexibility is the Trompowsky's main asset. From f4 the bishop pressures Black's queenside; from g3 it controls the long diagonal toward h7.",
          },
        ],
        typicalMistakes: [
          "Trading the bishop on f6 too early — gives Black doubled pawns but also the bishop pair as compensation.",
          "Forgetting f3 to kick the e4-knight — Black can establish a permanent outpost there.",
        ],
      },
      {
        id: 'mp-trompowsky-exchange-bxf6',
        title: 'Exchange variation: Bxf6 + e4',
        pgnToReachPosition: 'd4 Nf6 Bg5 d5 Bxf6 gxf6 e3 c5 Nf3',
        overview: "After 2…d5, taking on f6 is the principled choice. Black recaptures with the g-pawn doubling the f-pawns. White's plan: complete development with e3 + Nf3 + c4 (or c3) and exploit the long-term structural weaknesses on f6+f7. Black's compensation is the bishop pair and the open g-file.",
        pawnBreaks: [
          {
            move: 'c4',
            explanation: "Attacks d5 immediately — Black must respond with …c6 (passive) or …e6 (also passive). Either way White gains a tempo for development.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Knight',
            route: 'Nb1-d2-f3 (or Nf3 directly)',
            explanation: "The b1-knight develops to d2 to support e4 push later. From d2 it can also reroute to b3 to support the c4-c5 break.",
          },
        ],
        typicalMistakes: [
          "Forgetting that Black has the bishop pair — White must use the structural advantage quickly before Black coordinates.",
          "Trading queens too early — the Trompowsky endgame favors Black due to the bishop pair.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 Nf6 Bg5',
        wrongMove: 'c5',
        correctMove: 'Ne4',
        explanation: "2…c5? loses material after 3.Bxf6 exf6 4.d5 cementing the center. The principled replies are 2…Ne4 (escape the pin), 2…d5 (challenge the center), or 2…e6 (solid passive).",
      },
      {
        pgnToReachPosition: 'd4 Nf6 Bg5 Ne4',
        wrongMove: 'Bh4',
        correctMove: 'Bf4',
        explanation: "3.Bh4? leaves the bishop on a poor square — Black plays …d5 or …c5 to gain a free tempo against the bishop. 3.Bf4 keeps the bishop active and pressures c7/e7.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 Bg5 d5 Bxf6',
        wrongMove: 'exf6',
        correctMove: 'gxf6',
        explanation: "3…exf6? cracks Black's pawn structure with no compensation — the e-file is half-open for White's rook. 3…gxf6 preserves the e-pawn and accepts the doubled f-pawns for the bishop pair.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 Nf6',
        correctMove: 'Bg5',
        hint: 'The defining Trompowsky move. Which immediate bishop development pins the f6-knight?',
        concept: 'The Trompowsky pin',
      },
      {
        pgnToReachPosition: 'd4 Nf6 Bg5',
        correctMove: 'Ne4',
        hint: 'Black wants to escape the pin without weakening the structure. Which knight move escapes to a central square?',
        concept: 'Escaping the pin',
      },
      {
        pgnToReachPosition: 'd4 Nf6 Bg5 Ne4',
        correctMove: 'Bf4',
        hint: 'The bishop is being attacked. Which retreat keeps the bishop active and pressures c7?',
        concept: 'Maintaining bishop pressure',
      },
      {
        pgnToReachPosition: 'd4 Nf6 Bg5 d5',
        correctMove: 'Bxf6',
        hint: 'Black has challenged the center with 2…d5. Which capture damages Blacks pawn structure?',
        concept: 'Structural exchange',
      },
    ],
  },

  'benoni-defence': {
    middlegamePlans: [
      {
        id: 'mp-benoni-queenside-expansion',
        title: 'Queenside expansion with …a6 + …b5',
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O a6',
        overview: "The Benoni's signature plan. After accepting the backward d-pawn and locked center, Black expands on the queenside with …a6 + …b5. The b-pawn break creates a passed c-pawn (if c4 is traded) or opens the b-file for the rook. Combined with …Re8 + …Nbd7 + …Rb8, Black builds heavy pressure on White's queenside.",
        pawnBreaks: [
          {
            move: 'b5',
            explanation: "The defining Benoni break. After …b5 cxb5 axb5 Black has the open a-file, the c-file pressure, and a passed c-pawn after future …c4 push.",
          },
          {
            move: 'f5',
            explanation: "Black's secondary break — challenges White's central e4 pawn and prepares …f4 to choke the kingside. Often played after the queenside structure is fixed.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Knight',
            route: 'Nb8-d7-e5',
            explanation: "The queenside knight reroutes to e5 (an outpost in the Benoni structure due to White's locked d5-pawn). From e5 the knight supports …f5 and pressures White's queenside.",
          },
        ],
        typicalMistakes: [
          "Pushing …b5 before completing development — White's a4 push fixes the queenside before Black is ready.",
          "Trading the dark-squared bishop on g7 — kills the entire Benoni attacking concept.",
        ],
      },
      {
        id: 'mp-benoni-modern-fianchetto',
        title: 'Modern Bg7 fianchetto pressure',
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 g3 Bg7 Bg2 O-O O-O',
        overview: "The Modern (fianchetto) Benoni gives Black the dynamic bishop pair on g7. After O-O, Black's plan is to maneuver the bishop to a active diagonal and break with …e6 + …f5. The position is sharp and unbalanced — White has more space but Black has piece pressure on the long diagonal.",
        pawnBreaks: [
          {
            move: 'e6',
            explanation: "The thematic break that challenges White's d5 pawn. After …e6 dxe6 fxe6 Black opens the f-file for the rook and gains central piece play.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bg7 long diagonal + Bc8-f5 development',
            explanation: "Black's bishop pair is the main asset. Bg7 attacks the b2-pawn (after Bxg7 Kxg7 leaves the king vulnerable). The c8-bishop develops to f5 or e6 (after …e6) for double-bishop attack.",
          },
        ],
        typicalMistakes: [
          "Allowing White's Bh6 trading dark-squared bishops — Black loses the main attacking piece.",
          "Pushing …e6 before piece coordination — White's …dxe6 fxe6 fxg2 Kxg2 leaves Black's structure damaged.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5',
        wrongMove: 'd6',
        correctMove: 'e6',
        explanation: "3…d6 transposes to a Modern (Schmid) Benoni — playable but loses time. The principled move is 3…e6 attacking d5 immediately, forcing White to commit the c-pawn trade.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4',
        wrongMove: 'Bg7',
        correctMove: 'Nbd7',
        explanation: "In the Four Pawns Attack (f4), 7…Bg7 is fine but 8.e5 attacking the knight loses the tempo. 7…Nbd7 first prepares against White's central pawn storm.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5',
        wrongMove: 'e3',
        correctMove: 'd5',
        explanation: "3.e3 accepts a Queen's Gambit-like setup but loses time. The principled Benoni push 3.d5 immediately commits to the wedge structure — easier to play and theoretically the most challenging.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 Nf6 c4',
        correctMove: 'c5',
        hint: 'The defining Benoni move. Which pawn push challenges Whites center asymmetrically?',
        concept: 'The Benoni structure',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5',
        correctMove: 'e6',
        hint: 'White has committed to the wedge with d5. Which pawn push challenges d5 and prepares Modern Benoni structure?',
        concept: 'Challenging the wedge',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3',
        correctMove: 'g6',
        hint: 'The Modern Benoni fianchetto preparation. Which pawn move prepares Bg7?',
        concept: 'Modern Benoni setup',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 Nf3 g6 e4 Bg7 Be2 O-O O-O',
        correctMove: 'a6',
        hint: 'Black has completed setup. Which queenside expansion move starts the …b5 plan?',
        concept: 'Queenside expansion start',
      },
    ],
  },

  'benko-gambit': {
    middlegamePlans: [
      {
        id: 'mp-benko-queenside-files',
        title: 'Queenside file pressure with …a6 + …Rxb5',
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6 Nf3 Bg7 g3 O-O Kg2 Nbd7 Re1 Qa5',
        overview: "The Benko Gambit's defining plan. By sacrificing the b-pawn, Black gets fully open a- and b-files for the rooks PERMANENTLY — not just for the middlegame, but well into the endgame. Combined with the …Bg7 fianchetto and the bishop pair after Bxa6 Bxf1 Kxf1, Black has compensation that lasts.",
        pawnBreaks: [
          {
            move: 'e6',
            explanation: "Once the queenside is established, Black's only break for opening the center is …e6 challenging d5. After dxe6 Black recaptures with the f-pawn and gains the f-file for the rook.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen',
            route: 'Qd8-a5 active queen',
            explanation: "The queen on a5 supports the queenside attack along the a-file and threatens …Qxa2 after Black opens the file. Combined with …Rfb8 + …Rxb5 ideas, the queen-rook coordination is overwhelming.",
          },
          {
            piece: 'Knight',
            route: 'Nb8-d7-b6 or -e5',
            explanation: "The queenside knight reroutes to b6 (supporting …Rxb5 attacks) or e5 (the central outpost in many Benko lines).",
          },
        ],
        typicalMistakes: [
          "Trading rooks on the b-file — gives back the gambit's main compensation.",
          "Allowing White's …e5 break to lock the center — kills the bishop-pair pressure.",
        ],
      },
      {
        id: 'mp-benko-endgame-pressure',
        title: 'Endgame pressure with the gambit pawn',
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 g3 d6 Bg2 g6 Nc3 Bg7 Nf3 Nbd7 O-O O-O Re1 Nb6',
        overview: "Even after trades, the Benko's queenside file pressure persists into the endgame. Black's plan: trade pieces to reach an endgame where the open files dominate. The Bg7 + …Rb8 + …Qa5 setup pressures the queenside in the endgame too — White's structural weakness on the a- and b-files is permanent.",
        pawnBreaks: [
          {
            move: 'c4',
            explanation: "Even after the gambit pawn is gone, Black can push …c4 to attack the queenside further and create a passed pawn on the c-file.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bf8-g7 + Bc8-a6 (or to long diagonal)',
            explanation: "Black's two bishops control the long diagonals from g7 (toward White's king) and from a6 (along the queenside). Combined with rooks on the open files, this is a positional dream position.",
          },
        ],
        typicalMistakes: [
          "Failing to play …c4 to break White's pawn structure — leaves Black's queenside files less powerful.",
          "Trading the bishop pair without reason — the two bishops are the main long-term compensation.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5',
        wrongMove: 'd6',
        correctMove: 'b5',
        explanation: "3…d6 transposes to a Modern Benoni (without committing to the gambit). The defining Benko move is 3…b5 immediately sacrificing the pawn for the queenside files.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 b5 cxb5',
        wrongMove: 'Nxd5',
        correctMove: 'a6',
        explanation: "4…Nxd5? loses the central knight for a pawn after 5.Nf3 with central pressure. The standard Benko 4…a6 invites White to either accept (5.bxa6) or decline (5.b6) — both lead to advantageous Black positions.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6',
        wrongMove: 'Nxa6',
        correctMove: 'Bxa6',
        explanation: "5…Nxa6? lets White play 6.Nc3 with Black's pieces uncoordinated. The principled 5…Bxa6 develops the bishop with tempo — White's Bf1 has nowhere to escape except Bxa6 trading the bishop pair.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5',
        correctMove: 'b5',
        hint: 'The defining Benko Gambit move. Which pawn push sacrifices a pawn for queenside file pressure?',
        concept: 'The Benko sacrifice',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 b5 cxb5',
        correctMove: 'a6',
        hint: 'Black continues the gambit. Which pawn move challenges the b5 pawn and invites the exchange?',
        concept: 'Forcing the exchange',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6',
        correctMove: 'Bxa6',
        hint: 'White accepted the gambit. Which capture develops the bishop with tempo on Whites Bf1?',
        concept: 'Developing the bishop',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4 Bxf1 Kxf1 g6',
        correctMove: 'Nf3',
        hint: 'After the bishop trade, Whites king is on f1. Which natural development move completes Whites kingside setup?',
        concept: 'Completing development',
      },
    ],
  },

  'old-indian-defence': {
    middlegamePlans: [
      {
        id: 'mp-old-indian-philidor-structure',
        title: 'Solid Philidor-style structure with …c6 + …Nbd7',
        pgnToReachPosition: 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4 c6 Be2 Be7 O-O O-O',
        overview: "The Old Indian's defining setup: solid pawn structure with …d6 + …e5 + …c6, full development without committing to specific kingside plans. The position resembles the Philidor Defence with colors reversed. Black's plan: complete development quietly, then choose between …f5 break or …Re8 + central piece play.",
        pawnBreaks: [
          {
            move: 'f5',
            explanation: "Once the king is castled and pieces developed, Black's …f5 break challenges White's e4 pawn and opens the f-file for the rook. Combined with …Nf6-h5-f4 ideas, this creates a kingside attack.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Knight',
            route: 'Nb8-d7-f8-g6',
            explanation: "The queenside knight reroutes to g6 (after …f5 break) where it supports the kingside attack and pressures the e5-square.",
          },
        ],
        typicalMistakes: [
          "Pushing …f5 too early before developing all pieces — White's exf5 with attack is dangerous.",
          "Trading minor pieces without reason — the solid Old Indian structure relies on having all pieces on the board.",
        ],
      },
      {
        id: 'mp-old-indian-classical-development',
        title: 'Classical center hold with patient development',
        pgnToReachPosition: 'd4 Nf6 c4 d6 Nc3 Nbd7 e4 e5 Nf3 Be7 Be2 O-O O-O c6',
        overview: "The truly classical Old Indian approach. Black holds the center with …d6 + …e5 and slowly maneuvers all pieces to good squares. Plan: complete development without committing to either …f5 or …c5 break. After full development, choose the break based on White's setup.",
        pawnBreaks: [
          {
            move: 'c5',
            explanation: "If White has played e4 + Nc3, the …c5 break opens the c-file for Black's rook and challenges the d4 pawn. After dxc5 dxc5 Black has a solid pawn structure.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen',
            route: 'Qd8-c7 or -e8',
            explanation: "The queen on c7 supports …c5 or …b5 breaks and protects e5. The queen on e8 is unusual but allows …e8-h5 swings for kingside attack.",
          },
        ],
        typicalMistakes: [
          "Allowing White's d4-d5 push to lock the center — kills Black's piece activity.",
          "Pushing …c5 before piece coordination — White's …c5 cxd6 or dxe5 capturing the e-pawn destabilizes Black's structure.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 Nf6 c4',
        wrongMove: 'g6',
        correctMove: 'd6',
        explanation: "2…g6 transposes to the King's Indian Defence — fine opening but not the Old Indian. The defining Old Indian move is 2…d6 keeping the bishop on its original square and the structure flexible.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 d6 Nc3 e5 Nf3',
        wrongMove: 'exd4',
        correctMove: 'Nbd7',
        explanation: "4…exd4? gives up the central pawn structure — after 5.Nxd4 Black has lost the …e5 pawn and the position is open and active for White. The principled 4…Nbd7 maintains the center and develops naturally.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 d6 Nc3 e5',
        wrongMove: 'dxe5',
        correctMove: 'Nf3',
        explanation: "4.dxe5? gives up the central pawn structure for nothing — after 4…dxe5 5.Qxd8+ Kxd8 Black's king is exposed but White has no follow-up. The principled 4.Nf3 maintains the tension and develops normally.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 Nf6 c4',
        correctMove: 'd6',
        hint: 'The defining Old Indian move. Which pawn push commits to a Philidor-style solid structure?',
        concept: 'Old Indian setup',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 d6 Nc3',
        correctMove: 'e5',
        hint: 'Black challenges Whites center symmetrically. Which pawn push fixes the central structure?',
        concept: 'Central pawn structure',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 d6 Nc3 e5 Nf3',
        correctMove: 'Nbd7',
        hint: 'Black needs to develop without losing the central pawn. Which natural development move keeps the structure solid?',
        concept: 'Solid Nbd7 development',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 d6 Nc3 e5 Nf3 Nbd7 e4',
        correctMove: 'c6',
        hint: 'White has built up the center. Which pawn push solidifies Blacks position and prepares queenside expansion?',
        concept: 'Solidifying with c6',
      },
    ],
  },

  'bird-opening': {
    middlegamePlans: [
      {
        id: 'mp-bird-classical-attack',
        title: 'Classical kingside attack with Bd3 + Qe2',
        pgnToReachPosition: 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O O-O d3 c5 Qe1',
        overview: "The Bird Opening's classical attacking plan. White builds slowly behind the f4 pawn, completes development with Nf3 + e3 + Bd3 (or Be2) + O-O, and then swings the queen to h4 or g3 for direct kingside attack. The f-pawn provides space and supports the eventual e4 break.",
        pawnBreaks: [
          {
            move: 'e4',
            explanation: "The central break that activates the entire White army. After e4 dxe4 dxe4 Black's pieces must defend rather than develop. The e-file opens for the queen's rook.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Queen',
            route: 'Qd1-e1-h4',
            explanation: "The queen's swing to h4 (via e1 to support the f-file) creates direct threats against h7. Combined with Bxh7+ ideas, this is the Bird's main attacking weapon.",
          },
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
          {
            move: 'g4',
            explanation: "After completing development, g2-g4 opens the kingside for a direct attack. Combined with Rg1 + Qh4 + Bxh7+, this is the Stonewall Bird's main weapon.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bc1-f4-g3-h4',
            explanation: "The dark-squared bishop reroutes to h4 to pressure Black's kingside and prepare Bxh6 or Bg5 sacrifices.",
          },
        ],
        typicalMistakes: [
          "Allowing Black's …f6 break — challenges the Stonewall structure and Black equalizes.",
          "Trading the dark-squared bishop for a knight — gives up the main attacking piece.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'f4',
        wrongMove: 'e5',
        correctMove: 'd5',
        explanation: "1…e5 (From's Gambit) is sharp but theoretically dubious for Black at the top level. After 2.fxe5 d6 3.exd6 Bxd6 4.Nf3 White has a clear advantage. The principled 1…d5 challenges the center and prepares solid development.",
      },
      {
        pgnToReachPosition: 'f4 d5 Nf3 Nf6',
        wrongMove: 'g3',
        correctMove: 'e3',
        explanation: "3.g3 is fine but commits to Leningrad Dutch with colors reversed — unusual treatment. The mainline 3.e3 is more flexible and prepares Bd3 + Qe2 for classical kingside attack.",
      },
      {
        pgnToReachPosition: 'f4',
        wrongMove: 'g6',
        correctMove: 'd5',
        explanation: "1…g6 is playable but lets White fianchetto on the kingside with 2.b3 + Bb2 — Black's setup mirrors White's slow approach. The active 1…d5 is more challenging.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'f4',
        correctMove: 'd5',
        hint: 'White has played the unusual 1.f4 (Birds Opening). Which classical central move challenges it?',
        concept: 'Classical central response',
      },
      {
        pgnToReachPosition: 'f4 d5 Nf3',
        correctMove: 'Nf6',
        hint: 'White has developed Nf3. Which natural development move attacks e4 from f6?',
        concept: 'Mirror development',
      },
      {
        pgnToReachPosition: 'f4 d5 Nf3 Nf6 e3 g6 Be2 Bg7 O-O',
        correctMove: 'O-O',
        hint: 'White has castled. Which natural move completes Blacks development?',
        concept: 'Completing development',
      },
      {
        pgnToReachPosition: 'f4',
        correctMove: 'd5',
        hint: 'White has played the Bird. Which response avoids From\'s Gambit (1…e5) and develops naturally?',
        concept: 'Avoiding Froms Gambit',
      },
    ],
  },

  'queens-indian': {
    middlegamePlans: [
      {
        id: 'mp-queens-indian-long-diagonal',
        title: 'Long diagonal pressure with …Bb7 + …c5',
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 d5 cxd5 exd5',
        overview: "The Queen's Indian's defining plan: fianchetto the queen's bishop to b7 controlling the long h1-a8 diagonal. After …c5 break and …Bxg2 trade (sometimes), Black gets active piece play in symmetric setups. The plan is to challenge White's center with …d5 and use the bishop pair for slow positional grinding.",
        pawnBreaks: [
          {
            move: 'd5',
            explanation: "Black's main central challenge. After …d5 cxd5 exd5 Black has a symmetric structure with the bishop pair as advantage. The e-file is half-open for the rook.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bc8-b7 long-diagonal control',
            explanation: "The bishop on b7 controls the long diagonal and pressures the e4 square. Combined with …Re8 doubling on the e-file, this creates lasting pressure on White's center.",
          },
          {
            piece: 'Queen',
            route: 'Qd8-c7 (Reti style)',
            explanation: "The queen on c7 supports …c5 break and prepares queenside expansion with …Rfc8.",
          },
        ],
        typicalMistakes: [
          "Trading the b7-bishop without compensation — kills the entire Queen's Indian concept.",
          "Allowing White's d4-d5 push without contesting — locks the center against Black's pieces.",
        ],
      },
      {
        id: 'mp-queens-indian-petrosian-system',
        title: 'Petrosian System: …Bb4+ + …c5 + …b6',
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3 b6 a3 Bb7 Nc3 d5 cxd5 Nxd5 Qc2 Nxc3 bxc3 Be7 e4',
        overview: "Petrosian's specialty against the Queen's Indian. After 4.a3, White prepares Nc3 without the threat of …Bb4+ pin. Black's plan: use the bishop pair (after the …Nxc3 bxc3 trade) for slow positional pressure. The e6-pawn becomes weak but the bishop pair compensates.",
        pawnBreaks: [
          {
            move: 'c5',
            explanation: "Black's central counter-break. After …c5 dxc5 bxc5 Black opens the b-file for the rook and gains piece activity.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop pair',
            route: 'Maintaining both bishops for endgame',
            explanation: "Black's two bishops are the main long-term asset. The plan is to reach an endgame where the bishop pair dominates against a knight + bishop.",
          },
        ],
        typicalMistakes: [
          "Forgetting the …c5 break — Black's queenside files stay closed if you don't break.",
          "Trading the dark-squared bishop on e7 for a knight — gives up the bishop pair advantage.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3',
        wrongMove: 'd5',
        correctMove: 'b6',
        explanation: "3…d5 transposes to QGD — fine opening but not the Queen's Indian. The defining move is 3…b6 preparing the bishop fianchetto. Choose your repertoire.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3 b6',
        wrongMove: 'Nc3',
        correctMove: 'g3',
        explanation: "4.Nc3 invites 4…Bb4+ pin which forces White to either play 5.Bd2 (slow) or 5.Nbd2 (uncomfortable). The mainline 4.g3 prepares Bg2 mirroring Black's fianchetto.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2',
        wrongMove: 'd5',
        correctMove: 'Be7',
        explanation: "5…d5 cedes the e4 square permanently — after 6.cxd5 exd5 Black has a passive Carlsbad structure. The principled 5…Be7 develops the bishop and prepares castling.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3',
        correctMove: 'b6',
        hint: 'The defining Queens Indian move. Which pawn push prepares the queens bishop fianchetto?',
        concept: 'Queens Indian setup',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3 b6 g3',
        correctMove: 'Bb7',
        hint: 'White has prepared the kingside fianchetto. Which natural development move occupies Blacks long diagonal?',
        concept: 'Bishop fianchetto development',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3',
        correctMove: 'd5',
        hint: 'White has developed Nc3 threatening to attack d5. Which central pawn push challenges Whites structure?',
        concept: 'Central d5 challenge',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e6 Nf3 b6',
        correctMove: 'g3',
        hint: 'The mainline development. Which White move prepares Bg2 to mirror Blacks fianchetto?',
        concept: 'Mirror fianchetto setup',
      },
    ],
  },

  'budapest-gambit': {
    middlegamePlans: [
      {
        id: 'mp-budapest-active-piece-play',
        title: 'Active piece play with …Bb4+ + …Nxe5',
        pgnToReachPosition: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Bc5 e3 Nc6 Be2 Ngxe5 Nxe5 Nxe5 O-O O-O',
        overview: "The Budapest Gambit's main idea. Black sacrifices the e-pawn for rapid piece development. After dxe5 Ng4 and the eventual …Nxe5 recapture, Black has active piece play around White's king. The plan: pressure the f2 square with the Bc5 + Ne5 battery and prepare …Qf6 or …Qh4 for kingside attack.",
        pawnBreaks: [
          {
            move: 'd6',
            explanation: "Once Black has consolidated, …d6 prepares …f5 or …c5 to challenge White's center and open lines for the rook.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bf8-b4-c5',
            explanation: "The bishop's diagonal pressure on f2 is the Budapest's main weapon. Combined with …Nc6-e5 attack, this creates lasting tactical chances.",
          },
        ],
        typicalMistakes: [
          "Trading the Bc5 too early — the bishop's pressure on f2 IS the gambit's compensation.",
          "Failing to play …d6 — Black's queenside stays cramped and the bishop on c5 has nowhere good to go.",
        ],
      },
      {
        id: 'mp-budapest-fajarowicz-knight-attack',
        title: 'Fajarowicz: …Ne4 attacking f2',
        pgnToReachPosition: 'd4 Nf6 c4 e5 dxe5 Ne4 Nf3 d6 exd6 Bxd6 Nbd2 Bf5 Nxe4 Bxe4 e3 O-O',
        overview: "The Fajarowicz Variation (3…Ne4) is even more provocative than the mainline Budapest. The knight on e4 attacks f2 directly and prepares …d6 for piece development. Black accepts a permanent material deficit for active piece play and pressure on White's king.",
        pawnBreaks: [
          {
            move: 'f5',
            explanation: "Once the knight on e4 is defended, …f5 supports the central piece and creates kingside attacking chances. The combination of …f5 + …Bf5 + …Qh4 creates direct threats against White's king.",
          },
        ],
        pieceManeuvers: [
          {
            piece: 'Bishop',
            route: 'Bc8-f5 active development',
            explanation: "The c8-bishop develops to f5 attacking the e4-pawn (or the e4-knight after captures). This combines with the Bd6 to create a kingside attacking battery.",
          },
        ],
        typicalMistakes: [
          "Allowing White to trade pieces — the Fajarowicz needs all pieces on the board to compensate for the missing pawn.",
          "Pushing …f5 before piece coordination — White's exf5 with central pressure is overwhelming.",
        ],
      },
    ],
    commonMistakes: [
      {
        pgnToReachPosition: 'd4 Nf6 c4',
        wrongMove: 'e6',
        correctMove: 'e5',
        explanation: "2…e6 transposes to QGD — fine opening but not the Budapest. The defining gambit move is 2…e5 sacrificing the e-pawn for active piece play.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e5 dxe5',
        wrongMove: 'Ne4',
        correctMove: 'Ng4',
        explanation: "3…Ne4 (Fajarowicz) is sharp but theoretically dubious — after 4.Nf3 Nc6 5.Nbd2 the knight is forced back. The mainline 3…Ng4 immediately threatens …Nxe5 and creates more practical chances.",
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3',
        wrongMove: 'Ngxe5',
        correctMove: 'Bc5',
        explanation: "4…Ngxe5? trades the central knight too early — after 5.Nxe5 White's pieces dominate. The principled 4…Bc5 develops the bishop with pressure on f2, then recaptures …Nxe5 at the right moment.",
      },
    ],
    quizItems: [
      {
        pgnToReachPosition: 'd4 Nf6 c4',
        correctMove: 'e5',
        hint: 'The defining Budapest Gambit move. Which pawn push sacrifices a pawn for active piece development?',
        concept: 'The Budapest sacrifice',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e5 dxe5',
        correctMove: 'Ng4',
        hint: 'White has captured. Which knight move recovers the pawn and develops with tempo?',
        concept: 'Knight to g4 recovery',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e5 dxe5 Ng4 Nf3',
        correctMove: 'Bc5',
        hint: 'Black wants to attack f2. Which bishop development creates a battery against Whites weak square?',
        concept: 'Targeting f2',
      },
      {
        pgnToReachPosition: 'd4 Nf6 c4 e5',
        correctMove: 'dxe5',
        hint: 'White must respond to the gambit. Which capture accepts the pawn (the principled mainline)?',
        concept: 'Accepting the gambit',
      },
    ],
  },
};

// ─── Build the staging JSON ───────────────────────────────────────
const out = {
  generatedAt: new Date().toISOString(),
  middlegamePlans: [],
  commonMistakes: [],
  quizItems: [],
};

const errors = [];

for (const [openingId, content] of Object.entries(CONTENT)) {
  for (const plan of content.middlegamePlans ?? []) {
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
      errors.push({ openingId, type: 'middlegame-plan', id: plan.id, error: e.message });
    }
  }
  for (const m of content.commonMistakes ?? []) {
    try {
      const fen = fenFromPgn(m.pgnToReachPosition);
      const wm = validateMove(fen, m.wrongMove);
      const cm = validateMove(fen, m.correctMove);
      out.commonMistakes.push({
        openingId,
        fen,
        wrongMove: m.wrongMove,
        correctMove: m.correctMove,
        explanation: m.explanation,
      });
    } catch (e) {
      errors.push({ openingId, type: 'common-mistake', pgn: m.pgnToReachPosition, error: e.message });
    }
  }
  for (const q of content.quizItems ?? []) {
    try {
      const fen = fenFromPgn(q.pgnToReachPosition);
      const cm = validateMove(fen, q.correctMove);
      out.quizItems.push({
        openingId,
        fen,
        correctMove: q.correctMove,
        hint: q.hint,
        concept: q.concept,
      });
    } catch (e) {
      errors.push({ openingId, type: 'quiz-item', pgn: q.pgnToReachPosition, error: e.message });
    }
  }
}

const outPath = `${STAGING_DIR}/content-batch-1.json`;
writeFileSync(outPath, JSON.stringify(out, null, 2));

console.log(`Wrote ${outPath}`);
console.log(`  middlegamePlans: ${out.middlegamePlans.length}`);
console.log(`  commonMistakes:  ${out.commonMistakes.length}`);
console.log(`  quizItems:       ${out.quizItems.length}`);
if (errors.length > 0) {
  console.log(`\n⚠ ${errors.length} drafting errors caught at staging:`);
  for (const e of errors) console.log(`  [${e.openingId}/${e.type}] ${e.error}`);
  process.exit(1);
}
console.log('\nNo errors at staging. Now run:');
console.log(`  node scripts/validate-content-batch.mjs ${outPath}`);
