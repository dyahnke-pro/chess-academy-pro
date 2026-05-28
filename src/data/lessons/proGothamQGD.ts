import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-development', 'concept:pos-pawn-island', 'https://en.wikipedia.org/wiki/Queen%27s_Gambit_Declined'];

// GothamChess Queen's Gambit Declined as Black (1.d4 d5 2.c4 e6).
// Levy plays it 14 wins as Black (top vs 2985, game 5660311679). The
// classical solid Black defence — declining the gambit pawn, building
// the c6/d5/e6 fortress, then trading or pushing the central break.
export const PRO_GOTHAMCHESS_QGD_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-qgd',
  sources: SRC,
  title: 'The QGD — GothamChess Master Class',
  minutes: 7,
  orientation: 'black',
  beats: [
    {
      id: 'e6',
      moves: ['d4', 'd5', 'c4', 'e6'],
      highlights: [{ square: 'e6', color: KEY }],
      say: "Levy plays the QGD as Black against the Queen's Gambit — 14 wins in his dump (top opponent 2985). ...e6 declines the gambit pawn, planning to support d5 with ...c6 if needed and build the classical Slav-like fortress. Sound, solid, and Levy's go-to vs 1.d4.",
      sayShort: '...e6 — decline the gambit, build the fortress.',
    },
    {
      id: 'cxd5',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'a6', 'Bg5', 'Nbd7', 'cxd5'],
      arrows: [{ from: 'c4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "After natural development with ...a6 (preparing the Vienna idea) and ...Nbd7, White breaks the tension with cxd5 — Exchange Variation. The structure is now fixed: Black gets a half-open c-file and the bishop on f8 has good prospects through ...c5 break later.",
      sayShort: 'cxd5 — Exchange, fix the structure.',
    },
    {
      id: 'deep',
      moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Nf3', 'a6', 'Bg5', 'Nbd7', 'cxd5', 'exd5', 'Nxd5', 'h6', 'Bxf6', 'Nxf6', 'Nxf6+', 'Qxf6', 'e3', 'c5', 'Nd2', 'cxd4'],
      arrows: [{ from: 'd8', to: 'f6', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }, { square: 'f6', color: SOFT }],
      say: "From his real win vs 2985: White takes on d5 (Nxd5) but the line is unsound — after ...h6 Bxf6 Nxf6 Nxf6+ Qxf6 Black's queen lands actively on f6 and the central c5 break wins the d4-pawn outright. Levy's piece play converts the structural plus directly into material. Solid Black scheme, sharp tactical execution.",
      sayShort: '...c5 break — central pawn collapses, Black wins material.',
    },
  ],
};
