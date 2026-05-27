import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Naroditsky's Vienna Game (White, C29 Vienna Gambit). chess.js + explorer-
// verified, DB-anchored. White-oriented.
export const PRO_NARODITSKY_VIENNA_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-vienna',
  sources: SRC,
  title: 'The Vienna Gambit — Naroditsky Master Class',
  minutes: 10,
  orientation: 'white',
  beats: [
    {
      id: 'nc3',
      moves: ['e4', 'e5', 'Nc3'],
      arrows: [{ from: 'c3', to: 'e4', color: VIS }],
      highlights: [{ square: 'c3', color: KEY }],
      say: "The Vienna begins with Nc3 — the queen's knight first, supporting e4 and keeping the king's knight free. That single decision is the whole point: from c3 White can choose between three different attacking setups, and the sharpest of them is the gambit that's coming next.",
      sayShort: 'Nc3 — queen-knight first, keep options open.',
    },
    {
      id: 'f4-gambit',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4'],
      highlights: [{ square: 'f4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "f4 — the Vienna Gambit. White hurls the f-pawn at the centre, attacking e5 from the side exactly the way a King's Gambit would, but with the knight already developed to c3. The aim is a big pawn centre and an open f-file pointed at Black's king.",
      sayShort: 'f4 — the gambit, hit e5 from the side.',
    },
    {
      id: 'd5-counter',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "Black's best is the counter-strike d5; after fxe5 Nxe4 the centre is ablaze. White's pawn on e5 is a spearhead and Nf3 develops toward it. Both sides have active pieces and open lines — this is the rich, double-edged middlegame the Vienna Gambit is built to produce.",
      sayShort: 'fxe5 Nxe4 Nf3 — the centre catches fire.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e5', 'Nc3', 'Nf6', 'f4', 'd5', 'fxe5', 'Nxe4', 'Nf3', 'Bg4', 'Qe2', 'Nc5', 'd4', 'Bxf3', 'Qxf3', 'Qh4+', 'Qf2', 'Qxf2+', 'Kxf2', 'Ne6', 'Be3', 'c6'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'e5', color: SOFT }],
      say: "Even when the queens come off, White keeps the trumps: the broad d4-and-e5 pawn centre, the bishop pair, and the freer pieces. Black is solid but passive, forever defending against White's space. From a sharp gambit, White has steered into a pleasant, risk-free pull — and that flexibility is exactly why Naroditsky trusts the Vienna.",
      sayShort: "d4–e5 centre + bishop pair — White better.",
    },
  ],
};
