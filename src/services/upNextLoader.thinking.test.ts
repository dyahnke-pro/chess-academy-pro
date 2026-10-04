// The thinking lesson's Up-next standing is READ off the heat map over the
// tier-1 habits (learn-how-to-think) — computed from the record, never a constant.
import { describe, it, expect } from 'vitest';
import { thinkingSignalFromHeatMap } from './upNextLoader';
import type { HeatTile } from './heatMap';
import type { MisconceptionTagId } from '../data/misconceptionTags';

const tile = (tag: MisconceptionTagId, state: HeatTile['state'], openCount = 0, label: string = tag): HeatTile => ({
  tag, label, state, openCount, held: 0, broken: 0, heldStreak: 0, streakGames: 0, progress: state === 'green' ? 1 : 0,
});

describe('thinkingSignalFromHeatMap', () => {
  it('red when a tier-1 habit is an open hole, led by the most open slips', () => {
    const s = thinkingSignalFromHeatMap([
      tile('missed-tactic', 'red', 2, 'Missed tactics'),
      tile('hung-material', 'red', 5, 'Hung material'),
      tile('calculation-depth', 'red', 9, 'Calculation'),
    ]);
    expect(s).toEqual({ state: 'red', skill: 'Hung material' });
  });

  it('a red NON-tier-1 habit does not make the lesson red', () => {
    const s = thinkingSignalFromHeatMap([
      tile('calculation-depth', 'red', 9),
      tile('hung-material', 'grey'),
      tile('missed-tactic', 'green'),
    ]);
    expect(s?.state).toBe('grey');
  });

  it('a fresh install (all grey) is grey: grey means teach it', () => {
    expect(thinkingSignalFromHeatMap([tile('hung-material', 'grey'), tile('missed-tactic', 'grey')])?.state).toBe('grey');
  });

  it('green only when every tier-1 skill is proven', () => {
    expect(thinkingSignalFromHeatMap([tile('hung-material', 'green'), tile('missed-tactic', 'green')])?.state).toBe('green');
  });

  it('null when nothing maps to tier 1', () => {
    expect(thinkingSignalFromHeatMap([tile('calculation-depth', 'red', 3)])).toBeNull();
  });
});
