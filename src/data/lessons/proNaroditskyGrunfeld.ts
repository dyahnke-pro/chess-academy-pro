import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Naroditsky's Grünfeld Defence (Black, D85). chess.js + explorer-verified,
// DB-anchored. Black-oriented.
export const PRO_NARODITSKY_GRUNFELD_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-grunfeld',
  sources: SRC,
  title: 'The Grünfeld Defence — Naroditsky Master Class',
  minutes: 10,
  orientation: 'black',
  beats: [
    {
      id: 'hypermodern',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
      highlights: [{ square: 'd5', color: KEY }],
      say: "The Grünfeld is hypermodern chess at its purest: with d5 Black invites White to build a giant pawn centre — and then sets out to prove it's a weakness, not a strength. Instead of occupying the centre, Black will surround it, chip at it, and tear it down with piece pressure and pawn breaks.",
      sayShort: '…d5 — invite the big centre, then attack it.',
    },
    {
      id: 'exchange',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7'],
      arrows: [{ from: 'g7', to: 'd4', color: VIS }],
      highlights: [{ square: 'd4', color: KEY }],
      say: "In the Exchange, White grabs the centre — pawns on c3, d4 and e4 — and Black fianchettoes Bg7, the soul of the Grünfeld. From g7 the bishop stares down the long diagonal straight at the d4-pawn and the heart of White's centre. That bishop is the engine of everything Black does.",
      sayShort: 'Bg7 — the bishop targets d4.',
    },
    {
      id: 'c5-break',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Nf3', 'c5'],
      highlights: [{ square: 'c5', color: KEY }],
      say: "c5 — the thematic break. Black strikes at the base of White's centre, hitting d4 and threatening to dissolve it. If White's centre falls, the big pawns become weak pawns; if it holds, Black piles up with …Nc6, …Bg4 and …Qa5. Either way White must spend the game defending what looked so impressive.",
      sayShort: '…c5 — strike the base of the centre.',
    },
    {
      id: 'deep',
      moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5', 'cxd5', 'Nxd5', 'e4', 'Nxc3', 'bxc3', 'Bg7', 'Nf3', 'c5', 'Be3', 'O-O', 'Be2', 'Nc6', 'O-O', 'Bg4', 'd5', 'Bxf3'],
      highlights: [{ square: 'd5', color: KEY }],
      say: "Black piles in: …Nc6 hits d4, …Bg4 pins the f3-knight that defends it. When White pushes d5 to escape the pressure, …Bxf3 rips away the defender and the centre comes under fire from every Black piece. White's pawns are now targets, exactly as the Grünfeld promised from move three — give them the centre, then take it apart.",
      sayShort: '…Bg4 pins; …Bxf3 cracks the centre.',
    },
  ],
};
