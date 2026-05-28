import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-initiative', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Milner-Barry_Gambit'];

// GothamChess Milner-Barry (French Advance, 1.e4 e6 2.d4 d5 3.e5 c5 4.c3
// Nc6 5.Nf3 Qb6 6.Bd3 — White offers the d4-pawn for the initiative).
// Levy plays it 20 wins in his white dump (top vs 2862, game 74360656363).
// Real spine anchors 21 plies in his database — practically the whole
// line is his actual play.
export const PRO_GOTHAMCHESS_MILNER_BARRY_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-milner-barry',
  sources: SRC,
  title: 'Milner-Barry Gambit — GothamChess Master Class',
  minutes: 7,
  orientation: 'white',
  beats: [
    {
      id: 'e5-c3',
      moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "Against the French, Levy plays the Advance Variation with 3.e5 — locking the centre and gaining kingside space. After ...c5 c3 ...Nc6, both sides are set up: White has the e5-pawn cramping Black, and Black needs the ...c5 break to free his position. The stage is set for the Milner-Barry's pawn sacrifice.",
      sayShort: 'e5 + c3 — lock the centre, prep the gambit.',
    },
    {
      id: 'bd3-dxc5',
      moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Bd3', 'Bd7', 'dxc5'],
      arrows: [{ from: 'd4', to: 'c5', color: VIS }],
      highlights: [{ square: 'c5', color: KEY }],
      say: "When Black plays ...Qb6 hitting the b2-pawn, Levy offers the d4-pawn with Bd3 — the Milner-Barry gambit move. After ...Bd7 White plays dxc5 — surrendering the d-pawn but gaining tempo on Black's queen with Bxc5 to follow. The pawn was just a magnet for Black's pieces.",
      sayShort: 'Bd3 + dxc5 — gambit the d-pawn for tempo.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e6', 'd4', 'd5', 'e5', 'c5', 'c3', 'Nc6', 'Nf3', 'Qb6', 'Bd3', 'Bd7', 'dxc5', 'Bxc5', 'O-O', 'a5', 'Nbd2', 'a4', 'b4', 'axb3', 'Nxb3', 'Ba3'],
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'd3', color: KEY }, { square: 'b3', color: SOFT }],
      say: "From his real win vs 2862: Black takes (...Bxc5) and Levy just castles. When Black tries to expand queenside with ...a5/...a4, White breaks with b4 — opening files on both sides with the queens still nervous. Bd3 lines up at h7, Nb3 takes the strong central post, and White's initiative more than compensates for the pawn long since gambited.",
      sayShort: 'b4 — open files both sides, initiative pays off.',
    },
  ],
};
