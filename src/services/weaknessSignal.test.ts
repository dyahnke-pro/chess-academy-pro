import { describe, it, expect } from 'vitest';
import {
  buildWeaknessSignals,
  boostFor,
  matchClauseKind,
  matchTacticPattern,
  matchTag,
  type WeaknessSignal,
} from './weaknessSignal';
import type { UnifiedWeakness } from './weaknessSpine';
import type { WeaknessLifecycle, WeaknessLifecycleEntry, LifecycleStatus, LifecycleTrend } from './weaknessLifecycle';
import type { MisconceptionBucket } from '../data/misconceptionTags';

function uw(tag: string, over: Partial<UnifiedWeakness> = {}): UnifiedWeakness {
  return {
    tag, key: tag, label: tag, bucket: 'tactical' as MisconceptionBucket,
    openCount: 3, total: 5, severity: 50, sources: ['analysis'],
    puzzleThemes: [], positions: [], lastSeenAt: Date.now(), ...over,
  };
}
function lifeEntry(clusterId: string, status: LifecycleStatus, trend: LifecycleTrend): WeaknessLifecycleEntry {
  return { clusterId, label: clusterId, bucket: 'tactical' as MisconceptionBucket, total: 5, firstSeen: 0, lastSeen: 1, recentCount: 2, olderCount: 2, worstCpLoss: 300, status, trend };
}
function lifecycle(entries: { fixed?: WeaknessLifecycleEntry[]; persistent?: WeaknessLifecycleEntry[]; emerging?: WeaknessLifecycleEntry[] }, floorMet = true): WeaknessLifecycle {
  return { fixed: entries.fixed ?? [], persistent: entries.persistent ?? [], emerging: entries.emerging ?? [], mostPressing: null, spanDays: 30, gamesConsidered: 20, sampleFloorMet: floorMet };
}

describe('buildWeaknessSignals — joins profile with lifecycle', () => {
  it('attaches lifecycle status/trend by clusterId', () => {
    const profile = [uw('analysis:tactic:fork'), uw('analysis:tactic:pin')];
    const life = lifecycle({ persistent: [lifeEntry('analysis:tactic:fork', 'persistent', 'worsening')] });
    const sigs = buildWeaknessSignals(profile, life);
    const fork = sigs.find((s) => s.clusterId === 'analysis:tactic:fork')!;
    expect(fork.lifecycleStatus).toBe('persistent');
    expect(fork.trend).toBe('worsening');
    const pin = sigs.find((s) => s.clusterId === 'analysis:tactic:pin')!;
    expect(pin.lifecycleStatus).toBeUndefined(); // no lifecycle entry
  });

  it('drops status/trend when the sample floor is not met (never guess a trend)', () => {
    const life = lifecycle({ persistent: [lifeEntry('analysis:tactic:fork', 'persistent', 'worsening')] }, false);
    const sigs = buildWeaknessSignals([uw('analysis:tactic:fork')], life);
    expect(sigs[0].lifecycleStatus).toBeUndefined();
  });

  it('null lifecycle → signals with no status (coach-only profile)', () => {
    const sigs = buildWeaknessSignals([uw('coach:hangs-when-attacked')], null);
    expect(sigs).toHaveLength(1);
    expect(sigs[0].lifecycleStatus).toBeUndefined();
  });
});

describe('boostFor — lifecycle-keyed, capped', () => {
  const sig = (over: Partial<WeaknessSignal>): WeaknessSignal => ({ clusterId: 'x', bucket: 'tactical' as MisconceptionBucket, label: 'x', openCount: 3, severity: 50, puzzleThemes: [], ...over });
  it('persistent + worsening earns the most; fixed earns nothing', () => {
    const persistentWorsening = boostFor(sig({ lifecycleStatus: 'persistent', trend: 'worsening' }));
    const emerging = boostFor(sig({ lifecycleStatus: 'emerging', trend: 'flat' }));
    const fixed = boostFor(sig({ lifecycleStatus: 'fixed', trend: 'improving' }));
    expect(fixed).toBe(0);
    expect(persistentWorsening).toBeGreaterThan(emerging);
    expect(emerging).toBeGreaterThan(0);
  });
  it('never exceeds the cap (safety-critical live facts still lead)', () => {
    const huge = boostFor(sig({ lifecycleStatus: 'persistent', trend: 'worsening', openCount: 999 }));
    expect(huge).toBeLessThanOrEqual(30);
  });
});

