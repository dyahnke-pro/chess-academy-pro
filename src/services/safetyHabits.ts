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
// Both teach the HABIT; the grade beside them names the better move. Once per
// game each (claims `method:blunder-check`, `method:autopilot`).
//
// A LEAF: chess.js + the SEE helper.
import { Chess } from 'chess.js';
import { legalSeeGainFor } from './positionReadingService';
import { MATERIAL_VALUE } from './pieceValues';

export const BLUNDER_CHECK_CP = 150;
export const AUTOPILOT_CP = 100;

const NAME: Record<string, string> = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen' };

export function blunderCheck(fenBefore: string, san: string, reply: string | null, cpLoss: number): string | null {
  if (!reply || cpLoss < BLUNDER_CHECK_CP) return null;
  let c: Chess;
  let mine;
  try { c = new Chess(fenBefore); mine = c.move(san); } catch { return null; }
  const afterMove = c.fen();
  let r;
  try { r = c.move(reply.replace(/^…/, '')); } catch { return null; }
  if (!r.captured || r.captured === 'k') return null;
  // Taking back on the square the student just captured on, for no more than
  // they took, is a TRADE (the Ruy exchange: Bxc6 dxc6), not a blunder.
  if (mine.captured && r.to === mine.to && (MATERIAL_VALUE[r.captured] ?? 0) <= (MATERIAL_VALUE[mine.captured] ?? 0)) return null;
  // The piece was winnable right after the student's move — not a trade.
  if (legalSeeGainFor(afterMove, r.to, r.color) <= 0) return null;
  return `Blunder check before you let go of a piece: what can they take now? Here the answer was your ${NAME[r.captured] ?? 'piece'} on ${r.to}.`;
}

export function autopilotGuard(san: string, cpLoss: number, popularTopSan: string | null): string | null {
  if (!popularTopSan || cpLoss < AUTOPILOT_CP) return null;
  const bare = (s: string): string => s.replace(/[+#!?]+$/, '');
  if (bare(san) !== bare(popularTopSan)) return null;
  return 'That is the move most players make here — and it costs. When a move feels automatic, that is exactly the moment to check it.';
}
