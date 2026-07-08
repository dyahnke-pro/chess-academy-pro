import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Alapin (Black) — per-variation master class. The student plays BLACK.
// Keyed `${openingId}::${variationName}` to match anti-openings.json. Against the
// modest a3 sideline: undermine the d4-e5 centre with …dxe5, plant the d5-knight,
// fianchetto, and neutralise. Spine rebuilt with build-sound-spine.mjs (no both-
// sides blunder), material even, engine-verified +0.33 from Black's side (a touch
// better for Black). The Nf3 move-order tab is deferred (mid-capture terminus).
// Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'];
const OID = 'anti-alapin-black';

const A3_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-Alapin — undermine the centre (a3 line)', minutes: 6,
  beats: [
    b({ id: 'alap-a3-1', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 a3',
      say: "The Alapin: White plays c3 to build a big d4-e5 centre. Black's antidote is the classic …Nf6 and …Nd5, then quick pressure on the centre — …cxd4, …Nc6, …d6 — chipping at the e5-pawn. Here White plays the modest a3; you simply continue undermining e5 and head for a comfortable, equal game.",
      sayShort: "…d6 — chip at White's e5 centre.",
      highlights: [H('e5', ATK), H('d5', KEY)] }),
    b({ id: 'alap-a3-2', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 a3 dxe5 dxe5 Be6',
      say: "You strike with …dxe5, and after dxe5 the centre opens on your terms — you develop the bishop to e6, cementing your strong knight on d5. That knight is a monster in the heart of the board, and White's lone e5-pawn is now a target rather than a strength.",
      sayShort: "…Be6 — cement the d5 outpost.",
      highlights: [H('e6', SOFT), H('d5', KEY)] }),
    b({ id: 'alap-a3-3', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 a3 dxe5 dxe5 Be6 Bd2 g6 Bb5 Bg7',
      say: "You fianchetto with …g6 and …Bg7, the bishop bearing down the long diagonal at White's centre and queenside. White pins your knight with Bb5, but you are well-coordinated and solid — active pieces, a sound structure, and the d5-knight still dominating. Full equality is at hand.",
      sayShort: "…Bg7 — the long diagonal, fully solid.",
      highlights: [H('g7', KEY), H('d5', SOFT)] }),
    b({ id: 'alap-a3-4', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 a3 dxe5 dxe5 Be6 Bd2 g6 Bb5 Bg7 Bxc6+ bxc6',
      say: "White trades on c6 and you recapture with the b-pawn. Yes, it doubles your c-pawns — but in exchange you get the bishop pair and a half-open b-file, and your knight still dominates d5. The engine even rates the position slightly in YOUR favour: the Alapin has been comfortably neutralized with the more active pieces.",
      sayShort: "…bxc6 — bishop pair, open b-file, better.",
      highlights: [H('c6', SOFT), H('d5', KEY)] }),
  ],
};

export const ANTI_ALAPIN_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Alapin Variation, Smith-Morra Declined`]: A3_LESSON,
};
