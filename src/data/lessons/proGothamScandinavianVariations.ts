import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@GothamChess', 'concept:pos-development'];

// Scandinavian variation tab — keyed `pro-gothamchess-scandinavian::<name>`.
// Black, DB-anchored (...Qd6 anchors 10), chess.js-verified.
export const PRO_GOTHAMCHESS_SCANDINAVIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-scandinavian::Modern ...Qd6': {
    openingId: 'pro-gothamchess-scandinavian',
    sources: SRC,
    title: 'Scandinavian — Modern …Qd6',
    minutes: 6,
    orientation: 'black',
    beats: [
      {
        id: 'qd6',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd6'],
        highlights: [{ square: 'd6', color: KEY }],
        say: "The modern treatment: instead of …Qa5, the queen drops to d6. It looks passive, but d6 is a superb square — the queen defends, stays out of harm's way, and keeps the option of …Qb6 or …Qg6 later. This is the line many strong players prefer today, and Levy teaches it as the flexible, low-maintenance choice.",
        sayShort: '…Qd6 — the flexible modern square.',
      },
      {
        id: 'qd6-deep',
        moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qd6', 'd4', 'Nf6', 'Nf3', 'a6', 'Bc4', 'b5', 'Bb3', 'Bb7', 'O-O', 'e6', 'Re1', 'Be7', 'Bg5', 'O-O'],
        highlights: [{ square: 'b7', color: KEY }],
        say: "Black expands with …a6 and …b5, grabbing queenside space and fianchettoing the bishop to b7 where it rakes the long diagonal toward the centre and White's king. With …e6, …Be7 and …O-O Black finishes a harmonious, solid setup — no weaknesses, a good bishop, and easy play. The Scandinavian's modern face: rock-solid but quietly active.",
        sayShort: '…b5 and …Bb7 — space and the long diagonal.',
      },
    ],
  },
};
