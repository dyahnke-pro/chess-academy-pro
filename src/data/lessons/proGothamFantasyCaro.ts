import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-center', 'concept:pos-pawn-island', 'https://en.wikipedia.org/wiki/Caro-Kann_Defense,_Fantasy_Variation'];

// GothamChess Fantasy Caro (1.e4 c6 2.d4 d5 3.f3). Levy plays it 60
// wins (top vs 3110, game 113672474239). The aggressive anti-Caro that
// supports e4 with f3 — accept that he'll have to handle the awkward
// f-pawn for a big central wedge. His top win demonstrates the e4-e5
// space-grab + Bd3/Be3/Bc4 piece battery pattern.
export const PRO_GOTHAMCHESS_FANTASY_CARO_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-fantasy-caro',
  sources: SRC,
  title: 'Fantasy Caro (3.f3) — GothamChess Master Class',
  minutes: 7,
  orientation: 'white',
  beats: [
    {
      id: 'f3',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3'],
      highlights: [{ square: 'f3', color: KEY }],
      say: "The Fantasy Variation — Levy plays it 60 times in his White dump (top opponent 3110). 3.f3 supports e4 with the f-pawn, planning to recapture with the pawn after ...dxe4 fxe4 and build a broad pawn centre. The f-pawn is awkwardly placed for development but the pay-off is a huge presence in the centre.",
      sayShort: 'f3 — support e4, prep the big centre.',
    },
    {
      id: 'e6-nc3',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'e6', 'Nc3', 'Bb4', 'a3', 'Ba5'],
      highlights: [{ square: 'a3', color: KEY }],
      say: "Black plays ...e6 setting up a French-like structure, then ...Bb4 pins the c3-knight. Levy plays a3 to question the bishop — Black retreats to a5 keeping the pin. White hasn't committed to anything but the bishop on a5 is offside, and the central wedge is still intact.",
      sayShort: 'a3 — question the bishop, keep the centre.',
    },
    {
      id: 'deep',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'e6', 'Nc3', 'Bb4', 'a3', 'Ba5', 'Be3', 'Ne7', 'Bd3', 'Nd7', 'Ne2', 'dxe4', 'fxe4', 'e5', 'O-O', 'O-O', 'Bc4'],
      arrows: [{ from: 'c4', to: 'f7', color: VIS }],
      highlights: [{ square: 'e4', color: KEY }, { square: 'c4', color: SOFT }],
      say: "From his real win vs 3110: White finishes development with Be3/Bd3/Ne2, then the trades happen — ...dxe4 fxe4 ...e5 — and White recaptures with the pawn keeping the centre intact. The pieces flow into place: Bc4 redeploys aimed at f7, the rook coming to f1 has the open f-file from the f3-fxe4 trade, and White's broad centre is now backed by every piece. The Fantasy's whole point.",
      sayShort: 'fxe4 — keep the broad centre, Bc4 aims at f7.',
    },
  ],
};
