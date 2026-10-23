import { describe, it, expect } from 'vitest';
import { learnRewardFor, tallyMove, EMPTY_TALLY, LEARN_REWARD, placePraise } from './learnReward';

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

  it('walking into a forced mate earns nothing (it paid a gem and praise, 2026-10-21)', () => {
    expect(learnRewardFor({ reason: 'allows-mate', fault: true, isRecapture: false })).toBeNull();
  });

  it('a recapture is routine, never a find', () => {
    expect(learnRewardFor({ reason: 'only-move', fault: false, isRecapture: true })).toBeNull();
  });

  it('no fault reason ever earns a reward', () => {
    for (const r of ['allows-mate', 'hung-piece', 'ignored-threat', 'walked-into-tactic', 'missed-forcing-win', 'lost-the-thread', 'imprecise-defence', 'second-best'] as const) {
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
  it('a rung-up, a new best, a tempo run or the jackpot pays on top of moves already counted — never a find', () => {
    const one = tallyMove(EMPTY_TALLY, 'saved', false);
    for (const k of ['levelUp', 'newBest', 'tempoRun', 'jackpot', 'rankUp', 'proven'] as const) {
      expect(tallyMove(one, k, false), k).toEqual(one);
    }
  });
});

import { savedWhy } from './learnReward';
describe('a save names what it saved (praise never bare)', () => {
  const FEN = '4k3/8/8/8/4p3/5N2/8/4K3 w - - 0 1'; // e4 pawn hits the f3 knight
  it('names the piece the move took out of the attack', () => {
    // The piece leads: "Nd4 takes your knight" is spoken as a capture of it
    // (David's record 2026-10-19: "Rook to g5 takes your rook out of the attack").
    expect(savedWhy(FEN, 'Nd4', 'w')).toBe('Your knight steps out of the attack with Nd4.');
  });
  it('says nothing when the move saves nothing', () => {
    expect(savedWhy(FEN, 'Kf2', 'w')).toBeNull();
  });
});

describe('placePraise — earned praise is never said bare (prod Learn audit 2026-10-20)', () => {
  it('a found move\'s praise rides the found-move lane, never alone', () => {
    // "Exactly right." was spoken on its own, ahead of a why that came later or not at all.
    expect(placePraise('Exactly right.', { saved: null, foundSpeaks: true })).toEqual({ now: null, onFound: 'Exactly right.' });
  });
  it('a save speaks now, with what it saved', () => {
    expect(placePraise('Good defence.', { saved: 'Qb8 takes your queen out of the attack.', foundSpeaks: false }).now)
      .toBe('Good defence. Qb8 takes your queen out of the attack.');
  });
  it('no why, no praise', () => {
    expect(placePraise('Exactly right.', { saved: null, foundSpeaks: false })).toEqual({ now: null, onFound: null });
  });
});
