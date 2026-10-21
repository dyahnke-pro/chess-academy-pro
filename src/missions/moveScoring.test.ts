import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  hasActiveWeights,
  registerScorer,
  registeredScorers,
  resetScorersForTest,
  scoreCandidates,
  weightsForDials,
  type ScoringContext,
} from './moveScoring';
import { LEVEL_1_DIALS } from './registry';

const CTX: ScoringContext = {
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
  coach: 'w', windowCp: 80, coachEvalCp: 20, pattern: null, phase: 'opening', bossId: null,
};
const CANDS = [
  { uci: 'f1b5', cpLoss: 0 },
  { uci: 'f1c4', cpLoss: 10 },
  { uci: 'd2d4', cpLoss: 40 },
  { uci: 'a2a4', cpLoss: 200 },
];

describe('moveScoring — the one seam', () => {
  beforeEach(() => resetScorersForTest());
  afterEach(() => resetScorersForTest());

  it('with no weight, the engine order stands and nothing outside the window is offered', () => {
    expect(scoreCandidates(CANDS, CTX, {}).map((c) => c.uci)).toEqual(['f1b5', 'f1c4', 'd2d4']);
    expect(hasActiveWeights({})).toBe(false);
  });

  it('a weighted scorer re-ranks INSIDE the window — never below the level', () => {
    registerScorer('trades', (c) => (c.uci === 'a2a4' ? 1 : c.uci === 'd2d4' ? 1 : 0));
    const ranked = scoreCandidates(CANDS, CTX, { trades: 1 });
    expect(ranked[0].uci).toBe('d2d4');
    // a2a4 is liked just as much but costs 200 > 80: never offered.
    expect(ranked.map((c) => c.uci)).not.toContain('a2a4');
  });

  it('a negative weight pushes the liked moves down; ties keep the cheapest first', () => {
    registerScorer('trades', (c) => (c.uci === 'f1b5' ? 1 : 0));
    expect(scoreCandidates(CANDS, CTX, { trades: -1 }).map((c) => c.uci)).toEqual(['f1c4', 'd2d4', 'f1b5']);
  });

  it('a scorer saying more than ±1 is clamped', () => {
    registerScorer('trades', (c) => (c.uci === 'd2d4' ? 50 : 0));
    registerScorer('steer', (c) => (c.uci === 'f1c4' ? 1 : 0));
    // Clamped, trades(1×1) ties steer(1×1): the tie goes to the cheaper f1c4.
    expect(scoreCandidates(CANDS, CTX, { trades: 1, steer: 1 })[0].uci).toBe('f1c4');
  });

  it('a weight on a scorer nobody registered counts zero and reads nothing', () => {
    expect(hasActiveWeights({ steer: 1 })).toBe(false);
    expect(scoreCandidates(CANDS, CTX, { steer: 1 }).map((c) => c.uci)).toEqual(['f1b5', 'f1c4', 'd2d4']);
  });

  it('registering one id twice is a wiring bug', () => {
    registerScorer('trades', () => 0);
    expect(() => registerScorer('trades', () => 0)).toThrow(/registered twice/);
    expect(registeredScorers()).toEqual(['trades']);
  });

  it("the cards' dials map to weights; Level 1's defaults ask for none", () => {
    expect(weightsForDials(LEVEL_1_DIALS)).toEqual({});
    expect(weightsForDials({ ...LEVEL_1_DIALS, trades: 'eager', steer: 'strong' })).toEqual({ trades: 1, steer: 1 });
    expect(weightsForDials({ ...LEVEL_1_DIALS, trades: 'reluctant', steer: 'weak' })).toEqual({ trades: -1, steer: 0.5 });
  });
});
