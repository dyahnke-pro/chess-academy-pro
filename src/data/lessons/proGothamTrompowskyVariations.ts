import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:att-kingside-storm', 'concept:pos-development', 'https://en.wikipedia.org/wiki/Trompowsky_Attack'];

// Trompowsky variation tabs — keyed `pro-gothamchess-trompowsky::<name>`.
// Each variation grounded in his real winning games (165125481320 vs 3040 for
// the ...Ne4 line, 148341256640 vs 3027 for the ...e6 line). White-oriented,
// chess.js + masters-anchored.
export const PRO_GOTHAMCHESS_TROMPOWSKY_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-trompowsky::vs 2...Ne4': {
    openingId: 'pro-gothamchess-trompowsky',
    sources: SRC,
    title: 'Trompowsky — vs 2...Ne4 (h4! + d5)',
    minutes: 5,
    orientation: 'white',
    beats: [
      {
        id: 'ne4-h4',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'h4'],
        highlights: [{ square: 'h4', color: KEY }],
        say: "Black's most ambitious try is ...Ne4 — punching at the bishop on g5 AND threatening the central break ...c5. Gotham answers with h4! — a peculiar-looking move that protects the bishop by lining up Bf4 later, and starts the kingside expansion in one shot.",
        sayShort: '...Ne4 — answer with h4!',
      },
      {
        id: 'ne4-d5',
        moves: ['d4', 'Nf6', 'Bg5', 'Ne4', 'h4', 'c5', 'd5', 'Qb6', 'Nd2', 'Nxd2', 'Bxd2', 'd6', 'Bc3', 'e6', 'e4', 'e5', 'Nf3', 'f5', 'exf5', 'Bxf5', 'Nd2'],
        highlights: [{ square: 'd5', color: KEY }, { square: 'c3', color: SOFT }],
        say: "Black hits the centre with ...c5 and Gotham responds with d5 — a thrust that locks the structure in White's favour. Black trades the e4-knight (Nxd2 Bxd2) and the dark bishop reroutes to c3 along the long diagonal. White ends with the d5 pawn-wedge, the bishop firing on c3, and a clear positional pull.",
        sayShort: 'd5 wedge + Bc3 long diagonal — pull locked.',
      },
    ],
  },
  'pro-gothamchess-trompowsky::vs 2...e6': {
    openingId: 'pro-gothamchess-trompowsky',
    sources: SRC,
    title: 'Trompowsky — vs 2...e6 (slow squeeze)',
    minutes: 5,
    orientation: 'white',
    beats: [
      {
        id: 'e6-patient',
        moves: ['d4', 'Nf6', 'Bg5', 'e6', 'Nd2'],
        highlights: [{ square: 'g5', color: KEY }],
        say: "Against the solid ...e6 setup, Gotham doesn't rush the trade — Nd2 develops first, and the bishop on g5 stays put, ready to retreat to h4 if Black plays ...h6. This is the patient Tromp: build the position, then trade when it hurts.",
        sayShort: '...e6 — patient Tromp, Nd2 first.',
      },
      {
        id: 'e6-ne5',
        moves: ['d4', 'Nf6', 'Bg5', 'e6', 'Nd2', 'h6', 'Bh4', 'd5', 'e3', 'Nbd7', 'c3', 'Be7', 'Bd3', 'c5', 'Bxf6', 'Nxf6', 'f4', 'O-O', 'Ngf3', 'b6', 'Ne5'],
        highlights: [{ square: 'e5', color: KEY }, { square: 'd3', color: SOFT }],
        say: "Black's slow setup meets a slow but devastating buildup: Nd2 / Bh4 / e3 / c3 / Bd3 develops harmoniously, then Bxf6 trades into a position where Black recaptures with the knight — no doubled pawns this time — but f4 immediately follows, supporting the knight on e5. The picture: a knight on e5, the bishop on d3 aimed at the king, the f-pawn jamming up the kingside. Quieter route, same crushing position.",
        sayShort: 'Ne5 outpost + Bd3 battery — slow crush.',
      },
    ],
  },
};
