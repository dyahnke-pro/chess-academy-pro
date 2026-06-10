/**
 * arrowGrounding — drop ungrounded coach arrows before they render.
 *
 * The coach emits `[BOARD: arrow:from-to:color]` markers. Nothing verified
 * them against the board, so the brain could (and did — David's audit
 * 2026-06-10) scatter arrows that start on empty squares or cut across the
 * board in ways the piece can't actually move/see. This filters an arrow set
 * down to the ones that are GROUNDED: the `from` square holds a real piece,
 * and that piece geometrically sees `to` with a clear path (side-agnostic —
 * the coach legitimately arrows BOTH the student's moves and the opponent's
 * threats, so we can't use "legal moves for the side to move"). Also caps the
 * count so a turn never clutters the board.
 */
import { Chess } from 'chess.js';
import type { BoardArrow } from '../types';

const FILES = 'abcdefgh';

function fileIdx(sq: string): number {
  return FILES.indexOf(sq[0]);
}
function rankIdx(sq: string): number {
  return Number(sq[1]) - 1;
}
function squareAt(file: number, rank: number): string {
  return `${FILES[file]}${rank + 1}`;
}

/** True when the piece on `from` sees `to` by its movement geometry with a
 *  clear path (blockers stop sliders). `to` may be empty or occupied — sight
 *  to a piece (a threat / a defended square) is grounded. */
function pieceSees(game: Chess, from: string, to: string): boolean {
  if (from === to) return false;
  const piece = game.get(from as Parameters<Chess['get']>[0]);
  if (!piece) return false; // arrow from an empty square — ungrounded

  const af = fileIdx(from);
  const ar = rankIdx(from);
  const bf = fileIdx(to);
  const br = rankIdx(to);
  if (af < 0 || bf < 0 || ar < 0 || br < 0) return false;
  const df = bf - af;
  const dr = br - ar;
  const adf = Math.abs(df);
  const adr = Math.abs(dr);

  const pathClear = (): boolean => {
    const sf = Math.sign(df);
    const sr = Math.sign(dr);
    let cf = af + sf;
    let cr = ar + sr;
    while (cf !== bf || cr !== br) {
      if (game.get(squareAt(cf, cr) as Parameters<Chess['get']>[0])) return false;
      cf += sf;
      cr += sr;
    }
    return true;
  };

  switch (piece.type) {
    case 'n':
      return (adf === 1 && adr === 2) || (adf === 2 && adr === 1);
    case 'k':
      return adf <= 1 && adr <= 1;
    case 'b':
      return adf === adr && pathClear();
    case 'r':
      return (df === 0 || dr === 0) && pathClear();
    case 'q':
      return (adf === adr || df === 0 || dr === 0) && pathClear();
    case 'p': {
      // Pawn: forward push (1, or 2 from its start rank, path clear) or a
      // diagonal capture/sight by one. Direction depends on colour.
      const dir = piece.color === 'w' ? 1 : -1;
      const startRank = piece.color === 'w' ? 1 : 6;
      if (adf === 0 && dr === dir && !game.get(to as Parameters<Chess['get']>[0])) return true;
      if (adf === 0 && dr === 2 * dir && ar === startRank && pathClear()) return true;
      if (adf === 1 && dr === dir) return true; // diagonal capture / sight
      return false;
    }
    default:
      return false;
  }
}

/** Keep only grounded arrows (piece on `from` sees `to`), de-duplicated and
 *  capped at `max`. Returns the input unchanged (just capped) if the FEN
 *  can't be parsed, so a bad FEN never blanks the board. */
export function groundArrows(
  arrows: ReadonlyArray<BoardArrow>,
  fen: string,
  max = 5,
): BoardArrow[] {
  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return arrows.slice(0, max);
  }
  const seen = new Set<string>();
  const out: BoardArrow[] = [];
  for (const arrow of arrows) {
    const key = `${arrow.startSquare}-${arrow.endSquare}`;
    if (seen.has(key)) continue;
    if (pieceSees(game, arrow.startSquare, arrow.endSquare)) {
      out.push(arrow);
      seen.add(key);
      if (out.length >= max) break;
    }
  }
  return out;
}
