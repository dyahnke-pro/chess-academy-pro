import type { HeatTile } from './heatMap';
import { describe, it, expect } from 'vitest';
import { gameWeightForTags, chooseThinkingStep, lessonCloseLine, openTier, tierUnlockLine, type BuiltStep, type StepChoice } from './thinkingLessonPlan';
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
  it('when every step is green and two can be mixed, the lesson is a MIXED round', () => {
    const all = { 'am-i-safe': 'green', 'their-targets': 'green', 'is-my-move-safe': 'green', 'forcing-moves': 'green' } as const;
    const c = pick(all);
    expect(c).toMatchObject({ reason: 'mixed', standing: 'green' });
    expect(c?.mix?.map((s) => s.step)).toEqual(['am-i-safe', 'their-targets', 'is-my-move-safe', 'forcing-moves']);
    expect(c?.step.step).toBe('am-i-safe');
  });
  it('a step that replays a played move or needs the engine never joins the mix', () => {
    const adapted: BuiltStep = { ...MOVE_SAFE, kit: () => ({ ...kit('is-my-move-safe')(), adapt: (c) => c }) };
    const engine: BuiltStep = { ...FORCING, kit: () => ({ ...kit('forcing-moves')(), enrich: async (c) => c }) };
    const c = chooseThinkingStep([SAFE, TARGETS, adapted, engine], () => 'green');
    expect(c?.mix?.map((s) => s.step)).toEqual(['am-i-safe', 'their-targets']);
  });
  it('with only one proven step to mix, the first comes back as a review', () => {
    const c = chooseThinkingStep([SAFE], () => 'green');
    expect(c).toMatchObject({ reason: 'review', standing: 'green' });
    expect(c?.mix).toBeUndefined();
  });
  it('anything red or grey still due means no mixed round', () => {
    expect(pick({ 'am-i-safe': 'green', 'their-targets': 'green' })?.reason).toBe('next-unknown');
    expect(pick({ 'am-i-safe': 'green', 'their-targets': 'red', 'is-my-move-safe': 'green' })?.reason).toBe('red-first');
  });
  it('a step known in lessons but not used in games is never re-taught as a review', () => {
    const all = { 'am-i-safe': 'green', 'their-targets': 'green', 'is-my-move-safe': 'green', 'forcing-moves': 'green' } as const;
    const standing = (s: BuiltStep): StepStanding => all[s.kit().step as keyof typeof all];
    const c = chooseThinkingStep(ALL, standing, () => true, () => 0, (s) => s.step === 'am-i-safe');
    // The settled steps are mixed (D6) — and the pending one is in neither
    // the mix nor the step.
    expect(['review', 'mixed']).toContain(c?.reason);
    expect(c?.step.step).not.toBe('am-i-safe');
    expect((c?.mix ?? []).map((m) => m.step)).not.toContain('am-i-safe');
    // Every known step still slipping in games: no lesson is the right tool.
    expect(chooseThinkingStep(ALL, standing, () => true, () => 0, () => true)).toBeNull();
  });
  it('the habit gate touches only known steps: a grey step is still taught', () => {
    expect(chooseThinkingStep(ALL, () => 'grey', () => true, () => 0, () => true)?.step.step).toBe('am-i-safe');
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

describe('chooseThinkingStep — the student\'s GAMES decide first', () => {
  const weight = (w: Record<string, number>) => (s: BuiltStep): number => w[s.kit().step] ?? 0;

  it('a step they keep failing in games is taught first, worst first, even out of tier order', () => {
    const c = chooseThinkingStep(ALL, () => 'grey', () => true, weight({ 'forcing-moves': 3, 'am-i-safe': 7 }));
    expect(c?.step.step).toBe('am-i-safe');
    expect(c?.reason).toBe('game-weakness');
    expect(c?.standing).toBe('red');
    // A locked tier-2 step is taught when it is their worst hole.
    expect(chooseThinkingStep(ALL, () => 'grey', () => true, weight({ 'forcing-moves': 9 }))?.step.step).toBe('forcing-moves');
  });

  it('a step proven in lessons is not pulled forward by games (knowing is not the gap there)', () => {
    const c = chooseThinkingStep(ALL, (s) => (s.step === 'am-i-safe' ? 'green' : 'grey'), () => true, weight({ 'am-i-safe': 9 }));
    expect(c?.reason).not.toBe('game-weakness');
  });

  it('with no game weakness the tier order stands', () => {
    expect(chooseThinkingStep(ALL, () => 'grey', () => true, () => 0)?.reason).toBe('next-unknown');
  });
});

describe('gameWeightForTags', () => {
  const tile = (tag: string, state: 'red' | 'green' | 'grey', openCount: number, broken: number) =>
    ({ tag, state, openCount, broken }) as unknown as HeatTile;

  it('sums open holes and breaks on the step\'s RED tiles only', () => {
    const tiles = [tile('hung-material', 'red', 2, 3), tile('missed-tactic', 'grey', 0, 1), tile('poisoned-pawn', 'red', 1, 0)];
    expect(gameWeightForTags(tiles, ['hung-material', 'missed-tactic'])).toBe(5);
    expect(gameWeightForTags(tiles, ['missed-tactic'])).toBe(0);
  });
});

describe('lessonCloseLine — what was proven, what is next, praise only when earned', () => {
  const next = (step: BuiltStep, reason: StepChoice['reason'] = 'next-unknown'): StepChoice => ({ step, standing: 'grey', reason, openTier: 1 });

  it('a lesson that proved nothing names the next step, with no praise', () => {
    const line = lessonCloseLine({ step: 'am-i-safe', proven: [], tierLine: null, next: next(SAFE, 'red-first'), key: 0 });
    expect(line).toBe('Next time: "Am I safe?" again.');
  });

  it('a step turning green is named and praised; the next one follows', () => {
    const line = lessonCloseLine({ step: 'am-i-safe', proven: ['am-i-safe'], tierLine: null, next: next(TARGETS), key: 0 }) ?? '';
    expect(line).toMatch(/^"Am I safe\?" is green on your skill chart now\. Earned\./);
    expect(line).toMatch(/Next up: "Where are their targets\?"\.$/);
  });

  it('a tier opening is praised and named; a mixed round is named as one', () => {
    const tier = tierUnlockLine(1, 2)!.line;
    const line = lessonCloseLine({ step: 'is-my-move-safe', proven: ['is-my-move-safe', 'their-targets'], tierLine: tier, next: next(FORCING), key: 1 }) ?? '';
    expect(line).toMatch(/"Is my move safe\?" and "Where are their targets\?" are green/);
    expect(line).toContain(tier);
    expect(lessonCloseLine({ step: 'mixed', proven: [], tierLine: null, next: next(SAFE, 'mixed'), key: 0 })).toMatch(/mixed round/);
  });

  it('praise rotates on a stable key, never rolled', () => {
    const a = lessonCloseLine({ step: 'x', proven: ['am-i-safe'], tierLine: null, next: null, key: 2 });
    expect(a).toBe(lessonCloseLine({ step: 'x', proven: ['am-i-safe'], tierLine: null, next: null, key: 2 }));
    expect(lessonCloseLine({ step: 'x', proven: [], tierLine: null, next: null, key: 0 })).toBeNull();
  });
});
