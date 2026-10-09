/**
 * The weakness-trends reply below the sample floor (all-screens walk
 * 2026-10-09): review said "I've only got 0 games to go on … I'll break
 * down" — the coach talking about itself, and a count of zero read out.
 */
import { describe, it, expect } from 'vitest';
import { assembleWeaknessBriefingAnswer } from './groundedAnswer';

const lc = (n: number) => ({ gamesConsidered: n, sampleFloorMet: false }) as never;

describe('weakness briefing below the sample floor', () => {
  it('with nothing analyzed, says so without a zero count or "I"', () => {
    const t = assembleWeaknessBriefingAnswer(lc(0))!.facts;
    expect(t).toMatch(/^None of your games are analyzed yet/);
    expect(t).not.toMatch(/\b0 games?\b|\bI\b|I've|I'll/);
  });
  it('with a few, states the count in the student\'s terms', () => {
    expect(assembleWeaknessBriefingAnswer(lc(1))!.facts).toMatch(/^Only 1 of your games is analyzed so far/);
    expect(assembleWeaknessBriefingAnswer(lc(3))!.facts).toMatch(/^Only 3 of your games are analyzed so far/);
  });
});
