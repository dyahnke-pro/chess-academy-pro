import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Benoni (d5 push) — per-variation master classes. The student plays WHITE.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. The Modern
// Benoni …e6 (+0.89, big-centre squeeze) and the Czech Benoni …e5 (+1.54, total
// space bind). Spines rebuilt with build-sound-spine.mjs (no both-sides blunder),
// material even throughout. The "Fully Accepted" tab (Benko move-order) transposes
// to the main lesson and is left as-is. Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Benoni_Defense'];
const OID = 'anti-benoni-push';

/** vs 3...e6 (Modern Benoni) — big e4-f4 centre, Bb5+ + a4, squeeze the b5-break
 *  out of the position. Engine-verified +0.89. */
const MODERN_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Benoni vs 3...e6 (Modern) — the big-centre squeeze', minutes: 6,
  beats: [
    b({ id: 'ben-e6-1', moves: 'd4 Nf6 c4 c5 d5 e6',
      say: "The Modern Benoni: Black meets your d5 wedge with e6, challenging the pawn chain at its head. This is the sharpest, most double-edged Benoni — but also the most committal for Black. You will build a broad, imposing centre and turn your extra space into a lasting initiative.",
      sayShort: "…e6 — the sharp Modern Benoni.",
      highlights: [H('d5', KEY), H('e6', SOFT)] }),
    b({ id: 'ben-e6-2', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6',
      say: "The pawns clarify into the classic Benoni structure — your d5 and e4 versus Black's c5 and d6. You own a big spatial plus in the centre and on the kingside; Black gets the half-open e-file and a later b5-break for counterplay. But you get to strike first, and f4 is coming.",
      sayShort: "d5/e4 — the classic Benoni bind.",
      highlights: [H('d5', KEY), H('e4', KEY), H('c5', SOFT)] }),
    b({ id: 'ben-e6-3', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7',
      say: "You throw in f4, building an imposing e4-f4 pawn duo aimed at Black's king, and the check Bb5+ provokes …Nfd7, tucking a knight passively away from the action. Your space advantage is quietly becoming a genuine kingside initiative while Black is still untangling.",
      sayShort: "f4, Bb5+ — build the kingside duo.",
      highlights: [H('f4', KEY), H('e4', SOFT), H('b5', SOFT)] }),
    b({ id: 'ben-e6-4', moves: 'd4 Nf6 c4 c5 d5 e6 Nc3 exd5 cxd5 d6 e4 g6 f4 Bg7 Bb5+ Nfd7 a4 O-O Nf3 Na6 O-O Nb4',
      say: "a4 clamps down on Black's thematic b5-break, and you calmly complete development and castle. Black's knight hops to b4 seeking activity, but it bites on granite — your centre and space dominate. The engine confirms a clear White edge: the Benoni's counterplay is bottled up and your kingside pawns are ready to roll.",
      sayShort: "a4 — bottle up …b5, clear edge.",
      highlights: [H('a4', KEY), H('d5', SOFT), H('e4', SOFT)] }),
  ],
};

/** vs 3...e5 (Czech Benoni) — Black locks the centre; total space bind, Bh6 on
 *  the weakened dark squares. Engine-verified +1.54. */
const CZECH_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Benoni vs 3...e5 (Czech) — the total space bind', minutes: 6,
  beats: [
    b({ id: 'ben-cz-1', moves: 'd4 Nf6 c4 c5 d5 e5',
      say: "The Czech Benoni: Black locks the centre completely with e5, building a closed, fortress-like structure. It's solid but deeply passive — Black cedes you a permanent space advantage, the d5-square, and the c4-d5 pawn duo. Your job is simple: expand and probe on both wings while Black sits cramped with no counterplay.",
      sayShort: "…e5 — Black locks it, cedes all the space.",
      highlights: [H('e5', SOFT), H('d5', KEY)] }),
    b({ id: 'ben-cz-2', moves: 'd4 Nf6 c4 c5 d5 e5 Nc3 d6 e4 Be7 Nf3 Na6',
      say: "The structure sets: your pawns on c4-d5-e4 grip the whole centre while Black shuffles pieces behind his wall — Be7, and the knight to a6 heading for c7. You have all the space and every plan: a kingside storm with f4 or g4, or queenside expansion with b4. Black can only wait and watch.",
      sayShort: "c4-d5-e4 — the full central grip.",
      highlights: [H('c4', KEY), H('d5', KEY), H('e4', KEY)] }),
    b({ id: 'ben-cz-3', moves: 'd4 Nf6 c4 c5 d5 e5 Nc3 d6 e4 Be7 Nf3 Na6 h3 O-O Bd3 Nc7 Bd2 Kh8',
      say: "You develop harmoniously — Bd3 eyeing the kingside, Bd2 preparing to swing to h6 — while Black tucks the king to h8 and reroutes the knight to c7. Every piece you own has a purpose; Black's are passive defenders shuffling behind the wall. The bind is total.",
      sayShort: "Bd3, Bd2 — every piece with a purpose.",
      highlights: [H('d3', KEY), H('d2', SOFT)] }),
    b({ id: 'ben-cz-4', moves: 'd4 Nf6 c4 c5 d5 e5 Nc3 d6 e4 Be7 Nf3 Na6 h3 O-O Bd3 Nc7 Bd2 Kh8 Qe2 g6 Bh6 Re8',
      say: "Black weakens with g6 and you pounce — Bh6, planting the bishop on the newly-weakened dark squares right beside his king. You are clearly better by a wide margin: a huge space bind, pieces raking Black's cramped position, and a kingside attack brewing. The Czech Benoni's passivity is fully punished.",
      sayShort: "Bh6 — hit the weak dark squares, winning bind.",
      highlights: [H('h6', KEY), H('d5', SOFT), H('e4', SOFT)] }),
  ],
};

export const ANTI_BENONI_PUSH_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Pawn Storm Variation`]: MODERN_LESSON,
  [`${OID}::Czech Benoni Defense`]: CZECH_LESSON,
};
