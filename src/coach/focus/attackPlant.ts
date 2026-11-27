/**
 * THE COACH OPENS ITS OWN KING (Coach Build Board "4. Focuses": "the
 * attack-the-king plant"). In a middlegame whose focus is the attack on the
 * king, until an attack has been on the board, the coach plays one of its own
 * natural slips — a move costing it at least `SLIP_DROP_CP`, hanging nothing —
 * after which the engine's best move for the student is an attacking move that
 * clearly beats every quiet one: the SAME question the student's move is then
 * scored by (`kingAttackJudge` through `moveKindJudge.posesKind`), never a
 * second definition.
 *
 * Harder, not stronger: a plant is one of the coach's own slips at its own
 * level. A find on a planted board counts half on the record (steered), and
 * never raises the coach's strength (`replyMadeAChance`). Pure: the engine
 * half is `coachGameEngine.tryAttackPlant`.
 */
import { completesExchange, midExchange, PLANT_VERIFY_MAX, slipCandidates, type CoachLine, type SlipRead } from '../../missions/earnedSlip';
import { isAttackingMove } from './kingAttackJudge';
import { posesKind } from './moveKindJudge';
import type { ReadLine } from './focusChances';

export type AttackPlantReject = 'mid-exchange' | 'no-slip' | 'no-read' | 'no-attack';

export interface AttackPlantPick {
  uci: string;
  /** The student's attacking move the slip leaves on the board. */
  attackUci: string;
  dropCp: number;
  /** The read that proved it (rides with the planted board). */
  lines: readonly ReadLine[];
}

/** Whether the board (the student to move) poses the attack on the king. */
export function attackPosed(fen: string, lines: readonly ReadLine[] | null): string | null {
  return posesKind(fen, lines, isAttackingMove);
}

export async function findAttackPlant(
  fen: string,
  coachLines: readonly CoachLine[],
  read: SlipRead,
): Promise<{ pick: AttackPlantPick | null; scan: Partial<Record<AttackPlantReject, number>> }> {
  const scan: Partial<Record<AttackPlantReject, number>> = {};
  const bump = (r: AttackPlantReject): void => { scan[r] = (scan[r] ?? 0) + 1; };
  const mid = midExchange(fen);
  // A gift of a piece is not an attack lesson: the slip hangs nothing.
  const slips = slipCandidates(fen, coachLines, 'forbid').filter((s) => !mid || completesExchange(fen, s.uci));
  if (slips.length === 0) { bump(mid ? 'mid-exchange' : 'no-slip'); return { pick: null, scan }; }
  for (const slip of slips.slice(0, PLANT_VERIFY_MAX)) {
    const a = await read(slip.fenAfter);
    if (!a || a.topLines.length === 0) { bump('no-read'); continue; }
    const lines: ReadLine[] = a.topLines.map((l) => ({ moves: [...l.moves], evaluation: l.evaluation, mate: l.mate }));
    const attackUci = attackPosed(slip.fenAfter, lines);
    if (!attackUci) { bump('no-attack'); continue; }
    return { pick: { uci: slip.uci, attackUci, dropCp: slip.dropCp, lines }, scan };
  }
  return { pick: null, scan };
}
