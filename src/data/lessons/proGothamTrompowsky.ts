import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'];

// GothamChess's Trompowsky Attack (White, A45). His #1 signature opening —
// 1,652 games in his harvested dump, 60% win rate (top win vs 3334). The
// main 2...d5 line + Bxf6 doubled-pawn trade + h4-h5 storm grounds in his
// real game 5739040076 (vs 3019, 77p). 22-ply deep beat, masters-anchored.
export const PRO_GOTHAMCHESS_TROMPOWSKY_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-trompowsky',
  sources: SRC,
  title: 'The Trompowsky — GothamChess Master Class',
  minutes: 9,
  orientation: 'white',
  beats: [
    {
      id: 'bg5',
      moves: ['d4', 'Nf6', 'Bg5'],
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'g5', color: KEY }],
      say: "The Trompowsky is GothamChess's #1 weapon: the bishop swings out to g5 on move 2, pinning the f6-knight before Black has finished thinking. There's no theory race here — the whole opening is built on one trade: Bxf6 to damage Black's structure, then squeeze the weak squares for the rest of the game.",
      sayShort: 'Bg5 — pin the knight, plan the trade.',
    },
    {
      id: 'bxf6',
      moves: ['d4', 'Nf6', 'Bg5', 'd5', 'e3', 'c6', 'Nd2', 'g6', 'Bd3', 'Bg7', 'h4', 'h6', 'Bxf6', 'exf6'],
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'f6', color: KEY }],
      say: "Black builds a KID-style setup with ...d5/...g6/...Bg7, but the Tromp doesn't care about transposing. Once the pieces are out and h4 has lunged, Bxf6 — the deal. After ...exf6, Black is saddled with a doubled pawn on f6 stuck in front of his own pieces, the e-file half-open for White, and a permanent dark-square hole at e5. The structural concession is the whole point.",
      sayShort: 'Bxf6 — damage the pawns, win the squares.',
    },
    {
      id: 'h-storm',
      moves: ['d4', 'Nf6', 'Bg5', 'd5', 'e3', 'c6', 'Nd2', 'g6', 'Bd3', 'Bg7', 'h4', 'h6', 'Bxf6', 'exf6', 'h5', 'g5', 'Qf3'],
      highlights: [{ square: 'h5', color: KEY }],
      say: "Now the kingside storm rolls. The pawn jams up to h5, cramping Black's loose kingside; Black plays ...g5 to keep the rook-file shut, but the move is a permanent weakness — h5 sits as a wedge and the f5-square becomes a hole. Qf3 swings the queen to f3, eyeing both flanks while the doubled f-pawn is target #1.",
      sayShort: 'h5 wedge — kingside cramped, holes everywhere.',
    },
    {
      id: 'deep',
      moves: ['d4', 'Nf6', 'Bg5', 'd5', 'e3', 'c6', 'Nd2', 'g6', 'Bd3', 'Bg7', 'h4', 'h6', 'Bxf6', 'exf6', 'h5', 'g5', 'Qf3', 'Na6', 'c3', 'Be6', 'Ne2', 'Qd7'],
      arrows: [{ from: 'd3', to: 'h7', color: VIS }],
      highlights: [{ square: 'h5', color: KEY }, { square: 'f6', color: SOFT }],
      say: "Black tucks the knight to a6 and develops with ...Be6/...Qd7, settling into a cramped defensive shell — but the structure is already conceded. White has the doubled pawn on f6 as a permanent target, the wedge on h5 cramping the kingside, the bishop on d3 aimed at h7, and the queen on f3 ready to swing wherever the attack needs her. From an offbeat 2.Bg5, Gotham has manufactured the positional grip the Trompowsky promises every game.",
      sayShort: 'Doubled f6 + h5 wedge — Tromp grip locked in.',
    },
  ],
};
