// QUESTION THE KNEE-JERK (WO-TEACH-GAPS P3, a missing method beat). A capture
// is answered by a recapture on reflex. His habit: before taking back, ask
// whether something stronger comes first — the recapture will usually still be
// there next move.
//
// Earned only when the board proves the reflex cost: their last move captured
// on a square, the student took back on that same square, the engine's best was
// NOT a capture on that square, and the recapture cost >= 100cp. Said once per
// game (claim `method:knee-jerk`). It teaches the HABIT; the better move itself
// is named by the grade beside it.
//
// A LEAF: SAN strings only.
export const KNEE_JERK_COST_CP = 100;

export function kneeJerk(theirLast: string | null, playedSan: string, bestSan: string | null, cpLoss: number): string | null {
  if (!theirLast || !bestSan || cpLoss < KNEE_JERK_COST_CP) return null;
  const sq = /x([a-h][1-8])/.exec(theirLast)?.[1];
  if (!sq) return null;
  const took = new RegExp(`x${sq}`);
  if (!took.test(playedSan) || took.test(bestSan)) return null;
  return 'Taking back was the reflex — but a recapture can usually wait a move. Before every recapture, ask whether something stronger comes first.';
}
