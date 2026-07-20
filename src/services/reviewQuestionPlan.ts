// reviewQuestionPlan — decide WHERE the review stops to ask a question.
// (David 2026-07-20: "I don't want the user overwhelmed with questions — insert
//  them ONLY when they are relevant… like find-the-shot before a miss.")
//
// The review used to fire diagnostic cards at arbitrary one-shot plies (the
// first position where a trap existed, a random forcing move). That's the
// overwhelm. This module computes the question plan UP FRONT from the walk's
// segments: every question is tied to the student's ACTUAL move at that ply, the
// moments are RANKED by how much was at stake, and only the top `budget` fire
// mid-game. The end-of-game turning-point question is separate (always at most
// one, at the end) — so the whole review stops at most `budget + 1` times.
//
// Kinds, in relevance order at a single ply:
//   • find-shot — you were clearly winning and MISSED a notable shot → "find it".
//   • trap      — your flagged move GRABBED poisoned material → "was that safe?".
//   • why       — any other slip → "why'd you play that?" (+ its rewind follow-on).
//
// 100% G0: severity is the engine's own centipawn loss; the trap test is static
// exchange (seeGain). Nothing here is invented.

import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { seeGain } from './positionReadingService';
import { GUIDED_FIND_MIN_EVAL_CP } from './guidedFindTheMove';

export type ReviewQuestionKind = 'find-shot' | 'trap' | 'why';

export interface ReviewQuestionMoment {
  ply: number;
  kind: ReviewQuestionKind;
  /** Pawns at stake — the ranking key (bigger = more worth stopping for). */
  severity: number;
}

/** The minimal segment shape the planner reads (a subset of ReviewMoveSegment). */
export interface QuestionPlanSegmentLike {
  ply: number;
  san: string;
  fenBefore: string;
  classification: string | null;
  evalBefore: number | null;
  evalAfter: number | null;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  isCoachMove?: boolean;
  /** Mover color as the walk carries it (parity-derived). */
  playerColor: 'white' | 'black';
}

/** Did the flagged move GRAB poisoned material — a capture that loses by force
 *  from the position before it (SEE < ~0)? That's the trap the student fell for. */
export function playedCaptureIsPoisoned(fenBefore: string, san: string): boolean {
  try {
    const probe = new Chess(fenBefore);
    const mv = probe.move(san);
    if (!mv || !mv.captured) return false;
    const before = new Chess(fenBefore);
    // seeGain returns the net for the side capturing on that square (the student).
    return seeGain(before, mv.to as Square) <= -1;
  } catch {
    return false;
  }
}

/**
 * Compute the mid-game question plan: the ranked, budget-capped set of moments
 * the review should stop at. `budget` is the max number of mid-game stops
 * (the turning-point question is separate). Returns a Map keyed by ply so the
 * walk can O(1) ask "should I stop here, and with what?".
 */
export function selectReviewQuestions(
  segments: ReadonlyArray<QuestionPlanSegmentLike>,
  playerColor: 'white' | 'black',
  opts: { budget: number },
): Map<number, ReviewQuestionMoment> {
  const candidates: ReviewQuestionMoment[] = [];
  const sign = playerColor === 'white' ? 1 : -1;

  for (const seg of segments) {
    // Only the student's OWN flagged decisions are question-worthy.
    if (seg.isCoachMove) continue;
    if (seg.playerColor !== playerColor) continue;
    const flagged = seg.classification === 'inaccuracy' || seg.classification === 'mistake' || seg.classification === 'blunder';
    if (!flagged) continue;

    const cpLoss = seg.evalBefore != null && seg.evalAfter != null
      ? (seg.evalBefore - seg.evalAfter) * sign
      : 0;
    const severity = cpLoss > 0 ? cpLoss / 100 : 0;
    const evalBeforeMover = seg.evalBefore != null ? seg.evalBefore * sign : null;

    let kind: ReviewQuestionKind;
    if (
      seg.bestMoveUci
      && evalBeforeMover !== null
      && evalBeforeMover >= GUIDED_FIND_MIN_EVAL_CP
      && seg.bestMoveSan !== seg.san
    ) {
      // You were clearly better and missed the engine's move → find-the-shot.
      kind = 'find-shot';
    } else if (playedCaptureIsPoisoned(seg.fenBefore, seg.san)) {
      // Your flagged move grabbed poisoned material → the trap.
      kind = 'trap';
    } else {
      kind = 'why';
    }
    candidates.push({ ply: seg.ply, kind, severity });
  }

  // Rank by how much was at stake; keep the top `budget`. Ties break earlier-ply
  // first (chronological), so an early crisis isn't dropped for a later equal one.
  const chosen = [...candidates]
    .sort((a, b) => (b.severity - a.severity) || (a.ply - b.ply))
    .slice(0, Math.max(0, opts.budget));

  return new Map(chosen.map((m) => [m.ply, m]));
}
