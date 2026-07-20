/**
 * reviewSacrifice — the deterministic COMPENSATION PROFILE for a sound sacrifice.
 *
 * David 2026-07-20 (the narrating-vs-teaching insight): the coach used to ASSERT
 * "the attack is worth far more than the material" on a sacrifice. That's a claim,
 * not teaching. Teaching WHY the piece is worth giving means naming the concrete,
 * board-true compensation — and every reason here is computed (G0), never invented:
 *
 *   1. King stuck in the centre — the defender's king is still central, past the
 *      opening, with an open central file bearing on it (chess.js + open-file scan).
 *   2. Development lead — the attacker has more pieces in play than the defender
 *      (minor pieces off the back rank + castled), counted straight off the board.
 *   3. The verdict — the position after the sacrifice already favours the attacker
 *      (the engine eval, which encodes the future; we NEVER say "engine").
 *
 * A clause is emitted ONLY when it is true; an untrue reason is omitted. These are
 * exactly the "measure the compensation" facts the sacrifice needs to be TAUGHT,
 * not asserted — and king-in-centre + development-lead are reusable keystones.
 */
import { Chess } from 'chess.js';
import { describeStructure } from './boardStructure';

/** The mover's-perspective clauses explaining what the sacrifice BUYS. Ordered
 *  most-telling first; empty when no board-true compensation can be named. */
export function sacrificeCompensation(
  fenAfter: string,
  moverColorWB: 'w' | 'b',
  moverPovEvalCp: number | null,
): string[] {
  const clauses: string[] = [];
  let board: Chess;
  try { board = new Chess(fenAfter); } catch { return clauses; }
  const enemy: 'w' | 'b' = moverColorWB === 'w' ? 'b' : 'w';

  // 1. Enemy king stuck in the CENTRE — the keystone concept (extracted as a
  //    reusable predicate so a standalone beat can teach it too).
  if (enemyKingStuckInCenter(fenAfter, moverColorWB)) {
    clauses.push('their king is stuck in the centre with the files opening around it');
  }

  // 2. Development lead — more pieces in play than the defender.
  const lead = developedCount(board, moverColorWB) - developedCount(board, enemy);
  if (lead >= 2) {
    clauses.push(`you're ${lead === 2 ? 'two pieces' : `${lead} pieces`} ahead in development`);
  }

  // 3. The verdict — the position already favours the attacker (the eval encodes
  //    the compensation the future pays out). Never say "engine".
  if (moverPovEvalCp !== null) {
    if (moverPovEvalCp >= 100) clauses.push("you're already on top here");
    else if (moverPovEvalCp >= -60) clauses.push('the position holds up completely');
  }
  return clauses;
}

/**
 * The keystone concept of attacking chess: is the DEFENDER's king stuck in the
 * centre? True when — past the opening (fullmove ≥ 8) — the enemy king still sits
 * on a central file on its own half AND a central file (d/e) is OPEN, so it's
 * genuinely EXPOSED rather than merely un-castled. Pure board-truth (chess.js +
 * open-file scan), reusable by the sacrifice compensation and a standalone beat.
 */
export function enemyKingStuckInCenter(fen: string, moverColorWB: 'w' | 'b'): boolean {
  const enemy: 'w' | 'b' = moverColorWB === 'w' ? 'b' : 'w';
  let board: Chess;
  try { board = new Chess(fen); } catch { return false; }
  const fullmove = Number(fen.split(' ')[5] ?? '0');
  const kingSq = findKing(board, enemy);
  const central = kingSq !== null
    && ['c', 'd', 'e', 'f'].includes(kingSq[0])
    && (enemy === 'w' ? ['1', '2'].includes(kingSq[1]) : ['7', '8'].includes(kingSq[1]));
  let openCentral = false;
  try {
    const s = describeStructure(fen);
    openCentral = !!s && (s.pawns.openFiles.includes('d') || s.pawns.openFiles.includes('e'));
  } catch { openCentral = false; }
  return fullmove >= 8 && central && openCentral;
}

/** Squares of the king of `color`, or null. */
function findKing(board: Chess, color: 'w' | 'b'): string | null {
  for (const row of board.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

/** How many pieces `color` has "in play": minor pieces (knight/bishop) off their
 *  own back rank, plus one for having castled (king off the e-file). Board-true. */
function developedCount(board: Chess, color: 'w' | 'b'): number {
  const backRank = color === 'w' ? '1' : '8';
  let n = 0;
  for (const row of board.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color) continue;
      if ((cell.type === 'n' || cell.type === 'b') && cell.square[1] !== backRank) n += 1;
    }
  }
  const king = findKing(board, color);
  if (king && king[0] !== 'e') n += 1; // castled (or king walked off the e-file)
  return n;
}
