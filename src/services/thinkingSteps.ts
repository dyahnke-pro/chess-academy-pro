// thinkingSteps — THE ONE METHOD VOCABULARY (Learn how to think P0c, 2026-10-04).
//
// The coach already teaches pieces of a thinking routine in four places, each
// with its own private words: the retrospective method beat (`MethodHabit`),
// the live method beat (`LiveHabit`), the Learn lanes' `method:*` claims
// (knee-jerk, blunder check, autopilot…) and the weakness join
// (`COACH_TAG_HABIT`). Four vocabularies for one routine is the enum split the
// rot rule names (`discovery` vs `discovered_attack`): a habit taught on one
// surface could never be counted on another.
//
// So the routine is written down ONCE, as ten steps in a fixed order, and
// every older vocabulary maps onto it by an exhaustive `Record` — a new habit,
// claim or misconception tag fails to compile until someone decides its step.
//
// THE TEN STEPS (docs/plans/2026-10-04-learn-how-to-think.md):
//   1 assess · 2 what their move changed · 3 am I safe · 4 answer the danger ·
//   5 their targets · 6 my forcing moves · 7 hit two at once · 8 candidates ·
//   9 calculate to the end · 10 is my move safe
// The ORDER never changes. Tiers decide how much of it a lesson plan serves.
//
// A LEAF: type imports only.
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { TeachingLayer } from './teachingLayers';
import type { LiveHabit, MethodHabit } from './methodBeat';

export type ThinkingStep =
  | 'assess'
  | 'their-move-changed'
  | 'am-i-safe'
  | 'answer-danger'
  | 'their-targets'
  | 'forcing-moves'
  | 'hit-two'
  | 'candidates'
  | 'calculate'
  | 'is-my-move-safe';

/** 1 · See the board · 2 · Force it · 3 · Combine and calculate · 4 · Think like a player. */
export type ThinkingTier = 1 | 2 | 3 | 4;

export interface ThinkingStepDef {
  /** 1–10, the fixed order of the routine. */
  order: number;
  /** As a coach says it — the question the student asks themself. */
  name: string;
  /** Short label (a chip, a heat-map row). */
  shortName: string;
  tier: ThinkingTier;
  /** The EXISTING misconception tags this step trains — a lesson answer here is
   *  evidence on these, the same tags game analysis files slips under (one
   *  vocabulary for teaching and diagnosis; never a parallel tag set). */
  tags: readonly MisconceptionTagId[];
  /** The teaching layer the step sits on (`teachingLayers`): tiers are built on
   *  the layers, not beside them. */
  layer: TeachingLayer;
}

export const THINKING_STEPS: Record<ThinkingStep, ThinkingStepDef> = {
  assess: {
    order: 1, name: 'Assess the position', shortName: 'assess', tier: 4, layer: 'plan',
    // The old "no tactic? the plan" step lives here: assess sends a student to
    // the plan when the mode is "improve".
    tags: ['no-plan', 'misplaced-piece', 'created-pawn-weakness', 'mistimed-pawn-break', 'neglected-development', 'botched-conversion'],
  },
  'their-move-changed': {
    order: 2, name: 'What did their move change?', shortName: 'what changed', tier: 1, layer: 'safety',
    tags: ['missed-opponents-threat'],
  },
  'am-i-safe': {
    order: 3, name: 'Am I safe?', shortName: 'am I safe', tier: 1, layer: 'safety',
    tags: ['hung-material', 'missed-opponents-threat', 'weakened-king-safety', 'king-stuck-center'],
  },
  'answer-danger': {
    order: 4, name: 'Answer the danger', shortName: 'answer the danger', tier: 2, layer: 'safety',
    tags: ['missed-opponents-threat', 'hung-material'],
  },
  'their-targets': {
    order: 5, name: 'Where are their targets?', shortName: 'their targets', tier: 1, layer: 'safety',
    // A "target" that isn't one is the greedy grab.
    tags: ['missed-tactic', 'greedy-pawn-grab'],
  },
  'forcing-moves': {
    order: 6, name: 'My forcing moves', shortName: 'forcing moves', tier: 2, layer: 'safety',
    tags: ['missed-tactic'],
  },
  'hit-two': {
    order: 7, name: 'Hit two at once', shortName: 'hit two', tier: 3, layer: 'safety',
    tags: ['missed-tactic'],
  },
  candidates: {
    order: 8, name: 'Find the candidates', shortName: 'candidates', tier: 4, layer: 'plan',
    tags: ['no-plan', 'bad-trade', 'overvalued-attack'],
  },
  calculate: {
    order: 9, name: 'Calculate to the end', shortName: 'calculate', tier: 3, layer: 'safety',
    tags: ['calculation-depth', 'overvalued-attack', 'bad-trade-material'],
  },
  'is-my-move-safe': {
    order: 10, name: 'Is my move safe?', shortName: 'blunder check', tier: 1, layer: 'safety',
    tags: ['hung-material', 'missed-opponents-threat', 'greedy-pawn-grab', 'poisoned-pawn'],
  },
};

