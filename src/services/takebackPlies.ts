/**
 * THE STUDENT'S OWN TAKEBACK TAKES BACK THEIR MOVE (David's iPhone,
 * 2026-10-23: "Now I can't move the pieces"). The coach moves only in reply to
 * a student move, so a takeback that leaves it the coach's turn leaves nothing
 * to move the board: the bar's Takeback removed ONE ply, and once the coach had
 * replied that ply was the coach's reply — its turn again, no reply coming, the
 * board stuck. (The chat router learned the same rule on 2026-09-21: an
 * untargeted "take that back" after the coach replied is the exchange.)
 *
 * The plies to undo so the student's last move comes off and it is their turn:
 * 1 when the last ply is theirs, 2 when the coach has answered it, 0 when the
 * student has not moved yet (the coach's opening move is never taken back
 * alone — that would leave the coach to move with nothing to answer).
 */
export function ownTakebackPlies(historyLength: number, sideToMove: 'w' | 'b', student: 'w' | 'b'): number {
  if (historyLength >= 1 && sideToMove !== student) return 1;
  if (historyLength >= 2 && sideToMove === student) return 2;
  return 0;
}

/** The side to move on a FEN. */
export function sideToMoveOf(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}
