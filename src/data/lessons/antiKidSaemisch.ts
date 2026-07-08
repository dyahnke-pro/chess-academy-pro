import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-KID: the Sämisch (d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3) — main-line master class.
// The student plays WHITE. f3 bolts down e4 and announces a broad c4-d4-e4
// centre; White clamps with d5 and plays for a space bind while Black seeks the
// ...c6/...f5 counter. Spine both-sides-sound (build-sound-spine.mjs), engine-
// verified (+0.74 White). chess.js-legal.

const ATK = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-space', 'https://en.wikipedia.org/wiki/King%27s_Indian_Defence,_S%C3%A4misch_Variation'];

export const ANTI_KID_SAEMISCH_LESSON: LessonScript = {
  openingId: 'anti-kid-saemisch',
  sources: SRC,
  title: 'The Sämisch — crushing the King’s Indian with f3',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'sae1', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3',
      say: "Against the King's Indian, the Sämisch is the bruiser. f3 props up e4 so you can build the biggest centre in all of chess — pawns on c4, d4 AND e4, every one of them defended. Where other lines let Black chip away at e4, here it's granite. You just take the space and DARE Black to break it.",
      sayShort: "f3 — bolt down the c4-d4-e4 centre.",
      highlights: [H('c4', KEY), H('d4', KEY), H('e4', KEY)] }),
    b({ id: 'sae2', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5',
      say: "Black castles and strikes the centre with …e5; you slam it shut with d5. This is the Sämisch bind — that d5-pawn cramps Black's whole position and hands you a lasting space edge on both wings. Be3 backs the plan and eyes a later Qd2 and a kingside pawn storm.",
      sayShort: "d5 — clamp the centre, big space.",
      highlights: [H('d5', KEY), H('e5', SOFT)] }),
    b({ id: 'sae3', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 c6 Bd3 cxd5 cxd5',
      say: "Black tries the …c6 break to loosen the clamp; you recapture cxd5, keeping the wedge on d5 AND grabbing the half-open c-file for your rooks. The bishop comes to d3 — natural piece deployment, all of it sitting behind that big space advantage.",
      sayShort: "cxd5 — keep the wedge, open the c-file.",
      highlights: [H('d5', KEY), H('d3', SOFT)] }),
    b({ id: 'sae4', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 f3 O-O Be3 e5 d5 c6 Bd3 cxd5 cxd5 Na6 Nge2 Nc5 Bc2 a5',
      say: "Black reroutes the knight to c5 to hit the bishop, which slides to c2 — safe, and still eyeing the kingside. And there's the Sämisch dream, fully realised: a granite centre, more space on every corner of the board, the c-file, and a crystal-clear plan of Qd2 and g4-h4 to storm Black's king. This is a game White plays to WIN.",
      sayShort: "Bc2 — space, the c-file, a kingside storm ahead.",
      highlights: [H('d5', KEY), H('c2', SOFT), H('c5', SOFT)] }),
  ],
};
