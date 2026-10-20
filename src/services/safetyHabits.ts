// TWO SAFETY HABITS, EARNED BY THE BOARD (WO-TEACH-GAPS P3 method beats).
//
// BLUNDER CHECK — "before you let go of the piece, ask what they can take now".
// Earned only when it would have saved the game's material: the student's move
// cost >= 150cp and their reply simply took a student piece that the move left
// en prise (it was winnable by exchange right after the move).
//
// AUTOPILOT GUARD — "when a move feels automatic, that's the moment to check
// it". Earned when the move cost >= 100cp AND it is the move most players at the
// student's level play in this position (the reflex, not an oddity).
//
// Both teach the HABIT; the grade beside them names the better move. The
// blunder check is asked in full once a game (`method:blunder-check`) and as a
// short callback after that; the autopilot guard once (`method:autopilot`).
//
// A LEAF: chess.js + the SEE helper.
import { Chess } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';
import { rotateStem, stemKeyOf } from '../utils/rotateStem';

const BLUNDER_CHECK_CP = 150;
const AUTOPILOT_CP = 100;

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

export function blunderCheck(
  fenBefore: string,
  san: string,
  reply: string | null,
  cpLoss: number,
  /** The full question was already said this game: say the short callback
   *  (the habit is built by asking it again, never by silence after once). */
  again = false,
): string | null {
  if (!reply || cpLoss < BLUNDER_CHECK_CP) return null;
  let c: Chess;
  let mine;
  try { c = new Chess(fenBefore); mine = c.move(san); } catch { return null; }
  const afterMove = c.fen();
  let r;
  try { r = c.move(reply.replace(/^…/, '')); } catch { return null; }
  let answer: string | null = null;
  if (r.captured && r.captured !== 'k') {
    // Taking back on the square the student just captured on, for no more than
    // they took, is a TRADE (the Ruy exchange: Bxc6 dxc6), not a blunder.
    const trade = !!mine.captured && r.to === mine.to && (MATERIAL_VALUE[r.captured] ?? 0) <= (MATERIAL_VALUE[mine.captured] ?? 0);
    // The piece was winnable right after the student's move — not a trade.
    if (!trade && legalSeeGainFor(afterMove, r.to, r.color) > 0) answer = `your ${NAME[r.captured] ?? 'piece'} on ${r.to}`;
  }
  // THE CHECK IS THE FIRST C OF CCT (Learn audit 2026-10-15: "e5 was a
  // blunder — it let them force mate, starting with Qxa7" and no habit,
  // because the lane only knew captures). A costly move answered by a check
  // is the question the habit asks first.
  if (!answer && /[+#]$/.test(r.san)) answer = `their check, ${r.color === 'b' ? '…' : ''}${r.san}`;
  if (!answer) return null;
  return again ? blunderCheckAgain(answer, fenBefore) : blunderCheckAnswer(answer);
}

/** THE ONE BLUNDER-CHECK SENTENCE (David 2026-10-14: a question the student
 *  learns to ask themself, and name CCT). Said by this lane when they took the
 *  piece, and by the slip question when the line takes it — one wording, one
 *  say-once claim (`method:blunder-check`). */
export const BLUNDER_CHECK_QUESTION = 'Blunder check before you let go of a piece: run CCT for them — what checks, captures and threats do they have once it lands?';
export function blunderCheckLine(pieceName: string, square: string): string {
  return blunderCheckAnswer(`your ${pieceName} on ${square}`);
}
function blunderCheckAnswer(answer: string): string {
  return `${BLUNDER_CHECK_QUESTION} Here the answer was ${answer}.`;
}
/** The short callback once the question has been asked this game. */
function blunderCheckAgain(answer: string, fen: string): string {
  return rotateStem([
    `Blunder check again — ${answer} was the answer.`,
    `Same question before you let go: what do they have? Here, ${answer}.`,
    `CCT for them once more — ${answer} was there to see.`,
  ], stemKeyOf(fen));
}

export function autopilotGuard(san: string, cpLoss: number, popularTopSan: string | null): string | null {
  if (!popularTopSan || cpLoss < AUTOPILOT_CP) return null;
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  if (bare(san) !== bare(popularTopSan)) return null;
  return 'That is the move most players make here — and it costs. When a move feels automatic, that is exactly the moment to check it.';
}

/** When they are collapsing, a slow move gives them the one thing they need —
 *  time. Earned when the student is still winning after the move (>= 300cp),
 *  the engine's move was a check or a capture, and the played move was neither
 *  and cost >= 100cp. Teaches the habit only; the grade names the better move. */
const KEEP_PRESSING_WIN_CP = 300;
export function keepPressing(fenBefore: string, san: string, bestSan: string | null, cpLoss: number, cpAfter: number | null): string | null {
  if (!bestSan || cpAfter === null || cpAfter < KEEP_PRESSING_WIN_CP || cpLoss < AUTOPILOT_CP) return null;
  const forcing = (x: string): boolean => /x|[+#]$/.test(x);
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  if (bare(san) === bare(bestSan) || forcing(san) || !forcing(bestSan)) return null;
  try { new Chess(fenBefore).move(san); } catch { return null; }
  return 'When they are on the ropes, keep asking questions — a check or a capture first, so they never get a free move to untangle.';
}
