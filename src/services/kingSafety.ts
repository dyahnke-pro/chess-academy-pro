// kingSafety — a board-true single-position king-exposure read (§9 "king-safety"
// signal, David 2026-08-26). Fires ONLY when a castled king has a materially
// broken pawn shelter AND the opponent actually has pieces aimed at that zone —
// both conditions, so a harmlessly-nicked shield (an advanced h-pawn with no
// attacker behind it) stays silent. Pure chess.js geometry, no engine (G0), no
// overstating: every claim (which pawns are gone, which enemy pieces bear on the
// king) is read straight off the board.
import { Chess } from 'chess.js';

type Sq = string;
const FILES = 'abcdefgh';

export interface KingExposure {
  kingSquare: Sq;
  /** How many of the three shelter pawns in front of the king are gone. */
  missingShield: number;
  /** Enemy heavy/bishop pieces that attack a square in the king zone. */
  attackerSquares: Sq[];
}

function kingSquareOf(game: Chess, color: 'w' | 'b'): Sq | null {
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

/** The three shelter squares one rank in front of a castled king (king file ±1),
 *  or null when the king isn't on a castled square (so this never fires on a
 *  centralized / uncastled king). */
function shelterSquares(kingSq: Sq, color: 'w' | 'b'): Sq[] | null {
  const f = FILES.indexOf(kingSq[0]);
  const rank = Number.parseInt(kingSq[1], 10);
  const homeRank = color === 'w' ? 1 : 8;
  if (rank !== homeRank) return null;            // not on the back rank → not castled-safe
  const isKingside = f >= 5;                      // f/g/h
  const isQueenside = f <= 2;                     // a/b/c
  if (!isKingside && !isQueenside) return null;   // still in the centre
  const shelterRank = color === 'w' ? 2 : 7;
  const out: Sq[] = [];
  for (const df of [-1, 0, 1]) {
    const nf = f + df;
    if (nf < 0 || nf > 7) continue;
    out.push(`${FILES[nf]}${shelterRank}`);
  }
  return out;
}

/**
 * A king-exposure read, or null when the king is safe enough to say nothing.
 * Requires BOTH a broken shelter (≥2 of 3 shield pawns gone) AND ≥1 enemy
 * bishop/rook/queen bearing on the king zone.
 */
export function detectKingExposure(fen: string, studentColor: 'w' | 'b'): KingExposure | null {
  let game: Chess;
  try { game = new Chess(fen); } catch { return null; }
  const kingSq = kingSquareOf(game, studentColor);
  if (!kingSq) return null;
  const shelter = shelterSquares(kingSq, studentColor);
  if (!shelter) return null;

  let missing = 0;
  for (const s of shelter) {
    const p = game.get(s as Parameters<Chess['get']>[0]);
    if (!(p && p.type === 'p' && p.color === studentColor)) missing += 1;
  }
  if (missing < 2) return null; // shelter still largely intact — no alarm

  const enemy: 'w' | 'b' = studentColor === 'w' ? 'b' : 'w';
  const zone = [kingSq, ...shelter];
  const attackers = new Set<Sq>();
  for (const sq of zone) {
    let from: Sq[] = [];
    try { from = game.attackers(sq as Parameters<Chess['attackers']>[0], enemy); } catch { from = []; }
    for (const a of from) {
      const p = game.get(a as Parameters<Chess['get']>[0]);
      if (p && (p.type === 'q' || p.type === 'r' || p.type === 'b')) attackers.add(a);
    }
  }
  if (attackers.size === 0) return null; // broken but unpressured — stay quiet

  return { kingSquare: kingSq, missingShield: missing, attackerSquares: [...attackers] };
}

/** The spoken clause for a king exposure, board-true. */
export function kingExposureClause(k: KingExposure): string {
  const n = k.missingShield === 3 ? 'all three' : `${k.missingShield}`;
  return `Your king's cover is thin — ${n} of the pawns in front of it are gone and they already have pieces aimed at it. Look after the king before you throw more forces forward.`;
}
