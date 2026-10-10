import { classifyPhase, isEndgameByMaterial } from './gamePhaseService';
import { hasCastled, rooksConnected, countDevelopedMinors, hasMajorPieceCaptured, openingEndRule } from './openingEnd';
export { hasCastled, rooksConnected, countDevelopedMinors, hasMajorPieceCaptured, centralPawnsResolved, openingIsOver, openingEndRule } from './openingEnd';


/**
 * Live phase-transition detector for coach games. Emits at most one event
 * per phase boundary per game. Stateless per call — the caller owns the
 * "already fired" ledger so transitions are bounded to a single game.
 *
 * Signal priority (per WO-PHASE-NARRATION-01):
 *   1. Stockfish `gamePhase` — not currently emitted by the engine, so
 *      the detector relies on the synchronous classifyPhase / material
 *      fallback below. If stockfishEngine gains a phase hint later, wire
 *      it in as the primary signal and keep these as the fallback.
 *   2. Opening → middlegame: phase ≠ 'opening' AND student has castled
 *      AND student's rooks are connected.
 *   3. Middlegame → endgame: phase === 'endgame', OR queens are off the
 *      board, OR both sides have ≤ 1 rook AND queens are off.
 *
 * Never fires on coach moves. Never re-fires a boundary.
 */

export type PhaseTransitionKind = 'opening-to-middlegame' | 'middlegame-to-endgame';

export interface PhaseTransitionEvent {
  kind: PhaseTransitionKind;
  fen: string;
  /** Ply count (1-indexed, odd = white) as stored in CoachGameMove.moveNumber. */
  moveNumber: number;
  playerColor: 'white' | 'black';
  triggeringMoveSan: string;
  /** WHICH of the seven opening-end rules ended the opening.
   *
   *  This used to exist only inside a `console.log` — computed, printed to a
   *  devtools console nobody was watching in production, and thrown away. It
   *  is the single most useful field for tuning the boundary ("we keep firing
   *  on move-15-safety, so the real rules are too strict"), so it rides the
   *  event and reaches the audit instead. Absent on the endgame boundary,
   *  which has one rule. */
  triggeringRule?: string;
}

export interface PhaseTransitionState {
  openingToMiddlegameFired: boolean;
  middlegameToEndgameFired: boolean;
}

export interface LastMoveSnapshot {
  fen: string;
  san: string;
  /** Ply count. Odd = white's move. */
  moveNumber: number;
  isCoachMove: boolean;
}

export function createPhaseTransitionState(): PhaseTransitionState {
  return {
    openingToMiddlegameFired: false,
    middlegameToEndgameFired: false,
  };
}






/**
 * Detect a phase transition produced by the most recent STUDENT move.
 * Returns `null` when no transition should fire, otherwise returns the
 * event AND mutates `state` so the boundary is marked fired. Never
 * mutates state when returning null.
 */
export function detectPhaseTransition(
  lastMove: LastMoveSnapshot,
  state: PhaseTransitionState,
  playerColor: 'white' | 'black',
): PhaseTransitionEvent | null {

  // Only the student's moves trigger narration — coach moves don't.
  if (lastMove.isCoachMove) {
    return null;
  }

  const phase = classifyPhase(lastMove.fen, { ply: lastMove.moveNumber });

  // ── Opening → middlegame ─────────────────────────────────────────
  // Per WO-PHASE-FIX-03 + WO-PHASE-FIX-02: seven-rule OR, first match
  // wins. classifyPhase is NOT a gate here — these rules ARE the
  // opening-end definition. classifyPhase remains in use for
  // middlegame → endgame only.
  //
  //   Rule 1: Both sides developed ≥ 3 of 4 minors AND full move ≥ 8.
  //   Rule 2: Student has castled AND their rooks on the back rank
  //           (handles O-O AND O-O-O via hasCastled).
  //   Rule 3: A queen or rook has been captured at any point.
  //   Rule 4: Full move ≥ 15 (absolute safety net; opening is over).
  //   Rule 5 (NEW, FIX-02): Central pawns resolved AND total minor
  //          development ≥ 5. Catches games where the king stays
  //          central but the structure is clearly past opening.
  //   Rule 6 (NEW, FIX-02): Either side has all 4 minors developed
  //          AND full move ≥ 10. Catches asymmetric games where one
  //          side is fully out before the other.
  //   Rule 7 (NEW, FIX-02): Full move ≥ 12 AND total minors ≥ 5.
  //          Earlier-than-15 tempo trigger when development is
  //          obviously complete; the absolute safety net at Rule 4
  //          remains as the lower-bound floor.
  if (!state.openingToMiddlegameFired) {
    const fullMoveNumber = Math.ceil(lastMove.moveNumber / 2);
    const triggeringRule = openingEndRule(lastMove.fen, fullMoveNumber, playerColor);
    if (triggeringRule) {
      state.openingToMiddlegameFired = true;
      // ONE BEAT WHEN THE OPENING ENDS IN A QUEENLESS POSITION (hand walk
      // 2026-09-27, Najdorf after the queen trade): "before the middlegame gets
      // going, the balance sheet" and, two moves later with nothing traded,
      // "the endgame starts here, take stock" — the same stock taken twice.
      // The board already qualifies as an endgame here, so that beat is spent;
      // the endgame beat is marked spent.
      if (phase === 'endgame' || isEndgameByMaterial(lastMove.fen)) state.middlegameToEndgameFired = true;
      return {
        kind: 'opening-to-middlegame',
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        playerColor,
        triggeringMoveSan: lastMove.san,
        triggeringRule,
      };
    }
  }

  // ── Middlegame → endgame ─────────────────────────────────────────
  if (!state.middlegameToEndgameFired) {
    const inEndgame = phase === 'endgame' || isEndgameByMaterial(lastMove.fen);
    if (inEndgame) {
      state.middlegameToEndgameFired = true;
      return {
        kind: 'middlegame-to-endgame',
        fen: lastMove.fen,
        moveNumber: lastMove.moveNumber,
        playerColor,
        triggeringMoveSan: lastMove.san,
      };
    }
  }

  return null;
}

