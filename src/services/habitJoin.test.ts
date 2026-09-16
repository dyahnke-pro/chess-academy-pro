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
  it('a hole with nothing open reads CLOSED — they are not owed the warning', () => {
    expect(habitNeedFrom([w('hung-material', 0)])['opponent-threat']).toBe('closed');
  });
  it('an open hole reads OPEN', () => {
    expect(habitNeedFrom([w('hung-material')])['opponent-threat']).toBe('open');
  });
  it('joins across BOTH vocabularies at once', () => {
    const need = habitNeedFrom([w('analysis:tactic:fork'), w('botched-conversion')]);
    expect(need['forcing-scan']).toBe('open');
    expect(need['slow-down']).toBe('open');
  });

  // ── "IF THEY FIND IT MORE OFTEN THAN NOT, STAY QUIET" ────────────────────
  // David 2026-09-16. The lifecycle already computes this; standingOf only reads it.
  it('a FIXED cluster is closed — they stopped erring here', () => {
    const fixed = { ...w('hung-material'), lifecycleStatus: 'fixed' } as never;
    expect(habitNeedFrom([fixed])['opponent-threat']).toBe('closed');
  });

  it('OCCASIONAL + improving is fading — they mostly find it now', () => {
    const fading = { ...w('hung-material'), lifecycleStatus: 'occasional', trend: 'improving' } as never;
    expect(habitNeedFrom([fading])['opponent-threat']).toBe('fading');
  });

  it('OCCASIONAL but NOT improving is still open', () => {
    const stuck = { ...w('hung-material'), lifecycleStatus: 'occasional', trend: 'flat' } as never;
    expect(habitNeedFrom([stuck])['opponent-threat']).toBe('open');
  });

  it('an UNSCORED cluster reads OPEN — unknown must never read as "they have it"', () => {
    expect(habitNeedFrom([w('hung-material')])['opponent-threat']).toBe('open');
  });

  it('the WORST standing wins when two clusters map to one habit', () => {
    // hung-material and missed-opponents-threat are both 'opponent-threat'.
    const fixed = { ...w('hung-material'), lifecycleStatus: 'fixed' } as never;
    const open = w('missed-opponents-threat');
    expect(habitNeedFrom([fixed, open])['opponent-threat']).toBe('open');
    expect(habitNeedFrom([open, fixed])['opponent-threat']).toBe('open');
  });
});
