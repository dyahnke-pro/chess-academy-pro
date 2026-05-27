import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-development'];

// Naroditsky's Jobava (Rapport-Jobava) London (White, D00). chess.js +
// explorer-verified, DB-anchored (d4 d5 Nc3 Nf6 Bf4 e6, anchors 6). White.
export const PRO_NARODITSKY_JOBAVA_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-jobava-london',
  sources: SRC,
  title: 'The Jobava London — Naroditsky Master Class',
  minutes: 9,
  orientation: 'white',
  beats: [
    {
      id: 'nc3-bf4',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4'],
      arrows: [{ from: 'f4', to: 'c7', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }],
      say: "The Jobava London is the punchy cousin of the regular London: Nc3 comes out early — unusual, since it blocks the c-pawn — and Bf4 swings out to rake the diagonal toward c7. The trade-off is deliberate: White gives up the slow c3-setup for fast development and a direct attacking plan, often with Nb5 ideas hitting c7 and d6.",
      sayShort: 'Nc3 + Bf4 — the punchy attacking London.',
    },
    {
      id: 'bd6',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6'],
      highlights: [{ square: 'd6', color: KEY }],
      say: "Black plays e6 and offers to trade the dark bishops with Bd6, the most solid try. White is happy to oblige — the recapture reshapes the pawns in White's favour and opens a file for the attack. No slow maneuvering here; the Jobava wants the position to crack open.",
      sayShort: '…Bd6 — Black offers the bishop trade.',
    },
    {
      id: 'bxf4',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6', 'Nf3', 'Bxf4', 'exf4'],
      highlights: [{ square: 'f4', color: KEY }],
      say: "Bxf4 exf4, and the recapture hands White a pawn on f4 and a half-open e-file. The f4-pawn clamps e5 and points the way to a kingside pawn storm with g4–g5, while the rook will love the open e-file. The trade Black thought simplified the game actually fuels White's attack.",
      sayShort: 'exf4 — clamp e5, open the e-file.',
    },
    {
      id: 'deep',
      moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'e6', 'e3', 'Bd6', 'Nf3', 'Bxf4', 'exf4', 'O-O', 'Bd3', 'Nbd7', 'O-O', 'c5', 'dxc5', 'Nxc5', 'Ne5', 'Nxd3', 'Qxd3', 'a6'],
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h7', color: KEY }],
      say: "By the middlegame White has the dream Jobava setup: the knight lands on e5, the bishop on d3 lines up on the b1–h7 diagonal at Black's king, and the queen joins on d3 behind it. The f4-pawn and half-open e-file feed a kingside attack while Black is left defending. From an offbeat opening, White has manufactured a real initiative — the whole point of the Jobava.",
      sayShort: 'Ne5 + Bd3 battery — kingside attack rolls.',
    },
  ],
};
