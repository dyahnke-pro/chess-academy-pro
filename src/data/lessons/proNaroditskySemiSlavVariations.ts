import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Semi-Slav variation tab — keyed `pro-naroditsky-semi-slav::<name>`. Black,
// DB-anchored (Botvinnik anchors 20), chess.js-verified.
export const PRO_NARODITSKY_SEMI_SLAV_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-semi-slav::Botvinnik Variation': {
    openingId: 'pro-naroditsky-semi-slav',
    sources: SRC,
    title: 'Semi-Slav — Botvinnik Variation',
    minutes: 6,
    orientation: 'black',
    beats: [
      {
        id: 'botv-dxc4',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'Bg5', 'dxc4', 'e4', 'b5'],
        highlights: [{ square: 'c4', color: KEY }, { square: 'b5', color: SOFT }],
        say: "The Botvinnik is the sharpest opening in chess. After Bg5 Black grabs the c4-pawn with dxc4 and, when White builds the centre with e4, clings to the booty with b5. Black is a pawn up and about to be attacked furiously — this is a memorize-or-perish line, and the rewards for knowing it are enormous.",
        sayShort: '…dxc4 and …b5 — grab and hold the pawn.',
      },
      {
        id: 'botv-deep',
        moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'Bg5', 'dxc4', 'e4', 'b5', 'e5', 'h6', 'Bh4', 'g5', 'Nxg5', 'hxg5', 'Bxg5', 'Nbd7'],
        highlights: [{ square: 'g5', color: KEY }],
        say: "The mainline fireworks: White plays e5 to hit the f6-knight, Black throws in g5 to break the pin, and White sacrifices a knight on g5 to blast the position open. Black emerges down a piece but up two pawns with a rock-solid extra structure — the famous Botvinnik material imbalance, where deep preparation and nerves of steel decide the game.",
        sayShort: '…g5 then the knight sac — Botvinnik chaos.',
      },
    ],
  },
};
