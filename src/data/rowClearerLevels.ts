import type { RowClearerLevel } from '../types/rookGames';

/**
 * Row Clearer Level Configurations
 *
 * Level 1: 4 pawns, one rook, par = 4
 *   Rook a1. Pawns form a rectangle on c1/f1/c6/f6.
 *   Optimal: a1→c1, c1→c6, c6→f6, f6→f1 (4 moves, 4 captures)
 *
 * Level 2: 6 pawns, one rook, par = 7
 *   Rook a1. Pawns at b3/d3/f3/b6/d6/f6 (two rows of 3).
 *   Optimal: a1→a3, a3→b3, b3→b6, b6→d6, d6→d3, d3→f3, f3→f6 (7 moves)
 *
 * Level 3: 8 pawns, two rooks, par = 8
 *   Rooks at a1/h8. Pawns at a3/a6/c3/c6/f3/f6/h3/h6 (symmetric).
 *   Optimal: split board — each rook handles 4 pawns in 4 moves.
 */
export const ROW_CLEARER_LEVELS: RowClearerLevel[] = [
  {
    id: 1,
    name: 'First Sweep',
    rooks: ['a1'],
    enemies: ['c1', 'f1', 'c6', 'f6'],
    par: 4,
    highlightCaptures: true,
    highlightLegalMoves: true,
  },
  {
    id: 2,
    name: 'Double Row',
    rooks: ['a1'],
    enemies: ['b3', 'd3', 'f3', 'b6', 'd6', 'f6'],
    par: 7,
    highlightCaptures: true,
    highlightLegalMoves: false,
  },
  {
    id: 3,
    name: 'Rook Duo',
    rooks: ['a1', 'h8'],
    enemies: ['a3', 'a6', 'c3', 'c6', 'f3', 'f6', 'h3', 'h6'],
    par: 8,
    highlightCaptures: false,
    highlightLegalMoves: false,
  },
];
