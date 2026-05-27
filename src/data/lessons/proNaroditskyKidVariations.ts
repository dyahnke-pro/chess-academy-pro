import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// KID variation tabs — keyed `pro-naroditsky-kid::<name>`. Black, DB-anchored,
// chess.js-verified to 20 plies.
export const PRO_NARODITSKY_KID_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-kid::Fianchetto Variation': {
    openingId: 'pro-naroditsky-kid',
    sources: SRC,
    title: 'KID — Fianchetto Variation',
    minutes: 6,
    orientation: 'black',
    beats: [
      {
        id: 'fia-g3',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'g3'],
        highlights: [{ square: 'g3', color: KEY }],
        say: "White's most respected antidote: g3, heading for Bg2. By fianchettoing, White shores up the light squares around his own king and takes the sting out of Black's …f5 storm — the Bg2 stares right down the long diagonal at Black's queenside and centre. Against this, the all-out kingside attack won't work, so Black must change plans.",
        sayShort: 'g3 — White blunts the …f5 storm.',
      },
      {
        id: 'fia-deep',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6', 'Nf3', 'O-O', 'g3', 'Nbd7', 'Bg2', 'e5', 'O-O', 'exd4', 'Nxd4', 'Re8', 'Re1', 'Nc5'],
        arrows: [{ from: 'c5', to: 'e4', color: VIS }],
        highlights: [{ square: 'c5', color: KEY }, { square: 'e4', color: SOFT }],
        say: "So Black switches gears: trade in the centre with …exd4, put a rook on e8, and leap the knight to c5 — hitting the e4-pawn and eyeing the d3- and b3-squares. Instead of a pawn storm, this is piece play and pressure on White's centre, with …a5 to follow clamping the queenside. Knowing which plan each White setup calls for is the real mastery of the King's Indian.",
        sayShort: '…Nc5 — piece play, hit e4 instead of storming.',
      },
    ],
  },
};
