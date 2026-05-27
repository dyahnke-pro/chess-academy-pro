import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@GothamChess', 'concept:pos-development'];

// Gotham London variation tab — keyed `pro-gothamchess-london::<name>`. The
// AGGRESSIVE anti-KID Levy actually teaches (Qd2/Bh6, trade the fianchetto
// bishop, opposite-side storm). DB-anchored (Barry/Tarzan, anchors 9). White.
export const PRO_GOTHAMCHESS_LONDON_VARIATION_LESSONS: Record<string, LessonScript> = {
  "pro-gothamchess-london::vs King's Indian (Bh6 Attack)": {
    openingId: 'pro-gothamchess-london',
    sources: SRC,
    title: "London vs the King's Indian — Bh6 Attack",
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'qd2-bh6',
        moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Nc3', 'd5', 'Bf4', 'Bg7', 'Qd2', 'O-O', 'Bh6'],
        arrows: [{ from: 'h6', to: 'g7', color: VIS }],
        highlights: [{ square: 'g7', color: KEY }],
        say: "This is the line Levy actually teaches against the fianchetto — and it's anything but quiet. Nc3 and Qd2 prepare Bh6, offering to trade off the g7-bishop, the single most important defender of Black's king. Strip that bishop away and the dark squares around the black king turn to swiss cheese.",
        sayShort: 'Qd2 and Bh6 — trade the g7-bishop.',
      },
      {
        id: 'bh6-deep',
        moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Nc3', 'd5', 'Bf4', 'Bg7', 'Qd2', 'O-O', 'Bh6', 'Ne4', 'Nxe4', 'dxe4', 'Bxg7', 'Kxg7', 'Ng5', 'f5', 'h4', 'h6', 'Nh3', 'Nc6'],
        arrows: [{ from: 'd2', to: 'h6', color: VIS }],
        highlights: [{ square: 'h4', color: KEY }, { square: 'g7', color: SOFT }],
        say: "Bxg7 Kxg7 and the dark-squared bishop is gone for good — the black king sits exposed on g7. White pounces: the knight leaps to g5, and h4 launches the pawn storm to pry open the h-file straight at the king, with the queen on d2 ready to swing to h6. This is the attacking London Levy sells: trade the fianchetto bishop, then hunt the king.",
        sayShort: 'Bxg7 then h4 — storm the bared king.',
      },
    ],
  },
};
