import { describe, it, expect } from 'vitest';
import {
  buildCurriculum,
  reconcileCurriculum,
  activeCurriculumItem,
  nextCurriculumItem,
  curriculumArcLine,
} from './coachCurriculumService';
import type { UnifiedWeakness } from './weaknessSpine';

const NOW = 1_000_000;

function w(tag: string, openCount: number, severity: number, label = tag): UnifiedWeakness {
  return {
    tag, label, openCount, key: tag, bucket: 'tactical', total: openCount + 2,
    severity, sources: ['analysis'], puzzleThemes: [tag], positions: [], lastSeenAt: NOW,
  };
}

describe('buildCurriculum', () => {
  it('sequences the top open weaknesses (first active, rest queued)', () => {
    const rec = buildCurriculum([w('fork', 5, 80), w('pin', 3, 60), w('skewer', 2, 40)], NOW);
    expect(rec.items.map((i) => `${i.tag}:${i.status}`)).toEqual([
      'fork:active', 'pin:queued', 'skewer:queued',
    ]);
  });

  it('drops weaknesses with no open instances (already drilled shut)', () => {
    const rec = buildCurriculum([w('fork', 0, 90), w('pin', 3, 60)], NOW);
    expect(rec.items.map((i) => i.tag)).toEqual(['pin']);
    expect(activeCurriculumItem(rec)!.tag).toBe('pin');
  });

  it('is empty when there is no open weakness', () => {
    expect(buildCurriculum([w('fork', 0, 90)], NOW).items).toEqual([]);
  });
});

describe('reconcileCurriculum', () => {
  it('masters the active step when its weakness is drilled shut and promotes the next', () => {
    const start = buildCurriculum([w('fork', 5, 80), w('pin', 3, 60)], NOW);
    // fork is now drilled shut (openCount 0); pin still open.
    const next = reconcileCurriculum(start, [w('fork', 0, 80), w('pin', 3, 60)], NOW + 1);
    expect(activeCurriculumItem(next)!.tag).toBe('pin');
    const fork = next.items.find((i) => i.tag === 'fork')!;
    expect(fork.status).toBe('mastered');
    expect(fork.masteredAt).toBe(NOW + 1);
  });

  it('keeps mastered history and never resurrects a shut weakness on its own', () => {
    const start = reconcileCurriculum(
      buildCurriculum([w('fork', 5, 80), w('pin', 3, 60)], NOW),
      [w('fork', 0, 80), w('pin', 3, 60)],
      NOW + 1,
    );
    // Another reconcile with fork STILL shut — it stays mastered, not re-added.
    const again = reconcileCurriculum(start, [w('fork', 0, 80), w('pin', 3, 60)], NOW + 2);
    expect(again.items.filter((i) => i.tag === 'fork')).toHaveLength(1);
    expect(again.items.find((i) => i.tag === 'fork')!.status).toBe('mastered');
  });

  it('tops up queued steps from newly-surfaced weaknesses', () => {
    const start = buildCurriculum([w('fork', 5, 80)], NOW);
    const next = reconcileCurriculum(start, [w('fork', 5, 80), w('pin', 4, 70)], NOW + 1);
    expect(next.items.map((i) => `${i.tag}:${i.status}`)).toEqual(['fork:active', 'pin:queued']);
  });
});

describe('curriculumArcLine', () => {
  it('names the sequence when there is a next step', () => {
    const rec = buildCurriculum([w('fork', 5, 80, 'Forks'), w('pin', 3, 60, 'Pins')], NOW);
    expect(curriculumArcLine(rec)).toMatch(/close out forks, then move to pins/i);
  });
  it('names just the active step when it is the only one', () => {
    const rec = buildCurriculum([w('fork', 5, 80, 'Forks')], NOW);
    expect(curriculumArcLine(rec)).toMatch(/drilling forks until it's shut/i);
    expect(nextCurriculumItem(rec)).toBeNull();
  });
  it('is empty for an empty arc', () => {
    expect(curriculumArcLine(null)).toBe('');
  });
});
