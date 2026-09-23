// liveStrength — MATCH THE OPPONENT TO THE STUDENT IN REAL TIME, FROM MOVE ONE
// (WO-LAYERS-01 step 8; CLAUDE.md "STRENGTH IS MATCHED IN REAL TIME": "The
// coach can match in real time as they play on the board for the first time").
//
// A new player starts at the lowest setting (DEFAULT_STUDENT_RATING, David
// 2026-09-23: "this app attacks beginner players"). Without this, a strong
// newcomer would crush that bot for five games before the coach-game Elo
// noticed. The board is the calibration.
//
// 🔒 ONE DETECTOR, TWO CONSUMERS (locked): this reads EXACTLY what
// `capabilityEvidence` records for the heat map — did the board POSE a
// question (`capabilitiesPosed`, with its importance), and did the student
// ANSWER it (`movePlayedCleanly` on the real cpLoss). It is not a second
// estimator; it is the same measurement feeding the opponent's strength.
//
// The two traps the foundation names, both handled:
//  1. MEASURE AGAINST THE POSITION, NEVER THE RESULT — every input is graded
//     against the engine's best move at that board, so a mismatch that is
//     crushing the student does not read as "weak player".
//  2. DAMP IT — one move moves the estimate by a bounded step, and UP moves
//     faster than DOWN, so a strong player mis-rated low recovers quickly and
//     one blunder never sinks anyone 300 points.
import { capabilitiesPosed, movePlayedCleanly, PROVEN_MIN_IMPORTANCE } from './capabilityEvidence';

export interface LiveStrength {
  rating: number;
  /** Moves that carried evidence — a confidence count, never shown as a rating. */
  evidence: number;
}

export const LIVE_MIN = 400;
export const LIVE_MAX = 2800;
/** Largest single-move step. Damped: one move never swings the opponent. */
export const STEP_UP = 60;
export const STEP_DOWN = 35;

export function startLiveStrength(rating: number): LiveStrength {
  return { rating: Math.min(LIVE_MAX, Math.max(LIVE_MIN, Math.round(rating))), evidence: 0 };
}

/**
 * One student move → the next estimate. Only moves where the board posed a
 * REAL question (importance at the proven bar) count; book moves played
 * correctly, and quiet moves nothing hinged on, tell us little and move nothing.
 */
export function updateLiveStrength(
  s: LiveStrength,
  move: { fenBefore: string; san: string; moverColor: 'white' | 'black'; cpLoss: number | null },
): LiveStrength {
  if (move.cpLoss == null) return s;
  let posed: ReturnType<typeof capabilitiesPosed>;
  try { posed = capabilitiesPosed(move.fenBefore, move.san, move.moverColor); } catch { return s; }
  const real = posed.filter((p) => p.posedImportance >= PROVEN_MIN_IMPORTANCE);
  if (real.length === 0) return s;
  const answered = movePlayedCleanly(move.cpLoss);
  const next = answered ? s.rating + STEP_UP : s.rating - STEP_DOWN;
  return { rating: Math.min(LIVE_MAX, Math.max(LIVE_MIN, next)), evidence: s.evidence + 1 };
}
