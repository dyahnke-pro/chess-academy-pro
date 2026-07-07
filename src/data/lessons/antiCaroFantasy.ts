import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Caro: the Fantasy Variation (3.f3) — main-line master class. The student
// plays WHITE. An honest SURPRISE weapon: objectively it fights for a small edge
// / equality, not a Rossolimo-style clean plus, so the narration says so — the
// value is dragging Black off Caro theory into a big-centre middlegame where
// club players stumble. The spine is both-sides-sound (build-sound-spine.mjs:
// masters-DB most-played where strong, Stockfish where thin), walked to a real
// middlegame and engine-verified (+0.26 for White). chess.js-legal. Arrows:
// non-pawn pieces, clear sight-line. Highlights mark named squares.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Caro%E2%80%93Kann_Defence,_Fantasy_Variation'];

/** Main line vs 3...dxe4: recapture with the f-pawn to build the broad d4+e4
 *  centre, develop naturally, and set up the Bd3+Qc2 battery at h7 — a small,
 *  riskless pull in a position Black rarely knows. */
export const ANTI_CARO_FANTASY_LESSON: LessonScript = {
  openingId: 'anti-caro-fantasy',
  sources: SRC,
  title: 'The Fantasy Variation — 3.f3 vs the Caro',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'fan1', moves: 'e4 c6 d4 d5 f3',
      say: "Against the Caro-Kann, 3.f3 is the Fantasy — a surprise weapon. Be honest about it: this isn't a refutation, it's roughly equal with best play. Its point is to prop up e4 and build a broad pawn centre, dragging the well-prepared Caro player off their theory and into a middlegame of pure understanding where they, not you, are the one guessing.",
      sayShort: "f3 — the Fantasy, build the big centre.",
      highlights: [H('f3', KEY), H('e4', SOFT), H('d4', SOFT)] }),
    b({ id: 'fan2', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
      say: "The critical test: Black takes on e4, and you recapture with the f-pawn — fxe4. Now you have the pawns you wanted, a broad centre on d4 and e4, with the f-file half-open for your rook. Black hits back immediately with e5 to challenge d4; this is the main tabiya and the fight is on for the centre.",
      sayShort: "fxe4 — broad centre, half-open f-file.",
      highlights: [H('e4', KEY), H('d4', KEY), H('e5', ATK)] }),
    b({ id: 'fan3', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7',
      say: "Nf3 defends d4 and develops; Black pins with Bg4. You underpin the centre with c3 — the d4-pawn is now rock-solid, backed by c3 and defended by the knight — while Black brings the knight to d7 to add pressure to e5. Calm, natural development; no need for anything fancy.",
      sayShort: "Nf3, c3 — bolt down the d4-pawn.",
      highlights: [H('d4', KEY), H('c3', SOFT), H('f3', SOFT)] }),
    b({ id: 'fan4', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7 Bd3 Ngf6 O-O Bd6',
      say: "Bd3 is the key developing move — the bishop takes up its best diagonal behind the e4-pawn, primed to rake toward Black's king the moment the centre opens. You castle to safety; Black develops the knight to f6 and the bishop to d6, both sides finishing quietly. Your pieces are aimed at the kingside, and that is where your chances lie.",
      sayShort: "Bd3 — best diagonal, then castle.",
      highlights: [H('d3', KEY), H('e4', SOFT)] }),
    b({ id: 'fan5', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7 Bd3 Ngf6 O-O Bd6 a4 O-O Nbd2 Re8 Qc2 Bc7',
      say: "a4 grabs queenside space and takes b5 away from Black; the knight reroutes via d2 toward f1 and g3, heading for the kingside. Qc2 lines the queen up behind the bishop — the pair loaded on the b1-h7 diagonal, ready to fire at h7 the instant the e4-pawn advances or trades. You have reached the Fantasy's promise: the broad centre, a safe king, pieces aimed at Black's castle, and a small, riskless pull in a position Black has almost certainly never studied.",
      sayShort: "Qc2 — load the diagonal, small pull.",
      highlights: [H('c2', KEY), H('d3', SOFT), H('a4', SOFT)] }),
  ],
};
