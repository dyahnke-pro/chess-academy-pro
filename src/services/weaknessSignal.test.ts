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
    puzzleThemes: [], positions: [], lastSeenAt: Date.now(), gameIds: [], lastDrilledAt: null, capabilityTag: null, ...over,
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
  const sig = (over: Partial<WeaknessSignal>): WeaknessSignal => ({ clusterId: 'x', capabilityTag: null, proven: false, bucket: 'tactical' as MisconceptionBucket, label: 'x', openCount: 3, total: 3, severity: 50, puzzleThemes: [], ...over });
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
    { clusterId: 'analysis:tactic:hanging_piece', capabilityTag: null, proven: false, bucket: 'tactical' as MisconceptionBucket, label: 'hangs pieces', openCount: 5, total: 5, severity: 70, lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: [] },
    { clusterId: 'analysis:tactic:pin', capabilityTag: null, proven: false, bucket: 'tactical' as MisconceptionBucket, label: 'walks into pins', openCount: 2, total: 2, severity: 40, lifecycleStatus: 'emerging', trend: 'flat', puzzleThemes: [] },
    { clusterId: 'analysis:conversion-endgame:rook', capabilityTag: null, proven: false, bucket: 'endgame' as MisconceptionBucket, label: 'botches conversions', openCount: 3, total: 3, severity: 60, lifecycleStatus: 'persistent', trend: 'flat', puzzleThemes: [] },
    { clusterId: 'analysis:structure-damage', capabilityTag: null, proven: false, bucket: 'positional' as MisconceptionBucket, label: 'wrecks own structure', openCount: 2, total: 2, severity: 45, puzzleThemes: [] },
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
    { clusterId: 'analysis:tactic:discovered_attack', capabilityTag: null, proven: false, bucket: 'tactical' as MisconceptionBucket, label: 'misses discoveries', openCount: 4, total: 4, severity: 65, lifecycleStatus: 'persistent', trend: 'worsening', puzzleThemes: [] },
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
    { clusterId: 'coach:hangs-when-attacked', capabilityTag: null, proven: false, bucket: 'tactical' as MisconceptionBucket, label: 'x', openCount: 2, total: 2, severity: 40, puzzleThemes: [] },
  ];
  it('matches a raw carried tag', () => {
    expect(matchTag('coach:hangs-when-attacked', signals)?.clusterId).toBe('coach:hangs-when-attacked');
  });
  it('null/empty tag → null', () => {
    expect(matchTag(null, signals)).toBeNull();
    expect(matchTag(undefined, signals)).toBeNull();
  });
});

// WO-LOOP-01 — the signal carries the DISTINCT prior games, newest first.
describe('buildWeaknessSignals — games (the recurrence unit)', () => {
  const base = { key: 'k', gameIds: [], lastDrilledAt: null, capabilityTag: null, tag: 'fundamental:loose-piece', label: 'Loose pieces', bucket: 'tactical' as const, openCount: 3, total: 3, severity: 40, sources: ['analysis' as const], puzzleThemes: [], lastSeenAt: 0 };
  it('dedupes by gameId and keeps order; skips positions with no game', () => {
    const w = { ...base, positions: [
      { fen: 'x', from: { origin: 'game' as const, gameId: 'g2', opponentName: 'B', playedAt: 200 } },
      { fen: 'x', from: { origin: 'game' as const, gameId: 'g2', opponentName: 'B', playedAt: 200 } },
      { fen: 'x', from: { origin: 'drill' as const } },
      { fen: 'x', from: { origin: 'game' as const, gameId: 'g1', opponentName: 'A', playedAt: 100 } },
    ] };
    const [s] = buildWeaknessSignals([w as never], null);
    expect(s.games).toEqual([{ gameId: 'g2', opponentName: 'B', playedAt: 200 }, { gameId: 'g1', opponentName: 'A', playedAt: 100 }]);
  });
  it('a source with no provenance at all → games undefined (not empty), so the count-based read survives', () => {
    const [s] = buildWeaknessSignals([{ ...base, positions: [] } as never], null);
    expect(s.games).toBeUndefined();
  });
});

// C6 (WO-STANDARD-01, 2026-09-22) — DECAY ON POSITIVE EVIDENCE, NEVER ON ABSENCE.
//
// A one-off slip used to raise the ranker for good: `boostFor` was RAISE-ONLY
// and the only ways down were a drill spacing the instance out or the
// lifecycle's archive window. The heat map's rule is that data may LOWER a
// decision only on evidence of the POSITIVE, and the app now records that
// evidence (`capabilityEvidence`). So a PROVEN capability for the SAME tag
// lowers the signal to green; a gap in the record — however long — does not.
describe('boostFor — GREEN lowers, absence never does (C6)', () => {
  const red = (over: Partial<WeaknessSignal> = {}): WeaknessSignal => ({
    clusterId: 'neglected-development', bucket: 'positional' as MisconceptionBucket, label: 'Neglected development',
    openCount: 2, severity: 40, puzzleThemes: [], total: 2,
    capabilityTag: 'neglected-development', proven: false, ...over,
  } as WeaknessSignal);

  it('a held row that PROVES the same capability lowers the boost to 0', () => {
    expect(boostFor(red())).toBeGreaterThan(0);          // the slip raised it
    expect(boostFor(red({ proven: true }))).toBe(0);      // green quiets it
  });

  it('NEGATIVE CONTROL — a mere gap changes nothing: no green, no lowering', () => {
    // Same signal, no positive record. Nothing about elapsed time or missing
    // rows reaches this function, and that is the point: absent ≠ mastered.
    expect(boostFor(red({ proven: false }))).toBe(boostFor(red()));
  });

  it('a DRILLED-SHUT row lowers — every instance spaced out is a smaller boost than two open', () => {
    // Drilling is the OTHER positive act (the student answered the question in
    // a drill); it already lowered through the volume term, and still does.
    expect(boostFor(red({ openCount: 0 }))).toBeLessThan(boostFor(red({ openCount: 2 })));
    expect(boostFor(red({ openCount: 0 }))).toBeGreaterThan(0); // …but only green reaches zero
  });

  it('the JOIN IS EXACT — green for another tag lowers nothing', () => {
    const uwRow = (capabilityTag: 'neglected-development' | 'space-conceded' | null): UnifiedWeakness =>
      ({ ...uw('coach-row', { bucket: 'positional' as MisconceptionBucket }), capabilityTag } as UnifiedWeakness);
    const provenElsewhere = new Set(['space-conceded']);
    const [other] = buildWeaknessSignals([uwRow('neglected-development')], null, provenElsewhere);
    expect(other.proven).toBe(false);
    expect(boostFor(other)).toBeGreaterThan(0);
    const [same] = buildWeaknessSignals([uwRow('neglected-development')], null, new Set(['neglected-development']));
    expect(same.proven).toBe(true);
    expect(boostFor(same)).toBe(0);
  });

  it('a row with NO capability tag can never be green, whatever is proven — null is not a wildcard', () => {
    const w = { ...uw('analysis:tactic:fork'), capabilityTag: null } as UnifiedWeakness;
    const [s] = buildWeaknessSignals([w], null, new Set(['neglected-development', 'space-conceded']));
    expect(s.capabilityTag).toBeNull();
    expect(s.proven).toBe(false);
  });

  it('a row from before the field existed is honestly un-joined (no proven), never a crash', () => {
    const [s] = buildWeaknessSignals([uw('legacy-row')], null, new Set(['legacy-row']));
    expect(s.capabilityTag).toBeNull();
    expect(s.proven).toBe(false);
  });
});
