import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Grünfeld variation tab — keyed `pro-naroditsky-grunfeld::<name>`. Black,
// DB-anchored (anchors 14), chess.js-verified.
export const PRO_NARODITSKY_GRUNFELD_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-grunfeld::Russian System': {
    openingId: 'pro-naroditsky-grunfeld',
    sources: SRC,
    title: 'Grünfeld — Russian System',
    minutes: 6,
    orientation: 'black',
    beats: [
      {
        id: 'russian-qb3',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'Nf3', 'Bg7', 'Qb3', 'dxc4', 'Qxc4'],
        highlights: [{ square: 'c4', color: KEY }],
        say: "The Russian System: Qb3 pressures d5 and after …dxc4 Qxc4 the queen grabs the pawn back on c4, eyeing Black's queenside. It's White's most respected try — but the queen on c4 is also a target, and Black gets free development hitting it with tempo.",
        sayShort: "Qb3xc4 — main try; the queen exposes.",
      },
      {
        id: 'russian-deep',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'Nf3', 'Bg7', 'Qb3', 'dxc4', 'Qxc4', 'O-O', 'e4', 'a6', 'Be2', 'b5', 'Qb3', 'c5', 'dxc5', 'Be6'],
        highlights: [{ square: 'b5', color: KEY }, { square: 'c5', color: SOFT }],
        say: "Black expands with …a6 and …b5, kicking the queen and grabbing queenside space, then strikes the centre with …c5. The Bg7 rakes the long diagonal, the queenside pawns roll, and Black has rich counterplay against White's broad but loosening centre. The Russian System is critical, but Black's dynamism holds.",
        sayShort: '…b5 and …c5 — hit queen and centre.',
      },
    ],
  },
};
