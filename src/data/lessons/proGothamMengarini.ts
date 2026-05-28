import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-development', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Mengarini_Variation'];

// GothamChess's Mengarini Sicilian (1.e4 c5 2.a3). 488 wins in his dump,
// top vs 3129 (game 168956387144). The masters DB barely touches it — but
// his games ARE the database for HIS tab: this 22-ply line anchors 11 plies
// in his pro-game index (the move-by-move "he actually plays this from
// this position" check). 2...g6 is his most common Black response (145
// wins); the line shows his trademark Bc4-Ba2 retreat + h4/f3/g4 storm.
export const PRO_GOTHAMCHESS_MENGARINI_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-mengarini',
  sources: SRC,
  title: 'Mengarini Sicilian — GothamChess Master Class',
  minutes: 8,
  orientation: 'white',
  beats: [
    {
      id: 'a3',
      moves: ['e4', 'c5', 'a3'],
      highlights: [{ square: 'a3', color: KEY }],
      say: "Gotham's anti-Sicilian secret weapon: a3 on move 2. The little pawn looks like nothing, but it sidesteps every line of Sicilian theory Black has prepared and quietly preps b4 for a queenside pawn romp. Off-book, off-balance, and Gotham has 488 wins to prove the trick works.",
      sayShort: 'a3 — sidestep all the Sicilian theory.',
    },
    {
      id: 'bc4-ba2',
      moves: ['e4', 'c5', 'a3', 'g6', 'Nc3', 'Bg7', 'Bc4', 'Nc6', 'd3', 'Nf6', 'Ba2'],
      arrows: [{ from: 'a2', to: 'f7', color: VIS }],
      highlights: [{ square: 'a2', color: KEY }],
      say: "Black plays a Hyper-Accelerated Dragon (...g6/...Bg7), Gotham finishes development with Nc3/Bc4/d3, then tucks the bishop back to a2 — out of harm's way but still aiming at f7 along the long diagonal. Now the kingside attack can roll without White's bishop ever getting kicked.",
      sayShort: 'Ba2 — bishop safe, still aimed at f7.',
    },
    {
      id: 'h4-storm',
      moves: ['e4', 'c5', 'a3', 'g6', 'Nc3', 'Bg7', 'Bc4', 'Nc6', 'd3', 'Nf6', 'Ba2', 'd6', 'h4', 'Bg4', 'f3'],
      arrows: [{ from: 'f3', to: 'g4', color: VIS }],
      highlights: [{ square: 'h4', color: KEY }, { square: 'f3', color: SOFT }],
      say: "h4 lunges, daring Black to provoke. When ...Bg4 pins the queenside, Gotham simply backs the centre with f3 — chasing the bishop AND preparing the g-pawn to roll up next. The Sicilian has turned into a King's Indian Attack-style storm with White picking the targets.",
      sayShort: 'h4 then f3 — chase the bishop, ready g4.',
    },
    {
      id: 'deep',
      moves: ['e4', 'c5', 'a3', 'g6', 'Nc3', 'Bg7', 'Bc4', 'Nc6', 'd3', 'Nf6', 'Ba2', 'd6', 'h4', 'Bg4', 'f3', 'Bd7', 'g4', 'h5', 'g5', 'Nh7', 'f4', 'Bg4'],
      highlights: [{ square: 'g5', color: KEY }, { square: 'h4', color: SOFT }],
      say: "Black has to move the bishop and ...h5 to slow the rolling pawns, but Gotham just keeps shoving: g5 kicks the knight to the rim on h7, then f4 wedges the centre. White has a giant pawn-front on the kingside, the bishop on a2 still pointing at f7, and a Black king with no safe shelter. From 2.a3, manufactured a crushing attack.",
      sayShort: 'g5 + f4 — pawn-front squeezes the king.',
    },
  ],
};
