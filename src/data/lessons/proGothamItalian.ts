import type { LessonScript } from '../../types';

const VIS = 'rgba(40,185,95,0.92)';
const KEY = 'rgba(255,214,0,0.88)';
const SOFT = 'rgba(80,140,255,0.32)';
const SRC = ['concept:pos-development', 'concept:tac-fork', 'https://en.wikipedia.org/wiki/Italian_Game'];

// GothamChess's Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4). Levy plays it 66
// times in his white dump (40 wins). Two main Black responses: ...Bc5
// (35g, 69% — classical Italian) is the main pgn; ...Nf6 (30g) gets a
// variation tab. His real top win 10373188699 (vs 2767) carries the
// classical d4 break + central liquidation pattern.
export const PRO_GOTHAMCHESS_ITALIAN_LESSON: LessonScript = {
  openingId: 'pro-gothamchess-italian',
  sources: SRC,
  title: 'The Italian Game — GothamChess Master Class',
  minutes: 8,
  orientation: 'white',
  beats: [
    {
      id: 'bc4',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
      arrows: [{ from: 'c4', to: 'f7', color: VIS }],
      highlights: [{ square: 'c4', color: KEY }, { square: 'f7', color: SOFT }],
      say: "The Italian Game — Levy plays it in 66 games as White (40 wins). Bc4 is the move: bishop swings to c4 right out of the gate, trained on the f7-pawn — the weakest square in Black's camp. Classical, principled, and the bedrock of his e4 repertoire vs ...e5.",
      sayShort: 'Bc4 — bishop aimed at f7 from move 3.',
    },
    {
      id: 'bc5-d4',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd4'],
      highlights: [{ square: 'd4', color: KEY }],
      say: "Black mirrors with ...Bc5, both sides develop, and Levy castles immediately. Then comes d4! — the central break. Bc5 is now attacked AND Black's e5-pawn is hit at the same time. The symmetric Italian is about to crack open and whoever has the better-placed pieces will dictate the middlegame.",
      sayShort: 'd4! — central break shatters the symmetry.',
    },
    {
      id: 'liquidate',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd4', 'Bxd4', 'Nxd4', 'Nxd4', 'Bg5'],
      arrows: [{ from: 'g5', to: 'f6', color: VIS }],
      highlights: [{ square: 'g5', color: KEY }],
      say: "Black has to take or lose the e5-pawn. After ...Bxd4 Nxd4 Nxd4 the centre is liquidated and the position simplifies. Levy plays Bg5 immediately — pinning the f6-knight against the queen, daring Black to break the pin with ...h6 and create new weaknesses around the king.",
      sayShort: 'Bg5 — pin the knight, provoke ...h6.',
    },
    {
      id: 'deep',
      moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd4', 'Bxd4', 'Nxd4', 'Nxd4', 'Bg5', 'h6', 'Bh4', 'g5', 'f4', 'd6', 'fxg5', 'Bg4', 'Be2', 'Qf6'],
      arrows: [{ from: 'f4', to: 'g5', color: VIS }],
      highlights: [{ square: 'g5', color: KEY }, { square: 'f4', color: SOFT }],
      say: "From his real win vs a 2767 opponent: Black breaks the pin with ...h6 and ...g5, but the move ...g5 fatally weakens the kingside. f4! cracks open the f-file straight at Black's king, and fxg5 grabs the loose pawn while Black is still scrambling. From a quiet Italian symmetry, Levy has manufactured an open kingside attack and a winning structural advantage.",
      sayShort: 'f4 break — kingside cracks, attack rolls.',
    },
  ],
};
