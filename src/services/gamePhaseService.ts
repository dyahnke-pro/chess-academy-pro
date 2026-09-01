import type { CoachGameMove, GamePhase, PhaseAccuracy } from '../types';
import { winPercent, accuracyFromWinDelta } from './accuracyService';

/**
 * Piece material values. Counts every non-king piece INCLUDING pawns — the
 * start position totals 78, which `gamePhaseService.test` pins.
 *
 * The old comment here claimed pawns were excluded, and
 * ENDGAME_MATERIAL_THRESHOLD was calibrated against that fiction. See
 * `isEndgameByMaterial` for what replaced it.
 */
const PIECE_VALUES: Record<string, number> = {
  q: 9, Q: 9,
  r: 5, R: 5,
  b: 3, B: 3,
  n: 3, N: 3,
  p: 1, P: 1,
};

/** @deprecated Calibrated as though `countMaterial` excluded pawns; it does
 *  not, so this can barely fire. Kept only so an external caller does not break
 *  on the symbol — use `isEndgameByMaterial`. */
export const ENDGAME_MATERIAL_THRESHOLD = 13;

/** Opening cutoff — moves at or below this number are considered opening */
const OPENING_MOVE_CUTOFF = 10;

/**
 * Count total material on the board from a FEN string (excluding kings).
 */
export function countMaterial(fen: string): number {
  const ranks = fen.split(' ')[0];
  let total = 0;
  for (const char of ranks) {
    if (char in PIECE_VALUES) {
      total += PIECE_VALUES[char];
    }
  }
  return total;
}

/**
 * Classify the game phase for a given position.
 *
 * - `opening`: moveNumber ≤ 10
 * - `endgame`: total piece material ≤ 13 (excluding kings)
 * - `middlegame`: everything else
 *
 * Note: moveNumber is 1-indexed (move 1, move 2, etc.)
 * where odd = white's move, even = black's move.
 * We use the chess "full move" number: Math.ceil(moveNumber / 2).
 */
export function classifyPhase(fen: string, moveNumber: number): GamePhase {
  const fullMoveNumber = Math.ceil(moveNumber / 2);

  if (fullMoveNumber <= OPENING_MOVE_CUTOFF) {
    return 'opening';
  }

  // Structural test, not a material threshold — queens off, or one side
  // reduced to a bare king and a piece. The old `countMaterial(fen) <= 13`
  // could barely ever fire because pawns count toward that total.
  if (isEndgameByMaterial(fen)) {
    return 'endgame';
  }

  return 'middlegame';
}

/**
 * Compute accuracy + mistake counts per game phase for a given player
 * color. Uses the SAME win-percent + harmonic-mean algorithm as
 * `calculateAccuracy` so per-phase grades agree with the hero accuracy
 * number on the review summary card. The previous arithmetic-mean
 * `cpLossToAccuracy` path consistently overreported phase accuracy —
 * one blunder + 30 clean moves came back as 96.7% phase / 47% hero
 * because arithmetic mean ≠ harmonic mean. Same algo means same scale.
 */
