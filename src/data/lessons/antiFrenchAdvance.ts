import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-French: the Advance Variation (3.e5) — main-line master class. The student
// plays WHITE. The Advance grabs space and buries Black's light-squared bishop
// behind the e6-pawn — the French's eternal problem child. White's job: defend
// the d4 base of the pawn chain, keep the good bishop, and press the space edge.
// Spine is both-sides-sound (build-sound-spine.mjs) to a middlegame, engine-
// verified (+0.18 White). chess.js-legal. Arrows: non-pawn pieces, clear
// sight-line. Highlights mark named squares.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/French_Defence,_Advance_Variation'];

/** Main line vs 3...c5: hold the d4 base with c3/Nf3/Be2, keep the light bishop
 *  with Bd3-c2, trade off Black's blockading knight on f5, and press the e5
 *  space wedge against Black's bad bishop and doubled f-pawns. */
export const ANTI_FRENCH_ADVANCE_LESSON: LessonScript = {
  openingId: 'anti-french-advance',
  sources: SRC,
  title: 'The Advance French — 3.e5 and the space squeeze',
  minutes: 7,
  orientation: 'white',
  beats: [
    b({ id: 'fadv1', moves: 'e4 e6 d4 d5 e5 c5',
      say: "Against the French you play the Advance — e5 — and it does two beautiful things at once. It grabs space, and it locks Black's light-squared bishop behind its own e6-pawn — the French bishop, the problem child of the whole opening, buried alive from move three. Black hits back at once with …c5, slamming into the base of your d4-e5 chain. Burn this in: the fight for d4 IS the game.",
      sayShort: "e5 — grab space, bury the bad bishop.",
      highlights: [H('e5', KEY), H('d4', KEY), H('c5', ATK)] }),
    b({ id: 'fadv2', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2',
      say: "So you reinforce the base of the chain, brick by brick: c3 props d4, Nf3 guards it, Be2 develops behind it. Black piles on — knight to c6, queen to b6 — but your setup holds d4 comfortably. And notice that modest bishop to e2: you're not chasing activity, you're keeping d4 rock-solid. In this structure, that restraint is the whole art.",
      sayShort: "c3, Nf3, Be2 — hold the d4 base.",
      highlights: [H('d4', KEY), H('c3', SOFT)] }),
    b({ id: 'fadv3', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4',
      say: "Black releases the tension with …cxd4; you recapture with the c-pawn and the c-file swings open. But here's what matters: your e5-wedge is still standing, still cramping Black, still burying that light bishop alive. You've got a clean centre, no weaknesses, and the freer game. Everything is going to plan.",
      sayShort: "cxd4 — c-file opens, e5 wedge stands.",
      highlights: [H('d4', KEY), H('e5', SOFT)] }),
    b({ id: 'fadv4', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nh6 Bd3 Bd7 Bc2',
      say: "Black reroutes the knight, …Nh6 heading for f5 to blockade and gnaw at d4. Meet it correctly: Bd3, then Bc2, tucking the bishop onto the b1-h7 diagonal where it's safe from a trade and staring at Black's king. And here's a rule to keep forever: in the French, never hand over your good bishop for a knight cheaply — it's the best minor piece on the board.",
      sayShort: "Bd3-c2 — save the good bishop.",
      arrows: [A('c2', 'h7', SOFT)], highlights: [H('c2', KEY), H('f5', ATK)] }),
    b({ id: 'fadv5', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nh6 Bd3 Bd7 Bc2 Nf5 Bxf5 exf5',
      say: "NOW you take — the moment the knight actually lands on f5, Bxf5. After …exf5, Black is stuck with doubled f-pawns on f5 and f7, and that light bishop is STILL hemmed in. See the discipline? You only parted with your prized bishop once it bought you a concrete, permanent structural prize. Never a move sooner.",
      sayShort: "Bxf5 — now trade, doubling the f-pawns.",
      highlights: [H('f5', KEY), H('f7', SOFT)] }),
    b({ id: 'fadv6', moves: 'e4 e6 d4 d5 e5 c5 c3 Nc6 Nf3 Qb6 Be2 cxd4 cxd4 Nh6 Bd3 Bd7 Bc2 Nf5 Bxf5 exf5 O-O Be6',
      say: "You castle to safety; Black finally frees the bishop with …Be6, but the damage is long done. And there's the dream you were playing for: the e5 space-wedge, a healthy centre against Black's crippled doubled f-pawns, and the simpler, freer position. A small, riskless pull — and you get to nurse it for the next forty moves.",
      sayShort: "O-O — e5 wedge, doubled pawns, safe pull.",
      highlights: [H('e5', KEY), H('f5', SOFT)] }),
  ],
};
