// stopInLine — THE "PASS IN YOUR HEAD" TEST, its second half (docs/plans/
// 2026-11-23-learn-mistakes-only.md, "Missing items"). A move is said to stop
// one of theirs (`moveIntent.stopReason`, `breakTiming.breakStopped`,
// `moveStops.stopsBreak`) off a ONE-MOVE check: the stopped move is played on
// the board after it and its square counted. The engine's line after the
// stopped move — a read the surface already holds — is the proof: it says
// whether the stopped move really loses (`costReason`, the one material
// reason). When the line and the one-move check disagree nothing is said
// (…e5 "covered twice to once", met in the line by dxe6 e.p. and …fxe6, a
// plain trade). PURE: the cost reason over the held read.
import { Chess, type Color } from 'chess.js';
import { costReason } from './costReason';

export type StopInLine = 'agrees' | 'disagrees' | 'no-line';

export function stopInLine(a: {
  /** The board after the stopping move, the other side to move. */
  fenAfter: string;
  /** Their move the stopping move took away, UCI. */
  stoppedUci: string;
  /** The side whose move stopped it. */
  stopper: Color;
  /** What the stopped move costs THEM against their best on `fenAfter`,
   *  centipawns from their side; null when the surface holds no price. */
  stoppedCostCp: number | null;
  /** The engine's line after the stopped move (the stopper's reply first),
   *  UCI; null when the surface holds none. */
  lineAfterStopped: readonly string[] | null;
  /** Did the one-move check say it fails? */
  oneMoveFails: boolean;
}): StopInLine {
  if (a.stoppedCostCp === null || !a.lineAfterStopped?.length) return 'no-line';
  let san: string;
  try {
    const c = new Chess(a.fenAfter);
    const m = c.move({ from: a.stoppedUci.slice(0, 2), to: a.stoppedUci.slice(2, 4), promotion: a.stoppedUci[4] });
    if (!m) return 'no-line';
    san = m.san;
  } catch { return 'no-line'; }
  const them: Color = a.stopper === 'w' ? 'b' : 'w';
  const r = costReason({
    fenBefore: a.fenAfter, playedSan: san, mover: them, student: a.stopper, costCp: a.stoppedCostCp,
    after: { uci: a.lineAfterStopped, source: 'record', seconds: [] }, before: null, priorMove: null, against: null,
  });
  const lineFails = !!r && r.kind === 'allowed';
  return lineFails === a.oneMoveFails ? 'agrees' : 'disagrees';
}
