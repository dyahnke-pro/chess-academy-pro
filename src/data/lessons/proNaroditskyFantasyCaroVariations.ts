import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://lichess.org/study/Od05RXPe', 'concept:pos-center'];

// Fantasy Caro variation tab — keyed `pro-naroditsky-fantasy-caro::<name>`.
// White, B12, chess.js + explorer-verified, DB-anchored (4...Nf6 anchors 7).
export const PRO_NARODITSKY_FANTASY_CARO_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-fantasy-caro::4...Nf6 Defense': {
    openingId: 'pro-naroditsky-fantasy-caro',
    sources: SRC,
    title: 'Fantasy Caro — 4…Nf6 Defense',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'nf6-e5',
        moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'Nf6', 'e5'],
        highlights: [{ square: 'e5', color: KEY }],
        say: "Instead of …e5, Black develops with Nf6, hitting the e4-pawn at once. White's reply is thematic and ambitious: e5, shoving the pawn forward and kicking the knight. Far from defending, White gains space and a powerful pawn on e5 that cramps Black's whole kingside.",
        sayShort: 'e5 — push the pawn, kick the knight.',
      },
      {
        id: 'nf6-deep',
        moves: ['e4', 'c6', 'd4', 'd5', 'f3', 'dxe4', 'fxe4', 'Nf6', 'e5', 'Nd5', 'c4', 'Nb6', 'Nf3', 'Bg4', 'Be3', 'e6', 'Nc3', 'Bb4', 'Bd3', 'O-O'],
        highlights: [{ square: 'c4', color: KEY }, { square: 'd4', color: SOFT }],
        say: "White rolls the centre: c4 grabs more space and shoves the knight back to b6, while the e3-bishop eyes the b6-knight along the a7–g1 diagonal. With pawns on c4, d4 and e5, White has a giant space advantage and easy development for every piece, while Black stays cramped and passive. From a quiet Caro, White has built a broad, mobile centre and the initiative — exactly the Fantasy's promise against Black's solid setup.",
        sayShort: 'c4 — big centre, White rolls forward.',
      },
    ],
  },
};
