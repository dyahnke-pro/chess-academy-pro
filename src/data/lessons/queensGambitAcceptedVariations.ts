import type { LessonScript, LessonBeat, AnnotationArrow, AnnotationHighlight } from '../../types';

// Black-oriented variation lessons for the Queen's Gambit Accepted. Lead-the-eye
// §5a. Moves from repertoire.json variation pgn lines (DB-anchored, G3); prose
// only. Deepest beat ≥20 plies (lessonDepth gate).
const KEY = 'rgba(255,214,0,0.88)';
const VIS = 'rgba(40,185,95,0.92)';
const SOFT = 'rgba(80,140,255,0.32)';
const A = (from: string, to: string, color = VIS): AnnotationArrow => ({ from, to, color });
const H = (square: string, color = KEY): AnnotationHighlight => ({ square, color });
interface BeatInit { id: string; moves: string; say: string; sayShort?: string; arrows?: AnnotationArrow[]; highlights?: AnnotationHighlight[]; }
function b(init: BeatInit): LessonBeat { const { moves, ...rest } = init; return { ...rest, moves: moves.trim().split(/\s+/) }; }

const SRC = ['concept:pos-center', 'concept:pos-development', 'concept:pos-tempo', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Accepted'];

export const QGA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'qga::Smyslov Variation 3...a6': {
    openingId: 'qga', title: 'QGA — The Smyslov 3…a6', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 's1', moves: 'd4 d5 c4 dxc4 Nf3 a6', say: "The Smyslov — Black slips in …a6 before anything else. The flexible move-order prepares …b5 to hold the queenside space and …c5 to hit the centre, while keeping options open about where the pieces go. A favourite of the seventh world champion.", sayShort: '…a6 — flexible, prep …b5 and …c5.', highlights: [H('a6')] }),
      b({ id: 's2', moves: 'd4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6', say: "White regains the pawn with e3 and Bxc4; Black develops …Nf6 and …e6, the classic solid set-up. With …a6 already in, Black is a tempo closer to the freeing …b5 and …c5 breaks.", sayShort: '…e6 — develop the sound structure.', highlights: [H('e6')] }),
      b({ id: 's3', moves: 'd4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6 O-O c5 Qe2 Nc6', say: "Castled, Black strikes with …c5 against d4 and develops …Nc6, a second piece bearing down on the centre. The QGA plan in miniature: take the pawn, develop fast, then hit d4 before White consolidates.", sayShort: '…Nc6 — pressure d4.', arrows: [A('c6', 'd4')], highlights: [H('c5'), H('d4')] }),
      b({ id: 's4', moves: 'd4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6 O-O c5 Qe2 Nc6 Rd1 b5 Bb3 cxd4 exd4', say: "…b5 grabs queenside space and gains a tempo on the bishop; …cxd4 exd4 then leaves White with an isolated d4-pawn. Black has traded the wing pawn for a long-term target in the centre.", sayShort: '…cxd4 — saddle White with the IQP.', highlights: [H('b5'), H('d4')] }),
      b({ id: 's5', moves: 'd4 d5 c4 dxc4 Nf3 a6 e3 Nf6 Bxc4 e6 O-O c5 Qe2 Nc6 Rd1 b5 Bb3 cxd4 exd4 Be7 Nc3', say: "…Be7 completes development; Black is fully mobilised against the isolated d4-pawn, with the knight on c6, queenside space, and a clear blockade-and-attack plan. There is the Smyslov tabiya: a comfortable game where the IQP is White's worry, not Black's.", sayShort: '…Be7 — mobilised against the IQP.', highlights: [H('d4')] }),
    ],
  },

  'qga::Sadler Variation ...Bg4': {
    openingId: 'qga', title: 'QGA — The Sadler …Bg4', minutes: 9, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'd1', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4', say: "The Sadler — …Bg4! Black develops the light bishop actively before …e6 shuts it in. This solves the QGA's one nagging problem: in the main lines the c8-bishop can get buried behind …e6. Here it comes out first, pinning the f3-knight.", sayShort: '…Bg4 — bishop out before …e6.', arrows: [A('g4', 'f3')], highlights: [H('g4'), H('f3')] }),
      b({ id: 'd2', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4 Bxc4 e6 h3 Bh5', say: "Bxc4 regains the pawn, and after h3 …Bh5 Black keeps the pin intact. The bishop is committed to an active life on the kingside, exactly where the QGA usually struggles to place it.", sayShort: '…Bh5 — keep the pin alive.', highlights: [H('h5')] }),
      b({ id: 'd3', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4 Bxc4 e6 h3 Bh5 Nc3 Nbd7 g4 Bg6', say: "Nc3 and …Nbd7 develop; when White lunges g4 to trap the bishop, …Bg6 calmly steps to safety. White has gained space but loosened his own king — and that g4-pawn will be a target.", sayShort: '…Bg6 — retreat safely; g4 loosens White.', highlights: [H('g6'), H('g4', SOFT)] }),
      b({ id: 'd4', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 Bg4 Bxc4 e6 h3 Bh5 Nc3 Nbd7 g4 Bg6 Nh4 Be4 Nxe4 Nxe4', say: "Nh4 attacks the bishop, but …Be4! plants it dead in the centre, daring White to trade. After Nxe4 …Nxe4 Black has solved the bishop problem completely and White's kingside pawns are committed and airy. There is the Sadler tabiya: the good bishop traded on its own terms, a knight strong on e4, and White's space won at the cost of king safety.", sayShort: '…Nxe4 — knight to the strong centre.', highlights: [H('e4')] }),
    ],
  },

  'qga::Janowski Variation ...Qd5': {
    openingId: 'qga', title: 'QGA — The Janowski (dxc5 Lines)', minutes: 10, orientation: 'black', sources: SRC,
    beats: [
      b({ id: 'j1', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5', say: "White releases the central tension early with dxc5; Black recaptures …Bxc5, developing the bishop with tempo to its best diagonal, eyeing f2 and the white king. The position opens, and Black's lead in piece activity tells.", sayShort: '…Bxc5 — recapture, active bishop.', highlights: [H('c5')] }),
      b({ id: 'j2', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5 Qe2 Nc6 Nc3 b5', say: "…Nc6 develops, hitting d4 and e5 squares; …b5 gains queenside space and nudges the bishop. Black builds the harmonious QGA set-up with a free hand now that the centre has been cleared.", sayShort: '…b5 — space, develop with tempo.', arrows: [A('c6', 'e5', SOFT)], highlights: [H('c6'), H('b5')] }),
      b({ id: 'j3', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5 Qe2 Nc6 Nc3 b5 Bb3 Bb7 Rd1 Qe7', say: "…Bb7 takes the long diagonal and …Qe7 connects the rooks, tucking the queen onto a safe, useful square. Black is fully developed, every piece active, with no weaknesses to show for White's early central release.", sayShort: '…Qe7 — connect rooks, fully developed.', highlights: [H('b7'), H('e7', SOFT)] }),
      b({ id: 'j4', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6 dxc5 Bxc5 Qe2 Nc6 Nc3 b5 Bb3 Bb7 Rd1 Qe7 e4', say: "White grabs the centre with e4; Black meets it with fully-mobilised pieces, the b7-bishop and active minor pieces ready to answer any e4–e5 thrust with piece play. There is the Janowski tabiya: a clean, equal middlegame where Black's harmonious development balances White's central pawns.", sayShort: '…e4 met — equal, harmonious pieces.', highlights: [H('e4')] }),
    ],
  },
};
