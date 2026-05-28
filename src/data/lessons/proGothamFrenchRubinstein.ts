import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-pawn-island', 'concept:pos-development', 'https://en.wikipedia.org/wiki/French_Defence,_Rubinstein_Variation'];

// GothamChess's French Rubinstein (1.e4 e6 2.d4 d5 3.Nc3 dxe4). 451 games
// in his Black dump, 245 wins, top vs 3099 (game 5739337924). The trademark
// Rubinstein creates doubled f-pawns + an open g-file for an aggressive
// Black setup with queenside castling. Masters-anchored 10 plies; 22p line
// from his real game.
export const PRO_GOTHAMCHESS_FRENCH_RUBINSTEIN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-french-rubinstein',
  sources: SRC,
  title: 'French Rubinstein — GothamChess Master Class',
  minutes: 8,
  orientation: 'black',
  beats: [
    {
      id: 'dxe4',
      moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4'],
      arrows: [{ from: 'd5', to: 'e4', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }],
      say: "The Rubinstein: instead of the cramped main lines, Black trades on e4 right away. No locked French structure, no bad bishop entombed — just a clean exchange that leaves Black with sound piece play and a flexible setup. This is what Levy PLAYS as Black vs every 1.e4 — 451 games in his dump, 245 wins. Practical, principled, out of every White player's prep.",
      sayShort: '...dxe4 — sidestep the cramped French.',
    },
    {
      id: 'gxf6',
      moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6'],
      highlights: [{ square: 'f6', color: KEY }],
      say: "After ...Nf6 White trades again on f6, and Black recaptures with the g-pawn. The doubled f-pawns LOOK ugly but they're the whole point: the g-file is wide open for Black's rook, the f6-pawn shields the king-side, and Black gets the bishop pair + queenside castling chances. Concession in form for activity in piece play.",
      sayShort: 'gxf6 — ugly pawns, gorgeous activity.',
    },
    {
      id: 'e5-break',
      moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6', 'Nf3', 'Nc6', 'g3', 'e5'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "...e5 — the central break. Black hits the d4-pawn and stakes a claim in the centre before White can finish development. The f6-pawn even supports the break, justifying its existence: Black's bishop on c8 will come out via e6 with the centre open and the long diagonal cleared.",
      sayShort: '...e5 — central break, the f6-pawn pays off.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Nf6', 'Nxf6+', 'gxf6', 'Nf3', 'Nc6', 'g3', 'e5', 'd5', 'Nb4', 'a3', 'Nxd5', 'Bg2', 'Be6', 'O-O', 'Qd7'],
      arrows: [{ from: 'd8', to: 'h4', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }, { square: 'd7', color: SOFT }],
      say: "White pushes d5 to kick the knight and the knight obliges — Nb4 then Nxd5, landing the knight on the d5 outpost. With Be6/Qd7/O-O-O ready, Black is set up for opposite-side castling and a queenside roll while the g-file aims at White's king. From an 'ugly' pawn-structure choice, Gotham has manufactured an opposite-side attacking middlegame.",
      sayShort: "Knight on d5, queen on d7 — set for O-O-O.",
    },
  ],
};
