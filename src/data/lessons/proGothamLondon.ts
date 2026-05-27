import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@GothamChess', 'concept:pos-development'];

// GothamChess's London System (White, D02). chess.js + explorer-verified,
// DB-anchored (...c5/...Qb6 mainline anchors 9). White-oriented.
export const PRO_GOTHAMCHESS_LONDON_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-london',
  sources: SRC,
  title: 'The London System — GothamChess Master Class',
  minutes: 9,
  orientation: 'white',
  beats: [
    {
      id: 'bishop-out',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4'],
      arrows: [{ from: 'f4', to: 'c7', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }],
      say: "Levy's number-one recommendation for club players: the London System. Get the dark-squared bishop out to f4 before anything else, where it rakes toward c7. The whole appeal is that you reach the same easy setup against almost everything — no memorizing twenty lines, just one harmonious plan you can play half-asleep and still get a good game.",
      sayShort: 'Bf4 — bishop out early, eyeing c7.',
    },
    {
      id: 'c5-qb6',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4', 'c5', 'e3', 'Qb6'],
      highlights: [{ square: 'b2', color: KEY }],
      say: "The one move that scares London beginners: c5 and Qb6, hitting the b2-pawn and the d4-centre at once. Levy's whole point is that you don't have to panic — there's a calm, memorable answer that defends everything and keeps White's pleasant position.",
      sayShort: '…c5 and …Qb6 — Black probes b2.',
    },
    {
      id: 'rb1',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3', 'a6', 'Rb1'],
      highlights: [{ square: 'b2', color: KEY }],
      say: "Nc3 develops and Rb1 quietly defends b2 — a useful move, not a passive one. White concedes nothing, keeps the harmonious structure, and Black has spent two moves on a queen sortie that goes nowhere. This is the antidote every London player needs to know cold.",
      sayShort: 'Nc3, Rb1 — calmly defend b2.',
    },
    {
      id: 'deep',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3', 'a6', 'Rb1', 'Nc6', 'Be2', 'Bf5', 'O-O', 'e6', 'Na4', 'Qa5', 'Nxc5', 'Bxc5', 'dxc5', 'Qxc5'],
      highlights: [{ square: 'c5', color: KEY }],
      say: "Once developed, White strikes: Na4 hits the queen and the c5-pawn, and after the trades on c5 White comes out a touch better with no risk at all. From a system you can learn in ten minutes, White reaches a comfortable, pleasant middlegame — exactly why Levy hands the London to every improving player.",
      sayShort: 'Na4 hits c5 — solid, risk-free pull.',
    },
  ],
};
