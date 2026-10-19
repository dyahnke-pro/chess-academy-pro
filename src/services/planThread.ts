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
import { openSentence } from '../utils/openSentence';
import type { Color } from 'chess.js';
import { deriveNextPlanFacts, type PlanFact, type PlanKind } from './nextPlans';
import { planStoppedProof, planStoppedLine } from './planStopped';
import { NO_PROOF, type FactProof } from './proof';
import { methodRead, methodLine, methodSquares, methodPlan, whyThisPlan, planWorth, type RouteArrow } from './planChoice';
import { planStepLine } from './planStep';
import { askThenAnswer } from '../utils/thinkPause';
import { classifyPhase } from './gamePhaseService';

/** The plan's goal in the plan arc's own id form (`aimsOf`): a passer and a
 *  file by their file, an outpost by its square, the king attack as one. Null
 *  for a plan the arc has no aim for. */
export function planAimKey(kind: string, at: string | null): string | null {
  if (kind === 'king-attack') return 'plan-aim:king-attack';
  if (!at) return null;
  if (kind === 'passer') return `plan-aim:passer:${at[0]}`;
  if (kind === 'open-file') return `plan-aim:file:${at[0]}`;
  if (kind === 'outpost') return `plan-aim:outpost:${at}`;
  return null;
}

/** The plan kinds in the order `deriveNextPlanFacts` ranks them (lower =
 *  higher priority). A new kind fails to compile until it is placed. */
const KIND_RANK: Record<PlanKind, number> = {
  'king-attack': 0, passer: 1, 'weak-pawn': 2, 'open-file': 3, outpost: 4, 'worst-piece': 5, convert: 6, 'bishop-pair': 7,
};

/** How long a stated plan holds before an unexplained change may replace it. */
export const PLAN_THREAD_HOLD_PLIES = 4;

export interface PlanThread {
  stated: { fact: PlanFact; ply: number } | null;
  stoppedInRow: number;
  wasStopped: boolean;
  lastStatedPly: number | null;
  /** Plans whose HOW has been said this game — said again, a plan names its
   *  goal only (Learn audit 2026-10-15: the passed-pawn how-to three times). */
  howSaid: Set<string>;
  /** The three questions of the method have been asked this game. */
  methodSaid: boolean;
  /** The "why this one and not X?" questions already asked — a repeat is
   *  dropped as said, which left the next plan's reason without its question
   *  (review audit 2026-10-15), so a repeat asks "Why it matters:" instead. */
  whyAsked: Set<string>;
}

export function newPlanThread(): PlanThread {
  return { stated: null, stoppedInRow: 0, wasStopped: false, lastStatedPly: null, howSaid: new Set<string>(), methodSaid: false, whyAsked: new Set<string>() };
}

/** A copy to try a turn on: a surface that commits only what was SPOKEN
 *  (review's door) runs the turn on the copy and adopts it when a line speaks. */
export function clonePlanThread(t: PlanThread): PlanThread {
  return { ...t, howSaid: new Set(t.howSaid), whyAsked: new Set(t.whyAsked) };
}

/** ADOPT A TRIED TURN ONLY WHAT WAS SAID (A-plan P3, prod Learn 2026-10-16:
 *  the first plan — the one that asks the method — was offered while a threat
 *  led the turn, the door held it, and the thread had already marked it stated,
 *  so the method was never heard all game). A surface runs the turn on
 *  `clonePlanThread`, offers its lines, and hands back the claims that SPOKE:
 *  the copy becomes the thread when one of its lines spoke, or when it offered
 *  none (its bookkeeping still holds). Lines offered and all held leave the
 *  thread as it was, so the plan is offered again on the next calm turn.
 *  Returns whether the trial was adopted. */
export function adoptPlanTrial(thread: PlanThread, trial: PlanThread, offeredClaims: readonly string[], spokenClaims: readonly string[]): boolean {
  if (offeredClaims.length > 0 && !offeredClaims.some((c) => spokenClaims.includes(c))) return false;
  Object.assign(thread, trial);
  return true;
}

export interface PlanThreadLine {
  text: string;
  squares: string[];
  /** Say-once key for the claim ledger. */
  claim: string;
  /** The plan's GOAL as the plan arc names it (`plan-aim:passer:a`) — shared
   *  with the arc so one plan is announced once (Learn audit 2026-10-15: "The
   *  plan changes here — now it's to get your passed pawn on a7 promoting" and
   *  "Your plan from here: pushing the passed pawn on the a-file" in one turn). */
  aim?: string;
  /** The stop is proven off their move (exact, read from the board); a new
   *  plan is a description of the position. */
  proof: FactProof;
  /** Each step of the plan's routes, hop by hop, on its own board (planChoice). */
  arrows?: RouteArrow[];
}

const cap = (s: string): string => openSentence(s);

/**
 * One opponent move. `fenBefore` is the board their move was played from,
 * `fenAfter` the board after it, the student to move. Mutates `t`; returns the
 * lines to say, in order (the stop, then the plan).
 */