/**
 * WHEN THE NO-FIRE DIAGNOSTIC MAY BE WRITTEN (WO-STANDARD-01 H5).
 *
 * PostHog, native, 30d: `phase_transition_suppressed` fired 941 times on four
 * devices — 512 "skipped: coach move (ply N)" rows and 428 "no-fire" rows, one
 * PER PLY, against ONE genuine suppression. A noise audit event is a lying
 * instrument: the row that meant something was invisible among the rows that
 * meant nothing.
 *
 * Two changes, decided here so the page cannot re-derive them:
 *  - a COACH move is not a suppression. The detector declines it by contract
 *    ("only the student's moves trigger narration"), so there is nothing to
 *    report and it is never written.
 *  - a NO-FIRE row is written once per SIGNATURE — the tuple of inputs the
 *    four rules read (phase, development, castling, rook connection, the
 *    major-capture flag). A run of plies where none of those changed is one
 *    fact, not forty rows. The diagnostic value WO-PHASE-FIX-03 wanted ("which
 *    rules are close to firing") survives: the row is written the moment any
 *    input moves.
 */
export function phaseDiagnosticSignature(d: PhaseTransitionDiagnostic): string {
  return [
    d.phase,
    `dev=${d.developedMinors.white}/${d.developedMinors.black}`,
    `castled=${d.studentCastled}`,
    `rooks=${d.studentRooksOnBackRank}`,
    `major=${d.majorPieceCaptured}`,
    `o2m=${d.openingToMiddlegameFired}`,
    `m2e=${d.middlegameToEndgameFired}`,
  ].join('|');
}

export type PhaseAuditPlan =
  | { write: false; why: 'coach-move' | 'unchanged'; signature: string | null }
  | { write: true; signature: string };

/** Decide whether the no-fire diagnostic for this ply is worth a row.
 *  `lastSignature` is the signature of the last row WRITTEN (null before the
 *  first). Pure — the page keeps the ref, this keeps the rule. */
export function planPhaseNoFireAudit(
  lastMove: Pick<LastMoveSnapshot, 'isCoachMove'>,
  diag: PhaseTransitionDiagnostic,
  lastSignature: string | null,
): PhaseAuditPlan {
  if (lastMove.isCoachMove) return { write: false, why: 'coach-move', signature: lastSignature };
  const signature = phaseDiagnosticSignature(diag);
  if (signature === lastSignature) return { write: false, why: 'unchanged', signature };
  return { write: true, signature };
}

export interface PhaseTransitionDiagnostic {
  moveNumber: number;
  san: string;
  isCoachMove: boolean;
  fullMoveNumber: number;
  phase: 'opening' | 'middlegame' | 'endgame';
  studentCastled: boolean;
  studentRooksOnBackRank: boolean;
  /** WO-PHASE-FIX-03: added for Rule 1 (development threshold). */
  developedMinors: { white: number; black: number; total: number };
  /** WO-PHASE-FIX-03: added for Rule 3 (major-piece-captured trigger). */
  majorPieceCaptured: boolean;
  endgameByMaterialFallback: boolean;
  openingToMiddlegameFired: boolean;
  middlegameToEndgameFired: boolean;
}

/** Snapshot every input the detector considers for a given move so
 *  callers can write an audit trail. Cheap enough to run every move;
 *  the caller decides when to actually log (e.g. only when the
 *  detector returned null on a past-opening student move).
 *
 *  Added by WO-PHASE-FIX-01; expanded by WO-PHASE-FIX-03 to carry the
 *  per-side development count + major-capture flag so the audit log
 *  shows exactly which of the four opening-end rules are close. */
export function phaseTransitionDiagnostic(
  lastMove: LastMoveSnapshot,
  state: PhaseTransitionState,
  playerColor: 'white' | 'black',
): PhaseTransitionDiagnostic {
  return {
    moveNumber: lastMove.moveNumber,
    san: lastMove.san,
    isCoachMove: lastMove.isCoachMove,
    fullMoveNumber: Math.ceil(lastMove.moveNumber / 2),
    phase: classifyPhase(lastMove.fen, { ply: lastMove.moveNumber }),
    studentCastled: hasCastled(lastMove.fen, playerColor),
    studentRooksOnBackRank: rooksConnected(lastMove.fen, playerColor),
    developedMinors: countDevelopedMinors(lastMove.fen),
    majorPieceCaptured: hasMajorPieceCaptured(lastMove.fen),
    endgameByMaterialFallback: isEndgameByMaterial(lastMove.fen),
    openingToMiddlegameFired: state.openingToMiddlegameFired,
    middlegameToEndgameFired: state.middlegameToEndgameFired,
  };
}
