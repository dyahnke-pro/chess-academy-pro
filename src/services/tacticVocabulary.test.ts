import { describe, it, expect } from 'vitest';
import {
  PATTERN_TO_TACTIC,
  TACTIC_TO_PATTERN,
  toTacticType,
  toTacticPatternType,
  weaknessClusterForPattern,
  weaknessClusterForTactic,
} from './tacticVocabulary';
import type { TacticPatternType } from '../types/tacticTypes';
import type { TacticType } from '../types';

// The whole point of the bridge: the two vocabularies can never silently drift.
// These enumerate the CURRENT members explicitly, so if either enum changes,
// this test (plus the Record's own compile-time exhaustiveness) forces the map
// to be updated in lockstep.
const ALL_PATTERNS: TacticPatternType[] = [
  'fork', 'pin', 'skewer', 'discovery', 'double_check', 'back_rank',
  'removal_of_guard', 'trapped_piece', 'mate_threat', 'overload', 'battery', 'none',
];
const ALL_TACTICS: TacticType[] = [
  'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank', 'hanging_piece',
  'promotion', 'deflection', 'overloaded_piece', 'trapped_piece', 'clearance',
  'interference', 'zwischenzug', 'x_ray', 'double_check', 'removing_the_guard',
  'tactical_sequence',
];

describe('tacticVocabulary — the canonical bridge', () => {
  it('maps EVERY live pattern (no missing entry)', () => {
    for (const p of ALL_PATTERNS) {
      expect(PATTERN_TO_TACTIC).toHaveProperty(p);
    }
    expect(Object.keys(PATTERN_TO_TACTIC).sort()).toEqual([...ALL_PATTERNS].sort());
  });

  it('maps EVERY analysis tactic (no missing entry)', () => {
    for (const t of ALL_TACTICS) {
      expect(TACTIC_TO_PATTERN).toHaveProperty(t);
    }
    expect(Object.keys(TACTIC_TO_PATTERN).sort()).toEqual([...ALL_TACTICS].sort());
  });

  it('translates the DIVERGENT motifs (the silent-mismatch bugs)', () => {
    expect(toTacticType('discovery')).toBe('discovered_attack');
    expect(toTacticType('removal_of_guard')).toBe('removing_the_guard');
    expect(toTacticType('overload')).toBe('overloaded_piece');
    // and the reverse
    expect(toTacticPatternType('discovered_attack')).toBe('discovery');
    expect(toTacticPatternType('removing_the_guard')).toBe('removal_of_guard');
    expect(toTacticPatternType('overloaded_piece')).toBe('overload');
  });

  it('passes the verbatim motifs through unchanged', () => {
    for (const m of ['fork', 'pin', 'skewer', 'back_rank', 'double_check', 'trapped_piece'] as const) {
      expect(toTacticType(m)).toBe(m);
      expect(toTacticPatternType(m as TacticType)).toBe(m);
    }
  });

  it('returns null for live motifs with no weakness counterpart (never a forced match)', () => {
    expect(toTacticType('mate_threat')).toBeNull();
    expect(toTacticType('battery')).toBeNull();
    expect(toTacticType('none')).toBeNull();
    expect(weaknessClusterForPattern('mate_threat')).toBeNull();
    expect(weaknessClusterForPattern('battery')).toBeNull();
    expect(weaknessClusterForPattern('none')).toBeNull();
  });

  it('returns null for analysis motifs never produced by a live detector', () => {
    for (const t of ['hanging_piece', 'promotion', 'deflection', 'clearance',
      'interference', 'zwischenzug', 'x_ray', 'tactical_sequence'] as const) {
      expect(toTacticPatternType(t)).toBeNull();
    }
  });

  it('forms the weakness cluster id that joins to UnifiedWeakness.tag', () => {
    // matches bucketForMistake's `analysis:tactic:<TacticType>` shape
    expect(weaknessClusterForPattern('fork')).toBe('analysis:tactic:fork');
    expect(weaknessClusterForPattern('discovery')).toBe('analysis:tactic:discovered_attack');
    expect(weaknessClusterForTactic('removing_the_guard')).toBe('analysis:tactic:removing_the_guard');
  });

  it('round-trips motifs that exist in both vocabularies', () => {
    for (const p of ALL_PATTERNS) {
      const t = toTacticType(p);
      if (t && toTacticPatternType(t)) {
        // a motif present on both sides must round-trip to itself
        expect(toTacticPatternType(t)).toBe(p);
      }
    }
  });
});
