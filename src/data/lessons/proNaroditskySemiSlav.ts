import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Naroditsky's Semi-Slav (Black, D43/D47). chess.js + explorer-verified,
// DB-anchored (Meran anchors 16). Black-oriented.
export const PRO_NARODITSKY_SEMI_SLAV_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-semi-slav',
  sources: SRC,
  title: 'The Semi-Slav — Naroditsky Master Class',
  minutes: 10,
  orientation: 'black',
  beats: [
    {
      id: 'triangle',
      moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6'],
      highlights: [{ square: 'd5', color: KEY }],
      say: "The Semi-Slav builds the most solid pawn triangle in chess — c6, d5 and e6 — fusing the rock-solid Slav with the flexible Queen's Gambit Declined. The d5-pawn is bombproof, every piece has a natural home, and Black keeps the tension, waiting to choose between a quiet game and the sharpest gambits in opening theory.",
      sayShort: 'c6/d5/e6 — the rock-solid triangle.',
    },
    {
      id: 'meran',
      moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5'],
      highlights: [{ square: 'b5', color: KEY }],
      say: "When White plays the quiet e3, Black uncorks the Meran: dxc4 followed by b5, hitting the bishop and grabbing queenside space with tempo. Suddenly the solid Semi-Slav has teeth — Black expands on the queenside, fianchettoes the light bishop, and seizes the initiative on that wing.",
      sayShort: '…dxc4 and …b5 — the Meran expansion.',
    },
    {
      id: 'c5-bb7',
      moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'a6', 'O-O', 'c5'],
      highlights: [{ square: 'c5', color: KEY }],
      say: "Black continues the plan: a6 props up the b5-pawn and c5 strikes the centre. The light-squared bishop will come to b7, raking the long diagonal at e4 and White's king. Black has converted the quiet triangle into an active queenside-and-centre counterattack — the Meran's whole point.",
      sayShort: '…c5 — strike the centre, free the bishop.',
    },
    {
      id: 'deep',
      moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'e6', 'e3', 'Nbd7', 'Bd3', 'dxc4', 'Bxc4', 'b5', 'Bd3', 'a6', 'O-O', 'c5', 'Qe2', 'Bb7', 'Rd1', 'Qb6'],
      arrows: [{ from: 'b7', to: 'e4', color: VIS }],
      highlights: [{ square: 'b7', color: KEY }],
      say: "By the middlegame Black is fully mobilized: the bishop on b7 rakes the long diagonal toward e4, the queen and rooks eye the half-open c-file and the d4-pawn, and the queenside majority is rolling. Black has equalised and more from a quiet-looking opening — solid as the Slav, dangerous as a gambit. That balance is why Naroditsky trusts the Semi-Slav.",
      sayShort: 'Bb7 rakes e4; queenside rolls.',
    },
  ],
};
