import { describe, it, expect } from 'vitest';
import { startRun, solve, miss, bestAfter, rankFor, nextRank, START_DEPTH, RATING_STEP, RANKS } from './deepRun';

describe('deepRun', () => {
  it('starts at two moves, a little under the student, never below 400', () => {
    const s = startRun(1500, 0);
    expect(s.depth).toBe(START_DEPTH);
    expect(s.depth).toBe(2);
    expect(s.targetRating).toBe(1400);
    expect(startRun(300, 0).targetRating).toBe(400);
  });

  it('banks the SOLVER MOVES of each puzzle — depth is the score', () => {
    let s = startRun(1500, 0);
    s = solve(s, 2, false).state;
    s = solve(s, 3, false).state;
    expect(s.banked).toBe(5);
    expect(s.solved).toBe(2);
  });

  it('each solve asks for one move deeper', () => {
    let s = startRun(1500, 0);
    const r = solve(s, 2, false);
    expect(r.levelUp).toBe(true);
    s = r.state;
    expect(s.depth).toBe(3);
  });

  it('when the pool is capped, the RATING climbs instead of the depth', () => {
    const s = { ...startRun(600, 0), depth: 6 };
    const r = solve(s, 5, true);
    expect(r.levelUp).toBe(false);
    expect(r.state.depth).toBe(6);
    expect(r.state.targetRating).toBe(s.targetRating + RATING_STEP);
  });

  it('newBest fires exactly once, on the solve that first passes the best', () => {
    let s = startRun(1500, 6);
    const a = solve(s, 4, false); // 4 — not yet
    expect(a.newBest).toBe(false);
    s = a.state;
    const b = solve(s, 3, false); // 7 > 6 — fires
    expect(b.newBest).toBe(true);
    const c = solve(b.state, 3, false); // 10 — already past, silent
    expect(c.newBest).toBe(false);
  });

  it('a first-ever run (best 0) never shouts new best', () => {
    expect(solve(startRun(1500, 0), 2, false).newBest).toBe(false);
  });

  it('rankUp names the tier crossed, null otherwise', () => {
    const s = { ...startRun(1500, 0), banked: 8 };
    expect(solve(s, 3, false).rankUp?.name).toBe('Calculator');
    expect(solve({ ...s, banked: 1 }, 2, false).rankUp).toBeNull();
  });

  it('a miss ends the run and the best keeps the higher score', () => {
    const s = miss({ ...startRun(1500, 12), banked: 20 });
    expect(s.over).toBe(true);
    expect(bestAfter(s)).toBe(20);
    expect(bestAfter({ ...s, banked: 5 })).toBe(12);
  });

  it('ranks are ascending and rankFor/nextRank agree', () => {
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min);
    expect(rankFor(0).name).toBe('Spark');
    expect(nextRank(0)?.name).toBe('Calculator');
    expect(nextRank(10_000)).toBeNull();
  });
});
