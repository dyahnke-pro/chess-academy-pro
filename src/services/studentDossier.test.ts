import { describe, it, expect } from 'vitest';
import { deriveDossier, dossierOpeningLine, refreshStudentDossier, refreshStudentDossierThrottled, type StudentDossier } from './studentDossier';
import type { WeaknessLifecycle, WeaknessLifecycleEntry, LifecycleStatus, LifecycleTrend } from './weaknessLifecycle';

function entry(label: string, over: Partial<WeaknessLifecycleEntry> = {}): WeaknessLifecycleEntry {
  return {
    clusterId: `analysis:tactic:${label.toLowerCase()}`,
    label,
    bucket: 'tactical',
    total: 6,
    firstSeen: 1,
    lastSeen: 100,
    recentCount: 3,
    olderCount: 3,
    worstCpLoss: 300,
    status: 'persistent' as LifecycleStatus,
    trend: 'flat' as LifecycleTrend,
    ...over,
  };
}

function lifecycle(over: Partial<WeaknessLifecycle> = {}): WeaknessLifecycle {
  return {
    fixed: [], persistent: [], emerging: [], mostPressing: null,
    spanDays: 30, gamesConsidered: 12, sampleFloorMet: true,
    ...over,
  };
}

describe('deriveDossier', () => {
  it('returns an honest empty dossier below the sample floor', () => {
    const d = deriveDossier(lifecycle({ sampleFloorMet: false }), [], null, 1000);
    expect(d.sampleFloorMet).toBe(false);
    expect(d.chronicHoles).toEqual([]);
    expect(d.strengths).toEqual([]);
    expect(dossierOpeningLine(d)).toBe('');
  });

  it('maps persistent → chronic, emerging → emerging, and picks the improving ones', () => {
    const lc = lifecycle({
      persistent: [entry('Forks', { trend: 'worsening' }), entry('Pins', { trend: 'improving' })],
      emerging: [entry('Skewers', { trend: 'flat' })],
      mostPressing: entry('Forks', { trend: 'worsening' }),
    });
    const d = deriveDossier(lc, [], null, 1000);
    expect(d.chronicHoles.map((h) => h.label)).toEqual(['Forks', 'Pins']);
    expect(d.emergingHoles.map((h) => h.label)).toEqual(['Skewers']);
    expect(d.improving.map((h) => h.label)).toEqual(['Pins']);
    expect(d.mostPressingLabel).toBe('Forks');
  });

  it('computes strengths from self-fixed weaknesses + curriculum mastered (deduped)', () => {
    const lc = lifecycle({
      fixed: [entry('Hanging pieces', { status: 'fixed' }), entry('Back-rank tactics', { status: 'fixed' })],
    });
    const d = deriveDossier(lc, ['Rook endgames', 'Hanging pieces'], null, 1000);
    // fixed first, then mastered; 'Hanging pieces' not duplicated.
    expect(d.strengths).toEqual([
      { label: 'Hanging pieces', kind: 'fixed' },
      { label: 'Back-rank tactics', kind: 'fixed' },
      { label: 'Rook endgames', kind: 'mastered' },
    ]);
  });

  it('detects newly-cleared holes vs the prior dossier (the "builds on it" delta)', () => {
    const prior: StudentDossier = {
      generatedAt: 1, sampleFloorMet: true,
      chronicHoles: [{ clusterId: 'x', label: 'Forks', bucket: 'tactical', trend: 'worsening' }],
      emergingHoles: [], improving: [], strengths: [], mostPressingLabel: 'Forks', newlyCleared: [],
    };
    const lc = lifecycle({ fixed: [entry('Forks', { status: 'fixed' })] });
    const d = deriveDossier(lc, [], prior, 2000);
    expect(d.newlyCleared).toEqual(['Forks']);
  });

  it('caps holes and strengths', () => {
    const many = (n: number, p: string) => Array.from({ length: n }, (_, i) => entry(`${p}${i}`));
    const lc = lifecycle({ persistent: many(6, 'H'), fixed: many(6, 'F') });
    const d = deriveDossier(lc, ['M0', 'M1', 'M2', 'M3'], null, 1000);
    expect(d.chronicHoles.length).toBe(3);
    expect(d.strengths.length).toBe(3);
  });
});

describe('refresh guards (perf: no stacked full-library scans)', () => {
  it('concurrent refreshes share ONE in-flight promise (dedup)', () => {
    const a = refreshStudentDossier();
    const b = refreshStudentDossier();
    expect(a).toBe(b); // second call returns the same in-flight promise
    return a; // settle it so module state resets cleanly
  });

  it('throttled refresh right after one refreshed is a no-op that resolves', async () => {
    await refreshStudentDossier();
    await expect(refreshStudentDossierThrottled(30_000)).resolves.toBeUndefined();
  });
});

describe('dossierOpeningLine (code-authored, G0)', () => {
  it('leads with a newly-cleared win, then improving, then the top hole', () => {
    const d: StudentDossier = {
      generatedAt: 1, sampleFloorMet: true,
      chronicHoles: [], emergingHoles: [],
      improving: [{ clusterId: 'p', label: 'Pins', bucket: 'tactical', trend: 'improving' }],
      strengths: [{ label: 'Hanging pieces', kind: 'fixed' }],
      mostPressingLabel: 'Forks', newlyCleared: ['Back-rank tactics'],
    };
    const line = dossierOpeningLine(d);
    expect(line).toContain('cleared back-rank tactics');
    expect(line).toContain('Pins is trending');
    expect(line).toContain('costing you the most is forks');
  });

  it('falls back to a strength when nothing was newly cleared', () => {
    const d: StudentDossier = {
      generatedAt: 1, sampleFloorMet: true,
      chronicHoles: [], emergingHoles: [], improving: [],
      strengths: [{ label: 'Rook endgames', kind: 'mastered' }],
      mostPressingLabel: null, newlyCleared: [],
    };
    expect(dossierOpeningLine(d)).toContain('drilled rook endgames shut');
  });

  it('is empty below the sample floor', () => {
    expect(dossierOpeningLine({ sampleFloorMet: false } as StudentDossier)).toBe('');
    expect(dossierOpeningLine(null)).toBe('');
  });
});
