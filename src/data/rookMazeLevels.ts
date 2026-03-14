import type { RookMazeLevel } from '../types/rookGames';

/**
 * Rook Maze Level Configurations
 *
 * Level 1: Wide open paths, 2 obstacles, par = 3
 *   Rook a1 → Target g7. Obstacles block a-file (a5) and g-file below g4 (g3).
 *   Optimal: a1→a4, a4→g4, g4→g7 (3 moves)
 *
 * Level 2: More obstacles, requires routing around blockades, par = 5
 *   Rook a1 → Target h8. Obstacles create multiple blockades.
 *   Optimal: a1→a4, a4→d4, d4→d7, d7→h7, h7→h8 (5 moves)
 *
 * Level 3: Dense obstacle layout, multiple dead ends, par = 7
 *   Rook a1 → Target h8. Dense obstacles force zig-zag routing.
 *   Optimal: a1→b1, b1→b4, b4→e4, e4→e8, e8→e7, e7→h7, h7→h8 (7 moves)
 */
export const ROOK_MAZE_LEVELS: RookMazeLevel[] = [
  {
    id: 1,
    name: 'Open Road',
    rookStart: 'a1',
    target: 'g7',
    obstacles: ['a5', 'g3'],
    par: 3,
    highlightTarget: true,
    highlightLegalMoves: true,
  },
  {
    id: 2,
    name: 'The Detour',
    rookStart: 'a1',
    target: 'h8',
    obstacles: ['a5', 'd1', 'e4', 'g8', 'h4'],
    par: 5,
    highlightTarget: true,
    highlightLegalMoves: false,
  },
  {
    id: 3,
    name: 'Castle Maze',
    rookStart: 'a1',
    target: 'h8',
    obstacles: ['a4', 'b5', 'c1', 'd6', 'e3', 'f5', 'f8', 'g5', 'h3', 'h6'],
    par: 7,
    highlightTarget: false,
    highlightLegalMoves: false,
  },
];
