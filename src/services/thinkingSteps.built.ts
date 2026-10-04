// thinkingSteps.built — the "Learn how to think" steps that have a lesson kit
// today, in method order. One list read by the page, the chooser and the
// record, so a step's tags live in ONE place.
//
// MERGE NOTE: when the one step vocabulary (`ThinkingStep` / THINKING_STEPS)
// lands, `order` and `tags` are read from it and this file only maps step →
// kit.
import type { BuiltStep } from './thinkingLessonPlan';
import { safetyKit, SAFETY_STEP_TAGS } from './thinkingSafetyStep';
import { looseSquaresOf, TARGETS_STEP_TAGS, targetsKit } from './thinkingTargetsStep';
import { moveSafetyKit, MOVE_SAFETY_STEP_TAGS } from './thinkingMoveSafetyStep';
import { forcingKit, FORCING_STEP_TAGS } from './thinkingForcingStep';
import { hitTwoKit, HIT_TWO_STEP_TAGS } from './thinkingHitTwoStep';
import { theirMoveKit, THEIR_MOVE_STEP_TAGS } from './thinkingTheirMoveStep';
import { answerDangerKit, ANSWER_DANGER_STEP_TAGS } from './thinkingAnswerDangerStep';
import type { MisconceptionTagId } from '../data/misconceptionTags';

export const BUILT_THINKING_STEPS: readonly BuiltStep[] = [
  { order: 2, tier: 1, kit: theirMoveKit, tags: THEIR_MOVE_STEP_TAGS },
  { order: 3, tier: 1, kit: safetyKit, tags: SAFETY_STEP_TAGS },
  { order: 5, tier: 1, kit: () => targetsKit(looseSquaresOf), tags: TARGETS_STEP_TAGS },
  { order: 4, tier: 2, kit: answerDangerKit, tags: ANSWER_DANGER_STEP_TAGS },
  { order: 6, tier: 2, kit: forcingKit, tags: FORCING_STEP_TAGS },
  { order: 7, tier: 3, kit: hitTwoKit, tags: HIT_TWO_STEP_TAGS },
  { order: 10, tier: 1, kit: moveSafetyKit, tags: MOVE_SAFETY_STEP_TAGS },
];

/** The tags a step's answers are recorded under. Unknown step → none. */
export function tagsForThinkingStep(step: string): readonly MisconceptionTagId[] {
  for (const s of BUILT_THINKING_STEPS) if (s.kit().step === step) return s.tags;
  return [];
}
