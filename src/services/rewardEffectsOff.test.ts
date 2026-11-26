// David 2026-11-24: the coach turns off the coins and star bursts when asked.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveSettingsCommand } from './coachSettingsAction';
import { useAppStore } from '../stores/appStore';
import { onReward } from './rewardEvents';
import { reward } from './rewardService';

describe('asking the coach to turn off coins and bursts', () => {
  it.each([
    'turn off the coins',
    'please turn off the star bursts',
    'disable the celebrations',
    'stop the fireworks',
    'no more coins and stars, turn them off',
  ])('"%s" turns reward effects off', (ask) => {
    expect(resolveSettingsCommand(ask)?.prefsPatch).toEqual({ rewardEffectsOn: false });
  });
  it('and back on', () => {
    expect(resolveSettingsCommand('turn the coins back on')?.prefsPatch).toEqual({ rewardEffectsOn: true });
  });
});

describe('the one reward door honours it', () => {
  beforeEach(() => {
    useAppStore.setState({ activeProfile: { preferences: { rewardEffectsOn: false, soundEnabled: false, hapticsEnabled: false } } as never });
  });
  it('no burst fires when effects are off', () => {
    const seen = vi.fn();
    const off = onReward(seen);
    reward({ kind: 'decision', seed: 1 });
    off();
    expect(seen).not.toHaveBeenCalled();
  });
  it('a burst fires when effects are on', () => {
    useAppStore.setState({ activeProfile: { preferences: { rewardEffectsOn: true, soundEnabled: false, hapticsEnabled: false } } as never });
    const seen = vi.fn();
    const off = onReward(seen);
    reward({ kind: 'decision', seed: 1 });
    off();
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