/** The ten steps in their fixed order. */
export const THINKING_STEP_ORDER: readonly ThinkingStep[] = (Object.keys(THINKING_STEPS) as ThinkingStep[])
  .sort((a, b) => THINKING_STEPS[a].order - THINKING_STEPS[b].order);

/** The steps a tier adds, in routine order. */
export function stepsInTier(tier: ThinkingTier): ThinkingStep[] {
  return THINKING_STEP_ORDER.filter((s) => THINKING_STEPS[s].tier === tier);
}

// ── THE WEAKNESS JOIN — one tag → the step that LEADS when it is red ──────────
//
// This is the old `COACH_TAG_HABIT` (coachDecider), re-keyed: a tag now names
// its STEP, and the step names the retrospective habit. Exhaustive over the
// closed set, so a new tag fails to compile until someone decides its step.
// `null` = a real hole whose lead teacher is the fundamentals layer (a
// positional principle), not a thinking step — the step's `tags` may still
// TRAIN it (king safety is an "am I safe?" question), it just does not lead.
export const TAG_STEP: Record<MisconceptionTagId, ThinkingStep | null> = {
  // — the opponent's move is the thing you did not look at —
  'missed-opponents-threat': 'their-move-changed',
  'hung-material': 'am-i-safe',
  'greedy-pawn-grab': 'is-my-move-safe',
  'poisoned-pawn': 'is-my-move-safe',
  // — the shot that was there was forcing —
  'missed-tactic': 'forcing-moves',
  // — you picked before you compared, or stopped calculating too soon —
  'calculation-depth': 'calculate',
  'overvalued-attack': 'calculate',
  'bad-trade-material': 'calculate',
  'bad-trade': 'candidates',
  // "no plan" leads through CANDIDATES (not assess) because its habit is "you
  // picked before you compared" — re-keying must not change what the coach says.
  'no-plan': 'candidates',
  // — the moment deserved more clock than you gave it (knowing the position) —
  'botched-conversion': 'assess',
  'mistimed-pawn-break': 'assess',
  // — real holes, taught by the fundamentals layer rather than a habit —
  'left-book-early': null,
  'neglected-development': null,
  'king-stuck-center': null,
  'tempo-handed': null,
  'space-conceded': null,
  'weakened-king-safety': null,
  'created-pawn-weakness': null,
  'misplaced-piece': null,
  'overextended-pawn': null,
  'capture-toward-centre': null,
  'passive-king-endgame': null,
  'passed-pawn-neglected': null,
  'passive-rook': null,
  other: null,
};

/** The RETROSPECTIVE habit beat (`methodBeatFor`) a step's slips are taught
 *  through. Several steps share one habit: "ask what THEY want" closes what
 *  their move changed, am I safe, answering the danger, and the blunder check. */
export const STEP_METHOD_HABIT: Record<ThinkingStep, MethodHabit | null> = {
  assess: 'slow-down',
  'their-move-changed': 'opponent-threat',
  'am-i-safe': 'opponent-threat',
  'answer-danger': 'opponent-threat',
  'their-targets': 'forcing-scan',
  'forcing-moves': 'forcing-scan',
  'hit-two': 'forcing-scan',
  candidates: 'candidates',
  calculate: 'candidates',
  'is-my-move-safe': 'opponent-threat',
};

