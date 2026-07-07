import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Anti-Benoni/Benko: the d5 push + accept the gambit (d4 Nf6 c4 c5 d5 b5 cxb5
// a6 bxa6 Bxa6) — main-line master class. The student plays WHITE. When Black
// throws the Benko/Volga pawn with ...b5, the healthiest answer is to TAKE it,
// give the a6-square back, and prove the extra pawn: a big e4 centre, king
// tucked on g2, and no way through for Black's queenside pressure. Spine both-
// sides-sound (build-sound-spine.mjs), engine-verified (+0.93 White).

const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const ATK = 'rgba(40,185,95,0.92)';
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }
const SRC = ['concept:pos-center', 'concept:pos-initiative', 'https://en.wikipedia.org/wiki/Benko_Gambit'];

export const ANTI_BENONI_PUSH_LESSON: LessonScript = {
  openingId: 'anti-benoni-push',
  sources: SRC,
  title: 'Meeting the Benko — take the pawn and prove it',
  minutes: 6,
  orientation: 'white',
  beats: [
    b({ id: 'ben1', moves: 'd4 Nf6 c4 c5 d5 b5',
      say: "Against the Benoni push you clamp the centre with d5, and Black offers the Benko Gambit pawn with b5 — sacrificing a pawn to prise open the a- and b-files for long-term queenside pressure. The compensation is real but slow. The soundest way to face it is the most direct: take the pawn, and be ready to give the square back on your terms.",
      sayShort: "d5 met by …b5 — the Benko offer.",
      highlights: [H('d5', KEY), H('b5', SOFT)] }),
    b({ id: 'ben2', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6',
      say: "You accept cleanly: cxb5, and after a6 you hand the pawn back with bxa6 so Black recaptures with the bishop rather than opening a file for free. Now you are a healthy pawn to the good. Black has the bishop on a6 raking the long light diagonal and open lines, but no immediate threat — your job is simply to complete development and keep the extra pawn.",
      sayShort: "cxb5, bxa6 — a clean pawn up.",
      highlights: [H('a6', SOFT)] }),
    b({ id: 'ben3', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 Nf3 g6 e4 Bxf1 Kxf1 Bg7',
      say: "Nc3 and Nf3 develop toward the centre, and e4 raises a broad pawn front that walls off Black's counterplay. Black trades his good light bishop with Bxf1; you recapture Kxf1 — the king is perfectly safe here and you will simply walk it to g2. Both sides keep their dark bishops, and yours has the e4-pawn wall behind it.",
      sayShort: "e4 — big centre, trade the light bishops.",
      highlights: [H('e4', KEY), H('f1', SOFT)] }),
    b({ id: 'ben4', moves: 'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 Nf3 g6 e4 Bxf1 Kxf1 Bg7 g3 O-O Kg2 Nbd7',
      say: "g3 and Kg2 tuck the king into the fianchetto hole by hand — safe, and the rook on h1 is already connected. Black castles and brings the knight to d7, but the Benko dream of overwhelming queenside pressure never arrives: your centre is solid, your king is snug, and you are a clean pawn up. Convert with patience.",
      sayShort: "Kg2 — king safe, a pawn up.",
      highlights: [H('g2', KEY), H('e4', SOFT)] }),
  ],
};
