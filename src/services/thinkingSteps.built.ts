// thinkingSteps.built — which "Learn how to think" steps have a lesson kit.
// Order, tier and tags are read from the ONE step table (`THINKING_STEPS`); this
// file only maps a step to its kit, so a step's tags live in one place.
import type { BuiltStep } from './thinkingLessonPlan';
import type { StepKit } from './thinkingLessonSession';
import { THINKING_STEPS, type ThinkingStep } from './thinkingSteps';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import { findLoosePieces } from './loosePieces';
import { safetyKit } from './thinkingSafetyStep';
import { targetsKit, type LooseSquares } from './thinkingTargetsStep';
import { moveSafetyKit } from './thinkingMoveSafetyStep';
import { forcingKit } from './thinkingForcingStep';
import { hitTwoKit } from './thinkingHitTwoStep';
import { theirMoveKit } from './thinkingTheirMoveStep';
import { answerDangerKit } from './thinkingAnswerDangerStep';
import { bookTeachingFor } from './thinkingBookTeaching';
import { calculateKit } from './thinkingCalculateStep';

/** The app's one loose-piece computer, in the shape the targets kit takes. */
const looseSquares: LooseSquares = (fen, color) => findLoosePieces(fen, color).map((p) => p.square);

/** Steps that have a kit today. A step absent here is not served yet. */
export const STEP_KITS: Partial<Record<ThinkingStep, () => StepKit>> = {
  'their-move-changed': theirMoveKit,
  'am-i-safe': safetyKit,
  'answer-danger': answerDangerKit,
  'their-targets': () => targetsKit(looseSquares),
  'forcing-moves': forcingKit,
  'hit-two': hitTwoKit,
  calculate: calculateKit,
  'is-my-move-safe': moveSafetyKit,
};

export const BUILT_THINKING_STEPS: readonly BuiltStep[] = (Object.keys(STEP_KITS) as ThinkingStep[]).map((step) => ({
  step,
  order: THINKING_STEPS[step].order,
  tier: THINKING_STEPS[step].tier,
  tags: THINKING_STEPS[step].tags,
  // The books' own words on the habit ride on every kit (silent when the
  // books have no passage for the step).
  kit: (): StepKit => ({ ...(STEP_KITS[step] as () => StepKit)(), book: () => bookTeachingFor(step) }),
}));

/** The tags a step's answers are recorded under (the one table). */
export function tagsForThinkingStep(step: string): readonly MisconceptionTagId[] {
  return step in THINKING_STEPS ? THINKING_STEPS[step as ThinkingStep].tags : [];
}