/** The habit a misconception tag is owed through — the old `COACH_TAG_HABIT`,
 *  now derived (tag → step → habit), so there is one table, not two. */
export function habitForTag(tag: MisconceptionTagId): MethodHabit | null {
  const step = TAG_STEP[tag];
  return step ? STEP_METHOD_HABIT[step] : null;
}

// ── THE OLDER VOCABULARIES, MAPPED ONTO THE STEPS ────────────────────────────

/** The step each retrospective method beat teaches. */
export const METHOD_HABIT_STEP: Record<MethodHabit, ThinkingStep> = {
  'opponent-threat': 'their-move-changed',
  'forcing-scan': 'forcing-moves',
  'slow-down': 'assess',
  candidates: 'candidates',
};

/** The step each live (present-tense) method beat teaches. */
export const LIVE_HABIT_STEP: Record<LiveHabit, ThinkingStep> = {
  'opponent-threat': 'their-move-changed',
  'forcing-scan': 'forcing-moves',
  // A loose piece of theirs is a TARGET — "spot the trigger first".
  'loose-trigger': 'their-targets',
  candidates: 'candidates',
  // Batch 2: check the plain answer before playing it; calculate the forcing
  // line on your own turn; mark a sacrifice's line forced or speculative.
  'look-again': 'is-my-move-safe',
  'calc-now': 'calculate',
  'mark-line': 'calculate',
};

/** The Learn lanes' method claims (`method:<id>` in learnBoardTeaching). */
export type LearnMethodClaim = 'knee-jerk' | 'blunder-check' | 'autopilot' | 'spare-tempo' | 'pawn-ending-trade' | 'keep-pressing';

export const LEARN_METHOD_CLAIM_STEP: Record<LearnMethodClaim, ThinkingStep> = {
  // "before taking back, ask whether something stronger comes first"
  'knee-jerk': 'candidates',
  // "before you let go of a piece: what can they take now?"
  'blunder-check': 'is-my-move-safe',
  // "when a move feels automatic, that is the moment to check it"
  autopilot: 'is-my-move-safe',
  // a pawn ending is COUNTED before the move that enters it
  'spare-tempo': 'calculate',
  'pawn-ending-trade': 'calculate',
  // when they are collapsing, keep forcing
  'keep-pressing': 'forcing-moves',
};

/** The step behind a say-once claim key (`method:<habit>` or `method:<claim>`),
 *  or null when the key is not a method claim. Live habits and Learn claims
 *  share the `method:` namespace, so one reader answers both. */
export function stepForMethodClaim(key: string): ThinkingStep | null {
  const m = /^method:(.+)$/.exec(key);
  if (!m) return null;
  const id = m[1];
  const own = (o: object): boolean => Object.prototype.hasOwnProperty.call(o, id);
  if (own(LIVE_HABIT_STEP)) return LIVE_HABIT_STEP[id as LiveHabit];
  if (own(LEARN_METHOD_CLAIM_STEP)) return LEARN_METHOD_CLAIM_STEP[id as LearnMethodClaim];
  return null;
}

// ── TIERS ────────────────────────────────────────────────────────────────────
//
// A tier is PROVEN when every step in it is proven on KNOW (David 2026-10-04,
// decision #3 — every step, not `teachingLayers`' two-tag bar). The KNOW
// reading itself lives in the evidence workstream; it is passed in, never
// re-derived here, so there is one bar.

/** Every step of `tier` is proven. `isKnown` answers per step (KNOW). */
export function tierProven(tier: ThinkingTier, isKnown: (step: ThinkingStep) => boolean): boolean {
  return stepsInTier(tier).every((s) => isKnown(s));
}

/** A tier is OPEN to the lesson plan when it is tier 1, or every step of every
 *  tier below it is proven (rule 1: the current tier proven unlocks the next).
 *  Tiers order the PLAN only — the coach never hides a step on request. */
export function tierUnlocked(tier: ThinkingTier, isKnown: (step: ThinkingStep) => boolean): boolean {
  for (let t = 1; t < tier; t += 1) if (!tierProven(t as ThinkingTier, isKnown)) return false;
  return true;
}
