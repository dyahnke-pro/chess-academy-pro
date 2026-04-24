/**
 * liveCoachTriggers
 * -----------------
 * Pure detection functions for the live-coach interjection system
 * (WO-LIVE-COACH-01). Each detector takes a per-move payload and
 * returns either a fired trigger or null. Composable, testable in
 * isolation, no React or async dependencies.
 *
 * Eval convention: positive = good for white, negative = good for
 * black. Centipawns. The hook normalizes from white-perspective into
 * student-perspective before passing in (positive = good for student).
 *
 * Trigger priority (highest first), used by `pickHighestPriorityTrigger`:
 *   opponent-blunder > great-move > missed-tactic >
 *   eval-swing-wrong > recovery
 *
 * (Hung-piece blunders are handled by the existing POLISH-02 path
 * BEFORE the live-coach hook runs; the hook is told via
 * `hasHangingPiece` so it can suppress eval-swing-wrong on the same
 * ply and avoid double-speak.)
 */

export type LiveCoachTrigger =
  | 'great-move'
  | 'missed-tactic'
  | 'opponent-blunder'
  | 'eval-swing-wrong'
  | 'recovery';

export interface PlayerMoveSignal {
  /** Eval before the student's move, student-perspective (cp). */
  evalBefore: number;
  /** Eval after the student's move, student-perspective (cp). */
  evalAfter: number;
  /** Eval of the engine's best move, student-perspective (cp).
   *  Used to detect "missed tactic" — best move was much better. */
  bestMoveEval: number | null;
  /** True iff the student played the engine's best move. */
  isBestMove: boolean;
  /** True iff the engine's best move was a tactical pattern (capture,
   *  fork, pin, mate threat). The hook derives this from the existing
   *  `tactic-classifier` output before calling these detectors. */
  bestMoveWasTactical: boolean;
  /** True iff the student's move left a hanging piece. The
   *  POLISH-02 blunder-alert path already speaks for these; live-coach
   *  suppresses eval-swing-wrong when this is set. */
  hasHangingPiece: boolean;
  /** Last-N student-perspective evals (cp), oldest first. Used by the
   *  recovery detector to compare worst recent eval against current. */
  recentEvalHistory: number[];
}

export interface OpponentMoveSignal {
  evalBefore: number;
  evalAfter: number;
}

// ── Detection thresholds (centipawns; positive = good for student) ──────────

const GREAT_MOVE_DELTA_CP = 40;       // +0.40
const MISSED_TACTIC_GAP_CP = 100;     // +1.00 (best vs played)
const OPPONENT_BLUNDER_DELTA_CP = 150; // -1.50 for opponent → +1.50 for student
const EVAL_SWING_WRONG_DELTA_CP = 80;  // -0.80
const RECOVERY_WORST_CP = -200;        // -2.00 ever in last 5 plies
const RECOVERY_NOW_BAND_CP = 50;       // ±0.50

export interface TriggerResult {
  trigger: LiveCoachTrigger;
  payload: Record<string, unknown>;
}

/** Great move — student's eval improved meaningfully on a non-obvious
 *  move. "Non-obvious" means: best move OR within 10cp of best AND
 *  not a recapture / forced move. We don't have force-move detection
 *  here so the closest proxy is "delta in student's favor exceeds
 *  threshold and the move was best-or-near-best". */
export function detectGreatMove(s: PlayerMoveSignal): TriggerResult | null {
  const delta = s.evalAfter - s.evalBefore;
  if (delta < GREAT_MOVE_DELTA_CP) return null;
  // Require best-or-near-best so we don't praise random lucky bumps.
  if (!s.isBestMove && (s.bestMoveEval === null || s.bestMoveEval - s.evalAfter > 10)) return null;
  return {
    trigger: 'great-move',
    payload: { evalBefore: s.evalBefore, evalAfter: s.evalAfter, delta },
  };
}

/** Missed tactic — student played a fine move but a much stronger
 *  tactical alternative existed. Gap >= +1.00 cp AND best move was
 *  classified as tactical. */
