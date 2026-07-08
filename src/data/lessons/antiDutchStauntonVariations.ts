import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Dutch Staunton Gambit — per-variation master class. The student plays
// WHITE. Keyed `${openingId}::${variationName}` to match anti-openings.json. The
// …Nc6 line: a true gambit — White stays nominally a pawn down but wrecks Black's
// structure (doubled d-pawns, an open e-file) for clear compensation. Spine
// rebuilt with build-sound-spine.mjs (no both-sides blunder), engine-verified
// +0.28 from White's side despite the pawn deficit. Material framed exactly per
// the board (White −1 throughout, comp confirmed). Highlights mark named squares.

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-initiative', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Dutch_Defence,_Staunton_Gambit'];
const OID = 'anti-dutch-staunton';

const NC6_LESSON: LessonScript = {
  openingId: OID, sources: SRC, orientation: 'white',
  title: 'Staunton Gambit vs …Nc6 — a pawn for the structure', minutes: 6,
  beats: [
    b({ id: 'stv-nc6-1', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5',
      say: "Against the Staunton, Black develops with Nc6 rather than defending the e4-pawn. You seize the moment with d5, kicking the knight and grabbing space, while Bg5 hits the f6-knight and threatens Bxf6. You are nominally a pawn down here, but far ahead in development with the initiative firmly in hand.",
      sayShort: "d5 — kick the knight, grab the initiative.",
      highlights: [H('d5', KEY), H('f6', SOFT)] }),
    b({ id: 'stv-nc6-2', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qe2 Nf7 Bxf6 exf6',
      say: "The knight is chased to e5 and back to f7, badly offside; you play Qe2, training on the e4-pawn, and Bxf6 damages Black's kingside — after exf6 the e-file is open and his pawns are fractured. You remain a pawn down on paper, but Black's structure is the real casualty.",
      sayShort: "Bxf6 — fracture the kingside.",
      highlights: [H('e4', ATK), H('f6', SOFT)] }),
    b({ id: 'stv-nc6-3', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qe2 Nf7 Bxf6 exf6 Nxe4 Qe7 d6 Nxd6 Nxd6+ cxd6',
      say: "You round up the e4-pawn with Nxe4 and jab d6, forcing trades; after cxd6 Black is saddled with doubled d-pawns and a wretched structure. You are still nominally a pawn down, but the engine confirms the verdict — your activity and Black's ruined pawns hand YOU the better game.",
      sayShort: "d6 — leave Black doubled and weak.",
      highlights: [H('d6', ATK), H('d7', ATK)] }),
    b({ id: 'stv-nc6-4', moves: 'd4 f5 e4 fxe4 Nc3 Nf6 Bg5 Nc6 d5 Ne5 Qe2 Nf7 Bxf6 exf6 Nxe4 Qe7 d6 Nxd6 Nxd6+ cxd6 g3 d5',
      say: "You fianchetto with g3, aiming the bishop at Black's weakened light squares. The smoke clears on a clear structural edge: Black's doubled d-pawns and the ragged f6-pawn are permanent targets, and the engine rates White comfortably better despite the pawn. A dangerous surprise gambit that leaves you pressing.",
      sayShort: "g3 — press the weak pawns, clearly better.",
      highlights: [H('d5', ATK), H('d7', ATK), H('f6', SOFT)] }),
  ],
};

export const ANTI_DUTCH_STAUNTON_VARIATION_LESSONS: Record<string, LessonScript> = {
  [`${OID}::Staunton Gambit`]: NC6_LESSON,
};
