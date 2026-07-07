import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Alapin (Black): e4 c5 c3 Nf6 — main-line master class. The student plays
// BLACK. Meet the Alapin's c3 (which prepares d4) by attacking e4 with ...Nf6;
// after e5 the knight hops to d5, you strike the centre with ...cxd4 and ...d6,
// and trade into a comfortable, equal game. Spine both-sides-sound
// (build-sound-spine.mjs), engine-verified (-0.09 = equal for Black).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Alapin_Variation'];

export const ANTI_ALAPIN_BLACK_LESSON: LessonScript = {
  openingId: 'anti-alapin-black',
  sources: SRC,
  title: 'Meeting the Alapin — ...Nf6 and ...d6',
  minutes: 6,
  orientation: 'black',
  beats: [
    b({ id: 'alb1', moves: 'e4 c5 c3 Nf6',
      say: "The Alapin plays c3 to build a big d4 centre without allowing an Open Sicilian. The most testing reply is Nf6, hitting the e4-pawn at once. This forces White to commit — either defend e4 or push it — before he has finished the setup he wants. You dictate the tempo from move two.",
      sayShort: "…Nf6 — hit e4, force the issue.",
      highlights: [H('e4', ATK)] }),
    b({ id: 'alb2', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4',
      say: "White pushes e5 and the knight jumps to d5, a fine central square. You strike back at the base with cxd4 and develop the knight to c6, hitting d4 again. White has his big centre, but you are chipping at it from both sides with active pieces — a healthy, dynamic balance.",
      sayShort: "…cxd4, …Nc6 — chip at the centre.",
      highlights: [H('d5', KEY), H('d4', ATK)] }),
    b({ id: 'alb3', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6',
      say: "…d6 is the key freeing move — it challenges the e5-pawn that cramps you and opens lines for your pieces. Once that spearhead is gone or traded, Black's position breathes freely and White's space edge evaporates. This is the move that equalises the whole line.",
      sayShort: "…d6 — challenge e5, free your game.",
      highlights: [H('d6', KEY), H('e5', ATK)] }),
    b({ id: 'alb4', moves: 'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6 Bc4 Nb6 Bb5 dxe5 Nxe5 Bd7 Nxd7 Qxd7 O-O e6',
      say: "The pieces come off around e5 and d7, and when the dust settles you have a rock-solid position: no weaknesses, the isolated d4-pawn as a long-term target, and every piece on a good square. Full equality against the Alapin, reached by simple, principled play — attack the centre, trade, and stand comfortably.",
      sayShort: "…e6 — solid, equal, d4 a target.",
      highlights: [H('d4', SOFT)] }),
  ],
};
