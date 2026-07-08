import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Budapest (4.Bf4) — per-variation master class. The student plays WHITE.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. The sharp
// 4...g5 try, met by Bg3 (safe) and a quick h4 undermining the loose g-pawn;
// Black regains the sacrificed pawn but is left with a permanently shattered
// kingside. Spine rebuilt with build-sound-spine.mjs (no both-sides blunder),
// engine-verified +0.99 — a clear White advantage. Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Budapest_Gambit'];
const OID = 'anti-budapest';

/** vs 4...g5 — Bg3 (safe), h4 undermines g5; Black regains the pawn but his
 *  kingside is wrecked. Engine-verified +0.99. */
const G5_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Budapest vs 4...g5 — punish the pawn-grab', minutes: 6,
  beats: [
    b({ id: 'bud-g5-1', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 g5 Bg3 Bg7',
      say: "This is the sharpest Budapest try: g5, lunging at your bishop to win it or drive it off. You calmly retreat Bg3, where the bishop is perfectly safe — and Black has merely shredded his own kingside pawns for nothing. Black fianchettoes with Bg7, but that g5-pawn is a permanent weakness and you are still a pawn to the good.",
      sayShort: "…g5 met by Bg3 — safe, Black's weakened.",
      highlights: [H('g3', KEY), H('g5', ATK), H('e5', SOFT)] }),
    b({ id: 'bud-g5-2', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 g5 Bg3 Bg7 Nf3 Nc6 h4',
      say: "Nf3 develops, and after Nc6 you strike at the root of the weakness with h4 — attacking the g5-pawn head-on. The whole g5 adventure is backfiring: Black's kingside is coming apart at the seams and his king has nowhere safe to shelter.",
      sayShort: "h4 — hit the g5-pawn at its root.",
      highlights: [H('h4', KEY), H('g5', ATK)] }),
    b({ id: 'bud-g5-3', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 g5 Bg3 Bg7 Nf3 Nc6 h4 Ngxe5 Nxe5 Nxe5 Nc3',
      say: "Black regains the pawn — Ngxe5 — and after the trades a knight lands on e5. Material is level again, but look at the wreckage: Black's kingside pawns are loose, his king is exposed, and you develop Nc3 with a raking initiative. The pawn came back; the weaknesses are forever.",
      sayShort: "Nc3 — pawn's back, but Black's a mess.",
      highlights: [H('e5', SOFT), H('g5', ATK)] }),
    b({ id: 'bud-g5-4', moves: 'd4 Nf6 c4 e5 dxe5 Ng4 Bf4 g5 Bg3 Bg7 Nf3 Nc6 h4 Ngxe5 Nxe5 Nxe5 Nc3 h6 Qc2 d6 e3 Be6',
      say: "Black bolsters the kingside with h6 and completes development; you consolidate with Qc2 and e3. The dust settles on a clear advantage — nearly a full pawn's worth — because Black's shattered g5- and h6-pawns will be targets for the entire game. The g5 gamble simply left him worse. Nurse the structure and press.",
      sayShort: "Qc2, e3 — clear plus, target the pawns.",
      highlights: [H('g5', ATK), H('h6', ATK), H('c2', KEY)] }),
  ],
};

export const ANTI_BUDAPEST_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Budapest Defense, Rubinstein Variation (g5)`]: G5_LESSON,
};
