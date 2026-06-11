import type { ArmyLevel } from '../services/pieceArmyEngine';

// Pieces vs. Army — a PAIR of heroes hunts the marching pawn army.
// Every level is isArmySolvable-verified (armyLevels.test.ts). The pair
// is what makes it possible: 2 knights cover the board, 2 bishops cover
// BOTH colors — a lone knight/bishop can't catch a scattered army.

export const KNIGHT_ARMY_LEVELS: ArmyLevel[] = [
  { id: 1, name: 'First Hunt', heroes: [{ type: 'knight', square: 'c5' }, { type: 'knight', square: 'h2' }], pawns: ['c2', 'a3', 'g4'] },
  { id: 2, name: 'Closing In', heroes: [{ type: 'knight', square: 'g5' }, { type: 'knight', square: 'd3' }], pawns: ['f2', 'c4', 'g4', 'b4'] },
  { id: 3, name: 'No Escape', heroes: [{ type: 'knight', square: 'c5' }, { type: 'knight', square: 'g8' }], pawns: ['c2', 'a2', 'f2', 'f4', 'd2'] },
];

export const BISHOP_ARMY_LEVELS: ArmyLevel[] = [
  { id: 1, name: 'First Hunt', heroes: [{ type: 'bishop', square: 'c2' }, { type: 'bishop', square: 'h2' }], pawns: ['c3', 'e2', 'd2'] },
  { id: 2, name: 'Closing In', heroes: [{ type: 'bishop', square: 'b4' }, { type: 'bishop', square: 'f5' }], pawns: ['h4', 'c4', 'd3', 'a3'] },
  { id: 3, name: 'No Escape', heroes: [{ type: 'bishop', square: 'e1' }, { type: 'bishop', square: 'f1' }], pawns: ['h3', 'f4', 'b2', 'b3', 'd4'] },
];
