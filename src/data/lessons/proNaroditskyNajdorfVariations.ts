import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Najdorf variation tabs — keyed `pro-naroditsky-najdorf::<name>`. Black,
// deeply DB-anchored, chess.js-verified to 20+ plies.
export const PRO_NARODITSKY_NAJDORF_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-najdorf::6.Bg5 Classical': {
    openingId: 'pro-naroditsky-najdorf',
    sources: SRC,
    title: 'Najdorf — 6.Bg5 Classical',
    minutes: 6,
    orientation: 'black',
    beats: [
      {
        id: 'bg5-e6',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6'],
        arrows: [{ from: 'g5', to: 'f6', color: SOFT }],
        highlights: [{ square: 'e6', color: KEY }],
        say: "White's sharpest weapon: Bg5, pinning the f6-knight and preparing f4 and a kingside storm. Here Black switches central breaks — not …e5 but e6, the solid setup. The pin is annoying, not fatal, and Black has a concrete plan to blow the position open on the other wing.",
        sayShort: '…e6 — solid vs the Bg5 pin.',
      },
      {
        id: 'bg5-deep',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Bg5', 'e6', 'f4', 'Be7', 'Qf3', 'Qc7', 'O-O-O', 'Nbd7', 'g4', 'b5', 'Bxf6', 'Nxf6'],
        highlights: [{ square: 'b5', color: KEY }],
        say: "Both sides castle into the storm: White long, then g4; Black answers with b5, hurling the queenside pawns at White's king. After the trade on f6 Black has the bishop pair and a raging attack down the b-file. This is the sharpest position in chess — and Black's counterplay arrives first if he knows the race.",
        sayShort: "…b5 — counter-storm at White's king.",
      },
    ],
  },
  'pro-naroditsky-najdorf::6.Be3 English Attack': {
    openingId: 'pro-naroditsky-najdorf',
    sources: SRC,
    title: 'Najdorf — 6.Be3 English Attack',
    minutes: 6,
    orientation: 'black',
    beats: [
      {
        id: 'eng-e5',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5'],
        highlights: [{ square: 'd4', color: KEY }],
        say: "The English Attack — Be3 heading for f3, Qd2, 0-0-0 and g4-g5. Black meets it the principled way: e5, kicking the d4-knight and grabbing the centre before White gets rolling. Tempo matters in a race, and …e5 wins one.",
        sayShort: '…e5 — hit d4 before White rolls.',
      },
      {
        id: 'eng-deep',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6', 'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'Be7', 'Qd2', 'O-O', 'O-O-O', 'Nbd7', 'g4', 'b5'],
        highlights: [{ square: 'b5', color: KEY }, { square: 'e6', color: SOFT }],
        say: "The thematic race: White castles long and pushes g4; Black covers d5 with the bishop on e6 and fires back with b5, aiming the pawns and the half-open c-file at White's king. Whoever's attack lands first wins, and the Najdorf is engineered to strike fastest.",
        sayShort: "…b5 — race the attack on White's king.",
      },
    ],
  },
};
