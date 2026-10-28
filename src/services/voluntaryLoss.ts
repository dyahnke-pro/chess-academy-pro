// voluntaryLoss — WAS THE MATERIAL GIVEN, OR ALREADY LOST? A move that hands
// over material is a sacrifice only when the mover had a cheaper choice. The
// review called two forced losses "a stunning queen sacrifice" (review depth
// eval 2026-10-28, David's game chesscom-142972137384): Qxc1 took the rook
// pinning the queen to the king — every move lost the queen for a rook — and
// …Qxe5 answered a check that also hit the queen. Pure chess.js + the one SEE.
import { Chess } from 'chess.js';
import { legalSeeGainOn } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';

/** What the mover is down right after `chess`'s last move once the opponent
 *  takes the best thing on offer: the opponent's best legal exchange on any of
 *  the mover's pieces, less what the move itself captured. `chess` has the
 *  opponent to move; it is restored unchanged. */
function exposure(chess: Chess, captured: string | undefined): number {
  const mover = chess.turn() === 'w' ? 'b' : 'w';
  let best = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq || sq.color !== mover || sq.type === 'k') continue;
      best = Math.max(best, legalSeeGainOn(chess, sq.square));
    }
  }
  return best - (captured ? (MATERIAL_VALUE[captured] ?? 0) : 0);
}

/** How much more `san` loses at once than the mover's least-losing legal move,
 *  in pawns; null when the board or the move is unreadable. ≥ 1 means the
 *  material was GIVEN; 0 means every choice lost it (damage limitation). */
export function lossBeyondBestAlternative(fenBefore: string, san: string): number | null {
  let board: Chess;
  try { board = new Chess(fenBefore); } catch { return null; }
  let played: number | null = null;
  let least = Infinity;
  for (const m of board.moves({ verbose: true })) {
    board.move(m.san);
    const loss = board.isCheckmate() ? -Infinity : exposure(board, m.captured);
    board.undo();
    least = Math.min(least, loss);
    if (m.san === san || m.san.replace(/[+#]$/, '') === san.replace(/[+#!?]+$/, '')) played = loss;
  }
  if (played === null || !Number.isFinite(least)) return played === null ? null : 0;
  return played - least;
}
