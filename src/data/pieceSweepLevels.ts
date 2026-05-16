import type { PieceSweepLevel } from '../types/pieceSweep';

// 5 hand-crafted sweep levels per piece × 6 pieces = 30 new sandbox
// levels. Win condition: capture every target. Move count vs par
// yields 1-3 stars (same formula as the maze and existing Rook Maze /
// Knight Sweep games).
//
// All 30 levels BFS-validated solvable + par achievable — see the
// validation script at the bottom of this file's commit message.

export const PIECE_SWEEP_LEVELS: PieceSweepLevel[] = [
  // ─── KING (1-square moves) ─────────────────────────────────────────
  {
    piece: 'king', id: 1, name: 'Two Targets',
    pieceStart: 'd4', targets: ['c5', 'e3'], obstacles: [], par: 3,
  },
  {
    piece: 'king', id: 2, name: 'Diagonal Sweep',
    pieceStart: 'a1', targets: ['b2', 'c3'], obstacles: [], par: 2,
  },
  {
    piece: 'king', id: 3, name: 'Triangle',
    pieceStart: 'd4', targets: ['c5', 'e5', 'd6'], obstacles: [], par: 4,
  },
  {
    piece: 'king', id: 4, name: 'L-Shape Walk',
    pieceStart: 'a1', targets: ['c1', 'c3'], obstacles: [], par: 4,
  },
  {
    piece: 'king', id: 5, name: 'Five-Square Tour',
    pieceStart: 'd4', targets: ['c5', 'e5', 'e3', 'c3', 'd5'], obstacles: [], par: 7,
  },

  // ─── QUEEN (sliding all 8 directions) ──────────────────────────────
  {
    piece: 'queen', id: 1, name: 'Three in a Row',
    pieceStart: 'a1', targets: ['a4', 'a7'], obstacles: [], par: 2,
  },
  {
    piece: 'queen', id: 2, name: 'Diagonal Sweep',
    pieceStart: 'a1', targets: ['d4', 'h8'], obstacles: [], par: 2,
  },
  {
    piece: 'queen', id: 3, name: 'Cross Pattern',
    pieceStart: 'd4', targets: ['d8', 'h4', 'd1', 'a4'], obstacles: [], par: 4,
  },
  {
    piece: 'queen', id: 4, name: 'Star Pattern',
    pieceStart: 'd4', targets: ['a1', 'h8', 'a7', 'g1'], obstacles: [], par: 4,
  },
  {
    piece: 'queen', id: 5, name: 'Five Captures',
    pieceStart: 'a1', targets: ['c3', 'f6', 'h1', 'a8', 'c8'], obstacles: [], par: 5,
  },

  // ─── ROOK (straight lines) ─────────────────────────────────────────
  {
    piece: 'rook', id: 1, name: 'Same File',
    pieceStart: 'a1', targets: ['a4', 'a8'], obstacles: [], par: 2,
  },
  {
    piece: 'rook', id: 2, name: 'L-Pattern',
    pieceStart: 'a1', targets: ['a5', 'd5'], obstacles: [], par: 2,
  },
  {
    piece: 'rook', id: 3, name: 'Three Corners',
    pieceStart: 'a1', targets: ['a8', 'h8', 'h1'], obstacles: [], par: 3,
  },
  {
    piece: 'rook', id: 4, name: 'Box Sweep',
    pieceStart: 'a1', targets: ['a4', 'd4', 'd1', 'b1'], obstacles: [], par: 4,
  },
  {
    piece: 'rook', id: 5, name: 'Five Rooks Job',
    pieceStart: 'a1', targets: ['a4', 'd4', 'd7', 'g7', 'g1'], obstacles: [], par: 5,
  },

  // ─── BISHOP (diagonals) ────────────────────────────────────────────
  {
    piece: 'bishop', id: 1, name: 'Same Diagonal',
    pieceStart: 'a1', targets: ['c3', 'h8'], obstacles: [], par: 2,
  },
  {
    piece: 'bishop', id: 2, name: 'Diagonal Switch',
    pieceStart: 'a1', targets: ['c3', 'a5'], obstacles: [], par: 2,
  },
  {
    piece: 'bishop', id: 3, name: 'Three Diagonals',
    pieceStart: 'a1', targets: ['d4', 'd2', 'b4'], obstacles: [], par: 4,
  },
  {
    piece: 'bishop', id: 4, name: 'Four Captures',
    pieceStart: 'a1', targets: ['c3', 'b4', 'd2', 'a5'], obstacles: [], par: 4,
  },
  {
    piece: 'bishop', id: 5, name: 'Bishop Sweep',
    pieceStart: 'c1', targets: ['e3', 'g5', 'f4', 'd6', 'b4'], obstacles: [], par: 6,
  },

  // ─── KNIGHT (L-jumps) ──────────────────────────────────────────────
  {
    piece: 'knight', id: 1, name: 'One Hop Two',
    pieceStart: 'b1', targets: ['c3', 'a3'], obstacles: [], par: 3,
  },
  {
    piece: 'knight', id: 2, name: 'Knight Triangle',
    pieceStart: 'b1', targets: ['c3', 'd2'], obstacles: [], par: 3,
  },
  {
    piece: 'knight', id: 3, name: 'Three Hop',
    pieceStart: 'b1', targets: ['c3', 'a3', 'd2'], obstacles: [], par: 5,
  },
  {
    piece: 'knight', id: 4, name: 'Knight Square',
    pieceStart: 'd4', targets: ['b3', 'b5', 'f5', 'f3'], obstacles: [], par: 7,
  },
  {
    piece: 'knight', id: 5, name: 'Five-Jump Sweep',
    pieceStart: 'd4', targets: ['b3', 'b5', 'f5', 'f3', 'e2'], obstacles: [], par: 9,
  },

  // ─── PAWN (diagonal captures only — limited geometry) ─────────────
  // Pawns can only capture diagonally one square forward, so sweep
  // levels are necessarily short and use diagonal target trails.
  {
    piece: 'pawn', id: 1, name: 'First Capture',
    pieceStart: 'a2', targets: ['b3'], obstacles: [], par: 1,
  },
  {
    piece: 'pawn', id: 2, name: 'Trail of Two',
    pieceStart: 'a2', targets: ['b3', 'c4'], obstacles: [], par: 2,
  },
  {
    piece: 'pawn', id: 3, name: 'Zigzag',
    pieceStart: 'a2', targets: ['b3', 'a4'], obstacles: [], par: 2,
  },
  {
    piece: 'pawn', id: 4, name: 'Three Diagonals',
    pieceStart: 'b2', targets: ['c3', 'd4', 'e5'], obstacles: [], par: 3,
  },
  {
    piece: 'pawn', id: 5, name: 'Pawn Sweep',
    pieceStart: 'a2', targets: ['b3', 'c4', 'd5', 'e6'], obstacles: [], par: 4,
  },
];

export function getSweepLevelsForPiece(
  piece: PieceSweepLevel['piece'],
): PieceSweepLevel[] {
  return PIECE_SWEEP_LEVELS.filter((l) => l.piece === piece);
}
