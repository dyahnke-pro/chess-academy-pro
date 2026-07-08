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
      say: "The Catalan fianchettoes to squeeze you along the long light diagonal. The clean, healthy answer is the Open — take on c4. And grabbing that pawn isn't greed; it's the whole point. It releases the tension on d5 and, held for just a moment, buys you the time to get your pieces to exactly the squares they want.",
      sayShort: "…dxc4 — take the pawn, gain time.",
      highlights: [H('c4', ATK), H('d5', SOFT)] }),
    b({ id: 'cat2', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6',
      say: "…a6 is the key — it preps …b5 to hold the extra pawn, so White has to spend time winning it back instead of pressing you. You develop …Nc6, hitting d4, and finish mobilising while White fusses over c4. Notice the turnaround: now YOU'RE the one being handed free development.",
      sayShort: "…a6, …Nc6 — hold c4, develop free.",
      highlights: [H('a6', KEY), H('c4', SOFT)] }),
    b({ id: 'cat3', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 Bd6',
      say: "You develop in harmony — …Bd7 ready to connect, …Bd6 eyeing the kingside. White plays e3 and Qe2 to round up the pawn on c4; that's fine, let him. Every second it costs him, you've spent placing a piece on a natural, active square. And that famous Catalan bishop? It's got nothing to bite on.",
      sayShort: "…Bd7, …Bd6 — natural, active pieces.",
      highlights: [H('d6', KEY)] }),
    b({ id: 'cat4', moves: 'd4 Nf6 c4 e6 g3 d5 Bg2 dxc4 Nf3 a6 O-O Nc6 e3 Bd7 Qe2 Bd6 Qxc4 O-O Rd1 Qe7 Nc3 h6',
      say: "White finally recovers the pawn with Qxc4; you calmly castle, centralise …Qe7, and take luft with …h6. And there's the result: dead equality. Every piece developed, no weaknesses, and the light-squared bishop that torments so many Catalan defenders either traded or sitting pretty. You've neutralised the Catalan the sound, classical way.",
      sayShort: "…O-O — fully equal, no weaknesses.",
      highlights: [H('e7', SOFT)] }),
  ],
};
