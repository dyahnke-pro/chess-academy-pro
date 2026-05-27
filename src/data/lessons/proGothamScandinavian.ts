import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@GothamChess', 'concept:pos-development'];

// GothamChess's Scandinavian Defence (Black, B01). chess.js + explorer-verified,
// DB-anchored. Black-oriented.
export const PRO_GOTHAMCHESS_SCANDINAVIAN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-scandinavian',
  sources: SRC,
  title: 'The Scandinavian — GothamChess Master Class',
  minutes: 9,
  orientation: 'black',
  beats: [
    {
      id: 'the-trade',
      moves: ['e4', 'd5', 'exd5', 'Qxd5'],
      highlights: [{ square: 'd5', color: KEY }],
      say: "The Scandinavian is the opening Levy recommends to cut through the chaos of 1.e4: meet it with d5 right away. After exd5 Qxd5 Black has already traded off White's centre pawn and developed the queen, reaching a clear, easy-to-understand structure with none of the theory mazes of the Sicilian or French.",
      sayShort: '…d5 — trade the centre at once.',
    },
    {
      id: 'qa5',
      moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5'],
      highlights: [{ square: 'a5', color: KEY }],
      say: "Nc3 hits the queen with tempo — and that's fine. Qa5 tucks the queen onto a safe, active diagonal where it eyes a-file and the c3-knight, ready to support a quick queenside development. This is the classical main line: simple, sound, and the same plan against almost anything White tries.",
      sayShort: '…Qa5 — safe, active queen retreat.',
    },
    {
      id: 'setup',
      moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'c6', 'Bc4', 'Bg4'],
      arrows: [{ from: 'g4', to: 'f3', color: VIS }],
      highlights: [{ square: 'c6', color: SOFT }],
      say: "Black's setup is always the same and always solid: Nf6 develops, c6 gives the queen a retreat and shores up d5, and Bg4 pins the f3-knight before the light bishop can be locked in by …e6. Easy moves, every one with a purpose — exactly why Levy hands this to club players.",
      sayShort: '…c6 and …Bg4 — the solid Scandi setup.',
    },
    {
      id: 'deep',
      moves: ['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5', 'd4', 'Nf6', 'Nf3', 'c6', 'Bc4', 'Bg4', 'h3', 'Bh5', 'g4', 'Bg6', 'Ne5', 'e6', 'h4', 'Nbd7', 'Nxd7', 'Nxd7'],
      highlights: [{ square: 'g6', color: KEY }],
      say: "Even when White lunges with g4 and h4, Black stays calm: the bishop steps back to g6 where it's safe and useful, the knights trade on e5, and Black completes a rock-solid structure with …e6 and …Nbd7. White's pawn storm has only loosened his own king. Black has the safer position and a clear plan — the Scandinavian's quiet, dependable promise.",
      sayShort: "…Bg6 stays safe; the storm backfires.",
    },
  ],
};
