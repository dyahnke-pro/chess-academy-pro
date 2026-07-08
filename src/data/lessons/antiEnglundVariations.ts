import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Englund — per-variation master classes. The student plays WHITE. Keyed
// `${openingId}::${variationName}` to match anti-openings.json. The …d6 (Englund
// Gambit) and …Nge7 (Zilbermints) tries to regain the pawn — both simply leave
// White a clean pawn up. Spines rebuilt with build-sound-spine.mjs (no both-sides
// blunder), White +1 material throughout, engine-verified +1.39 / +1.25. The
// "Main Line" (…Nxe5) tab is deferred — its sound line runs through gxf3 doubled
// pawns + a Qxa7 grab that wants a careful pass. Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Englund_Gambit'];
const OID = 'anti-englund';

/** vs 3...d6 — undermining the e5-pawn; you exchange and stay a clean pawn up
 *  into a queenless middlegame. Engine-verified +1.39. */
const D6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Englund vs 3...d6 — keep the pawn, trade down', minutes: 6,
  beats: [
    b({ id: 'eng-d6-1', moves: 'd4 e5 dxe5 Nc6 Nf3 d6',
      say: "The Englund with d6: Black tries to win the e5-pawn back by undermining it. But the whole gambit is unsound — you are already a clean pawn up, and the plan is simple: hold your extra material and finish developing. Don't get fancy; just consolidate the point.",
      sayShort: "…d6 — you're a clean pawn up, stay simple.",
      highlights: [H('e5', KEY)] }),
    b({ id: 'eng-d6-2', moves: 'd4 e5 dxe5 Nc6 Nf3 d6 Bg5 Qd7 exd6 Bxd6',
      say: "You develop actively with Bg5, and at the right moment exchange on d6 — after Bxd6 you remain a clean pawn to the good with easy development. Black has a little piece activity for his missing pawn, but nowhere near enough. Keep it simple and keep the extra pawn.",
      sayShort: "exd6 — stay a pawn up, develop.",
      highlights: [H('g5', SOFT), H('d6', KEY)] }),
    b({ id: 'eng-d6-3', moves: 'd4 e5 dxe5 Nc6 Nf3 d6 Bg5 Qd7 exd6 Bxd6 Nc3 h6 Bh4 Nge7 Nb5 Nf5 Nxd6+ Nxd6',
      say: "You develop Nc3 and Bh4, then Nb5 hops in to trade off Black's active dark-squared bishop with Nxd6+. Every exchange carries you closer to a winning endgame: you're a pawn up, your structure is clean, and Black's compensation fades with each swap off the board.",
      sayShort: "Nb5 — trade pieces, near a winning ending.",
      highlights: [H('d6', SOFT)] }),
    b({ id: 'eng-d6-4', moves: 'd4 e5 dxe5 Nc6 Nf3 d6 Bg5 Qd7 exd6 Bxd6 Nc3 h6 Bh4 Nge7 Nb5 Nf5 Nxd6+ Nxd6 Bg3 Ne4 Qxd7+ Bxd7',
      say: "Bg3 keeps the bishop active, and after the queens come off with Qxd7+ Bxd7 you reach exactly what you want: a clean, queenless middlegame a healthy pawn up. Black's knight on e4 looks active but has no support; blunt it and convert the extra material. The Englund's d6 try simply loses a pawn for nothing.",
      sayShort: "Qxd7+ — queens off, a pawn up, convert.",
      highlights: [H('e4', ATK)] }),
  ],
};

/** vs 3...Nge7 (Zilbermints) — Bf4 holds e5, build the centre, stay a pawn up.
 *  Engine-verified +1.25. */
const NGE7_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Englund vs 3...Nge7 (Zilbermints) — Bf4 and hold', minutes: 6,
  beats: [
    b({ id: 'eng-n7-1', moves: 'd4 e5 dxe5 Nc6 Nf3 Nge7',
      say: "The Zilbermints: Black develops the knight to e7, planning Ng6 to chip at your e5-pawn. You calmly defend it with Bf4 — a pawn up and developing at the same time. As always against the Englund, the recipe never changes: hold the extra pawn and allow no cheap tricks.",
      sayShort: "…Nge7 met by Bf4 — hold the pawn.",
      highlights: [H('e5', KEY), H('f4', SOFT)] }),
    b({ id: 'eng-n7-2', moves: 'd4 e5 dxe5 Nc6 Nf3 Nge7 Bf4 h6 e4 Ng6 Bg3 Bb4+',
      say: "You build a broad e4-e5 centre, and when the knight comes to g6 you tuck the bishop back to g3, still guarding e5. Black tries the check Bb4+, but it's just a developing move you'll neutralize with c3. Your extra pawn and central space give you a comfortable, risk-free advantage.",
      sayShort: "e4, Bg3 — big centre, still hold e5.",
      highlights: [H('e4', KEY), H('e5', KEY), H('g3', SOFT)] }),
    b({ id: 'eng-n7-3', moves: 'd4 e5 dxe5 Nc6 Nf3 Nge7 Bf4 h6 e4 Ng6 Bg3 Bb4+ c3 Be7 Nbd2 O-O Bb5 d6',
      say: "c3 blunts the check, you develop the knight to d2, and Bb5 pins the c6-knight. Black castles into a passive position and plays d6 to challenge e5. You are a solid pawn up with a big centre and the more active pieces — the Englund gambiteer has nothing at all to show for the material.",
      sayShort: "Bb5 — pin, a solid pawn up.",
      highlights: [H('b5', KEY), H('e5', SOFT)] }),
    b({ id: 'eng-n7-4', moves: 'd4 e5 dxe5 Nc6 Nf3 Nge7 Bf4 h6 e4 Ng6 Bg3 Bb4+ c3 Be7 Nbd2 O-O Bb5 d6 exd6 Bxd6 O-O Bf4',
      say: "You exchange on d6 and castle, remaining a clean pawn up with a healthy position. Black's bishop lunges to f4 seeking activity, but you'll simply trade it or drive it back. The Zilbermints, like every Englund line, just donates a pawn — collect it, neutralise the tricks, and convert the endgame.",
      sayShort: "O-O — a clean pawn up, convert.",
      highlights: [H('e4', SOFT), H('f4', ATK)] }),
  ],
};

export const ANTI_ENGLUND_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Englund Gambit`]: D6_LESSON,
  [`${OID}::Zilbermints Gambit`]: NGE7_LESSON,
};
