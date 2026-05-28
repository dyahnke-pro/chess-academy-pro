import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-development', 'concept:pos-center', 'https://en.wikipedia.org/wiki/Ponziani_Opening'];

// GothamChess Ponziani (1.e4 e5 2.Nf3 Nc6 3.c3). Levy plays it 35 wins in
// his dump (top vs 2908). Old-school sideline that prepares d4 without
// blocking the c-pawn. His real top win 100999372447 plays the e5 lunge
// + Qb3/Bb5 piece pressure pattern.
export const PRO_GOTHAMCHESS_PONZIANI_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-ponziani',
  sources: SRC,
  title: 'The Ponziani — GothamChess Master Class',
  minutes: 7,
  orientation: 'white',
  beats: [
    {
      id: 'c3',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3'],
      highlights: [{ square: 'c3', color: KEY }],
      say: "Levy plays the Ponziani as White — 35 wins in his game dump, top opponent 2908. The pawn move c3 looks like nothing but it's preparing d4 without blocking the c-pawn. The Ponziani is an old, overlooked sideline that catches Black completely unprepared — Levy's signature is sneaking the d4 break in for free.",
      sayShort: 'c3 — prepare d4 without blocking the c-pawn.',
    },
    {
      id: 'e5',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd4', 'exd4', 'e5'],
      arrows: [{ from: 'e4', to: 'e5', color: VIS }],
      highlights: [{ square: 'e5', color: KEY }],
      say: "After ...Nf6 d4 exd4, Levy hits e5 — the central pawn lunges to chase the f6-knight. The knight has nowhere comfortable: ...Nd5 (going to the rim) or ...Ng4 (asking for kicks). Black has accepted the central pawn but the position has cracked wide open with White's pieces ready to roll first.",
      sayShort: 'e5 lunge — chase the knight, open the centre.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'c3', 'Nf6', 'd4', 'exd4', 'e5', 'Nd5', 'Qb3', 'Nb6', 'cxd4', 'd6', 'Bb5', 'Be6', 'Qc2', 'Qd7', 'O-O', 'a6', 'Bxc6', 'Qxc6'],
      arrows: [{ from: 'b5', to: 'c6', color: VIS }],
      highlights: [{ square: 'b5', color: KEY }, { square: 'c6', color: SOFT }],
      say: "From his real win vs 2908: Black's knight bounces to d5 then b6, but Qb3 piles up on b7 and Bb5 pins the c6-knight to the queen. After cxd4 White owns the centre, the bishop on b5 trades Black's defender, and the Qc2/O-O setup leaves White with the better-placed pieces in an open position. Classic Ponziani: trade for structure, then squeeze.",
      sayShort: 'Qb3 + Bb5 — pin and trade for the squeeze.',
    },
  ],
};
