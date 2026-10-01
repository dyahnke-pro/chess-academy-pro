import { describe, it, expect, vi } from 'vitest';
import { REWARD_SPECS, pipFrequency, reward } from './rewardService';
import { onReward, rewardSeed } from './rewardEvents';

describe('rewardService', () => {
  it('a pip climbs the scale — each correct move sounds higher than the last', () => {
    for (let i = 1; i < 8; i++) expect(pipFrequency(i)).toBeGreaterThan(pipFrequency(i - 1));
    expect(pipFrequency(99)).toBe(pipFrequency(11));
  });

  it('rewards get bigger up the ladder; a miss is silent light, never a flash', () => {
    expect(REWARD_SPECS.miss.size).toBe(0);
    expect(REWARD_SPECS.pip.size).toBeLessThan(REWARD_SPECS.solved.size);
    expect(REWARD_SPECS.solved.size).toBeLessThan(REWARD_SPECS.rankUp.size);
    expect(REWARD_SPECS.rankUp.size).toBeLessThan(REWARD_SPECS.newBest.size);
  });

  it('every moment has a sound and a vibration', () => {
    for (const [kind, spec] of Object.entries(REWARD_SPECS)) {
      expect(spec.notes(0).length, kind).toBeGreaterThan(0);
      expect(spec.haptics.length, kind).toBeGreaterThan(0);
    }
  });

  it('publishes the light to the overlay and never throws without audio', () => {
    const seen = vi.fn();
    const off = onReward(seen);
    expect(() => reward({ kind: 'solved', square: 'e4', step: 2 })).not.toThrow();
    expect(seen).toHaveBeenCalledWith(expect.objectContaining({ kind: 'solved', square: 'e4' }));
    off();
  });

  it('seeds are deterministic', () => {
    expect(rewardSeed('abc')).toBe(rewardSeed('abc'));
    expect(rewardSeed('abc')).not.toBe(rewardSeed('abd'));
  });
});
