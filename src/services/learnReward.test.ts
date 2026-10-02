import { describe, it, expect } from 'vitest';
import { learnRewardFor, tallyMove, EMPTY_TALLY, LEARN_REWARD } from './learnReward';

describe('learnReward', () => {
  it('only skill earns a reward — best/solid on a calm board and every fault stay silent', () => {
    expect(learnRewardFor({ reason: 'best', fault: false, isRecapture: false })).toBeNull();
    expect(learnRewardFor({ reason: 'solid', fault: false, isRecapture: false })).toBeNull();
    expect(learnRewardFor({ reason: 'hung-piece', fault: true, isRecapture: false })).toBeNull();
    expect(learnRewardFor({ reason: 'clear-best', fault: false, isRecapture: false })).toBe('decision');
    expect(learnRewardFor({ reason: 'only-move', fault: false, isRecapture: false })).toBe('onlyMove');
    expect(learnRewardFor({ reason: 'defends-threat', fault: false, isRecapture: false })).toBe('saved');
    expect(learnRewardFor({ reason: 'wins-material', fault: false, isRecapture: false })).toBe('punished');
  });

  it('a recapture is routine, never a find', () => {
    expect(learnRewardFor({ reason: 'only-move', fault: false, isRecapture: true })).toBeNull();
  });

  it('no fault reason ever earns a reward', () => {
    for (const r of ['hung-piece', 'ignored-threat', 'walked-into-tactic', 'missed-forcing-win', 'lost-the-thread', 'imprecise-defence', 'second-best'] as const) {
      expect(LEARN_REWARD[r]).toBeNull();
    }
  });

  it('the streak counts finds, ignores quiet moves, breaks on a fault', () => {
    let t = tallyMove(EMPTY_TALLY, 'decision', false);
    t = tallyMove(t, null, false);          // a quiet move: neither counts nor breaks
    t = tallyMove(t, 'saved', false);
    expect(t.streak).toBe(2);
    expect(t.found).toBe(2);
    t = tallyMove(t, null, true);           // a fault breaks it, and was a question posed
    expect(t.streak).toBe(0);
    expect(t.bestStreak).toBe(2);
    expect(t.posed).toBe(3);
    expect(t.saved).toBe(1);
  });
});
