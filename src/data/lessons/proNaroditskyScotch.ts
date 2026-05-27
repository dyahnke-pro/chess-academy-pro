import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['https://www.youtube.com/@DanielNaroditskyGM', 'concept:pos-center'];

// Naroditsky's Scotch Game (White, C45). chess.js + explorer-verified,
// DB-anchored (4...Bc5 mainline anchors 12). White-oriented.
export const PRO_NARODITSKY_SCOTCH_LESSON: LessonScript = {
  openingId: 'pro-naroditsky-scotch',
  sources: SRC,
  title: 'The Scotch Game — Naroditsky Master Class',
  minutes: 10,
  orientation: 'white',
  beats: [
    {
      id: 'the-break',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
      highlights: [{ square: 'd4', color: KEY }],
      say: "On move three, while everyone else arranges a quiet Italian, the Scotch player smashes the centre open with d4 — and forces the conversation. Black either takes, or loses a pawn. This is Naroditsky's pitch: trade the slow maneuvering of 1.e4 e5 for an open, piece-active game where your central control does the talking from move three.",
      sayShort: 'd4 — force the centre open at once.',
    },
    {
      id: 'centralize',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5'],
      highlights: [{ square: 'd4', color: KEY }],
      say: "After exd4 Nxd4 the knight sits on the most centralized square on the board — eyeing b5, c6, e6 and f5. Black's most natural try is Bc5, hitting the knight and clamping the a7–g1 diagonal. Every Black setup now has to spend tempo dealing with that proud d4-knight; that lost time is White's opening edge.",
      sayShort: 'Nxd4 — the knight dominates the centre.',
    },
    {
      id: 'c3-prison',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3'],
      highlights: [{ square: 'c3', color: KEY }],
      say: "Be3 reinforces the knight and offers a trade of the dark bishops; Qf6 keeps the pressure; then c3 — the quiet prison. It seals the b4-square, braces d4, and prepares to expand. The pawn looks tiny but does the work of two pieces, holding White's centre together while the pieces get active.",
      sayShort: 'c3 — the quiet prison holds the centre.',
    },
    {
      id: 'bc4-f4',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O', 'd6', 'f4'],
      arrows: [{ from: 'c4', to: 'f7', color: VIS }],
      highlights: [{ square: 'f7', color: KEY }],
      say: "Bc4 rakes the long light diagonal at f7 — the soft square in front of Black's king — and after castling, f4 is the attacking signal. The f-file becomes White's invasion lane: a rook lift to f3, a knight reroute, and Black's king starts to sweat. The Scotch has quietly become a kingside attack.",
      sayShort: 'Bc4 hits f7, f4 opens the attack.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4', 'Bc5', 'Be3', 'Qf6', 'c3', 'Nge7', 'Bc4', 'O-O', 'O-O', 'd6', 'f4', 'Bb6', 'Na3', 'Nxd4', 'Bxd4', 'Bd7', 'Qd2', 'Bxd4+', 'cxd4', 'd5', 'e5'],
      highlights: [{ square: 'e5', color: KEY }],
      say: "When the dust settles, White owns a protected pawn duo on d4 and e5 that cramps Black and seizes the centre. The e5-pawn is a permanent thorn, the open lines favour White's active pieces, and the kingside beckons. From a three-move pawn break, White has built exactly the open, attacking position the Scotch is designed to deliver.",
      sayShort: 'd4–e5 pawn duo cramps; White attacks.',
    },
  ],
};
