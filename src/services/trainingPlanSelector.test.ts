import { describe, it, expect } from 'vitest';
import { buildTodaysReps } from './trainingPlanSelector';
import type { MisconceptionAggregate } from './misconceptionService';

function wk(tag: string, openCount: number, label = tag): MisconceptionAggregate {
  return {
    tag, def: null, label, bucket: 'tactical',
    total: openCount, openCount, lastSeenAt: Date.now(), examples: [],
  };
}

const srs = (n: number) => Array.from({ length: n }, (_, i) => ({ openingId: `srs-${i}`, name: `SRS ${i}` }));
const news = (n: number) => Array.from({ length: n }, (_, i) => ({ openingId: `new-${i}`, name: `New ${i}` }));

describe('buildTodaysReps', () => {
  it('uses weighted shares — ~3 weakness / 1 SRS / 1 new of 5', () => {
    const reps = buildTodaysReps({
      weaknesses: [wk('a', 7), wk('b', 5), wk('c', 3), wk('d', 2)],
      srsDue: srs(3),
      newLines: news(3),
      total: 5,
    });
    expect(reps).toHaveLength(5);
    expect(reps.filter((r) => r.kind === 'weakness')).toHaveLength(3);
    expect(reps.filter((r) => r.kind === 'srs')).toHaveLength(1);
    expect(reps.filter((r) => r.kind === 'new')).toHaveLength(1);
  });

  it('leads with the top weakness and labels it', () => {
    const reps = buildTodaysReps({ weaknesses: [wk('overvalued-attack', 7, 'Overvalued the attack')], srsDue: [], newLines: [], total: 5 });
    expect(reps[0].kind).toBe('weakness');
    expect(reps[0].subtitle).toMatch(/top error/i);
    expect(reps[0].subtitle).toContain('7×');
  });

  it('backfills with SRS then new when there are no weaknesses', () => {
    const reps = buildTodaysReps({ weaknesses: [], srsDue: srs(2), newLines: news(5), total: 5 });
    expect(reps).toHaveLength(5);
    expect(reps.filter((r) => r.kind === 'srs')).toHaveLength(2);
    expect(reps.filter((r) => r.kind === 'new')).toHaveLength(3);
  });

  it('ignores mastered (zero open-count) weaknesses', () => {
    const reps = buildTodaysReps({ weaknesses: [wk('done', 0), wk('live', 4)], srsDue: [], newLines: [], total: 5 });
    expect(reps.every((r) => r.tag !== 'done')).toBe(true);
    expect(reps.some((r) => r.tag === 'live')).toBe(true);
  });

  it('never exceeds total and is empty for total 0', () => {
    expect(buildTodaysReps({ weaknesses: [wk('a', 9)], srsDue: srs(9), newLines: news(9), total: 0 })).toHaveLength(0);
    expect(buildTodaysReps({ weaknesses: [wk('a', 9)], srsDue: srs(9), newLines: news(9), total: 3 })).toHaveLength(3);
  });

  it('returns fewer than total when pools are exhausted', () => {
    const reps = buildTodaysReps({ weaknesses: [wk('a', 2)], srsDue: [], newLines: [], total: 5 });
    expect(reps).toHaveLength(1);
    expect(reps[0].tag).toBe('a');
  });
});
