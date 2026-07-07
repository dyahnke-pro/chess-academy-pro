import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-QID: the Fianchetto (d4 Nf6 c4 e6 Nf3 b6 g3) — main-line master class.
// The student plays WHITE. g3+Bg2 contests the long light diagonal that Black's
// ...b6/...Ba6 setup fights for; b3 shores up c4, and the e4 break claims the
// centre. Spine both-sides-sound (build-sound-spine.mjs), engine-verified
// (+0.17 White).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
const A = (from: string, to: string, color = ATK): AnnotationArrow => ({ from, to, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Queen%27s_Indian_Defence'];

export const ANTI_QID_FIANCHETTO_LESSON: LessonScript = {
  openingId: 'anti-qid-fianchetto',
  sources: SRC,
  title: 'The Queen’s Indian — the g3 fianchetto',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'qid1', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6',
      say: "The Queen's Indian is a battle for the long light diagonal — Black fianchettoes with b6 and, here, needles c4 with Ba6. Your answer is the mirror fianchetto: g3 and Bg2, contesting the same diagonal from the other side. Whoever controls those long light squares controls the game.",
      sayShort: "g3 — contest the long diagonal.",
      highlights: [H('g3', KEY), H('a6', SOFT)] }),
    b({ id: 'qid2', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2',
      say: "b3 quietly defends c4, taking the sting out of the a6-bishop. Black checks on b4 and retreats to e7 — a small loss of time — while you complete the fianchetto with Bg2. The bishop takes its post on the long light diagonal, ready to bear down once the knight clears f3; Black's own bishop, meanwhile, bites on the b3-pawn's granite.",
      sayShort: "b3, Bg2 — defend c4, finish the fianchetto.",
      highlights: [H('b3', KEY), H('g2', KEY), H('c4', SOFT)] }),
    b({ id: 'qid3', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3',
      say: "Black props up a coming d5 with c6; you lift the dark-squared bishop to c3, onto the long dark diagonal where it reinforces d4 and eyes the kingside dark squares for when the centre opens. Now BOTH your bishops sit on their long diagonals — one on each colour — a harmonious setup that quietly out-coordinates Black.",
      sayShort: "Bc3 — the dark bishop to its long diagonal.",
      highlights: [H('c3', KEY), H('d4', SOFT)] }),
    b({ id: 'qid4', moves: 'd4 Nf6 c4 e6 Nf3 b6 g3 Ba6 b3 Bb4+ Bd2 Be7 Bg2 c6 Bc3 d5 Nbd2 Nbd7 e4 Nxe4 Nxe4 dxe4',
      say: "When Black finally frees with d5, you strike the centre with e4. After the knights come off, the position opens toward Black's slightly worse-placed pieces, and your two long-diagonal bishops come into their own. A small but nagging pull — the Queen's Indian handled the classical way.",
      sayShort: "e4 — open it for the bishops.",
      highlights: [H('e4', KEY), H('d5', SOFT)] }),
  ],
};
