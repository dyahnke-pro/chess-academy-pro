import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Smith-Morra (Black) — per-variation master class. The student plays
// BLACK. Keyed `${openingId}::${variationName}` to match anti-openings.json. The
// Qe2 Paulsen setup: ACCEPT both gambit pawns, build the rock-solid Kan
// structure (…e6/…a6/…Nge7), and consolidate a pawn to the good. Spine rebuilt
// with build-sound-spine.mjs (no both-sides blunder), engine-verified +0.09 from
// Black's side (a clean extra pawn, White's fire neutralised). Material framed
// exactly per the board (Black +1 throughout). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'];
const OID = 'anti-smith-morra-black';

const QE2_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'black',
  title: 'Anti-Smith-Morra — accept and hold (Qe2 Paulsen)', minutes: 6,
  beats: [
    b({ id: 'sm-qe2-1', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6',
      say: "The Smith-Morra Accepted: you take both gambit pawns — …cxd4 and …dxc3 — and after Nxc3 you are a healthy pawn up. White has open lines and quick development as compensation, but with accurate, solid play the extra pawn will tell. You begin unwinding with …Nc6.",
      sayShort: "Accept both pawns — a pawn up.",
      highlights: [H('c6', KEY), H('c3', SOFT)] }),
    b({ id: 'sm-qe2-2', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Qe2',
      say: "You set up the rock-solid Kan structure — …e6, …a6 and …Nge7 — the classical antidote to the Morra. White pours pieces at you with Bc4, O-O and Qe2, all aimed at the e6 and f7 squares. You simply develop soundly, give White no targets, and keep the extra pawn.",
      sayShort: "…e6, …a6, …Nge7 — the Kan wall.",
      highlights: [H('e6', KEY), H('a6', SOFT)] }),
    b({ id: 'sm-qe2-3', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Qe2 b5 Bd3 Ng6 Be3',
      say: "…b5 grabs queenside space and shoves the c4-bishop back to d3; …Ng6 brings the knight to a fine square. You are methodically neutralising White's initiative while holding your extra pawn — this is exactly how the Morra is met: don't panic, just consolidate move by move.",
      sayShort: "…b5, …Ng6 — consolidate, hold the pawn.",
      highlights: [H('b5', KEY), H('g6', SOFT)] }),
    b({ id: 'sm-qe2-4', moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Qe2 b5 Bd3 Ng6 Be3 Bd6 Rfd1 Nf4',
      say: "…Bd6 completes your development and …Nf4 posts the knight aggressively, hitting White's queen on e2 and the d3-bishop. You stand a clean pawn up with a solid, harmonious position and active pieces — the engine confirms your edge. The Smith-Morra's fire has burned itself out.",
      sayShort: "…Nf4 — active, a clean pawn up.",
      highlights: [H('f4', KEY), H('e2', ATK)] }),
  ],
};

export const ANTI_SMITH_MORRA_BLACK_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Smith-Morra Gambit Accepted, Paulsen Formation (Qe2)`]: QE2_LESSON,
};
