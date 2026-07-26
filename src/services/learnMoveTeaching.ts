/**
 * learnMoveTeaching — grounded per-move "why" for the LEARN surface
 * (`/coach/teach`), ported from the post-game review's better-move engine
 * (task #26 Phase B, David 2026-07-22: port the review coach into Learn).
 *
 * Pure board facts (G0/G3): no LLM, no engine — every claim is computed from
 * chess.js, so nothing can be invented or overstated. Returns null when the
 * position deserves silence (empty > generic > invented).
 *
 * REGISTER: this module is used ONLY where the STUDENT is the mover (a drill /
 * find-the-move / guided-play answer), so the "your move" seat framing that
 * `explainBestMoveGrounded` produces is CORRECT here. Do NOT reuse it for the
 * passive Watch walkthrough narration, where the mover is White/Black in a demo
 * game and there is no "you" — that path needs a side-reframed overlay (the
 * two-register law of 2026-07-19).
 */
import { Chess } from 'chess.js';
import { explainBestMoveGrounded, detectNewThreat, describeThreatRecognition } from './groundedAnswer';
import { buildReviewMoveTeaching } from './reviewMoveTeaching';
import { deriveNextPlans } from './reviewTeachingPoints';

/**
 * When the student plays `tried` in a drill but the taught move is `expected`,
 * build the grounded correction: WHY the right move is right, and what the
 * played move let slip. Prefers `explainBestMoveGrounded` (contrasts played vs
 * best — its `costClause` names the concrete consequence of the slip), falling
 * back to the structural "why the move is strong" note. Returns null for
 * silence when neither computer finds a board-true idea.
 */
export function buildDrillWrongTeaching(
  drillFen: string,
  tried: string,
  expected: string,
): string | null {
  try {
    const probe = new Chess(drillFen);
    const expMv = probe.move(expected);
    if (!expMv) return null;
    const expectedUci = `${expMv.from}${expMv.to}${expMv.promotion ?? ''}`;
    const moverColor: 'white' | 'black' =
      drillFen.split(' ')[1] === 'b' ? 'black' : 'white';
    return (
      explainBestMoveGrounded(drillFen, tried, expectedUci, moverColor) ??
      buildReviewMoveTeaching(drillFen, expected)
    );
  } catch {
    return null;
  }
}

export interface DrillBetterLineStep {
  /** SAN of this move in the correct continuation. */
  san: string;
  /** FEN AFTER this move — the hook sets the board to it to play the line out. */
  fen: string;
  /** True on the STUDENT's moves (they get a spoken why); false on the
   *  opponent's replies (played out silently, just to show the continuation). */
  isStudent: boolean;
  /** Grounded per-move why on the student's moves (board facts, G0/G3), else
   *  null — so the walkout teaches the plan, not just the moves. */
  why: string | null;
}

/**
 * Build the "better line" WALKOUT for a drill miss (David 2026-07-26: upgrade
 * Learn's thinner wrong-answer text to Review's played-out better line — Danya's
 * #1 habit). The correct continuation is ALREADY KNOWN (the drill's own line),
 * so — unlike Review — no engine is needed: replay `lineMoves` from
 * `drillMoveIndex` and hand back each step's FEN + a grounded why on the
 * student's moves. The hook plays these out move-by-move, then resets for a
 * retry. Register-safe: the student is the mover, so "your move" framing holds.
 */
export function buildDrillBetterLine(
  drillFen: string,
  lineMoves: string[],
  drillMoveIndex: number,
  maxPlies = 6,
): DrillBetterLineStep[] {
  const steps: DrillBetterLineStep[] = [];
  let chess: Chess;
  try {
    chess = new Chess(drillFen);
  } catch {
    return steps;
  }
  for (let k = 0; k < maxPlies && drillMoveIndex + k < lineMoves.length; k += 1) {
    const san = lineMoves[drillMoveIndex + k];
    const fenBefore = chess.fen();
    let mv;
    try {
      mv = chess.move(san);
    } catch {
      break;
    }
    if (!mv) break;
    // The drill move (k=0) is the student's; the line then alternates.
    const isStudent = k % 2 === 0;
    steps.push({
      san: mv.san,
      fen: chess.fen(),
      isStudent,
      why: isStudent ? buildReviewMoveTeaching(fenBefore, mv.san) : null,
    });
  }
  return steps;
}

/**
 * SPOT-IT into Learn (David 2026-07-26: the Review-only recognition teaching now
 * fires in the interactive drill too). After the student plays correctly and the
 * opponent's reply auto-plays, if that reply created a concrete NEW threat AGAINST
 * the student, teach the PATTERN to see it coming — `describeThreatRecognition`,
 * computed from the DetectedThreat package (G0). Register-safe: the student is the
 * VICTIM/defender here, so the "you"/"yours" seat framing is CORRECT (this is the
 * register-clean interactive path — do NOT reuse it for the passive Watch demo,
 * which has no "you"). Returns null for silence when the reply is quiet.
 */
export function buildDrillThreatSpot(
  fenBeforeOpponentReply: string,
  fenAfterOpponentReply: string,
  studentSide: 'white' | 'black',
): string | null {
  const studentWB: 'w' | 'b' = studentSide === 'white' ? 'w' : 'b';
  const opponentWB: 'w' | 'b' = studentWB === 'w' ? 'b' : 'w';
  const threat = detectNewThreat(fenBeforeOpponentReply, fenAfterOpponentReply, opponentWB);
  if (!threat) return null;
  return describeThreatRecognition(threat, fenAfterOpponentReply, studentWB);
}

/**
 * POSITIONAL PLAN into Learn (David 2026-07-26: the Review-only "the plan from
 * here" teaching now fires when an interactive drill line completes). At the
 * natural pause where the taught line ends, hand the student the top forward plan
 * for the reached position — `deriveNextPlans`, board-derived (G0), student's POV.
 * Register-safe: the student is the side to play the plan, so "you"/"your" framing
 * is CORRECT. Returns null for silence when the position is too early / quiet for a
 * concrete plan (most plan clauses gate on a real middlegame — empty > generic).
 */
export function buildDrillCompletionPlan(
  finalFen: string,
  studentSide: 'white' | 'black',
): string | null {
  const studentWB: 'w' | 'b' = studentSide === 'white' ? 'w' : 'b';
  return deriveNextPlans(finalFen, studentWB)[0] ?? null;
}
