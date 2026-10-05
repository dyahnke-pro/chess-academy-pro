// Up next's "Learn how to think" card reads the step the lesson WOULD teach —
// the same chooser, so the card and the lesson can never disagree.
import { describe, it, expect } from 'vitest';
import { thinkingSignalFrom } from './upNextLoader';
import type { HeatTile } from './heatMap';
import type { MisconceptionTagId } from '../data/misconceptionTags';
import type { BuiltStep, StepChoice } from './thinkingLessonPlan';

const tile = (tag: MisconceptionTagId, state: HeatTile['state'], openCount = 0, label: string = tag): HeatTile => ({
  tag, label, state, openCount, held: 0, broken: 0, heldStreak: 0, streakGames: 0, progress: state === 'green' ? 1 : 0,
});
const step = (id: BuiltStep['step'], tags: MisconceptionTagId[]): BuiltStep => ({ step: id, order: 3, tier: 1, tags, kit: () => { throw new Error('unused'); } });
const choice = (reason: StepChoice['reason'], s: BuiltStep): StepChoice => ({ step: s, reason, standing: 'grey', openTier: 1 });

describe('thinkingSignalFrom', () => {
  const SAFE = step('am-i-safe', ['hung-material', 'missed-opponents-threat']);

  it('red from games: names what keeps costing them and the step that catches it', () => {
    const s = thinkingSignalFrom(choice('game-weakness', SAFE), [
      tile('hung-material', 'red', 5, 'Hung material'),
      tile('missed-opponents-threat', 'red', 2, 'Missed threats'),
      tile('calculation-depth', 'red', 9, 'Calculation'),
    ]);
    expect(s).toEqual({ state: 'red', skill: 'Hung material', step: 'Am I safe?' });
  });

  it('a red step from lessons is red; an unproven one is grey (grey teaches); a review is green', () => {
    expect(thinkingSignalFrom(choice('red-first', SAFE), [])?.state).toBe('red');
    expect(thinkingSignalFrom(choice('next-unknown', SAFE), [])?.state).toBe('grey');
    expect(thinkingSignalFrom(choice('review', SAFE), [])?.state).toBe('green');
    expect(thinkingSignalFrom(choice('mixed', SAFE), [])).toMatchObject({ state: 'green', skill: 'Mixed practice' });
  });

  it('carries the known-not-used gap line when the transfer reading has one', () => {
    const gap = 'Lessons say you spot your loose pieces. Your games say you still leave them hanging.';
    expect(thinkingSignalFrom(choice('next-unknown', SAFE), [], gap)).toEqual({ state: 'grey', skill: 'Am I safe?', step: 'Am I safe?', gap });
  });

  it('null when the chooser has no step', () => {
    expect(thinkingSignalFrom(null, [tile('hung-material', 'red', 3)])).toBeNull();
  });
});
