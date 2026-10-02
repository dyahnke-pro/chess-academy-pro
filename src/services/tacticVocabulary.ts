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
 *  - `battery` — a piece configuration, not a scored analysis tactic.
 *  - `none` — the "no tactic" sentinel.
 *  - `mate_threat` → `checkmate` (2026-09-15): a live mating threat is exactly
 *    the idea a student with a "Missed checkmates" hole keeps missing, so the
 *    join is honest. It is ONE-WAY — a delivered mate is not a live
 *    `TacticPatternType` (see `TACTIC_TO_PATTERN.checkmate`).
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
  mate_threat: 'checkmate',
  overload: 'overloaded_piece',
  battery: null,
  none: null,
};

/**
 * Analysis/weakness motif → live narration motif. `null` when the analysis
 * motif is never produced by a live geometry detector (so it can't be matched
 * from the narration side): `hanging_piece` is surfaced as a `HangingPiece`, not
 * a `TacticPattern`; `promotion`/`deflection`/`clearance`/`interference`/
 * `zwischenzug`/`x_ray`/`checkmate`/`tactical_sequence` have no live
 * `TacticPatternType`.
 */
/**
 * The SPOKEN word for an analysis motif — what a sentence says where the enum
 * used to leak ("Drill hanging_piece puzzles", WO-STANDARD-01 D-17, prod tape
 * 2026-09-22). A `Record` over the union so a new motif fails to compile until
 * someone writes its word; lowercase, mid-sentence noun phrase.
 */
export const TACTIC_WORD: Record<TacticType, string> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discovered_attack: 'discovered attack',
  back_rank: 'back-rank tactic',
  hanging_piece: 'hanging piece',
  promotion: 'promotion',
  deflection: 'deflection',
  overloaded_piece: 'overloaded piece',
  trapped_piece: 'trapped piece',
  clearance: 'clearance',
  interference: 'interference',
  zwischenzug: 'zwischenzug',
  x_ray: 'x-ray',
  double_check: 'double check',
  removing_the_guard: 'removal of the guard',
  checkmate: 'checkmate',
  tactical_sequence: 'combination',
};

/** The spoken word for any motif string a record may carry — an unknown or
 *  legacy value is read as prose (underscores to spaces), never echoed raw. */
export function tacticWord(type: string): string {
  return (TACTIC_WORD as Record<string, string>)[type] ?? type.replace(/_/g, ' ');
}

/**
 * THE LIVE DETECTOR'S WORDS — one table for every sentence that names a
 * `TacticPatternType` (the noun) or the AIM of a line that lands one (the verb
 * phrase, base and third person). It replaced two hand-copied noun tables
 * (pvPlayback, lookaheadPlan) and a `land a ${word}` template that read "land a
 * overloaded defender" (hand walk 1690, 2026-09-27): wrong article, and a
 * defender is overloaded, not landed. A `Record` over the union so a new
 * pattern fails to compile until it has all three.
 */
export const PATTERN_SPEECH: Record<TacticPatternType, { word: string; aim: string; ing: string; aims: string }> = {
  fork: { word: 'fork', aim: 'land a fork', ing: 'landing a fork', aims: 'lands a fork' },
  pin: { word: 'pin', aim: 'set up a pin', ing: 'setting up a pin', aims: 'sets up a pin' },
  skewer: { word: 'skewer', aim: 'land a skewer', ing: 'landing a skewer', aims: 'lands a skewer' },
  discovery: { word: 'discovered attack', aim: 'unleash a discovered attack', ing: 'unleashing a discovered attack', aims: 'unleashes a discovered attack' },
  double_check: { word: 'double check', aim: 'land a double check', ing: 'landing a double check', aims: 'lands a double check' },
  back_rank: { word: 'back-rank threat', aim: 'hit the back rank', ing: 'hitting the back rank', aims: 'hits the back rank' },
  removal_of_guard: { word: 'removal of the defender', aim: 'remove the defender', ing: 'removing the defender', aims: 'removes the defender' },
  trapped_piece: { word: 'piece trap', aim: 'trap a piece', ing: 'trapping a piece', aims: 'traps a piece' },
  mate_threat: { word: 'mating threat', aim: 'set up a mating threat', ing: 'setting up a mating threat', aims: 'sets up a mating threat' },
  overload: { word: 'overloaded defender', aim: 'overload a defender', ing: 'overloading a defender', aims: 'overloads a defender' },
  battery: { word: 'battery', aim: 'build a battery', ing: 'building a battery', aims: 'builds a battery' },
  none: { word: '', aim: '', ing: '', aims: '' },
};

/** The spoken noun for a detector pattern; unknown strings read as prose. */
export function patternWord(type: string): string {
  return (PATTERN_SPEECH as Record<string, { word: string }>)[type]?.word || type.replace(/_/g, ' ');
}

/** The aim of a line that lands this pattern, as a verb phrase (null if none). */
export function patternAim(type: string | null, form: 'base' | 'third' | 'ing' = 'base'): string | null {
  if (!type) return null;
  const e = (PATTERN_SPEECH as Record<string, { aim: string; aims: string; ing: string }>)[type];
  if (!e) return null;
  return (form === 'third' ? e.aims : form === 'ing' ? e.ing : e.aim) || null;
}

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
  // A DELIVERED mate has no live pattern type; the live side names the
  // pattern (matePatterns) or the threat (`mate_threat`, which maps here).
  checkmate: null,
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
