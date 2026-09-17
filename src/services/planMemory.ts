// planMemory — PlanState carried through a sequence (unified-coach N3, plan §3.6).
//
// The structure→plan fact (`structurePlan`) is computed per position, so a
// naive narrator re-announces the same plan on every quiet ply ("push the
// passed pawn… push the passed pawn…"). A coach announces a plan ONCE, then
// refers to progress against it until the STRUCTURE changes — a different plan
// comes back — or the sequence leaves the phase. This is that memory, as a pure
// fold over the plies: per ply, whether the plan is newly announced, carried
// (silent), or changed. G0: the plan text is `structurePlan`'s; this only
// decides WHEN it is spoken again.
import type { Color } from 'chess.js';
import { structurePlanFact, type StructurePlanFact } from './boardPlan';

export type PlanEvent = 'announce' | 'carry' | 'changed' | 'none';

export interface PlanPly {
  ply: number;
  /** The structure→plan sentence for the position AFTER this ply (student POV). */
  plan: string | null;
  event: PlanEvent;
}

export interface PlanState {
  /** The plan currently in force, or null. */
  plan: string | null;
  /** Its stable identity — what "the same plan" actually means. */
  id: string | null;
  /** The ply it was announced on. */
  announcedAt: number | null;
}

export const EMPTY_PLAN_STATE: PlanState = { plan: null, id: null, announcedAt: null };

/**
 * Advance the state by one ply.
 *
 * 🚨 IDENTITY, NOT PROSE. This compared the rendered SENTENCE, so a plan naming
 * a square that moves re-announced itself on every push: "your passed pawn on
 * b5" became "on b6" and read as a brand-new plan — the coach changing its mind
 * about the plan it had just told you to carry out. The identity is the plan's
 * KIND, so advancing the pawn is `carry` and only a genuinely different plan
 * (or a race whose winner FLIPPED) is `changed`.
 */
export function stepPlan(state: PlanState, ply: number, plan: StructurePlanFact | null): { event: PlanEvent; next: PlanState } {
  if (!plan) return { event: 'none', next: state };
  // The TEXT is refreshed even on a carry, so a re-mention names the pawn where
  // it stands now rather than where it stood when the plan was announced.
  if (state.id === plan.id) {
    return { event: 'carry', next: { ...state, plan: plan.text } };
  }
  return {
    event: state.id ? 'changed' : 'announce',
    next: { plan: plan.text, id: plan.id, announcedAt: ply },
  };
}

/**
 * Fold `structurePlan` over a sequence: `plies[i].fenAfter` is the board after
 * ply i+1. Only STUDENT plies can announce a plan (the plan is the student's);
 * the opponent's plies carry the state forward untouched.
 */
export function foldPlans(
  plies: ReadonlyArray<{ ply: number; fenAfter: string; playerColor: 'white' | 'black' }>,
  studentColor: 'white' | 'black',
): Map<number, PlanPly> {
  const out = new Map<number, PlanPly>();
  const studentWB: Color = studentColor === 'white' ? 'w' : 'b';
  let state: PlanState = EMPTY_PLAN_STATE;
  for (const p of plies) {
    if (p.playerColor !== studentColor) { out.set(p.ply, { ply: p.ply, plan: state.plan, event: 'none' }); continue; }
    let plan: StructurePlanFact | null = null;
    try { plan = structurePlanFact(p.fenAfter, studentWB); } catch { plan = null; }
    const { event, next } = stepPlan(state, p.ply, plan);
    state = next;
    out.set(p.ply, { ply: p.ply, plan: state.plan, event });
  }
  return out;
}

/** The one-line progress reference for a carried plan — spoken instead of a
 *  re-announcement when a beat wants to mention the plan again. */
export function planProgressText(state: PlanState): string {
  return state.plan ? 'Same plan as before — keep building toward it.' : '';
}
