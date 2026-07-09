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
      say: "Let me be straight with you about the Fantasy — 3.f3. It's a surprise weapon, not a refutation; with best play it's roughly equal. But that's not the point. The point is you prop up e4, build a broad pawn centre, and drag your well-booked Caro opponent off their theory into a middlegame of pure understanding — where suddenly THEY'RE the one guessing, not you.",
      sayShort: "f3 — the Fantasy, build the big centre.",
      highlights: [H('f3', KEY), H('e4', SOFT), H('d4', SOFT)] }),
    b({ id: 'fan2', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5',
      say: "Here's the critical test: Black grabs on e4, and you recapture with the f-pawn, fxe4. Now you've got exactly the pawns you wanted — a broad centre on d4 and e4 — plus the f-file half-open for your rook. Black slams back with …e5 to challenge d4. This is the main tabiya, and now the fight for the centre is truly on.",
      sayShort: "fxe4 — broad centre, half-open f-file.",
      highlights: [H('e4', KEY), H('d4', KEY), H('e5', ATK)] }),
    b({ id: 'fan3', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7',
      say: "Nf3 defends d4 and develops in one; Black pins with …Bg4. You underpin the centre with c3 — and now d4 is rock-solid, braced by c3 and guarded by the knight — while Black brings …Nd7 to lean on e5. Just calm, natural development. Nothing fancy required, and nothing fancy wanted.",
      sayShort: "Nf3, c3 — bolt down the d4-pawn.",
      highlights: [H('d4', KEY), H('c3', SOFT), H('f3', SOFT)] }),
    b({ id: 'fan4', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7 Bd3 Ngf6 O-O Bd6',
      say: "Bd3 is the key developing move — the bishop takes its best diagonal behind the e4-pawn, primed to rake at Black's king the instant the centre cracks open. You castle; Black finishes with …Ngf6 and …Bd6, both sides tidying up. But notice where all your pieces are pointing. That's the kingside — and that's where your game lives.",
      sayShort: "Bd3 — best diagonal, then castle.",
      highlights: [H('d3', KEY), H('e4', SOFT)] }),
    b({ id: 'fan5', moves: 'e4 c6 d4 d5 f3 dxe4 fxe4 e5 Nf3 Bg4 c3 Nd7 Bd3 Ngf6 O-O Bd6 a4 O-O Nbd2 Re8 Qc2 Bc7',
      say: "a4 grabs queenside space and takes b5 away from Black; the knight reroutes via d2 toward f1 and g3, heading for the kingside party. Qc2 loads the queen behind the bishop — the pair stacked on the b1-h7 diagonal, aimed at h7, ready to fire the moment the e4-pawn advances or trades. And there's the Fantasy's whole promise delivered: broad centre, safe king, pieces trained on Black's castle, and a riskless little pull in a position your opponent has almost certainly never seen.",
      sayShort: "Qc2 — load the diagonal, small pull.",
      highlights: [H('c2', KEY), H('d3', SOFT), H('a4', SOFT)] }),
  ],
};
