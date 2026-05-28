import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/watch?v=ECMMct_jnEM', 'concept:pos-development', 'https://en.wikipedia.org/wiki/London_System'];

// Gotham London variation tab — keyed `pro-gothamchess-london::<name>`.
// Vs ...c5 is the most common Black anti-London setup; Levy plays it
// (top game 105226941913 vs 2463) AND teaches the London in his "How to
// Win with the London System!" YouTube video. The Bg3 retreat + slow
// piece-build pattern is his real approach.
export const PRO_GOTHAMCHESS_LONDON_VARIATION_LESSONS: Record<string, LessonScript> = {
  'pro-gothamchess-london::vs 2...c5 (Anti-London)': {
    openingId: 'pro-gothamchess-london',
    sources: SRC,
    title: 'London — vs 2...c5 (Bg3 retreat + slow build)',
    minutes: 6,
    orientation: 'white',
    beats: [
      {
        id: 'c5-bg3',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Nc6', 'Nbd2', 'e6'],
        highlights: [{ square: 'f4', color: KEY }],
        say: "When Black challenges the centre with ...c5, Levy keeps his head: e3 quietly supports the d4-pawn, then Nbd2 develops naturally. The Bf4-bishop is the London's whole point and Levy refuses to be hassled off it — Black's ...c5 will resolve into either a trade or a structure where the bishop still dominates the dark squares.",
        sayShort: 'e3 + Nbd2 — calm vs ...c5.',
      },
      {
        id: 'c5-deep',
        moves: ['d4', 'd5', 'Nf3', 'Nf6', 'Bf4', 'c5', 'e3', 'Nc6', 'Nbd2', 'e6', 'c3', 'Bd6', 'Bg3', 'O-O', 'Be2', 'b6', 'O-O', 'Bb7', 'h3', 'Ne7', 'Ne5', 'Nf5'],
        arrows: [{ from: 'g3', to: 'd6', color: VIS }],
        highlights: [{ square: 'g3', color: KEY }, { square: 'e5', color: SOFT }],
        say: "From his real win vs 2463: when Black offers the bishop trade with ...Bd6, Levy slides back to g3 — keeping the bishop pair AND keeping the bishop trained on the kingside dark squares. The pattern unfolds: O-O for safety, h3 to make a luft, Ne5 jumps to the central outpost. From a quiet London, every piece is now active and Black is the one searching for a plan.",
        sayShort: 'Bg3 — keep the bishop, then Ne5 outpost.',
      },
    ],
  },
};
