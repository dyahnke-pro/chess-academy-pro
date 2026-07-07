import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Sicilian Rossolimo — per-variation master classes. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match the anti-openings.json
// variation names. Each spine is the masters-DB main line for Black's reply to
// 3.Bb5, walked to a middlegame (DB-grounded by construction, chess.js-legal).
// Arrows: non-pawn pieces, clear sight-line (lessonIntegrity). Highlights mark
// squares the narration names.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });

interface BeatInit {
  id: string; moves: string; say: string; sayShort?: string;
  arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[];
}
function b(init: BeatInit): LessonBeat {
  const { moves, ...rest } = init;
  return { ...rest, moves: moves.trim().split(/\s+/) };
}
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Rossolimo_Variation'];

const OID = 'anti-sicilian-rossolimo';

/** vs 3...e6 — DON'T trade on c6; retreat the bishop to f1, build the d4+c4
 *  centre, and press a lasting space edge (a Maróczy-flavoured squeeze). */
const E6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Rossolimo vs 3...e6 — the f1 retreat + space squeeze', minutes: 6,
  beats: [
    b({ id: 're6-1', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7',
      say: "When Black answers Bb5 with e6, the doubling trick is gone — after Bxc6 Black just recaptures with a knight from e7 and keeps a clean structure. So DON'T rush the trade. Black develops Nge7, flexible; you castle and keep your options open.",
      sayShort: "…e6 — no rush to trade on c6.",
      highlights: [H('e6', KEY), H('c6', SOFT)] }),
    b({ id: 're6-2', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1',
      say: "Re1 backs the e-pawn; then, when a6 puts the question, the bishop simply steps home to f1. This is the whole point against e6 — you KEEP the bishop pair instead of giving it up, and from f1 it will help support a big pawn centre. No structural concession made.",
      sayShort: "Bf1 — keep the bishop, no concession.",
      arrows: [A('f1', 'a6', SOFT)], highlights: [H('f1', KEY)] }),
    b({ id: 're6-3', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4',
      say: "Black strikes the centre with d5; you trade and then hit back with d4. The centre opens on your terms — your pieces are the more harmoniously placed, and the d4-break stakes out the space you were angling for all along.",
      sayShort: "d4 — open the centre on your terms.",
      highlights: [H('d4', ATK), H('d5', SOFT)] }),
    b({ id: 're6-4', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 Nf6 Be3 Be7 c4',
      say: "The knight retreats to f6, you develop the bishop to e3, and then c4 — the space-grabbing move. The pawns on c4 and d4 clamp down on d5 and e5, a Maróczy-style bind: Black is solid but passive, with no easy break and no counterplay. You have the whole board to work with.",
      sayShort: "c4 — the Maróczy clamp.",
      highlights: [H('c4', KEY), H('d4', KEY), H('d5', SOFT), H('e5', SOFT)] }),
    b({ id: 're6-5', moves: 'e4 c5 Nf3 Nc6 Bb5 e6 O-O Nge7 Re1 a6 Bf1 d5 exd5 Nxd5 d4 Nf6 Be3 Be7 c4 O-O Nc3 cxd4 Nxd4',
      say: "Black castles and tries cxd4 to unbind; you recapture with the knight, and it lands beautifully on d4 in the centre. Bishop pair, more space, a knight on the best square on the board, and a rock-solid position — the Rossolimo squeeze against e6 is exactly what you signed up for.",
      sayShort: "Nxd4 — centralized, bishop pair, more space.",
      arrows: [A('d4', 'e6')], highlights: [H('d4', KEY), H('c4', SOFT)] }),
  ],
};

export const ANTI_SICILIAN_ROSSOLIMO_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Nyezhmetdinov-Rossolimo Attack (e6)`]: E6_LESSON,
};
