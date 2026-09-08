// tacticVocabulary — the ONE canonical bridge between the app's two tactic
// vocabularies (David 2026-09-08: "two parallel tactic vocabularies with no
// normalizer … FIX ANY PROBLEMS LIKE THIS").
//
// The app grew two independent tactic enums that never got reconciled:
//
//   • `TacticPatternType` (src/types/tacticTypes.ts) — the LIVE-NARRATION
//     vocabulary. What `tacticsDetector` / `liveTacticsContext` / `playCommentary`
//     emit as a detected `TacticPattern.type` on the running board.
//   • `TacticType` (src/types/index.ts) — the ANALYSIS / WEAKNESS vocabulary.
//     What `MistakePuzzle` / `ClassifiedTactic` carry, and what `bucketForMistake`
//     turns into the weakness cluster id `analysis:tactic:<TacticType>`
//     (weaknessSpine.ts) — the key `UnifiedWeakness.tag` and
//     `WeaknessLifecycleEntry.clusterId` are formed from.
//
// They diverge on the SAME motifs — `discovery` vs `discovered_attack`,
// `removal_of_guard` vs `removing_the_guard`, `overload` vs `overloaded_piece` —
// so a fork-blind student's `analysis:tactic:discovered_attack` weakness would
// NEVER match a live `discovery` fact without a translation. That silent
// mismatch is exactly the wrong-teaching class G0/the unified coach exists to
// kill: the coach would fail to hit a hole the student keeps falling in because
// two files spell the motif differently.
//
// This module is the single source of truth for that translation. The maps are
// `Record`s keyed by the FULL union, so TypeScript FAILS TO COMPILE if a new
// member is added to either enum without giving it a mapping here — the
// divergence can never silently reopen.

import type { TacticPatternType } from '../types/tacticTypes';
import type { TacticType } from '../types';

/**
 * Live narration motif → analysis/weakness motif. `null` when the live motif
 * has no honest weakness counterpart:
 *  - `mate_threat` — a mating idea, not one of the analysis tactic motifs.
 *  - `battery` — a piece configuration, not a scored analysis tactic.
 *  - `none` — the "no tactic" sentinel.
 * Never guess a mapping to force a match (G3 / "empty > generic > invented").
 */
export const PATTERN_TO_TACTIC: Record<TacticPatternType, TacticType | null> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovery: 'discovered_attack',
  double_check: 'double_check',
  back_rank: 'back_rank',
  removal_of_guard: 'removing_the_guard',
  trapped_piece: 'trapped_piece',
  mate_threat: null,
  overload: 'overloaded_piece',
  battery: null,
  none: null,
};

/**
 * Analysis/weakness motif → live narration motif. `null` when the analysis
 * motif is never produced by a live geometry detector (so it can't be matched
 * from the narration side): `hanging_piece` is surfaced as a `HangingPiece`, not
 * a `TacticPattern`; `promotion`/`deflection`/`clearance`/`interference`/
 * `zwischenzug`/`x_ray`/`tactical_sequence` have no live `TacticPatternType`.
 */
export const TACTIC_TO_PATTERN: Record<TacticType, TacticPatternType | null> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovered_attack: 'discovery',
  back_rank: 'back_rank',
  hanging_piece: null,
  promotion: null,
  deflection: null,
  overloaded_piece: 'overload',
  trapped_piece: 'trapped_piece',
  clearance: null,
  interference: null,
  zwischenzug: null,
  x_ray: null,
  double_check: 'double_check',
  removing_the_guard: 'removal_of_guard',
  tactical_sequence: null,
};

/** Live narration motif → analysis/weakness motif (null when none). */
export function toTacticType(pattern: TacticPatternType): TacticType | null {
  return PATTERN_TO_TACTIC[pattern];
}

/** Analysis/weakness motif → live narration motif (null when none). */
export function toTacticPatternType(tactic: TacticType): TacticPatternType | null {
  return TACTIC_TO_PATTERN[tactic];
}

/** The weakness cluster-id prefix `bucketForMistake` uses for a tactic motif.
 *  Kept here so the join key has ONE definition shared by the producer
 *  (weaknessSpine) and every consumer that matches a live fact to a weakness. */
export const TACTIC_CLUSTER_PREFIX = 'analysis:tactic:';

/**
 * The weakness cluster id a live narration motif joins to — i.e.
 * `analysis:tactic:<TacticType>`, which equals `UnifiedWeakness.tag` /
 * `WeaknessLifecycleEntry.clusterId` for that motif. `null` when the live motif
 * has no weakness counterpart (no match possible — stay silent, never force one).
 *
 * This is the bridge the weakness→selector wire uses: normalize a live fact's
 * `TacticPatternType` here, then compare the result to the student's weakness
 * cluster ids.
 */
export function weaknessClusterForPattern(pattern: TacticPatternType): string | null {
  const tactic = PATTERN_TO_TACTIC[pattern];
  return tactic ? `${TACTIC_CLUSTER_PREFIX}${tactic}` : null;
}

/** The weakness cluster id for an analysis motif directly (symmetry helper). */
export function weaknessClusterForTactic(tactic: TacticType): string {
  return `${TACTIC_CLUSTER_PREFIX}${tactic}`;
}
