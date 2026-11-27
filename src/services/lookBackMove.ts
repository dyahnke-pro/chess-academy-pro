/**
 * BACK ONLY LOOKS; A DIFFERENT MOVE THERE IS THE TAKEBACK (David, the board bar
 * decisions, 2026-11-24: "The Takeback button goes. Back only looks; playing a
 * different move there is the takeback; Forward returns. Learn and Play.").
 *
 * The student steps back through the game with Back and sees a past board.
 * When that board is theirs to move, they may play on it: the game's own move
 * there → the view steps forward (nothing is taken back); a different move →
 * every ply after that board is taken back and the new move is played. One
 * rule for Learn and Play.
 */

export type LookBackPlay =
  /** Not a board the student may move on (live, their opponent's turn, or a
   *  board outside the game). */
  | { kind: 'none' }
  /** The game's own move there: Forward, nothing taken back. */
  | { kind: 'same'; nextIndex: number | null }
  /** A different move: take back `plies` and play it. */
  | { kind: 'replace'; plies: number };

/** May the student move on the board they are looking back at?
 *  `viewIndex`: null = live, -1 = the starting board, i = the board after the
 *  game's move i (0-based). `fenAtView` is that board. */
export function studentMovesAtView(viewIndex: number | null, historyLength: number, fenAtView: string | null, studentColor: 'white' | 'black'): boolean {
  if (viewIndex === null || !fenAtView) return false;
  if (viewIndex < -1 || viewIndex >= historyLength - 1) return false;
  return fenAtView.split(' ')[1] === (studentColor === 'white' ? 'w' : 'b');
}

/** What a move played at the looked-back board does. `history` is the game's
 *  SAN list, `playedSan` the move the student played there. */
export function lookBackPlay(viewIndex: number | null, history: readonly string[], fenAtView: string | null, studentColor: 'white' | 'black', playedSan: string): LookBackPlay {
  if (!studentMovesAtView(viewIndex, history.length, fenAtView, studentColor) || viewIndex === null) return { kind: 'none' };
  const next = viewIndex + 1;
  if (history[next] === playedSan) return { kind: 'same', nextIndex: next >= history.length - 1 ? null : next };
  return { kind: 'replace', plies: history.length - next };
}
