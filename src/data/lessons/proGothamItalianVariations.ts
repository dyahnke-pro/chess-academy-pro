import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-development', 'concept:tac-fork', 'https://en.wikipedia.org/wiki/Italian_Game'];

// GothamChess Italian variation tabs — keyed `pro-gothamchess-italian::<name>`.
// 2...Nf6 (the Two Knights / open Italian) is Levy's most-common alternative
// when Black doesn't mirror with ...Bc5 — 30 games, 15 wins in his dump.
// Top win 60277343741 (vs 2737) plays the open d4-break / Re1 piece-pressure
// pattern.
export const PRO_GOTHAMCHESS_ITALIAN_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-italian::vs 2...Nf6 (Two Knights)': {
    openingId: 'pro-gothamchess-italian',
    sources: SRC,
    title: 'Italian — vs 2...Nf6 (Two Knights, d4 break)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'nf6-d4',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4'],
        highlights: [{ square: 'd4', color: KEY }],
        say: "Black skips ...Bc5 and develops the knight directly: ...Nf6. Levy doesn't transpose into anything quiet — he plays d4! immediately. The central break in this position is even sharper because Black's dark-squared bishop is still home: Black can't easily defend e5 without a concession.",
        sayShort: 'd4 — sharp break vs the Two Knights.',
      },
      {
        id: 'nf6-deep',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd4', 'exd4', 'O-O', 'Nxe4', 'Re1', 'd5', 'Bxd5', 'Qxd5', 'Nc3', 'Qa5', 'Nxe4', 'Be6', 'Bg5', 'Qd5'],
        arrows: [{ from: 'e1', to: 'e4', color: VIS }],
        highlights: [{ square: 'e4', color: KEY }, { square: 'e1', color: SOFT }],
        say: "From Levy's real win vs 2737: Black grabs the pawn and takes on e4, but White just castles, swings the rook to e1, and the e-file pressure makes the e4-knight a target. After Bxd5/Nxe4/Bg5, White has piled three pieces on the centre — the rook, the knight, and the pinning bishop — while Black's queen wanders. Lead in development converted to a concrete plus.",
        sayShort: 'Re1 + Nc3 + Bg5 — pile on the centre.',
      },
    ],
  },
};
