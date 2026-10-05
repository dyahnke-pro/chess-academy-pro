import { describe, it, expect } from 'vitest';
import { MISCONCEPTION_TAGS, type MisconceptionTagId } from '../data/misconceptionTags';
import { habitForCluster } from './coachDecider';
import { TAG_LAYER } from './teachingLayers';
import {
  THINKING_STEPS, THINKING_STEP_ORDER, TAG_STEP, STEP_METHOD_HABIT, METHOD_HABIT_STEP, LIVE_HABIT_STEP,
  LEARN_METHOD_CLAIM_STEP, habitForTag, stepForMethodClaim, stepsInTier, tierProven, tierUnlocked,
  type ThinkingStep,
} from './thinkingSteps';
import type { MethodHabit } from './methodBeat';

// The coachDecider table as it stood BEFORE the re-key (2026-10-04). Re-keying
// through ThinkingStep must not change one answer.
const OLD_COACH_TAG_HABIT: Record<MisconceptionTagId, MethodHabit | null> = {
  'missed-opponents-threat': 'opponent-threat', 'hung-material': 'opponent-threat',
  'greedy-pawn-grab': 'opponent-threat', 'poisoned-pawn': 'opponent-threat',
  'missed-tactic': 'forcing-scan',
  'calculation-depth': 'candidates', 'overvalued-attack': 'candidates', 'bad-trade': 'candidates',
  'bad-trade-material': 'candidates', 'no-plan': 'candidates',
  'botched-conversion': 'slow-down', 'mistimed-pawn-break': 'slow-down',
  'left-book-early': null, 'neglected-development': null, 'king-stuck-center': null, 'tempo-handed': null,
  'space-conceded': null, 'weakened-king-safety': null, 'created-pawn-weakness': null, 'misplaced-piece': null,
  'overextended-pawn': null, 'capture-toward-centre': null, 'passive-king-endgame': null,
  'passed-pawn-neglected': null, 'passive-rook': null, other: null,
};

describe('re-keying COACH_TAG_HABIT through ThinkingStep changes no habit', () => {
  it('every misconception tag gets the same habit as before', () => {
    for (const t of MISCONCEPTION_TAGS) {
      const id = t.id;
      expect(habitForTag(id), id).toBe(OLD_COACH_TAG_HABIT[id]);
      expect(habitForCluster(id), id).toBe(OLD_COACH_TAG_HABIT[id]);
    }
  });
  it('the analysis:* family and unknown ids are unchanged, and prototype keys are not tags', () => {
    expect(habitForCluster('analysis:tactic:fork')).toBe('forcing-scan');
    expect(habitForCluster('analysis:missed-threat')).toBe('opponent-threat');
    expect(habitForCluster('analysis:conversion')).toBe('slow-down');
    expect(habitForCluster('nope')).toBeNull();
    expect(habitForCluster('toString')).toBeNull();
  });
});

describe('the ten steps', () => {
  it('are in a fixed order 1–10', () => {
    expect(THINKING_STEP_ORDER).toEqual(['assess', 'their-move-changed', 'am-i-safe', 'answer-danger', 'their-targets', 'forcing-moves', 'hit-two', 'candidates', 'calculate', 'is-my-move-safe']);
    expect(THINKING_STEP_ORDER.map((s) => THINKING_STEPS[s].order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
  it('tiers follow the plan: tier 1 = what changed, am I safe, their targets, is my move safe', () => {
    expect(stepsInTier(1)).toEqual(['their-move-changed', 'am-i-safe', 'their-targets', 'is-my-move-safe']);
    expect(stepsInTier(2)).toEqual(['answer-danger', 'forcing-moves']);
    expect(stepsInTier(3)).toEqual(['hit-two', 'calculate']);
    expect(stepsInTier(4)).toEqual(['assess', 'candidates']);
  });
  it('every step trains only real tags, and a tag that LEADS a step is one it trains', () => {
    const ids = new Set(MISCONCEPTION_TAGS.map((t) => t.id));
    for (const s of THINKING_STEP_ORDER) for (const tag of THINKING_STEPS[s].tags) expect(ids.has(tag), `${s}:${tag}`).toBe(true);
    for (const [tag, step] of Object.entries(TAG_STEP)) {
      if (step) expect(THINKING_STEPS[step].tags, `${tag} leads ${step}`).toContain(tag);
    }
  });
  it('every step a tag leads sits on that tag\'s teaching layer or above it (no safety tag led by a plan step)', () => {
    for (const [tag, step] of Object.entries(TAG_STEP) as Array<[MisconceptionTagId, ThinkingStep | null]>) {
      if (step && TAG_LAYER[tag] === 'safety') expect(THINKING_STEPS[step].layer, tag).toBe('safety');
    }
  });
});

describe('the older vocabularies map onto the steps', () => {
  it('each retrospective habit\'s step is taught through that same habit', () => {
    for (const [habit, step] of Object.entries(METHOD_HABIT_STEP)) expect(STEP_METHOD_HABIT[step], habit).toBe(habit);
  });
  it('live habits and Learn method claims resolve through one reader', () => {
    expect(stepForMethodClaim('method:loose-trigger')).toBe('their-targets');
    expect(stepForMethodClaim('method:opponent-threat')).toBe('their-move-changed');
    expect(stepForMethodClaim('method:blunder-check')).toBe('is-my-move-safe');
    expect(stepForMethodClaim('method:knee-jerk')).toBe('candidates');
    expect(stepForMethodClaim('method:toString')).toBeNull();
    expect(stepForMethodClaim('wins-line:abc')).toBeNull();
    expect(Object.keys(LIVE_HABIT_STEP)).toHaveLength(4);
    expect(Object.keys(LEARN_METHOD_CLAIM_STEP)).toHaveLength(6);
  });
});

describe('tiers open by proof on every step', () => {
  const provenSet = (steps: ThinkingStep[]) => (s: ThinkingStep): boolean => steps.includes(s);
  it('tier 1 is always open; tier 2 opens only when EVERY tier-1 step is proven', () => {
    expect(tierUnlocked(1, () => false)).toBe(true);
    const threeOfFour = provenSet(['their-move-changed', 'am-i-safe', 'their-targets']);
    expect(tierProven(1, threeOfFour)).toBe(false);
    expect(tierUnlocked(2, threeOfFour)).toBe(false);
    const allTier1 = provenSet(stepsInTier(1));
    expect(tierProven(1, allTier1)).toBe(true);
    expect(tierUnlocked(2, allTier1)).toBe(true);
    expect(tierUnlocked(3, allTier1)).toBe(false);
  });
});
