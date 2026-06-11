import type { PieceRaceLevel } from '../types/pieceRace';

// Time-trial race courses — capture every target as fast as you can.
// 5 pieces × 3 courses (pawn omitted: its forward-only capture makes
// multi-target races mostly unsolvable, and the pawn hub already has
// Pawn Wars / Blocker). Every course is BFS-validated capture-all
// solvable; goldSec/silverSec are derived from the optimal route
// (≈3s/move gold, ≈6s/move silver) — see scripts/audit-kid-puzzles-static.
export const PIECE_RACE_LEVELS: PieceRaceLevel[] = [
  // ─── KNIGHT ─────────────────────────────────────────────────────────
  { piece: 'knight', id: 1, name: 'Warm-Up Dash', pieceStart: 'b6', targets: ['c8', 'c3', 'g5'], goldSec: 18, silverSec: 36 },
  { piece: 'knight', id: 2, name: 'Quick Sprint', pieceStart: 'd1', targets: ['c4', 'd5', 'c6', 'a5'], goldSec: 18, silverSec: 36 },
  { piece: 'knight', id: 3, name: 'Speed Run', pieceStart: 'd8', targets: ['d5', 'e2', 'a5', 'c3', 'b4'], goldSec: 21, silverSec: 42 },

  // ─── BISHOP ─────────────────────────────────────────────────────────
  { piece: 'bishop', id: 1, name: 'Warm-Up Dash', pieceStart: 'h1', targets: ['f7', 'a8', 'c6'], goldSec: 12, silverSec: 24 },
  { piece: 'bishop', id: 2, name: 'Quick Sprint', pieceStart: 'f2', targets: ['a3', 'h6', 'b4', 'e1'], goldSec: 15, silverSec: 30 },
  { piece: 'bishop', id: 3, name: 'Speed Run', pieceStart: 'f5', targets: ['a2', 'g2', 'c6', 'a4', 'd7'], goldSec: 21, silverSec: 42 },

  // ─── ROOK ───────────────────────────────────────────────────────────
  { piece: 'rook', id: 1, name: 'Warm-Up Dash', pieceStart: 'h8', targets: ['g1', 'c3', 'e1'], goldSec: 15, silverSec: 30 },
  { piece: 'rook', id: 2, name: 'Quick Sprint', pieceStart: 'c6', targets: ['g7', 'a3', 'g2', 'f1'], goldSec: 21, silverSec: 42 },
  { piece: 'rook', id: 3, name: 'Speed Run', pieceStart: 'c5', targets: ['b2', 'g5', 'd7', 'e2', 'b3'], goldSec: 21, silverSec: 42 },

  // ─── QUEEN ──────────────────────────────────────────────────────────
  { piece: 'queen', id: 1, name: 'Warm-Up Dash', pieceStart: 'h4', targets: ['e8', 'b8', 'c4'], goldSec: 12, silverSec: 24 },
  { piece: 'queen', id: 2, name: 'Quick Sprint', pieceStart: 'c8', targets: ['b8', 'e6', 'd1', 'd7'], goldSec: 15, silverSec: 30 },
  { piece: 'queen', id: 3, name: 'Speed Run', pieceStart: 'g1', targets: ['b8', 'b1', 'f7', 'b6', 'e3'], goldSec: 18, silverSec: 36 },

  // ─── KING ───────────────────────────────────────────────────────────
  { piece: 'king', id: 1, name: 'Warm-Up Dash', pieceStart: 'a8', targets: ['b5', 'a5', 'd4'], goldSec: 18, silverSec: 36 },
  { piece: 'king', id: 2, name: 'Quick Sprint', pieceStart: 'c6', targets: ['d7', 'd5', 'b3', 'a5'], goldSec: 21, silverSec: 42 },
  { piece: 'king', id: 3, name: 'Speed Run', pieceStart: 'd2', targets: ['a6', 'b5', 'c5', 'c2', 'd4'], goldSec: 18, silverSec: 36 },
];
