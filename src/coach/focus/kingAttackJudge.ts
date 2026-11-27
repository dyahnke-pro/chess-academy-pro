/**
 * THE MIDDLEGAME'S OTHER FOCUS — ATTACK THE KING (Coach Build Board "4.
 * Focuses", David 2026-11-24: "tactics or attack the king"). An attacking move
 * is the ONE reader's (`kingAttack`): it takes a pawn from in front of their
 * castled king, removes a defender for good, opens a file or lines at it, or
 * brings a piece over to bear. The board poses the attack when the engine's
 * best move is such a move and clearly beats every move that is not; the
 * student holds it or lets it go (`missed-king-attack`), scored by the one
 * shape (`moveKindJudge`). A miss is taught as the habit, never the move.
 */
import { kingAttack } from '../../services/kingAttack';
import type { ReadLine } from './focusChances';
import { judgeMoveKind, sanOf } from './moveKindJudge';
import type { SkillVerdict } from './openingJudge';

export const KING_ATTACK_MISS_LINE = 'Their king was open there. Before a quiet move, ask which piece can join the attack on their king.';

/** Is the move an attacking move on their king (the one reader; the hop it
 *  heads for is never claimed without a line, so none is passed)? */
export function isAttackingMove(fen: string, uci: string): boolean {
  const san = sanOf(fen, uci);
  if (!san) return false;
  const student = fen.split(' ')[1] === 'b' ? 'b' : 'w';
  return kingAttack(fen, san, false, false, [], student) !== null;
}

export function judgeKingAttackMove(fenBefore: string, san: string, lines: readonly ReadLine[] | null): SkillVerdict[] {
  const v = judgeMoveKind(fenBefore, san, lines, isAttackingMove);
  return v ? [{ tag: 'missed-king-attack', outcome: v.outcome, line: v.outcome === 'broken' ? KING_ATTACK_MISS_LINE : null }] : [];
}
