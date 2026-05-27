import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/watch?v=ktoa6lk6qNk', 'concept:pos-center'];

// Naroditsky's Alapin Sicilian (2.c3). White-oriented; spine chess.js +
// explorer-verified, DB-anchored (B22).
export const PRO_NARODITSKY_ALAPIN_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-alapin',
  sources: SRC,
  title: 'The Alapin Sicilian — Naroditsky Master Class',
  minutes: 10,
  orientation: 'white',
  beats: [
    {
      id: 'c3-idea',
      moves: ['e4', 'c5', 'c3'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'c3', color: SOFT }],
      say: "Against the Sicilian, Naroditsky sidesteps mountains of theory with c3 — the Alapin. The whole idea fits in one sentence: prepare d4, and build the big classical centre the Sicilian is designed to prevent. No memorizing sharp Najdorf lines; just sound development and a pawn centre that does the work.",
      sayShort: 'c3 — prepare d4, build the big centre.',
    },
    {
      id: 'e5-d4',
      moves: ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4'],
      highlights: [{ square: 'd4', color: KEY }, { square: 'd5', color: SOFT }],
      say: "Black's most testing try is Nf6, hitting e4 — so e5 chases the knight to d5, and d4 slams the centre open on your terms. The knight on d5 looks active but it's a target; every tempo you spend kicking it is a tempo you develop with. The centre is already yours.",
      sayShort: 'e5 then d4 — seize the centre.',
    },
    {
      id: 'develop',
      moves: ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'd6', 'Nf3', 'Nc6', 'Bc4'],
      arrows: [{ from: 'c4', to: 'd5', color: VIS }],
      highlights: [{ square: 'd5', color: KEY }],
      say: "Develop with purpose: Nf3 supports the centre, and Bc4 jabs straight at the d5-knight, asking it to declare itself. This is the Naroditsky method — no hurry, just natural moves that all point at Black's loose pieces. Black has spent the whole opening shuffling one knight while White builds a harmonious position.",
      sayShort: 'Nf3, Bc4 — develop and pressure d5.',
    },
    {
      id: 'queens-off',
      moves: ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'd6', 'Nf3', 'Nc6', 'Bc4', 'Nb6', 'Bb3', 'dxe5', 'dxe5', 'Qxd1+', 'Bxd1'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "When the centre tension resolves, the queens often come off — and that suits White perfectly. The pawn on e5 cramps Black, White's pieces are the more active, and there's zero risk. This is the grind Danya preaches: a small, permanent pull you convert with clean technique, the kind that turns a 1500 into a 2200.",
      sayShort: 'Queens off — e5 cramps, risk-free pull.',
    },
    {
      id: 'deep',
      moves: ['e4', 'c5', 'c3', 'Nf6', 'e5', 'Nd5', 'd4', 'cxd4', 'cxd4', 'd6', 'Nf3', 'Nc6', 'Bc4', 'Nb6', 'Bb3', 'dxe5', 'dxe5', 'Qxd1+', 'Bxd1', 'Nc4', 'Ba4', 'Bd7', 'Bxc6', 'Bxc6', 'Nbd2', 'Nb6', 'O-O', 'e6'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "Deep into the ending, the picture is settled: White's e5-pawn is a thorn, the pieces coordinate around it, and Black is left defending a slightly worse position with no counterplay. From a quiet anti-Sicilian, White has reached exactly the position the whole system aims for — better, safer, and easy to play. That is the Alapin's quiet promise kept.",
      sayShort: 'Better ending, e5 thorn, no Black counterplay.',
    },
  ],
};
