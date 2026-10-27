import { namedPawnStructure, structurePlan } from './nextPlans';

/**
 * What the pawn STRUCTURE asks of the student at the tabia, from their seat
 * (WO-COURSE-01 B): the named structure and its plan when the board has one,
 * else the structure's plan. Computed, never written by hand (G0); null when
 * the board earns no structural plan.
 *
 * Never `deriveNextPlanFacts` from the other seat: its goals are phrased to the
 * side it is given ("make your bishop pair count"), so "their plan" would tell
 * the student the opponent's plan was theirs.
 */
export function tabiaStructure(fen: string, studentColor: 'white' | 'black'): string | null {
  const me = studentColor === 'white' ? 'w' : 'b';
  try {
    const named = namedPawnStructure(fen, me);
    if (named) return `${named.name} — ${named.plan}.`;
    return structurePlan(fen, me);
  } catch {
    return null;
  }
}
