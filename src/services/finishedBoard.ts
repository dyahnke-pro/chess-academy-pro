// A FINISHED BOARD IS READ OFF THE BOARD, NEVER OFF THE ENGINE (David
// 2026-10-14: "the eval does even at the end. There is a sharp line to middle
// at the end of each review"). Asked about a checkmated or stalemated
// position, the engine has no move to search: depending on the build it
// prints mate-in-0, nothing, or times out, and the caller stores 0 or null —
// so the review graph drops to level on the mating move, and a chat answer
// called the mate the worst move on the board. The board already knows the
// answer, so every engine door asks the board first.
import { Chess } from 'chess.js';
import { MATE_EVAL_VALUE } from './engineConstants';

/** The White-POV eval of a finished position (centipawns; mate is the bare
 *  ±MATE_EVAL_VALUE sentinel — mate-in-0), or null when the game goes on. */
export function finishedBoardEval(fen: string): number | null {
  let c: Chess;
  try { c = new Chess(fen); } catch { return null; }
  if (c.isCheckmate()) return c.turn() === 'w' ? -MATE_EVAL_VALUE : MATE_EVAL_VALUE;
  if (c.isDraw()) return 0;
  return null;
}
