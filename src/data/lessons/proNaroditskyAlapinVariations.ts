import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Alapin variation tabs — keyed `pro-naroditsky-alapin::<name>`. DB-anchored,
// chess.js-verified to 20+ plies.
export const PRO_NARODITSKY_ALAPIN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-alapin::2...d5 Center Counter': {
    openingId: 'pro-naroditsky-alapin',
    sources: SRC,
    title: 'Alapin — 2…d5 Center Counter',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'd5-qd5',
        moves: ['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4'],
        highlights: [{ square: 'd5', color: KEY }],
        say: "Black's most direct answer is d5, striking the centre at once. After exd5 Qxd5, the queen sits exposed on d5 — and d4 opens the centre while threatening to gain a tempo on her. White is already a step ahead in the race to develop.",
        sayShort: "exd5 Qxd5 d4 — the queen's a target.",
      },
      {
        id: 'd5-deep',
        moves: ['e4', 'c5', 'c3', 'd5', 'exd5', 'Qxd5', 'd4', 'Nf6', 'Nf3', 'Bg4', 'Be2', 'e6', 'O-O', 'Nc6', 'Be3', 'cxd4', 'cxd4', 'Be7', 'Nc3', 'Qd6', 'h3', 'Bh5'],
        arrows: [{ from: 'c3', to: 'd5', color: VIS }],
        highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
        say: "White develops with gain of time — Nf3, Be2, O-O, then Nc3 jumps out hitting the queen and eyeing d5. The isolated d4-pawn isn't a weakness here; it's a spearhead that grips e5 and d5 and hands White the freer game. Black is solid but passive, exactly the kind of pleasant edge the Alapin manufactures from move two.",
        sayShort: 'Nc3 hits the queen, d4 grips d5.',
      },
    ],
  },
};
