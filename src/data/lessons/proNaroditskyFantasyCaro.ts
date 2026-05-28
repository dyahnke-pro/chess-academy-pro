import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://lichess.org/study/Od05RXPe', 'concept:pos-center'];

// Naroditsky's Fantasy Variation vs the Caro-Kann (3.f3). White, B12,
// chess.js + explorer-verified, DB-anchored.
export const PRO_NARODITSKY_FANTASY_CARO_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-fantasy-caro',
  sources: SRC,
  title: 'The Fantasy Caro-Kann — Naroditsky Master Class',
  minutes: 9,
  orientation: 'white',
  beats: [
    {
      id: 'f3-prop',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3'],
      highlights: [{ square: 'e4', color: KEY }],
      say: "The Caro-Kann is famously solid — so Naroditsky meets it with the sharpest answer of all: the Fantasy Variation, f3. The point is brazen: prop up the e4-pawn with the f-pawn and dare Black to capture. If he does, White recaptures with the f-pawn and ends up with a huge e4-and-d4 centre plus an open f-file aimed at Black's king. No sterile equality here.",
      sayShort: 'f3 — prop e4, dare Black to take it.',
    },
    {
      id: 'big-center',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5'],
      highlights: [{ square: 'e4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "dxe4 fxe4, and White has exactly what he wanted: pawns on e4 and d4 commanding the centre, and the f-file ripped open for the rook. Black hits back with e5 to challenge — but White welcomes the fight. The whole system is built to drag the solid Caro player into a sharp, double-edged middlegame.",
      sayShort: 'fxe4 — big centre, open f-file.',
    },
    {
      id: 'bc4-f7',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'Bg4', 'Bc4'],
      arrows: [{ from: 'c4', to: 'f7', color: VIS }],
      highlights: [{ square: 'f7', color: KEY }],
      say: "Develop with threats: Nf3 holds the centre, and Bc4 slants down at f7 — the eternal soft spot in front of Black's uncastled king. Every white piece comes out with purpose, and the open f-file means the rook will soon add its weight to the same target.",
      sayShort: 'Bc4 — aim the bishop at f7.',
    },
    {
      id: 'bg5-pin',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'Bg4', 'Bc4', 'Nd7', 'O-O', 'Ngf6', 'c3', 'Bd6', 'Bg5'],
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }],
      say: "Castled and coordinated, White clamps with Bg5, pinning the f6-knight and piling pressure on Black's kingside. The pin ties Black down while White finishes mobilizing. This is the Fantasy's reward: a pleasant, attacking position where White calls the shots and the Caro player is the one under pressure.",
      sayShort: 'Bg5 — pin f6, pile on the kingside.',
    },
    {
      id: 'deep',
      moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'e5', 'Nf3', 'Bg4', 'Bc4', 'Nd7', 'O-O', 'Ngf6', 'c3', 'Bd6', 'Bg5', 'O-O', 'Nbd2', 'Qc7', 'Qe1', 'Rae8'],
      highlights: [{ square: 'e4', color: KEY }],
      say: "Deep into the middlegame the structure tells the story: the e4-pawn anchors White's broad centre, the queen swings toward the kingside via e1, and both bishops plus the f-rook converge on Black's king. From a quiet Caro-Kann, White has manufactured a full attacking game — exactly why Naroditsky reaches for the Fantasy when he wants to play for the win.",
      sayShort: 'Centre rolls, pieces swing at the king.',
    },
  ],
};