describe('matchClauseKind — only honest links', () => {
  const signals: WeaknessSignal[] = [
    { clusterId: 'analysis:tactic:hanging_piece', bucket: 'tactical' as MisconceptionBucket, label: 'hangs pieces', openCount: 5, severity: 70, lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: [] },
    { clusterId: 'analysis:tactic:pin', bucket: 'tactical' as MisconceptionBucket, label: 'walks into pins', openCount: 2, severity: 40, lifecycleStatus: 'emerging', trend: 'flat', puzzleThemes: [] },
    { clusterId: 'analysis:conversion-endgame:rook', bucket: 'endgame' as MisconceptionBucket, label: 'botches conversions', openCount: 3, severity: 60, lifecycleStatus: 'persistent', trend: 'flat', puzzleThemes: [] },
    { clusterId: 'analysis:structure-damage', bucket: 'positional' as MisconceptionBucket, label: 'wrecks own structure', openCount: 2, severity: 45, puzzleThemes: [] },
  ];
  it('must-defend ↔ hanging piece', () => {
    expect(matchClauseKind('must-defend', signals)?.clusterId).toBe('analysis:tactic:hanging_piece');
  });
  it('latent-danger ↔ pin/skewer', () => {
    expect(matchClauseKind('latent-danger', signals)?.clusterId).toBe('analysis:tactic:pin');
  });
  it('convert ↔ conversion/endgame', () => {
    expect(matchClauseKind('convert', signals)?.clusterId).toBe('analysis:conversion-endgame:rook');
  });
  it('fundamental/structure-plan ↔ positional', () => {
    expect(matchClauseKind('structure-plan', signals)?.clusterId).toBe('analysis:structure-damage');
  });
  it('unmapped kinds return null (no forced match)', () => {
    for (const k of ['status', 'deliberation', 'key-moment', 'opponent-intent', 'student-leans', 'opponent-leans']) {
      expect(matchClauseKind(k, signals)).toBeNull();
    }
  });
});

describe('matchTacticPattern — via the vocabulary bridge', () => {
  const signals: WeaknessSignal[] = [
    { clusterId: 'analysis:tactic:discovered_attack', bucket: 'tactical' as MisconceptionBucket, label: 'misses discoveries', openCount: 4, severity: 65, lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: [] },
  ];
  it('a live "discovery" fact matches the "discovered_attack" weakness (the silent-mismatch bug, now fixed)', () => {
    expect(matchTacticPattern('discovery', signals)?.clusterId).toBe('analysis:tactic:discovered_attack');
  });
  it('a motif with no weakness counterpart never matches', () => {
    expect(matchTacticPattern('mate_threat', signals)).toBeNull();
    expect(matchTacticPattern('battery', signals)).toBeNull();
  });
  it('no such hole → null', () => {
    expect(matchTacticPattern('fork', signals)).toBeNull();
  });
});

describe('matchTag — direct cluster/tag match', () => {
  const signals: WeaknessSignal[] = [
    { clusterId: 'coach:hangs-when-attacked', bucket: 'tactical' as MisconceptionBucket, label: 'x', openCount: 2, severity: 40, puzzleThemes: [] },
  ];
  it('matches a raw carried tag', () => {
    expect(matchTag('coach:hangs-when-attacked', signals)?.clusterId).toBe('coach:hangs-when-attacked');
  });
  it('null/empty tag → null', () => {
    expect(matchTag(null, signals)).toBeNull();
    expect(matchTag(undefined, signals)).toBeNull();
  });
});
