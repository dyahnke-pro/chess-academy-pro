// engineLineRead — the engine's top lines read move by move (2026-11-19).
//
// The Danya have-check computers (batch 2) read the engine's lines on a board:
// UCI moves, the score White's view. One reader turns a line into chess.js
// moves on the board it starts from, and gives its score from either side.
// PURE: chess.js and the lines handed in (G0).
import { Chess, type Color, type Move } from 'chess.js';
import { seatCp } from './winChance';

/** An engine line: UCI moves from the board, the score White's view. */
export interface EngineLine { moves: readonly string[]; cp: number | null; mate: number | null }

/** The line's value for `side`, a mate on the one scale (`seatCp`). */
export function lineScore(l: EngineLine, side: Color): number {
  return seatCp({ evaluation: l.cp ?? 0, mate: l.mate }, side);
}

/** The line's moves played out on `fen` (stops at the first illegal move). */
export function playLine(fen: string, uci: readonly string[], plies = uci.length): { moves: Move[]; boards: string[] } {
  const moves: Move[] = []; const boards: string[] = [fen];
  let c: Chess;
  try { c = new Chess(fen); } catch { return { moves, boards }; }
  for (const u of uci.slice(0, plies)) {
    try {
      const m = c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      moves.push(m); boards.push(c.fen());
    } catch { break; }
  }
  return { moves, boards };
}

/** A move that is neither a capture nor a check nor a promotion. */
export function isQuiet(m: Move): boolean {
  return !m.captured && !m.promotion && !m.san.includes('+') && !m.san.includes('#');
}

/** The lines sorted best first for `side`. */
export function sortedLines(lines: readonly EngineLine[], side: Color): EngineLine[] {
  return [...lines].filter((l) => l.moves.length > 0).sort((a, b) => lineScore(b, side) - lineScore(a, side));
}

/** "you" / "they" words for a side, from the student's seat. */
export function seatWords(side: Color, student: Color): { who: string; whose: string; Whose: string } {
  return side === student ? { who: 'you', whose: 'your', Whose: 'Your' } : { who: 'they', whose: 'their', Whose: 'Their' };
}

export const PIECE_NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
export const other = (c: Color): Color => (c === 'w' ? 'b' : 'w');
