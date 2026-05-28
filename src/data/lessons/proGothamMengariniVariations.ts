import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = [
  'https://www.youtube.com/watch?v=8n_VzaFGTdU',  // "a3 Sicilian, Gotham Style | Chapter 1 (Accepted)"
  'https://www.youtube.com/watch?v=EU07BDvRv2c',  // "GothamChess Sicilian 1.e4 c5 2.a3"
  'concept:pos-development',
  'concept:att-kingside-storm',
];

// Mengarini variation tabs — keyed `pro-gothamchess-mengarini::<name>`.
// Each variation's line is his deepest shared real play from the dump:
// vs 2...g6 = 4-game-shared 24p with Bc4-Ba2 + h4/f4/f5 storm; vs 2...e6 =
// 3-game-shared 20p with the b4 wing gambit + Bd3/f4/O-O setup. The deeper
// 4 minor variations (d5/d6/Nf6/e5) are pgn-only tabs because their shared
// line is < 20 plies — no padding past his real play.
export const PRO_GOTHAMCHESS_MENGARINI_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-mengarini::vs 2...g6 Hyper-Accelerated': {
    openingId: 'pro-gothamchess-mengarini',
    sources: SRC,
    title: 'Mengarini — vs 2...g6 (Bc4-Ba2 + kingside storm)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'g6-bc4-ba2',
        moves: ['e4', 'c5', 'a3', 'g6', 'Nc3', 'Bg7', 'Bc4', 'Nc6', 'd3', 'e6', 'Ba2'],
        arrows: [{ from: 'a2', to: 'f7', color: VIS }],
        highlights: [{ square: 'a2', color: KEY }],
        say: "When Black avoids the b4 gambit with the Hyper-Accelerated ...g6, Gotham switches plans: Nc3, Bc4, then Ba2 — tucking the bishop out of harm's way while keeping it aimed at f7 along the long diagonal. The 'silly' a2 square is actually the bishop's permanent home, immune to ...b5/...Na5 kicks.",
        sayShort: '...g6 — Bc4 then Ba2, aim at f7.',
      },
      {
        id: 'g6-deep',
        moves: ['e4', 'c5', 'a3', 'g6', 'Nc3', 'Bg7', 'Bc4', 'Nc6', 'd3', 'e6', 'Ba2', 'Nge7', 'h4', 'h6', 'h5', 'g5', 'f4', 'gxf4', 'Bxf4', 'd5', 'Nf3', 'd4', 'Ne2', 'e5'],
        highlights: [{ square: 'h5', color: KEY }, { square: 'f4', color: SOFT }],
        say: "With Ba2 out of trouble, the kingside storm rolls: h4 challenges, h5 jams the rook-pawn, and when Black tries ...g5 to keep the file shut Gotham breaks with f4! gxf4 Bxf4 — White now has the half-open h-file, a powerful bishop on f4, and the a2-bishop still pointing at f7. Black is bent up trying to defend everything.",
        sayShort: 'h4-h5 then f4! — storm cracks the kingside.',
      },
    ],
  },
  'pro-gothamchess-mengarini::vs 2...e6': {
    openingId: 'pro-gothamchess-mengarini',
    sources: SRC,
    title: 'Mengarini — vs 2...e6 (b4! gambit, same plan)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'e6-b4',
        moves: ['e4', 'c5', 'a3', 'e6', 'b4'],
        highlights: [{ square: 'b4', color: KEY }],
        say: "...e6 doesn't dodge the gambit — b4! still works. Black takes (...cxb4 axb4), and after ...Bxb4 White's c3 kicks the bishop and grabs the centre. Same wing-gambit plan as vs ...Nc6: trade a pawn for time, the a-file, and a roaring centre.",
        sayShort: 'b4! — same gambit vs ...e6.',
      },
      {
        id: 'e6-deep',
        moves: ['e4', 'c5', 'a3', 'e6', 'b4', 'cxb4', 'axb4', 'Bxb4', 'c3', 'Be7', 'd4', 'd6', 'Bd3', 'Nf6', 'f4', 'e5', 'Nf3', 'Nbd7', 'O-O', 'O-O'],
        arrows: [{ from: 'd3', to: 'h7', color: VIS }],
        highlights: [{ square: 'd4', color: KEY }, { square: 'f4', color: SOFT }],
        say: "Black tucks the bishop back to e7 and builds with ...d6/...Nf6. Gotham erects the dream centre: d4 plus f4, with Bd3 on the b1-h7 diagonal pointing at Black's castled king. The pawn-front and the bishop battery promise a kingside attack — the gambit pawn long since paid back in piece activity.",
        sayShort: 'd4 + f4 + Bd3 — dream centre, attack queued.',
      },
    ],
  },
};