export function planThreadTurn(
  t: PlanThread,
  args: {
    ply: number; fenBefore: string; fenAfter: string; student: Color;
    /** The engine's student-POV eval after their move, when the surface has
     *  one — so "convert your extra material" waits for a real edge. */
    studentPovCp?: number | null;
    /** The student's move before their reply, to credit a step of the plan. */
    studentMove?: { fenBefore: string; san: string } | null;
    /** REQUIRED: Learn, before the student's move, holds a plan step that is a
     *  legal move right now (LEARN NAMES NO MOVE UNASKED); Review names it. */
    holdPlayable: boolean;
  },
): PlanThreadLine[] {
  const out: PlanThreadLine[] = [];
  // THE STUDENT'S MOVE AS A STEP OF THE PLAN — credited before anything else,
  // while the plan they heard still stands.
  if (t.stated && args.studentMove) {
    const step = planStepLine(t.stated.fact, args.studentMove.fenBefore, args.studentMove.san, args.student);
    // Its proof is the board: the squares the step landed on and the target it serves.
    if (step) out.push({ text: step.text, squares: step.squares, claim: `plan:step:${t.stated.fact.id}:${args.ply}`, proof: { kind: 'squares', exact: true, short: step.text, full: step.text, squares: step.squares } });
  }
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
  // THE OPENING'S PLAN IS DEVELOPMENT (David 2026-10-19: "the plan in the
  // opening … is to develop all of your pieces in one move and castle the
  // king. the plan in the middle game is to target a weakness"). Before the
  // opening is over (`classifyPhase`, the one definition) the structural
  // plan, the worst piece and the three questions wait: "your worst piece is
  // your rook on a1" on move 4 is true of every opening. The opening lanes
  // carry develop / castle / the centre and the opening's own idea.
  if (classifyPhase(args.fenAfter, { ply: args.ply }) === 'opening') return out;
  const plans = deriveNextPlanFacts(args.fenAfter, args.student, { studentPovCp: args.studentPovCp ?? null });
  const top = plans[0];
  if (!top) return out;
  // THE PLAN STANDS while the board still offers it — unless a plan of a
  // stronger kind has appeared (a passed pawn outranks an open file: review
  // tape 2026-10-15 held "seize the c-file" through a running a-pawn). A
  // plan of the same or a weaker kind never replaces it (the same tape churned
  // passer → knight outpost → bishop outpost on consecutive turns).
  if (t.stated && plans.some((p) => p.id === t.stated?.fact.id) && KIND_RANK[top.kind] >= KIND_RANK[t.stated.fact.kind]) return out;
  if (t.lastStatedPly !== null && args.ply - t.lastStatedPly < PLAN_THREAD_HOLD_PLIES) return out;   // a wobble
  // The how-to is taught once a game per plan; a plan restated names its goal.
  const fullBody = top.text.replace(/^the plan from here is to /i, '');
  const body = t.howSaid.has(top.id) ? fullBody.split(/\. Here's how: /)[0] : fullBody;
  const said = t.wasStopped
    ? `The new plan is to ${body}.`
    : t.stated || t.lastStatedPly !== null
      ? `The plan changes here — now it's to ${body}.`
      : `${cap(top.text)}.`;
  // HOW IT WAS FOUND, the first time a plan is stated: the three questions,
  // a pause to think, then the answers and the plan they lead to.
  // The method leads only where its answers ARE the plan: a passed pawn or an
  // extra piece to convert outranks all three questions, and saying the
  // questions before an unrelated plan is what made them not line up.
  const methodOwns = top.kind !== 'passer' && top.kind !== 'convert';
  const read = !t.methodSaid && methodOwns ? methodRead(args.fenAfter, args.student, args.holdPlayable) : null;
  const mp = read ? methodPlan(read, args.fenAfter) : null;
  // WHY THIS ONE — the reason it outranks the next plan on the board. Asked as
  // a question when no method question already opened the line (one pause).
  const why = whyThisPlan(plans);
  const alt = plans.find((p) => p.kind !== top.kind);
  const whyText = why
    ? read
      ? ` Why this one first? ${cap(why)}.`
      : alt && !t.whyAsked.has(alt.goalIng)
        // The question names the plan it beats; the answer is the reason alone.
        ? ` ${askThenAnswer(`Why this one and not ${alt.goalIng}?`, `${cap(planWorth(top))}.`)}`
        : ` Why it matters: ${planWorth(top)}.`
    : '';
  // THE ANSWERS MAKE THE PLAN (planChoice.methodPlan): the steps the three
  // questions found, in the order a strong player plays them, and why that order.
  const text = read && mp
    ? `${methodLine(read)} So the plan: ${mp.text}.${mp.why ? ` ${mp.whyAsk} ${cap(mp.why)}.` : ''}`
    : `${said}${whyText}`;
  if (!(read && mp) && why && !read && alt) t.whyAsked.add(alt.goalIng);
  if (read && mp) t.methodSaid = true;
  // The how-to is marked said only when it WAS said: the method's own plan
  // carries the steps instead, so the plan's how waits for its next statement.
  else t.howSaid.add(top.id);
  const squares = read && mp ? [...new Set([...methodSquares(read), ...mp.squares])] : top.squares;
  const aim = planAimKey(top.kind, top.squares[0] ?? top.file ?? null);
  out.push({ text, squares, claim: `plan:student:struct:${top.id}:${args.ply}`, proof: NO_PROOF.description, ...(aim ? { aim } : {}), ...(read && mp?.arrows.length ? { arrows: mp.arrows } : {}) });
  t.stated = { fact: top, ply: args.ply };
  t.lastStatedPly = args.ply;
  t.wasStopped = false;
  return out;
}
