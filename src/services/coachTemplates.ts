import { rotateStem } from '../utils/rotateStem';

/** The scenarios a canned line answers. Only the takeback reply has a caller
 *  (Play's Takeback button); the twelve other scenarios and the per-move
 *  commentary templates had none and are DELETED (WO-STORY-MATRIX-01 P1-1,
 *  David 2026-10-30) — a new scenario fails to compile until it has lines. */
type Scenario = 'takeback_allowed';

const SCENARIO_TEMPLATES: Record<Scenario, string[]> = {
  takeback_allowed: [
    "Sure, no problem! Let's go back and try again. Sometimes it helps to reconsider.",
    "Of course! Take it back. Let's think through this position together.",
  ],
};

/**
 * @param key  STABLE rotation key — the ply, the move number, an occurrence
 *   count. REQUIRED, because the caller is the only thing that knows what is
 *   stable about this moment, and a default would quietly reintroduce the roll.
 */
export function getScenarioTemplate(scenario: Scenario, key: number): string {
  return rotateStem(SCENARIO_TEMPLATES[scenario], key);
}
