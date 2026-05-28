import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-development', 'concept:att-kingside-storm', 'https://en.wikipedia.org/wiki/Sicilian_Defence,_Mengarini_Variation'];

// GothamChess's Mengarini Sicilian — his ACTUAL main is the a3+b4! WING
// GAMBIT (64 games on the same 11-ply prefix, his most-played Mengarini line
// by far). The full 22-ply line from his dump anchors 22/22 plies in HIS
// DATABASE. The 2...g6 Hyper-Accelerated setup lives as a variation tab.
export const PRO_GOTHAMCHESS_MENGARINI_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-mengarini',
  sources: SRC,
  title: 'Mengarini Wing Gambit — GothamChess Master Class',
  minutes: 9,
  orientation: 'white',
  beats: [
    {
      id: 'a3',
      moves: ['e4', 'c5', 'a3'],
      highlights: [{ square: 'a3', color: KEY }],
      say: "Gotham's anti-Sicilian secret weapon: a3 on move 2. The little pawn looks like nothing, but it sidesteps every line of Sicilian theory Black has prepared — and it's setting up the real point: b4, throwing the wing pawn at the c5-pawn for an early gambit. Off-book, off-balance, and 488 wins in his dump.",
      sayShort: 'a3 — sidestep Sicilian theory, prep b4.',
    },
    {
      id: 'b4-gambit',
      moves: ['e4', 'c5', 'a3', 'Nc6', 'b4'],
      arrows: [{ from: 'b4', to: 'c5', color: VIS }],
      highlights: [{ square: 'b4', color: KEY }],
      say: "After ...Nc6, here it is: b4! The wing-gambit move. White offers the b-pawn to wrench the c5-pawn off the centre and grab the d-file. Black can decline, but accepting (...cxb4 axb4 Nxb4) is the principled response — and that's exactly where Gotham wants the game.",
      sayShort: 'b4! — wing gambit, sacrifice the b-pawn.',
    },
    {
      id: 'c3-kick',
      moves: ['e4', 'c5', 'a3', 'Nc6', 'b4', 'cxb4', 'axb4', 'Nxb4', 'c3'],
      highlights: [{ square: 'c3', color: KEY }],
      say: "Black takes everything: ...cxb4 axb4 ...Nxb4 — Black is up a pawn. Then c3! kicks the b4-knight back and White already has the centre back: d4 is coming, the a-file is half-open for the rook on a1, and the gambit pawn will be recovered in a couple of moves. Black bought a pawn with a lot of time.",
      sayShort: 'c3 — kick the knight, plan d4.',
    },
    {
      id: 'deep',
      moves: ['e4', 'c5', 'a3', 'Nc6', 'b4', 'cxb4', 'axb4', 'Nxb4', 'c3', 'Nc6', 'd4', 'd5', 'exd5', 'Qxd5', 'Na3', 'Nf6', 'Nb5', 'Qd8', 'd5', 'Ne5', 'Bf4', 'Nfd7'],
      arrows: [{ from: 'b5', to: 'c7', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'b5', color: SOFT }],
      say: "The full machine: d4 challenges, exd5 Qxd5 wins the centre, then Na3-Nb5 routes the knight into Black's camp with tempo on the queen. Push d5 again — now the pawn is a wedge — and Bf4 lands the bishop on its dream diagonal. White has a knight on b5 eyeing c7, a pawn on d5 cramping Black, the bishop on f4, and an open a-file. From a 'silly' 2.a3, Gotham has manufactured a near-decisive grip.",
      sayShort: 'd5 wedge + Nb5 outpost — total Mengarini grip.',
    },
  ],
};