export function detectMissedTactic(s: PlayerMoveSignal): TriggerResult | null {
  if (s.isBestMove) return null;
  if (s.bestMoveEval === null) return null;
  const gap = s.bestMoveEval - s.evalAfter;
  if (gap < MISSED_TACTIC_GAP_CP) return null;
  if (!s.bestMoveWasTactical) return null;
  return {
    trigger: 'missed-tactic',
    payload: { evalAfter: s.evalAfter, bestMoveEval: s.bestMoveEval, gap },
  };
}

/** Opponent blunder — opponent's move dropped the eval by ≥ 1.50 in
 *  student's favor. Eval is in student-perspective so the delta is
 *  positive when good for student. */
export function detectOpponentBlunder(s: OpponentMoveSignal): TriggerResult | null {
  const delta = s.evalAfter - s.evalBefore;
  if (delta < OPPONENT_BLUNDER_DELTA_CP) return null;
  return {
    trigger: 'opponent-blunder',
    payload: { evalBefore: s.evalBefore, evalAfter: s.evalAfter, delta },
  };
}

/** Eval swing wrong — student's move dropped the eval ≥ 0.80 against
 *  them. Suppressed when there's a hanging piece (the POLISH-02
 *  blunder alert path covers that case with dedicated prose). */
export function detectEvalSwingWrong(s: PlayerMoveSignal): TriggerResult | null {
  if (s.hasHangingPiece) return null;
  const delta = s.evalAfter - s.evalBefore;
  if (delta > -EVAL_SWING_WRONG_DELTA_CP) return null;
  return {
    trigger: 'eval-swing-wrong',
    payload: { evalBefore: s.evalBefore, evalAfter: s.evalAfter, delta },
  };
}

/** Recovery — eval was ≤ -2.00 within the last 5 plies AND is now
 *  back within ±0.50. Acknowledges the comeback. */
export function detectRecovery(s: PlayerMoveSignal): TriggerResult | null {
  const recent = s.recentEvalHistory.slice(-5);
  if (recent.length === 0) return null;
  const worst = Math.min(...recent);
  if (worst > RECOVERY_WORST_CP) return null;
  if (Math.abs(s.evalAfter) > RECOVERY_NOW_BAND_CP) return null;
  return {
    trigger: 'recovery',
    payload: { worst, current: s.evalAfter, history: recent },
  };
}

const PRIORITY: LiveCoachTrigger[] = [
  'opponent-blunder',
  'great-move',
  'missed-tactic',
  'eval-swing-wrong',
  'recovery',
];

/** From a list of fired triggers (any of which may be null), pick the
 *  highest-priority one. Lower-priority entries can be logged as
 *  "suppressed" for diagnostics. */
export function pickHighestPriorityTrigger(
  candidates: Array<TriggerResult | null>,
): { winner: TriggerResult | null; suppressed: TriggerResult[] } {
  const fired = candidates.filter((c): c is TriggerResult => c !== null);
  if (fired.length === 0) return { winner: null, suppressed: [] };
  const ranked = [...fired].sort(
    (a, b) => PRIORITY.indexOf(a.trigger) - PRIORITY.indexOf(b.trigger),
  );
  return { winner: ranked[0], suppressed: ranked.slice(1) };
}

/** Run all five detectors against a player-move signal + an optional
 *  opponent-move signal (when the move just played was the opponent's),
 *  return the prioritised winner + any losers. The hook calls this
 *  directly. */
export function evaluatePlayerMoveTriggers(
  s: PlayerMoveSignal,
): { winner: TriggerResult | null; suppressed: TriggerResult[] } {
  return pickHighestPriorityTrigger([
    detectGreatMove(s),
    detectMissedTactic(s),
    detectEvalSwingWrong(s),
    detectRecovery(s),
  ]);
}

export function evaluateOpponentMoveTriggers(
  s: OpponentMoveSignal,
): { winner: TriggerResult | null; suppressed: TriggerResult[] } {
  return pickHighestPriorityTrigger([detectOpponentBlunder(s)]);
}
