import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// White-oriented main lesson for the Smith-Morra Gambit. Lead-the-eye §5a.
// Moves walk the data spine (sm__accepted-main, masters/strong corpus, G3 —
// prose only). The setup line reaches a sound, full-compensation middlegame at
// ply 20 (engine +0.79 for White DESPITE the pawn: two bishops, both knights
// active, the open c- and d-files). Every board claim is verified against the
// line. The sharp Nd5-sacrifice tail is left to the variation tabs / gems.
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Smith%E2%80%93Morra_Gambit'];

export const SMITH_MORRA_GAMBIT_LESSON: LessonScript = {
  openingId: 'smith-morra-gambit',
  sources: SRC,
  title: 'Smith-Morra Gambit — A Master Class',
  minutes: 11,
  orientation: 'white',
  beats: [
    b({
      id: 'open',
      moves: 'e4 c5 d4 cxd4 c3',
      say: "The Smith-Morra Gambit. Against the Sicilian, White plays d4 and then 3.c3 — offering a SECOND pawn to blast the centre wide open. Black will usually take it; the whole point is what White gets in return.",
      sayShort: 'c3 — offer the pawn, open the centre.',
      highlights: [H('c3'), H('d4')],
    }),
    b({
      id: 'accept',
      moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3',
      say: "After …dxc3 Nxc3, count the bargain. White is a pawn down — but in exchange the c-file and the d-file are wide open for the rooks, the knight is already developed to c3, and Black has nothing out. A clean pawn for a roaring lead in development and two open files.",
      sayShort: 'Nxc3 — a pawn for open files and a lead.',
      highlights: [H('c3'), H('c1'), H('d1')],
    }),
    b({
      id: 'develop',
      moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4',
      say: "The pieces fly out. …Nc6, then Nf3 and Bc4 — the bishop pointing straight down the a2-g8 diagonal at the soft e6 and f7 squares. Every white piece develops toward Black's king while Black is still untangling.",
      sayShort: 'Bc4 — aim the bishop at e6 and f7.',
      arrows: [A('c4', 'e6')],
      highlights: [H('c4'), H('e6')],
    }),
    b({
      id: 'castle',
      moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7',
      say: "White castles and is fully mobilised; Black plays …a6 and …Nge7, trying to complete development without dropping anything. Soon the rooks will swing onto c1 and d1, and every open line points into Black's position.",
      sayShort: 'O-O — castle, rooks head for the open files.',
      highlights: [H('c1'), H('d1')],
    }),
    b({
      id: 'pressure',
      moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Bg5 f6',
      say: "Bg5 leans on the e7-knight and provokes …f6 — and there it is: Black has had to weaken the long light diagonal and the e6-pawn to break the pin. Those new holes are exactly what the gambit was built to exploit.",
      sayShort: 'Bg5 — provoke …f6, weaken the light squares.',
      highlights: [H('e7'), H('f6'), H('e6')],
    }),
    b({
      id: 'battery',
      moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Bg5 f6 Be3 b5 Bb3',
      say: "The bishop retreats to e3 and then b3 — re-aiming at the newly weakened e6-pawn down the diagonal, with Black's …b5 having shut nothing down. Both bishops now rake the kingside and the e6-square is under real pressure.",
      sayShort: 'Bb3 — re-aim at the weak e6-pawn.',
      arrows: [A('b3', 'e6')],
      highlights: [H('b3'), H('e3'), H('e6')],
    }),
    b({
      id: 'middlegame',
      moves: 'e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 a6 O-O Nge7 Bg5 f6 Be3 b5 Bb3 Ng6',
      say: "Here is the verdict on the whole gambit. White is still a pawn down — and the engine prefers WHITE. The two bishops on b3 and e3 rake toward the king, both knights are active, and the open c- and d-files belong to the rooks. This is full compensation and then some: the Smith-Morra player is happy to give a pawn for a position this alive.",
      sayShort: 'A pawn down, but White is better.',
      arrows: [A('b3', 'e6')],
      highlights: [H('b3'), H('e3'), H('c1'), H('d1')],
    }),
  ],
};
