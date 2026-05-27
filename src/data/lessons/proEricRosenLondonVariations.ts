import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://lichess.org/video/NKPsysr5Qqw', 'concept:pos-development'];

// London variation tab — keyed `pro-ericrosen-london::<name>`. DB-anchored
// (vs-KID ...g6 line anchors 10 plies), chess.js-verified. White.
export const PRO_ERICROSEN_LONDON_VARIATION_LESSONS: Record<string, LessonScript> = {
  "pro-ericrosen-london::vs King's Indian Setup": {
    openingId: 'pro-ericrosen-london',
    sources: SRC,
    title: 'London vs the King’s Indian',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'kid-setup',
        moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Bf4', 'Bg7', 'e3', 'd6', 'Be2', 'O-O'],
        arrows: [{ from: 'f4', to: 'd6', color: VIS }],
        highlights: [{ square: 'd6', color: KEY }],
        say: "When Black fianchettoes with …g6 and …Bg7, White's setup barely changes — the bishop is already out on f4, and from there it leans on the d6-pawn that holds Black's whole King's Indian structure together. Same harmonious system, new target.",
        sayShort: 'Same setup; Bf4 leans on d6.',
      },
      {
        id: 'kid-deep',
        moves: ['d4', 'Nf6', 'Nf3', 'g6', 'Bf4', 'Bg7', 'e3', 'd6', 'Be2', 'O-O', 'O-O', 'Nbd7', 'h3', 'Re8', 'c4', 'e5', 'dxe5', 'dxe5', 'Nxe5', 'Nxe5'],
        arrows: [{ from: 'f4', to: 'e5', color: VIS }],
        highlights: [{ square: 'e5', color: KEY }, { square: 'c4', color: SOFT }],
        say: "White adds c4 for a broad centre, and when Black frees himself with …e5 White trades cleanly: dxe5, dxe5, then Nxe5. After the recaptures the f4-bishop bears down on the e5-square and White stands comfortably — more space, the safer king, and the easier pieces. No theory, no risk, just a pleasant game against the King's Indian.",
        sayShort: 'c4, trade on e5, comfortable.',
      },
    ],
  },
};
