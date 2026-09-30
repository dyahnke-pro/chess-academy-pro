// WHAT THEIR MOVE COST THEM (census #5, 382 of his lines): "…e6 opens a square
// your knight jumps into", "…c5 leaves a hole on d5", "the passive …d6 blocks in
// the bishop", "a queen trade would have cost them castling".
//
// Pure board diff of the opponent's move, from the STUDENT's seat. Only costs
// the student can USE are named:
//   · a NEW outpost for the student (no pawn of theirs can ever challenge it
//     again) that a student knight reaches in one or two moves;
//   · their own bishop shut in by the pawn they just moved (its mobility drops
//     by three or more, the pawn now on its colour, in front of it);
//   · castling given up by a king move that is not castling;
//   · the lasting structural damage `describeConcessions` already computes
//     (king cover thinned, a passer granted, a new isolani).
// Returns null when the move cost nothing a student can see.
import { Chess, type Square } from 'chess.js';
import { isOutpost } from './outpost';
import { minorRouteToSquare } from './positionReadingService';
import { describeConcessions } from './reviewTeachingPoints';

export interface TheirMoveCost {
  text: string;
  squares: string[];
  kind: 'hole' | 'bishop-shut' | 'castling' | 'structure';
}


/** A student knight that reaches `target` in one or two jumps, landing on
 *  squares not held by its own pieces. Returns the knight's square and, for a
 *  two-jump route, the square in between. */
// ONE ROUTE FINDER (walk 2026-09-30): this file kept its own knight BFS, which
// walked through enemy pawns and onto squares a pawn takes ("via c4" with their
// pawn on c4, "via h4" with …g5 hitting it) — the same bug the shared finder
// had, fixed there and not here. Now it asks the shared one.
function knightRoute(board: Chess, target: string, color: 'w' | 'b'): { from: string; via: string | null } | null {
  const r = minorRouteToSquare(board.fen(), target as Square, color, 2, 'n');
  return r ? { from: r.from, via: r.via } : null;
}

function bishopMobility(board: Chess, sq: string): number {
  const p = board.get(sq as Square);
  if (!p || p.type !== 'b') return 0;
  const f0 = sq.charCodeAt(0) - 97; const r0 = Number(sq[1]) - 1; let n = 0;
  for (const [df, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (let k = 1; k < 8; k++) {
      const f = f0 + df * k; const r = r0 + dr * k;
      if (f < 0 || f > 7 || r < 0 || r > 7) break;
      const q = board.get(`${String.fromCharCode(97 + f)}${r + 1}` as Square);
      if (q && q.color === p.color) break;
      n++;
      if (q) break;
    }
  }
  return n;
}

/**
 * The cost of THEIR move `san` played from `fenBefore`, for the student
 * (`studentColor`). Null when nothing usable changed.
 */
export function theirMoveCost(fenBefore: string, san: string, studentColor: 'w' | 'b'): TheirMoveCost | null {
  let before: Chess; let after: Chess; let mv;
  try {
    before = new Chess(fenBefore);
    if (before.turn() === studentColor) return null;
    after = new Chess(fenBefore);
    mv = after.move(san);
    if (!mv) return null;
  } catch { return null; }
  const them: 'w' | 'b' = mv.color;
  const played = them === 'b' ? `…${mv.san}` : mv.san;

  // 1. A NEW outpost for the student that a knight can reach.
  if (mv.piece === 'p') {
    const files = [mv.from.charCodeAt(0) - 1, mv.from.charCodeAt(0) + 1].filter((c) => c >= 97 && c <= 104);
    for (const fc of files) {
      for (let r = 1; r <= 8; r++) {
        const sq = `${String.fromCharCode(fc)}${r}`;
        const p = after.get(sq as Square);
        // Occupied already — a square the student holds is not one it can win.
        if (p) continue;
        if (isOutpost(before, sq, studentColor, false) || !isOutpost(after, sq, studentColor, false)) continue;
        const route = knightRoute(after, sq, studentColor);
        if (!route) continue;
        const how = route.via ? `your knight on ${route.from} can get there via ${route.via}` : `your knight on ${route.from} can jump straight in`;
        return {
          kind: 'hole',
          text: `Their ${played} costs them ${sq}: no pawn of theirs can ever guard it again, and ${how}.`,
          squares: [sq, route.from, ...(route.via ? [route.via] : [])],
        };
      }
    }
  }

  // 2. Their own bishop shut in by the pawn they just moved.
  if (mv.piece === 'p') {
    const bishops = before.board().flat().filter((c) => c && c.type === 'b' && c.color === them).map((c) => (c as { square: string }).square);
    const toDark = (mv.to.charCodeAt(0) - 97 + Number(mv.to[1]) - 1) % 2 === 0;
    for (const b of bishops) {
      const bDark = (b.charCodeAt(0) - 97 + Number(b[1]) - 1) % 2 === 0;
      if (bDark !== toDark) continue;
      const drop = bishopMobility(before, b) - bishopMobility(after, b);
      if (drop >= 3) {
        return {
          kind: 'bishop-shut',
          text: `Their ${played} shuts in their own bishop on ${b} — the pawn now sits on its colour, right in its way.`,
          squares: [b, mv.to],
        };
      }
    }
  }

  // 3. Castling given up by a king move that is not castling.
  // Castling only matters with queens on — in an ending the king walks out on
  // purpose (walk 2026-09-30: "…Kxe7 gives up castling" with queens traded).
  const queensOn = after.board().flat().some((x) => x?.type === 'q');
  if (queensOn && mv.piece === 'k' && !mv.isKingsideCastle() && !mv.isQueensideCastle()) {
    const had = (fenBefore.split(' ')[2] ?? '-').split('').some((c) => (them === 'w' ? /[KQ]/ : /[kq]/).test(c));
    if (had) {
      return {
        kind: 'castling',
        text: `Their ${played} gives up castling — the king has to find safety by hand now.`,
        squares: [mv.from, mv.to],
      };
    }
  }

  // 4. The lasting structural damage the concession teacher already reads.
  // King cover counts only for a king that has castled to a wing — the d- and
  // e-pawns are not "cover" for a king still on e8 (move 1, …e5: "their king's
  // pawn cover thinned" was the first defect this computer produced).
  const king = after.board().flat().find((c) => c && c.type === 'k' && c.color === them) as { square: string } | undefined;
  const wingKing = !!king && /^[abcgh]/.test(king.square);
  // King cover is the king-attack lane's claim, said on the move that breaks
  // it and with its count — never here as "(3 shield pawns down to 2)" (walk
  // 2026-09-30: both lanes said it on one ply, this one in raw form).
  void wingKing;
  let concession = describeConcessions(fenBefore, san, false);
  if (concession) {
    const rest = concession.replace(/^The lasting concession: /, '').replace(/\.$/, '').split('; ').filter((c) => !/pawn cover thinned/.test(c));
    concession = rest.length ? `The lasting concession: ${rest.join('; ')}.` : null;
  }
  if (concession) return { kind: 'structure', text: `Their ${played}: ${concession.replace(/^The lasting concession: /, '').replace(/\.$/, '')}.`, squares: [mv.to] };
  return null;
}
