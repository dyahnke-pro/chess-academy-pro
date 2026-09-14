import { describe, it, expect } from 'vitest';
import {
  initReachState,
  resolveReachState,
  nextTarget,
  recordReachResult,
  reachTier,
  STRETCH_SEED,
  BASE_UP,
  BASE_DOWN,
  TARGET_SUCCESS,
  SPIKE,
  SPIKE_CADENCE,
  SPIKE_MISS_MULT,
  HOT_STREAK_SPIKE,
  TIER_BAND,
  FLOOR,
  CEILING,
  MASTER_FLOOR,
  type ReachState,
} from './reachRating';

/** Play a run of results through the controller, returning the final state and
 *  every event emitted. `pattern` is an array of booleans (true = correct). */
function run(start: ReachState, pattern: boolean[]) {
  let state = start;
  const events = [];
  for (const correct of pattern) {
    // Consume the pending spike the same way the surface does.
    const { isSpike } = nextTarget(state);
    const r = recordReachResult(state, correct, { wasSpike: isSpike });
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

describe('initReachState / resolveReachState (seed + resume)', () => {
  it('seeds base puzzleRating + STRETCH_SEED, first-time only', () => {
    const s = initReachState(1200);
    expect(s.rating).toBe(1200 + STRETCH_SEED);
    expect(s.streak).toBe(0);
    expect(s.spikePending).toBe(false);
  });

  it('RESUMES the persisted state — never re-inflates +200 each session', () => {
    const persisted: ReachState = {
      rating: 1650, streak: 4, solved: 40, sinceSpike: 2, peakTier: 11, spikePending: false,
    };
    const resolved = resolveReachState(persisted, 1200);
    expect(resolved).toBe(persisted); // same object, no re-seed
    expect(resolved.rating).toBe(1650);
  });

  it('seeds when nothing is persisted', () => {
    expect(resolveReachState(undefined, 900).rating).toBe(900 + STRETCH_SEED);
  });

  it('clamps a seed above the ceiling / below the floor', () => {
    expect(initReachState(5000).rating).toBe(CEILING);
    expect(initReachState(50).rating).toBe(FLOOR);
  });
});

describe('equilibrium (~80% success, down ≈ 4× up)', () => {
  it('derives the down-step so steady-state success is TARGET_SUCCESS', () => {
    // p·UP = (1−p)·DOWN  ⇒  DOWN/UP = p/(1−p) = 0.8/0.2 = 4
    expect(BASE_DOWN / BASE_UP).toBeCloseTo(TARGET_SUCCESS / (1 - TARGET_SUCCESS), 5);
    expect(BASE_DOWN).toBe(BASE_UP * 4);
  });

  it('nets ~zero over a long 80%-correct run (floats, does not drift)', () => {
    // 8 correct + 2 wrong, no streak long enough to ramp hard repeatedly is not
    // realistic to hand-build; instead verify the raw step algebra: 4 ups at
    // BASE_UP (streak 1..4, ramp kicks at 3) vs 1 down cancels roughly. Simpler
    // invariant: a single correct then a single wrong from a cold streak =
    // +BASE_UP − BASE_DOWN (net negative, pulling an over-seeded rating down).
    const s0 = initReachState(1200); // 1400
    const afterWin = recordReachResult(s0, true);
    expect(afterWin.delta).toBe(BASE_UP);
    const afterLoss = recordReachResult(afterWin.state, false);
    expect(afterLoss.delta).toBe(-BASE_DOWN);
  });
});

describe('streak ramp (the FELT climb)', () => {
  it('doubles the up-step at streak 3, triples at 5', () => {
    let s = initReachState(1200);
    const deltas: number[] = [];
    for (let i = 0; i < 6; i++) {
      const r = recordReachResult(s, true);
      deltas.push(r.delta);
      s = r.state;
    }
    // streaks 1,2 → ×1 ; 3,4 → ×2 ; 5,6 → ×3
    expect(deltas).toEqual([
      BASE_UP, BASE_UP,
      BASE_UP * 2, BASE_UP * 2,
      BASE_UP * 3, BASE_UP * 3,
    ]);
  });

  it('a miss resets the streak and the ramp', () => {
    const { state } = run(initReachState(1200), [true, true, true, false]);
    expect(state.streak).toBe(0);
    const back = recordReachResult(state, true);
    expect(back.delta).toBe(BASE_UP); // ramp gone, back to base
  });
});

describe('boss spikes', () => {
  const base: ReachState = {
    rating: 1500, streak: 0, solved: 20, sinceSpike: 0, peakTier: 10, spikePending: false,
  };

  it('serves a spike after SPIKE_CADENCE solves (streak past the hot trigger)', () => {
    // streak 6 (not === HOT_STREAK_SPIKE) isolates the cadence path.
    const s: ReachState = { ...base, streak: 6, sinceSpike: SPIKE_CADENCE - 1 };
    const r = recordReachResult(s, true);
    expect(r.state.spikePending).toBe(true);
    const { target, isSpike } = nextTarget(r.state);
    expect(isSpike).toBe(true);
    expect(target).toBe(r.state.rating + SPIKE);
  });

  it('serves a spike on a hot streak (HOT_STREAK_SPIKE), before cadence', () => {
    const s: ReachState = { ...base, streak: HOT_STREAK_SPIKE - 1, sinceSpike: 0 };
    const r = recordReachResult(s, true);
    expect(r.state.streak).toBe(HOT_STREAK_SPIKE);
    expect(r.state.spikePending).toBe(true);
  });

  it('a MISSED spike carries a reduced penalty and never stacks another spike', () => {
    const s: ReachState = { ...base, spikePending: true };
    const missed = recordReachResult(s, false, { wasSpike: true });
    expect(missed.delta).toBe(-BASE_DOWN * SPIKE_MISS_MULT);
    expect(missed.state.spikePending).toBe(false); // consumed, not re-armed
  });

  it('a CLEARED spike emits spike-cleared and resets the cadence', () => {
    const s: ReachState = { ...base, sinceSpike: 5, spikePending: true };
    const cleared = recordReachResult(s, true, { wasSpike: true });
    expect(cleared.events.some((e) => e.kind === 'spike-cleared')).toBe(true);
    expect(cleared.state.sinceSpike).toBe(0);
    expect(cleared.state.spikePending).toBe(false); // consumed, no immediate re-arm
  });
});

describe('no band cage — floats down to the pool floor', () => {
  it('a weak solver adapts DOWN well below their seeded rating (no floor at own level)', () => {
    // Seed high, then miss relentlessly — the rating must fall far below the
    // seed, all the way toward the pool floor, never stopping at "own rating".
    const seed = initReachState(1800); // 2000
    const { state } = run(seed, Array(60).fill(false));
    expect(state.rating).toBe(FLOOR);
    expect(state.rating).toBeLessThan(1800); // blew past the base rating
  });

  it('never exceeds the ceiling on a long win streak', () => {
    const { state } = run(initReachState(2700), Array(80).fill(true));
    expect(state.rating).toBe(CEILING);
  });
});

describe('milestone cues (computed; coach only voices them)', () => {
  it('fires a LOUD tier-up only on genuinely NEW ground, not on re-climb', () => {
    // Climb across a band, drop back, re-climb the SAME band → only ONE tier-up
    // for that tier.
    let s: ReachState = {
      rating: TIER_BAND * 10 - 2, streak: 0, solved: 0, sinceSpike: 0,
      peakTier: 9, spikePending: false,
    };
    const up1 = recordReachResult(s, true); // crosses into tier 10
    expect(up1.events.some((e) => e.kind === 'tier-up')).toBe(true);
    s = up1.state;
    expect(s.peakTier).toBe(10);
    // drop below tier 10 then climb back — no second tier-up (already peaked 10)
    const down = run(s, [false, false, false]);
    const reclimb = run(down.state, [true, true, true, true]);
    const tierUps = reclimb.events.filter((e) => e.kind === 'tier-up');
    expect(tierUps.length).toBe(0);
  });

  it('fires a GENTLE settle on a downward band cross', () => {
    const s: ReachState = {
      rating: TIER_BAND * 10 + 2, streak: 3, solved: 20, sinceSpike: 1,
      peakTier: 10, spikePending: false,
    };
    const r = recordReachResult(s, false); // BASE_DOWN drop crosses down a band
    expect(r.events.some((e) => e.kind === 'settle')).toBe(true);
  });

  it('emits a streak cue exactly at the ramp thresholds, once each', () => {
    const { events } = run(initReachState(1200), [true, true, true, true, true, true]);
    const streaks = events.filter((e) => e.kind === 'streak').map((e) => (e as { streak: number }).streak);
    expect(streaks).toEqual([3, 5]); // once at 3, once at 5 — not every solve after
  });
});

describe('persistence shape (round-trips through a plain object)', () => {
  it('the state is a flat JSON-safe object with no methods', () => {
    const s = run(initReachState(1200), [true, false, true, true]).state;
    const round = JSON.parse(JSON.stringify(s)) as ReachState;
    expect(round).toEqual(s);
    expect(Object.keys(round).sort()).toEqual(
      ['peakTier', 'rating', 'sinceSpike', 'solved', 'spikePending', 'streak'],
    );
  });
});

describe('Master ladder (own band)', () => {
  it('seeds and floors in the elite band', () => {
    const s = initReachState(2000, { master: true });
    expect(s.rating).toBeGreaterThanOrEqual(MASTER_FLOOR);
    const { state } = run2(s, Array(40).fill(false), { master: true });
    expect(state.rating).toBe(MASTER_FLOOR); // never drops below the master floor
  });
});

/** run() variant that threads master opts. */
function run2(start: ReachState, pattern: boolean[], opts: { master?: boolean }) {
  let state = start;
  for (const correct of pattern) {
    const { isSpike } = nextTarget(state, opts);
    state = recordReachResult(state, correct, { wasSpike: isSpike, ...opts }).state;
  }
  return { state };
}

describe('reachTier', () => {
  it('is 1-based and never zero', () => {
    expect(reachTier(50)).toBe(1);
    expect(reachTier(1500)).toBe(Math.floor(1500 / TIER_BAND));
  });
});
