/**
 * THE COACH'S DIALS while a mission is live (WO-MISSIONS-01).
 *
 * "No attacks on pieces": while the student is learning to develop, the
 * coach's reply may not newly attack one of their pieces other than a pawn —
 * a knight kicked around is a piece moved twice for the coach's reasons, not
 * the student's. Pawn-on-pawn tension stays. A check is an attack on the king,
 * so it counts too.
 *
 * Pure (chess.js only). The engine (`coachGameEngine`) reads it over the
 * candidates it already has — the book's roads, then its own top lines inside
 * the lesson-steer strength window — so the coach still plays a move of its
 * level; it never searches for a new kind of move.
 */
import { Chess, type Color } from 'chess.js';

/** Squares of `student`'s non-pawn pieces (king included) the other side attacks. */
function attackedPieces(board: Chess, student: Color): string[] {
  const coach: Color = student === 'w' ? 'b' : 'w';
  const out: string[] = [];
  for (const row of board.board()) for (const cell of row) {
    if (!cell || cell.color !== student || cell.type === 'p') continue;
    if (board.isAttacked(cell.square, coach)) out.push(cell.square);
  }
  return out;
}

/** The student's non-pawn pieces this coach move NEWLY attacks (a piece it
 *  already stood attacked by stays out). Empty when the move is not legal. */
export function newlyAttackedPieces(fen: string, uci: string, student: Color): string[] {
  try {
    const board = new Chess(fen);
    const before = new Set(attackedPieces(board, student));
    board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return attackedPieces(board, student).filter((sq) => !before.has(sq));
  } catch {
    return [];
  }
}

export interface DialCandidate {
  uci: string;
  /** What the move costs the coach against its best, centipawns — absent for
   *  a book road (a move players at this level play is level-appropriate). */
  cpLoss?: number;
}

export interface DialedReply {
  uci: string;
  /** The move changed because the first choice attacked a piece. */
  swapped: boolean;
  /** Every acceptable candidate attacked a piece: the least costly was played. */
  forced: boolean;
  /** The pieces the played move newly attacks (empty unless forced). */
  attacks: string[];
}

/**
 * The reply to play with attacks on pieces off. The first choice stands when
 * it attacks nothing new; otherwise the first acceptable candidate (in the
 * order given — book roads by popularity, then engine lines cheapest first)
 * that attacks nothing; otherwise the least costly acceptable one, flagged
 * `forced`. Acceptable = no stated cost above `windowCp`.
 */
export function dialedReply(
  fen: string,
  student: Color,
  chosenUci: string,
  candidates: readonly DialCandidate[],
  windowCp: number,
): DialedReply {
  const firstAttacks = newlyAttackedPieces(fen, chosenUci, student);
  if (firstAttacks.length === 0) return { uci: chosenUci, swapped: false, forced: false, attacks: [] };
  const acceptable = candidates.filter((c) => c.uci !== chosenUci && (c.cpLoss === undefined || c.cpLoss <= windowCp));
  const quiet = acceptable.find((c) => newlyAttackedPieces(fen, c.uci, student).length === 0);
  if (quiet) return { uci: quiet.uci, swapped: true, forced: false, attacks: [] };
  // The least costly of everything acceptable, the first choice included —
  // a costed line can be the first choice itself (the engine's own best).
  const costed = candidates
    .filter((c) => c.cpLoss !== undefined && c.cpLoss <= windowCp)
    .sort((a, b) => (a.cpLoss ?? 0) - (b.cpLoss ?? 0));
  const cheapest = costed.length > 0 ? costed[0] : null;
  if (cheapest && cheapest.uci !== chosenUci) {
    return { uci: cheapest.uci, swapped: true, forced: true, attacks: newlyAttackedPieces(fen, cheapest.uci, student) };
  }
  return { uci: chosenUci, swapped: false, forced: true, attacks: firstAttacks };
}