export function getPhaseBreakdown(
  moves: CoachGameMove[],
  playerColor: 'white' | 'black',
): PhaseAccuracy[] {
  const phases: Record<GamePhase, { accs: number[]; mistakes: number }> = {
    opening: { accs: [], mistakes: 0 },
    middlegame: { accs: [], mistakes: 0 },
    endgame: { accs: [], mistakes: 0 },
  };

  for (const move of moves) {
    // Skip coach moves
    if (move.isCoachMove) continue;

    // Filter by player color: odd moveNumber = white, even = black
    const isWhiteMove = move.moveNumber % 2 === 1;
    if ((playerColor === 'white' && !isWhiteMove) || (playerColor === 'black' && isWhiteMove)) {
      continue;
    }

    // Book moves are excluded from accuracy in `calculateAccuracy`; we
    // mirror that here so book-heavy openings don't drag the phase
    // grade above the player's actual play.
    if (move.classification === 'book') continue;

    // Need evaluations for accuracy
    if (move.evaluation === null || move.preMoveEval === null) {
      continue;
    }

    const phase = classifyPhase(move.fen, move.moveNumber);
    const bucket = phases[phase];

    // Win-percent must be from the moving side's perspective. Same
    // contract as calculateAccuracy:108-118.
    const winBefore = isWhiteMove
      ? winPercent(move.preMoveEval)
      : 100 - winPercent(move.preMoveEval);
    const winAfter = isWhiteMove
      ? winPercent(move.evaluation)
      : 100 - winPercent(move.evaluation);

    const moveAcc = accuracyFromWinDelta(winBefore - winAfter);
    bucket.accs.push(moveAcc);

    // Count mistakes (inaccuracy, mistake, blunder)
    const cls = move.classification;
    if (cls === 'inaccuracy' || cls === 'mistake' || cls === 'blunder') {
      bucket.mistakes++;
    }
  }

  return (['opening', 'middlegame', 'endgame'] as GamePhase[]).map((phase) => {
    const bucket = phases[phase];
    return {
      phase,
      accuracy: bucket.accs.length > 0
        ? Math.round(harmonicMean(bucket.accs) * 10) / 10
        : 0,
      moveCount: bucket.accs.length,
      mistakes: bucket.mistakes,
    };
  });
}

/**
 * Harmonic mean — same aggregator `calculateAccuracy` uses in
 * `accuracyService`. Gives extra weight to bad moves so a single
 * blunder drags the phase grade down meaningfully instead of being
 * averaged away by a stretch of clean moves. Clamped at 1 per value to
 * avoid division-by-zero on perfect-zero scores (matches the upstream
 * implementation).
 */
function harmonicMean(values: number[]): number {
  if (values.length === 0) return 0;
  let reciprocalSum = 0;
  for (const v of values) {
    reciprocalSum += 1 / Math.max(1, v);
  }
  return values.length / reciprocalSum;
}

const PHASE_THE: Record<GamePhase, string> = {
  opening: 'the opening',
  middlegame: 'the middlegame',
  endgame: 'the endgame',
};

/**
 * PHASE-SCOPED REVIEW SUMMARY (Batch C, David 2026-09-01: "filter the post-game
 * review to the phase the student's trainingFocus flags, so a review zooms to
 * where they actually lose").
 *
 * When the student has declared a training focus on a PHASE, the review leads
 * with how THAT phase went in this game — grounded entirely in the already-
 * computed `getPhaseBreakdown` numbers (accuracy + mistake count per phase).
 * G0: states the student's real figures; the LLM only phrases them (or preferRaw
 * speaks the computed prose). Returns null when the focus phase never occurred
 * in this game (empty > invented) so the review falls back to its normal open.
 *
 * It ELEVATES the focus phase (leads + contrasts) rather than HIDING the other
 * phases — a hung rook in the endgame is still worth teaching even on a
 * middlegame-focus day; the zoom is emphasis, not blindness.
 */
export function phaseScopedReviewSummary(
  breakdown: PhaseAccuracy[],
  focusArea: GamePhase,
): { facts: string; focusPhase: GamePhase; focusMistakes: number; wasWorstPhase: boolean } | null {
  const focus = breakdown.find((b) => b.phase === focusArea);
  if (!focus || focus.moveCount === 0) return null; // this game never reached the focus phase
  const others = breakdown.filter((b) => b.phase !== focusArea && b.moveCount > 0);
  const the = PHASE_THE[focusArea];
  const acc = Math.round(focus.accuracy);
  const m = focus.mistakes;
  const slip = m === 0 ? 'no slips' : `${m} slip${m === 1 ? '' : 's'}`;

  // Was the focus phase the student's WORST this game? (Most mistakes, ties
  // broken by lower accuracy.) That decides the framing — "this is where it
  // turned" vs "this one actually held up; the trouble was elsewhere".
  const worst = [...breakdown].filter((b) => b.moveCount > 0)
    .sort((a, b) => b.mistakes - a.mistakes || a.accuracy - b.accuracy)[0];
  const wasWorstPhase = worst?.phase === focusArea && (focus.mistakes > 0);

  let facts: string;
  if (wasWorstPhase) {
    facts = `You're working on ${the}, and this game turned there — ${slip} at ${acc}% accuracy, your leakiest phase here.`;
  } else if (others.length > 0) {
    // Name where it actually went wrong, honestly, so the focus isn't oversold.
    const otherWorst = [...others].sort((a, b) => b.mistakes - a.mistakes || a.accuracy - b.accuracy)[0];
    if (otherWorst && otherWorst.mistakes > focus.mistakes) {
      facts = `You're working on ${the}, and it mostly held here — ${slip} at ${acc}%. The trouble this game was ${PHASE_THE[otherWorst.phase]} (${otherWorst.mistakes} slip${otherWorst.mistakes === 1 ? '' : 's'}), so watch that too.`;
    } else {
      facts = `You're working on ${the}: ${slip} here at ${acc}% accuracy. Let's see how it played out.`;
    }
  } else {
    facts = `You're working on ${the}: ${slip} here at ${acc}% accuracy. Let's see how it played out.`;
  }
  return { facts, focusPhase: focusArea, focusMistakes: m, wasWorstPhase };
}

