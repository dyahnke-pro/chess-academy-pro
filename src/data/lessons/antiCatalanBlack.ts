import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Catalan (Black): the Open Catalan (d4 Nf6 c4 e6 g3 d5 Bg2 dxc4) — main-
// line master class. The student plays BLACK. Grab the c4-pawn, hold it a moment
// with ...a6, develop smoothly, and give it back for a comfortable, equal game
// against the Catalan bishop. Spine both-sides-sound (build-sound-spine.mjs),
// engine-verified (-0.19 = equal for Black).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Catalan_Opening'];

export const ANTI_CATALAN_BLACK_LESSON: LessonScript = {
  openingId: 'anti-catalan-black',
  sources: SRC,
  title: 'Meeting the Catalan — the Open with ...dxc4',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'cat1', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4',
      say: "The Catalan fianchettoes to squeeze you on the long light diagonal. The clean, healthy answer is the Open: take on c4. Grabbing the pawn isn't greed — it's the point. It clears the tension on d5 and, held for just a moment, gains you the time to develop your pieces to good squares.",
      sayShort: "…dxc4 — take the pawn, gain time.",
      highlights: [H('c4', ATK), H('d5', SOFT)] }),
    b({ id: 'cat2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6',
      say: "…a6 is the key move — it prepares …b5 to defend the extra pawn, so White must spend time regaining it rather than pressing you. You bring out the knight to c6, hitting d4, and finish developing while White fusses over the c4-pawn. You are the one being handed free development now.",
      sayShort: "…a6, …Nc6 — hold c4, develop free.",
      highlights: [H('a6', KEY), H('c4', SOFT)] }),
    b({ id: 'cat3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 Bd6',
      say: "You develop harmoniously — Bd7 preparing to connect, Bd6 eyeing the kingside. White plays e3 and Qe2 to round up the c4-pawn; that is fine. You have used the time it cost White to place every piece on a natural, active square. There is nothing for the Catalan bishop to bite on.",
      sayShort: "…Bd7, …Bd6 — natural, active pieces.",
      highlights: [H('d6', KEY)] }),
    b({ id: 'cat4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 Bd6 Qxc4 O-O Rd1 Qe7 Nc3 h6',
      say: "White finally recovers the pawn with Qxc4; you calmly castle, centralise the queen to e7, and take luft with h6. The result is complete equality: every piece developed, no weaknesses, the light-squared bishop that plagues so many Catalan defenders traded off or comfortably placed. You have neutralised the Catalan the sound, classical way.",
      sayShort: "…O-O — fully equal, no weaknesses.",
      highlights: [H('e7', SOFT)] }),
  ],
};
