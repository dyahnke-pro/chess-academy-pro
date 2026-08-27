// playedMoveGrade — grade the move the student JUST played, cheaply and in time
// to speak it (G0). The bridge from the move-reason classifier to a live call
// site.
//
// THE TIMING SOLVE (David 2026-08-27, "BUILD"): the spoken post-move grade needs
// the after-move eval, and a fresh search would land after the opponent already
// replied. But when the student's played move is already one of the MultiPV
// candidates in the fan we paid for at `fenBefore`, its eval is in hand — cpLoss
// falls straight out, no new search, no timing hack. That grades the common case
// synchronously; a move OUTSIDE the fan (a bigger surprise) returns null and
// stays with the deferred slip faucet. Honest: we speak the grade when we can do
// it correctly and cheaply, and stay quiet (but still log) otherwise.
//
// Doc: docs/plans/2026-08-26-coach-my-weakness-focus-lens.md §4.0c.
import { Chess } from 'chess.js';
import type { StockfishAnalysis } from '../types';
import {
  classifyMoveReason, isFaultReason, reasonWeaknessTag, gradeWorthSpeaking, moveReasonClause,
  hangingNetForMover, type MoveReason, type MoveLabel,
} from './moveReason';
import { computeMustDefend } from './threatOut';
import { findHangingPieces } from './tacticClassifier';

const VAL: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

export interface PlayedMoveGrade {
  reason: MoveReason;
  /** The spoken grade (named, not centipawns) — '' when not worth speaking. */
  clause: string;
  cpLossCp: number;
  worthSpeaking: boolean;
  fault: boolean;
  /** Weakness-spine tag for a fault (auto-log to My Mistakes), else null. */
  weaknessTag: string | null;
}

/** cpLoss → label bands (mover POV cp cost). */
function labelFor(cpLossCp: number, isBest: boolean): MoveLabel {
  if (isBest) return 'best';
  if (cpLossCp >= 200) return 'blunder';
  if (cpLossCp >= 100) return 'mistake';
  if (cpLossCp >= 50) return 'inaccuracy';
  return 'good';
}

/**
 * Grade the played move from the paid-for `fenBefore` analysis + the board.
 * Returns null when the move isn't in the fan (can't grade cheaply — the deferred
 * faucet handles it) or the inputs are unusable.
 */
export function gradePlayedMove(input: {
  fenBefore: string;
  /** The move actually played, UCI (e.g. 'e2e4'). */
  playedUci: string;
  fenAfter: string;
  analysisBefore: Pick<StockfishAnalysis, 'topLines' | 'bestMove'>;
  studentColor: 'w' | 'b';
}): PlayedMoveGrade | null {
  const { fenBefore, playedUci, fenAfter, analysisBefore, studentColor } = input;
  const sign = studentColor === 'w' ? 1 : -1;
  const lines = [...(analysisBefore.topLines ?? [])].sort((a, b) => a.rank - b.rank).filter((l) => l.moves.length);
  if (lines.length === 0) return null;

  const moverEval = (l: { evaluation: number; mate: number | null }): number =>
    (l.mate != null ? (l.mate > 0 ? 100000 : -100000) : l.evaluation) * sign;

  const bestEval = moverEval(lines[0]);
  const played = lines.find((l) => l.moves[0] === playedUci);
  if (!played) return null;                       // outside the fan → defer
  const cpLossCp = Math.max(0, bestEval - moverEval(played));
  const isBest = analysisBefore.bestMove === playedUci || lines[0].moves[0] === playedUci;
  const gap12 = lines.length >= 2 ? bestEval - moverEval(lines[1]) : 0;
  const label = labelFor(cpLossCp, isBest);

  // Board-only signals (synchronous).
  const threatNetBefore = (() => { try { return computeMustDefend(fenBefore, studentColor).net; } catch { return 0; } })();
  const hangAfter = hangingNetForMover(fenAfter, studentColor);
  let capture = false, seeNow = 0, hung: { piece: string; square: string } | undefined;
  try {
    const c = new Chess(fenBefore);
    const mv = c.move({ from: playedUci.slice(0, 2), to: playedUci.slice(2, 4), promotion: playedUci[4] });
    if (mv?.captured) { capture = true; seeNow = VAL[mv.captured] ?? 0; }
  } catch { /* board read is a bonus */ }
  if (hangAfter >= 2) {
    try {
      // Name the biggest piece the move left hanging (for the spoken clause).
      const after = new Chess(fenAfter);
      let worst = -1;
      for (const h of findHangingPieces(after)) {
        if (h.color !== studentColor) continue;
        const v = VAL[h.piece.toLowerCase()] ?? 0;
        if (v > worst) { worst = v; hung = { piece: h.piece.toLowerCase(), square: h.square }; }
      }
    } catch { /* naming is a bonus */ }
  }

  const reason = classifyMoveReason({
    label, isBest, cpLossCp, gap12, threatNetBefore, hangAfter,
    forceNetBest: 0, capture, seeNow, refuteNet: 0,
  });
  const worthSpeaking = gradeWorthSpeaking(reason);
  return {
    reason,
    clause: worthSpeaking ? moveReasonClause(reason, { hung }) : '',
    cpLossCp,
    worthSpeaking,
    fault: isFaultReason(reason),
    weaknessTag: reasonWeaknessTag(reason),
  };
}