/** True when a training-focus area maps to a game PHASE the review can scope to. */
export function isPhaseFocus(area: string | null | undefined): area is GamePhase {
  return area === 'opening' || area === 'middlegame' || area === 'endgame';
}

/** THE middlegame → endgame test, shared by every surface that needs one.
 *
 *  Lived privately in `phaseTransitionDetector` until 2026-08-05, while
 *  `classifyPhase` used a material THRESHOLD that was quietly broken:
 *  `ENDGAME_MATERIAL_THRESHOLD = 13` was calibrated as though `countMaterial`
 *  excluded pawns (its `PIECE_VALUES` comment says so) — but it counts them, so
 *  the sixteen pawns alone outweigh the threshold. A double-rook ending with
 *  fourteen pawns scores 40 and was classified MIDDLEGAME. Measured over 17,727
 *  plies of 200 real games, that rule found an endgame on 5.5% of them against
 *  31.6% for the test below.
 *
 *  `countMaterial` is left alone deliberately: its tests pin 78 for the start
 *  position, so "all material including pawns" is its intended contract. The
 *  threshold was the mistake, not the count.
 *  Fires when:
 *    - queens are off (any rook count), OR
 *    - either side is reduced to bare king or king + ≤ 1 minor (the
 *      "lopsided endgame" — even with the winning side still holding
 *      a queen, this is structurally an endgame: the losing side's
 *      coaching priority is king activity, not middlegame planning).
 *
 *  Audit cycle 8 surfaced the lopsided gap: kQ6/8/p7/P7/4PB2/1p6/
 *  1PP2PPP/R3K2R was sitting on "phase=middlegame" for moves on end,
 *  even though black had only king + 2 pawns. The original spec
 *  required queens off; the lopsided clause closes that hole. */
export function isEndgameByMaterial(fen: string): boolean {
  const board = fen.split(' ')[0] ?? '';
  let whiteQueens = 0;
  let blackQueens = 0;
  let whiteRooks = 0;
  let blackRooks = 0;
  let whiteMinors = 0;
  let blackMinors = 0;
  for (const ch of board) {
    if (ch === 'Q') whiteQueens++;
    else if (ch === 'q') blackQueens++;
    else if (ch === 'R') whiteRooks++;
    else if (ch === 'r') blackRooks++;
    else if (ch === 'B' || ch === 'N') whiteMinors++;
    else if (ch === 'b' || ch === 'n') blackMinors++;
  }
  const queensOff = whiteQueens === 0 && blackQueens === 0;
  if (queensOff && whiteRooks <= 1 && blackRooks <= 1) return true;
  if (queensOff) return true;
  // Lopsided clause: one side is reduced to king + ≤ 1 piece (where
  // a "piece" is a queen, rook, or minor — pawns alone don't count
  // as material for this purpose).
  const whitePieces = whiteQueens + whiteRooks + whiteMinors;
  const blackPieces = blackQueens + blackRooks + blackMinors;
  if (whitePieces <= 1 || blackPieces <= 1) return true;
  return false;
}
