import type { BishopVsPawnsLevel, ColorWarsLevel } from '../types';

// ─── Bishop vs. Pawns Levels ────────────────────────────────────────────────
// All pawns start on light squares so the light-squared bishop can reach them.
// Pawns advance toward rank 1 after each bishop move.

export const BISHOP_VS_PAWNS_LEVELS: BishopVsPawnsLevel[] = [
  {
    level: 1,
    description: 'Catch 3 pawns before they promote!',
    bishopStart: 'd2',
    pawnSquares: ['b6', 'f6', 'd6'],
    showBishopMoves: true,
    showThreatenedSquares: true,
  },
  {
    level: 2,
    description: '5 pawns — some are close to promotion!',
    bishopStart: 'c1',
    pawnSquares: ['b6', 'd6', 'f6', 'c5', 'e5'],
    showBishopMoves: false,
    showThreatenedSquares: true,
  },
  {
    level: 3,
    description: '6 pawns, no highlights — be precise!',
    bishopStart: 'f2',
    pawnSquares: ['a7', 'c7', 'e7', 'b4', 'd4', 'f4'],
    showBishopMoves: false,
    showThreatenedSquares: false,
  },
];

// ─── Color Wars Levels ──────────────────────────────────────────────────────
// Player controls two bishops (one on light squares, one on dark).
// Must capture all enemy pieces before the timer runs out.

export const COLOR_WARS_LEVELS: ColorWarsLevel[] = [
  {
    level: 1,
    description: 'Clear 6 enemies with two bishops!',
    lightBishopStart: 'c2',
    darkBishopStart: 'f3',
    enemyPieces: [
      // 3 on light squares
      { square: 'b5', piece: 'p' },
      { square: 'f5', piece: 'p' },
      { square: 'd7', piece: 'p' },
      // 3 on dark squares
      { square: 'c6', piece: 'p' },
      { square: 'e6', piece: 'p' },
      { square: 'g4', piece: 'p' },
    ],
    timerSeconds: 60,
    showBishopMoves: true,
    showEnemyGlow: true,
  },
  {
    level: 2,
    description: '8 enemies — uneven split, a rook too!',
    lightBishopStart: 'b2',
    darkBishopStart: 'g3',
    enemyPieces: [
      // 5 on light squares
      { square: 'a3', piece: 'p' },
      { square: 'c5', piece: 'p' },
      { square: 'e7', piece: 'p' },
      { square: 'g5', piece: 'p' },
      { square: 'e3', piece: 'r' },
      // 3 on dark squares
      { square: 'b6', piece: 'p' },
      { square: 'd4', piece: 'p' },
      { square: 'f6', piece: 'p' },
    ],
    timerSeconds: 45,
    showBishopMoves: false,
    showEnemyGlow: true,
  },
  {
    level: 3,
    description: '10 enemies, tight timer, no help!',
    lightBishopStart: 'd2',
    darkBishopStart: 'e1',
    enemyPieces: [
      // 5 on light squares
      { square: 'a3', piece: 'p' },
      { square: 'c5', piece: 'p' },
      { square: 'e7', piece: 'p' },
      { square: 'g5', piece: 'p' },
      { square: 'g7', piece: 'r' },
      // 5 on dark squares
      { square: 'b4', piece: 'p' },
      { square: 'd6', piece: 'p' },
      { square: 'f6', piece: 'p' },
      { square: 'h4', piece: 'p' },
      { square: 'b6', piece: 'p' },
    ],
    timerSeconds: 35,
    showBishopMoves: false,
    showEnemyGlow: false,
  },
];
