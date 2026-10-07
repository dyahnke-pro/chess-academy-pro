// planThread — THE STUDENT'S STRUCTURAL PLAN ACROSS A GAME (David 2026-10-07:
// "Learn needs to state the structural plans!!" and "The prove it is the part
// that needs to be spoken").
//
// One thread per game, read once per opponent move:
//   • THEIR move is checked against the plan the student heard — stopped with
//     a cause on the board → the proof is said (`planStopped`); twice in a row
//     → "good defending" and the fallback; three → the honest verdict.
//   • THEN the board's plan (`deriveNextPlanFacts`, highest priority first) is
//     stated when there is none, or when the old one is gone: "The plan from
//     here is …", "The new plan is …" after a stop, "The plan changes here —
//     now it's …" when it changed for any other reason.
//   • A plan that changes WITHOUT a proven cause inside PLAN_HOLD_PLIES of the
//     last one is the read wobbling, not the plan — held.
// PURE: no store, no voice. The caller speaks the lines and keeps the thread.
import type { Color } from 'chess.js';
import { deriveNextPlanFacts, type PlanFact } from './nextPlans';
import { planStoppedProof, planStoppedLine } from './planStopped';
import { NO_PROOF, type FactProof } from './proof';

/** How long a stated plan holds before an unexplained change may replace it. */
export const PLAN_THREAD_HOLD_PLIES = 4;

export interface PlanThread {
  stated: { fact: PlanFact; ply: number } | null;
  stoppedInRow: number;
  wasStopped: boolean;
  lastStatedPly: number | null;
}

export function newPlanThread(): PlanThread {
  return { stated: null, stoppedInRow: 0, wasStopped: false, lastStatedPly: null };
}

export interface PlanThreadLine {
  text: string;
  squares: string[];
  /** Say-once key for the claim ledger. */
  claim: string;
  /** The stop is proven off their move (exact, read from the board); a new
   *  plan is a description of the position. */
  proof: FactProof;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * One opponent move. `fenBefore` is the board their move was played from,
 * `fenAfter` the board after it, the student to move. Mutates `t`; returns the
 * lines to say, in order (the stop, then the plan).
 */
export function planThreadTurn(
  t: PlanThread,
  args: { ply: number; fenBefore: string; fenAfter: string; student: Color },
): PlanThreadLine[] {
  const out: PlanThreadLine[] = [];
  // A plan that held long enough means they were not shutting plans down.
  if (t.stated && args.ply - t.stated.ply >= PLAN_THREAD_HOLD_PLIES * 2) t.stoppedInRow = 0;
  if (t.stated) {
    const proof = planStoppedProof(t.stated.fact, args.fenBefore, args.fenAfter, args.student);
    if (proof) {
      t.stoppedInRow += 1;
      out.push({ text: planStoppedLine(proof, t.stoppedInRow, args.fenAfter, args.student), squares: t.stated.fact.squares, claim: `plan:stopped:${t.stated.fact.id}:${args.ply}`, proof: { kind: 'squares', exact: true, short: proof, full: proof, squares: t.stated.fact.squares } });
      t.stated = null;
      t.lastStatedPly = null;   // a proven stop is not a wobble: the next plan follows at once
      t.wasStopped = true;
    }
  }
  const plans = deriveNextPlanFacts(args.fenAfter, args.student);
  const top = plans[0];
  if (!top) return out;
  if (t.stated && plans.some((p) => p.id === t.stated?.fact.id)) return out;   // the plan stands
  if (t.lastStatedPly !== null && args.ply - t.lastStatedPly < PLAN_THREAD_HOLD_PLIES) return out;   // a wobble
  const body = top.text.replace(/^the plan from here is to /i, '');
  const text = t.wasStopped
    ? `The new plan is to ${body}.`
    : t.stated || t.lastStatedPly !== null
      ? `The plan changes here — now it's to ${body}.`
      : `${cap(top.text)}.`;
  out.push({ text, squares: top.squares, claim: `plan:student:struct:${top.id}:${args.ply}`, proof: NO_PROOF.description });
  t.stated = { fact: top, ply: args.ply };
  t.lastStatedPly = args.ply;
  t.wasStopped = false;
  return out;
}
