/**
 * THE STUDENT'S RECORD HOLDS ONLY THE STUDENT'S MOVES (David 2026-11-27:
 * "Lessons and drills are only made from user mistakes").
 *
 * Every writer of the student's record — a mistake puzzle, a misconception
 * row, a capability-evidence row, a taken-back puzzle — takes the student's
 * seat as a REQUIRED parameter and refuses a row whose move was played by the
 * other side. The coach's own slips are still spoken (the opponent's mistake
 * teaches too); they are never saved as the student's weakness.
 *
 * The move a row records is the one played FROM its board (`fenBefore`), so
 * its mover is that board's side to move. A board that cannot be read is
 * refused: "when unsure, skip".
 */

export type StudentSeat = 'white' | 'black';

/** The side that plays the move recorded at `fenBefore`, or null when the
 *  board's side-to-move field cannot be read. Pure. */
export function moverOf(fenBefore: string): StudentSeat | null {
  const side = fenBefore.trim().split(/\s+/)[1];
  if (side === 'w') return 'white';
  if (side === 'b') return 'black';
  return null;
}

/** The writers of the student's record, named so a refusal says which door
 *  turned the row away. */
export type RecordWriter =
  | 'mistake-puzzle'
  | 'misconception'
  | 'capability-evidence'
  | 'lane-evidence'
  | 'taken-back';

/** True when the move played from `fenBefore` is the student's. A coach move
 *  (or an unreadable board) is refused and the refusal is logged, so an audit
 *  can see the gate ever fire — it should not, every caller already passes
 *  the student's own moves. */
export function isStudentsMove(fenBefore: string, studentSeat: StudentSeat, writer: RecordWriter, playedSan?: string): boolean {
  const mover = moverOf(fenBefore);
  if (mover === studentSeat) return true;
  // Loaded lazily: the record writers sit under the auditor's own imports.
  void import('./appAuditor').then(({ logAppAudit }) => logAppAudit({
    kind: 'record-seat-refused',
    category: 'subsystem',
    source: `recordSeat.${writer}`,
    summary: `${writer}: refused ${playedSan ?? 'a move'} by ${mover ?? 'an unreadable board'} (studentSeat=${studentSeat})`,
    fen: fenBefore,
    details: JSON.stringify({ writer, mover, studentSeat, playedSan: playedSan ?? null }),
  })).catch(() => undefined);
  return false;
}
