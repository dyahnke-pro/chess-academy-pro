// THE loose-piece computer (Learn how to think P0c, 2026-10-04).
//
// A LOOSE piece is one with NO defender — attacked or not. That is Nunn's
// "Loose Pieces Drop Off" trigger, and it is a different fact from HANGING:
//   · loose   = nothing defends it (it may not be attacked yet) — a TARGET;
//   · hanging = it loses material to a capture now (`findHangingBySee`, SEE).
// A defended piece attacked by something cheaper hangs without being loose; an
// undefended queen nobody attacks yet is loose without hanging. Conflating the
// two is how chat answered "which of their pieces are loose?" with "Nothing of
// theirs is hanging" while their queen on b4 had no defender (walk defect 13).
//
// Before this file the app had two PRIVATE copies of this scan
// (`looseTrigger`'s inline filter and `moveContrast.looseAfter`). Both now call
// this one. A LEAF: chess.js + the piece-value table only.
import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js';
import { MATERIAL_VALUE } from './pieceValues';

export interface LoosePiece {
  square: Square;
  type: PieceSymbol;
  color: Color;
  /** Material worth (`MATERIAL_VALUE`): pawn 1 … queen 9. */
  value: number;
  /** Enemy pieces attacking it right now (empty = loose but not attacked yet). */
  attackers: Square[];
  attacked: boolean;
}

/**
 * Every undefended non-king unit on the board, both sides, in BOARD ORDER
 * (rank 8 → 1, file a → h — deterministic; callers sort for their own question).
 * `color` restricts the scan to one side. Accepts a FEN or a live `Chess` (so a
 * caller that has just played a move need not re-parse).
 */
export function findLoosePieces(position: string | Chess, color?: Color): LoosePiece[] {
  let c: Chess;
  if (typeof position === 'string') {
    try { c = new Chess(position); } catch { return []; }
  } else {
    c = position;
  }
  const out: LoosePiece[] = [];
  for (const row of c.board()) {
    for (const cell of row) {
      if (!cell || cell.type === 'k') continue;
      if (color && cell.color !== color) continue;
      if (c.attackers(cell.square, cell.color).length > 0) continue;
      const foe: Color = cell.color === 'w' ? 'b' : 'w';
      const attackers = c.attackers(cell.square, foe);
      out.push({
        square: cell.square,
        type: cell.type,
        color: cell.color,
        value: MATERIAL_VALUE[cell.type] ?? 0,
        attackers,
        attacked: attackers.length > 0,
      });
    }
  }
  return out;
}
