import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Scotch variation tabs — keyed `pro-naroditsky-scotch::<name>`. White,
// DB-anchored, chess.js-verified to 20+ plies.
export const PRO_NARODITSKY_SCOTCH_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-naroditsky-scotch::4...Nf6 Mieses Variation': {
    openingId: 'pro-naroditsky-scotch',
    sources: SRC,
    title: 'Scotch — 4…Nf6 Mieses Variation',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'mieses-e5',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5'],
        highlights: [{ square: 'e5', color: KEY }, { square: 'c6', color: SOFT }],
        say: "Against 4…Nf6 White goes for the Mieses: Nxc6 doubles Black's pawns on c6, then e5 throws the pawn forward to kick the f6-knight and grab a big spatial bind. Black's compromised queenside structure is a long-term target while White's e5-pawn cramps the whole position.",
        sayShort: 'e5 — kick the knight, bind the centre.',
      },
      {
        id: 'mieses-deep',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nxc6', 'bxc6', 'e5', 'Qe7', 'Qe2', 'Nd5', 'c4', 'Ba6', 'b3', 'g6', 'Bb2', 'Bg7', 'g3', 'O-O'],
        highlights: [{ square: 'd5', color: KEY }],
        say: "White expands with c4, kicking the d5-knight, and fianchettoes the bishop to b2 where it stares down the long dark diagonal at g7 and Black's king. The e5-pawn and the space advantage give White a comfortable, pleasant initiative against Black's damaged structure — pure Scotch positional pressure.",
        sayShort: 'c4 then Bb2 — space and pressure.',
      },
    ],
  },
  'pro-naroditsky-scotch::Scotch Four Knights': {
    openingId: 'pro-naroditsky-scotch',
    sources: SRC,
    title: 'Scotch Four Knights',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'fourk-bb4',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4', 'Nxd4', 'Bb4'],
        highlights: [{ square: 'd4', color: KEY }],
        say: "When both knights come out first, White still breaks with d4 — the Scotch Four Knights. The knight recaptures on the centre and Black pins with Bb4. This is the move-order Naroditsky meets most often, and it leads to an open, healthy game where White's central presence is the constant theme.",
        sayShort: 'd4 — the Scotch via the Four Knights.',
      },
      {
        id: 'fourk-deep',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6', 'd4', 'exd4', 'Nxd4', 'Bb4', 'Nxc6', 'bxc6', 'Bd3', 'd5', 'exd5', 'cxd5', 'O-O', 'O-O', 'Bg5', 'c6', 'Qf3', 'Be7'],
        arrows: [{ from: 'g5', to: 'f6', color: VIS }],
        highlights: [{ square: 'd5', color: KEY }],
        say: "Nxc6 again saddles Black with doubled pawns; after the central trades White pins the f6-knight with Bg5 and lines the queen up on f3, pressuring the isolated d5-pawn and Black's kingside. White has the better structure and the more active pieces — the Scotch's clean, low-risk pull, just reached by a different door.",
        sayShort: 'Bg5 + Qf3 — pressure d5 and f6.',
      },
    ],
  },
};
