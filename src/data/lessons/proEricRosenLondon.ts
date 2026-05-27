import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://lichess.org/video/NKPsysr5Qqw', 'concept:pos-development'];

// Eric Rosen's London System (White, D02). Spine is chess.js + explorer-verified
// and DB-anchored to the ...c5/...Qb6 mainline (anchors 9 plies). The attacking
// Ne5/f4 plan lives in the middlegame plan + key ideas (it transposes, so it
// isn't the gated lesson spine). White-oriented.
export const PRO_ERICROSEN_LONDON_LESSON: LessonScript = {
  openingId: 'pro-ericrosen-london',
  sources: SRC,
  title: 'The London System — Eric Rosen Master Class',
  minutes: 10,
  orientation: 'white',
  beats: [
    {
      id: 'bishop-out',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4'],
      arrows: [{ from: 'f4', to: 'c7', color: VIS }],
      highlights: [{ square: 'c7', color: KEY }],
      say: "The London is the system Eric Rosen plays more than anything else, and it starts with one confident idea: get the dark-squared bishop outside the pawn chain with Bf4 before it can ever be buried. From f4 it rakes the long diagonal toward c7 and Black's queenside. You don't memorize lines here — you learn one harmonious setup and play it against almost everything.",
      sayShort: 'Bf4 — bishop out early, eyeing c7.',
    },
    {
      id: 'c5-qb6',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4', 'c5', 'e3', 'Qb6'],
      highlights: [{ square: 'b2', color: KEY }],
      say: "Black's most testing reply: c5 hits the d4-centre and Qb6 pokes at the loose b2-pawn, trying to provoke White into an awkward defence. This is the critical test of the whole system — and the London has a calm, confident answer that refuses to be rattled.",
      sayShort: '…c5 and …Qb6 — Black probes b2.',
    },
    {
      id: 'rb1',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3', 'a6', 'Rb1'],
      highlights: [{ square: 'b2', color: KEY }],
      say: "Nc3 develops and ignores the threat; then Rb1 quietly tucks the rook behind the b2-pawn. No panic, no concessions — White simply defends b2 with a useful developing move and keeps the harmonious structure intact. Black's provocation has cost him time he can't get back.",
      sayShort: 'Nc3, Rb1 — calmly defend b2.',
    },
    {
      id: 'na4',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3', 'a6', 'Rb1', 'Nc6', 'Be2', 'Bf5', 'O-O', 'e6', 'Na4'],
      arrows: [{ from: 'a4', to: 'c5', color: VIS }],
      highlights: [{ square: 'c5', color: KEY }],
      say: "Once developed and castled, White strikes back: Na4 jumps in, hitting the queen and the c5-pawn at the same time. The knight that looked offside on a4 is suddenly the most active piece on the board, forcing Black to resolve the tension on White's terms.",
      sayShort: 'Na4 — hit the queen and c5.',
    },
    {
      id: 'deep',
      moves: ['d4', 'Nf6', 'Nf3', 'd5', 'Bf4', 'c5', 'e3', 'Qb6', 'Nc3', 'a6', 'Rb1', 'Nc6', 'Be2', 'Bf5', 'O-O', 'e6', 'Na4', 'Qa5', 'Nxc5', 'Bxc5', 'dxc5', 'Qxc5'],
      highlights: [{ square: 'c5', color: KEY }],
      say: "Nxc5 trades off Black's bishop and after dxc5 Qxc5 the dust settles on c5 with White a touch better: the solid structure held, Black's queenside probe achieved nothing, and White keeps the freer game with no risk whatsoever. That is the London's quiet promise — a rock-solid system that hands the opponent no targets and White a small, durable pull.",
      sayShort: 'Trade on c5 — solid, small, risk-free pull.',
    },
  ],
};
