import { describe, it, expect } from 'vitest';
import { chooseThinkingStep, openTier, tierUnlockLine, type BuiltStep } from './thinkingLessonPlan';
import type { StepKit } from './thinkingLessonSession';
import type { StepStanding } from './thinkingLesson';

const kit = (step: string): (() => StepKit) => () => ({
  step, keyFor: () => null, showLine: () => '', prompt: () => '', wrongTapLine: () => '', reasonFor: () => null, intro: '',
});
const SAFE: BuiltStep = { step: 'am-i-safe', order: 3, tier: 1, kit: kit('am-i-safe'), tags: ['hung-material'] };
const TARGETS: BuiltStep = { step: 'their-targets', order: 5, tier: 1, kit: kit('their-targets'), tags: ['missed-tactic'] };
const FORCING: BuiltStep = { step: 'forcing-moves', order: 6, tier: 2, kit: kit('forcing-moves'), tags: ['missed-tactic'] };
const MOVE_SAFE: BuiltStep = { step: 'is-my-move-safe', order: 10, tier: 1, kit: kit('is-my-move-safe'), tags: ['hung-material'] };
const ALL = [FORCING, TARGETS, MOVE_SAFE, SAFE];
const pick = (m: Record<string, StepStanding>) => chooseThinkingStep(ALL, (s) => m[s.kit().step] ?? 'grey');

describe('chooseThinkingStep', () => {
  it('a fresh student starts at the earliest tier-1 step', () => {
    expect(pick({})?.step.kit().step).toBe('am-i-safe');
    expect(pick({})).toMatchObject({ reason: 'next-unknown', standing: 'grey', openTier: 1 });
  });
  it('tier 1 is finished before tier 2 opens, whatever the method order', () => {
    expect(pick({ 'am-i-safe': 'green', 'their-targets': 'green' })?.step.kit().step).toBe('is-my-move-safe');
  });
  it('a red step jumps the queue within the open tiers', () => {
    const c = pick({ 'their-targets': 'red' });
    expect(c?.step.kit().step).toBe('their-targets');
    expect(c?.reason).toBe('red-first');
  });
  it('a red step in a LOCKED tier does not jump ahead of tier 1', () => {
    expect(pick({ 'forcing-moves': 'red' })?.step.kit().step).toBe('am-i-safe');
  });
  it('tier 2 opens once every tier-1 step is green', () => {
    const m = { 'am-i-safe': 'green', 'their-targets': 'green', 'is-my-move-safe': 'green' } as const;
    expect(openTier(ALL, (s) => m[s.kit().step as keyof typeof m] ?? 'grey')).toBe(2);
    expect(pick(m)?.step.kit().step).toBe('forcing-moves');
  });
  it('when every step is green, the first comes back as a review', () => {
    const all = { 'am-i-safe': 'green', 'their-targets': 'green', 'is-my-move-safe': 'green', 'forcing-moves': 'green' } as const;
    expect(pick(all)).toMatchObject({ reason: 'review', standing: 'green' });
  });
  it('nothing built, nothing chosen', () => {
    expect(chooseThinkingStep([], () => 'grey')).toBeNull();
  });
});

describe('tierUnlockLine', () => {
  it('names what is next when a tier opens', () => {
    expect(tierUnlockLine(1, 2)).toMatchObject({ tier: 2, label: 'UNLOCKED · FORCE IT' });
    expect(tierUnlockLine(1, 2)?.line).toMatch(/You see the board/);
  });
  it('is silent when nothing opened', () => {
    expect(tierUnlockLine(2, 2)).toBeNull();
    expect(tierUnlockLine(1, 1)).toBeNull();
  });
});

describe('chooseThinkingStep — availability', () => {
  it('skips a step with no fair board for this student', () => {
    const c = chooseThinkingStep(ALL, () => 'grey', (s) => s.kit().step !== 'am-i-safe');
    expect(c?.step.kit().step).toBe('their-targets');
  });
  it('nothing available, nothing chosen', () => {
    expect(chooseThinkingStep(ALL, () => 'grey', () => false)).toBeNull();
  });
});
