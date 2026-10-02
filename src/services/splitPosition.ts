// SPLIT THE POSITION (WO-TEACH-GAPS P3 method beat). When the kings have
// castled on OPPOSITE wings with queens on, the board is two separate games: a
// pawn storm on each side, and the one that arrives first usually decides it.
// The habit is to split the board and judge each half — and to value SPEED
// over a pawn. Earned only by the board: kings on opposite wings (a/b/c vs
// g/h files, each on its home rank), queens still on. Once per game.
// Reads the ONE king-wing fact (`boardStructure.kings`) — never a second
// definition of "opposite wings"; adds only the castled (home-rank) gate.
import type { Color } from 'chess.js';
import { describeStructure } from './boardStructure';

export interface SplitPosition { text: string; squares: string[] }

export function splitPosition(fen: string, student: Color): SplitPosition | null {
  const s = describeStructure(fen);
  if (!s || !s.material.queensOn || !s.kings.oppositeWings) return null;
  const foe: Color = student === 'w' ? 'b' : 'w';
  const home = (col: Color): boolean => s.kings.kingSquare[col][1] === (col === 'w' ? '1' : '8');
  if (!home(student) || !home(foe)) return null;
  const side = (col: Color): string => (s.kings.kingWing[col] === 'kingside' ? 'king' : 'queen');
  return {
    squares: [s.kings.kingSquare[student], s.kings.kingSquare[foe]],
    text: `The kings are on opposite wings, so split the board: your pawns go after their king on the ${side(foe)}side, theirs come at yours on the ${side(student)}side. It is a race — a tempo matters more than a pawn here.`,
  };
}
