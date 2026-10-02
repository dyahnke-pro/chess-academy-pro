import { describe, it, expect } from 'vitest';
import {
  startRun, solve, miss, bestAfter, rankFor, nextRank, nextRunRating,
  START_DEPTH, RANKS, RUN_RATING_FLOOR, type SolvedPuzzle,
} from './deepRun';

const p = (over: Partial<SolvedPuzzle> = {}): SolvedPuzzle => ({
  servedDepth: 2, cleanMoves: 2, puzzleRating: 1500, capped: false, ...over,
});

describe('deepRun', () => {
  it('starts at two moves, AT the student puzzle rating, never below the floor', () => {
    const s = startRun(1500, 0);
    expect(s.depth).toBe(START_DEPTH);
    expect(s.depth).toBe(2);
    expect(s.targetRating).toBe(1500);
    expect(startRun(300, 0).targetRating).toBe(RUN_RATING_FLOOR);
  });

  it('banks only the CLEAN moves — an assisted move banks nothing, the run goes on', () => {
    let s = startRun(1500, 0);
    s = solve(s, p({ servedDepth: 2, cleanMoves: 2 })).state;
    s = solve(s, p({ servedDepth: 3, cleanMoves: 1 })).state;
    expect(s.banked).toBe(3);
    expect(s.solved).toBe(2);
    expect(s.over).toBe(false);
  });

  it('every solve asks one move deeper, clean or not', () => {
    const r = solve(startRun(1500, 0), p({ cleanMoves: 0 }));
    expect(r.levelUp).toBe(true);
    expect(r.state.depth).toBe(3);
  });

  it('a capped pool holds the depth; the rating still follows the performance', () => {
    const s = { ...startRun(1500, 0), depth: 6 };
    const r = solve(s, p({ servedDepth: 5, cleanMoves: 5, capped: true }));
    expect(r.levelUp).toBe(false);
    expect(r.state.depth).toBe(6);
    expect(r.state.targetRating).toBeGreaterThan(1500);
  });

  it('HARDER, algo-tailored: a clean solve climbs, a struggle pulls back', () => {
    const clean = solve(startRun(1500, 0), p({ cleanMoves: 2 })).state.targetRating;
    const half = solve(startRun(1500, 0), p({ cleanMoves: 1 })).state.targetRating;
    const none = solve(startRun(1500, 0), p({ cleanMoves: 0 })).state.targetRating;
    expect(clean).toBeGreaterThan(1500);
    expect(half).toBe(1500); // even puzzle, half clean = expectation
    expect(none).toBeLessThan(1500);
  });

  it('beating a harder puzzle clean climbs more than beating an easier one', () => {
    const vsHard = nextRunRating(1500, 1800, 1) - 1500;
    const vsEasy = nextRunRating(1500, 1200, 1) - 1500;
    expect(vsHard).toBeGreaterThan(vsEasy);
    expect(vsEasy).toBeGreaterThan(0);
  });

  it('a run of clean solves keeps climbing — longer AND harder', () => {
    let s = startRun(1000, 0);
    for (let i = 0; i < 6; i++) {
      s = solve(s, p({ servedDepth: s.depth, cleanMoves: s.depth, puzzleRating: s.targetRating })).state;
    }
    expect(s.depth).toBe(START_DEPTH + 6);
    expect(s.targetRating).toBeGreaterThan(1200);
  });

  it('damped: one puzzle never swings the rating by more than K', () => {
    expect(Math.abs(nextRunRating(1500, 3000, 1) - 1500)).toBeLessThanOrEqual(96);
    expect(Math.abs(nextRunRating(1500, 400, 0) - 1500)).toBeLessThanOrEqual(96);
  });

  it('newBest fires exactly once, on the solve that first passes the best', () => {
    let s = startRun(1500, 6);
    const a = solve(s, p({ servedDepth: 4, cleanMoves: 4 }));
    expect(a.newBest).toBe(false);
    s = a.state;
    const b = solve(s, p({ servedDepth: 3, cleanMoves: 3 }));
    expect(b.newBest).toBe(true);
    expect(solve(b.state, p({ servedDepth: 3, cleanMoves: 3 })).newBest).toBe(false);
  });

  it('a first-ever run (best 0) never shouts new best', () => {
    expect(solve(startRun(1500, 0), p()).newBest).toBe(false);
  });

  it('rankUp names the tier crossed, null otherwise', () => {
    const s = { ...startRun(1500, 0), banked: 8 };
    expect(solve(s, p({ servedDepth: 3, cleanMoves: 3 })).rankUp?.name).toBe('Calculator');
    expect(solve({ ...s, banked: 1 }, p()).rankUp).toBeNull();
  });

  it('Show solution ends the run and the best keeps the higher score', () => {
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
