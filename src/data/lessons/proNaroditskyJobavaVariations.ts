import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-development'];

// Jobava variation tab — keyed `pro-naroditsky-jobava-london::<name>`. White,
// DB-anchored (d4 d5 Nc3 Nf6 Bf4 g6, anchors 6), chess.js-verified.
export const PRO_NARODITSKY_JOBAVA_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-jobava-london::vs ...g6 Fianchetto': {
    openingId: 'pro-naroditsky-jobava-london',
    sources: SRC,
    title: 'Jobava — vs …g6 Fianchetto (h4!)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'g6-h4',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'h4'],
        highlights: [{ square: 'h4', color: KEY }],
        say: "When Black fianchettoes with …g6, the Jobava bares its teeth: h4! Before castling, before anything quiet, White lunges the h-pawn at the fianchetto. The threat of h4–h5 to crack open the h-file straight at Black's king is the whole reason to meet …g6 this way — aggression Black rarely expects from a London.",
        sayShort: 'h4! — lunge at the fianchetto.',
      },
      {
        id: 'g6-deep',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'g6', 'e3', 'Bg7', 'h4', 'h5', 'Nf3', 'O-O', 'Ne5', 'c5', 'Be2', 'Nc6', 'Qd2', 'cxd4', 'exd4', 'Bf5', 'f3', 'Rc8'],
        arrows: [{ from: 'e5', to: 'g6', color: VIS }],
        highlights: [{ square: 'e5', color: KEY }, { square: 'h5', color: SOFT }],
        say: "Black halts the pawn with …h5, but that just hands White the g5-square and a permanent kingside lever. The knight plants on e5 eyeing g6, the queen comes to d2 ready to swing across, and White keeps a pleasant space-and-initiative game. The …g6 setup gets no easy life against the Jobava's early h4.",
        sayShort: 'Ne5 eyes g6; h5 leaves holes.',
      },
    ],
  },
  'pro-naroditsky-jobava-london::vs ...c5': {
    openingId: 'pro-naroditsky-jobava-london',
    sources: ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'],
    title: 'Jobava — vs ...c5 (Qxd4 & the e4 break)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'c5-qxd4',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c5', 'Nf3', 'cxd4', 'Qxd4'],
        highlights: [{ square: 'd4', color: KEY }],
        say: "Black's sharpest try is ...c5, hitting the centre before White is set up. The Jobava answer is calm: let the d-pawn go and recapture with the queen on d4. With Nc3 and Bf4 already developed, the few tempi the queen spends dodging Black's knights are a fair price for a centralized piece and a clear lead in development.",
        sayShort: '...c5 — recapture on d4, stay centralized.',
      },
      {
        id: 'c5-e4-break',
        moves: ['d4', 'd5', 'Nc3', 'Nf6', 'Bf4', 'c5', 'Nf3', 'cxd4', 'Qxd4', 'Nc6', 'Qd3', 'Bg4', 'e4', 'Bxf3', 'gxf3', 'e5', 'Bg5', 'dxe4', 'fxe4', 'Qxd3', 'Bxd3', 'Be7', 'Bxf6', 'Bxf6', 'Nd5'],
        arrows: [{ from: 'd5', to: 'f6', color: VIS }],
        highlights: [{ square: 'd5', color: KEY }, { square: 'e4', color: SOFT }],
        say: "White's plan is the e4 break. The pawns come off, the centre opens, and the knight settles on the d5 outpost — hitting the f6-bishop and dominating the board — while the bishop rakes from d3. Black is solid but passive; White's pieces are simply more active. That small, durable pull is exactly what the Jobava is after.",
        sayShort: 'e4 break; knight to the d5 outpost.',
      },
    ],
  },
};
