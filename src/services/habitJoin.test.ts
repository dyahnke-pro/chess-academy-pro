import { describe, it, expect } from 'vitest';
import { habitForCluster, habitNeedFrom } from './coachDecider';
import { MISCONCEPTION_TAGS } from '../data/misconceptionTags';
import type { WeaknessSignal } from './weaknessSignal';

// ── TWO VOCABULARIES, ONE JOIN ───────────────────────────────────────────────
// `clusterId` is fed by BOTH the generated `analysis:*` family and the closed
// set of 26 misconception tags (weaknessSignal.ts:63 maps `w.tag` straight
// through). A regex join across both silently missed the two tags that matter
// most for the threat habit, on a string NEAR-miss — found 2026-09-16.

const w = (clusterId: string, openCount = 3): WeaknessSignal =>
  ({ clusterId, bucket: 'tactical', label: 'x', openCount, severity: 60, puzzleThemes: [] }) as never;

describe('the near-misses that motivated the map', () => {
  it('"missed-opponents-threat" joins — it does NOT contain "missed-threat"', () => {
    expect(habitForCluster('missed-opponents-threat')).toBe('opponent-threat');
  });
  it('"hung-material" joins — "hung" is not "hanging"', () => {
    expect(habitForCluster('hung-material')).toBe('opponent-threat');
  });
  it('"analysis:boardvision" joins — not seeing the board IS the threat habit', () => {
    expect(habitForCluster('analysis:boardvision')).toBe('opponent-threat');
  });
});

describe('the generated analysis:* family matches by prefix', () => {
  it.each([
    ['analysis:tactic:fork', 'forcing-scan'],
    ['analysis:tactic:back_rank', 'forcing-scan'],
    ['analysis:missed-threat', 'opponent-threat'],
    ['analysis:conversion', 'slow-down'],
    ['analysis:timetrouble', 'slow-down'],
  ])('%s → %s', (id, habit) => {
    expect(habitForCluster(id)).toBe(habit);
  });

  it('a positional analysis cluster is NOT a thinking habit', () => {
    expect(habitForCluster('analysis:structure-damage')).toBeNull();
    expect(habitForCluster('analysis:phase:middlegame')).toBeNull();
  });
});

describe('the closed set is covered exhaustively', () => {
  it('every shipped misconception tag resolves without throwing', () => {
    for (const t of MISCONCEPTION_TAGS) {
      expect(() => habitForCluster(t.id)).not.toThrow();
    }
  });

  it('the map is non-vacuous — a real share of tags carry a habit', () => {
    const mapped = MISCONCEPTION_TAGS.filter((t) => habitForCluster(t.id) !== null);
    expect(mapped.length).toBeGreaterThanOrEqual(10);
  });

  it('an unknown id is null rather than a crash', () => {
    expect(habitForCluster('totally-made-up')).toBeNull();
  });
});

describe('habitNeedFrom', () => {
  it('a CLOSED hole is not a habit they still need taught', () => {
    expect(habitNeedFrom([w('hung-material', 0)])).toEqual({});
  });
  it('an open hole sets its habit', () => {
    expect(habitNeedFrom([w('hung-material')])['opponent-threat']).toBe(true);
  });
  it('joins across BOTH vocabularies at once', () => {
    const need = habitNeedFrom([w('analysis:tactic:fork'), w('botched-conversion')]);
    expect(need['forcing-scan']).toBe(true);
    expect(need['slow-down']).toBe(true);
  });
});
